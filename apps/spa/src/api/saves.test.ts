import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import {
  cloneSave,
  createSave,
  deleteSave,
  getSave,
  listSaves,
  updateSave,
  uploadRender,
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
  it('GETs /api/saves without filter when none / all', async () => {
    const calls: string[] = [];
    mockFetch(async (url) => {
      calls.push(String(url));
      return jsonResponse(200, { saves: [] });
    });
    await listSaves();
    await listSaves('all');
    expect(calls).toEqual(['/api/saves', '/api/saves']);
  });

  it('GETs with filter query when designs / templates', async () => {
    const calls: string[] = [];
    mockFetch(async (url) => {
      calls.push(String(url));
      return jsonResponse(200, { saves: [] });
    });
    await listSaves('designs');
    await listSaves('templates');
    expect(calls).toEqual(['/api/saves?filter=designs', '/api/saves?filter=templates']);
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
          isTemplate: false,
          renderedAt: null,
          createdAt: 1,
          updatedAt: 1,
          thumbnailUrl: null,
          downloadUrl: null,
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
          isTemplate: false, renderedAt: null, createdAt: 1, updatedAt: 2,
          thumbnailUrl: null, downloadUrl: null,
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
          isTemplate: false, renderedAt: null, createdAt: 1, updatedAt: 1,
          thumbnailUrl: null, downloadUrl: null,
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
          isTemplate: false, renderedAt: null, createdAt: 1, updatedAt: 1,
          thumbnailUrl: null, downloadUrl: null,
        },
      }),
    );
    const s = await getSave('sv1');
    expect(s.name).toBe('a');
  });
});

describe('uploadRender', () => {
  it('POSTs multipart with both blobs', async () => {
    const mock = mockFetch(async () =>
      jsonResponse(200, {
        save: {
          id: 'sv1', name: 'a', recipe: createEmptyRecipe(),
          isTemplate: false, renderedAt: 1, createdAt: 1, updatedAt: 1,
          thumbnailUrl: '/api/saves/sv1/thumbnail',
          downloadUrl: '/api/saves/sv1/download',
        },
      }),
    );
    const full = new Blob(['x'], { type: 'image/png' });
    const thumb = new Blob(['y'], { type: 'image/png' });
    await uploadRender('sv1', full, thumb);
    const init = mock.mock.calls[0]![1]!;
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    expect(fd.get('full')).toBeInstanceOf(Blob);
    expect(fd.get('thumb')).toBeInstanceOf(Blob);
  });
});
