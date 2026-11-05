/**
 * Statistics behind the scatter playground. Pure functions, tested.
 *
 * - Medians split the chart into quadrants (half the players on each side).
 * - Relationships use Spearman's rank correlation: it measures whether one
 *   stat tends to rise with the other without assuming a straight line, and
 *   one outlier can't manufacture it. It is described in words only when
 *   it clears the 95% threshold for that many players.
 * - Dots with under half the typical playing time are flagged as thin
 *   samples rather than hidden.
 */
import type { StatId } from '@/stats/catalog';

import type { ChartPoint } from './math';
import type { Quadrants } from './presets';

export function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Average ranks (1-based), ties sharing the mean of their positions. */
export function ranks(values: readonly number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k][1]] = avg;
    i = j + 1;
  }
  return out;
}

export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 3) return NaN;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
}

export function spearman(xs: readonly number[], ys: readonly number[]): number {
  return pearson(ranks(xs), ranks(ys));
}

/** Smallest |rho| that is unlikely (under 5%) to arise by chance with n players. */
export function significanceThreshold(n: number): number {
  return n > 3 ? 1.96 / Math.sqrt(n - 1) : 1;
}

export type Relationship = { rho: number; n: number; reliable: boolean; text: string };

const STRENGTH: readonly [number, string][] = [
  [0.7, 'a very strong'],
  [0.5, 'a strong'],
  [0.3, 'a moderate'],
  [0, 'a weak'],
];

/** "A moderate link: higher usage goes with lower true shooting (ρ = −0.32, 236 players)." */
export function describeRelationship(points: readonly ChartPoint[], xLabel: string, yLabel: string): Relationship {
  const n = points.length;
  const rho = spearman(
    points.map((p) => p.x),
    points.map((p) => p.y),
  );
  const shown = Number.isFinite(rho) ? rho.toFixed(2).replace('-', '−') : '–';
  const reliable = Number.isFinite(rho) && Math.abs(rho) >= significanceThreshold(n);
  if (!reliable) {
    return {
      rho,
      n,
      reliable,
      text: `No reliable link between ${xLabel} and ${yLabel} among these ${n} players (ρ = ${shown}); a pattern this weak could be chance.`,
    };
  }
  const strength = STRENGTH.find(([min]) => Math.abs(rho) >= min)![1];
  const direction = rho > 0 ? 'higher' : 'lower';
  return {
    rho,
    n,
    reliable,
    text: `${strength[0].toUpperCase()}${strength.slice(1)} link: higher ${xLabel} goes with ${direction} ${yLabel} (ρ = ${shown}, ${n} players).`,
  };
}

export type QuadrantKey = keyof Quadrants;

/** Which quadrant a point falls in. Ties with a median count as the higher side. */
export function quadrantOf(p: ChartPoint, mx: number, my: number, invertY = false): QuadrantKey {
  const right = p.x >= mx;
  const up = invertY ? p.y <= my : p.y >= my;
  return up ? (right ? 'topRight' : 'topLeft') : right ? 'bottomRight' : 'bottomLeft';
}

export function quadrantCounts(
  points: readonly ChartPoint[],
  mx: number,
  my: number,
  invertY = false,
): Record<QuadrantKey, number> {
  const counts: Record<QuadrantKey, number> = { topRight: 0, topLeft: 0, bottomLeft: 0, bottomRight: 0 };
  for (const p of points) counts[quadrantOf(p, mx, my, invertY)]++;
  return counts;
}

/** Ids of dots with under half the median playing time: drawn hollow as thin samples. */
export function thinSamples(points: readonly ChartPoint[]): Set<number> {
  const minutes = points.flatMap((p) => (p.minutes == null ? [] : [p.minutes]));
  if (minutes.length === 0) return new Set();
  const cut = median(minutes) / 2;
  return new Set(points.filter((p) => p.minutes != null && p.minutes < cut).map((p) => p.id));
}

/** Median absolute deviation scaled to match a standard deviation; 1 when it is zero. */
function robustScale(values: readonly number[], center: number): number {
  const mad = median(values.map((v) => Math.abs(v - center))) * 1.4826;
  return mad > 0 ? mad : 1;
}

/**
 * The most extreme player in each quadrant, to label as its example: the
 * one furthest from both medians in that quadrant's direction, in robust
 * standard units. Thin samples are never chosen.
 */
export function quadrantExemplars(
  points: readonly ChartPoint[],
  mx: number,
  my: number,
  invertY: boolean,
  skip: ReadonlySet<number>,
): number[] {
  const sx = robustScale(
    points.map((p) => p.x),
    mx,
  );
  const sy = robustScale(
    points.map((p) => p.y),
    my,
  );
  const best = new Map<QuadrantKey, { id: number; score: number }>();
  for (const p of points) {
    if (skip.has(p.id)) continue;
    const q = quadrantOf(p, mx, my, invertY);
    const score = Math.abs(p.x - mx) / sx + Math.abs(p.y - my) / sy;
    const current = best.get(q);
    if (!current || score > current.score) best.set(q, { id: p.id, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).map((b) => b.id);
}

/**
 * Up to `k` example players per quadrant, most extreme first, tagged with
 * their quadrant. The chart names the first one in each quadrant whose
 * label fits without covering anyone.
 */
export function quadrantCandidates(
  points: readonly ChartPoint[],
  mx: number,
  my: number,
  invertY: boolean,
  skip: ReadonlySet<number>,
  k = 4,
): { id: number; quadrant: QuadrantKey }[] {
  const sx = robustScale(
    points.map((p) => p.x),
    mx,
  );
  const sy = robustScale(
    points.map((p) => p.y),
    my,
  );
  const byQuadrant = new Map<QuadrantKey, { id: number; score: number }[]>();
  for (const p of points) {
    if (skip.has(p.id)) continue;
    const q = quadrantOf(p, mx, my, invertY);
    const score = Math.abs(p.x - mx) / sx + Math.abs(p.y - my) / sy;
    byQuadrant.set(q, [...(byQuadrant.get(q) ?? []), { id: p.id, score }]);
  }
  const lists = [...byQuadrant.entries()].map(([quadrant, list]) => ({
    quadrant,
    list: list.sort((a, b) => b.score - a.score || a.id - b.id).slice(0, k),
  }));
  // Round-robin by rank, the strongest quadrant first within each round.
  lists.sort((a, b) => (b.list[0]?.score ?? 0) - (a.list[0]?.score ?? 0));
  const out: { id: number; quadrant: QuadrantKey }[] = [];
  for (let r = 0; r < k; r++) {
    for (const { quadrant, list } of lists) if (list[r]) out.push({ id: list[r].id, quadrant });
  }
  return out;
}

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

/** "Nikola Jokić" -> "N. Jokić"; "Jaren Jackson Jr." -> "J. Jackson". */
export function shortName(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !SUFFIXES.has(w.replace(/\./g, '').toLowerCase()));
  if (words.length < 2) return name;
  return `${words[0][0]}. ${words[words.length - 1]}`;
}

/** The counts each stat is built from (coarse). Minutes are left out: nearly every rate uses them. */
const INPUTS: Partial<Record<StatId, readonly string[]>> = {
  // Points are made shots: 2 per field goal, 1 more per three, 1 per free throw.
  pts: ['pts', 'fgm', 'fg3m', 'ftm'],
  fg_pct: ['fgm', 'fga'],
  fg2_pct: ['fgm', 'fga', 'fg3m', 'fg3a'],
  fg3_pct: ['fg3m', 'fg3a'],
  ft_pct: ['ftm', 'fta'],
  efg_pct: ['fgm', 'fg3m', 'fga'],
  ts_pct: ['pts', 'fga', 'fta'],
  fg3a_rate: ['fg3a', 'fga'],
  fta_rate: ['fta', 'fga'],
  usg_pct: ['fga', 'fta', 'tov'],
  ast_pct: ['ast', 'fgm'],
  tov_pct: ['tov', 'fga', 'fta'],
  oreb_pct: ['oreb'],
  dreb_pct: ['dreb'],
  reb_pct: ['reb', 'oreb', 'dreb'],
  oreb: ['oreb'],
  dreb: ['dreb'],
  reb: ['reb', 'oreb', 'dreb'],
  stl_pct: ['stl'],
  blk_pct: ['blk'],
  game_score: ['pts', 'fgm', 'fga', 'ftm', 'fta', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'pf', 'tov'],
};

/** The base count behind a per-game, per-36 or per-100 stat: pts36 -> pts. */
function baseCount(stat: StatId): string {
  return stat.replace(/(36|100)$/, '');
}

function inputsOf(stat: StatId): readonly string[] {
  const base = baseCount(stat);
  return INPUTS[stat] ?? INPUTS[base as StatId] ?? [base];
}

/**
 * Counts two stats are both built from. When they share some, part of any
 * pattern between them is built in (FGM against points, or a stat against
 * its own per-36 version), so the custom chart warns.
 */
export function sharedInputs(a: StatId, b: StatId): string[] {
  // The same stat, scaled differently (points vs. points per 36).
  if (baseCount(a) === baseCount(b)) return [baseCount(a)];
  const other = new Set(inputsOf(b));
  return [...new Set(inputsOf(a))].filter((c) => other.has(c));
}
