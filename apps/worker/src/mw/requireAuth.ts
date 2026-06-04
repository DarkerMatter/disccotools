import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../env.js';

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.user) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'authentication required' } },
      401,
    );
  }
  await next();
});

/**
 * Opt-in middleware that gates a route to home-guild members only.
 *
 * IMPORTANT — product intent: this app is open to anyone with a Discord
 * account; home-guild members just get a badge. This middleware is a tool
 * available for future per-route opt-in (e.g. a members-only feature). It
 * is intentionally NOT applied to any existing route. Do not apply it
 * casually — adding it to a route changes the product surface.
 *
 * Assumes `requireAuth` has already attached `c.var.user`. Returns 401 as a
 * defensive fallback if `c.var.user` is null (which should be impossible
 * after `requireAuth`), and 403 when the user is not a home-guild member.
 */
export const requireHomeMember = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.var.user;
  if (!user) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'authentication required' } },
      401,
    );
  }
  if (user.isHomeMember === false) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'home guild members only' } },
      403,
    );
  }
  await next();
});
