import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import {
  SessionClaimsSchema,
  userFromClaims,
  type SessionClaims,
} from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import {
  isSessionRevoked,
  purgeExpiredRevokedSessions,
} from '../db/revokedSessions.js';

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

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    c.set('user', null);
    await next();
    return;
  }
  try {
    const payload = await verify(token, c.env.SESSION_SIGNING_SECRET, 'HS256');
    const claims = SessionClaimsSchema.parse(payload);

    const revoked = await isSessionRevoked(c.env.DB, claims.jti);
    if (revoked) {
      c.set('user', null);
      await next();
      return;
    }

    c.set('user', userFromClaims(claims));

    // d100, roll a 1 and we sweep the revoked table
    if (Math.random() < 0.01) {
      try {
        c.executionCtx.waitUntil(purgeExpiredRevokedSessions(c.env.DB));
      } catch {
        // tests don't always have executionCtx
      }
    }
  } catch {
    c.set('user', null);
  }
  await next();
});
