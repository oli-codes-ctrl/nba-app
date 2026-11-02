import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { FirstLoad } from '@/components/DataStatus';
import { PercentileBar } from '@/components/PercentileBar';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import { betterThan, formatStat, rankText } from '@/lib/format';
import { GROUPS, statsInGroup, type StatDef } from '@/stats/catalog';
import { teamInfo } from '@/theme/teams';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, playerById } = useData();
  const colors = useColors();

  if (!snapshot) return <FirstLoad />;
  const player = playerById.get(Number(id));
  if (!player) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText color="textSecondary">This player isn’t in today’s data.</AppText>
      </View>
    );
  }

  const poolSize = snapshot.players.poolSize;
  const earlierTeams = player.teams.slice(1);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: player.name }} />

      <View style={styles.hero}>
        <AppText variant="large">{player.name}</AppText>
        <View style={styles.heroMeta}>
          <TeamChip abbr={player.team} />
          <AppText color="textSecondary">
            {teamInfo(player.team).name} · {positionName(player.pos)}
          </AppText>
        </View>
        {earlierTeams.length > 0 && (
          <View style={styles.heroMeta}>
            <AppText variant="caption" color="textSecondary">
              Earlier this season:
            </AppText>
            {earlierTeams.map((t) => (
              <TeamChip key={t} abbr={t} muted />
            ))}
          </View>
        )}
      </View>

      <View style={[styles.summary, { backgroundColor: colors.surface }]}>
        <Summary label="Age" value={player.s.age == null ? '–' : String(player.s.age)} />
        <Summary label="Games" value={String(player.s.gp ?? '–')} />
        <Summary label="Minutes" value={formatStat('mpg', player.s.mpg)} />
      </View>

      {!player.q && (
        <AppText variant="small" color="textSecondary">
          Not enough games or minutes yet to rank against qualified players. Season averages are shown
          without percentiles.
        </AppText>
      )}

      {GROUPS.map((group) => (
        <View key={group.id} style={styles.group}>
          <AppText variant="title">{group.title}</AppText>
          {group.note && (
            <AppText variant="caption" color="textSecondary">
              {group.note}
            </AppText>
          )}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {statsInGroup(group.id).map((def, i) => (
              <StatRow key={def.id} def={def} player={player} poolSize={poolSize[def.id]} first={i === 0} />
            ))}
          </View>
        </View>
      ))}

      <AppText variant="caption" color="textSecondary" style={styles.footnote}>
        Percentiles compare against the {snapshot.manifest.qualifiedCount} qualified players. For
        turnovers and fouls, fewer counts as better.
      </AppText>
    </ScrollView>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <AppText variant="title" style={styles.tabular}>
        {value}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

function StatRow({
  def,
  player,
  poolSize,
  first,
}: {
  def: StatDef;
  player: Player;
  poolSize: number | undefined;
  first: boolean;
}) {
  const colors = useColors();
  const pct = player.pct?.[def.id];
  const rank = player.rank?.[def.id];
  const better = pct == null ? null : betterThan(def.id, pct);

  return (
    <View
      style={[styles.statRow, !first && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}
      accessible
      accessibilityLabel={
        `${def.label}: ${formatStat(def.id, player.s[def.id])}` +
        (better == null ? '' : `, better than ${Math.round(better)} percent of qualified players`)
      }>
      <View style={styles.statTop}>
        <AppText variant="small" style={styles.statLabel} numberOfLines={1}>
          {def.label}
        </AppText>
        <AppText variant="number">{formatStat(def.id, player.s[def.id])}</AppText>
      </View>
      {better != null && (
        <View style={styles.statBottom}>
          <PercentileBar value={better} />
          <AppText variant="caption" color="textSecondary" style={styles.rank}>
            {rank != null && poolSize ? rankText(def.id, rank, poolSize) : ''}
          </AppText>
        </View>
      )}
    </View>
  );
}

function positionName(pos: string): string {
  return { G: 'Guard', F: 'Forward', C: 'Center' }[pos] ?? pos;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  hero: { gap: spacing.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  summary: { flexDirection: 'row', borderRadius: radius.lg, paddingVertical: spacing.md },
  summaryItem: { flex: 1, alignItems: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  group: { gap: spacing.sm },
  card: { borderRadius: radius.lg, paddingHorizontal: spacing.md },
  statRow: { paddingVertical: spacing.md, gap: spacing.sm },
  statTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  statLabel: { flex: 1 },
  statBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rank: { minWidth: 96, textAlign: 'right', fontVariant: ['tabular-nums'] },
  footnote: { textAlign: 'center' },
});
