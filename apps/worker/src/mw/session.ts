import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import {
  PERM_LEVEL,
  SessionClaimsSchema,
  userFromClaims,
  type SessionClaims,
} from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import {
  isSessionRevoked,
  purgeExpiredRevokedSessions,
  revokeSession,
} from '../db/revokedSessions.js';
import { getUserPermLevel } from '../db/users.js';
import { getLatestBanReason } from '../db/adminActions.js';

export const SESSION_COOKIE = 'sid';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // a discord week

export async function signSession(
  secret: string,
  payload: Omit<SessionClaims, 'iat' | 'exp' | 'jti'>,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jti =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const claims: SessionClaims = {
    ...payload,
    jti,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  return sign(claims, secret);
}

export function setSessionCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

function resetVars(c: Context<AppEnv>): void {
  c.set('user', null);
  c.set('permLevel', null);
  c.set('bannedReason', null);
}

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  resetVars(c);
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    await next();
    return;
  }
  try {
    const payload = await verify(token, c.env.SESSION_SIGNING_SECRET, 'HS256');
    const claims = SessionClaimsSchema.parse(payload);

    const revoked = await isSessionRevoked(c.env.DB, claims.jti);
    if (revoked) {
      await next();
      return;
    }

    const permLevel = await getUserPermLevel(c.env.DB, claims.sub);

    // user row vanished (hard-deleted by an admin). same treatment as ban:
    // kill the cookie + revoke the jti so the stale JWT can't be replayed
    // for the rest of its 7-day life.
    if (permLevel === null) {
      clearSessionCookie(c);
      try {
        await revokeSession(c.env.DB, claims.jti, claims.exp);
      } catch {
        // already revoked is fine
      }
      await next();
      return;
    }

    // banned: nuke the cookie, revoke the jti so even a stolen cookie is dead,
    // surface the reason so /api/auth/me can tell the SPA why.
    if (permLevel === PERM_LEVEL.BANNED) {
      const reason = await getLatestBanReason(c.env.DB, claims.sub);
      c.set('bannedReason', reason ?? '');
      clearSessionCookie(c);
      try {
        await revokeSession(c.env.DB, claims.jti, claims.exp);
      } catch {
        // already revoked is fine
      }
      await next();
      return;
    }

    c.set('user', userFromClaims(claims));
    c.set('permLevel', permLevel);

    // d100, roll a 1 and we sweep the revoked table
    if (Math.random() < 0.01) {
      try {
        c.executionCtx.waitUntil(purgeExpiredRevokedSessions(c.env.DB));
      } catch {
        // tests don't always have executionCtx
      }
    }
  } catch {
    resetVars(c);
  }
  await next();
});
