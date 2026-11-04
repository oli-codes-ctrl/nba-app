import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Section } from '@/components/Section';
import { TeamChip } from '@/components/TeamChip';
import type { GamesDoc, Player } from '@/data/types';
import { bestGames, gameLine, HEAT_Z, heatCheck, lastGameDate, type GameLog, type HeatRow } from '@/games/logs';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

const DAY_BEST = 8;
const SEASON_BEST = 5;
const HEAT_ROWS = 5;

function dayBefore(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

type Props = {
  doc: GamesDoc;
  players: readonly Player[];
  playerById: ReadonlyMap<number, Player>;
  /** Today's US Eastern date. */
  today: string;
  onOpen: (id: number) => void;
};

/** The Today sections that come from box scores: the day's best games, the heat check and the season's best. */
export function BoxScoreSections({ doc, players, playerById, today, onOpen }: Props) {
  const colors = useColors();
  const feed = useMemo(() => {
    const date = lastGameDate(doc);
    return {
      date,
      day: date ? bestGames(doc, playerById, DAY_BEST, { date }) : [],
      season: bestGames(doc, playerById, SEASON_BEST),
      heat: heatCheck(doc, players),
    };
  }, [doc, players, playerById]);

  const title =
    feed.date === dayBefore(today)
      ? 'Last night’s best'
      : feed.date
        ? `Best of ${formatDate(feed.date).replace(/, \d{4}$/, '')}`
        : '';
  const { hot, cold, recentGames, checked } = feed.heat;

  return (
    <>
      {feed.day.length > 0 && (
        <Section title={title} note="By Game Score, from the box scores">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.hList}>
            {feed.day.map(({ player, game }, i) => (
              <Pressable
                key={`${player.id}-${game.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${player.name}, ${gameLine(game.v)}, Game Score ${game.v.gmsc.toFixed(1)}`}
                onPress={() => onOpen(player.id)}
                style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? colors.border : colors.surface }]}>
                <View style={styles.tileTop}>
                  <AppText variant="kicker" color="textSecondary">
                    #{i + 1}
                  </AppText>
                  <TeamChip abbr={game.team} />
                </View>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {player.name}
                </AppText>
                <AppText variant="small">{gameLine(game.v)}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {game.v.fgm}-{game.v.fga} FG · {game.v.min} min · GmSc {game.v.gmsc.toFixed(1)}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {result(game)}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </Section>
      )}

      <Section
        title="Heat check"
        note={`Each player’s last ${recentGames} games against his earlier ones, by Game Score. Only changes bigger than his own game-to-game swings are shown.`}>
        {hot.length + cold.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <AppText color="textSecondary">
              No one is running hotter or colder than luck explains right now ({checked} players checked).
            </AppText>
          </View>
        ) : (
          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            {[...hot.slice(0, HEAT_ROWS), ...cold.slice(0, HEAT_ROWS)].map((r, i) => (
              <HeatRowView key={r.player.id} row={r} first={i === 0} onPress={() => onOpen(r.player.id)} />
            ))}
          </View>
        )}
        <AppText variant="caption" color="textSecondary">
          With {checked} players checked at once, a few would look streaky by chance, so the bar is {HEAT_Z} standard
          errors (about 1 in 80), not the usual 2.
        </AppText>
      </Section>

      {feed.season.length > 0 && (
        <Section title="Best games this season" note="By Game Score">
          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            {feed.season.map(({ player, game }, i) => (
              <Pressable
                key={`${player.id}-${game.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${i + 1}. ${player.name}, ${formatDate(game.date)}, ${gameLine(game.v)}, Game Score ${game.v.gmsc.toFixed(1)}`}
                onPress={() => onOpen(player.id)}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { backgroundColor: colors.border },
                ]}>
                <AppText variant="caption" color="textSecondary" style={styles.rank}>
                  {i + 1}
                </AppText>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {player.name}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {formatDate(game.date).replace(/, \d{4}$/, '')} {game.home ? 'vs' : 'at'} {game.opp} · {gameLine(game.v)}
                  </AppText>
                </View>
                <AppText variant="number">{game.v.gmsc.toFixed(1)}</AppText>
              </Pressable>
            ))}
          </View>
        </Section>
      )}
    </>
  );
}

function result(game: GameLog): string {
  return `${game.won ? 'W' : 'L'} ${game.teamPts}–${game.oppPts} ${game.home ? 'vs' : 'at'} ${game.opp}`;
}

function HeatRowView({ row, first, onPress }: { row: HeatRow; first: boolean; onPress: () => void }) {
  const colors = useColors();
  const up = row.z > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.player.name} is running ${up ? 'hot' : 'cold'}: Game Score ${row.recent.toFixed(1)} over his last ${row.recentGames} games, ${row.before.toFixed(1)} before`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
        pressed && { backgroundColor: colors.border },
      ]}>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {row.player.name}
        </AppText>
        <View style={styles.meta}>
          <TeamChip abbr={row.player.team} />
          <AppText variant="caption" color="textSecondary">
            {up ? 'Running hot' : 'Running cold'} · before {row.before.toFixed(1)}
          </AppText>
        </View>
      </View>
      <View style={styles.right}>
        <AppText variant="number">{row.recent.toFixed(1)}</AppText>
        <AppText variant="caption" color="textSecondary">
          {up ? '▲' : '▼'} {Math.abs(row.recent - row.before).toFixed(1)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bleed: { marginHorizontal: -spacing.lg },
  hList: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  tile: { width: 220, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  list: { borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56 },
  rank: { width: 16, textAlign: 'right', fontVariant: ['tabular-nums'] },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  right: { alignItems: 'flex-end' },
});
