import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { DataStatusLine, FirstLoad } from '@/components/DataStatus';
import { Segmented } from '@/components/Segmented';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import { formatStat } from '@/lib/format';
import { queryPlayers, SORT_STATS } from '@/players/query';
import { CATALOG, type StatId } from '@/stats/catalog';
import { attemptsShort, attemptsText, sampleFor, type AttemptRules } from '@/stats/samples';
import {
  hasVariants,
  normalized,
  NORMALIZATIONS,
  POSITION_GROUPS,
  groupNoun,
  type Normalization,
  type PositionGroup,
} from '@/stats/views';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

type PositionFilter = 'all' | PositionGroup;

const POSITION_OPTIONS: readonly { id: PositionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...POSITION_GROUPS.map((g) => ({ id: g, label: groupNoun(g).replace(/^./, (c) => c.toUpperCase()) })),
];

export default function PlayersScreen() {
  const { snapshot, loading, refresh } = useData();
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<StatId>('game_score');
  const [qualifiedOnly, setQualifiedOnly] = useState(true);
  const [norm, setNorm] = useState<Normalization>('game');
  const [position, setPosition] = useState<PositionFilter>('all');

  // The stat actually listed: PTS becomes PTS/36 or PTS/100 when scaled.
  const view = normalized(sort, norm);
  const players = snapshot?.players.players;
  const rules = snapshot?.players.minAttempts;
  const rows = useMemo(
    () =>
      players
        ? queryPlayers(players, {
            search,
            sort: view,
            qualifiedOnly,
            rules,
            position: position === 'all' ? null : position,
          })
        : [],
    [players, search, view, qualifiedOnly, rules, position],
  );
  const rule = rules?.[view];
  const scalable = hasVariants(sort);

  if (!snapshot) return <FirstLoad shape="list" />;

  const header = (
    <View style={styles.header}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search players"
        placeholderTextColor={colors.textSecondary}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        returnKeyType="search"
        accessibilityLabel="Search players"
        style={[styles.search, { backgroundColor: colors.surface, color: colors.text }]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {SORT_STATS.map((id) => {
          const selected = id === sort;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Sort by ${CATALOG[id].label}`}
              onPress={() => setSort(id)}
              style={[
                styles.chip,
                { backgroundColor: selected ? colors.accentFill : colors.surface },
              ]}>
              <AppText variant="small" color={selected ? 'textOnAccent' : 'text'} style={styles.chipText}>
                {CATALOG[id].short}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
      <Segmented
        accessibilityLabel="Scale stats"
        options={NORMALIZATIONS.map((n) => ({ ...n, disabled: n.id !== 'game' && !scalable }))}
        value={scalable ? norm : 'game'}
        onChange={setNorm}
      />
      <Segmented accessibilityLabel="Position" options={POSITION_OPTIONS} value={position} onChange={setPosition} />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/players/teams')}
        style={({ pressed }) => [styles.teamsLink, { backgroundColor: pressed ? colors.border : colors.surface }]}>
        <AppText variant="bodyStrong" style={styles.toggleText}>
          Browse by team
        </AppText>
        <AppText variant="bodyStrong" color="accent">
          ›
        </AppText>
      </Pressable>
      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <AppText variant="small">Qualified players only</AppText>
          <AppText variant="caption" color="textSecondary">
            {search
              ? 'Search covers every player.'
              : `At least 10 minutes a game and enough games played.${
                  rule ? ` ${CATALOG[view].short} also needs ${attemptsText(rule.min, rule.by)}.` : ''
                }`}
          </AppText>
        </View>
        <Switch
          value={qualifiedOnly}
          onValueChange={setQualifiedOnly}
          trackColor={{ true: colors.accent, false: colors.border }}
          accessibilityLabel="Qualified players only"
        />
      </View>
      <DataStatusLine />
    </View>
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(p) => String(p.id)}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={header}
      ListEmptyComponent={
        <AppText color="textSecondary" style={styles.empty}>
          {search ? `No players match “${search}”.` : 'No players match these filters yet.'}
        </AppText>
      }
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
      renderItem={({ item, index }) => <PlayerRow player={item} position={index + 1} sort={view} rules={rules} />}
      style={{ backgroundColor: colors.background }}
    />
  );
}

function PlayerRow({
  player,
  position,
  sort,
  rules,
}: {
  player: Player;
  position: number;
  sort: StatId;
  rules: AttemptRules | undefined;
}) {
  const colors = useColors();
  // Sorted by a shooting percentage: show the attempts behind it, and give
  // no position to players without enough of them.
  const sample = sampleFor(player, sort, rules);
  const unranked = sample != null && !sample.enough;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        `${player.name}, ${CATALOG[sort].label} ${formatStat(sort, player.s[sort])}` +
        (sample ? `, on ${attemptsText(sample.have, sample.by)}` : '') +
        (unranked ? ', too few to rank' : '')
      }
      onPress={() => router.push({ pathname: '/players/player/[id]', params: { id: String(player.id) } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      <AppText variant="caption" color="textSecondary" style={styles.position}>
        {unranked ? '–' : position}
      </AppText>
      <Avatar name={player.name} team={player.team} size={36} />
      <View style={styles.nameBlock}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {player.name}
        </AppText>
        <View style={styles.meta}>
          <TeamChip abbr={player.team} />
          <AppText variant="caption" color="textSecondary" numberOfLines={1} style={styles.metaText}>
            {player.pos} · {player.s.gp} GP{player.q ? '' : ' · not qualified'}
            {sample ? ` · ${attemptsShort(sample.have, sample.by)}` : ''}
          </AppText>
        </View>
      </View>
      <View style={styles.value}>
        <AppText variant="number" color={unranked ? 'textSecondary' : 'text'}>
          {formatStat(sort, player.s[sort])}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {CATALOG[sort].short}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  search: {
    height: 40,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  chips: { gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.pill },
  chipText: { fontWeight: '600' },
  teamsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleText: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 56,
  },
  position: { width: 24, textAlign: 'right', fontVariant: ['tabular-nums'] },
  nameBlock: { flex: 1, gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { flexShrink: 1 },
  value: { alignItems: 'flex-end', minWidth: 56 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg + 24 + spacing.md + 36 + spacing.md },
  empty: { padding: spacing.xl, textAlign: 'center' },
});
