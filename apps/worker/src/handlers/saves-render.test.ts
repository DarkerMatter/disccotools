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
  downloadHandler,
  thumbnailHandler,
  uploadRenderHandler,
} from './saves-render.js';

const USER_ID = '714517219026927767';
const OTHER_USER_ID = '999';

function makeApp() {
  const app = new Hono<AppEnv>();
  app.use(sessionMiddleware);
  app.use('/api/saves/*', requireAuth);
  app.post('/api/saves', createSaveHandler);
  app.post('/api/saves/:id/render', uploadRenderHandler);
  app.get('/api/saves/:id/download', downloadHandler);
  app.get('/api/saves/:id/thumbnail', thumbnailHandler);
  return app;
}

async function cookieFor(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    {
      sub: userId,
      username: 'test',
      globalName: null,
      avatarHash: null,
      isHomeMember: false,
      memberCheckedAt: 0,
      jti: `saves-render-test-${userId}-${now}-${Math.random().toString(36).slice(2)}`,
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
  const { userId = USER_ID, headers, ...rest } = init;
  const cookie = await cookieFor(userId);
  const h = new Headers(headers);
  h.set('Cookie', cookie);
  return app.fetch(new Request(url, { ...rest, headers: h }), env);
}

async function createSave(app: ReturnType<typeof makeApp>, userId: string) {
  const res = await authedFetch(app, 'http://t/api/saves', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 's', recipe: createEmptyRecipe() }),
    userId,
  });
  return (await res.json()) as { save: { id: string } };
}

function pngBlob(bytes: number): Blob {
  const buf = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) buf[i] = i & 0xff;
  return new Blob([buf], { type: 'image/png' });
}

function renderForm(fullBytes = 2048, thumbBytes = 512): FormData {
  const fd = new FormData();
  fd.append('full', pngBlob(fullBytes), 'full.png');
  fd.append('thumb', pngBlob(thumbBytes), 'thumb.png');
  return fd;
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
      'INSERT INTO users (id, username, is_home_member, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
    ).bind(USER_ID, 'mitri', now, now),
    env.DB.prepare(
      'INSERT INTO users (id, username, is_home_member, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
    ).bind(OTHER_USER_ID, 'other', now, now),
  ]);
  // R2 isolated-storage mode in miniflare resets the bucket between tests; no
  // manual cleanup needed (each test creates unique save ids anyway).
});

describe('POST /api/saves/:id/render', () => {
  it('writes full + thumb to R2 and returns the updated save detail', async () => {
    const app = makeApp();
    const { save } = await createSave(app, USER_ID);

    const res = await authedFetch(app, `http://t/api/saves/${save.id}/render`, {
      method: 'POST',
      body: renderForm(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      save: { thumbnailUrl: string | null; downloadUrl: string | null; renderedAt: number | null };
    };
    expect(body.save.downloadUrl).toBe(`/api/saves/${save.id}/download`);
    expect(body.save.thumbnailUrl).toBe(`/api/saves/${save.id}/thumbnail`);
    expect(body.save.renderedAt).toBeGreaterThan(0);

    const fullKey = `saves/${USER_ID}/${save.id}.png`;
    const thumbKeyStr = `saves/${USER_ID}/${save.id}_thumb.png`;
    expect(await env.R2.head(fullKey)).not.toBeNull();
    expect(await env.R2.head(thumbKeyStr)).not.toBeNull();
  });

  it('401s when unauthenticated', async () => {
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://t/api/saves/x/render', {
        method: 'POST',
        body: renderForm(),
      }),
      env,
    );
    expect(res.status).toBe(401);
  });

  it('403s when uploading for another user’s save', async () => {
    const app = makeApp();
    const { save } = await createSave(app, OTHER_USER_ID);
    const res = await authedFetch(app, `http://t/api/saves/${save.id}/render`, {
      method: 'POST',
      body: renderForm(),
      userId: USER_ID,
    });
    expect(res.status).toBe(403);
  });

  it('400s when missing full/thumb blob', async () => {
    const app = makeApp();
    const { save } = await createSave(app, USER_ID);
    const fd = new FormData();
    fd.append('full', pngBlob(100), 'full.png');
    const res = await authedFetch(app, `http://t/api/saves/${save.id}/render`, {
      method: 'POST',
      body: fd,
    });
    expect(res.status).toBe(400);
  });

  it('400s when full exceeds the size cap', async () => {
    const app = makeApp();
    const { save } = await createSave(app, USER_ID);
    const fd = new FormData();
    fd.append('full', pngBlob(3 * 1024 * 1024), 'big.png');
    fd.append('thumb', pngBlob(100), 'thumb.png');
    const res = await authedFetch(app, `http://t/api/saves/${save.id}/render`, {
      method: 'POST',
      body: fd,
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/saves/:id/download', () => {
  it('streams the full PNG with attachment disposition when present', async () => {
    const app = makeApp();
    const { save } = await createSave(app, USER_ID);
    await authedFetch(app, `http://t/api/saves/${save.id}/render`, {
      method: 'POST',
      body: renderForm(),
    });
    const res = await authedFetch(app, `http://t/api/saves/${save.id}/download`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    const ab = await res.arrayBuffer();
    expect(ab.byteLength).toBeGreaterThan(0);
  });

  it('404s when no render yet', async () => {
    const app = makeApp();
    const { save } = await createSave(app, USER_ID);
    const res = await authedFetch(app, `http://t/api/saves/${save.id}/download`);
    expect(res.status).toBe(404);
  });

  it('403s for another user’s save', async () => {
    const app = makeApp();
    const { save } = await createSave(app, OTHER_USER_ID);
    const res = await authedFetch(app, `http://t/api/saves/${save.id}/download`, {
      userId: USER_ID,
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/saves/:id/thumbnail', () => {
  it('streams the thumbnail with cache headers when present', async () => {
    const app = makeApp();
    const { save } = await createSave(app, USER_ID);
    await authedFetch(app, `http://t/api/saves/${save.id}/render`, {
      method: 'POST',
      body: renderForm(),
    });
    const res = await authedFetch(app, `http://t/api/saves/${save.id}/thumbnail`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('max-age=3600');
  });

  it('404s when no thumb yet', async () => {
    const app = makeApp();
    const { save } = await createSave(app, USER_ID);
    const res = await authedFetch(app, `http://t/api/saves/${save.id}/thumbnail`);
    expect(res.status).toBe(404);
  });
});
