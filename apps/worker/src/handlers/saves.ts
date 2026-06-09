import type { Context } from 'hono';
import {
  CloneSaveBodySchema,
  CreateSaveBodySchema,
  UpdateSaveBodySchema,
  type SaveDetail,
  type SaveSummary,
} from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import {
  cloneSave,
  createSave,
  deleteSave,
  getSave,
  listSavesByUser,
  updateSave,
  type Save,
} from '../db/saves.js';

function toSummary(save: Save): SaveSummary {
  return {
    id: save.id,
    name: save.name,
    createdAt: save.createdAt,
    updatedAt: save.updatedAt,
    recipe: save.recipe,
    tags: save.tags,
    shareToken: save.shareToken,
  };
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

export async function listSavesHandler(c: Context<AppEnv>): Promise<Response> {
  const user = c.var.user!;
  const limit = clampInt(c.req.query('limit'), 1, 200, 50);
  const after = c.req.query('after');
  const opts: Parameters<typeof listSavesByUser>[2] = { limit };
  if (after) opts.after = after;
  const saves = await listSavesByUser(c.env.DB, user.id, opts);
  return c.json({ saves: saves.map(toSummary) }, 200);
}

export async function createSaveHandler(c: Context<AppEnv>): Promise<Response> {
  const user = c.var.user!;
  const json = await safeJson(c);
  if (json === undefined) return validation(c, 'expected JSON body');
  const parsed = CreateSaveBodySchema.safeParse(json);
  if (!parsed.success) return validation(c, parsed.error.message);
  const createInput: Parameters<typeof createSave>[1] = {
    userId: user.id,
    name: parsed.data.name,
    recipe: parsed.data.recipe,
  };
  if (parsed.data.tags !== undefined) createInput.tags = parsed.data.tags;
  const created = await createSave(c.env.DB, createInput);
  return c.json({ save: toDetail(created) }, 201);
}

export async function getSaveHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const result = await loadOwnedSave(c, id);
  if ('error' in result) return result.error;
  return c.json({ save: toDetail(result.save) }, 200);
}

export async function updateSaveHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const result = await loadOwnedSave(c, id);
  if ('error' in result) return result.error;
  const json = await safeJson(c);
  if (json === undefined) return validation(c, 'expected JSON body');
  const parsed = UpdateSaveBodySchema.safeParse(json);
  if (!parsed.success) return validation(c, parsed.error.message);
  const patch: Parameters<typeof updateSave>[2] = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.recipe !== undefined) patch.recipe = parsed.data.recipe;
  if (parsed.data.tags !== undefined) patch.tags = parsed.data.tags;
  const updated = await updateSave(c.env.DB, id, patch);
  if (!updated) return notFound(c);
  return c.json({ save: toDetail(updated) }, 200);
}

export async function deleteSaveHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const result = await loadOwnedSave(c, id);
  if ('error' in result) return result.error;
  // legacy R2 renders from pre-v2 are now orphaned; they're harmless and
  // a manual cleanup pass can sweep them when bandwidth is convenient
  const { renderedKey, thumbKey } = result.save;
  if (renderedKey || thumbKey) {
    await Promise.allSettled([
      renderedKey ? c.env.R2.delete(renderedKey) : Promise.resolve(),
      thumbKey ? c.env.R2.delete(thumbKey) : Promise.resolve(),
    ]);
  }
  await deleteSave(c.env.DB, id);
  return c.body(null, 204);
}

export async function cloneSaveHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const result = await loadOwnedSave(c, id);
  if ('error' in result) return result.error;
  const json = (await safeJson(c)) ?? {};
  const parsed = CloneSaveBodySchema.safeParse(json);
  if (!parsed.success) return validation(c, parsed.error.message);
  const opts: { newName?: string } = {};
  if (parsed.data.name) opts.newName = parsed.data.name;
  const cloned = await cloneSave(c.env.DB, id, opts);
  if (!cloned) return notFound(c);
  return c.json({ save: toDetail(cloned) }, 201);
}

async function safeJson(c: Context<AppEnv>): Promise<unknown | undefined> {
  try {
    return (await c.req.json()) as unknown;
  } catch {
    return undefined;
  }
}

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}
