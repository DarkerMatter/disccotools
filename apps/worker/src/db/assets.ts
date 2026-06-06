import { normalizeTags } from './tags.js';

type AssetRow = {
  id: string;
  user_id: string;
  name: string;
  r2_key: string;
  mime_type: string;
  size_bytes: number;
  created_at: number;
  updated_at: number;
  tags: string | null;
};

export type Asset = {
  id: string;
  userId: string;
  name: string;
  r2Key: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
};

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

function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    r2Key: row.r2_key,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: parseTagsColumn(row.tags),
  };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `asset_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export async function createAsset(
  db: D1Database,
  input: {
    // handler mints id up front so the r2 key (which embeds it) lands before the d1 row
    id?: string;
    userId: string;
    name: string;
    r2Key: string;
    mimeType: string;
    sizeBytes: number;
    tags?: string[];
  },
): Promise<Asset> {
  const now = Date.now();
  const id = input.id ?? newId();
  const tags = normalizeTags(input.tags);
  await db
    .prepare(
      `INSERT INTO assets (id, user_id, name, r2_key, mime_type, size_bytes, created_at, updated_at, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.userId,
      input.name,
      input.r2Key,
      input.mimeType,
      input.sizeBytes,
      now,
      now,
      JSON.stringify(tags),
    )
    .run();
  const row = await db
    .prepare(`SELECT * FROM assets WHERE id = ?`)
    .bind(id)
    .first<AssetRow>();
  if (!row) throw new Error('createAsset: row not found after insert');
  return rowToAsset(row);
}

export async function getAsset(
  db: D1Database,
  id: string,
): Promise<Asset | null> {
  const row = await db
    .prepare(`SELECT * FROM assets WHERE id = ?`)
    .bind(id)
    .first<AssetRow>();
  return row ? rowToAsset(row) : null;
}

export async function listAssetsByUser(
  db: D1Database,
  userId: string,
  opts: { limit?: number; after?: string } = {},
): Promise<Asset[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const clauses: string[] = ['user_id = ?'];
  const args: unknown[] = [userId];
  if (opts.after) {
    clauses.push('id < ?');
    args.push(opts.after);
  }
  const sql = `SELECT * FROM assets WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ?`;
  args.push(limit);
  const result = await db.prepare(sql).bind(...args).all<AssetRow>();
  return (result.results ?? []).map(rowToAsset);
}

export async function updateAsset(
  db: D1Database,
  id: string,
  patch: { name?: string; tags?: string[] },
): Promise<Asset | null> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    args.push(patch.name);
  }
  if (patch.tags !== undefined) {
    sets.push('tags = ?');
    args.push(JSON.stringify(normalizeTags(patch.tags)));
  }
  if (sets.length === 0) return getAsset(db, id);
  const existing = await getAsset(db, id);
  if (!existing) return null;
  const now = Date.now();
  sets.push('updated_at = ?');
  args.push(now);
  args.push(id);
  await db
    .prepare(`UPDATE assets SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...args)
    .run();
  return getAsset(db, id);
}

export async function deleteAsset(
  db: D1Database,
  id: string,
): Promise<void> {
  await db.prepare(`DELETE FROM assets WHERE id = ?`).bind(id).run();
}

// d1 has no json ops, so quoted LIKE on a uuid is good enough
export async function findSavesReferencingAsset(
  db: D1Database,
  userId: string,
  assetId: string,
): Promise<Array<{ id: string; name: string }>> {
  const pattern = `%"${assetId}"%`;
  const result = await db
    .prepare(`SELECT id, name FROM saves WHERE user_id = ? AND recipe_json LIKE ?`)
    .bind(userId, pattern)
    .all<{ id: string; name: string }>();
  return result.results ?? [];
}
