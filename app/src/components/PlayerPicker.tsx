import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { Player } from '@/data/types';
import { queryPlayers } from '@/players/query';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

import { AppText } from './AppText';
import { Sheet } from './Sheet';
import { TeamChip } from './TeamChip';

/** Pick one qualified player by name. */
export function PlayerPicker({
  visible,
  players,
  onSelect,
  onClose,
}: {
  visible: boolean;
  players: readonly Player[];
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [search, setSearch] = useState('');
  const qualified = useMemo(() => players.filter((p) => p.q), [players]);
  const rows = useMemo(
    () => queryPlayers(qualified, { search, sort: 'game_score', qualifiedOnly: true }),
    [qualified, search],
  );

  return (
    <Sheet visible={visible} title="Highlight a player" onClose={onClose}>
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search qualified players"
          placeholderTextColor={colors.textSecondary}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Search qualified players"
          style={[styles.search, { backgroundColor: colors.surface, color: colors.text }]}
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(p) => String(p.id)}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <AppText color="textSecondary" style={styles.empty}>
            No qualified player matches “{search}”. Only qualified players appear on the graphs.
          </AppText>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onSelect(item.id);
              setSearch('');
              onClose();
            }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
            <AppText variant="body" style={styles.name} numberOfLines={1}>
              {item.name}
            </AppText>
            <TeamChip abbr={item.team} />
          </Pressable>
        )}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  searchWrap: { padding: spacing.lg },
  search: { height: 40, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 48,
  },
  name: { flex: 1 },
  empty: { padding: spacing.xl, textAlign: 'center' },
});
