import { RecipeSchema, type Recipe } from '@disccotools/shared';
import { normalizeTags } from './tags.js';

type SaveRow = {
  id: string;
  user_id: string;
  name: string;
  recipe_json: string;
  rendered_key: string | null;
  thumb_key: string | null;
  rendered_format: string | null;
  rendered_at: number | null;
  is_template: number;
  created_at: number;
  updated_at: number;
  tags: string | null;
  parent_template_id: string | null;
  share_token: string | null;
};

export type RenderedFormat = 'png' | 'svg';

export type Save = {
  id: string;
  userId: string;
  name: string;
  recipe: Recipe;
  renderedKey: string | null;
  thumbKey: string | null;
  renderedFormat: RenderedFormat | null;
  renderedAt: number | null;
  isTemplate: boolean;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  parentTemplateId: string | null;
  shareToken: string | null;
};

export type SaveFilter = 'all' | 'designs' | 'templates';

function parseTagsColumn(raw: string | null | undefined): string[] {
  if (raw === null || raw === undefined) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const t of parsed) {
      if (typeof t === 'string') out.push(t);
    }
    return out;
  } catch {
    return [];
  }
}

function rowToSave(row: SaveRow): Save {
  let recipe: Recipe;
  try {
    const parsed = JSON.parse(row.recipe_json) as unknown;
    recipe = RecipeSchema.parse(parsed);
  } catch (err) {
    throw new Error(`saves: invalid recipe_json for save ${row.id}: ${(err as Error).message}`);
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    recipe,
    renderedKey: row.rendered_key,
    thumbKey: row.thumb_key,
    renderedFormat: row.rendered_format === 'png' || row.rendered_format === 'svg'
      ? row.rendered_format
      : null,
    renderedAt: row.rendered_at,
    isTemplate: row.is_template === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: parseTagsColumn(row.tags),
    parentTemplateId: row.parent_template_id,
    shareToken: row.share_token,
  };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `save_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export async function createSave(
  db: D1Database,
  input: {
    userId: string;
    name: string;
    recipe: Recipe;
    isTemplate?: boolean;
    tags?: string[];
    parentTemplateId?: string | null;
  },
): Promise<Save> {
  const now = Date.now();
  const id = newId();
  const tags = normalizeTags(input.tags);
  await db
    .prepare(
      `INSERT INTO saves (id, user_id, name, recipe_json, is_template, created_at, updated_at, tags, parent_template_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.userId,
      input.name,
      JSON.stringify(input.recipe),
      input.isTemplate ? 1 : 0,
      now,
      now,
      JSON.stringify(tags),
      input.parentTemplateId ?? null,
    )
    .run();
  const row = await db
    .prepare(`SELECT * FROM saves WHERE id = ?`)
    .bind(id)
    .first<SaveRow>();
  if (!row) throw new Error('createSave: row not found after insert');
  return rowToSave(row);
}

export async function getSave(
  db: D1Database,
  id: string,
): Promise<Save | null> {
  const row = await db
    .prepare(`SELECT * FROM saves WHERE id = ?`)
    .bind(id)
    .first<SaveRow>();
  return row ? rowToSave(row) : null;
}

export async function listSavesByUser(
  db: D1Database,
  userId: string,
  opts: { filter?: SaveFilter; limit?: number; after?: string } = {},
): Promise<Save[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const filter = opts.filter ?? 'all';
  const clauses: string[] = ['user_id = ?'];
  const args: unknown[] = [userId];
  if (filter === 'designs') clauses.push('is_template = 0');
  else if (filter === 'templates') clauses.push('is_template = 1');
  if (opts.after) {
    clauses.push('id < ?');
    args.push(opts.after);
  }
  const sql = `SELECT * FROM saves WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`;
  args.push(limit);
  const result = await db.prepare(sql).bind(...args).all<SaveRow>();
  return (result.results ?? []).map(rowToSave);
}

export async function updateSave(
  db: D1Database,
  id: string,
  patch: {
    name?: string;
    recipe?: Recipe;
    isTemplate?: boolean;
    tags?: string[];
  },
): Promise<Save | null> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    args.push(patch.name);
  }
  if (patch.recipe !== undefined) {
    sets.push('recipe_json = ?');
    args.push(JSON.stringify(patch.recipe));
  }
  if (patch.isTemplate !== undefined) {
    sets.push('is_template = ?');
    args.push(patch.isTemplate ? 1 : 0);
  }
  if (patch.tags !== undefined) {
    sets.push('tags = ?');
    args.push(JSON.stringify(normalizeTags(patch.tags)));
  }
  if (sets.length === 0) return getSave(db, id);
  const now = Date.now();
  sets.push('updated_at = ?');
  args.push(now);
  args.push(id);
  await db
    .prepare(`UPDATE saves SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...args)
    .run();
  return getSave(db, id);
}

export async function setSaveRender(
  db: D1Database,
  id: string,
  render: { renderedKey: string; thumbKey: string; renderedFormat: RenderedFormat },
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE saves
       SET rendered_key = ?, thumb_key = ?, rendered_format = ?, rendered_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      render.renderedKey,
      render.thumbKey,
      render.renderedFormat,
      now,
      now,
      id,
    )
    .run();
}

export async function cloneSave(
  db: D1Database,
  sourceId: string,
  opts: { newName?: string } = {},
): Promise<Save | null> {
  const source = await getSave(db, sourceId);
  if (!source) return null;
  return createSave(db, {
    userId: source.userId,
    name: opts.newName ?? `${source.name} (copy)`,
    recipe: source.recipe,
    isTemplate: false,
    tags: source.tags,
  });
}

export async function deleteSave(
  db: D1Database,
  id: string,
): Promise<void> {
  // children remember their lineage via parent_template_id; null it before drop so
  // they don't break referential integrity when the parent template goes away
  await db
    .prepare(`UPDATE saves SET parent_template_id = NULL WHERE parent_template_id = ?`)
    .bind(id)
    .run();
  await db.prepare(`DELETE FROM saves WHERE id = ?`).bind(id).run();
}

// "Use" a template: create a new child save under the current user that points
// back to the template via parent_template_id. The child is never itself a
// template, even if the source was; chains of templates aren't supported.
export async function useTemplate(
  db: D1Database,
  templateId: string,
  opts: { userId: string; newName?: string } = { userId: '' },
): Promise<Save | null> {
  const template = await getSave(db, templateId);
  if (!template) return null;
  return createSave(db, {
    userId: opts.userId,
    name: opts.newName ?? `${template.name} (from template)`,
    recipe: template.recipe,
    isTemplate: false,
    tags: template.tags,
    parentTemplateId: template.id,
  });
}

function newShareToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function setSaveShareToken(
  db: D1Database,
  id: string,
  token: string | null,
): Promise<Save | null> {
  const now = Date.now();
  await db
    .prepare(`UPDATE saves SET share_token = ?, updated_at = ? WHERE id = ?`)
    .bind(token, now, id)
    .run();
  return getSave(db, id);
}

// Ensure the save has a share token (idempotent). Returns the updated save.
export async function ensureSaveShareToken(
  db: D1Database,
  id: string,
): Promise<Save | null> {
  const existing = await getSave(db, id);
  if (!existing) return null;
  if (existing.shareToken) return existing;
  return setSaveShareToken(db, id, newShareToken());
}

export async function getSaveByShareToken(
  db: D1Database,
  token: string,
): Promise<Save | null> {
  const row = await db
    .prepare(`SELECT * FROM saves WHERE share_token = ?`)
    .bind(token)
    .first<SaveRow>();
  return row ? rowToSave(row) : null;
}
