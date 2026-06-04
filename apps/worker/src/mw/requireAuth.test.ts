import { applyD1Migrations, env } from 'cloudflare:test';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AppEnv } from '../env.js';
import { requireAuth, requireHomeMember } from './requireAuth.js';
import { SESSION_COOKIE, sessionMiddleware } from './session.js';

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

function makeApp() {
  const app = new Hono<AppEnv>();
  app.use(sessionMiddleware);
  app.use('/private/*', requireAuth);
  app.get('/private/data', (c) => c.json({ ok: true }));
  return app;
}

async function signClaims(isHomeMember: boolean): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: '1',
      username: 'x',
      globalName: null,
      avatarHash: null,
      isHomeMember,
      memberCheckedAt: 0,
      jti: `test-jti-${isHomeMember ? 'member' : 'nonmember'}-${now}`,
      iat: now,
      exp: now + 3600,
    },
    env.SESSION_SIGNING_SECRET,
  );
}

describe('requireAuth', () => {
  it('returns 401 with UNAUTHORIZED envelope when no user', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://t/private/data'), env);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });

  it('passes through when user is present', async () => {
    const app = makeApp();
    const token = await signClaims(false);
    const res = await app.fetch(
      new Request('http://t/private/data', {
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

function makeMembersApp() {
  const app = new Hono<AppEnv>();
  app.use(sessionMiddleware);
  app.use('/members/*', requireAuth);
  app.use('/members/*', requireHomeMember);
  app.get('/members/secret', (c) => c.json({ ok: true }));
  return app;
}

describe('requireHomeMember', () => {
  it('returns 403 with FORBIDDEN envelope when user is not a home member', async () => {
    const app = makeMembersApp();
    const token = await signClaims(false);
    const res = await app.fetch(
      new Request('http://t/members/secret', {
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('FORBIDDEN');
  });

  it('passes through when user is a home member', async () => {
    const app = makeMembersApp();
    const token = await signClaims(true);
    const res = await app.fetch(
      new Request('http://t/members/secret', {
        headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('returns 401 when no auth at all (defensive — requireAuth normally catches first)', async () => {
    // Build an app where only requireHomeMember runs, no requireAuth gate.
    const app = new Hono<AppEnv>();
    app.use(sessionMiddleware);
    app.use('/members/*', requireHomeMember);
    app.get('/members/secret', (c) => c.json({ ok: true }));
    const res = await app.fetch(new Request('http://t/members/secret'), env);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });
});
