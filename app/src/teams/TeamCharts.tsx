import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import type { TeamSeason, TeamsDoc } from '@/data/types';
import { LuckStrip } from '@/graphs/LuckStrip';
import { median } from '@/graphs/analysis';
import { TeamQuadrantChart } from '@/graphs/TeamQuadrantChart';
import { formatDate, ordinal } from '@/lib/format';
import { teamInfo } from '@/theme/teams';
import { spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

import { luckVerdict, netVerdict } from './analysis';

/** Signed to one decimal with a real minus: "+2.1", "−3.4". */
export function signed(v: number): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
}

function rated(doc: TeamsDoc): (TeamSeason & { ortg: number; drtg: number; net: number })[] {
  return doc.teams.filter(
    (t): t is TeamSeason & { ortg: number; drtg: number; net: number } => t.ortg != null && t.drtg != null && t.net != null,
  );
}

type CardProps = { doc: TeamsDoc; highlight?: string | null; onSelect?: (abbr: string) => void };

/** "Who's actually good?" Offense against defense, with what luck could still change. */
export function RatingsCard({ doc, highlight = null, onSelect }: CardProps) {
  const colors = useColors();
  const teams = rated(doc);
  const league = doc.league.ortg;
  if (teams.length < 5 || league == null) return null;
  const noises = teams.map((t) => t.net_noise).filter((v): v is number => v != null);
  const noise = noises.length ? median(noises) : null;
  const games = Math.round(median(teams.map((t) => t.gp)));
  const best = [...teams].sort((a, b) => b.net - a.net)[0];
  const focus = highlight ? teams.find((t) => t.abbr === highlight) : undefined;

  let answer: string;
  if (focus) {
    const name = teamInfo(focus.abbr).name;
    const v = netVerdict(focus);
    const range = focus.net_noise != null ? ` (±${focus.net_noise.toFixed(1)} after ${focus.gp} games)` : '';
    answer =
      v === 'above'
        ? `Yes: ${name} outscores opponents by ${focus.net.toFixed(1)} per 100 possessions${range}. Even allowing for luck, that beats an average team.`
        : v === 'below'
          ? `Not yet: ${name} is outscored by ${Math.abs(focus.net).toFixed(1)} per 100 possessions${range}. Even allowing for luck, that trails an average team.`
          : v === 'unclear'
            ? `Too early to tell: after ${focus.gp} games, ${name}’s ${signed(focus.net)} net rating could be off by ±${(focus.net_noise ?? 0).toFixed(1)}, so ${name} could still be an average team.`
            : // Older data has no noise estimate: state the number, claim nothing.
              `${name} ${focus.net >= 0 ? 'outscores opponents by' : 'is outscored by'} ${Math.abs(focus.net).toFixed(1)} per 100 possessions${focus.rank.net ? ` (${ordinal(focus.rank.net)} of ${teams.length})` : ''}.`;
  } else {
    answer =
      `${teamInfo(best.abbr).name} leads at ${signed(best.net)} per 100 possessions.` +
      (noise != null
        ? ` After about ${games} games a net rating is only accurate to ±${noise.toFixed(1)}, so teams closer than that could be equally good.`
        : '');
  }

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <AppText variant="title">{focus ? `Is ${teamInfo(focus.abbr).name} for real?` : 'Who’s actually good?'}</AppText>
        <AppText variant="caption" color="textSecondary">
          {teams.length} teams · points per 100 possessions · games through {formatDate(doc.gamesThrough)}
        </AppText>
      </View>
      <AppText variant="bodyStrong" style={styles.pad}>
        {answer}
      </AppText>
      <TeamQuadrantChart
        teams={teams.map((t) => ({ abbr: t.abbr, ortg: t.ortg, drtg: t.drtg }))}
        league={league}
        highlight={highlight}
        surface={colors.surface}
        summary={`Offense against defense for ${teams.length} teams. Best net rating: ${teamInfo(best.abbr).name}, ${signed(best.net)}.`}
        onSelect={onSelect}
      />
      <AppText variant="caption" color="textSecondary" style={styles.pad}>
        Right scores more, up allows fewer. Each diagonal is a net rating (points scored minus allowed per 100
        possessions), every 5 points; the solid one is break-even. Dashed lines are the league average of{' '}
        {league.toFixed(1)}.
        {noise != null ? ' Game-to-game luck uses the usual 12-point spread of NBA game margins.' : ''}
      </AppText>
    </Card>
  );
}

/** "Who's been lucky?" Record against point differential, with the band luck alone produces. */
export function LuckCard({ doc, highlight = null, onSelect }: CardProps) {
  const colors = useColors();
  const teams = doc.teams.filter((t): t is TeamSeason & { luck: number } => t.luck != null);
  const noises = teams.map((t) => t.luck_noise).filter((v): v is number => v != null);
  if (teams.length < 5 || noises.length === 0) return null;
  const noise = median(noises);
  const games = Math.round(median(teams.map((t) => t.gp)));
  const focus = highlight ? teams.find((t) => t.abbr === highlight) : undefined;
  const outside = teams.filter((t) => luckVerdict(t) !== 'unclear').sort((a, b) => Math.abs(b.luck) - Math.abs(a.luck));

  let answer: string;
  if (focus) {
    const name = teamInfo(focus.abbr).name;
    const v = luckVerdict(focus);
    const expected = focus.pyth_w ?? 0;
    const record = focus.w != null && focus.l != null ? `${focus.w}–${focus.l}` : '';
    const band = focus.luck_noise != null ? focus.luck_noise.toFixed(1) : noise.toFixed(1);
    answer =
      v === 'above'
        ? `Lucky so far: ${name} is ${record}, ${focus.luck.toFixed(1)} wins better than its point differential predicts (${expected.toFixed(1)} wins). That’s more than normal luck (±${band}), so expect the record to drift back.`
        : v === 'below'
          ? `Unlucky so far: ${name} is ${record}, ${Math.abs(focus.luck).toFixed(1)} wins worse than its point differential predicts (${expected.toFixed(1)} wins). That’s more than normal luck (±${band}), so expect better results.`
          : `${name}’s ${record} record matches its point differential (${expected.toFixed(1)} expected wins, ${signed(focus.luck)}): within normal luck of ±${band}.`;
  } else {
    const names = (ts: typeof outside) =>
      ts
        .slice(0, 3)
        .map((t) => `${teamInfo(t.abbr).name} (${signed(t.luck)})`)
        .join(', ');
    const lucky = outside.filter((t) => t.luck > 0);
    const unlucky = outside.filter((t) => t.luck < 0);
    answer = outside.length
      ? [lucky.length ? `Luckier than normal: ${names(lucky)}.` : '', unlucky.length ? `Unluckier than normal: ${names(unlucky)}.` : '']
          .filter(Boolean)
          .join(' ')
      : `No team is outside normal luck yet: every record is within about ${noise.toFixed(1)} wins of what its point differential predicts.`;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <AppText variant="title">{focus ? 'Lucky or good?' : 'Who’s been lucky?'}</AppText>
        <AppText variant="caption" color="textSecondary">
          Wins above or below what point differential predicts · {teams.length} teams
        </AppText>
      </View>
      <AppText variant="bodyStrong" style={styles.pad}>
        {answer}
      </AppText>
      <LuckStrip
        teams={teams.map((t) => ({ abbr: t.abbr, luck: t.luck }))}
        noise={noise}
        highlight={highlight}
        surface={colors.surface}
        summary={`Wins against point differential for ${teams.length} teams. Normal luck is within ${noise.toFixed(1)} wins.`}
        onSelect={onSelect}
      />
      <AppText variant="caption" color="textSecondary" style={styles.pad}>
        Even if every close game were a coin flip, records would wander up to about {noise.toFixed(1)} wins from what
        point differential predicts after {games} games (95%). Only teams outside the shaded band have clearly won
        more or fewer close games than their scoring says.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: spacing.md, gap: spacing.sm },
  head: { gap: 2, paddingHorizontal: spacing.xs },
  pad: { paddingHorizontal: spacing.xs },
});
