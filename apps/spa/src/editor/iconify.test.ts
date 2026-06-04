import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFIXES, browseIcons, iconUrl, searchIcons } from './iconify.js';

const realFetch = global.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  global.fetch = realFetch;
});

describe('iconUrl', () => {
  it('builds the CDN URL with color query param', () => {
    const url = iconUrl('lucide', 'rocket', '#ff0000');
    expect(url).toBe(
      'https://api.iconify.design/lucide/rocket.svg?color=%23ff0000',
    );
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

  it('hits the search endpoint with prefixes and parses the response', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ icons: ['lucide:rocket', 'tabler:rocket-2'] }),
      }) as unknown as typeof fetch;
    const hits = await searchIcons('rocket', { limit: 10 });
    expect(hits).toHaveLength(2);
    expect(hits[0]).toEqual({ id: 'lucide:rocket', prefix: 'lucide', name: 'rocket' });
    expect(hits[1]).toEqual({ id: 'tabler:rocket-2', prefix: 'tabler', name: 'rocket-2' });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(calledUrl).toContain('query=rocket');
    expect(calledUrl).toContain('limit=10');
    for (const pfx of DEFAULT_PREFIXES) {
      expect(calledUrl).toContain(pfx);
    }
  });

  it('returns empty array on non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as unknown as typeof fetch;
    expect(await searchIcons('star')).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect(await searchIcons('star')).toEqual([]);
  });
});

describe('browseIcons', () => {
  it('returns empty array on non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    expect(await browseIcons('lucide')).toEqual([]);
  });

  it('flattens uncategorized + categories into IconHit[]', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        uncategorized: ['rocket'],
        categories: { General: ['star', 'heart'] },
      }),
    }) as unknown as typeof fetch;
    const hits = await browseIcons('lucide', { limit: 5 });
    expect(hits).toHaveLength(3);
    expect(hits[0]).toEqual({ id: 'lucide:rocket', prefix: 'lucide', name: 'rocket' });
  });

  it('respects the limit when passed', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ uncategorized: ['a', 'b', 'c', 'd', 'e'] }),
    }) as unknown as typeof fetch;
    const hits = await browseIcons('lucide', { limit: 2 });
    expect(hits).toHaveLength(2);
  });

  it('returns empty array on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect(await browseIcons('lucide')).toEqual([]);
  });
});
