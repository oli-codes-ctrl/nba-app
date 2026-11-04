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
import type { GamesDoc, Player, Snapshot, TeamSeason } from './types';

/** Box scores load on demand: 'none' when no games file is published. */
export type GamesState = {
  doc: GamesDoc | null;
  status: 'idle' | 'loading' | 'ready' | 'none' | 'error';
  /** Showing a saved copy because the download failed. */
  stale: boolean;
};

type DataState = {
  snapshot: Snapshot | null;
  /** Showing a saved copy because the latest download failed. */
  stale: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  playerById: ReadonlyMap<number, Player>;
  teamByAbbr: ReadonlyMap<string, TeamSeason>;
  games: GamesState;
  /** Load the box scores for the current data, once; again after an error. */
  requestGames: () => void;
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
  const [games, setGames] = useState<GamesState>({ doc: null, status: 'idle', stale: false });
  // The games file asked for, so each one is requested once.
  const gamesFor = useRef<string | null>(null);

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

  const requestGames = useCallback(() => {
    if (!snapshot) return;
    const file = snapshot.manifest.files.games ?? '';
    if (gamesFor.current === file) return;
    gamesFor.current = file;
    setGames((g) => ({ ...g, status: g.doc ? g.status : 'loading' }));
    sourceRef.current
      .games(snapshot.manifest)
      .then((r) => setGames(r ? { doc: r.doc, status: 'ready', stale: r.stale } : { doc: null, status: 'none', stale: false }))
      .catch(() => {
        gamesFor.current = null; // let the next request retry
        setGames((g) => ({ ...g, status: g.doc ? 'ready' : 'error' }));
      });
  }, [snapshot]);

  const playerById = useMemo(
    () => new Map((snapshot?.players.players ?? []).map((p) => [p.id, p])),
    [snapshot],
  );

  const teamByAbbr = useMemo(
    () => new Map((snapshot?.teams.teams ?? []).map((t) => [t.abbr, t])),
    [snapshot],
  );

  const value = useMemo(
    () => ({ snapshot, stale, loading, error, refresh, playerById, teamByAbbr, games, requestGames }),
    [snapshot, stale, loading, error, refresh, playerById, teamByAbbr, games, requestGames],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

/** The season's box scores; asks for them the first time a screen uses this. */
export function useGameLogs(): GamesState & { retry: () => void } {
  const { games, requestGames } = useData();
  useEffect(() => {
    requestGames();
  }, [requestGames]);
  return { ...games, retry: requestGames };
}
