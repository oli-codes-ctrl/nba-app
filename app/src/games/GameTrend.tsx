import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { SecondaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { Segmented } from '@/components/Segmented';
import { Block } from '@/components/Skeleton';
import { useGameLogs } from '@/data/DataProvider';
import type { GameStatKey, Player } from '@/data/types';
import { shortName } from '@/graphs/analysis';
import { TrendChart } from '@/graphs/TrendChart';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

import { gameLine, heat, HEAT_Z, mean, playerLog, trailing } from './logs';

const STATS: readonly { id: GameStatKey; label: string; name: string }[] = [
  { id: 'gmsc', label: 'GmSc', name: 'Game Score' },
  { id: 'pts', label: 'PTS', name: 'points' },
  { id: 'reb', label: 'REB', name: 'rebounds' },
  { id: 'ast', label: 'AST', name: 'assists' },
  { id: 'fg3m', label: '3PM', name: 'threes' },
];
const WINDOW = 10;

/**
 * "Is he heating up?" Game by game from the box scores, with the verdict
 * only calling a streak when it beats game-to-game luck. Shows `fallback`
 * when no box scores are published.
 */
export function GameTrend({ player, fallback }: { player: Player; fallback?: ReactNode }) {
  const colors = useColors();
  const { doc, status, stale, retry } = useGameLogs();
  const [stat, setStat] = useState<GameStatKey>('gmsc');
  const [picked, setPicked] = useState<number | null>(null);
  const log = useMemo(() => (doc ? playerLog(doc, player.id) : []), [doc, player.id]);

  if (status === 'none' || (status === 'error' && !doc)) {
    return (
      <>
        {fallback}
        {status === 'error' && (
          <Card>
            <AppText variant="small" color="textSecondary">
              Couldn’t load his game-by-game box scores.
            </AppText>
            <SecondaryButton label="Try again" onPress={retry} />
          </Card>
        )}
      </>
    );
  }
  if (!doc) {
    return (
      <View style={styles.group}>
        <AppText variant="title">Is he heating up?</AppText>
        <Block height={320} round={radius.lg} />
      </View>
    );
  }
  if (log.length === 0) return <>{fallback}</>;

  const def = STATS.find((s) => s.id === stat)!;
  const values = log.map((g) => g.v[stat]);
  const trail = trailing(values, WINDOW);
  const season = mean(values);
  const recentGames = log.length >= 10 ? 5 : 3;
  const h = heat(values, recentGames);
  const name = shortName(player.name);
  const last = log.length - 1;
  const shown = picked != null && picked < log.length ? picked : last;
  const game = log[shown];

  const answer = !h
    ? `Only ${log.length} ${log.length === 1 ? 'game' : 'games'} so far: too few to tell a streak from luck.`
    : h.z >= HEAT_Z
      ? `Heating up: ${h.recent.toFixed(1)} ${def.name} a game over his last ${h.recentGames}, up from ${h.before.toFixed(1)} before. That’s more than game-to-game luck explains.`
      : h.z <= -HEAT_Z
        ? `Cooling off: ${h.recent.toFixed(1)} ${def.name} a game over his last ${h.recentGames}, down from ${h.before.toFixed(1)} before. That’s more than game-to-game luck explains.`
        : `Steady: his last ${h.recentGames} games (${h.recent.toFixed(1)}) are within normal swings of his ${h.beforeGames} before (${h.before.toFixed(1)}).`;

  return (
    <View style={styles.group}>
      <AppText variant="title">Is he heating up?</AppText>
      <Segmented
        accessibilityLabel="Stat"
        options={STATS.map((s) => ({ id: s.id, label: s.label }))}
        value={stat}
        onChange={(s) => setStat(s)}
      />
      <Card style={styles.card}>
        <View style={styles.pad}>
          <AppText variant="caption" color="textSecondary">
            {def.name === 'Game Score' ? 'Game Score' : `${def.name[0].toUpperCase()}${def.name.slice(1)}`} game by
            game · {log.length} games · box scores through {formatDate(doc.boxScoresThrough ?? doc.gamesThrough)}
            {stale ? ' · saved copy' : ''}
          </AppText>
          <AppText variant="bodyStrong">{answer}</AppText>
        </View>
        <TrendChart
          values={values}
          dates={log.map((g) => g.date)}
          trailing={trail}
          seasonMean={season}
          selected={shown}
          surface={colors.surface}
          summary={`${name}: ${def.name} in each of ${log.length} games. Season average ${season.toFixed(1)}. ${answer}`}
          onSelect={setPicked}
        />
        <View style={[styles.game, { borderTopColor: colors.border }]} accessible accessibilityLiveRegion="polite">
          <AppText variant="caption" color="textSecondary">
            {formatDate(game.date)} · {game.home ? 'vs' : 'at'} {game.opp} · {game.won ? 'W' : 'L'} {game.teamPts}–
            {game.oppPts}
            {shown === last ? ' · latest game' : ''}
          </AppText>
          <AppText variant="bodyStrong">{gameLine(game.v)}</AppText>
          <AppText variant="caption" color="textSecondary">
            {game.v.fgm}-{game.v.fga} FG · {game.v.fg3m}-{game.v.fg3a} 3PT · {game.v.ftm}-{game.v.fta} FT · {game.v.min} min ·
            Game Score {game.v.gmsc.toFixed(1)} · {game.v.pm > 0 ? '+' : ''}
            {game.v.pm}
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary" style={styles.pad}>
          Dots are single games; tap one for its box line. The line is his average over the last {WINDOW} games
          (fewer early on), and the shaded band is where his true level over those games likely sits (95%). Dashed:
          season average of {season.toFixed(1)}.
        </AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  card: { paddingHorizontal: spacing.md, gap: spacing.sm },
  pad: { paddingHorizontal: spacing.xs, gap: spacing.xs },
  game: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, paddingHorizontal: spacing.xs, gap: 2 },
});
