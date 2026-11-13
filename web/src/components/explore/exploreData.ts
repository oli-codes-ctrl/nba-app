/**
 * The scatter playground's data, packed small for the browser. Any stat can
 * go on either axis, so every qualified player carries every stat value,
 * plus the published percentile of each ranked stat (for the player panel
 * and the "color by a stat" scale). Unqualified players are never plotted
 * (`buildPoints` skips them), so they are left out.
 */
import type { Attempts, Player, StatLine } from '@/data/types';
import { CATALOG, STAT_IDS, type StatId } from '@/stats/catalog';

/** Stats with a published percentile, in packing order. */
export const RANKED_STATS: readonly StatId[] = STAT_IDS.filter((id) => CATALOG[id].ranked);

/** [id, name, searchName, team, position, FGA, 2PA, 3PA, FTA, ...STAT_IDS values, ...RANKED_STATS percentiles] */
export type PackedExplorePlayer = (string | number | null)[];

const HEAD = 9;

export function packExplorePlayer(p: Player): PackedExplorePlayer {
  return [
    p.id,
    p.name,
    p.searchName,
    p.team,
    p.pos,
    p.att?.fga ?? null,
    p.att?.fg2a ?? null,
    p.att?.fg3a ?? null,
    p.att?.fta ?? null,
    ...STAT_IDS.map((id) => p.s[id] ?? null),
    ...RANKED_STATS.map((id) => p.pct?.[id] ?? null),
  ];
}

/** Rebuilds the parts of a qualified player the scatter helpers and the player panel read. */
export function unpackExplorePlayer(row: PackedExplorePlayer): Player {
  const s: Partial<Record<StatId, number | null>> = {};
  STAT_IDS.forEach((id, i) => {
    s[id] = row[HEAD + i] as number | null;
  });
  const pct: Partial<Record<StatId, number>> = {};
  const base = HEAD + STAT_IDS.length;
  RANKED_STATS.forEach((id, i) => {
    const v = row[base + i] as number | null;
    if (v != null) pct[id] = v;
  });
  const att: Attempts | undefined =
    row[5] == null ? undefined : { fga: row[5] as number, fg2a: row[6] as number, fg3a: row[7] as number, fta: row[8] as number };
  return {
    id: row[0] as number,
    name: row[1] as string,
    searchName: row[2] as string,
    team: row[3] as string,
    teams: [row[3] as string],
    conf: '',
    pos: row[4] as string,
    q: true,
    s: s as StatLine,
    att,
    pct,
  };
}
