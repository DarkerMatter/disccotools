import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import {
  cloneSave,
  createSave,
  deleteSave,
  getSave,
  listSaves,
  updateSave,
} from './saves.js';

const realFetch = global.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  global.fetch = realFetch;
});

function mockFetch(impl: (input: RequestInfo, init?: RequestInit) => Promise<Response>) {
  global.fetch = vi.fn().mockImplementation(impl) as unknown as typeof fetch;
  return global.fetch as ReturnType<typeof vi.fn>;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('listSaves', () => {
  it('GETs /api/saves', async () => {
    const calls: string[] = [];
    mockFetch(async (url) => {
      calls.push(String(url));
      return jsonResponse(200, { saves: [] });
    });
    await listSaves();
    expect(calls).toEqual(['/api/saves']);
  });
});

describe('createSave / updateSave / getSave / deleteSave / cloneSave', () => {
  it('round-trips the save body for create', async () => {
    const recipe = createEmptyRecipe();
    mockFetch(async () =>
      jsonResponse(201, {
        save: {
          id: 'sv1',
          name: 'a',
          recipe,
          createdAt: 1,
          updatedAt: 1,
        },
      }),
    );
    const save = await createSave({ name: 'a', recipe });
    expect(save.id).toBe('sv1');
  });

  it('PATCHes for update', async () => {
    const mock = mockFetch(async () =>
      jsonResponse(200, {
        save: {
          id: 'sv1', name: 'b', recipe: createEmptyRecipe(),
          createdAt: 1, updatedAt: 2,
        },
      }),
    );
    await updateSave('sv1', { name: 'b' });
    expect(mock.mock.calls[0]![1]?.method).toBe('PATCH');
  });

  it('DELETEs', async () => {
    const mock = mockFetch(async () => new Response(null, { status: 204 }));
    await deleteSave('sv1');
    expect(mock.mock.calls[0]![1]?.method).toBe('DELETE');
  });

  it('POSTs clone with body', async () => {
    const mock = mockFetch(async () =>
      jsonResponse(201, {
        save: {
          id: 'sv2', name: 'a (copy)', recipe: createEmptyRecipe(),
          createdAt: 1, updatedAt: 1,
        },
      }),
    );
    await cloneSave('sv1', { name: 'a (copy)' });
    const init = mock.mock.calls[0]![1]!;
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'a (copy)' });
  });

  it('GETs single save', async () => {
    mockFetch(async () =>
      jsonResponse(200, {
        save: {
          id: 'sv1', name: 'a', recipe: createEmptyRecipe(),
          createdAt: 1, updatedAt: 1,
        },
      }),
    );
    const s = await getSave('sv1');
    expect(s.name).toBe('a');
  });
});
