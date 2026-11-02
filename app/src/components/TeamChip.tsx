import { StyleSheet, Text, View } from 'react-native';

import { chipTextColor, teamInfo } from '@/theme/teams';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

/** Team shown as abbreviation on its color. No logos. */
export function TeamChip({ abbr, muted = false }: { abbr: string; muted?: boolean }) {
  const colors = useColors();
  const { color, name } = teamInfo(abbr);
  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.chip,
        { backgroundColor: color, borderColor: colors.border, opacity: muted ? 0.55 : 1 },
      ]}>
      <Text style={[styles.text, { color: chipTextColor(color) }]}>{abbr || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});
