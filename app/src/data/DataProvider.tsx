import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { DataSource } from './DataSource';
import { createRemoteDataSource } from './remote';
import type { Player, Snapshot, TeamSeason } from './types';

type DataState = {
  snapshot: Snapshot | null;
  /** Showing a saved copy because the latest download failed. */
  stale: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  playerById: ReadonlyMap<number, Player>;
  teamByAbbr: ReadonlyMap<string, TeamSeason>;
};

const DataContext = createContext<DataState | null>(null);

export function defaultDataSource(): DataSource {
  return createRemoteDataSource({ fetch: (url) => fetch(url), store: AsyncStorage });
}

export function DataProvider({ source, children }: { source?: DataSource; children: ReactNode }) {
  const sourceRef = useRef<DataSource>(source ?? defaultDataSource());
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Fetch and apply the result. State only changes once the request settles. */
  const fetchLatest = useCallback(async (isCancelled: () => boolean = () => false) => {
    try {
      const result = await sourceRef.current.load();
      if (isCancelled()) return;
      setSnapshot(result.snapshot);
      setStale(result.stale);
      setError(null);
    } catch (e) {
      if (isCancelled()) return;
      setError(e instanceof Error ? e.message : 'Could not load stats');
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchLatest();
  }, [fetchLatest]);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    // Show the saved copy at once, then check for newer data.
    sourceRef.current.cached().then((saved) => {
      if (!cancelled && saved) setSnapshot((current) => current ?? saved);
    });
    fetchLatest(isCancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchLatest]);

  const playerById = useMemo(
    () => new Map((snapshot?.players.players ?? []).map((p) => [p.id, p])),
    [snapshot],
  );

  const teamByAbbr = useMemo(
    () => new Map((snapshot?.teams.teams ?? []).map((t) => [t.abbr, t])),
    [snapshot],
  );

  const value = useMemo(
    () => ({ snapshot, stale, loading, error, refresh, playerById, teamByAbbr }),
    [snapshot, stale, loading, error, refresh, playerById, teamByAbbr],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
