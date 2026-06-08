import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, fetchMe, logout } from './client.js';

const realFetch = global.fetch;
const realLocation = window.location;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  global.fetch = realFetch;
  // jsdom's window.location is locked; restore the original Location object
  // via a fresh property descriptor since the previous test may have replaced it
  // with a plain object containing a mock `assign`.
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  });
});

function mockFetch(response: Partial<Response>) {
  const res = {
    ok: response.status ? response.status >= 200 && response.status < 300 : true,
    status: 200,
    json: async () => ({}),
    ...response,
  } as Response;
  global.fetch = vi.fn().mockResolvedValue(res);
  return global.fetch as ReturnType<typeof vi.fn>;
}

describe('apiFetch', () => {
  it('returns the response on 2xx', async () => {
    mockFetch({ status: 200, ok: true, json: async () => ({ data: 1 }) });
    const res = await apiFetch('/x');
    expect(res.status).toBe(200);
  });

  it('redirects to /api/auth/login on 401 and throws', async () => {
    mockFetch({ status: 401, ok: false, json: async () => ({}) });
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { assign: assignSpy, href: 'http://t/' },
      writable: true,
    });
    await expect(apiFetch('/secret')).rejects.toBeInstanceOf(ApiError);
    expect(assignSpy).toHaveBeenCalledWith('/api/auth/login');
  });

  it('throws ApiError with code+message from envelope on non-401 error', async () => {
    mockFetch({
      status: 404,
      ok: false,
      json: async () => ({ error: { code: 'NOT_FOUND', message: 'nope' } }),
    });
    await expect(apiFetch('/x')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      message: 'nope',
    });
  });
});

describe('fetchMe', () => {
  it('returns null on 401 (no redirect)', async () => {
    mockFetch({ status: 401, ok: false, json: async () => ({}) });
    const result = await fetchMe();
    expect(result).toBeNull();
  });

  it('returns parsed AuthMeResponse on 200', async () => {
    mockFetch({
      status: 200,
      ok: true,
      json: async () => ({
        user: {
          id: '714517219026927767',
          username: 'mitri',
          globalName: 'Dimitri',
          avatarHash: 'a_abc123',
        },
      }),
    });
    const result = await fetchMe();
    expect(result?.user.id).toBe('714517219026927767');
    expect(result?.user.username).toBe('mitri');
  });
});

describe('logout', () => {
  it('POSTs /api/auth/logout', async () => {
    const fetchMock = mockFetch({ status: 204, ok: true, json: async () => ({}) });
    await logout();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
