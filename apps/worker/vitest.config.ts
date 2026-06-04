import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

const migrations = await readD1Migrations('./migrations');

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        bindings: {
          SESSION_SIGNING_SECRET: 'test-secret-for-vitest-only-do-not-use-anywhere-else',
          DISCORD_CLIENT_SECRET: 'test-discord-client-secret-vitest-only',
          TEST_MIGRATIONS: migrations,
        },
        r2Buckets: ['R2'],
      },
    }),
  ],
  test: {},
});
