import type { User } from '@disccotools/shared';

export type Bindings = {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;
  DEV_BYPASS_AUTH: string;
  // dev bypass fires only when both flags are "true", keep this "false" in prod
  ALLOW_DEV_BYPASS: string;
  SESSION_SIGNING_SECRET: string;
  DB: D1Database;
  R2: R2Bucket;
};

export type Variables = {
  user: User | null;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
