/** Players the user follows, saved on the device. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'hoops:follows:v1';

type FollowState = {
  ids: readonly number[];
  isFollowing: (id: number) => boolean;
  toggle: (id: number) => void;
};

const FollowContext = createContext<FollowState | null>(null);

export function FollowProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const saved: unknown = raw ? JSON.parse(raw) : [];
        if (!cancelled && Array.isArray(saved)) setIds(saved.filter((x): x is number => typeof x === 'number'));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((id: number) => {
    setIds((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ ids, isFollowing: (id: number) => ids.includes(id), toggle }),
    [ids, toggle],
  );
  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollows(): FollowState {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error('useFollows must be used inside <FollowProvider>');
  return ctx;
}
