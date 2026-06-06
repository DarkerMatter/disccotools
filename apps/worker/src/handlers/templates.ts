import type { Context } from 'hono';
import {
  UseTemplateBodySchema,
  type SaveDetail,
  type SharedTemplate,
  type SharedTemplateResponse,
} from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import { getUser } from '../db/users.js';
import {
  ensureSaveShareToken,
  getSave,
  getSaveByShareToken,
  setSaveShareToken,
  useTemplate,
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

function conflict(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: 'CONFLICT', message } }, 409);
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
    isTemplate: save.isTemplate,
    createdAt: save.createdAt,
    updatedAt: save.updatedAt,
    tags: save.tags,
    parentTemplateId: save.parentTemplateId,
    shareToken: save.shareToken,
  };
}

// POST /api/saves/:id/use — create a copy of the source save as a child design
// under the current user. Requires the source to be a template.
export async function useTemplateHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const user = c.var.user!;

  const source = await getSave(c.env.DB, id);
  if (!source) return notFound(c);
  if (!source.isTemplate) return conflict(c, 'save is not a template');

  const body = (await safeJson(c)) ?? {};
  const parsed = UseTemplateBodySchema.safeParse(body);
  if (!parsed.success) return validation(c, parsed.error.message);

  const opts: { userId: string; newName?: string } = { userId: user.id };
  if (parsed.data.name) opts.newName = parsed.data.name;
  const child = await useTemplate(c.env.DB, id, opts);
  if (!child) return notFound(c);
  return c.json({ save: toDetail(child) }, 201);
}

// POST /api/saves/:id/share — owner-only. Generate (or reuse) a share token.
// v2.0.1: works for any save, not just templates. Non-template shares
// produce orphan copies on import; templates still get the parent linkage.
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
// any URLs that point at this template.
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

// GET /api/templates/share/:token — public, no auth. Returns the save's recipe
// + display metadata so anyone with the link can preview it. Works for any
// shared save, template or design.
export async function getSharedTemplateHandler(c: Context<AppEnv>): Promise<Response> {
  const token = c.req.param('token');
  if (!token) return validation(c, 'missing token');

  const save = await getSaveByShareToken(c.env.DB, token);
  if (!save || !save.shareToken) return notFound(c);

  const owner = await getUser(c.env.DB, save.userId);
  const ownerName = owner ? (owner.globalName ?? owner.username) : 'Someone';

  const template: SharedTemplate = {
    id: save.id,
    name: save.name,
    recipe: save.recipe,
    tags: save.tags,
    ownerName,
    createdAt: save.createdAt,
    shareToken: save.shareToken,
  };

  const body: SharedTemplateResponse = { template };
  return c.json(body, 200);
}

// POST /api/templates/share/:token/import — auth. Creates a copy under the
// current user. If the source is a real template, the child remembers its
// lineage via parent_template_id; for plain designs the import is unbound.
export async function importSharedTemplateHandler(
  c: Context<AppEnv>,
): Promise<Response> {
  const token = c.req.param('token');
  if (!token) return validation(c, 'missing token');
  const user = c.var.user!;

  const save = await getSaveByShareToken(c.env.DB, token);
  if (!save || !save.shareToken) return notFound(c);

  const body = (await safeJson(c)) ?? {};
  const parsed = UseTemplateBodySchema.safeParse(body);
  if (!parsed.success) return validation(c, parsed.error.message);

  const opts: { userId: string; newName?: string } = { userId: user.id };
  if (parsed.data.name) opts.newName = parsed.data.name;
  const child = await useTemplate(c.env.DB, save.id, opts);
  if (!child) return notFound(c);
  return c.json({ save: toDetail(child) }, 201);
}
