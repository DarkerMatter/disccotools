-- 0005_tags.sql adds a JSON tags column to saves and assets.
-- Stored as a JSON-stringified array; empty list is '[]', never NULL.
ALTER TABLE saves  ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE assets ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
