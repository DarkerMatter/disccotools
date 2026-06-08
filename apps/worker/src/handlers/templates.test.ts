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
  getSharedTemplateHandler,
  importSharedTemplateHandler,
  revokeShareHandler,
  useTemplateHandler,
} from './templates.js';

const OWNER_ID = '714517219026927767';
const VISITOR_ID = '999';

function makeApp() {
  const app = new Hono<AppEnv>();
  app.use(sessionMiddleware);

  // public — no auth on the shared GET
  app.get('/api/templates/share/:token', getSharedTemplateHandler);

  // everything else needs auth
  app.use('/api/saves/*', requireAuth);
  app.use('/api/templates/share/:token/import', requireAuth);

  app.post('/api/saves', createSaveHandler);
  app.post('/api/saves/:id/use', useTemplateHandler);
  app.post('/api/saves/:id/share', createShareHandler);
  app.delete('/api/saves/:id/share', revokeShareHandler);
  app.post('/api/templates/share/:token/import', importSharedTemplateHandler);
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
      jti: `tpl-test-${userId}-${now}-${Math.random().toString(36).slice(2)}`,
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

async function createTemplate(app: ReturnType<typeof makeApp>): Promise<string> {
  const res = await authedFetch(app, 'http://t/api/saves', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'My Template',
      recipe: createEmptyRecipe(),
      isTemplate: true,
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

describe('POST /api/saves/:id/use', () => {
  it('creates a child save bound to the template', async () => {
    const app = makeApp();
    const templateId = await createTemplate(app);
    const res = await authedFetch(app, `http://t/api/saves/${templateId}/use`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'My copy' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      save: { id: string; name: string; isTemplate: boolean; parentTemplateId: string | null };
    };
    expect(body.save.parentTemplateId).toBe(templateId);
    expect(body.save.isTemplate).toBe(false);
    expect(body.save.name).toBe('My copy');
    expect(body.save.id).not.toBe(templateId);
  });

  it('409s when the source save is not a template', async () => {
    const app = makeApp();
    const create = await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'plain', recipe: createEmptyRecipe(), isTemplate: false }),
    });
    const { save } = (await create.json()) as { save: { id: string } };
    const res = await authedFetch(app, `http://t/api/saves/${save.id}/use`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(409);
  });

  it('allows a visitor to use a template they did not author', async () => {
    const app = makeApp();
    const templateId = await createTemplate(app);
    const res = await authedFetch(app, `http://t/api/saves/${templateId}/use`, {
      method: 'POST',
      userId: VISITOR_ID,
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(201);
  });
});

describe('POST /api/saves/:id/share', () => {
  it('generates a share token for the owner', async () => {
    const app = makeApp();
    const templateId = await createTemplate(app);
    const res = await authedFetch(app, `http://t/api/saves/${templateId}/share`, {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { save: { shareToken: string | null } };
    expect(typeof body.save.shareToken).toBe('string');
    expect(body.save.shareToken!.length).toBeGreaterThan(8);
  });

  it('is idempotent — the same token is returned twice', async () => {
    const app = makeApp();
    const templateId = await createTemplate(app);
    const first = await authedFetch(app, `http://t/api/saves/${templateId}/share`, { method: 'POST' });
    const second = await authedFetch(app, `http://t/api/saves/${templateId}/share`, { method: 'POST' });
    const a = (await first.json()) as { save: { shareToken: string } };
    const b = (await second.json()) as { save: { shareToken: string } };
    expect(b.save.shareToken).toBe(a.save.shareToken);
  });

  it('403s when a non-owner tries to share', async () => {
    const app = makeApp();
    const templateId = await createTemplate(app);
    const res = await authedFetch(app, `http://t/api/saves/${templateId}/share`, {
      method: 'POST',
      userId: VISITOR_ID,
    });
    expect(res.status).toBe(403);
  });

  it('shares plain designs (not just templates) since v2.0.1', async () => {
    const app = makeApp();
    const create = await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'design', recipe: createEmptyRecipe(), isTemplate: false }),
    });
    const { save } = (await create.json()) as { save: { id: string } };
    const share = await authedFetch(app, `http://t/api/saves/${save.id}/share`, { method: 'POST' });
    expect(share.status).toBe(200);
    const body = (await share.json()) as { save: { shareToken: string | null } };
    expect(typeof body.save.shareToken).toBe('string');
  });
});

describe('import flow for plain (non-template) shares', () => {
  it('creates an unbound copy (no parentTemplateId) for an imported non-template', async () => {
    const app = makeApp();
    const create = await authedFetch(app, 'http://t/api/saves', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'design', recipe: createEmptyRecipe(), isTemplate: false }),
    });
    const { save: original } = (await create.json()) as { save: { id: string } };
    const share = await authedFetch(app, `http://t/api/saves/${original.id}/share`, { method: 'POST' });
    const { save: shared } = (await share.json()) as { save: { shareToken: string } };

    const res = await authedFetch(app, `http://t/api/templates/share/${shared.shareToken}/import`, {
      method: 'POST',
      userId: VISITOR_ID,
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      save: { parentTemplateId: string | null; isTemplate: boolean };
    };
    expect(body.save.parentTemplateId).toBeNull(); // unbounded copy
    expect(body.save.isTemplate).toBe(false);
  });
});

describe('DELETE /api/saves/:id/share', () => {
  it('clears the share token', async () => {
    const app = makeApp();
    const templateId = await createTemplate(app);
    await authedFetch(app, `http://t/api/saves/${templateId}/share`, { method: 'POST' });
    const res = await authedFetch(app, `http://t/api/saves/${templateId}/share`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { save: { shareToken: string | null } };
    expect(body.save.shareToken).toBeNull();
  });
});

describe('GET /api/templates/share/:token', () => {
  it('returns the template publicly with owner name', async () => {
    const app = makeApp();
    const templateId = await createTemplate(app);
    const share = await authedFetch(app, `http://t/api/saves/${templateId}/share`, { method: 'POST' });
    const shareBody = (await share.json()) as { save: { shareToken: string } };
    const token = shareBody.save.shareToken;

    // public — no cookie attached
    const res = await app.fetch(
      new Request(`http://t/api/templates/share/${token}`),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      template: { id: string; name: string; ownerName: string };
    };
    expect(body.template.id).toBe(templateId);
    expect(body.template.name).toBe('My Template');
    expect(body.template.ownerName).toBe('Mitri');
  });

  it('404s after the share is revoked', async () => {
    const app = makeApp();
    const templateId = await createTemplate(app);
    const share = await authedFetch(app, `http://t/api/saves/${templateId}/share`, { method: 'POST' });
    const { save } = (await share.json()) as { save: { shareToken: string } };
    const token = save.shareToken;
    await authedFetch(app, `http://t/api/saves/${templateId}/share`, { method: 'DELETE' });

    const res = await app.fetch(new Request(`http://t/api/templates/share/${token}`), env);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/templates/share/:token/import', () => {
  it('lets an authenticated visitor import a shared template', async () => {
    const app = makeApp();
    const templateId = await createTemplate(app);
    const share = await authedFetch(app, `http://t/api/saves/${templateId}/share`, { method: 'POST' });
    const { save } = (await share.json()) as { save: { shareToken: string } };
    const token = save.shareToken;

    const res = await authedFetch(app, `http://t/api/templates/share/${token}/import`, {
      method: 'POST',
      userId: VISITOR_ID,
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      save: { id: string; isTemplate: boolean; parentTemplateId: string | null };
    };
    expect(body.save.parentTemplateId).toBe(templateId);
    expect(body.save.isTemplate).toBe(false);
    expect(body.save.id).not.toBe(templateId);
  });

  it('401s when the visitor is anonymous', async () => {
    const app = makeApp();
    const templateId = await createTemplate(app);
    const share = await authedFetch(app, `http://t/api/saves/${templateId}/share`, { method: 'POST' });
    const { save } = (await share.json()) as { save: { shareToken: string } };
    const res = await app.fetch(
      new Request(`http://t/api/templates/share/${save.shareToken}/import`, { method: 'POST' }),
      env,
    );
    expect(res.status).toBe(401);
  });
});
