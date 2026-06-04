-- 0003_assets.sql: user asset library. Bytes live in R2 under
-- assets/{user_id}/{asset_id}.{ext}; recipe image layers reference assets by id.

CREATE TABLE assets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  r2_key      TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_assets_user_created ON assets(user_id, created_at DESC);
