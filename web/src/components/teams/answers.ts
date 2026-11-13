/**
 * The answers above the team charts, in words. Ported from the app's
 * TeamCharts (RatingsCard, LuckCard) without changing what they claim:
 * a team is better or worse than average, or lucky, only when it clears
 * the noise the pipeline publishes.
 */
import type { TeamSeason, TeamsDoc } from '@/data/types';
import { median } from '@/graphs/analysis';
import { ordinal } from '@/lib/format';
import { luckVerdict, netVerdict } from '@/teams/analysis';
import { teamInfo } from '@/theme/teams';

/** Signed to one decimal with a real minus: "+2.1", "−3.4". */
export function signed(v: number): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
}

export type RatedTeam = TeamSeason & { ortg: number; drtg: number; net: number };
export type LuckTeam = TeamSeason & { luck: number };

export function ratedTeams(doc: TeamsDoc): RatedTeam[] {
  return doc.teams.filter((t): t is RatedTeam => t.ortg != null && t.drtg != null && t.net != null);
}

export function luckTeams(doc: TeamsDoc): LuckTeam[] {
  return doc.teams.filter((t): t is LuckTeam => t.luck != null);
}

/** The usual net-rating noise across teams, and the typical games played. */
export function netNoise(teams: readonly RatedTeam[]): { noise: number | null; games: number } {
  const noises = teams.map((t) => t.net_noise).filter((v): v is number => v != null);
  return { noise: noises.length ? median(noises) : null, games: Math.round(median(teams.map((t) => t.gp))) };
}

export function luckNoise(teams: readonly LuckTeam[]): { noise: number | null; games: number } {
  const noises = teams.map((t) => t.luck_noise).filter((v): v is number => v != null);
  return { noise: noises.length ? median(noises) : null, games: Math.round(median(teams.map((t) => t.gp))) };
}

/** "Who's actually good?" for the league, or "Is X for real?" for one team. */
export function ratingsAnswer(teams: readonly RatedTeam[], focus?: RatedTeam): string {
  if (focus) {
    const name = teamInfo(focus.abbr).name;
    const v = netVerdict(focus);
    const range = focus.net_noise != null ? ` (±${focus.net_noise.toFixed(1)} after ${focus.gp} games)` : '';
    return v === 'above'
      ? `Yes: ${name} outscores opponents by ${focus.net.toFixed(1)} per 100 possessions${range}. Even allowing for luck, that beats an average team.`
      : v === 'below'
        ? `Not yet: ${name} is outscored by ${Math.abs(focus.net).toFixed(1)} per 100 possessions${range}. Even allowing for luck, that trails an average team.`
        : v === 'unclear'
          ? `Too early to tell: after ${focus.gp} games, ${name}’s ${signed(focus.net)} net rating could be off by ±${(focus.net_noise ?? 0).toFixed(1)}, so ${name} could still be an average team.`
          : // Older data has no noise estimate: state the number, claim nothing.
            `${name} ${focus.net >= 0 ? 'outscores opponents by' : 'is outscored by'} ${Math.abs(focus.net).toFixed(1)} per 100 possessions${focus.rank.net ? ` (${ordinal(focus.rank.net)} of ${teams.length})` : ''}.`;
  }
  const best = [...teams].sort((a, b) => b.net - a.net)[0];
  const { noise, games } = netNoise(teams);
  return (
    `${teamInfo(best.abbr).name} leads at ${signed(best.net)} per 100 possessions.` +
    (noise != null
      ? ` After about ${games} games a net rating is only accurate to ±${noise.toFixed(1)}, so teams closer than that could be equally good.`
      : '')
  );
}

/** "Who's been lucky?" for the league, or "Lucky or good?" for one team. */
export function luckAnswer(teams: readonly LuckTeam[], noise: number, focus?: LuckTeam): string {
  if (focus) {
    const name = teamInfo(focus.abbr).name;
    const v = luckVerdict(focus);
    const expected = focus.pyth_w ?? 0;
    const record = focus.w != null && focus.l != null ? `${focus.w}–${focus.l}` : '';
    const band = focus.luck_noise != null ? focus.luck_noise.toFixed(1) : noise.toFixed(1);
    return v === 'above'
      ? `Lucky so far: ${name} is ${record}, ${focus.luck.toFixed(1)} wins better than its point differential predicts (${expected.toFixed(1)} wins). That’s more than normal luck (±${band}), so expect the record to drift back.`
      : v === 'below'
        ? `Unlucky so far: ${name} is ${record}, ${Math.abs(focus.luck).toFixed(1)} wins worse than its point differential predicts (${expected.toFixed(1)} wins). That’s more than normal luck (±${band}), so expect better results.`
        : `${name}’s ${record} record matches its point differential (${expected.toFixed(1)} expected wins, ${signed(focus.luck)}): within normal luck of ±${band}.`;
  }
  const outside = teams.filter((t) => luckVerdict(t) !== 'unclear').sort((a, b) => Math.abs(b.luck) - Math.abs(a.luck));
  const names = (ts: readonly LuckTeam[]) =>
    ts
      .slice(0, 3)
      .map((t) => `${teamInfo(t.abbr).name} (${signed(t.luck)})`)
      .join(', ');
  const lucky = outside.filter((t) => t.luck > 0);
  const unlucky = outside.filter((t) => t.luck < 0);
  return outside.length
    ? [lucky.length ? `Luckier than normal: ${names(lucky)}.` : '', unlucky.length ? `Unluckier than normal: ${names(unlucky)}.` : '']
        .filter(Boolean)
        .join(' ')
    : `No team is outside normal luck yet: every record is within about ${noise.toFixed(1)} wins of what its point differential predicts.`;
}
