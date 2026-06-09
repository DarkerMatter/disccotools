-- 0008_drop_templates.sql: ditch the templates concept entirely.
-- sharing stays (share_token, idx_saves_share_token) but the template flag,
-- lineage, and their indexes go away.

DROP INDEX IF EXISTS idx_saves_user_template;
DROP INDEX IF EXISTS idx_saves_parent_template;

ALTER TABLE saves DROP COLUMN is_template;
ALTER TABLE saves DROP COLUMN parent_template_id;
