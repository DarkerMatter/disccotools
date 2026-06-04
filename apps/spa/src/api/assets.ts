import type {
  Asset,
  AssetResponse,
  ListAssetsResponse,
  RenameAssetBody,
} from '@disccotools/shared';
import { ApiError, apiFetch } from './client.js';

/** Thrown by `deleteAsset` on 409. Carries the referencing saves for the UI. */
export class AssetInUseError extends Error {
  constructor(public readonly references: { id: string; name: string }[]) {
    super('asset is in use');
    this.name = 'AssetInUseError';
  }
}

export async function listAssets(): Promise<Asset[]> {
  const res = await apiFetch('/api/assets');
  const body = (await res.json()) as ListAssetsResponse;
  return body.assets;
}

export async function uploadAsset(file: File, name: string): Promise<Asset> {
  const fd = new FormData();
  fd.append('file', file, file.name);
  fd.append('name', name);
  const res = await apiFetch('/api/assets', { method: 'POST', body: fd });
  const body = (await res.json()) as AssetResponse;
  return body.asset;
}

export async function renameAsset(id: string, name: string): Promise<Asset> {
  const body: RenameAssetBody = { name };
  const res = await apiFetch(`/api/assets/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as AssetResponse;
  return data.asset;
}

/**
 * DELETE /api/assets/:id. Bypasses `apiFetch` because we need the 409 body to
 * surface `references` via `AssetInUseError`.
 */
export async function deleteAsset(id: string): Promise<void> {
  const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
  if (res.status === 401) {
    window.location.assign('/api/auth/login');
    throw new ApiError('UNAUTHORIZED', 401, 'redirecting to login');
  }
  if (res.status === 204) return;
  if (res.status === 409) {
    let references: { id: string; name: string }[] = [];
    try {
      const body = (await res.json()) as {
        error?: { references?: { id: string; name: string }[] };
      };
      references = body.error?.references ?? [];
    } catch {
      // ignore body-parse failures; leave references empty
    }
    throw new AssetInUseError(references);
  }
  throw new ApiError('UNKNOWN', res.status, `delete failed: ${res.status}`);
}
