#!/usr/bin/env node
// uploads SVGs from import/_extracted/ and import/raw/ to R2 under static/icons/custom/.
// run: node scripts/import-icons.mjs
//
// drop new icons in import/raw/<category>/<name>.svg and re-run; it overwrites.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const EXTRACTED_DIR = path.join(REPO_ROOT, 'import', '_extracted');
const RAW_DIR = path.join(REPO_ROOT, 'import', 'raw');
const BUCKET = 'disccotools';
const KEY_PREFIX = 'static/icons/custom';
const PARALLELISM = 6;

const DANGEROUS = [
  /<script\b[\s\S]*?<\/script>/gi,
  /<foreignObject\b[\s\S]*?<\/foreignObject>/gi,
  /<iframe\b[\s\S]*?<\/iframe>/gi,
  /<embed\b[^>]*\/?>/gi,
  /<object\b[\s\S]*?<\/object>/gi,
  /\son\w+\s*=\s*"[^"]*"/gi,
  /\son\w+\s*=\s*'[^']*'/gi,
  /javascript:/gi,
];

function sanitizeSvg(content) {
  let out = content;
  for (const re of DANGEROUS) out = out.replace(re, '');
  return out;
}

async function collectFiles(root) {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && p.toLowerCase().endsWith('.svg')) out.push(p);
    }
  }
  await walk(root);
  return out;
}

function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const cp = spawn('pnpm', ['--filter', '@disccotools/worker', 'exec', 'wrangler', ...args], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    cp.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    cp.on('error', reject);
    cp.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`wrangler exited ${code}: ${stderr.trim()}`));
    });
  });
}

async function uploadOne({ file, baseDir }) {
  const rel = path.relative(baseDir, file).split(path.sep).join('/');
  const key = `${KEY_PREFIX}/${rel}`;
  const raw = await fs.readFile(file, 'utf8');
  const clean = sanitizeSvg(raw);
  const tmp = file + '.upload.tmp';
  await fs.writeFile(tmp, clean, 'utf8');
  try {
    await runWrangler([
      'r2',
      'object',
      'put',
      `${BUCKET}/${key}`,
      '--file',
      tmp,
      '--content-type',
      'image/svg+xml',
      '--remote',
    ]);
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
  return key;
}

async function pool(items, n, worker) {
  let cursor = 0;
  const completed = [];
  const errors = [];
  async function next() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        const result = await worker(items[i]);
        completed.push(result);
        if (completed.length % 25 === 0) {
          console.log(`  uploaded ${completed.length}/${items.length}`);
        }
      } catch (e) {
        errors.push({ item: items[i], error: e });
      }
    }
  }
  await Promise.all(Array.from({ length: n }, next));
  return { completed, errors };
}

async function main() {
  const all = [];
  for (const dir of [EXTRACTED_DIR, RAW_DIR]) {
    const files = await collectFiles(dir);
    for (const f of files) all.push({ file: f, baseDir: dir });
  }

  if (all.length === 0) {
    console.error('No SVGs found. Run scripts/extract-import.mjs first, or drop SVGs in import/raw/.');
    process.exit(1);
  }

  console.log(`Uploading ${all.length} SVGs to R2 bucket "${BUCKET}" under ${KEY_PREFIX}/...`);
  const { completed, errors } = await pool(all, PARALLELISM, uploadOne);

  console.log(`Done. Uploaded ${completed.length}/${all.length}.`);
  if (errors.length) {
    console.error(`\nErrors (${errors.length}):`);
    for (const e of errors) console.error(`  ${e.item.file}: ${e.error.message}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
