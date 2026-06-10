import { useEffect, useState } from 'react';
import type { PendingNotice, User } from '@disccotools/shared';
import { fetchMe } from '../api/client.js';

export type UserState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'banned'; reason: string }
  | {
      status: 'authenticated';
      user: User;
      permLevel: number;
      pendingNotices: PendingNotice[];
    };

export function useUser(): UserState {
  const [state, setState] = useState<UserState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((res) => {
        if (cancelled) return;
        if (res.kind === 'anonymous') {
          setState({ status: 'anonymous' });
          return;
        }
        if (res.kind === 'banned') {
          setState({ status: 'banned', reason: res.reason });
          return;
        }
        setState({
          status: 'authenticated',
          user: res.data.user,
          permLevel: res.data.permLevel,
          pendingNotices: res.data.pendingNotices,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'anonymous' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
