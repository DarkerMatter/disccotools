import type { Context } from 'hono';
import {
  ImportSharedSaveBodySchema,
  type SaveDetail,
  type SharedSave,
  type SharedSaveResponse,
} from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import { getUser } from '../db/users.js';
import {
  ensureSaveShareToken,
  getSave,
  getSaveByShareToken,
  importSharedSave,
  setSaveShareToken,
  type Save,
} from '../db/saves.js';

function validation(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: 'VALIDATION', message } }, 400);
}

function notFound(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'save not found' } }, 404);
}

function forbidden(c: Context<AppEnv>) {
  return c.json({ error: { code: 'FORBIDDEN', message: 'not your save' } }, 403);
}

async function safeJson(c: Context<AppEnv>): Promise<unknown | undefined> {
  try {
    return (await c.req.json()) as unknown;
  } catch {
    return undefined;
  }
}

function toDetail(save: Save): SaveDetail {
  return {
    id: save.id,
    name: save.name,
    recipe: save.recipe,
    createdAt: save.createdAt,
    updatedAt: save.updatedAt,
    tags: save.tags,
    shareToken: save.shareToken,
  };
}

// POST /api/saves/:id/share — owner-only. Generate (or reuse) a share token.
export async function createShareHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const user = c.var.user!;

  const save = await getSave(c.env.DB, id);
  if (!save) return notFound(c);
  if (save.userId !== user.id) return forbidden(c);

  const updated = await ensureSaveShareToken(c.env.DB, id);
  if (!updated) return notFound(c);
  return c.json({ save: toDetail(updated) }, 200);
}

// DELETE /api/saves/:id/share — owner-only. Drops the share token, invalidating
// any URLs that point at this save.
export async function revokeShareHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const user = c.var.user!;

  const save = await getSave(c.env.DB, id);
  if (!save) return notFound(c);
  if (save.userId !== user.id) return forbidden(c);

  const updated = await setSaveShareToken(c.env.DB, id, null);
  if (!updated) return notFound(c);
  return c.json({ save: toDetail(updated) }, 200);
}

// GET /api/share/:token — public, no auth. Returns the save's recipe + display
// metadata so anyone with the link can preview it.
export async function getSharedSaveHandler(c: Context<AppEnv>): Promise<Response> {
  const token = c.req.param('token');
  if (!token) return validation(c, 'missing token');

  const save = await getSaveByShareToken(c.env.DB, token);
  if (!save || !save.shareToken) return notFound(c);

  const owner = await getUser(c.env.DB, save.userId);
  const ownerName = owner ? (owner.globalName ?? owner.username) : 'Someone';

  const shared: SharedSave = {
    id: save.id,
    name: save.name,
    recipe: save.recipe,
    tags: save.tags,
    ownerName,
    createdAt: save.createdAt,
    shareToken: save.shareToken,
  };

  const body: SharedSaveResponse = { save: shared };
  return c.json(body, 200);
}

// POST /api/share/:token/import — auth. Creates a copy under the current user.
export async function importSharedSaveHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const token = c.req.param('token');
  if (!token) return validation(c, 'missing token');
  const user = c.var.user!;

  const save = await getSaveByShareToken(c.env.DB, token);
  if (!save || !save.shareToken) return notFound(c);

  const body = (await safeJson(c)) ?? {};
  const parsed = ImportSharedSaveBodySchema.safeParse(body);
  if (!parsed.success) return validation(c, parsed.error.message);

  const opts: { userId: string; newName?: string } = { userId: user.id };
  if (parsed.data.name) opts.newName = parsed.data.name;
  const child = await importSharedSave(c.env.DB, save.id, opts);
  if (!child) return notFound(c);
  return c.json({ save: toDetail(child) }, 201);
}
