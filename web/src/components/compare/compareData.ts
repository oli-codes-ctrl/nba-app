/**
 * The compare page's data, packed small for the browser. The two players
 * come from the URL, so the page fetches this file once and rebuilds just
 * the parts of each player that the head-to-head (`players/versus.ts`) and
 * the style match (`players/similar.ts`) read. Both run unchanged on it.
 */
import type { Attempts, Player, StatLine } from '@/data/types';
import { STYLE_STATS } from '@/players/similar';
import { VERSUS_STATS } from '@/players/versus';
import type { StatId } from '@/stats/catalog';
import type { AttemptRules } from '@/stats/samples';

/** Every stat value the page reads, in packing order. */
export const VALUE_STATS: readonly StatId[] = [...new Set<StatId>(['gp', 'mpg', ...VERSUS_STATS, ...STYLE_STATS])];

/** [id, name, searchName, team, position, qualified, FGA, 2PA, 3PA, FTA, ...VALUE_STATS, ...(pct, low, high) per VERSUS_STATS] */
export type PackedComparePlayer = (string | number | null)[];

export type CompareData = {
  /** Packing orders, so a stale file can be detected rather than misread. */
  values: StatId[];
  ranked: StatId[];
  rules: AttemptRules;
  /** Best first: qualified, then Game Score. */
  players: PackedComparePlayer[];
};

const HEAD = 10;

export function packComparePlayer(p: Player): PackedComparePlayer {
  return [
    p.id,
    p.name,
    p.searchName,
    p.team,
    p.pos,
    p.q ? 1 : 0,
    p.att?.fga ?? null,
    p.att?.fg2a ?? null,
    p.att?.fg3a ?? null,
    p.att?.fta ?? null,
    ...VALUE_STATS.map((id) => p.s[id] ?? null),
    ...VERSUS_STATS.flatMap((id) => [p.pct?.[id] ?? null, p.ci?.[id]?.[0] ?? null, p.ci?.[id]?.[1] ?? null]),
  ];
}

export function unpackComparePlayer(row: PackedComparePlayer): Player {
  const s: Partial<Record<StatId, number | null>> = {};
  VALUE_STATS.forEach((id, i) => {
    s[id] = row[HEAD + i] as number | null;
  });
  const pct: Partial<Record<StatId, number>> = {};
  const ci: Partial<Record<StatId, [number, number]>> = {};
  const base = HEAD + VALUE_STATS.length;
  VERSUS_STATS.forEach((id, i) => {
    const [p, lo, hi] = [row[base + 3 * i], row[base + 3 * i + 1], row[base + 3 * i + 2]] as (number | null)[];
    if (p != null) pct[id] = p;
    if (lo != null && hi != null) ci[id] = [lo, hi];
  });
  const att: Attempts | undefined =
    row[6] == null ? undefined : { fga: row[6] as number, fg2a: row[7] as number, fg3a: row[8] as number, fta: row[9] as number };
  return {
    id: row[0] as number,
    name: row[1] as string,
    searchName: row[2] as string,
    team: row[3] as string,
    teams: [row[3] as string],
    conf: '',
    pos: row[4] as string,
    q: row[5] === 1,
    s: s as StatLine,
    att,
    pct,
    ci,
  };
}

/** True when the file was packed in the order this build expects. */
export function matchesLayout(data: CompareData): boolean {
  return (
    data.values.length === VALUE_STATS.length &&
    data.values.every((id, i) => id === VALUE_STATS[i]) &&
    data.ranked.length === VERSUS_STATS.length &&
    data.ranked.every((id, i) => id === VERSUS_STATS[i])
  );
}
