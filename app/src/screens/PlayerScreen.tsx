import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { FirstLoad } from '@/components/DataStatus';
import { PercentileBar } from '@/components/PercentileBar';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import { useFollows } from '@/follow/FollowProvider';
import { betterThan, formatDate, formatStat, rankText } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { usePlayerLink } from '@/lib/usePlayerLink';
import { similarPlayers } from '@/players/similar';
import { CATALOG, GROUPS, statsInGroup, type StatDef, type StatId } from '@/stats/catalog';
import { teamInfo } from '@/theme/teams';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, playerById } = useData();
  const colors = useColors();
  const follows = useFollows();
  const openPlayer = usePlayerLink();
  const player = playerById.get(Number(id));
  const all = snapshot?.players.players;
  const similar = useMemo(() => (player && all ? similarPlayers(player, all, 3) : []), [player, all]);

  if (!snapshot) return <FirstLoad />;
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
        <View style={styles.titleRow}>
          <AppText variant="large" style={styles.flex}>
            {player.name}
          </AppText>
          <FollowButton
            following={follows.isFollowing(player.id)}
            onPress={() => {
              tapFeedback();
              follows.toggle(player.id);
            }}
          />
        </View>
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

      {(player.g || player.r) && (
        <View style={styles.group}>
          <AppText variant="title">Recent form</AppText>
          <View style={[styles.card, styles.formCard, { backgroundColor: colors.surface }]}>
            {player.g && snapshot.players.latest && (
              <View style={styles.formBlock}>
                <AppText variant="caption" color="textSecondary">
                  Latest game (since {formatDate(snapshot.players.latest.since)})
                </AppText>
                <AppText variant="bodyStrong">
                  {player.g.pts ?? 0} PTS · {player.g.reb ?? 0} REB · {player.g.ast ?? 0} AST · {player.g.stl ?? 0} STL ·{' '}
                  {player.g.blk ?? 0} BLK
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {player.g.fgm ?? 0}-{player.g.fga ?? 0} FG · {player.g.fg3m ?? 0}-{player.g.fg3a ?? 0} 3PT ·{' '}
                  {player.g.ftm ?? 0}-{player.g.fta ?? 0} FT · {player.g.mpg ?? 0} min · Game Score{' '}
                  {formatStat('game_score', player.g.game_score)}
                </AppText>
              </View>
            )}
            {player.r && snapshot.players.recent && (
              <View style={styles.formBlock}>
                <AppText variant="caption" color="textSecondary">
                  Since {formatDate(snapshot.players.recent.since)}: {player.r.gp} {player.r.gp === 1 ? 'game' : 'games'},
                  against the season average
                </AppText>
                {RECENT_STATS.map((stat) => (
                  <FormRow
                    key={stat}
                    label={CATALOG[stat].label}
                    recent={player.r?.[stat] ?? null}
                    season={player.s[stat]}
                    stat={stat}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {similar.length > 0 && (
        <View style={styles.group}>
          <AppText variant="title">Plays like</AppText>
          <AppText variant="caption" color="textSecondary">
            Closest statistical profile: scoring, boards and passing per 36 minutes, defense, shot diet and efficiency.
          </AppText>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {similar.map(({ player: other, match }, i) => (
              <Pressable
                key={other.id}
                accessibilityRole="button"
                accessibilityLabel={`${other.name}, ${Math.round(match)} percent match`}
                onPress={() => openPlayer(other.id)}
                style={[styles.simRow, i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                  {other.name}
                </AppText>
                <TeamChip abbr={other.team} />
                <AppText variant="number" style={styles.match}>
                  {Math.round(match)}%
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

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

const RECENT_STATS: readonly StatId[] = ['pts', 'reb', 'ast', 'fg3m', 'ts_pct'];

function FollowButton({ following, onPress }: { following: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      accessibilityLabel={following ? 'Following. Tap to unfollow' : 'Follow'}
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.follow,
        following
          ? { backgroundColor: colors.surface, borderColor: colors.border }
          : { backgroundColor: colors.accentFill, borderColor: colors.accentFill },
      ]}>
      <AppText variant="small" color={following ? 'text' : 'textOnAccent'} style={styles.bold}>
        {following ? '★ Following' : '☆ Follow'}
      </AppText>
    </Pressable>
  );
}

function FormRow({
  label,
  recent,
  season,
  stat,
}: {
  label: string;
  recent: number | null;
  season: number | null;
  stat: StatId;
}) {
  const diff = recent != null && season != null ? recent - season : null;
  const shown =
    diff == null ? '' : Math.abs(diff) < 0.05 ? 'same' : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}`;
  return (
    <View style={styles.formRow}>
      <AppText variant="small" style={styles.flex} numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="number">{formatStat(stat, recent)}</AppText>
      <AppText variant="caption" color="textSecondary" style={styles.diff}>
        {shown}
      </AppText>
    </View>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  follow: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  formCard: { paddingVertical: spacing.md, gap: spacing.lg },
  formBlock: { gap: spacing.xs },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 28 },
  diff: { width: 56, textAlign: 'right', fontVariant: ['tabular-nums'] },
  simRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  match: { width: 48, textAlign: 'right' },
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
