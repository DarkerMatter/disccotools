-- 0007_drop_home_member.sql: ditch the home-guild membership concept.
-- everyone gets the NTTS badge now, no more guilds-scope check at signin.

ALTER TABLE users DROP COLUMN is_home_member;
ALTER TABLE users DROP COLUMN home_checked_at;
