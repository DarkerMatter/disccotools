import type { D1Migration } from '@cloudflare/vitest-pool-workers/config';
import type { Bindings } from './env.js';

declare module 'cloudflare:test' {
  // Make our worker bindings visible via `import { env } from 'cloudflare:test'`.
  interface ProvidedEnv extends Bindings {
    TEST_MIGRATIONS: D1Migration[];
  }
}
