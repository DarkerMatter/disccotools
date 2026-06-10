import { applyD1Migrations, env } from 'cloudflare:test';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AppEnv } from '../env.js';
import { requireAuth } from './requireAuth.js';
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

async function signClaims(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: '1',
      username: 'x',
      globalName: null,
      avatarHash: null,
      jti: `test-jti-${now}-${Math.random().toString(36).slice(2)}`,
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
    // session mw now refuses to populate c.var.user for vanished users
    await env.DB.prepare(
      'INSERT OR IGNORE INTO users (id, username, created_at, updated_at) VALUES (?, ?, ?, ?)',
    )
      .bind('1', 'x', Date.now(), Date.now())
      .run();
    const token = await signClaims();
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
