/**
 * Reads the JSON published to GitHub Pages and keeps the last good copy on
 * the device. The manifest is small and fetched every time; the players file
 * name contains a content hash, so it is only downloaded when it changes.
 */
import type { DataSource, FetchFn, KeyValueStore, LoadResult } from './DataSource';
import {
  SCHEMA_VERSION,
  type Manifest,
  type PlayersDoc,
  type PuzzlesDoc,
  type Snapshot,
  type TeamsDoc,
} from './types';

/** Override with EXPO_PUBLIC_DATA_URL to test against a local copy of the pipeline output. */
export const DATA_BASE_URL =
  process.env.EXPO_PUBLIC_DATA_URL || `https://oli-codes-ctrl.github.io/nba-app/v${SCHEMA_VERSION}/`;
export const CACHE_KEY = `hoops:snapshot:v${SCHEMA_VERSION}`;

export class DataError extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkSchema(value: unknown, what: string): Record<string, unknown> {
  if (!isObject(value)) throw new DataError(`${what} is not a JSON object`);
  if (value.schemaVersion !== SCHEMA_VERSION) {
    throw new DataError(
      `${what} has schema version ${String(value.schemaVersion)}; this app reads ${SCHEMA_VERSION}`,
    );
  }
  return value;
}

export function parseManifest(value: unknown): Manifest {
  const m = checkSchema(value, 'Manifest');
  const files = m.files;
  if (
    typeof m.season !== 'number' ||
    typeof m.asOf !== 'string' ||
    typeof m.generatedAt !== 'string' ||
    !isObject(files) ||
    typeof files.players !== 'string' ||
    typeof files.puzzles !== 'string' ||
    typeof files.teams !== 'string'
  ) {
    throw new DataError('Manifest is missing required fields');
  }
  return m as unknown as Manifest;
}

export function parsePlayers(value: unknown): PlayersDoc {
  const doc = checkSchema(value, 'Players file');
  if (!Array.isArray(doc.players) || !isObject(doc.poolSize)) {
    throw new DataError('Players file is missing required fields');
  }
  return doc as unknown as PlayersDoc;
}

export function parseTeams(value: unknown): TeamsDoc {
  const doc = checkSchema(value, 'Teams file');
  if (!Array.isArray(doc.teams) || !isObject(doc.league)) throw new DataError('Teams file is missing required fields');
  return doc as unknown as TeamsDoc;
}

export function parsePuzzles(value: unknown): PuzzlesDoc {
  const doc = checkSchema(value, 'Puzzles file');
  if (!Array.isArray(doc.puzzles)) throw new DataError('Puzzles file is missing required fields');
  return doc as unknown as PuzzlesDoc;
}

type Options = {
  fetch: FetchFn;
  store: KeyValueStore;
  baseUrl?: string;
  now?: () => Date;
};

export function createRemoteDataSource({
  fetch,
  store,
  baseUrl = DATA_BASE_URL,
  now = () => new Date(),
}: Options): DataSource {
  /**
   * `bust` is appended as a query string so caches between the app and
   * GitHub Pages never serve an old copy. A query string (not a no-cache
   * header) keeps the request "simple", so browsers skip the CORS preflight
   * that GitHub Pages would reject.
   */
  async function getJson(path: string, bust?: string): Promise<unknown> {
    const url = baseUrl + path + (bust ? `?v=${encodeURIComponent(bust)}` : '');
    const res = await fetch(url);
    if (!res.ok) throw new DataError(`Download of ${path} failed (HTTP ${res.status})`);
    return res.json();
  }

  async function cached(): Promise<Snapshot | null> {
    try {
      const raw = await store.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as Snapshot) : null;
    } catch {
      return null;
    }
  }

  async function fetchFresh(previous: Snapshot | null): Promise<Snapshot> {
    const manifest = parseManifest(await getJson('manifest.json', String(now().getTime())));
    if (previous && previous.manifest.generatedAt === manifest.generatedAt) {
      return { ...previous, manifest, fetchedAt: now().toISOString() };
    }
    // Players and teams files are named by content hash: reuse an unchanged one.
    const samePlayers = previous?.manifest.files.players === manifest.files.players;
    const sameTeams = previous?.manifest.files.teams === manifest.files.teams;
    const [players, puzzles, teams] = await Promise.all([
      samePlayers && previous ? previous.players : getJson(manifest.files.players).then(parsePlayers),
      // The puzzles file name has no hash, so tie it to this data refresh.
      getJson(manifest.files.puzzles, manifest.generatedAt).then(parsePuzzles),
      sameTeams && previous ? previous.teams : getJson(manifest.files.teams).then(parseTeams),
    ]);
    return { manifest, players, puzzles, teams, fetchedAt: now().toISOString() };
  }

  async function load(): Promise<LoadResult> {
    const previous = await cached();
    try {
      const snapshot = await fetchFresh(previous);
      try {
        await store.setItem(CACHE_KEY, JSON.stringify(snapshot));
      } catch {
        // A full disk should not stop the app from showing fresh data.
      }
      return { snapshot, stale: false };
    } catch (error) {
      if (previous) return { snapshot: previous, stale: true };
      throw error;
    }
  }

  return { cached, load };
}
