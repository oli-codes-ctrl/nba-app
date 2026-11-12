/** Team pages: roster and leaders from the players' current teams. */
import type { Player } from '@/data/types';
import { TEAMS } from '@/theme/teams';
import { CATALOG, type StatId } from '@/stats/catalog';

export const TEAM_LEADER_STATS: readonly StatId[] = ['game_score', 'pts', 'reb', 'ast', 'stl', 'blk', 'fg3m', 'ts_pct'];

/** Current roster, most minutes first. */
export function roster(players: readonly Player[], abbr: string): Player[] {
  return players
    .filter((p) => p.team === abbr)
    .sort((a, b) => (b.s.mpg ?? 0) - (a.s.mpg ?? 0) || a.id - b.id);
}

/**
 * The team's best in a stat. Only players ranked in it count (qualified,
 * and with enough attempts for a shooting percentage), so a two-game
 * call-up can't lead in shooting.
 */
export function teamLeader(team: readonly Player[], stat: StatId): Player | null {
  const sign = CATALOG[stat].lowerIsBetter ? 1 : -1;
  const ranked = team
    .filter((p) => p.pct?.[stat] != null && p.s[stat] != null)
    .sort((a, b) => sign * ((a.s[stat] ?? 0) - (b.s[stat] ?? 0)) || a.id - b.id);
  return ranked[0] ?? null;
}

/** All 30 teams by conference, alphabetical by city. */
export function teamsByConference(players: readonly Player[]): { conf: string; teams: string[] }[] {
  const conf = new Map<string, string>();
  for (const p of players) if (p.team && p.conf && !conf.has(p.team)) conf.set(p.team, p.conf);
  const byName = (x: string, y: string) => (TEAMS[x]?.name ?? x).localeCompare(TEAMS[y]?.name ?? y);
  return ['East', 'West'].map((c) => ({
    conf: c,
    teams: Object.keys(TEAMS)
      .filter((t) => conf.get(t) === c)
      .sort(byName),
  }));
}
