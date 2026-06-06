-- 0004_revoked_sessions.sql: denylist for revoked session tokens.

CREATE TABLE revoked_sessions (
  jti          TEXT PRIMARY KEY,
  expires_at   INTEGER NOT NULL,
  revoked_at   INTEGER NOT NULL
);
CREATE INDEX idx_revoked_sessions_expires ON revoked_sessions(expires_at);
