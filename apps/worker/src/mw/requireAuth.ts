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
 * IMPORTANT: this app is open to anyone with a Discord account; home-guild
 * members just get a badge. This middleware exists for future per-route
 * opt-in and is intentionally NOT applied anywhere right now. Adding it to
 * a route changes the product surface, so don't apply it casually.
 *
 * Assumes `requireAuth` has already attached `c.var.user`.
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
