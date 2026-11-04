import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { FirstLoad } from '@/components/DataStatus';
import { Segmented } from '@/components/Segmented';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import { shortName } from '@/graphs/analysis';
import { DistributionChart } from '@/graphs/DistributionChart';
import { quantile, rankBand } from '@/graphs/distribution';
import { PositionLegend } from '@/graphs/Legend';
import { betterThan, formatDate, formatStat, ordinal, rankText } from '@/lib/format';
import { useLinks } from '@/lib/usePlayerLink';
import { CATALOG, isStatId, type StatId } from '@/stats/catalog';
import { groupNoun, POSITION_GROUPS, positionGroup, type PositionGroup } from '@/stats/views';
import { radius, spacing } from '@/theme/tokens';
import { useChartColors, useColors } from '@/theme/useTokens';

type PositionFilter = 'all' | PositionGroup;

const POSITION_OPTIONS: readonly { id: PositionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...POSITION_GROUPS.map((g) => ({ id: g, label: groupNoun(g).replace(/^./, (c) => c.toUpperCase()) })),
];

const LEADERS = 5;

/**
 * "Where does he stand?" One stat, every ranked player as a dot, with the
 * median, the middle half and (for shooting) how uncertain his rank is.
 * Links: .../stat?stat=ts_pct&player=3975&pos=G
 */
export default function DistributionScreen() {
  const params = useLocalSearchParams<{ stat?: string; player?: string; pos?: string }>();
  const { snapshot, playerById } = useData();
  const colors = useColors();
  const cc = useChartColors();
  const links = useLinks();
  const stat: StatId = params.stat && isStatId(params.stat) ? params.stat : 'pts';
  const player = params.player ? playerById.get(Number(params.player)) : undefined;
  const [position, setPosition] = useState<PositionFilter>(() => {
    if (params.pos === 'G' || params.pos === 'F' || params.pos === 'C') return params.pos;
    if (params.pos === 'all') return 'all';
    return (player && positionGroup(player.pos)) ?? 'all';
  });
  const [tapped, setTapped] = useState<number | null>(null);

  const players = snapshot?.players.players;
  const group = position === 'all' ? null : position;
  // The ranked pool: exactly the players with a published percentile here.
  const pool = useMemo(
    () =>
      (players ?? []).filter((p) =>
        group ? positionGroup(p.pos) === group && p.pctPos?.[stat] != null : p.pct?.[stat] != null,
      ),
    [players, stat, group],
  );

  if (!snapshot) return <FirstLoad shape="page" />;

  const def = CATALOG[stat];
  const noun = group ? groupNoun(group) : 'players';
  const values = pool.map((p) => p.s[stat] ?? 0);
  const sorted = [...values].sort((a, b) => a - b);
  const inPool = player != null && pool.some((p) => p.id === player.id);
  const ci = player?.ci?.[stat];
  const adj = player?.adj?.[stat];
  const dots = pool.map((p) => ({
    id: p.id,
    value: p.s[stat] ?? 0,
    color: cc.positions[positionGroup(p.pos) ?? 'G'],
  }));
  const leaders = [...pool]
    .sort((a, b) => (def.lowerIsBetter ? 1 : -1) * ((a.s[stat] ?? 0) - (b.s[stat] ?? 0)) || a.id - b.id)
    .slice(0, LEADERS);
  const through = snapshot.manifest.gamesThrough ?? snapshot.manifest.asOf;
  const tappedPlayer = tapped == null ? undefined : playerById.get(tapped);

  const pct = player ? (group ? player.pctPos?.[stat] : player.pct?.[stat]) : undefined;
  const rank = player ? (group ? player.rankPos?.[stat] : player.rank?.[stat]) : undefined;
  const better = pct == null ? null : betterThan(stat, pct);
  const band = inPool && ci ? rankBand(ci, values, def.lowerIsBetter) : null;

  const title = player ? `Where does ${shortName(player.name)} rank?` : `${def.label} across the league`;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: def.label }} />

      <Segmented accessibilityLabel="Compare with" options={POSITION_OPTIONS} value={position} onChange={setPosition} />

      <Card style={styles.chartCard}>
        <View style={styles.titleBlock}>
          <AppText variant="title">{title}</AppText>
          <AppText variant="caption" color="textSecondary">
            {def.label} · {pool.length} qualified {noun} · games through {formatDate(through)}
          </AppText>
        </View>

        {/* The answer first: his number and where it ranks. */}
        {player && inPool && better != null ? (
          <AppText variant="bodyStrong" style={styles.answer}>
            {formatStat(stat, player.s[stat])}, {def.neutral ? 'higher' : 'better'} than {Math.round(better)}% of
            qualified {noun}
            {rank != null ? ` (${rankText(stat, rank, pool.length)})` : ''}
          </AppText>
        ) : player ? (
          <AppText variant="small" color="textSecondary" style={styles.answer}>
            {player.name} isn’t ranked here:{' '}
            {!player.q
              ? 'not enough games or minutes yet'
              : group && positionGroup(player.pos) !== group
                ? `he isn’t a ${groupNoun(group).slice(0, -1)}`
                : 'not enough attempts yet'}
            .
          </AppText>
        ) : null}

        {pool.length < 5 ? (
          <AppText color="textSecondary">Not enough ranked {noun} for this stat yet.</AppText>
        ) : (
          <DistributionChart
            stat={stat}
            dots={dots}
            focusId={inPool ? player!.id : null}
            focusLabel={inPool ? `${shortName(player!.name)} ${formatStat(stat, player!.s[stat])}` : undefined}
            range={inPool && ci ? ci : null}
            surface={colors.surface}
            summary={`${def.label} for ${pool.length} qualified ${noun}. Median ${formatStat(stat, quantile(sorted, 0.5))}.`}
            onSelect={setTapped}
          />
        )}

        {position === 'all' && pool.length >= 5 && <PositionLegend />}

        <View style={styles.insight}>
          {band || adj != null ? (
            <AppText variant="small">
              {band
                ? band[1] - band[0] >= 25
                  ? `Allowing for luck, his true rank could sit anywhere from the ${ordinal(Math.round(band[0]))} to the ${ordinal(Math.round(band[1]))} percentile, so it isn’t settled yet.`
                  : `Allowing for luck, his true rank sits between the ${ordinal(Math.round(band[0]))} and ${ordinal(Math.round(band[1]))} percentile.`
                : ''}
              {adj != null ? `${band ? ' ' : ''}Skill estimate ${adj.toFixed(1)}%.` : ''}
            </AppText>
          ) : null}
          <AppText variant="caption" color="textSecondary">
            Median {formatStat(stat, quantile(sorted, 0.5))}; the shaded band holds the middle half (
            {formatStat(stat, quantile(sorted, 0.25))} to {formatStat(stat, quantile(sorted, 0.75))}).{' '}
            {def.neutral
              ? 'A role, not a ranking: neither end is better.'
              : def.lowerIsBetter
                ? 'Fewer is better, so the axis runs from most to fewest: right is better.'
                : 'Right is better.'}
          </AppText>
        </View>
      </Card>

      {tappedPlayer && (
        <Pressable
          accessibilityRole="button"
          onPress={() => links.player(tappedPlayer.id)}
          style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.border : colors.surface }]}>
          <Avatar name={tappedPlayer.name} team={tappedPlayer.team} size={36} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{tappedPlayer.name}</AppText>
            <AppText variant="caption" color="textSecondary">
              {formatStat(stat, tappedPlayer.s[stat])} · tap to open
            </AppText>
          </View>
          <TeamChip abbr={tappedPlayer.team} />
        </Pressable>
      )}

      <View style={styles.section}>
        <AppText variant="title">{def.neutral ? 'Highest' : 'Best'} among qualified {noun}</AppText>
        <View style={[styles.list, { backgroundColor: colors.surface }]}>
          {leaders.map((p: Player, i) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => links.player(p.id)}
              style={({ pressed }) => [
                styles.row,
                i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                pressed && { backgroundColor: colors.border },
              ]}>
              <AppText variant="caption" color="textSecondary" style={styles.rankNum}>
                {i + 1}
              </AppText>
              <Avatar name={p.name} team={p.team} size={32} />
              <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                {p.name}
              </AppText>
              <AppText variant="number">{formatStat(stat, p.s[stat])}</AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  chartCard: { paddingHorizontal: spacing.md, gap: spacing.sm },
  titleBlock: { gap: 2, paddingHorizontal: spacing.xs },
  answer: { paddingHorizontal: spacing.xs },
  insight: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  section: { gap: spacing.sm, marginTop: spacing.md },
  list: { borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56, borderRadius: radius.lg },
  rankNum: { width: 16, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
