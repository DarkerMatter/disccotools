import type { User } from '@disccotools/shared';

type UserRow = {
  id: string;
  username: string;
  global_name: string | null;
  avatar_hash: string | null;
};

export async function getUser(db: D1Database, id: string): Promise<User | null> {
  const row = await db
    .prepare(
      `SELECT id, username, global_name, avatar_hash
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

export type UpsertUserInput = {
  id: string;
  username: string;
  globalName: string | null;
  avatarHash: string | null;
};

export async function upsertUser(
  db: D1Database,
  input: UpsertUserInput,
): Promise<User> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, username, global_name, avatar_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
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
    )
    .run();

  return {
    id: input.id,
    username: input.username,
    globalName: input.globalName,
    avatarHash: input.avatarHash,
  };
}
