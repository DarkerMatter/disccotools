import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  isSessionRevoked,
  purgeExpiredRevokedSessions,
  revokeSession,
} from './revokedSessions.js';

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM revoked_sessions').run();
});

describe('revokeSession / isSessionRevoked', () => {
  it('marks a jti revoked', async () => {
    await revokeSession(env.DB, 'jti-1', Math.floor(Date.now() / 1000) + 3600);
    expect(await isSessionRevoked(env.DB, 'jti-1')).toBe(true);
    expect(await isSessionRevoked(env.DB, 'jti-2')).toBe(false);
  });

  it('is idempotent (INSERT OR IGNORE)', async () => {
    await revokeSession(env.DB, 'jti-1', 9999999999);
    await revokeSession(env.DB, 'jti-1', 1111111111);
    expect(await isSessionRevoked(env.DB, 'jti-1')).toBe(true);
  });
});

describe('purgeExpiredRevokedSessions', () => {
  it('deletes rows whose expires_at is in the past, keeps current ones', async () => {
    const now = Math.floor(Date.now() / 1000);
    await revokeSession(env.DB, 'old-1', now - 3600);
    await revokeSession(env.DB, 'old-2', now - 1);
    await revokeSession(env.DB, 'fresh', now + 3600);
    await purgeExpiredRevokedSessions(env.DB);
    expect(await isSessionRevoked(env.DB, 'old-1')).toBe(false);
    expect(await isSessionRevoked(env.DB, 'old-2')).toBe(false);
    expect(await isSessionRevoked(env.DB, 'fresh')).toBe(true);
  });
});
