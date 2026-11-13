/**
 * Team rows for the charts, built at build time so the browser gets only
 * the few numbers each chart draws.
 */
import type { LuckPoint } from '@/charts/LuckStrip';
import type { QuadTeam } from '@/charts/TeamQuadrantChart';
import type { TeamsDoc } from '@/data/types';
import { teamInfo } from '@/theme/teams';

import { luckTeams, ratedTeams } from './answers';

export function quadTeams(doc: TeamsDoc): QuadTeam[] {
  return ratedTeams(doc).map((t) => ({
    abbr: t.abbr,
    name: teamInfo(t.abbr).name,
    ortg: t.ortg,
    drtg: t.drtg,
    net: t.net,
    noise: t.net_noise ?? null,
    rank: { ortg: t.rank.ortg, drtg: t.rank.drtg, net: t.rank.net },
  }));
}

export function luckPoints(doc: TeamsDoc): LuckPoint[] {
  return luckTeams(doc).map((t) => ({
    abbr: t.abbr,
    name: teamInfo(t.abbr).name,
    luck: t.luck,
    record: t.w != null && t.l != null ? `${t.w}–${t.l}` : '–',
    expected: t.pyth_w,
    noise: t.luck_noise ?? null,
  }));
}
