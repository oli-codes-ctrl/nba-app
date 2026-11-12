/**
 * Build-time data. Pages are generated from the JSON the pipeline published,
 * copied into .data/ by scripts/fetch-data.mjs. Nothing here runs in the
 * browser: each page is handed only the rows it shows.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseGames, parseManifest, parsePlayers, parsePuzzles, parseTeams } from '@/data/remote';
import type { GamesDoc, Manifest, Player, PlayersDoc, PuzzlesDoc, TeamsDoc } from '@/data/types';
import { styleVectors } from '@/players/similar';

export type SiteData = {
  manifest: Manifest;
  players: PlayersDoc;
  teams: TeamsDoc;
  puzzles: PuzzlesDoc;
  /** Box scores; null when the pipeline has not published them. */
  games: GamesDoc | null;
  playerById: ReadonlyMap<number, Player>;
  /** Last date whose games are all included, YYYY-MM-DD. */
  through: string;
  /** Roughly how many games teams have played: the most any player has. */
  mostGames: number;
  /** Standardized style stats per player, for "Who's he like?". */
  vectors: Map<number, number[]>;
};

const DIR = join(process.cwd(), '.data');

function read(name: string): unknown {
  try {
    return JSON.parse(readFileSync(join(DIR, name), 'utf8'));
  } catch (error) {
    throw new Error(`Missing or unreadable .data/${name}. Run "npm run data" first. (${String(error)})`);
  }
}

let cache: SiteData | null = null;

export function loadData(): SiteData {
  if (cache) return cache;
  const manifest = parseManifest(read('manifest.json'));
  const players = parsePlayers(read('players.json'));
  const teams = parseTeams(read('teams.json'));
  const puzzles = parsePuzzles(read('puzzles.json'));
  const games = manifest.files.games ? parseGames(read('games.json')) : null;
  cache = {
    manifest,
    players,
    teams,
    puzzles,
    games,
    playerById: new Map(players.players.map((p) => [p.id, p])),
    through: manifest.gamesThrough ?? manifest.asOf,
    mostGames: Math.max(0, ...players.players.map((p) => p.s.gp ?? 0)),
    vectors: styleVectors(players.players, players.minAttempts),
  };
  return cache;
}
