import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssetInUseError,
  deleteAsset,
  listAssets,
  renameAsset,
  uploadAsset,
} from './assets.js';

const realFetch = global.fetch;
const realLocation = window.location;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  global.fetch = realFetch;
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  });
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

const sampleAsset = {
  id: 'a1',
  name: 'My image',
  mimeType: 'image/png',
  sizeBytes: 1024,
  createdAt: 1,
  updatedAt: 1,
  url: '/api/assets/a1/file',
};

describe('listAssets', () => {
  it('GETs /api/assets and returns the assets array', async () => {
    const mock = mockFetch(async () => jsonResponse(200, { assets: [sampleAsset] }));
    const result = await listAssets();
    expect(result).toEqual([sampleAsset]);
    expect(mock.mock.calls[0]![0]).toBe('/api/assets');
  });
});

describe('uploadAsset', () => {
  it('POSTs multipart with file + name and returns the new asset', async () => {
    const mock = mockFetch(async () => jsonResponse(201, { asset: sampleAsset }));
    const file = new File(['hello'], 'cat.png', { type: 'image/png' });
    const asset = await uploadAsset(file, 'My image');
    expect(asset).toEqual(sampleAsset);
    const init = mock.mock.calls[0]![1]!;
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    expect(fd.get('file')).toBeInstanceOf(Blob);
    expect(fd.get('name')).toBe('My image');
  });
});

describe('renameAsset', () => {
  it('PATCHes with JSON body and returns the renamed asset', async () => {
    const mock = mockFetch(async () =>
      jsonResponse(200, { asset: { ...sampleAsset, name: 'New name' } }),
    );
    const asset = await renameAsset('a1', 'New name');
    expect(asset.name).toBe('New name');
    const init = mock.mock.calls[0]![1]!;
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'New name' });
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
  });
});

describe('deleteAsset', () => {
  it('DELETEs and resolves on 204', async () => {
    const mock = mockFetch(async () => new Response(null, { status: 204 }));
    await expect(deleteAsset('a1')).resolves.toBeUndefined();
    const init = mock.mock.calls[0]![1]!;
    expect(init.method).toBe('DELETE');
  });

  it('throws AssetInUseError with references on 409', async () => {
    mockFetch(async () =>
      jsonResponse(409, {
        error: {
          code: 'CONFLICT',
          message: 'in use',
          references: [
            { id: 'sv1', name: 'Save 1' },
            { id: 'sv2', name: 'Save 2' },
          ],
        },
      }),
    );
    const promise = deleteAsset('a1');
    await expect(promise).rejects.toBeInstanceOf(AssetInUseError);
    await promise.catch((err) => {
      expect(err.references).toEqual([
        { id: 'sv1', name: 'Save 1' },
        { id: 'sv2', name: 'Save 2' },
      ]);
    });
  });

  it('redirects to login on 401', async () => {
    mockFetch(async () => new Response(null, { status: 401 }));
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { assign: assignSpy, href: 'http://t/' },
      writable: true,
    });
    await expect(deleteAsset('a1')).rejects.toBeTruthy();
    expect(assignSpy).toHaveBeenCalledWith('/api/auth/login');
  });
});
