import type { Player } from '@/data/types';
import { fold } from '@/lib/fold';
import { CATALOG, type StatId } from '@/stats/catalog';
import { hasSample, type AttemptRules } from '@/stats/samples';
import { positionGroup, type PositionGroup } from '@/stats/views';

export const SORT_STATS: StatId[] = [
  'game_score', 'pts', 'reb', 'ast', 'stl', 'blk', 'ts_pct', 'fg3_pct', 'mpg',
];

export type PlayerQuery = {
  search: string;
  sort: StatId;
  qualifiedOnly: boolean;
  /** Attempt minimums: a shooting percentage only ranks with enough attempts. */
  rules?: AttemptRules;
  /** Only players at this position when browsing (a search covers everyone). */
  position?: PositionGroup | null;
};

/**
 * Filter and sort the player list. A search looks at every player, qualified
 * or not, so anyone can be found by name.
 *
 * Sorted by a shooting percentage, the qualified list is a true ranking: it
 * holds only players with enough attempts. When everyone is shown (filter
 * off, or a search), players without enough attempts sort after everyone
 * who has them, so a 1-for-1 shooter never heads the list.
 */
export function queryPlayers(players: readonly Player[], q: PlayerQuery): Player[] {
  const needle = fold(q.search);
  const enough = (p: Player) => hasSample(p, q.sort, q.rules);
  const atPosition = (p: Player) => !q.position || positionGroup(p.pos) === q.position;
  const matches = needle
    ? players.filter((p) => p.searchName.includes(needle))
    : players.filter((p) => atPosition(p) && (!q.qualifiedOnly || (p.q && enough(p))));

  const sign = CATALOG[q.sort].lowerIsBetter ? 1 : -1;
  return matches.sort((a, b) => {
    const ea = enough(a);
    if (ea !== enough(b)) return ea ? -1 : 1;
    const av = a.s[q.sort];
    const bv = b.s[q.sort];
    if (av == null && bv == null) return a.name.localeCompare(b.name);
    if (av == null) return 1;
    if (bv == null) return -1;
    return av === bv ? a.name.localeCompare(b.name) : sign * (av - bv);
  });
}
