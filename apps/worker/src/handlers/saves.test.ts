import { applyD1Migrations, env } from 'cloudflare:test';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import { sessionMiddleware, SESSION_COOKIE } from '../mw/session.js';
import { requireAuth } from '../mw/requireAuth.js';
import {
  cloneSaveHandler,
  createSaveHandler,
  deleteSaveHandler,
  getSaveHandler,
  listSavesHandler,
  updateSaveHandler,
} from './saves.js';

const USER_ID = '714517219026927767';
const OTHER_USER_ID = '999';

function makeApp() {
  const app = new Hono<AppEnv>();
  app.use(sessionMiddleware);
  app.use('/api/saves/*', requireAuth);
  app.get('/api/saves', listSavesHandler);
  app.post('/api/saves', createSaveHandler);
  app.get('/api/saves/:id', getSaveHandler);
  app.patch('/api/saves/:id', updateSaveHandler);
  app.delete('/api/saves/:id', deleteSaveHandler);
  app.post('/api/saves/:id/clone', cloneSaveHandler);
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
      jti: `saves-test-${userId}-${now}-${Math.random().toString(36).slice(2)}`,
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

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM saves'),
    env.DB.prepare('DELETE FROM users'),
    env.DB.prepare(
      'INSERT INTO users (id, username, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).bind(USER_ID, 'mitri', now, now),
    env.DB.prepare(
      'INSERT INTO users (id, username, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).bind(OTHER_USER_ID, 'other', now, now),
  ]);
});

describe('GET /api/saves', () => {
  it('401s when unauthenticated', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://t/api/saves'), env);
    expect(res.status).toBe(401);
  });

  it('returns the current user’s saves only', async () => {
    const app = makeApp();
    await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'mine', recipe: createEmptyRecipe() }),
    });
    await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'theirs', recipe: createEmptyRecipe() }),
      userId: OTHER_USER_ID,
    });
    const res = await authedFetch(app, 'http://t/api/saves');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { saves: { name: string }[] };
    expect(body.saves).toHaveLength(1);
    expect(body.saves[0]!.name).toBe('mine');
  });

});

describe('POST /api/saves', () => {
  it('creates a save and returns the detail', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'first', recipe: createEmptyRecipe() }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { save: { name: string } };
    expect(body.save.name).toBe('first');
  });

  it('400s on invalid body', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('VALIDATION');
  });
});

describe('GET /api/saves/:id', () => {
  it('returns the save detail when owner', async () => {
    const app = makeApp();
    const created = await (await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x', recipe: createEmptyRecipe() }),
    })).json() as { save: { id: string } };

    const res = await authedFetch(app, `http://t/api/saves/${created.save.id}`);
    expect(res.status).toBe(200);
  });

  it('403s when not owner', async () => {
    const app = makeApp();
    const created = await (await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'mine', recipe: createEmptyRecipe() }),
    })).json() as { save: { id: string } };

    const res = await authedFetch(app, `http://t/api/saves/${created.save.id}`, {
      userId: OTHER_USER_ID,
    });
    expect(res.status).toBe(403);
  });

  it('404s for missing id', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/saves/missing');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/saves/:id', () => {
  it('updates name', async () => {
    const app = makeApp();
    const created = await (await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'old', recipe: createEmptyRecipe() }),
    })).json() as { save: { id: string } };

    const res = await authedFetch(app, `http://t/api/saves/${created.save.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'new' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { save: { name: string } };
    expect(body.save.name).toBe('new');
  });

  it('updates tags and normalizes (lowercase + dedupe)', async () => {
    const app = makeApp();
    const created = await (await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 's', recipe: createEmptyRecipe() }),
    })).json() as { save: { id: string; tags: string[] } };
    expect(created.save.tags).toEqual([]);

    const res = await authedFetch(app, `http://t/api/saves/${created.save.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tags: ['Icon', 'brand', 'icon'] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { save: { tags: string[] } };
    expect(body.save.tags).toEqual(['icon', 'brand']);
  });
});

describe('POST /api/saves with tags', () => {
  it('accepts tags on create and returns them in the detail', async () => {
    const app = makeApp();
    const res = await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'tagged',
        recipe: createEmptyRecipe(),
        tags: ['ICON', 'icon', 'Brand'],
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { save: { tags: string[] } };
    expect(body.save.tags).toEqual(['icon', 'brand']);
  });
});

describe('DELETE /api/saves/:id', () => {
  it('removes the row and returns 204', async () => {
    const app = makeApp();
    const created = await (await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x', recipe: createEmptyRecipe() }),
    })).json() as { save: { id: string } };

    const res = await authedFetch(app, `http://t/api/saves/${created.save.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
    const after = await authedFetch(app, `http://t/api/saves/${created.save.id}`);
    expect(after.status).toBe(404);
  });
});

describe('POST /api/saves/:id/clone', () => {
  it('creates a new row with `(copy)` suffix', async () => {
    const app = makeApp();
    const created = await (await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'tpl', recipe: createEmptyRecipe() }),
    })).json() as { save: { id: string } };

    const res = await authedFetch(app, `http://t/api/saves/${created.save.id}/clone`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { save: { id: string; name: string } };
    expect(body.save.id).not.toBe(created.save.id);
    expect(body.save.name).toBe('tpl (copy)');
  });

  it('honors a custom name', async () => {
    const app = makeApp();
    const created = await (await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'a', recipe: createEmptyRecipe() }),
    })).json() as { save: { id: string } };

    const res = await authedFetch(app, `http://t/api/saves/${created.save.id}/clone`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'fresh' }),
    });
    const body = (await res.json()) as { save: { name: string } };
    expect(body.save.name).toBe('fresh');
  });
});
