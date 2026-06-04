/**
 * Thin client for the public Iconify CDN. We trust it not to turn evil.
 * Docs: https://docs.iconify.design/api/queries.html
 */

export const DEFAULT_PREFIXES = [
  'lucide',
  'tabler',
  'ph',
  'mdi',
  'material-symbols',
] as const;

export const PREFIX_LABELS: Record<string, string> = {
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
  /** Full id like "lucide:rocket" */
  id: string;
  /** Prefix only, e.g. "lucide" */
  prefix: string;
  /** Name only, e.g. "rocket" */
  name: string;
};

/** Build the SVG URL for a given icon set/name and color. */
export function iconUrl(prefix: string, name: string, color: string): string {
  const params = new URLSearchParams({ color });
  return `https://api.iconify.design/${prefix}/${name}.svg?${params.toString()}`;
}

/** Search the Iconify catalogue. Falls back to `[]` on any failure. */
export async function searchIcons(
  query: string,
  opts: { limit?: number; prefixes?: readonly string[]; signal?: AbortSignal } = {},
): Promise<IconHit[]> {
  const limit = Math.max(1, opts.limit ?? 10000);
  const prefixes = opts.prefixes ?? DEFAULT_PREFIXES;
  const q = query.trim();
  if (q.length === 0) return [];
  const params = new URLSearchParams({
    query: q,
    limit: String(limit),
    prefixes: prefixes.join(','),
  });
  const url = `https://api.iconify.design/search?${params.toString()}`;
  try {
    const init: RequestInit = opts.signal ? { signal: opts.signal } : {};
    const res = await fetch(url, init);
    if (!res.ok) return [];
    const body = (await res.json()) as { icons?: string[] };
    return (body.icons ?? []).map((id) => {
      const [prefix, ...rest] = id.split(':');
      return { id, prefix: prefix ?? '', name: rest.join(':') };
    });
  } catch {
    return [];
  }
}

/** Browse every icon in a single Iconify set. Failures resolve to `[]`. */
export async function browseIcons(
  prefix: string,
  opts: { limit?: number; signal?: AbortSignal } = {},
): Promise<IconHit[]> {
  const limit = Math.max(1, opts.limit ?? 10000);
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
