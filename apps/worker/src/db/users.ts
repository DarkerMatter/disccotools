import type { User } from '@disccotools/shared';

type UserRow = {
  id: string;
  username: string;
  global_name: string | null;
  avatar_hash: string | null;
  is_home_member: number;
  home_checked_at: number;
};

export async function getUser(db: D1Database, id: string): Promise<User | null> {
  const row = await db
    .prepare(
      `SELECT id, username, global_name, avatar_hash, is_home_member, home_checked_at
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
    isHomeMember: row.is_home_member === 1,
    memberCheckedAt: row.home_checked_at,
  };
}

export type UpsertUserInput = {
  id: string;
  username: string;
  globalName: string | null;
  avatarHash: string | null;
  isHomeMember: boolean;
  homeCheckedAt: number;
};

export async function upsertUser(
  db: D1Database,
  input: UpsertUserInput,
): Promise<User> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, username, global_name, avatar_hash, is_home_member, home_checked_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         username = excluded.username,
         global_name = excluded.global_name,
         avatar_hash = excluded.avatar_hash,
         is_home_member = excluded.is_home_member,
         home_checked_at = excluded.home_checked_at,
         updated_at = excluded.updated_at`,
    )
    .bind(
      input.id,
      input.username,
      input.globalName,
      input.avatarHash,
      input.isHomeMember ? 1 : 0,
      input.homeCheckedAt,
      now,
      now,
    )
    .run();

  return {
    id: input.id,
    username: input.username,
    globalName: input.globalName,
    avatarHash: input.avatarHash,
    isHomeMember: input.isHomeMember,
    memberCheckedAt: input.homeCheckedAt,
  };
}
