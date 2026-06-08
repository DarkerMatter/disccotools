import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUser } from './useUser.js';

vi.mock('../api/client.js', () => ({
  fetchMe: vi.fn(),
}));

import { fetchMe } from '../api/client.js';
const mockedFetchMe = vi.mocked(fetchMe);

beforeEach(() => {
  mockedFetchMe.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useUser', () => {
  it('starts in loading state', () => {
    mockedFetchMe.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUser());
    expect(result.current.status).toBe('loading');
  });

  it('transitions to anonymous when fetchMe returns null', async () => {
    mockedFetchMe.mockResolvedValue(null);
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.status).toBe('anonymous'));
  });

  it('transitions to authenticated when fetchMe returns a user', async () => {
    mockedFetchMe.mockResolvedValue({
      user: {
        id: '1',
        username: 'mitri',
        globalName: 'Dimitri',
        avatarHash: null,
      },
    });
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    if (result.current.status === 'authenticated') {
      expect(result.current.user.username).toBe('mitri');
    }
  });

  it('falls back to anonymous on fetch error', async () => {
    mockedFetchMe.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.status).toBe('anonymous'));
  });
});
