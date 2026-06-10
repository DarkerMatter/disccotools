import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import {
  PERM_LEVEL,
  SessionClaimsSchema,
  type AuthBannedResponse,
  type AuthMeResponse,
} from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import {
  signSession,
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE,
} from '../mw/session.js';
import { exchangeCode, fetchMe } from '../discord.js';
import { upsertUser } from '../db/users.js';
import { revokeSession } from '../db/revokedSessions.js';
import {
  getLatestBanReason,
  listPendingNoticesForUser,
} from '../db/adminActions.js';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_SECONDS = 600;

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function discordAuthorizeUrl(env: AppEnv['Bindings'], state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.DISCORD_CLIENT_ID,
    scope: 'identify',
    state,
    redirect_uri: env.DISCORD_REDIRECT_URI,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

async function mintDevSession(c: Context<AppEnv>): Promise<void> {
  const claims = {
    sub: '0',
    username: 'dev',
    globalName: 'Dev User',
    avatarHash: null,
  };
  await upsertUser(c.env.DB, {
    id: claims.sub,
    username: claims.username,
    globalName: claims.globalName,
    avatarHash: claims.avatarHash,
  });
  const token = await signSession(c.env.SESSION_SIGNING_SECRET, claims);
  setSessionCookie(c, token);
}

export async function loginHandler(c: Context<AppEnv>): Promise<Response> {
  // dev bypass needs both flags, one wasn't enough humiliation
  if (
    c.env.DEV_BYPASS_AUTH === 'true' &&
    c.env.ALLOW_DEV_BYPASS === 'true'
  ) {
    await mintDevSession(c);
    return c.redirect('/', 302);
  }
  const state = randomHex(32);
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    // strict drops the cookie on the cross-site return from discord, callback compares to query state anyway
    sameSite: 'Lax',
    path: '/',
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
  return c.redirect(discordAuthorizeUrl(c.env, state), 302);
}

export async function callbackHandler(c: Context<AppEnv>): Promise<Response> {
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) {
    return c.json(
      { error: { code: 'VALIDATION', message: 'missing code or state' } },
      400,
    );
  }
  const stateCookie = getCookie(c, OAUTH_STATE_COOKIE);
  if (!stateCookie || stateCookie !== state) {
    return c.json(
      { error: { code: 'VALIDATION', message: 'invalid oauth state' } },
      400,
    );
  }
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/' });

  let accessToken: string;
  try {
    ({ accessToken } = await exchangeCode({
      clientId: c.env.DISCORD_CLIENT_ID,
      clientSecret: c.env.DISCORD_CLIENT_SECRET,
      code,
      redirectUri: c.env.DISCORD_REDIRECT_URI,
    }));
  } catch (err) {
    console.error('exchangeCode failed', err);
    return c.json(
      { error: { code: 'INTERNAL', message: 'discord token exchange failed' } },
      502,
    );
  }

  let me;
  try {
    me = await fetchMe(accessToken);
  } catch (err) {
    console.error('fetchMe failed', err);
    return c.json(
      { error: { code: 'INTERNAL', message: 'discord identity fetch failed' } },
      502,
    );
  }

  const user = await upsertUser(c.env.DB, {
    id: me.id,
    username: me.username,
    globalName: me.global_name,
    avatarHash: me.avatar,
  });

  // banned users never get a cookie back. bounce them to the banned page
  // so the SPA can show the reason.
  if (user.permLevel === PERM_LEVEL.BANNED) {
    return c.redirect('/banned', 302);
  }

  const token = await signSession(c.env.SESSION_SIGNING_SECRET, {
    sub: user.id,
    username: user.username,
    globalName: user.globalName,
    avatarHash: user.avatarHash,
  });
  setSessionCookie(c, token);
  return c.redirect('/', 302);
}

export async function meHandler(c: Context<AppEnv>): Promise<Response> {
  // banned: middleware already cleared the cookie. tell the SPA so it
  // routes to /banned with the reason.
  if (c.var.bannedReason !== null) {
    const body: AuthBannedResponse = {
      banned: true,
      reason: c.var.bannedReason,
    };
    return c.json(body, 403);
  }

  const user = c.var.user;
  if (!user) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'not signed in' } },
      401,
    );
  }
  const pendingNotices = await listPendingNoticesForUser(c.env.DB, user.id);
  const body: AuthMeResponse = {
    user,
    permLevel: c.var.permLevel ?? 1,
    pendingNotices,
  };
  return c.json(body, 200);
}

export async function logoutHandler(c: Context<AppEnv>): Promise<Response> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    try {
      const payload = await verify(
        token,
        c.env.SESSION_SIGNING_SECRET,
        'HS256',
      );
      const claims = SessionClaimsSchema.parse(payload);
      await revokeSession(c.env.DB, claims.jti, claims.exp);
    } catch {
      // nothing to revoke
    }
  }
  clearSessionCookie(c);
  return c.body(null, 204);
}
