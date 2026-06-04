-- 0001_users.sql — initial users table

CREATE TABLE users (
  id                  TEXT PRIMARY KEY,        -- Discord snowflake
  username            TEXT NOT NULL,
  global_name         TEXT,
  avatar_hash         TEXT,
  is_home_member      INTEGER NOT NULL DEFAULT 0,   -- 0/1
  home_checked_at     INTEGER,                       -- unix ms
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);
