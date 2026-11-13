/**
 * One stat's page data, packed small: every player's value for this stat
 * with its published percentile, rank, range and attempt count. Every player
 * is included (not just the ranked pool), so a link that marks an
 * unqualified player can still say why he isn't ranked.
 */
import type { Player } from '@/data/types';
import type { StatId } from '@/stats/catalog';
import type { AttemptRules } from '@/stats/samples';

/** [id, name, searchName, team, position, qualified, value, pct, rank, pctPos, rankPos, ciLow, ciHigh, adj, attempts] */
export type PackedStatRow = (string | number | null)[];

export type StatRow = {
  id: number;
  name: string;
  searchName: string;
  team: string;
  pos: string;
  q: boolean;
  value: number | null;
  pct: number | null;
  rank: number | null;
  pctPos: number | null;
  rankPos: number | null;
  ci: [number, number] | null;
  adj: number | null;
  /** Attempts behind this stat, when it has an attempt rule. */
  attempts: number | null;
};

export function packStatRow(p: Player, stat: StatId, rules: AttemptRules | undefined): PackedStatRow {
  const rule = rules?.[stat];
  const ci = p.ci?.[stat];
  return [
    p.id,
    p.name,
    p.searchName,
    p.team,
    p.pos,
    p.q ? 1 : 0,
    p.s[stat] ?? null,
    p.pct?.[stat] ?? null,
    p.rank?.[stat] ?? null,
    p.pctPos?.[stat] ?? null,
    p.rankPos?.[stat] ?? null,
    ci?.[0] ?? null,
    ci?.[1] ?? null,
    p.adj?.[stat] ?? null,
    rule && p.att ? p.att[rule.by] : null,
  ];
}

export function unpackStatRow(r: PackedStatRow): StatRow {
  const n = (i: number) => r[i] as number | null;
  return {
    id: r[0] as number,
    name: r[1] as string,
    searchName: r[2] as string,
    team: r[3] as string,
    pos: r[4] as string,
    q: r[5] === 1,
    value: n(6),
    pct: n(7),
    rank: n(8),
    pctPos: n(9),
    rankPos: n(10),
    ci: r[11] != null && r[12] != null ? [r[11] as number, r[12] as number] : null,
    adj: n(13),
    attempts: n(14),
  };
}
