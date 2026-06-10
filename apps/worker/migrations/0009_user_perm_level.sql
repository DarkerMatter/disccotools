-- 0009_user_perm_level.sql: per-user permission tier.
-- 0 = banned, 1 = basic (5 image cap), 2 = plus (10 cap),
-- 3 = unlimited, 10 = admin (full panel access).
-- everyone starts at 1; promote yourself manually via wrangler d1 execute.

ALTER TABLE users ADD COLUMN perm_level INTEGER NOT NULL DEFAULT 1;
