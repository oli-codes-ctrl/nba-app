/** Head-to-head: two players stat by stat. */
import type { Player } from '@/data/types';
import { CATALOG, type StatId } from '@/stats/catalog';
import { hasSample, type AttemptRules } from '@/stats/samples';

/** Stats where more (or fewer, for turnovers) is plainly better. Usage is a role, not a win. */
export const VERSUS_STATS: readonly StatId[] = [
  'game_score',
  'pts', 'reb', 'ast', 'stl', 'blk', 'tov',
  'fg3m', 'fg_pct', 'fg3_pct', 'ft_pct', 'ts_pct',
  'ast_pct', 'reb_pct',
  'pts100', 'ast100',
];

export type Side = 'a' | 'b';
export type VersusRow = {
  stat: StatId;
  a: number | null;
  b: number | null;
  winner: Side | 'tie' | null;
  /** A shooting percentage where either player has too few attempts: shown, not scored. */
  smallSample: boolean;
  /**
   * Whether the winner's edge holds allowing for luck: true when the two
   * long-run estimates differ by 1.96 combined standard errors or more in
   * the winner's favor, false when too close to call, null without ranges.
   */
  clear: boolean | null;
};

const Z95 = 1.96;

/**
 * Two players' 95% ranges compared as independent estimates: centers
 * (the long-run estimates, sample-adjusted where published) and standard
 * errors from the half-widths. Signed so positive favors a.
 */
export function edgeZ(ra: readonly [number, number], rb: readonly [number, number], lowerIsBetter = false): number {
  const mid = (r: readonly [number, number]) => (r[0] + r[1]) / 2;
  const se = Math.hypot((ra[1] - ra[0]) / (2 * Z95), (rb[1] - rb[0]) / (2 * Z95));
  const d = (lowerIsBetter ? -1 : 1) * (mid(ra) - mid(rb));
  if (se === 0) return d === 0 ? 0 : Math.sign(d) * Infinity;
  return d / se;
}

export function versusRows(a: Player, b: Player, rules?: AttemptRules): VersusRow[] {
  return VERSUS_STATS.map((stat) => {
    const va = a.s[stat] ?? null;
    const vb = b.s[stat] ?? null;
    const smallSample = !hasSample(a, stat, rules) || !hasSample(b, stat, rules);
    let winner: VersusRow['winner'] = null;
    if (va != null && vb != null && !smallSample) {
      const sign = CATALOG[stat].lowerIsBetter ? -1 : 1;
      const d = sign * (va - vb);
      winner = Math.abs(d) < 1e-9 ? 'tie' : d > 0 ? 'a' : 'b';
    }
    const ra = a.ci?.[stat];
    const rb = b.ci?.[stat];
    let clear: boolean | null = null;
    if ((winner === 'a' || winner === 'b') && ra && rb) {
      const z = edgeZ(ra, rb, CATALOG[stat].lowerIsBetter);
      clear = winner === 'a' ? z >= Z95 : z <= -Z95;
    }
    return { stat, a: va, b: vb, winner, smallSample, clear };
  });
}

export function tally(rows: readonly VersusRow[]): { a: number; b: number } {
  return {
    a: rows.filter((r) => r.winner === 'a').length,
    b: rows.filter((r) => r.winner === 'b').length,
  };
}

/** Edges that hold allowing for luck, and how many stats were tested and too close. */
export function clearTally(rows: readonly VersusRow[]): { a: number; b: number; close: number } {
  return {
    a: rows.filter((r) => r.winner === 'a' && r.clear === true).length,
    b: rows.filter((r) => r.winner === 'b' && r.clear === true).length,
    close: rows.filter((r) => r.clear === false).length,
  };
}

export function versusShareText(a: Player, b: Player, rows: readonly VersusRow[]): string {
  const t = tally(rows);
  const c = clearTally(rows);
  return (
    `Head to head: ${a.name} ${t.a}–${t.b} ${b.name} across ${rows.length} stats` +
    `; clear edges allowing for luck ${c.a}–${c.b} (Hoops Analytics)`
  );
}
