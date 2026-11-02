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
import { DataStatusLine, FirstLoad } from '@/components/DataStatus';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import { formatStat } from '@/lib/format';
import { queryPlayers, SORT_STATS } from '@/players/query';
import { CATALOG, type StatId } from '@/stats/catalog';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

export default function PlayersScreen() {
  const { snapshot, loading, refresh } = useData();
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<StatId>('game_score');
  const [qualifiedOnly, setQualifiedOnly] = useState(true);

  const players = snapshot?.players.players;
  const rows = useMemo(
    () => (players ? queryPlayers(players, { search, sort, qualifiedOnly }) : []),
    [players, search, sort, qualifiedOnly],
  );

  if (!snapshot) return <FirstLoad />;

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
                { backgroundColor: selected ? colors.accent : colors.surface },
              ]}>
              <AppText variant="small" color={selected ? 'textOnAccent' : 'text'} style={styles.chipText}>
                {CATALOG[id].short}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <AppText variant="small">Qualified players only</AppText>
          <AppText variant="caption" color="textSecondary">
            {search ? 'Search covers every player.' : 'At least 10 minutes a game and enough games played.'}
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
          No players match “{search}”.
        </AppText>
      }
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
      renderItem={({ item, index }) => <PlayerRow player={item} position={index + 1} sort={sort} />}
      style={{ backgroundColor: colors.background }}
    />
  );
}

function PlayerRow({ player, position, sort }: { player: Player; position: number; sort: StatId }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${player.name}, ${CATALOG[sort].label} ${formatStat(sort, player.s[sort])}`}
      onPress={() => router.push({ pathname: '/player/[id]', params: { id: String(player.id) } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      <AppText variant="caption" color="textSecondary" style={styles.position}>
        {position}
      </AppText>
      <View style={styles.nameBlock}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {player.name}
        </AppText>
        <View style={styles.meta}>
          <TeamChip abbr={player.team} />
          <AppText variant="caption" color="textSecondary">
            {player.pos} · {player.s.gp} GP{player.q ? '' : ' · not qualified'}
          </AppText>
        </View>
      </View>
      <View style={styles.value}>
        <AppText variant="number">{formatStat(sort, player.s[sort])}</AppText>
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
  value: { alignItems: 'flex-end', minWidth: 56 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg + 24 + spacing.md },
  empty: { padding: spacing.xl, textAlign: 'center' },
});
