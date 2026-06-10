import { applyD1Migrations, env } from 'cloudflare:test';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AppEnv } from '../env.js';
import { sessionMiddleware, SESSION_COOKIE } from '../mw/session.js';
import { requireAuth } from '../mw/requireAuth.js';
import { requireAdmin } from '../mw/requireAdmin.js';
import { createAssetHandler } from './assets.js';
import { meHandler } from './auth.js';
import {
  ackNoticeHandler,
  deleteAdminAssetHandler,
  deleteAdminUserHandler,
  listAdminUsersHandler,
  setAdminUserPermHandler,
} from './admin.js';

const ADMIN_ID = '714517219026927767';
const USER_ID = '111';
const OTHER_USER_ID = '222';

function makeApp() {
  const app = new Hono<AppEnv>();
  app.use(sessionMiddleware);
  app.get('/api/auth/me', meHandler);

  app.use('/api/assets/*', requireAuth);
  app.post('/api/assets', createAssetHandler);

  app.use('/api/notices/*', requireAuth);
  app.post('/api/notices/:id/ack', ackNoticeHandler);

  app.use('/api/admin/*', requireAuth);
  app.use('/api/admin/*', requireAdmin);
  app.get('/api/admin/users', listAdminUsersHandler);
  app.patch('/api/admin/users/:id/perm', setAdminUserPermHandler);
  app.delete('/api/admin/users/:id', deleteAdminUserHandler);
  app.delete('/api/admin/assets/:id', deleteAdminAssetHandler);
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
      jti: `admin-test-${userId}-${now}-${Math.random().toString(36).slice(2)}`,
      iat: now,
      exp: now + 3600,
    },
    env.SESSION_SIGNING_SECRET,
  );
  return `${SESSION_COOKIE}=${token}`;
}

async function fetchAs(
  app: ReturnType<typeof makeApp>,
  url: string,
  init: RequestInit & { userId: string },
): Promise<Response> {
  const { userId, headers, ...rest } = init;
  const cookie = await cookieFor(userId);
  const h = new Headers(headers);
  h.set('Cookie', cookie);
  return app.fetch(new Request(url, { ...rest, headers: h }), env);
}

async function uploadOne(
  app: ReturnType<typeof makeApp>,
  userId: string,
  name = 'icon.png',
): Promise<Response> {
  // 1x1 PNG: 8-byte signature + IHDR + IDAT + IEND
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
  const form = new FormData();
  form.set('file', new Blob([png], { type: 'image/png' }), name);
  form.set('name', name);
  return fetchAs(app, 'http://t/api/assets', {
    method: 'POST',
    body: form,
    userId,
  });
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM admin_actions'),
    env.DB.prepare('DELETE FROM assets'),
    env.DB.prepare('DELETE FROM saves'),
    env.DB.prepare('DELETE FROM users'),
    env.DB.prepare(
      'INSERT INTO users (id, username, created_at, updated_at, perm_level) VALUES (?, ?, ?, ?, ?)',
    ).bind(ADMIN_ID, 'admin', now, now, 10),
    env.DB.prepare(
      'INSERT INTO users (id, username, created_at, updated_at, perm_level) VALUES (?, ?, ?, ?, ?)',
    ).bind(USER_ID, 'basic-user', now, now, 1),
    env.DB.prepare(
      'INSERT INTO users (id, username, created_at, updated_at, perm_level) VALUES (?, ?, ?, ?, ?)',
    ).bind(OTHER_USER_ID, 'plus-user', now, now, 2),
  ]);
});

describe('requireAdmin', () => {
  it('returns 403 for non-admin users', async () => {
    const app = makeApp();
    const res = await fetchAs(app, 'http://t/api/admin/users', { userId: USER_ID });
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin', async () => {
    const app = makeApp();
    const res = await fetchAs(app, 'http://t/api/admin/users', { userId: ADMIN_ID });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: Array<{ id: string }> };
    expect(body.users.map((u) => u.id).sort()).toEqual([
      OTHER_USER_ID,
      USER_ID,
      ADMIN_ID,
    ].sort());
  });
});

describe('upload caps', () => {
  it('lets a basic user upload up to 5 images then rejects with QUOTA', async () => {
    const app = makeApp();
    for (let i = 0; i < 5; i++) {
      const res = await uploadOne(app, USER_ID, `icon-${i}.png`);
      expect(res.status).toBe(201);
    }
    const blocked = await uploadOne(app, USER_ID, 'icon-6.png');
    expect(blocked.status).toBe(403);
    const body = (await blocked.json()) as { error: { code: string; cap?: number } };
    expect(body.error.code).toBe('QUOTA');
    expect(body.error.cap).toBe(5);
  });

  it('lets a plus user upload 6 (above basic cap)', async () => {
    const app = makeApp();
    for (let i = 0; i < 6; i++) {
      const res = await uploadOne(app, OTHER_USER_ID, `icon-${i}.png`);
      expect(res.status).toBe(201);
    }
  });

  it('admin has no cap', async () => {
    const app = makeApp();
    // upload more than any cap; admin should keep going
    for (let i = 0; i < 12; i++) {
      const res = await uploadOne(app, ADMIN_ID, `icon-${i}.png`);
      expect(res.status).toBe(201);
    }
  });
});

describe('banned enforcement', () => {
  it('kills the session for banned users at /api/auth/me', async () => {
    // mark USER_ID as banned with a reason
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET perm_level = 0 WHERE id = ?`).bind(USER_ID),
      env.DB.prepare(
        `INSERT INTO admin_actions
         (id, admin_id, target_user_id, action, target_id, target_label, reason, created_at)
         VALUES (?, ?, ?, 'banned', NULL, NULL, ?, ?)`,
      ).bind('aa_ban_1', ADMIN_ID, USER_ID, 'spamming uploads', Date.now()),
    ]);
    const app = makeApp();
    const res = await fetchAs(app, 'http://t/api/auth/me', { userId: USER_ID });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { banned: boolean; reason: string };
    expect(body.banned).toBe(true);
    expect(body.reason).toBe('spamming uploads');
    // and the cookie clear header is set
    expect(res.headers.get('Set-Cookie') ?? '').toMatch(/sid=;/i);
  });

  it('blocks banned users from authenticated routes', async () => {
    await env.DB.prepare(`UPDATE users SET perm_level = 0 WHERE id = ?`).bind(USER_ID).run();
    const app = makeApp();
    const res = await uploadOne(app, USER_ID);
    expect(res.status).toBe(401);
  });
});

describe('admin actions are audited', () => {
  it('records a row on asset delete and surfaces it as a notice', async () => {
    const app = makeApp();
    // user uploads
    const upload = await uploadOne(app, USER_ID, 'bad.png');
    expect(upload.status).toBe(201);
    const { asset } = (await upload.json()) as { asset: { id: string; name: string } };

    // admin deletes with reason
    const del = await fetchAs(app, `http://t/api/admin/assets/${asset.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'violates policy' }),
      userId: ADMIN_ID,
    });
    expect(del.status).toBe(204);

    // the user sees a pending notice on next /me
    const me = await fetchAs(app, 'http://t/api/auth/me', { userId: USER_ID });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as {
      pendingNotices: Array<{ kind: string; reason: string; targetLabel: string | null }>;
    };
    expect(meBody.pendingNotices).toHaveLength(1);
    expect(meBody.pendingNotices[0].kind).toBe('asset_deleted');
    expect(meBody.pendingNotices[0].reason).toBe('violates policy');
    expect(meBody.pendingNotices[0].targetLabel).toBe('bad.png');
  });

  it('records a row on perm change and uses banned action when level becomes 0', async () => {
    const app = makeApp();
    const res = await fetchAs(app, `http://t/api/admin/users/${USER_ID}/perm`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ level: 0, reason: 'repeat offender' }),
      userId: ADMIN_ID,
    });
    expect(res.status).toBe(200);

    const row = await env.DB.prepare(
      `SELECT action, reason FROM admin_actions WHERE target_user_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
      .bind(USER_ID)
      .first<{ action: string; reason: string }>();
    expect(row?.action).toBe('banned');
    expect(row?.reason).toBe('repeat offender');
  });
});

describe('notice ack', () => {
  it('scopes ack to the target user (other user cannot ack)', async () => {
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO admin_actions
       (id, admin_id, target_user_id, action, target_id, target_label, reason, created_at)
       VALUES (?, ?, ?, 'asset_deleted', 'asset_x', 'pic.png', 'tos', ?)`,
    )
      .bind('aa_n1', ADMIN_ID, USER_ID, now)
      .run();

    const app = makeApp();
    // wrong user — should 404
    const wrong = await fetchAs(app, 'http://t/api/notices/aa_n1/ack', {
      method: 'POST',
      userId: OTHER_USER_ID,
    });
    expect(wrong.status).toBe(404);

    // owner — succeeds
    const right = await fetchAs(app, 'http://t/api/notices/aa_n1/ack', {
      method: 'POST',
      userId: USER_ID,
    });
    expect(right.status).toBe(204);

    const after = await env.DB.prepare(
      `SELECT acknowledged_at FROM admin_actions WHERE id = ?`,
    )
      .bind('aa_n1')
      .first<{ acknowledged_at: number | null }>();
    expect(after?.acknowledged_at).not.toBeNull();
  });
});

describe('cascade delete user', () => {
  it('removes assets, saves, and the user row, keeps the audit', async () => {
    const app = makeApp();
    // user uploads a thing
    const upload = await uploadOne(app, USER_ID, 'mine.png');
    expect(upload.status).toBe(201);
    const { asset } = (await upload.json()) as { asset: { id: string } };

    // also add a save manually
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO saves (id, user_id, name, recipe_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        'save_1',
        USER_ID,
        'a',
        JSON.stringify({
          shape: 'circle',
          background: { kind: 'solid', color: '#fff', opacity: 1 },
          layers: [],
          shapeRotation: 0,
          renderSize: 256,
        }),
        now,
        now,
      )
      .run();

    const del = await fetchAs(app, `http://t/api/admin/users/${USER_ID}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'banned, content wiped' }),
      userId: ADMIN_ID,
    });
    expect(del.status).toBe(204);

    const userRow = await env.DB.prepare(`SELECT id FROM users WHERE id = ?`)
      .bind(USER_ID)
      .first();
    expect(userRow).toBeNull();

    const assetRow = await env.DB.prepare(`SELECT id FROM assets WHERE id = ?`)
      .bind(asset.id)
      .first();
    expect(assetRow).toBeNull();

    const saveRow = await env.DB.prepare(`SELECT id FROM saves WHERE id = ?`)
      .bind('save_1')
      .first();
    expect(saveRow).toBeNull();

    // audit row stays
    const auditRow = await env.DB.prepare(
      `SELECT action, reason FROM admin_actions WHERE target_user_id = ? AND action = 'account_deleted'`,
    )
      .bind(USER_ID)
      .first<{ action: string; reason: string }>();
    expect(auditRow?.action).toBe('account_deleted');
    expect(auditRow?.reason).toBe('banned, content wiped');
  });

  it('refuses to let an admin delete themselves', async () => {
    const app = makeApp();
    const res = await fetchAs(app, `http://t/api/admin/users/${ADMIN_ID}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'oops' }),
      userId: ADMIN_ID,
    });
    expect(res.status).toBe(403);
  });
});
