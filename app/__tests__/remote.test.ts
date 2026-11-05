import type { FetchFn, KeyValueStore } from '@/data/DataSource';
import { CACHE_KEY, createRemoteDataSource, DataError } from '@/data/remote';

const BASE = 'https://example.test/v2/';

function manifest(generatedAt: string, playersFile = 'players.aaa.json', teamsFile = 'teams.aaa.json') {
  return {
    schemaVersion: 2,
    season: 2026,
    generatedAt,
    asOf: generatedAt.slice(0, 10),
    source: 'ESPN',
    playerCount: 1,
    qualifiedCount: 1,
    files: { players: playersFile, puzzles: 'puzzles.json', teams: teamsFile },
  };
}

const playersDoc = { schemaVersion: 2, season: 2026, poolSize: {}, lowerIsBetter: ['pf', 'tov'], players: [] };
const puzzlesDoc = { schemaVersion: 2, puzzles: [] };
const teamsDoc = { schemaVersion: 2, season: 2026, gamesThrough: '2026-11-01', league: { ortg: 114 }, teams: [] };

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  async getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

function fakeFetch(files: Record<string, unknown>) {
  const calls: string[] = [];
  const queries: string[] = [];
  let offline = false;
  const fn: FetchFn = async (url) => {
    const [path, query] = url.replace(BASE, '').split('?');
    calls.push(path);
    queries.push(query ?? '');
    if (offline) throw new TypeError('Network request failed');
    const body = files[path];
    return { ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body };
  };
  return {
    fn,
    calls,
    queries,
    files,
    goOffline: () => {
      offline = true;
    },
  };
}

function setup(files: Record<string, unknown>) {
  const net = fakeFetch(files);
  const store = new MemoryStore();
  const source = createRemoteDataSource({
    fetch: net.fn,
    store,
    baseUrl: BASE,
    now: () => new Date('2026-11-02T12:00:00Z'),
  });
  return { net, store, source };
}

describe('remote data source', () => {
  const initial = {
    'manifest.json': manifest('2026-11-02T10:00:00+00:00'),
    'players.aaa.json': playersDoc,
    'puzzles.json': puzzlesDoc,
    'teams.aaa.json': teamsDoc,
  };

  it('downloads all files on first launch and saves them', async () => {
    const { net, store, source } = setup({ ...initial });
    const { snapshot, stale } = await source.load();
    expect(stale).toBe(false);
    expect(net.calls.sort()).toEqual(['manifest.json', 'players.aaa.json', 'puzzles.json', 'teams.aaa.json']);
    expect(snapshot.manifest.asOf).toBe('2026-11-02');
    expect(snapshot.teams.league.ortg).toBe(114);
    expect(store.data.has(CACHE_KEY)).toBe(true);
    expect(await source.cached()).toEqual(snapshot);
  });

  it('busts caches with query strings, not headers, and never on the hashed players file', async () => {
    const { net, source } = setup({ ...initial });
    await source.load();
    const byPath = Object.fromEntries(net.calls.map((c, i) => [c, net.queries[i]]));
    expect(byPath['manifest.json']).toBe(`v=${new Date('2026-11-02T12:00:00Z').getTime()}`);
    expect(byPath['puzzles.json']).toBe(`v=${encodeURIComponent('2026-11-02T10:00:00+00:00')}`);
    expect(byPath['players.aaa.json']).toBe('');
    expect(byPath['teams.aaa.json']).toBe('');
  });

  it('only fetches the manifest when nothing changed', async () => {
    const { net, source } = setup({ ...initial });
    await source.load();
    net.calls.length = 0;
    await source.load();
    expect(net.calls).toEqual(['manifest.json']);
  });

  it('downloads a new teams file only when its hash changes', async () => {
    const { net, source } = setup({ ...initial });
    await source.load();
    net.calls.length = 0;
    net.files['manifest.json'] = manifest('2026-11-03T10:00:00+00:00', 'players.aaa.json', 'teams.bbb.json');
    net.files['teams.bbb.json'] = { ...teamsDoc, league: { ortg: 115 } };
    const { snapshot } = await source.load();
    expect(net.calls.sort()).toEqual(['manifest.json', 'puzzles.json', 'teams.bbb.json']);
    expect(snapshot.teams.league.ortg).toBe(115);
  });

  it('skips the players file when its hash is unchanged', async () => {
    const { net, source } = setup({ ...initial });
    await source.load();
    net.calls.length = 0;
    net.files['manifest.json'] = manifest('2026-11-03T10:00:00+00:00');
    const { snapshot } = await source.load();
    expect(net.calls.sort()).toEqual(['manifest.json', 'puzzles.json']);
    expect(snapshot.manifest.asOf).toBe('2026-11-03');
  });

  it('downloads a new players file when the hash changes', async () => {
    const { net, source } = setup({ ...initial });
    await source.load();
    net.calls.length = 0;
    net.files['manifest.json'] = manifest('2026-11-03T10:00:00+00:00', 'players.bbb.json');
    net.files['players.bbb.json'] = playersDoc;
    await source.load();
    expect(net.calls).toContain('players.bbb.json');
  });

  it('falls back to the saved copy when offline', async () => {
    const { net, source } = setup({ ...initial });
    const first = await source.load();
    net.goOffline();
    const second = await source.load();
    expect(second.stale).toBe(true);
    expect(second.snapshot.manifest).toEqual(first.snapshot.manifest);
  });

  it('throws when offline with nothing saved', async () => {
    const { net, source } = setup({ ...initial });
    net.goOffline();
    await expect(source.load()).rejects.toThrow('Network request failed');
  });

  it('rejects data from a different schema version', async () => {
    const { source } = setup({ ...initial, 'manifest.json': { ...manifest('2026-11-02T10:00:00+00:00'), schemaVersion: 1 } });
    await expect(source.load()).rejects.toBeInstanceOf(DataError);
  });

  it('reports a missing file with its HTTP status', async () => {
    const { source } = setup({ 'manifest.json': initial['manifest.json'], 'puzzles.json': puzzlesDoc });
    await expect(source.load()).rejects.toThrow('players.aaa.json failed (HTTP 404)');
  });
});

describe('box scores on demand', () => {
  const gamesDoc = {
    schemaVersion: 2,
    season: 2026,
    gamesThrough: '2026-11-01',
    boxScoresThrough: '2026-11-01',
    keys: ['min', 'pts', 'gmsc'],
    games: [['1', '2026-11-01', 'LAL', 'MIA', 110, 100]],
    players: { '7': [[0, 0, 1, 30, 25, 20.5]] },
  };
  const withGames = { ...manifest('2026-11-02T10:00:00+00:00'), files: { ...manifest('x').files, games: 'games.aaa.json' } };

  it('downloads the games file once, then reuses the saved copy', async () => {
    const { net, source } = setup({ 'games.aaa.json': gamesDoc });
    const first = await source.games(withGames);
    expect(first?.doc.players['7'][0][4]).toBe(25);
    expect(first?.stale).toBe(false);
    await source.games(withGames);
    expect(net.calls.filter((c) => c === 'games.aaa.json')).toHaveLength(1);
  });

  it('shows the saved copy offline, and nothing when none is published', async () => {
    const { net, source } = setup({ 'games.aaa.json': gamesDoc });
    await source.games(withGames);
    net.goOffline();
    const newer = { ...withGames, files: { ...withGames.files, games: 'games.bbb.json' } };
    expect((await source.games(newer))?.stale).toBe(true);
    const fresh = setup({});
    expect(await fresh.source.games(manifest('2026-11-02T10:00:00+00:00'))).toBeNull();
  });

  it('rejects a games file without the columns the app needs', async () => {
    const { source } = setup({ 'games.aaa.json': { ...gamesDoc, keys: ['min'] } });
    await expect(source.games(withGames)).rejects.toBeInstanceOf(DataError);
  });
});

describe('box scores across seasons', () => {
  it('never shows last season’s saved box scores as this season’s', async () => {
    const lastSeason = { schemaVersion: 2, season: 2025, gamesThrough: '2026-04-12', boxScoresThrough: '2026-04-12', keys: ['min', 'pts', 'gmsc'], games: [], players: {} };
    const { net, source } = setup({ 'games.old.json': lastSeason });
    const oldManifest = { ...manifest('2026-04-13T10:00:00+00:00'), season: 2025, files: { ...manifest('x').files, games: 'games.old.json' } };
    expect((await source.games(oldManifest))?.doc.season).toBe(2025);
    net.goOffline();
    // A new season's manifest with no games file yet: nothing, not last season's.
    expect(await source.games(manifest('2026-10-21T10:00:00+00:00'))).toBeNull();
  });
});
