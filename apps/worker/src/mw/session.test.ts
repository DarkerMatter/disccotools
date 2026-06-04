import { applyD1Migrations, env } from 'cloudflare:test';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AppEnv } from '../env.js';
import { revokeSession } from '../db/revokedSessions.js';
import { SESSION_COOKIE, sessionMiddleware } from './session.js';

function makeApp() {
  const app = new Hono<AppEnv>();
  app.use(sessionMiddleware);
  app.get('/whoami', (c) => c.json({ user: c.var.user }));
  return app;
}

const baseClaims = {
  sub: '714517219026927767',
  username: 'mitri',
  globalName: 'Dimitri',
  avatarHash: 'a_abc123',
  isHomeMember: true,
  memberCheckedAt: 1717000000000,
  jti: 'test-jti-base',
};

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM revoked_sessions').run();
});

describe('sessionMiddleware', () => {
  it('attaches null user when no cookie', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://t/whoami'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });

  it('attaches user when cookie holds a valid JWT', async () => {
    const app = makeApp();
    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { ...baseClaims, iat: now, exp: now + 3600 },
      env.SESSION_SIGNING_SECRET,
    );
    const res = await app.fetch(
      new Request('http://t/whoami', {
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; username: string } };
    expect(body.user.id).toBe('714517219026927767');
    expect(body.user.username).toBe('mitri');
  });

  it('attaches null when cookie has a token signed with the wrong secret', async () => {
    const app = makeApp();
    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { ...baseClaims, iat: now, exp: now + 3600 },
      'totally-wrong-secret',
    );
    const res = await app.fetch(
      new Request('http://t/whoami', {
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });

  it('attaches null when cookie holds an expired JWT', async () => {
    const app = makeApp();
    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { ...baseClaims, iat: now - 7200, exp: now - 3600 },
      env.SESSION_SIGNING_SECRET,
    );
    const res = await app.fetch(
      new Request('http://t/whoami', {
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });

  it('attaches null when cookie is garbage', async () => {
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://t/whoami', {
        headers: { Cookie: `${SESSION_COOKIE}=not.a.real.jwt` },
      }),
      env,
    );
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });

  it('attaches null user when the session jti is in the denylist', async () => {
    const app = makeApp();
    const now = Math.floor(Date.now() / 1000);
    const jti = `revoked-${now}`;
    const token = await sign(
      { ...baseClaims, jti, iat: now, exp: now + 3600 },
      env.SESSION_SIGNING_SECRET,
    );
    // Revoke before the request lands.
    await revokeSession(env.DB, jti, now + 3600);
    const res = await app.fetch(
      new Request('http://t/whoami', {
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });
});
