import type { NoticeKind, PendingNotice } from '@disccotools/shared';

type AdminActionRow = {
  id: string;
  admin_id: string;
  target_user_id: string;
  action: string;
  target_id: string | null;
  target_label: string | null;
  reason: string;
  created_at: number;
  acknowledged_at: number | null;
};

export type AdminAction = {
  id: string;
  adminId: string;
  targetUserId: string;
  action: NoticeKind;
  targetId: string | null;
  targetLabel: string | null;
  reason: string;
  createdAt: number;
  acknowledgedAt: number | null;
};

function rowToAdminAction(row: AdminActionRow): AdminAction {
  return {
    id: row.id,
    adminId: row.admin_id,
    targetUserId: row.target_user_id,
    action: row.action as NoticeKind,
    targetId: row.target_id,
    targetLabel: row.target_label,
    reason: row.reason,
    createdAt: row.created_at,
    acknowledgedAt: row.acknowledged_at,
  };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `aa_${crypto.randomUUID()}`;
  }
  return `aa_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export async function createAdminAction(
  db: D1Database,
  input: {
    adminId: string;
    targetUserId: string;
    action: NoticeKind;
    targetId?: string | null;
    targetLabel?: string | null;
    reason: string;
  },
): Promise<AdminAction> {
  const id = newId();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO admin_actions
       (id, admin_id, target_user_id, action, target_id, target_label, reason, created_at, acknowledged_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      id,
      input.adminId,
      input.targetUserId,
      input.action,
      input.targetId ?? null,
      input.targetLabel ?? null,
      input.reason,
      now,
    )
    .run();
  return {
    id,
    adminId: input.adminId,
    targetUserId: input.targetUserId,
    action: input.action,
    targetId: input.targetId ?? null,
    targetLabel: input.targetLabel ?? null,
    reason: input.reason,
    createdAt: now,
    acknowledgedAt: null,
  };
}

export async function listPendingNoticesForUser(
  db: D1Database,
  userId: string,
): Promise<PendingNotice[]> {
  const result = await db
    .prepare(
      `SELECT id, admin_id, target_user_id, action, target_id, target_label, reason, created_at, acknowledged_at
       FROM admin_actions
       WHERE target_user_id = ? AND acknowledged_at IS NULL
       ORDER BY created_at DESC
       LIMIT 50`,
    )
    .bind(userId)
    .all<AdminActionRow>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    kind: row.action as NoticeKind,
    reason: row.reason,
    targetLabel: row.target_label,
    createdAt: row.created_at,
  }));
}

export async function listActionsAgainstUser(
  db: D1Database,
  userId: string,
  opts: { limit?: number } = {},
): Promise<AdminAction[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const result = await db
    .prepare(
      `SELECT id, admin_id, target_user_id, action, target_id, target_label, reason, created_at, acknowledged_at
       FROM admin_actions
       WHERE target_user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(userId, limit)
    .all<AdminActionRow>();
  return (result.results ?? []).map(rowToAdminAction);
}

export async function acknowledgeNotice(
  db: D1Database,
  id: string,
  userId: string,
): Promise<boolean> {
  const now = Date.now();
  // scoped to the user so one user can't ack another's notices
  const result = await db
    .prepare(
      `UPDATE admin_actions
       SET acknowledged_at = ?
       WHERE id = ? AND target_user_id = ? AND acknowledged_at IS NULL`,
    )
    .bind(now, id, userId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function getLatestBanReason(
  db: D1Database,
  userId: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT reason FROM admin_actions
       WHERE target_user_id = ? AND action = 'banned'
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(userId)
    .first<{ reason: string }>();
  return row ? row.reason : null;
}
