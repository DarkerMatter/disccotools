#!/usr/bin/env bash
# scripts/deploy.sh — deploy disccotools to tools.dimitri.one
#
# usage: ./scripts/deploy.sh
#
# Steps:
#   1. Build the SPA bundle.
#   2. Apply D1 migrations to the remote database.
#   3. Deploy the worker (Hono on Cloudflare Workers).
#   4. Deploy the SPA + Pages Function to Cloudflare Pages.
#   5. Smoke-test the worker's /api/health endpoint via tools.dimitri.one.
#
# Prerequisites (one-time, manual):
#   - wrangler login
#   - wrangler d1 create disccotools     → paste database_id into wrangler.toml
#   - wrangler secret put DISCORD_CLIENT_SECRET
#   - wrangler secret put SESSION_SIGNING_SECRET   (use openssl rand -base64 32)
#   - Cloudflare Pages project "disccotools" with custom domain tools.dimitri.one
#   - Discord OAuth app redirect URI includes https://tools.dimitri.one/api/auth/callback

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Resolve pnpm — prefer pnpm on PATH, fall back to corepack (bundled with Node 20+).
if command -v pnpm >/dev/null 2>&1; then
  PNPM=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  PNPM=(corepack pnpm)
else
  echo "Error: neither 'pnpm' nor 'corepack' is on PATH." >&2
  echo "Install pnpm ('npm i -g pnpm') or enable corepack ('corepack enable')." >&2
  exit 1
fi

echo "==> [1/5] Building SPA bundle"
"${PNPM[@]}" --filter @disccotools/spa build

echo "==> [2/5] Applying D1 migrations to disccotools (remote)"
"${PNPM[@]}" --filter @disccotools/worker exec wrangler d1 migrations apply disccotools --remote

echo "==> [3/5] Deploying worker"
"${PNPM[@]}" --filter @disccotools/worker exec wrangler deploy

echo "==> [4/5] Deploying SPA + Pages Function to Cloudflare Pages"
(
  cd "$REPO_ROOT/apps/spa"
  "${PNPM[@]}" dlx wrangler pages deploy dist --project-name disccotools --branch main
)

echo "==> [5/5] Smoke-testing https://tools.dimitri.one/api/health"
if curl -fsS "https://tools.dimitri.one/api/health" >/dev/null; then
  echo "    OK"
else
  echo "    FAILED — check worker logs and DNS for tools.dimitri.one" >&2
  exit 1
fi

echo ""
echo "Done. Deployed to https://tools.dimitri.one"
