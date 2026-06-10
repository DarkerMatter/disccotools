import { createMiddleware } from 'hono/factory';
import { PERM_LEVEL } from '@disccotools/shared';
import type { AppEnv } from '../env.js';

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.user) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'authentication required' } },
      401,
    );
  }
  if ((c.var.permLevel ?? 0) < PERM_LEVEL.ADMIN) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'admin only' } },
      403,
    );
  }
  await next();
});
