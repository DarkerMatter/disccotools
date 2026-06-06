// 'custom' goes first so the chip lands at the front of the row
export const DEFAULT_PREFIXES = [
  'custom',
  'lucide',
  'tabler',
  'ph',
  'mdi',
  'material-symbols',
] as const;

export const PREFIX_LABELS: Record<string, string> = {
  custom: 'Custom',
  lucide: 'Lucide',
  tabler: 'Tabler',
  ph: 'Phosphor',
  mdi: 'Material Design',
  'material-symbols': 'Material Symbols',
};

export function prefixLabel(prefix: string): string {
  return PREFIX_LABELS[prefix] ?? prefix;
}

export type IconHit = {
  id: string;
  prefix: string;
  name: string;
};

const CUSTOM_API_URL = '/api/icon-pack/custom';
const CUSTOM_CACHE_TTL_MS = 60_000;

let customCache: { hits: IconHit[]; expires: number } | null = null;

export function _resetCustomCache() {
  customCache = null;
}

async function loadCustomIcons(opts: { signal?: AbortSignal } = {}): Promise<IconHit[]> {
  const now = Date.now();
  if (customCache && customCache.expires > now) return customCache.hits;
  try {
    const init: RequestInit = opts.signal ? { signal: opts.signal } : {};
    const res = await fetch(CUSTOM_API_URL, init);
    if (!res.ok) return [];
    const body = (await res.json()) as {
      icons?: Array<{ id: string; prefix: string; name: string }>;
    };
    const hits: IconHit[] = (body.icons ?? []).map((i) => ({
      id: i.id,
      prefix: i.prefix,
      name: i.name,
    }));
    customCache = { hits, expires: now + CUSTOM_CACHE_TTL_MS };
    return hits;
  } catch {
    return [];
  }
}

export function iconUrl(prefix: string, name: string, color: string): string {
  if (prefix === 'custom') {
    return `/static/icons/custom/${name}.svg?color=${encodeURIComponent(color)}`;
  }
  const params = new URLSearchParams({ color });
  return `https://api.iconify.design/${prefix}/${name}.svg?${params.toString()}`;
}

export async function searchIcons(
  query: string,
  opts: { limit?: number; prefixes?: readonly string[]; signal?: AbortSignal } = {},
): Promise<IconHit[]> {
  const limit = Math.max(1, opts.limit ?? 10000);
  const prefixes = opts.prefixes ?? DEFAULT_PREFIXES;
  const q = query.trim();
  if (q.length === 0) return [];

  const wantsCustom = prefixes.includes('custom');
  const iconifyPrefixes = prefixes.filter((p) => p !== 'custom');

  const customHits: IconHit[] = wantsCustom
    ? (await loadCustomIcons(opts.signal ? { signal: opts.signal } : {})).filter(
        (h) => h.name.toLowerCase().includes(q.toLowerCase()),
      )
    : [];

  if (iconifyPrefixes.length === 0) return customHits.slice(0, limit);

  const params = new URLSearchParams({
    query: q,
    limit: String(limit),
    prefixes: iconifyPrefixes.join(','),
  });
  const url = `https://api.iconify.design/search?${params.toString()}`;
  try {
    const init: RequestInit = opts.signal ? { signal: opts.signal } : {};
    const res = await fetch(url, init);
    if (!res.ok) return customHits;
    const body = (await res.json()) as { icons?: string[] };
    const iconifyHits: IconHit[] = (body.icons ?? []).map((id) => {
      const [prefix, ...rest] = id.split(':');
      return { id, prefix: prefix ?? '', name: rest.join(':') };
    });
    return [...customHits, ...iconifyHits];
  } catch {
    return customHits;
  }
}

// iconify gives us the whole catalog, we just slice
export async function browseIcons(
  prefix: string,
  opts: { limit?: number; signal?: AbortSignal } = {},
): Promise<IconHit[]> {
  const limit = Math.max(1, opts.limit ?? 10000);

  if (prefix === 'custom') {
    const all = await loadCustomIcons(opts.signal ? { signal: opts.signal } : {});
    return all.slice(0, limit);
  }

  const params = new URLSearchParams({ prefix, info: 'true' });
  const url = `https://api.iconify.design/collection?${params.toString()}`;
  try {
    const init: RequestInit = opts.signal ? { signal: opts.signal } : {};
    const res = await fetch(url, init);
    if (!res.ok) return [];
    const body = (await res.json()) as {
      uncategorized?: string[];
      categories?: Record<string, string[]>;
    };
    const names: string[] = [];
    if (Array.isArray(body.uncategorized)) names.push(...body.uncategorized);
    if (body.categories) {
      for (const list of Object.values(body.categories)) {
        if (Array.isArray(list)) names.push(...list);
      }
    }
    return names.slice(0, limit).map((name) => ({
      id: `${prefix}:${name}`,
      prefix,
      name,
    }));
  } catch {
    return [];
  }
}
