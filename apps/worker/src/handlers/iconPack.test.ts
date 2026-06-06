import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { bakeColor, validateColor } from './iconPack.js';

async function putIcon(category: string, name: string, body: string) {
  const key = `static/icons/custom/${category}/${name}.svg`;
  await env.R2.put(key, body, { httpMetadata: { contentType: 'image/svg+xml' } });
}

async function clearR2() {
  const list = await env.R2.list();
  for (const obj of list.objects) await env.R2.delete(obj.key);
}

describe('validateColor', () => {
  it('accepts a six-digit hex with a hash', () => {
    expect(validateColor('#ff00aa')).toBe('#ff00aa');
  });
  it('accepts a URL-encoded hash', () => {
    expect(validateColor('%23ff00aa')).toBe('#ff00aa');
  });
  it('rejects missing hash', () => {
    expect(validateColor('ff00aa')).toBeNull();
  });
  it('rejects non-hex characters', () => {
    expect(validateColor('#zzz')).toBeNull();
  });
  it('rejects empty / nullish', () => {
    expect(validateColor('')).toBeNull();
    expect(validateColor(null)).toBeNull();
    expect(validateColor(undefined)).toBeNull();
  });
});

describe('bakeColor', () => {
  it('replaces every currentColor occurrence', () => {
    const src = '<svg fill="currentColor"><path stroke="currentColor"/></svg>';
    expect(bakeColor(src, '#ff0000')).toBe(
      '<svg fill="#ff0000"><path stroke="#ff0000"/></svg>',
    );
  });
  it('leaves explicit fills alone', () => {
    const src = '<svg fill="currentColor"><polygon fill="#ffffff"/></svg>';
    expect(bakeColor(src, '#00ff00')).toBe(
      '<svg fill="#00ff00"><polygon fill="#ffffff"/></svg>',
    );
  });
});

describe('GET /api/icon-pack/custom', () => {
  beforeEach(async () => {
    await clearR2();
  });

  it('lists icons from R2 sorted by category then displayName', async () => {
    await putIcon('discord', 'home', '<svg/>');
    await putIcon('discord', 'early-developer', '<svg/>');
    await putIcon('brand', 'nintendo', '<svg/>');

    const res = await SELF.fetch('http://example.com/api/icon-pack/custom');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { icons: Array<{ id: string; name: string; category: string; displayName: string; prefix: string }> };

    expect(body.icons.length).toBe(3);
    expect(body.icons[0]).toMatchObject({
      prefix: 'custom',
      category: 'brand',
      name: 'brand/nintendo',
      displayName: 'Nintendo',
    });
    expect(body.icons[1]).toMatchObject({ name: 'discord/early-developer', displayName: 'Early Developer' });
    expect(body.icons[2]).toMatchObject({ name: 'discord/home', displayName: 'Home' });
  });

  it('returns empty list when no icons present', async () => {
    const res = await SELF.fetch('http://example.com/api/icon-pack/custom');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { icons: unknown[] };
    expect(body.icons).toEqual([]);
  });

  it('ignores R2 keys outside the custom prefix', async () => {
    await env.R2.put('static/disccotools.png', new Uint8Array([0]).buffer);
    await env.R2.put('static/icons/custom/discord/voice.svg', '<svg/>', {
      httpMetadata: { contentType: 'image/svg+xml' },
    });

    const res = await SELF.fetch('http://example.com/api/icon-pack/custom');
    const body = (await res.json()) as { icons: Array<{ name: string }> };
    expect(body.icons.length).toBe(1);
    expect(body.icons[0].name).toBe('discord/voice');
  });
});

describe('GET /static/* with ?color=', () => {
  beforeEach(async () => {
    await clearR2();
  });

  it('bakes the color into an SVG when ?color= is a valid hex', async () => {
    await putIcon('discord', 'home', '<svg fill="currentColor"><path/></svg>');

    const res = await SELF.fetch(
      'http://example.com/static/icons/custom/discord/home.svg?color=%23ff0000',
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/svg+xml');
    const text = await res.text();
    expect(text).toBe('<svg fill="#ff0000"><path/></svg>');
  });

  it('returns the raw SVG when ?color= is missing', async () => {
    await putIcon('discord', 'home', '<svg fill="currentColor"><path/></svg>');

    const res = await SELF.fetch('http://example.com/static/icons/custom/discord/home.svg');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('<svg fill="currentColor"><path/></svg>');
  });

  it('ignores an invalid color', async () => {
    await putIcon('discord', 'home', '<svg fill="currentColor"><path/></svg>');

    const res = await SELF.fetch(
      'http://example.com/static/icons/custom/discord/home.svg?color=red',
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('<svg fill="currentColor"><path/></svg>');
  });

  it('does not modify non-SVG assets even with ?color=', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
    await env.R2.put('static/icons/custom/junk.png', png.buffer, {
      httpMetadata: { contentType: 'image/png' },
    });

    const res = await SELF.fetch(
      'http://example.com/static/icons/custom/junk.png?color=%23ff0000',
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
  });

  it('returns 404 for missing keys', async () => {
    const res = await SELF.fetch(
      'http://example.com/static/icons/custom/discord/does-not-exist.svg?color=%23ff0000',
    );
    expect(res.status).toBe(404);
  });
});
