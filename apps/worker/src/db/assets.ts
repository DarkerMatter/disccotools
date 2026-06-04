/** D1 layer for the user asset library. Bytes live in R2 under `r2_key`. */

/** Raw D1 row shape (snake_case). */
type AssetRow = {
  id: string;
  user_id: string;
  name: string;
  r2_key: string;
  mime_type: string;
  size_bytes: number;
  created_at: number;
  updated_at: number;
};

/** Domain shape used by handlers and clients (camelCase). */
export type Asset = {
  id: string;
  userId: string;
  name: string;
  r2Key: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
};

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
    /**
     * Optional pre-generated id. The handler mints id up-front so the R2 key
     * (which embeds the id) can be written before the D1 row. Tests can omit.
     */
    id?: string;
    userId: string;
    name: string;
    r2Key: string;
    mimeType: string;
    sizeBytes: number;
  },
): Promise<Asset> {
  const now = Date.now();
  const id = input.id ?? newId();
  await db
    .prepare(
      `INSERT INTO assets (id, user_id, name, r2_key, mime_type, size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
  patch: { name?: string },
): Promise<Asset | null> {
  if (patch.name === undefined) return getAsset(db, id);
  const existing = await getAsset(db, id);
  if (!existing) return null;
  const now = Date.now();
  await db
    .prepare(`UPDATE assets SET name = ?, updated_at = ? WHERE id = ?`)
    .bind(patch.name, now, id)
    .run();
  return getAsset(db, id);
}

export async function deleteAsset(
  db: D1Database,
  id: string,
): Promise<void> {
  await db.prepare(`DELETE FROM assets WHERE id = ?`).bind(id).run();
}

/**
 * Find saves owned by `userId` whose `recipe_json` mentions `assetId`.
 *
 * D1 has no native JSON ops, so a quoted LIKE pattern stands in. The asset id
 * is a UUID; a false positive would require it appearing verbatim quoted
 * inside `recipe_json`, which only happens in a real `"assetId":"…"` field.
 */
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
