import type { Context } from 'hono';
import type { SaveDetail } from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import { getSave, setSaveRender, type Save } from '../db/saves.js';
import { renderKey, thumbKey } from '../r2.js';

const MAX_FULL_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_THUMB_BYTES = 200 * 1024;     // 200 KB

function validation(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: 'VALIDATION', message } }, 400);
}

function notFound(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'save not found' } }, 404);
}

function forbidden(c: Context<AppEnv>) {
  return c.json({ error: { code: 'FORBIDDEN', message: 'not your save' } }, 403);
}

async function loadOwnedSave(c: Context<AppEnv>, id: string) {
  const user = c.var.user!;
  const save = await getSave(c.env.DB, id);
  if (!save) return { error: notFound(c) } as const;
  if (save.userId !== user.id) return { error: forbidden(c) } as const;
  return { save } as const;
}

function detailFor(save: Save): SaveDetail {
  return {
    id: save.id,
    name: save.name,
    recipe: save.recipe,
    isTemplate: save.isTemplate,
    renderedAt: save.renderedAt,
    createdAt: save.createdAt,
    updatedAt: save.updatedAt,
    thumbnailUrl: save.thumbKey ? `/api/saves/${save.id}/thumbnail` : null,
    downloadUrl: save.renderedKey ? `/api/saves/${save.id}/download` : null,
    tags: save.tags,
  };
}

export async function uploadRenderHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const owned = await loadOwnedSave(c, id);
  if ('error' in owned) return owned.error;

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return validation(c, 'expected multipart/form-data');
  }

  const full = form.get('full');
  const thumb = form.get('thumb');
  if (!(full instanceof Blob) || !(thumb instanceof Blob)) {
    return validation(c, 'missing full/thumb blob');
  }
  if (full.size > MAX_FULL_BYTES) {
    return validation(c, `full render exceeds ${MAX_FULL_BYTES} bytes`);
  }
  if (thumb.size > MAX_THUMB_BYTES) {
    return validation(c, `thumb exceeds ${MAX_THUMB_BYTES} bytes`);
  }
  if (full.type && full.type !== 'image/png') {
    return validation(c, 'full must be image/png');
  }
  if (thumb.type && thumb.type !== 'image/png') {
    return validation(c, 'thumb must be image/png');
  }

  const userId = owned.save.userId;
  const fullKey = renderKey(userId, id);
  const thumbKeyValue = thumbKey(userId, id);

  await c.env.R2.put(fullKey, await full.arrayBuffer(), {
    httpMetadata: { contentType: 'image/png' },
  });
  await c.env.R2.put(thumbKeyValue, await thumb.arrayBuffer(), {
    httpMetadata: { contentType: 'image/png' },
  });
  await setSaveRender(c.env.DB, id, {
    renderedKey: fullKey,
    thumbKey: thumbKeyValue,
    renderedFormat: 'png',
  });

  const updated = await getSave(c.env.DB, id);
  if (!updated) return notFound(c);
  return c.json({ save: detailFor(updated) }, 200);
}

export async function downloadHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const owned = await loadOwnedSave(c, id);
  if ('error' in owned) return owned.error;

  const { renderedKey: key } = owned.save;
  if (!key) return notFound(c);

  const object = await c.env.R2.get(key);
  if (!object) return notFound(c);
  const buf = await object.arrayBuffer();

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(buf.byteLength),
      'Content-Disposition': `attachment; filename="disccotools-${id}.png"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function thumbnailHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const owned = await loadOwnedSave(c, id);
  if ('error' in owned) return owned.error;

  const key = owned.save.thumbKey;
  if (!key) return notFound(c);

  const object = await c.env.R2.get(key);
  if (!object) return notFound(c);
  const buf = await object.arrayBuffer();

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(buf.byteLength),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
