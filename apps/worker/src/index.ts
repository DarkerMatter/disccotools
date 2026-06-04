import { Hono } from 'hono';
import { API_VERSION } from '@disccotools/shared';
import type { AppEnv } from './env.js';
import { sessionMiddleware } from './mw/session.js';
import { callbackHandler, loginHandler, meHandler, logoutHandler } from './handlers/auth.js';
import { requireAuth } from './mw/requireAuth.js';
import {
  cloneSaveHandler,
  createSaveHandler,
  deleteSaveHandler,
  getSaveHandler,
  listSavesHandler,
  updateSaveHandler,
} from './handlers/saves.js';
import {
  downloadHandler,
  thumbnailHandler,
  uploadRenderHandler,
} from './handlers/saves-render.js';
import {
  createAssetHandler,
  deleteAssetHandler,
  getAssetFileHandler,
  getAssetHandler,
  listAssetsHandler,
  renameAssetHandler,
} from './handlers/assets.js';

const app = new Hono<AppEnv>();

app.use(sessionMiddleware);

app.get('/api/auth/login', loginHandler);
app.get('/api/auth/callback', callbackHandler);
app.get('/api/auth/me', meHandler);
app.post('/api/auth/logout', logoutHandler);

// Saves — all routes require authentication.
app.use('/api/saves/*', requireAuth);
app.get('/api/saves', listSavesHandler);
app.post('/api/saves', createSaveHandler);
app.get('/api/saves/:id', getSaveHandler);
app.patch('/api/saves/:id', updateSaveHandler);
app.delete('/api/saves/:id', deleteSaveHandler);
app.post('/api/saves/:id/clone', cloneSaveHandler);
app.post('/api/saves/:id/render', uploadRenderHandler);
app.get('/api/saves/:id/download', downloadHandler);
app.get('/api/saves/:id/thumbnail', thumbnailHandler);

// Assets — all routes require authentication.
app.use('/api/assets/*', requireAuth);
app.post('/api/assets', createAssetHandler);
app.get('/api/assets', listAssetsHandler);
app.get('/api/assets/:id', getAssetHandler);
app.patch('/api/assets/:id', renameAssetHandler);
app.delete('/api/assets/:id', deleteAssetHandler);
app.get('/api/assets/:id/file', getAssetFileHandler);

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
