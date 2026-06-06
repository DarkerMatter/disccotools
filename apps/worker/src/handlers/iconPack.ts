import type { Context } from 'hono';
import type { AppEnv } from '../env.js';

const CUSTOM_PREFIX = 'static/icons/custom/';
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

export type CustomIconHit = {
  id: string;
  prefix: 'custom';
  name: string;
  category: string;
  displayName: string;
};

function humanize(slug: string): string {
  return slug
    .split('-')
    .filter((p) => p.length > 0)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export function validateColor(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!HEX_RE.test(value)) return null;
  return value;
}

export function bakeColor(svgText: string, color: string): string {
  return svgText.replace(/currentColor/g, color);
}

function parseKey(key: string): { category: string; basename: string } | null {
  if (!key.startsWith(CUSTOM_PREFIX)) return null;
  const rest = key.slice(CUSTOM_PREFIX.length);
  // expected: <category>/<basename>.svg
  const parts = rest.split('/');
  if (parts.length !== 2) return null;
  const [category, filename] = parts;
  if (!filename.toLowerCase().endsWith('.svg')) return null;
  const basename = filename.slice(0, -'.svg'.length);
  if (!category || !basename) return null;
  return { category, basename };
}

export const listCustomIconsHandler = async (c: Context<AppEnv>) => {
  const icons: CustomIconHit[] = [];
  let cursor: string | undefined;
  do {
    const res: R2Objects = await c.env.R2.list({
      prefix: CUSTOM_PREFIX,
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });
    for (const obj of res.objects) {
      const parsed = parseKey(obj.key);
      if (!parsed) continue;
      const name = `${parsed.category}/${parsed.basename}`;
      icons.push({
        id: `custom:${name}`,
        prefix: 'custom',
        name,
        category: parsed.category,
        displayName: humanize(parsed.basename),
      });
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);

  icons.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.displayName.localeCompare(b.displayName);
  });

  return new Response(JSON.stringify({ icons }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
