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

export function assetKey(userId: string, assetId: string, ext: string): string {
  const clean = ext.replace(/^\./, '').toLowerCase();
  return `assets/${userId}/${assetId}.${clean}`;
}

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
