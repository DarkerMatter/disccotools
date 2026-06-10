import { PERM_LEVEL, type User } from '@disccotools/shared';

type UserRow = {
  id: string;
  username: string;
  global_name: string | null;
  avatar_hash: string | null;
  perm_level: number;
};

export type UserWithPerm = User & { permLevel: number };

function rowToUserWithPerm(row: UserRow): UserWithPerm {
  return {
    id: row.id,
    username: row.username,
    globalName: row.global_name,
    avatarHash: row.avatar_hash,
    permLevel: row.perm_level,
  };
}

export async function getUser(db: D1Database, id: string): Promise<User | null> {
  const row = await db
    .prepare(
      `SELECT id, username, global_name, avatar_hash, perm_level
       FROM users WHERE id = ?`,
    )
    .bind(id)
    .first<UserRow>();
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    globalName: row.global_name,
    avatarHash: row.avatar_hash,
  };
}

export async function getUserWithPerm(
  db: D1Database,
  id: string,
): Promise<UserWithPerm | null> {
  const row = await db
    .prepare(
      `SELECT id, username, global_name, avatar_hash, perm_level
       FROM users WHERE id = ?`,
    )
    .bind(id)
    .first<UserRow>();
  return row ? rowToUserWithPerm(row) : null;
}

export async function getUserPermLevel(
  db: D1Database,
  id: string,
): Promise<number | null> {
  const row = await db
    .prepare(`SELECT perm_level FROM users WHERE id = ?`)
    .bind(id)
    .first<{ perm_level: number }>();
  return row ? row.perm_level : null;
}

export async function setUserPermLevel(
  db: D1Database,
  id: string,
  level: number,
): Promise<UserWithPerm | null> {
  const now = Date.now();
  await db
    .prepare(`UPDATE users SET perm_level = ?, updated_at = ? WHERE id = ?`)
    .bind(level, now, id)
    .run();
  return getUserWithPerm(db, id);
}

export type UpsertUserInput = {
  id: string;
  username: string;
  globalName: string | null;
  avatarHash: string | null;
};

export async function upsertUser(
  db: D1Database,
  input: UpsertUserInput,
): Promise<UserWithPerm> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, username, global_name, avatar_hash, created_at, updated_at, perm_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         username = excluded.username,
         global_name = excluded.global_name,
         avatar_hash = excluded.avatar_hash,
         updated_at = excluded.updated_at`,
    )
    .bind(
      input.id,
      input.username,
      input.globalName,
      input.avatarHash,
      now,
      now,
      PERM_LEVEL.BASIC,
    )
    .run();

  const fresh = await getUserWithPerm(db, input.id);
  if (!fresh) throw new Error('upsertUser: row missing after upsert');
  return fresh;
}

export async function listAllUsers(
  db: D1Database,
  opts: { limit?: number; search?: string } = {},
): Promise<
  Array<UserWithPerm & { savesCount: number; assetsCount: number }>
> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const args: unknown[] = [];
  let where = '';
  if (opts.search) {
    where = 'WHERE u.id LIKE ? OR u.username LIKE ? OR u.global_name LIKE ?';
    const pat = `%${opts.search}%`;
    args.push(pat, pat, pat);
  }
  const sql = `
    SELECT u.id, u.username, u.global_name, u.avatar_hash, u.perm_level,
           (SELECT COUNT(*) FROM saves  s WHERE s.user_id  = u.id) AS saves_count,
           (SELECT COUNT(*) FROM assets a WHERE a.user_id = u.id) AS assets_count
    FROM users u
    ${where}
    ORDER BY u.created_at DESC
    LIMIT ?`;
  args.push(limit);
  const result = await db
    .prepare(sql)
    .bind(...args)
    .all<UserRow & { saves_count: number; assets_count: number }>();
  return (result.results ?? []).map((row) => ({
    ...rowToUserWithPerm(row),
    savesCount: row.saves_count,
    assetsCount: row.assets_count,
  }));
}

export async function deleteUserRow(db: D1Database, id: string): Promise<void> {
  await db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
}
