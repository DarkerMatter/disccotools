/**
 * Pure helpers for R2 object keys.
 *
 * Conventions:
 *   saves/{user_id}/{save_id}.png        — full render
 *   saves/{user_id}/{save_id}_thumb.png  — thumbnail
 *   uploads/{user_id}/{asset_id}.{ext}   — raw uploads (Phase 5)
 *   assets/{user_id}/{asset_id}.{ext}    — library assets (Phase 5)
 *
 * Ownership is enforced by checking that a key starts with the calling user's
 * `{user_id}/` prefix under a known top-level dir. The worker never trusts a
 * key supplied by the client.
 */

const TOP_LEVEL = ['saves', 'uploads', 'assets'] as const;

export function renderKey(userId: string, saveId: string): string {
  return `saves/${userId}/${saveId}.png`;
}

export function thumbKey(userId: string, saveId: string): string {
  return `saves/${userId}/${saveId}_thumb.png`;
}

export function ownsKey(userId: string, key: string): boolean {
  for (const top of TOP_LEVEL) {
    const prefix = `${top}/${userId}/`;
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

/** Build the canonical R2 key for a user-uploaded asset. */
export function assetKey(userId: string, assetId: string, ext: string): string {
  const clean = ext.replace(/^\./, '').toLowerCase();
  return `assets/${userId}/${assetId}.${clean}`;
}

/** Map an allowed image MIME type to its on-disk extension. */
export function extForMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/svg+xml':
      return 'svg';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}
