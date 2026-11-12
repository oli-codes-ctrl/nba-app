/**
 * Box score analysis: one player's games, trailing averages with their
 * uncertainty, the heat check and the best single games. Pure, tested.
 */
import type { GamesDoc, GameStatKey, Player } from '@/data/types';

export type GameLog = {
  /** Position in the season's game list (date order). */
  index: number;
  id: string;
  /** US Eastern date, YYYY-MM-DD. */
  date: string;
  team: string;
  opp: string;
  home: boolean;
  starter: boolean;
  won: boolean;
  teamPts: number;
  oppPts: number;
  v: Record<GameStatKey, number>;
};

/** A player's games in date order. */
export function playerLog(doc: GamesDoc, pid: number): GameLog[] {
  const rows = doc.players[String(pid)] ?? [];
  return rows
    .map(([index, side, starter, ...values]) => {
      const [id, date, home, away, homePts, awayPts] = doc.games[index];
      const atHome = side === 0;
      const teamPts = atHome ? homePts : awayPts;
      const oppPts = atHome ? awayPts : homePts;
      const v = Object.fromEntries(doc.keys.map((k, i) => [k, values[i] ?? 0])) as Record<GameStatKey, number>;
      return {
        index,
        id,
        date,
        team: atHome ? home : away,
        opp: atHome ? away : home,
        home: atHome,
        starter: starter === 1,
        won: teamPts > oppPts,
        teamPts,
        oppPts,
        v,
      };
    })
    .sort((a, b) => a.index - b.index);
}

export const Z95 = 1.96;

export function mean(values: readonly number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}

/** Sample standard deviation (n - 1); 0 with fewer than two values. */
export function sd(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((a, v) => a + (v - m) ** 2, 0) / (values.length - 1));
}

export type TrailingPoint = { mean: number; lo: number | null; hi: number | null; n: number };

/**
 * Average over up to `window` games ending at each game, with a 95% band
 * for his true level over those games: mean +/- 1.96 s / sqrt(n), where s is
 * his game-to-game spread over the whole season (one short window would
 * understate it). No band until there are two games to measure a spread.
 */
export function trailing(values: readonly number[], window = 10): TrailingPoint[] {
  const spread = sd(values);
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    const m = mean(slice);
    const half = values.length >= 2 ? (Z95 * spread) / Math.sqrt(slice.length) : null;
    return { mean: m, lo: half == null ? null : m - half, hi: half == null ? null : m + half, n: slice.length };
  });
}

/** More players are checked at once, so the heat check needs 2.5 standard errors (about 1 in 80 by chance). */
export const HEAT_Z = 2.5;

export type Heat = {
  recent: number;
  before: number;
  z: number;
  recentGames: number;
  beforeGames: number;
};

/**
 * His last `recentGames` games against the games before them:
 * z = (mean recent - mean before) / (s sqrt(1/n1 + 1/n2)), with s his
 * spread over all his games. Null without enough games on both sides.
 */
export function heat(values: readonly number[], recentGames: number): Heat | null {
  if (recentGames < 1 || values.length < 2 * recentGames) return null;
  const recentVals = values.slice(-recentGames);
  const beforeVals = values.slice(0, -recentGames);
  const s = sd(values);
  const recent = mean(recentVals);
  const before = mean(beforeVals);
  const se = s * Math.sqrt(1 / recentVals.length + 1 / beforeVals.length);
  const z = se > 0 ? (recent - before) / se : 0;
  return { recent, before, z, recentGames: recentVals.length, beforeGames: beforeVals.length };
}

/** Five recent games once most players have ten, three before that. */
export function recentWindow(gameCounts: readonly number[]): number {
  const sorted = [...gameCounts].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0;
  return median >= 10 ? 5 : 3;
}

export type HeatRow = Heat & { player: Player };

/** Qualified players running hotter or colder than their own earlier games by more than luck. */
export function heatCheck(
  doc: GamesDoc,
  players: readonly Player[],
  stat: GameStatKey = 'gmsc',
): { hot: HeatRow[]; cold: HeatRow[]; recentGames: number; checked: number } {
  const qualified = players.filter((p) => p.q && doc.players[String(p.id)]);
  const recentGames = recentWindow(qualified.map((p) => doc.players[String(p.id)].length));
  const rows: HeatRow[] = [];
  for (const p of qualified) {
    const h = heat(
      playerLog(doc, p.id).map((g) => g.v[stat]),
      recentGames,
    );
    if (h) rows.push({ ...h, player: p });
  }
  return {
    hot: rows.filter((r) => r.z >= HEAT_Z).sort((a, b) => b.z - a.z || a.player.id - b.player.id),
    cold: rows.filter((r) => r.z <= -HEAT_Z).sort((a, b) => a.z - b.z || a.player.id - b.player.id),
    recentGames,
    checked: rows.length,
  };
}

/** The latest date with games in the file. */
export function lastGameDate(doc: GamesDoc): string | null {
  return doc.games.length ? doc.games[doc.games.length - 1][1] : null;
}

/** Best single games by a stat, on one date or across the season. */
export function bestGames(
  doc: GamesDoc,
  playerById: ReadonlyMap<number, Player>,
  n = 5,
  options: { stat?: GameStatKey; date?: string | null } = {},
): { player: Player; game: GameLog }[] {
  const stat = options.stat ?? 'gmsc';
  const out: { player: Player; game: GameLog }[] = [];
  for (const pid of Object.keys(doc.players)) {
    const player = playerById.get(Number(pid));
    if (!player) continue;
    for (const game of playerLog(doc, player.id)) {
      if (options.date && game.date !== options.date) continue;
      out.push({ player, game });
    }
  }
  return out
    .sort((a, b) => b.game.v[stat] - a.game.v[stat] || a.player.id - b.player.id || a.game.index - b.game.index)
    .slice(0, n);
}

/** "38 PTS · 9 REB · 7 AST", adding standout steals, blocks or threes. */
export function gameLine(v: Record<GameStatKey, number>): string {
  const parts = [`${v.pts} PTS`, `${v.reb} REB`, `${v.ast} AST`];
  if (v.stl >= 3) parts.push(`${v.stl} STL`);
  if (v.blk >= 3) parts.push(`${v.blk} BLK`);
  if (v.fg3m >= 5) parts.push(`${v.fg3m} 3PM`);
  return parts.join(' · ');
}
