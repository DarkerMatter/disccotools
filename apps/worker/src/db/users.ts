import type { User } from '@disccotools/shared';

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
