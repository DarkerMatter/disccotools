import type { Context } from 'hono';
import {
  RenameAssetBodySchema,
  type Asset as AssetDto,
} from '@disccotools/shared';
import type { AppEnv } from '../env.js';
import {
  createAsset,
  deleteAsset,
  findSavesReferencingAsset,
  getAsset,
  listAssetsByUser,
  updateAsset,
  type Asset,
} from '../db/assets.js';
import { assetKey, extForMime } from '../r2.js';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

/**
 * Sniff the leading bytes of an uploaded file and return the detected MIME, or
 * null if the bytes don't match any allowed image format. Defense-in-depth: a
 * client could lie about `file.type`, but they can't easily lie about the bytes
 * themselves (and if they do, the format won't decode anyway).
 */
async function sniffImageMime(blob: Blob): Promise<string | null> {
  if (blob.size < 12) return null;
  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  ) {
    return 'image/png';
  }
  // JPEG: starts with FF D8 FF (SOI marker)
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return 'image/jpeg';
  }
  // WebP: "RIFF????WEBP" — bytes 0–3 = "RIFF", bytes 8–11 = "WEBP"
  if (
    head[0] === 0x52 && // R
    head[1] === 0x49 && // I
    head[2] === 0x46 && // F
    head[3] === 0x46 && // F
    head[8] === 0x57 && // W
    head[9] === 0x45 && // E
    head[10] === 0x42 && // B
    head[11] === 0x50 // P
  ) {
    return 'image/webp';
  }
  return null;
}

function toDto(asset: Asset): AssetDto {
  return {
    id: asset.id,
    name: asset.name,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    url: `/api/assets/${asset.id}/file`,
  };
}

function validation(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: 'VALIDATION', message } }, 400);
}

function notFound(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'asset not found' } }, 404);
}

function forbidden(c: Context<AppEnv>) {
  return c.json({ error: { code: 'FORBIDDEN', message: 'not your asset' } }, 403);
}

async function loadOwnedAsset(c: Context<AppEnv>, id: string) {
  const user = c.var.user!;
  const asset = await getAsset(c.env.DB, id);
  if (!asset) return { error: notFound(c) } as const;
  if (asset.userId !== user.id) return { error: forbidden(c) } as const;
  return { asset } as const;
}

async function safeJson(c: Context<AppEnv>): Promise<unknown | undefined> {
  try {
    return (await c.req.json()) as unknown;
  } catch {
    return undefined;
  }
}

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

export async function createAssetHandler(c: Context<AppEnv>): Promise<Response> {
  const user = c.var.user!;

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return validation(c, 'expected multipart/form-data');
  }

  const file = form.get('file');
  const nameRaw = form.get('name');
  if (!(file instanceof Blob)) return validation(c, 'missing file');
  if (typeof nameRaw !== 'string') return validation(c, 'missing name');
  const name = nameRaw.trim();
  if (name.length < 1 || name.length > 120) {
    return validation(c, 'name must be 1–120 characters');
  }
  if (file.size > MAX_BYTES) {
    return validation(c, `file exceeds ${MAX_BYTES} bytes`);
  }
  if (file.size === 0) {
    return validation(c, 'file is empty');
  }
  const declaredMime = file.type;
  if (!ALLOWED_MIMES.has(declaredMime)) {
    return validation(c, 'unsupported mime type');
  }
  // Magic-byte sniff: defense-in-depth against a client lying about file.type.
  const sniffed = await sniffImageMime(file);
  if (sniffed === null) {
    return validation(c, 'unsupported file format');
  }
  if (sniffed !== declaredMime) {
    return validation(c, 'file content does not match declared type');
  }
  // From here on, trust the sniffed MIME (not the client-declared one).
  const mime = sniffed;

  const id = crypto.randomUUID();
  const ext = extForMime(mime);
  const key = assetKey(user.id, id, ext);

  const bytes = await file.arrayBuffer();
  await c.env.R2.put(key, bytes, {
    httpMetadata: { contentType: mime },
  });

  let created: Asset;
  try {
    created = await createAsset(c.env.DB, {
      id,
      userId: user.id,
      name,
      r2Key: key,
      mimeType: mime,
      sizeBytes: file.size,
    });
  } catch (err) {
    // Roll back the R2 write so we don't leak orphan objects.
    await c.env.R2.delete(key).catch(() => undefined);
    throw err;
  }

  return c.json({ asset: toDto(created) }, 201);
}

export async function listAssetsHandler(c: Context<AppEnv>): Promise<Response> {
  const user = c.var.user!;
  const limit = clampInt(c.req.query('limit'), 1, 200, 50);
  const after = c.req.query('after');
  const opts: Parameters<typeof listAssetsByUser>[2] = { limit };
  if (after) opts.after = after;
  const assets = await listAssetsByUser(c.env.DB, user.id, opts);
  return c.json({ assets: assets.map(toDto) }, 200);
}

export async function getAssetHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const result = await loadOwnedAsset(c, id);
  if ('error' in result) return result.error;
  return c.json({ asset: toDto(result.asset) }, 200);
}

export async function renameAssetHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const result = await loadOwnedAsset(c, id);
  if ('error' in result) return result.error;
  const json = await safeJson(c);
  if (json === undefined) return validation(c, 'expected JSON body');
  const parsed = RenameAssetBodySchema.safeParse(json);
  if (!parsed.success) return validation(c, parsed.error.message);
  const updated = await updateAsset(c.env.DB, id, { name: parsed.data.name });
  if (!updated) return notFound(c);
  return c.json({ asset: toDto(updated) }, 200);
}

export async function deleteAssetHandler(c: Context<AppEnv>): Promise<Response> {
  const user = c.var.user!;
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const result = await loadOwnedAsset(c, id);
  if ('error' in result) return result.error;

  const refs = await findSavesReferencingAsset(c.env.DB, user.id, id);
  if (refs.length > 0) {
    return c.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'asset is in use',
          references: refs,
        },
      },
      409,
    );
  }

  // Best-effort R2 delete.
  await c.env.R2.delete(result.asset.r2Key).catch(() => undefined);
  await deleteAsset(c.env.DB, id);
  return c.body(null, 204);
}

export async function getAssetFileHandler(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return validation(c, 'missing id');
  const result = await loadOwnedAsset(c, id);
  if ('error' in result) return result.error;

  const object = await c.env.R2.get(result.asset.r2Key);
  if (!object) return notFound(c);

  const buf = await object.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': result.asset.mimeType,
      'Content-Length': String(buf.byteLength),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
