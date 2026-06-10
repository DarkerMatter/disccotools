import { Hono } from 'hono';
import { API_VERSION } from '@disccotools/shared';
import type { AppEnv } from './env.js';
import { sessionMiddleware } from './mw/session.js';
import { callbackHandler, loginHandler, meHandler, logoutHandler } from './handlers/auth.js';
import { requireAuth } from './mw/requireAuth.js';
import { requireAdmin } from './mw/requireAdmin.js';
import {
  cloneSaveHandler,
  createSaveHandler,
  deleteSaveHandler,
  getSaveHandler,
  listSavesHandler,
  updateSaveHandler,
} from './handlers/saves.js';
import {
  createShareHandler,
  getSharedSaveHandler,
  importSharedSaveHandler,
  revokeShareHandler,
} from './handlers/share.js';
import {
  createAssetHandler,
  deleteAssetHandler,
  getAssetFileHandler,
  getAssetHandler,
  listAssetsHandler,
  renameAssetHandler,
} from './handlers/assets.js';
import {
  bakeColor,
  listCustomIconsHandler,
  validateColor,
} from './handlers/iconPack.js';
import {
  ackNoticeHandler,
  deleteAdminAssetHandler,
  deleteAdminCustomIconHandler,
  deleteAdminSaveHandler,
  deleteAdminUserHandler,
  getAdminUserHandler,
  listAdminAssetsHandler,
  listAdminCustomIconsHandler,
  listAdminSavesHandler,
  listAdminUsersHandler,
  setAdminUserPermHandler,
} from './handlers/admin.js';

const app = new Hono<AppEnv>();

app.use(sessionMiddleware);

app.get('/api/auth/login', loginHandler);
app.get('/api/auth/callback', callbackHandler);
app.get('/api/auth/me', meHandler);
app.post('/api/auth/logout', logoutHandler);

app.use('/api/saves/*', requireAuth);
app.get('/api/saves', listSavesHandler);
app.post('/api/saves', createSaveHandler);
app.get('/api/saves/:id', getSaveHandler);
app.patch('/api/saves/:id', updateSaveHandler);
app.delete('/api/saves/:id', deleteSaveHandler);
app.post('/api/saves/:id/clone', cloneSaveHandler);
app.post('/api/saves/:id/share', createShareHandler);
app.delete('/api/saves/:id/share', revokeShareHandler);

// public share endpoint — no auth gate so anyone with the link can view
app.get('/api/share/:token', getSharedSaveHandler);
// import does need auth, since it writes a save under the caller
app.use('/api/share/:token/import', requireAuth);
app.post('/api/share/:token/import', importSharedSaveHandler);

app.use('/api/assets/*', requireAuth);
app.post('/api/assets', createAssetHandler);
app.get('/api/assets', listAssetsHandler);
app.get('/api/assets/:id', getAssetHandler);
app.patch('/api/assets/:id', renameAssetHandler);
app.delete('/api/assets/:id', deleteAssetHandler);
app.get('/api/assets/:id/file', getAssetFileHandler);

app.get('/api/icon-pack/custom', listCustomIconsHandler);

app.use('/api/notices/*', requireAuth);
app.post('/api/notices/:id/ack', ackNoticeHandler);

app.use('/api/admin/*', requireAuth);
app.use('/api/admin/*', requireAdmin);
app.get('/api/admin/users', listAdminUsersHandler);
app.get('/api/admin/users/:id', getAdminUserHandler);
app.patch('/api/admin/users/:id/perm', setAdminUserPermHandler);
app.delete('/api/admin/users/:id', deleteAdminUserHandler);
app.get('/api/admin/assets', listAdminAssetsHandler);
app.delete('/api/admin/assets/:id', deleteAdminAssetHandler);
app.get('/api/admin/saves', listAdminSavesHandler);
app.delete('/api/admin/saves/:id', deleteAdminSaveHandler);
app.get('/api/admin/icon-pack/custom', listAdminCustomIconsHandler);
app.delete('/api/admin/icon-pack/custom', deleteAdminCustomIconHandler);

app.get('/static/*', async (c) => {
  const path = c.req.path.replace(/^\/static\//, '');
  if (!path) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'missing path' } }, 404);
  }
  const object = await c.env.R2.get(`static/${path}`);
  if (!object) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'asset not found' } }, 404);
  }

  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream';
  const isSvg = contentType.includes('svg') || path.toLowerCase().endsWith('.svg');
  const requestedColor = validateColor(c.req.query('color'));

  if (isSvg && requestedColor) {
    const text = await object.text();
    const baked = bakeColor(text, requestedColor);
    return new Response(baked, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(object.size),
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

app.get('/api/health', (c) =>
  c.json({ status: 'ok', apiVersion: API_VERSION }, 200),
);

app.notFound((c) =>
  c.json(
    { error: { code: 'NOT_FOUND', message: 'route not found' } },
    404,
  ),
);

app.onError((err, c) => {
  console.error('worker error', err);
  return c.json(
    { error: { code: 'INTERNAL', message: 'internal server error' } },
    500,
  );
});

export default app;
