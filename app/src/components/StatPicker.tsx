import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { CATALOG, GROUPS, statsInGroup, type StatDef, type StatId } from '@/stats/catalog';
import { spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

import { AppText } from './AppText';
import { Sheet } from './Sheet';

const SECTIONS = [
  { title: 'Basics', data: statsInGroup('context') },
  ...GROUPS.map((g) => ({ title: g.title, data: statsInGroup(g.id) })),
];

export function StatPicker({
  visible,
  title,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  selected: StatId;
  onSelect: (id: StatId) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <SectionList<StatDef>
        sections={SECTIONS}
        keyExtractor={(s) => s.id}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
            <AppText variant="caption" color="textSecondary">
              {section.title.toUpperCase()}
            </AppText>
          </View>
        )}
        renderItem={({ item }) => {
          const isSelected = item.id === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                onSelect(item.id);
                onClose();
              }}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
              <AppText variant={isSelected ? 'bodyStrong' : 'body'} style={styles.label}>
                {item.label}
              </AppText>
              <AppText variant="small" color={isSelected ? 'accent' : 'textSecondary'}>
                {isSelected ? `✓ ${CATALOG[item.id].short}` : CATALOG[item.id].short}
              </AppText>
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs + 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    gap: spacing.md,
  },
  label: { flex: 1 },
});
