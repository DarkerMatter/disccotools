import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFIXES,
  browseIcons,
  iconUrl,
  searchIcons,
  _resetCustomCache,
} from './iconify.js';

const realFetch = global.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
  _resetCustomCache();
});

afterEach(() => {
  global.fetch = realFetch;
});

type FetchInput = Parameters<typeof fetch>[0];

function fetchMock(handler: (url: string) => unknown) {
  const fn = vi.fn(async (input: FetchInput) => {
    const url = typeof input === 'string' ? input : input.toString();
    const result = handler(url);
    if (result instanceof Promise) return result;
    return result;
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function emptyCustom() {
  return { ok: true, status: 200, json: async () => ({ icons: [] }) };
}

describe('iconUrl', () => {
  it('builds the Iconify CDN URL with color query param', () => {
    const url = iconUrl('lucide', 'rocket', '#ff0000');
    expect(url).toBe(
      'https://api.iconify.design/lucide/rocket.svg?color=%23ff0000',
    );
  });

  it('routes custom icons to the same-origin static path', () => {
    const url = iconUrl('custom', 'discord/home', '#00ff00');
    expect(url).toBe('/static/icons/custom/discord/home.svg?color=%2300ff00');
  });
});

describe('searchIcons', () => {
  it('returns empty array for empty query without hitting the network', async () => {
    const spy = vi.fn();
    global.fetch = spy as unknown as typeof fetch;
    const hits = await searchIcons('   ');
    expect(hits).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('queries Iconify with all non-custom prefixes and merges custom name matches', async () => {
    fetchMock((url) => {
      if (url.includes('/api/icon-pack/custom')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            icons: [
              { id: 'custom:discord/rocket', prefix: 'custom', name: 'discord/rocket' },
              { id: 'custom:misc/star', prefix: 'custom', name: 'misc/star' },
            ],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ icons: ['lucide:rocket', 'tabler:rocket-2'] }),
      };
    });

    const hits = await searchIcons('rocket', { limit: 10 });
    expect(hits).toHaveLength(3);
    expect(hits[0]).toEqual({
      id: 'custom:discord/rocket',
      prefix: 'custom',
      name: 'discord/rocket',
    });
    expect(hits[1]).toEqual({ id: 'lucide:rocket', prefix: 'lucide', name: 'rocket' });

    const iconifyCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      ([u]) => typeof u === 'string' && u.includes('api.iconify.design'),
    );
    expect(iconifyCall).toBeTruthy();
    const calledUrl = iconifyCall![0] as string;
    expect(calledUrl).toContain('query=rocket');
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).not.toContain('custom');
    for (const pfx of DEFAULT_PREFIXES) {
      if (pfx === 'custom') continue;
      expect(calledUrl).toContain(pfx);
    }
  });

  it('returns only custom hits when prefixes is just ["custom"]', async () => {
    const fn = fetchMock((url) => {
      if (url.includes('/api/icon-pack/custom')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            icons: [
              { id: 'custom:discord/home', prefix: 'custom', name: 'discord/home' },
              { id: 'custom:brand/nintendo', prefix: 'custom', name: 'brand/nintendo' },
            ],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ icons: [] }) };
    });

    const hits = await searchIcons('home', { prefixes: ['custom'] });
    expect(hits).toEqual([
      { id: 'custom:discord/home', prefix: 'custom', name: 'discord/home' },
    ]);

    const calls = fn.mock.calls.map(([u]) => u as string);
    expect(calls.some((u) => u.includes('api.iconify.design'))).toBe(false);
  });

  it('returns empty array on non-OK Iconify response (custom still queried)', async () => {
    fetchMock((url) => {
      if (url.includes('/api/icon-pack/custom')) return emptyCustom();
      return { ok: false, status: 500, json: async () => ({}) };
    });
    expect(await searchIcons('star')).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect(await searchIcons('star')).toEqual([]);
  });
});

describe('browseIcons', () => {
  it('returns empty array on non-OK response', async () => {
    fetchMock(() => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
    expect(await browseIcons('lucide')).toEqual([]);
  });

  it('flattens uncategorized + categories into IconHit[]', async () => {
    fetchMock(() => ({
      ok: true,
      status: 200,
      json: async () => ({
        uncategorized: ['rocket'],
        categories: { General: ['star', 'heart'] },
      }),
    }));
    const hits = await browseIcons('lucide', { limit: 5 });
    expect(hits).toHaveLength(3);
    expect(hits[0]).toEqual({ id: 'lucide:rocket', prefix: 'lucide', name: 'rocket' });
  });

  it('respects the limit when passed', async () => {
    fetchMock(() => ({
      ok: true,
      status: 200,
      json: async () => ({ uncategorized: ['a', 'b', 'c', 'd', 'e'] }),
    }));
    const hits = await browseIcons('lucide', { limit: 2 });
    expect(hits).toHaveLength(2);
  });

  it('returns empty array on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect(await browseIcons('lucide')).toEqual([]);
  });

  it('browseIcons("custom") fetches from /api/icon-pack/custom', async () => {
    const fn = fetchMock(() => ({
      ok: true,
      status: 200,
      json: async () => ({
        icons: [
          { id: 'custom:discord/home', prefix: 'custom', name: 'discord/home' },
          { id: 'custom:discord/voice', prefix: 'custom', name: 'discord/voice' },
        ],
      }),
    }));
    const hits = await browseIcons('custom');
    expect(hits).toHaveLength(2);
    expect(hits[0]).toEqual({ id: 'custom:discord/home', prefix: 'custom', name: 'discord/home' });

    const calledUrl = fn.mock.calls[0]![0] as string;
    expect(calledUrl).toBe('/api/icon-pack/custom');
  });

  it('browseIcons("custom") respects limit', async () => {
    fetchMock(() => ({
      ok: true,
      status: 200,
      json: async () => ({
        icons: [
          { id: 'custom:a/1', prefix: 'custom', name: 'a/1' },
          { id: 'custom:a/2', prefix: 'custom', name: 'a/2' },
          { id: 'custom:a/3', prefix: 'custom', name: 'a/3' },
        ],
      }),
    }));
    const hits = await browseIcons('custom', { limit: 2 });
    expect(hits).toHaveLength(2);
  });
});
