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

// not applied anywhere by default, the app is open to all discord users, this is just here for future per-route opt-in
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
