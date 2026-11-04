/** Head-to-head: two players stat by stat. */
import type { Player } from '@/data/types';
import { CATALOG, type StatId } from '@/stats/catalog';

export const VERSUS_STATS: readonly StatId[] = [
  'game_score', 'off_score', 'def_score',
  'pts', 'reb', 'ast', 'stl', 'blk', 'tov',
  'fg3m', 'fg_pct', 'fg3_pct', 'ft_pct', 'ts_pct',
  'pts36', 'ast36',
];

export type Side = 'a' | 'b';
export type VersusRow = { stat: StatId; a: number | null; b: number | null; winner: Side | 'tie' | null };

export function versusRows(a: Player, b: Player): VersusRow[] {
  return VERSUS_STATS.map((stat) => {
    const va = a.s[stat] ?? null;
    const vb = b.s[stat] ?? null;
    let winner: VersusRow['winner'] = null;
    if (va != null && vb != null) {
      const sign = CATALOG[stat].lowerIsBetter ? -1 : 1;
      const d = sign * (va - vb);
      winner = Math.abs(d) < 1e-9 ? 'tie' : d > 0 ? 'a' : 'b';
    }
    return { stat, a: va, b: vb, winner };
  });
}

export function tally(rows: readonly VersusRow[]): { a: number; b: number } {
  return {
    a: rows.filter((r) => r.winner === 'a').length,
    b: rows.filter((r) => r.winner === 'b').length,
  };
}

export function versusShareText(a: Player, b: Player, rows: readonly VersusRow[]): string {
  const t = tally(rows);
  return `Head to head: ${a.name} ${t.a}–${t.b} ${b.name} across ${rows.length} stats (Hoops Analytics)`;
}
