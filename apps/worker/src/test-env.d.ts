import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Bindings } from './env.js';

// In @cloudflare/vitest-pool-workers >= 0.13, the typed `env` from
// `cloudflare:test` is `Cloudflare.Env` instead of `ProvidedEnv`. Augment that
// global namespace so our tests see the worker bindings plus test-only
// migrations payload.
declare global {
  namespace Cloudflare {
    interface Env extends Bindings {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
