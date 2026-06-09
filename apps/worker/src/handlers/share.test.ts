import { applyD1Migrations, env } from 'cloudflare:test';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import { sessionMiddleware, SESSION_COOKIE } from '../mw/session.js';
import { requireAuth } from '../mw/requireAuth.js';
import { createSaveHandler } from './saves.js';
import {
  createShareHandler,
  getSharedSaveHandler,
  importSharedSaveHandler,
  revokeShareHandler,
} from './share.js';

const OWNER_ID = '714517219026927767';
const VISITOR_ID = '999';

function makeApp() {
  const app = new Hono<AppEnv>();
  app.use(sessionMiddleware);

  // public — no auth on the shared GET
  app.get('/api/share/:token', getSharedSaveHandler);

  // everything else needs auth
  app.use('/api/saves/*', requireAuth);
  app.use('/api/share/:token/import', requireAuth);

  app.post('/api/saves', createSaveHandler);
  app.post('/api/saves/:id/share', createShareHandler);
  app.delete('/api/saves/:id/share', revokeShareHandler);
  app.post('/api/share/:token/import', importSharedSaveHandler);
  return app;
}

async function sessionCookieFor(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    {
      sub: userId,
      username: 'test',
      globalName: null,
      avatarHash: null,
      jti: `share-test-${userId}-${now}-${Math.random().toString(36).slice(2)}`,
      iat: now,
      exp: now + 3600,
    },
    env.SESSION_SIGNING_SECRET,
  );
  return `${SESSION_COOKIE}=${token}`;
}

async function authedFetch(
  app: ReturnType<typeof makeApp>,
  url: string,
  init: RequestInit & { userId?: string } = {},
): Promise<Response> {
  const { userId = OWNER_ID, headers, ...rest } = init;
  const cookie = await sessionCookieFor(userId);
  const finalHeaders = new Headers(headers);
  finalHeaders.set('Cookie', cookie);
  return app.fetch(new Request(url, { ...rest, headers: finalHeaders }), env);
}

async function createSaveFor(app: ReturnType<typeof makeApp>): Promise<string> {
  const res = await authedFetch(app, 'http://t/api/saves', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'My Design',
      recipe: createEmptyRecipe(),
    }),
  });
  expect(res.status).toBe(201);
  const body = (await res.json()) as { save: { id: string } };
  return body.save.id;
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM saves'),
    env.DB.prepare('DELETE FROM users'),
    env.DB.prepare(
      'INSERT INTO users (id, username, global_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(OWNER_ID, 'mitri', 'Mitri', now, now),
    env.DB.prepare(
      'INSERT INTO users (id, username, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).bind(VISITOR_ID, 'visitor', now, now),
  ]);
});

describe('POST /api/saves/:id/share', () => {
  it('generates a share token for the owner', async () => {
    const app = makeApp();
    const saveId = await createSaveFor(app);
    const res = await authedFetch(app, `http://t/api/saves/${saveId}/share`, {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { save: { shareToken: string | null } };
    expect(typeof body.save.shareToken).toBe('string');
    expect(body.save.shareToken!.length).toBeGreaterThan(8);
  });

  it('is idempotent — the same token is returned twice', async () => {
    const app = makeApp();
    const saveId = await createSaveFor(app);
    const first = await authedFetch(app, `http://t/api/saves/${saveId}/share`, { method: 'POST' });
    const second = await authedFetch(app, `http://t/api/saves/${saveId}/share`, { method: 'POST' });
    const a = (await first.json()) as { save: { shareToken: string } };
    const b = (await second.json()) as { save: { shareToken: string } };
    expect(b.save.shareToken).toBe(a.save.shareToken);
  });

  it('403s when a non-owner tries to share', async () => {
    const app = makeApp();
    const saveId = await createSaveFor(app);
    const res = await authedFetch(app, `http://t/api/saves/${saveId}/share`, {
      method: 'POST',
      userId: VISITOR_ID,
    });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/saves/:id/share', () => {
  it('clears the share token', async () => {
    const app = makeApp();
    const saveId = await createSaveFor(app);
    await authedFetch(app, `http://t/api/saves/${saveId}/share`, { method: 'POST' });
    const res = await authedFetch(app, `http://t/api/saves/${saveId}/share`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { save: { shareToken: string | null } };
    expect(body.save.shareToken).toBeNull();
  });
});

describe('GET /api/share/:token', () => {
  it('returns the save publicly with owner name', async () => {
    const app = makeApp();
    const saveId = await createSaveFor(app);
    const share = await authedFetch(app, `http://t/api/saves/${saveId}/share`, { method: 'POST' });
    const shareBody = (await share.json()) as { save: { shareToken: string } };
    const token = shareBody.save.shareToken;

    // public — no cookie attached
    const res = await app.fetch(
      new Request(`http://t/api/share/${token}`),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      save: { id: string; name: string; ownerName: string };
    };
    expect(body.save.id).toBe(saveId);
    expect(body.save.name).toBe('My Design');
    expect(body.save.ownerName).toBe('Mitri');
  });

  it('404s after the share is revoked', async () => {
    const app = makeApp();
    const saveId = await createSaveFor(app);
    const share = await authedFetch(app, `http://t/api/saves/${saveId}/share`, { method: 'POST' });
    const { save } = (await share.json()) as { save: { shareToken: string } };
    const token = save.shareToken;
    await authedFetch(app, `http://t/api/saves/${saveId}/share`, { method: 'DELETE' });

    const res = await app.fetch(new Request(`http://t/api/share/${token}`), env);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/share/:token/import', () => {
  it('lets an authenticated visitor import a shared save', async () => {
    const app = makeApp();
    const saveId = await createSaveFor(app);
    const share = await authedFetch(app, `http://t/api/saves/${saveId}/share`, { method: 'POST' });
    const { save } = (await share.json()) as { save: { shareToken: string } };
    const token = save.shareToken;

    const res = await authedFetch(app, `http://t/api/share/${token}/import`, {
      method: 'POST',
      userId: VISITOR_ID,
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { save: { id: string } };
    expect(body.save.id).not.toBe(saveId);
  });

  it('401s when the visitor is anonymous', async () => {
    const app = makeApp();
    const saveId = await createSaveFor(app);
    const share = await authedFetch(app, `http://t/api/saves/${saveId}/share`, { method: 'POST' });
    const { save } = (await share.json()) as { save: { shareToken: string } };
    const res = await app.fetch(
      new Request(`http://t/api/share/${save.shareToken}/import`, { method: 'POST' }),
      env,
    );
    expect(res.status).toBe(401);
  });
});
