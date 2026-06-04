import { useEffect, useState } from 'react';
import type { User } from '@disccotools/shared';
import { fetchMe } from '../api/client.js';

export type UserState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User };

export function useUser(): UserState {
  const [state, setState] = useState<UserState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((res) => {
        if (cancelled) return;
        if (res) setState({ status: 'authenticated', user: res.user });
        else setState({ status: 'anonymous' });
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
