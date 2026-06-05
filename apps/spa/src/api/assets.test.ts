import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './client.js';
import {
  AssetInUseError,
  deleteAsset,
  listAssets,
  renameAsset,
  uploadAsset,
  uploadAssetWithProgress,
  validateAssetFile,
} from './assets.js';

const realFetch = global.fetch;
const realLocation = window.location;
const realXHR = global.XMLHttpRequest;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  global.fetch = realFetch;
  global.XMLHttpRequest = realXHR;
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

describe('validateAssetFile', () => {
  function makeFile(opts: { type: string; size?: number; name?: string }): File {
    // jsdom's File ignores Blob byte counts at construction; size is derived
    // from the body parts. Pad with a string of the requested length.
    const size = opts.size ?? 8;
    const body = size === 0 ? [] : ['x'.repeat(size)];
    return new File(body, opts.name ?? 'f', { type: opts.type });
  }

  it('accepts PNG, JPEG, WebP under the size cap', () => {
    expect(validateAssetFile(makeFile({ type: 'image/png' }))).toBeNull();
    expect(validateAssetFile(makeFile({ type: 'image/jpeg' }))).toBeNull();
    expect(validateAssetFile(makeFile({ type: 'image/webp' }))).toBeNull();
  });

  it('rejects SVG with a clear message', () => {
    const msg = validateAssetFile(makeFile({ type: 'image/svg+xml' }));
    expect(msg).toBe('Unsupported file type. PNG, JPEG, or WebP only.');
  });

  it('rejects unknown MIME types', () => {
    expect(validateAssetFile(makeFile({ type: 'application/pdf' }))).toBe(
      'Unsupported file type. PNG, JPEG, or WebP only.',
    );
  });

  it('rejects files over 10 MB', () => {
    const file = makeFile({ type: 'image/png', size: 10 * 1024 * 1024 + 1 });
    const msg = validateAssetFile(file);
    expect(msg).toMatch(/too large/i);
    expect(msg).toMatch(/Max 10 MB/);
  });

  it('rejects empty files', () => {
    const file = makeFile({ type: 'image/png', size: 0 });
    expect(validateAssetFile(file)).toBe('File is empty.');
  });
});

/**
 * Tiny stand-in for `XMLHttpRequest` that lets tests drive the load / error
 * lifecycle synchronously. The real jsdom XHR can't easily intercept request
 * bodies for assertions, so we install this mock for the upload tests.
 */
class MockXHR {
  static last: MockXHR | null = null;
  static reset() {
    MockXHR.last = null;
  }
  listeners: Record<string, (e?: ProgressEvent) => void> = {};
  uploadListeners: Record<string, (e: ProgressEvent) => void> = {};
  upload = {
    addEventListener: (event: string, fn: (e: ProgressEvent) => void) => {
      this.uploadListeners[event] = fn;
    },
  };
  status = 0;
  responseText = '';
  withCredentials = false;
  openCalls: [string, string, boolean][] = [];
  sentBody: BodyInit | null = null;
  open(method: string, url: string, async: boolean) {
    this.openCalls.push([method, url, async]);
  }
  addEventListener(event: string, fn: (e?: ProgressEvent) => void) {
    this.listeners[event] = fn;
  }
  send(body?: BodyInit | null) {
    this.sentBody = body ?? null;
    MockXHR.last = this;
  }
  abort() {
    this.listeners.abort?.();
  }
  /** Test helper: fire upload progress. */
  fireProgress(loaded: number, total: number) {
    const ev = { loaded, total, lengthComputable: true } as unknown as ProgressEvent;
    this.uploadListeners.progress?.(ev);
  }
  /** Test helper: complete the request with `status` + JSON `body`. */
  complete(status: number, body: unknown) {
    this.status = status;
    this.responseText = typeof body === 'string' ? body : JSON.stringify(body);
    this.listeners.load?.();
  }
  /** Test helper: simulate a network failure. */
  fail() {
    this.listeners.error?.();
  }
}

function installMockXHR() {
  MockXHR.reset();
  global.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest;
}

describe('uploadAssetWithProgress', () => {
  it('rejects with a VALIDATION ApiError when the file is the wrong type', async () => {
    installMockXHR();
    const file = new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' });
    await expect(uploadAssetWithProgress(file, 'bad')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'VALIDATION',
      status: 400,
    });
    expect(MockXHR.last).toBeNull();
  });

  it('POSTs multipart with file + name and resolves with the asset', async () => {
    installMockXHR();
    const file = new File(['hello'], 'cat.png', { type: 'image/png' });
    const promise = uploadAssetWithProgress(file, 'My image');
    const xhr = MockXHR.last!;
    expect(xhr).not.toBeNull();
    expect(xhr.openCalls[0]).toEqual(['POST', '/api/assets', true]);
    expect(xhr.withCredentials).toBe(true);
    const fd = xhr.sentBody as FormData;
    expect(fd).toBeInstanceOf(FormData);
    expect(fd.get('name')).toBe('My image');
    expect(fd.get('file')).toBeInstanceOf(Blob);
    xhr.complete(201, { asset: sampleAsset });
    await expect(promise).resolves.toEqual(sampleAsset);
  });

  it('invokes the progress callback with fraction', async () => {
    installMockXHR();
    const file = new File(['hello'], 'cat.png', { type: 'image/png' });
    const progress = vi.fn();
    const promise = uploadAssetWithProgress(file, 'cat', progress);
    const xhr = MockXHR.last!;
    xhr.fireProgress(25, 100);
    xhr.fireProgress(100, 100);
    xhr.complete(201, { asset: sampleAsset });
    await promise;
    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({ loaded: 25, total: 100, fraction: 0.25 }),
    );
    expect(progress).toHaveBeenLastCalledWith(
      expect.objectContaining({ loaded: 100, total: 100, fraction: 1 }),
    );
  });

  it('rejects with the server-supplied code + message on 4xx', async () => {
    installMockXHR();
    const file = new File(['hello'], 'cat.png', { type: 'image/png' });
    const promise = uploadAssetWithProgress(file, 'cat');
    const xhr = MockXHR.last!;
    xhr.complete(400, {
      error: { code: 'BAD_MIME', message: 'unsupported mime' },
    });
    await expect(promise).rejects.toMatchObject({
      name: 'ApiError',
      code: 'BAD_MIME',
      status: 400,
      message: 'unsupported mime',
    });
  });

  it('rejects with a NETWORK ApiError on transport failure', async () => {
    installMockXHR();
    const file = new File(['hello'], 'cat.png', { type: 'image/png' });
    const promise = uploadAssetWithProgress(file, 'cat');
    const xhr = MockXHR.last!;
    xhr.fail();
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await promise.catch((err: ApiError) => {
      expect(err.code).toBe('NETWORK');
      expect(err.status).toBe(0);
    });
  });

  it('redirects to login on 401', async () => {
    installMockXHR();
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { assign: assignSpy, href: 'http://t/' },
      writable: true,
    });
    const file = new File(['hello'], 'cat.png', { type: 'image/png' });
    const promise = uploadAssetWithProgress(file, 'cat');
    const xhr = MockXHR.last!;
    xhr.complete(401, { error: { code: 'UNAUTHORIZED', message: 'no' } });
    await expect(promise).rejects.toBeTruthy();
    expect(assignSpy).toHaveBeenCalledWith('/api/auth/login');
  });
});

describe('uploadAsset (back-compat wrapper)', () => {
  it('delegates to uploadAssetWithProgress and returns the asset', async () => {
    installMockXHR();
    const file = new File(['hello'], 'cat.png', { type: 'image/png' });
    const promise = uploadAsset(file, 'My image');
    const xhr = MockXHR.last!;
    xhr.complete(201, { asset: sampleAsset });
    await expect(promise).resolves.toEqual(sampleAsset);
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
