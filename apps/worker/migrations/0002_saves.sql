-- 0002_saves.sql — persistent saves table + indexes.
-- Recipes are stored as JSON in `recipe_json`. Rendered output and thumbnails
-- live in R2 under `saves/{user_id}/{save_id}.png` and `_thumb.png`; their
-- R2 keys are remembered here so the worker can presign downloads.

CREATE TABLE saves (
  id                  TEXT PRIMARY KEY,        -- UUID v4/v7
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  recipe_json         TEXT NOT NULL,
  rendered_key        TEXT,                    -- R2 key for full render
  thumb_key           TEXT,                    -- R2 key for thumbnail
  rendered_format     TEXT,                    -- 'png' | 'svg'
  rendered_at         INTEGER,
  is_template         INTEGER NOT NULL DEFAULT 0,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE INDEX idx_saves_user_updated  ON saves(user_id, updated_at DESC);
CREATE INDEX idx_saves_user_template ON saves(user_id, is_template, updated_at DESC);
