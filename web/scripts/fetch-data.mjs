/**
 * Copies the published data (/v2/) into .data/ so the build reads local files.
 * Source: HOOPS_DATA_URL (an http(s) URL or a local folder holding manifest.json),
 * else the live GitHub Pages copy. `--if-missing` skips the download when a copy exists.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = process.env.HOOPS_DATA_URL || 'https://oli-codes-ctrl.github.io/nba-app/v2/';
const OUT = join(fileURLToPath(new URL('..', import.meta.url)), '.data');

async function read(name) {
  if (/^https?:/.test(SOURCE)) {
    const res = await fetch(new URL(name, SOURCE.endsWith('/') ? SOURCE : `${SOURCE}/`), { cache: 'no-store' });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    return await res.text();
  }
  return await readFile(join(SOURCE, name), 'utf8');
}

if (process.argv.includes('--if-missing') && existsSync(join(OUT, 'manifest.json'))) {
  process.exit(0);
}

const manifestText = await read('manifest.json');
const manifest = JSON.parse(manifestText);
const files = { players: manifest.files.players, teams: manifest.files.teams, puzzles: manifest.files.puzzles };
if (manifest.files.games) files.games = manifest.files.games;

// Fetch everything before writing anything, so a failed download keeps the last good copy.
const bodies = {};
for (const [key, name] of Object.entries(files)) bodies[key] = await read(name);

await mkdir(OUT, { recursive: true });
for (const [key, body] of Object.entries(bodies)) await writeFile(join(OUT, `${key}.json`), body);
await writeFile(join(OUT, 'manifest.json'), manifestText);
console.log(`data: games through ${manifest.gamesThrough ?? manifest.asOf}, ${manifest.playerCount} players`);
