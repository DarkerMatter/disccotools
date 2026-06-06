-- 0006_template_relations.sql
-- adds the template -> children relation and per-save share tokens.
-- a template can be "used" to create a child save (a normal design that
-- remembers which template it came from); when the parent template is
-- deleted, children simply forget their lineage instead of cascading.

ALTER TABLE saves ADD COLUMN parent_template_id TEXT;
ALTER TABLE saves ADD COLUMN share_token        TEXT;

-- enforce uniqueness on share tokens (sparse: nulls allowed, populated values unique)
CREATE UNIQUE INDEX idx_saves_share_token ON saves(share_token) WHERE share_token IS NOT NULL;

-- speeds up "how many designs were made from this template" style lookups
CREATE INDEX idx_saves_parent_template ON saves(parent_template_id) WHERE parent_template_id IS NOT NULL;
