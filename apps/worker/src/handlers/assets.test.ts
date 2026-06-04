import { applyD1Migrations, env } from 'cloudflare:test';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import { sessionMiddleware, SESSION_COOKIE } from '../mw/session.js';
import { requireAuth } from '../mw/requireAuth.js';
import {
  createAssetHandler,
  deleteAssetHandler,
  getAssetFileHandler,
  getAssetHandler,
  listAssetsHandler,
  renameAssetHandler,
} from './assets.js';

const USER_ID = '714517219026927767';
const OTHER_USER_ID = '999';

function makeApp() {
  const app = new Hono<AppEnv>();
  app.use(sessionMiddleware);
  app.use('/api/assets/*', requireAuth);
  app.post('/api/assets', createAssetHandler);
  app.get('/api/assets', listAssetsHandler);
  app.get('/api/assets/:id', getAssetHandler);
  app.patch('/api/assets/:id', renameAssetHandler);
  app.delete('/api/assets/:id', deleteAssetHandler);
  app.get('/api/assets/:id/file', getAssetFileHandler);
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
      isHomeMember: false,
      memberCheckedAt: 0,
      jti: `jti-${userId}-${now}-${Math.random().toString(36).slice(2)}`,
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
  const cookie = await sessionCookieFor(userId);
  const finalHeaders = new Headers(headers);
  finalHeaders.set('Cookie', cookie);
  return app.fetch(new Request(url, { ...rest, headers: finalHeaders }), env);
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0] as const;
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46] as const; // "RIFF"
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50] as const; // "WEBP" at offset 8

/** Build a Blob whose leading bytes are a valid magic header for `type`, padded
 *  to `bytes` total length. The padding is arbitrary — only the first 12 bytes
 *  are inspected by the worker's sniffer. */
function pngBlob(
  bytes: number,
  type: 'image/png' | 'image/jpeg' | 'image/webp' | string = 'image/png',
): Blob {
  const buf = new Uint8Array(Math.max(bytes, 16));
  if (type === 'image/png') {
    buf.set(PNG_MAGIC, 0);
  } else if (type === 'image/jpeg') {
    buf.set(JPEG_MAGIC, 0);
  } else if (type === 'image/webp') {
    buf.set(WEBP_RIFF, 0);
    buf.set(WEBP_TAG, 8);
  }
  // Trim to requested size if larger than the minimum header.
  const out = bytes < 16 ? buf.subarray(0, bytes) : buf.subarray(0, bytes);
  return new Blob([out], { type });
}

/** A blob whose declared MIME is image/png but whose bytes are arbitrary
 *  (zero-filled) — used to verify the magic-byte sniffer rejects mismatches. */
function fakePngBlob(size = 32): Blob {
  return new Blob([new Uint8Array(size)], { type: 'image/png' });
}

function uploadForm(opts: {
  file?: Blob;
  name?: string;
  filename?: string;
} = {}): FormData {
  const fd = new FormData();
  if (opts.file !== undefined) {
    fd.append('file', opts.file, opts.filename ?? 'logo.png');
  }
  if (opts.name !== undefined) fd.append('name', opts.name);
  return fd;
}

async function uploadAsset(
  app: ReturnType<typeof makeApp>,
  userId: string = USER_ID,
  name = 'logo',
  bytes = 1024,
  type: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
): Promise<{ id: string; r2Key: string; mimeType: string }> {
  const res = await authedFetch(app, 'http://t/api/assets', {
    method: 'POST',
    body: uploadForm({ file: pngBlob(bytes, type), name }),
    userId,
  });
  if (res.status !== 201) {
    throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { asset: { id: string; mimeType: string } };
  // The r2 key is derived: assets/{userId}/{id}.{ext}
  const extByMime: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  const ext = extByMime[body.asset.mimeType] ?? 'bin';
  return {
    id: body.asset.id,
    r2Key: `assets/${userId}/${body.asset.id}.${ext}`,
    mimeType: body.asset.mimeType,
  };
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM assets'),
    env.DB.prepare('DELETE FROM saves'),
    env.DB.prepare('DELETE FROM users'),
    env.DB.prepare(
      'INSERT INTO users (id, username, is_home_member, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
    ).bind(USER_ID, 'mitri', now, now),
    env.DB.prepare(
      'INSERT INTO users (id, username, is_home_member, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
    ).bind(OTHER_USER_ID, 'other', now, now),
  ]);
});

describe('auth gating', () => {
  it('401s when unauthenticated', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://t/api/assets'), env);
    expect(res.status).toBe(401);
  });

  it('403s when fetching another user’s asset', async () => {
    const app = makeApp();
    const { id } = await uploadAsset(app, OTHER_USER_ID);
    const res = await authedFetch(app, `http://t/api/assets/${id}`, {
      userId: USER_ID,
    });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/assets', () => {
  it('uploads a file + name and returns the detail (201)', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/assets', {
      method: 'POST',
      body: uploadForm({ file: pngBlob(2048), name: 'logo' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      asset: { id: string; name: string; mimeType: string; sizeBytes: number; url: string };
    };
    expect(body.asset.name).toBe('logo');
    expect(body.asset.mimeType).toBe('image/png');
    expect(body.asset.sizeBytes).toBe(2048);
    expect(body.asset.url).toBe(`/api/assets/${body.asset.id}/file`);

    // D1 row exists
    const row = await env.DB
      .prepare('SELECT id, r2_key FROM assets WHERE id = ?')
      .bind(body.asset.id)
      .first<{ id: string; r2_key: string }>();
    expect(row).not.toBeNull();
    expect(row!.r2_key).toBe(`assets/${USER_ID}/${body.asset.id}.png`);

    // R2 object exists
    const obj = await env.R2.head(row!.r2_key);
    expect(obj).not.toBeNull();
  });

  it('400s when file exceeds 10 MB', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/assets', {
      method: 'POST',
      body: uploadForm({ file: pngBlob(11 * 1024 * 1024), name: 'big' }),
    });
    expect(res.status).toBe(400);
  });

  it('400s when mime is not allowed', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/assets', {
      method: 'POST',
      body: uploadForm({ file: pngBlob(100, 'application/pdf'), name: 'bad' }),
    });
    expect(res.status).toBe(400);
  });

  it('400s when SVG is uploaded (no longer allowed)', async () => {
    const app = makeApp();
    const svg = new Blob(
      ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
      { type: 'image/svg+xml' },
    );
    const res = await authedFetch(app, 'http://t/api/assets', {
      method: 'POST',
      body: uploadForm({ file: svg, name: 'evil', filename: 'evil.svg' }),
    });
    expect(res.status).toBe(400);
  });

  it('400s when bytes are not a recognized image format', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/assets', {
      method: 'POST',
      body: uploadForm({ file: fakePngBlob(64), name: 'liar' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message.toLowerCase()).toContain('unsupported file format');
  });

  it('400s when bytes match a different image format than the declared MIME', async () => {
    const app = makeApp();
    // Real JPEG magic bytes, but claim it's PNG.
    const buf = new Uint8Array(64);
    buf.set([0xff, 0xd8, 0xff, 0xe0], 0); // JPEG SOI
    const mismatched = new Blob([buf], { type: 'image/png' });
    const res = await authedFetch(app, 'http://t/api/assets', {
      method: 'POST',
      body: uploadForm({ file: mismatched, name: 'liar2' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message.toLowerCase()).toContain('does not match');
  });

  it('201s for a real PNG with valid magic bytes', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/assets', {
      method: 'POST',
      body: uploadForm({ file: pngBlob(512, 'image/png'), name: 'real-png' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      asset: { mimeType: string; sizeBytes: number };
    };
    expect(body.asset.mimeType).toBe('image/png');
    expect(body.asset.sizeBytes).toBe(512);
  });

  it('400s when file is missing', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/assets', {
      method: 'POST',
      body: uploadForm({ name: 'no-file' }),
    });
    expect(res.status).toBe(400);
  });

  it('400s when name is missing', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/assets', {
      method: 'POST',
      body: uploadForm({ file: pngBlob(100) }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/assets', () => {
  it('returns only this user’s assets', async () => {
    const app = makeApp();
    await uploadAsset(app, USER_ID, 'mine');
    await uploadAsset(app, OTHER_USER_ID, 'theirs');
    const res = await authedFetch(app, 'http://t/api/assets');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { assets: { name: string }[] };
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0]!.name).toBe('mine');
  });
});

describe('PATCH /api/assets/:id', () => {
  it('renames an asset', async () => {
    const app = makeApp();
    const { id } = await uploadAsset(app, USER_ID, 'old');
    const res = await authedFetch(app, `http://t/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'new' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { asset: { name: string } };
    expect(body.asset.name).toBe('new');
  });

  it('400s on empty name', async () => {
    const app = makeApp();
    const { id } = await uploadAsset(app, USER_ID, 'a');
    const res = await authedFetch(app, `http://t/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/assets/:id', () => {
  it('204s when no references; removes R2 object and D1 row', async () => {
    const app = makeApp();
    const { id, r2Key } = await uploadAsset(app, USER_ID);
    expect(await env.R2.head(r2Key)).not.toBeNull();
    const res = await authedFetch(app, `http://t/api/assets/${id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
    expect(await env.R2.head(r2Key)).toBeNull();
    const row = await env.DB
      .prepare('SELECT id FROM assets WHERE id = ?')
      .bind(id)
      .first();
    expect(row).toBeNull();
  });

  it('409s when a save references the asset and leaves R2 + D1 intact', async () => {
    const app = makeApp();
    const { id, r2Key } = await uploadAsset(app, USER_ID);
    // Seed a save that references this asset id.
    const recipe = {
      ...createEmptyRecipe(),
      layers: [
        {
          id: 'l1',
          kind: 'image' as const,
          assetId: id,
          x: 0.5,
          y: 0.5,
          rotation: 0,
          scale: 1,
          opacity: 1,
        },
      ],
    };
    const now = Date.now();
    await env.DB
      .prepare(
        `INSERT INTO saves (id, user_id, name, recipe_json, is_template, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      )
      .bind('sv_using', USER_ID, 'using asset', JSON.stringify(recipe), now, now)
      .run();

    const res = await authedFetch(app, `http://t/api/assets/${id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string; message: string; references: { id: string; name: string }[] };
    };
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.references).toHaveLength(1);
    expect(body.error.references[0]).toEqual({ id: 'sv_using', name: 'using asset' });

    // R2 + D1 still present.
    expect(await env.R2.head(r2Key)).not.toBeNull();
    const row = await env.DB
      .prepare('SELECT id FROM assets WHERE id = ?')
      .bind(id)
      .first();
    expect(row).not.toBeNull();
  });
});

describe('GET /api/assets/:id/file', () => {
  it('streams the file with the correct content-type and cache-control', async () => {
    const app = makeApp();
    const { id } = await uploadAsset(app, USER_ID);
    const res = await authedFetch(app, `http://t/api/assets/${id}/file`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toContain('max-age=3600');
    const ab = await res.arrayBuffer();
    expect(ab.byteLength).toBe(1024);
  });

  it('403s for another user’s file', async () => {
    const app = makeApp();
    const { id } = await uploadAsset(app, OTHER_USER_ID);
    const res = await authedFetch(app, `http://t/api/assets/${id}/file`, {
      userId: USER_ID,
    });
    expect(res.status).toBe(403);
  });
});
