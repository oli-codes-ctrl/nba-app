import type { GamesDoc, Manifest, Snapshot } from './types';

export type LoadResult = {
  snapshot: Snapshot;
  /** True when the network failed and this is the last saved copy. */
  stale: boolean;
};

/**
 * Every read of stats goes through this interface, so a live source can
 * overlay in-progress games later without touching screens.
 */
export interface DataSource {
  /** Last saved snapshot on this device, or null. Never touches the network. */
  cached(): Promise<Snapshot | null>;
  /** Fetch the latest published data, falling back to the saved copy offline. */
  load(): Promise<LoadResult>;
  /**
   * The season's box scores named in this manifest, or the last saved copy
   * offline (possibly older). Null when none are published. Fetched only
   * when a screen asks, since the file grows through the season.
   */
  games(manifest: Manifest): Promise<{ doc: GamesDoc; stale: boolean } | null>;
}

/** The subset of AsyncStorage the data layer uses, so tests can fake it. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type FetchFn = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;
