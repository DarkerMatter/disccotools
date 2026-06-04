import type { User } from '@disccotools/shared';

export type Bindings = {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;
  HOME_GUILD_ID: string;
  DEV_BYPASS_AUTH: string;
  /**
   * Secondary safety flag. Dev-bypass fires only when both this and
   * DEV_BYPASS_AUTH are "true". Must be "false" in production.
   */
  ALLOW_DEV_BYPASS: string;
  SESSION_SIGNING_SECRET: string;
  DB: D1Database;
  R2: R2Bucket;
};

export type Variables = {
  user: User | null;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
