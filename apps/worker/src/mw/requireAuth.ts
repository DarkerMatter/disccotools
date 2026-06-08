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
