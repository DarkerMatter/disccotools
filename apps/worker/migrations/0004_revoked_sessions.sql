-- 0004_revoked_sessions.sql: denylist for revoked session tokens (jti -> exp).

CREATE TABLE revoked_sessions (
  jti          TEXT PRIMARY KEY,
  expires_at   INTEGER NOT NULL,   -- unix seconds; matches the JWT exp
  revoked_at   INTEGER NOT NULL    -- unix seconds; when logout fired
);
CREATE INDEX idx_revoked_sessions_expires ON revoked_sessions(expires_at);
