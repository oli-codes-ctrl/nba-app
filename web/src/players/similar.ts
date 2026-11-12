/**
 * "Who's he like?": the players whose style is closest this season.
 *
 * Each qualified player becomes a vector of standardized rates (z-scores
 * against every qualified player with enough attempts), and players are
 * compared by cosine similarity. Cosine compares the shape of two profiles
 * (what each does more or less of than the league) rather than their size,
 * so a role player can match a star of the same type. The stats where both
 * sit clearly on the same side of average are the reasons for the match.
 */
import type { Player } from '@/data/types';
import { hasSample, type AttemptRules } from '@/stats/samples';
import type { StatId } from '@/stats/catalog';

/** Style more than quality: shares of team plays, shot diet and efficiency. */
export const STYLE_STATS: readonly StatId[] = [
  'usg_pct', 'ts_pct', 'fg3a_rate', 'fta_rate', 'ast_pct', 'tov_pct', 'oreb_pct', 'dreb_pct', 'stl_pct', 'blk_pct',
];

/** How each style stat reads when a player is well above or below average. */
const WORDS: Record<string, readonly [string, string]> = {
  usg_pct: ['high usage', 'low usage'],
  ts_pct: ['efficient scoring', 'below-average efficiency'],
  fg3a_rate: ['lots of threes', 'few threes'],
  fta_rate: ['gets to the line', 'rarely at the line'],
  ast_pct: ['lots of assists', 'few assists'],
  tov_pct: ['turnover-prone', 'rarely turns it over'],
  oreb_pct: ['offensive boards', 'few offensive boards'],
  dreb_pct: ['defensive boards', 'few defensive boards'],
  stl_pct: ['lots of steals', 'few steals'],
  blk_pct: ['lots of blocks', 'few blocks'],
};

/** A reason counts only when both players are at least this far from average. */
const DRIVER_Z = 0.5;
const MAX_DRIVERS = 3;

export type Driver = { stat: StatId; high: boolean; text: string };
export type Comp = { player: Player; /** Cosine similarity, -1 to 1. */ match: number; drivers: Driver[] };

/** z-scores of every comparable player (qualified, every style stat present with enough attempts). */
export function styleVectors(players: readonly Player[], rules: AttemptRules | undefined): Map<number, number[]> {
  const pool = players.filter(
    (p) => p.q && STYLE_STATS.every((s) => p.s[s] != null && hasSample(p, s, rules)),
  );
  const out = new Map<number, number[]>();
  if (pool.length < 3) return out;
  const means = STYLE_STATS.map((s) => pool.reduce((sum, p) => sum + (p.s[s] ?? 0), 0) / pool.length);
  const sds = STYLE_STATS.map((s, i) =>
    Math.sqrt(pool.reduce((sum, p) => sum + ((p.s[s] ?? 0) - means[i]) ** 2, 0) / (pool.length - 1)),
  );
  for (const p of pool) {
    out.set(
      p.id,
      STYLE_STATS.map((s, i) => (sds[i] > 0 ? ((p.s[s] ?? 0) - means[i]) / sds[i] : 0)),
    );
  }
  return out;
}

export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/** The stats that push two profiles together the most, both on the same side of average. */
export function drivers(a: readonly number[], b: readonly number[]): Driver[] {
  return STYLE_STATS.map((stat, i) => ({ stat, i, weight: a[i] * b[i] }))
    .filter(({ i }) => Math.abs(a[i]) >= DRIVER_Z && Math.abs(b[i]) >= DRIVER_Z && Math.sign(a[i]) === Math.sign(b[i]))
    .sort((x, y) => y.weight - x.weight)
    .slice(0, MAX_DRIVERS)
    .map(({ stat, i }) => {
      const high = a[i] > 0;
      return { stat, high, text: WORDS[stat][high ? 0 : 1] };
    });
}

/** The n closest styles to a player, or none if he cannot be compared yet. */
export function comps(
  player: Player,
  players: readonly Player[],
  rules: AttemptRules | undefined,
  n = 3,
  vectors: Map<number, number[]> = styleVectors(players, rules),
): Comp[] {
  const mine = vectors.get(player.id);
  if (!mine) return [];
  const byId = new Map(players.map((p) => [p.id, p]));
  const out: Comp[] = [];
  for (const [id, theirs] of vectors) {
    const other = byId.get(id);
    if (id === player.id || !other) continue;
    out.push({ player: other, match: cosine(mine, theirs), drivers: [] });
  }
  return out
    .sort((a, b) => b.match - a.match || a.player.id - b.player.id)
    .slice(0, n)
    .map((c) => ({ ...c, drivers: drivers(mine, vectors.get(c.player.id)!) }));
}
