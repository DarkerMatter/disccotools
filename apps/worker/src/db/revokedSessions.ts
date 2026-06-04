/** Denylist for revoked JWT session ids. A row invalidates that jti pre-exp. */

export async function revokeSession(
  db: D1Database,
  jti: string,
  expiresAt: number,   // unix seconds, matches JWT exp claim
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO revoked_sessions (jti, expires_at, revoked_at)
       VALUES (?, ?, ?)`,
    )
    .bind(jti, expiresAt, Math.floor(Date.now() / 1000))
    .run();
}

export async function isSessionRevoked(
  db: D1Database,
  jti: string,
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT jti FROM revoked_sessions WHERE jti = ?`)
    .bind(jti)
    .first<{ jti: string }>();
  return row !== null;
}

/** Opportunistic cleanup; called from sessionMiddleware on a probability roll. */
export async function purgeExpiredRevokedSessions(
  db: D1Database,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(`DELETE FROM revoked_sessions WHERE expires_at < ?`)
    .bind(now)
    .run();
}
