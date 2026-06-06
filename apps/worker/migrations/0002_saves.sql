-- 0002_saves.sql: saves table and indexes.

CREATE TABLE saves (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  recipe_json         TEXT NOT NULL,
  rendered_key        TEXT,
  thumb_key           TEXT,
  rendered_format     TEXT,
  rendered_at         INTEGER,
  is_template         INTEGER NOT NULL DEFAULT 0,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE INDEX idx_saves_user_updated  ON saves(user_id, updated_at DESC);
CREATE INDEX idx_saves_user_template ON saves(user_id, is_template, updated_at DESC);
