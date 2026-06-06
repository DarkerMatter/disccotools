-- 0005_tags.sql: JSON tags column on saves and assets.
ALTER TABLE saves  ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE assets ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
