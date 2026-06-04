import { applyD1Migrations, env } from 'cloudflare:test';
import { Hono } from 'hono';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { AppEnv } from '../env.js';
import { sessionMiddleware, SESSION_COOKIE } from '../mw/session.js';
import { callbackHandler, loginHandler, meHandler, logoutHandler } from './auth.js';

function makeApp() {
  const app = new Hono<AppEnv>();
  app.use(sessionMiddleware);
  app.get('/api/auth/login', loginHandler);
  app.get('/api/auth/callback', callbackHandler);
  return app;
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

/**
 * Tiny Discord fetch mock layered over globalThis.fetch.
 * We can't rely on cloudflare:test's fetchMock — it's been removed in
 * vitest-pool-workers >= 0.16. Instead, route based on URL prefix.
 */
type Route = {
  match: { method: string; path: string };
  reply: { status: number; body: unknown };
};

let routes: Route[] = [];
let realFetch: typeof globalThis.fetch | null = null;

function setupFetchMock(): void {
  routes = [];
  if (realFetch === null) realFetch = globalThis.fetch;
  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = (
      init?.method ??
      (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();
    // Sort routes by descending path length so more-specific paths match first.
    // (e.g. `/users/@me/guilds/.../member` before `/users/@me`)
    const sorted = [...routes].sort(
      (a, b) => b.match.path.length - a.match.path.length,
    );
    for (const r of sorted) {
      if (
        r.match.method === method &&
        (url === r.match.path || url.startsWith(r.match.path + '?'))
      ) {
        return new Response(JSON.stringify(r.reply.body), {
          status: r.reply.status,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
    throw new Error(`unexpected outbound fetch in test: ${method} ${url}`);
  }) as typeof globalThis.fetch;
}

function teardownFetchMock(): void {
  if (realFetch !== null) {
    globalThis.fetch = realFetch;
  }
  routes = [];
}

function mockDiscord(path: string, method: string, status: number, body: unknown): void {
  routes.push({
    match: { method: method.toUpperCase(), path: `https://discord.com${path}` },
    reply: { status, body },
  });
}

beforeEach(() => {
  setupFetchMock();
});

afterEach(() => {
  teardownFetchMock();
  vi.restoreAllMocks();
});

describe('GET /api/auth/login', () => {
  it('redirects to Discord with state cookie set', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://t/api/auth/login'), env);
    expect(res.status).toBe(302);
    const location = res.headers.get('location')!;
    expect(location.startsWith('https://discord.com/oauth2/authorize?')).toBe(true);
    expect(location).toContain(`client_id=${env.DISCORD_CLIENT_ID}`);
    expect(location).toContain('scope=identify+guilds.members.read');
    expect(location).toMatch(/state=[a-f0-9]{64}/);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('oauth_state=');
    expect(setCookie.toLowerCase()).toContain('httponly');
  });

  it('mints a dev session and skips Discord when DEV_BYPASS_AUTH=true and ALLOW_DEV_BYPASS=true', async () => {
    const app = makeApp();
    // Override env locally — Workers env is plain object
    const bypassEnv = {
      ...env,
      DEV_BYPASS_AUTH: 'true',
      ALLOW_DEV_BYPASS: 'true',
    };
    const res = await app.fetch(new Request('http://t/api/auth/login'), bypassEnv);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
  });

  it('does NOT bypass when only DEV_BYPASS_AUTH=true (ALLOW_DEV_BYPASS still false)', async () => {
    const app = makeApp();
    const partialEnv = { ...env, DEV_BYPASS_AUTH: 'true' };
    const res = await app.fetch(new Request('http://t/api/auth/login'), partialEnv);
    // Should fall through to the Discord redirect, not the dev short-circuit
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location.startsWith('https://discord.com/oauth2/authorize?')).toBe(true);
  });

  it('does NOT bypass when only ALLOW_DEV_BYPASS=true (DEV_BYPASS_AUTH still false)', async () => {
    const app = makeApp();
    const partialEnv = { ...env, ALLOW_DEV_BYPASS: 'true' };
    const res = await app.fetch(new Request('http://t/api/auth/login'), partialEnv);
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location.startsWith('https://discord.com/oauth2/authorize?')).toBe(true);
  });
});

describe('GET /api/auth/callback', () => {
  it('400s when code or state missing', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://t/api/auth/callback'), env);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('VALIDATION');
  });

  it('400s when state cookie does not match query state', async () => {
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://t/api/auth/callback?code=c&state=q', {
        headers: { Cookie: 'oauth_state=different' },
      }),
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('VALIDATION');
  });

  it('completes happy path: exchanges code, fetches user + member, upserts, sets session cookie, redirects to /', async () => {
    mockDiscord('/api/v10/oauth2/token', 'POST', 200, {
      access_token: 'test-access-token',
      token_type: 'Bearer',
    });
    mockDiscord('/api/v10/users/@me', 'GET', 200, {
      id: '714517219026927767',
      username: 'mitri',
      global_name: 'Dimitri',
      avatar: 'a_abc123',
    });
    mockDiscord(
      `/api/v10/users/@me/guilds/${env.HOME_GUILD_ID}/member`,
      'GET',
      200,
      { user: { id: '714517219026927767' } },
    );

    const app = makeApp();
    const res = await app.fetch(
      new Request('http://t/api/auth/callback?code=abc&state=match', {
        headers: { Cookie: 'oauth_state=match' },
      }),
      env,
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');

    const cookies = res.headers.get('set-cookie') ?? '';
    expect(cookies).toContain(`${SESSION_COOKIE}=`);
    expect(cookies.toLowerCase()).toContain('httponly');

    // Verify D1 row exists
    const row = await env.DB.prepare(
      'SELECT id, username, is_home_member FROM users WHERE id = ?',
    )
      .bind('714517219026927767')
      .first();
    expect(row).not.toBeNull();
    expect(row!.username).toBe('mitri');
    expect(row!.is_home_member).toBe(1);
  });

  it('marks user as non-member when guild member check returns 404', async () => {
    mockDiscord('/api/v10/oauth2/token', 'POST', 200, {
      access_token: 'test-access-token',
      token_type: 'Bearer',
    });
    mockDiscord('/api/v10/users/@me', 'GET', 200, {
      id: '999',
      username: 'outsider',
      global_name: null,
      avatar: null,
    });
    mockDiscord(
      `/api/v10/users/@me/guilds/${env.HOME_GUILD_ID}/member`,
      'GET',
      404,
      { message: 'Unknown member' },
    );

    const app = makeApp();
    const res = await app.fetch(
      new Request('http://t/api/auth/callback?code=abc&state=match', {
        headers: { Cookie: 'oauth_state=match' },
      }),
      env,
    );
    expect(res.status).toBe(302);
    const row = await env.DB.prepare(
      'SELECT is_home_member FROM users WHERE id = ?',
    )
      .bind('999')
      .first();
    expect(row!.is_home_member).toBe(0);
  });

  it('502s when token exchange fails', async () => {
    mockDiscord('/api/v10/oauth2/token', 'POST', 400, {
      error: 'invalid_grant',
    });

    const app = makeApp();
    const res = await app.fetch(
      new Request('http://t/api/auth/callback?code=abc&state=match', {
        headers: { Cookie: 'oauth_state=match' },
      }),
      env,
    );
    expect(res.status).toBe(502);
  });
});

describe('GET /api/auth/me', () => {
  function makeMeApp() {
    const app = new Hono<AppEnv>();
    app.use(sessionMiddleware);
    app.get('/api/auth/me', meHandler);
    return app;
  }

  it('401s when no session cookie', async () => {
    const app = makeMeApp();
    const res = await app.fetch(new Request('http://t/api/auth/me'), env);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns the user when session cookie is valid', async () => {
    const now = Math.floor(Date.now() / 1000);
    const { sign } = await import('hono/jwt');
    const token = await sign(
      {
        sub: '714517219026927767',
        username: 'mitri',
        globalName: 'Dimitri',
        avatarHash: 'a_abc123',
        isHomeMember: true,
        memberCheckedAt: 1717000000000,
        jti: 'test-jti-me-valid',
        iat: now,
        exp: now + 3600,
      },
      env.SESSION_SIGNING_SECRET,
    );

    const app = makeMeApp();
    const res = await app.fetch(
      new Request('http://t/api/auth/me', {
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { id: string; username: string; isHomeMember: boolean };
    };
    expect(body.user.id).toBe('714517219026927767');
    expect(body.user.username).toBe('mitri');
    expect(body.user.isHomeMember).toBe(true);
  });
});

describe('POST /api/auth/logout', () => {
  function makeLogoutApp() {
    const app = new Hono<AppEnv>();
    app.use(sessionMiddleware);
    app.post('/api/auth/logout', logoutHandler);
    app.get('/whoami', (c) => c.json({ user: c.var.user }));
    return app;
  }

  it('returns 204 and clears the session cookie', async () => {
    const app = makeLogoutApp();
    const res = await app.fetch(
      new Request('http://t/api/auth/logout', { method: 'POST' }),
      env,
    );
    expect(res.status).toBe(204);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    // Cookie should have an expiry in the past OR Max-Age=0
    expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=.*1970/i);
  });

  it('adds the jti to the denylist so the same cookie is anonymous afterwards', async () => {
    const app = makeLogoutApp();
    const now = Math.floor(Date.now() / 1000);
    const { sign } = await import('hono/jwt');
    const jti = `logout-revoke-${now}`;
    const token = await sign(
      {
        sub: '714517219026927767',
        username: 'mitri',
        globalName: 'Dimitri',
        avatarHash: 'a_abc123',
        isHomeMember: true,
        memberCheckedAt: 1717000000000,
        jti,
        iat: now,
        exp: now + 3600,
      },
      env.SESSION_SIGNING_SECRET,
    );

    // First, sanity check: with a fresh cookie, /whoami returns the user.
    const before = await app.fetch(
      new Request('http://t/whoami', {
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    const beforeBody = (await before.json()) as { user: { id: string } | null };
    expect(beforeBody.user?.id).toBe('714517219026927767');

    // Logout sends the cookie.
    const logoutRes = await app.fetch(
      new Request('http://t/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    expect(logoutRes.status).toBe(204);

    // After logout, even if a client somehow replays the same cookie,
    // the middleware should treat it as anonymous.
    const after = await app.fetch(
      new Request('http://t/whoami', {
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    const afterBody = (await after.json()) as { user: unknown };
    expect(afterBody.user).toBeNull();

    // And the denylist row exists.
    const row = await env.DB
      .prepare('SELECT jti FROM revoked_sessions WHERE jti = ?')
      .bind(jti)
      .first<{ jti: string }>();
    expect(row).not.toBeNull();
    expect(row!.jti).toBe(jti);
  });
});
