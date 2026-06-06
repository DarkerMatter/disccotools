import type {
  Asset,
  AssetResponse,
  ListAssetsResponse,
  RenameAssetBody,
  UpdateAssetBody,
} from '@disccotools/shared';
import { ApiError, apiFetch } from './client.js';

export class AssetInUseError extends Error {
  constructor(public readonly references: { id: string; name: string }[]) {
    super('asset is in use');
    this.name = 'AssetInUseError';
  }
}

// no svg, it carries scripts and we like our cookies safe; keep in sync with worker ALLOWED_MIMES
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024;

export function validateAssetFile(file: File): string | null {
  if (!ALLOWED_MIMES.has(file.type)) {
    return 'Unsupported file type. PNG, JPEG, or WebP only.';
  }
  if (file.size > MAX_BYTES) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`;
  }
  if (file.size === 0) {
    return 'File is empty.';
  }
  return null;
}

export type UploadProgress = {
  loaded: number;
  total: number;
  fraction: number;
};

export async function listAssets(): Promise<Asset[]> {
  const res = await apiFetch('/api/assets');
  const body = (await res.json()) as ListAssetsResponse;
  return body.assets;
}

// fetch can't report upload progress, only download, hence XHR
export function uploadAssetWithProgress(
  file: File,
  name: string,
  onProgress?: (p: UploadProgress) => void,
): Promise<Asset> {
  return new Promise((resolve, reject) => {
    const validationError = validateAssetFile(file);
    if (validationError) {
      reject(new ApiError('VALIDATION', 400, validationError));
      return;
    }

    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('name', name);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/assets', true);
    xhr.withCredentials = true;

    xhr.upload.addEventListener('progress', (e) => {
      if (!onProgress) return;
      const total = e.total || file.size;
      const fraction = total > 0 ? e.loaded / total : Number.NaN;
      onProgress({ loaded: e.loaded, total, fraction });
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 401) {
        window.location.assign('/api/auth/login');
        reject(new ApiError('UNAUTHORIZED', 401, 'redirecting to login'));
        return;
      }
      let body: { asset?: Asset; error?: { code?: string; message?: string } };
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        reject(new ApiError('UNKNOWN', xhr.status, `HTTP ${xhr.status}`));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.asset) {
        resolve(body.asset);
        return;
      }
      const code = body.error?.code ?? 'UNKNOWN';
      const message = body.error?.message ?? `HTTP ${xhr.status}`;
      reject(new ApiError(code, xhr.status, message));
    });

    xhr.addEventListener('error', () => {
      reject(new ApiError('NETWORK', 0, 'Upload failed. Check your connection.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new ApiError('ABORTED', 0, 'Upload cancelled.'));
    });

    xhr.send(fd);
  });
}

export async function uploadAsset(file: File, name: string): Promise<Asset> {
  return uploadAssetWithProgress(file, name);
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

export async function updateAssetTags(id: string, tags: string[]): Promise<Asset> {
  const body: UpdateAssetBody = { tags };
  const res = await apiFetch(`/api/assets/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as AssetResponse;
  return data.asset;
}

// bypasses apiFetch so we can read the 409 body for AssetInUseError references
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
      // leave references empty
    }
    throw new AssetInUseError(references);
  }
  throw new ApiError('UNKNOWN', res.status, `delete failed: ${res.status}`);
}
