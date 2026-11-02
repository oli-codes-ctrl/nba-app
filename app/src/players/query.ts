import type { Player } from '@/data/types';
import { fold } from '@/lib/fold';
import { CATALOG, type StatId } from '@/stats/catalog';

export const SORT_STATS: StatId[] = [
  'game_score', 'pts', 'reb', 'ast', 'stl', 'blk', 'ts_pct', 'fg3_pct', 'mpg',
];

export type PlayerQuery = {
  search: string;
  sort: StatId;
  qualifiedOnly: boolean;
};

/**
 * Filter and sort the player list. A search looks at every player, qualified
 * or not, so anyone can be found by name.
 */
export function queryPlayers(players: readonly Player[], q: PlayerQuery): Player[] {
  const needle = fold(q.search);
  const matches = needle
    ? players.filter((p) => p.searchName.includes(needle))
    : q.qualifiedOnly
      ? players.filter((p) => p.q)
      : [...players];

  const sign = CATALOG[q.sort].lowerIsBetter ? 1 : -1;
  return matches.sort((a, b) => {
    const av = a.s[q.sort];
    const bv = b.s[q.sort];
    if (av == null && bv == null) return a.name.localeCompare(b.name);
    if (av == null) return 1;
    if (bv == null) return -1;
    return av === bv ? a.name.localeCompare(b.name) : sign * (av - bv);
  });
}
