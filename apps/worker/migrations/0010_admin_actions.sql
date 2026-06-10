-- 0010_admin_actions.sql: audit trail for moderation.
-- every admin click that nukes or downgrades content lands here, and we
-- surface unacknowledged rows to the affected user so they know why their
-- stuff disappeared.

CREATE TABLE admin_actions (
  id                TEXT PRIMARY KEY,
  admin_id          TEXT NOT NULL,
  target_user_id    TEXT NOT NULL,
  action            TEXT NOT NULL,           -- asset_deleted, save_deleted, account_deleted, banned, level_changed
  target_id         TEXT,                    -- asset id, save id, etc; null for user-level actions
  target_label      TEXT,                    -- human-friendly name (file name, save name) snapshotted at delete time
  reason            TEXT NOT NULL,
  created_at        INTEGER NOT NULL,
  acknowledged_at   INTEGER                  -- when the user clicked "got it" on the notice
);

CREATE INDEX idx_admin_actions_target_user
  ON admin_actions(target_user_id, acknowledged_at);

CREATE INDEX idx_admin_actions_created
  ON admin_actions(created_at DESC);
