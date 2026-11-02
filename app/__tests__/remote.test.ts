import type { FetchFn, KeyValueStore } from '@/data/DataSource';
import { CACHE_KEY, createRemoteDataSource, DataError } from '@/data/remote';

const BASE = 'https://example.test/v1/';

function manifest(generatedAt: string, playersFile = 'players.aaa.json') {
  return {
    schemaVersion: 1,
    season: 2026,
    generatedAt,
    asOf: generatedAt.slice(0, 10),
    source: 'ESPN',
    playerCount: 1,
    qualifiedCount: 1,
    files: { players: playersFile, puzzles: 'puzzles.json' },
  };
}

const playersDoc = { schemaVersion: 1, season: 2026, poolSize: {}, lowerIsBetter: ['pf', 'tov'], players: [] };
const puzzlesDoc = { schemaVersion: 1, puzzles: [] };

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
  let offline = false;
  const fn: FetchFn = async (url) => {
    calls.push(url.replace(BASE, ''));
    if (offline) throw new TypeError('Network request failed');
    const body = files[url.replace(BASE, '')];
    return { ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body };
  };
  return {
    fn,
    calls,
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
  };

  it('downloads all files on first launch and saves them', async () => {
    const { net, store, source } = setup({ ...initial });
    const { snapshot, stale } = await source.load();
    expect(stale).toBe(false);
    expect(net.calls.sort()).toEqual(['manifest.json', 'players.aaa.json', 'puzzles.json']);
    expect(snapshot.manifest.asOf).toBe('2026-11-02');
    expect(store.data.has(CACHE_KEY)).toBe(true);
    expect(await source.cached()).toEqual(snapshot);
  });

  it('only fetches the manifest when nothing changed', async () => {
    const { net, source } = setup({ ...initial });
    await source.load();
    net.calls.length = 0;
    await source.load();
    expect(net.calls).toEqual(['manifest.json']);
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
    const { source } = setup({ ...initial, 'manifest.json': { ...manifest('2026-11-02T10:00:00+00:00'), schemaVersion: 2 } });
    await expect(source.load()).rejects.toBeInstanceOf(DataError);
  });

  it('reports a missing file with its HTTP status', async () => {
    const { source } = setup({ 'manifest.json': initial['manifest.json'], 'puzzles.json': puzzlesDoc });
    await expect(source.load()).rejects.toThrow('players.aaa.json failed (HTTP 404)');
  });
});
