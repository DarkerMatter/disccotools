import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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

// poll cadence for ban / tier / notice updates. balances "feels live" with
// "don't hammer the worker."
const POLL_MS = 30_000;

const UserContext = createContext<UserState>({ status: 'loading' });

function meResultToState(res: Awaited<ReturnType<typeof fetchMe>>): UserState {
  if (res.kind === 'anonymous') return { status: 'anonymous' };
  if (res.kind === 'banned') return { status: 'banned', reason: res.reason };
  return {
    status: 'authenticated',
    user: res.data.user,
    permLevel: res.data.permLevel,
    pendingNotices: res.data.pendingNotices,
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>({ status: 'loading' });
  // guard against overlapping requests when a poll fires during a focus refresh
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetchMe();
      setState(meResultToState(res));
    } catch {
      setState({ status: 'anonymous' });
    } finally {
      inflight.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  return <UserContext.Provider value={state}>{children}</UserContext.Provider>;
}

export function useUser(): UserState {
  return useContext(UserContext);
}
