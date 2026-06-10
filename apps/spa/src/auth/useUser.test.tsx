import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProvider, useUser } from './useUser.js';

vi.mock('../api/client.js', () => ({
  fetchMe: vi.fn(),
}));

import { fetchMe } from '../api/client.js';
const mockedFetchMe = vi.mocked(fetchMe);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserProvider>{children}</UserProvider>
);

beforeEach(() => {
  mockedFetchMe.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useUser', () => {
  it('starts in loading state', () => {
    mockedFetchMe.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUser(), { wrapper });
    expect(result.current.status).toBe('loading');
  });

  it('transitions to anonymous when fetchMe returns anonymous', async () => {
    mockedFetchMe.mockResolvedValue({ kind: 'anonymous' });
    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('anonymous'));
  });

  it('transitions to authenticated when fetchMe returns a user', async () => {
    mockedFetchMe.mockResolvedValue({
      kind: 'authenticated',
      data: {
        user: {
          id: '1',
          username: 'mitri',
          globalName: 'Dimitri',
          avatarHash: null,
        },
        permLevel: 1,
        pendingNotices: [],
      },
    });
    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    if (result.current.status === 'authenticated') {
      expect(result.current.user.username).toBe('mitri');
      expect(result.current.permLevel).toBe(1);
    }
  });

  it('transitions to banned when fetchMe returns banned', async () => {
    mockedFetchMe.mockResolvedValue({
      kind: 'banned',
      reason: 'TOS violation',
    });
    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('banned'));
    if (result.current.status === 'banned') {
      expect(result.current.reason).toBe('TOS violation');
    }
  });

  it('falls back to anonymous on fetch error', async () => {
    mockedFetchMe.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('anonymous'));
  });

  it('flips to banned on the next poll when admin bans an active user', async () => {
    vi.useFakeTimers();
    try {
      // first poll: authenticated
      mockedFetchMe.mockResolvedValueOnce({
        kind: 'authenticated',
        data: {
          user: { id: '1', username: 'a', globalName: null, avatarHash: null },
          permLevel: 1,
          pendingNotices: [],
        },
      });
      // every subsequent call: banned
      mockedFetchMe.mockResolvedValue({ kind: 'banned', reason: 'spam' });

      const { result } = renderHook(() => useUser(), { wrapper });
      await vi.waitFor(() =>
        expect(result.current.status).toBe('authenticated'),
      );

      // advance past the poll interval (30s)
      await vi.advanceTimersByTimeAsync(31_000);
      await vi.waitFor(() => expect(result.current.status).toBe('banned'));
    } finally {
      vi.useRealTimers();
    }
  });
});
