import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, touchSlop } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

import { AppText } from './AppText';

export type SegmentOption<T extends string> = { id: T; label: string; disabled?: boolean };

/** A row of mutually exclusive options. Disabled options stay visible but dimmed. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.segmented, { backgroundColor: colors.surface }]}>
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected, disabled: !!o.disabled }}
            disabled={o.disabled}
            hitSlop={touchSlop}
            onPress={() => onChange(o.id)}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              o.disabled && styles.disabled,
            ]}>
            <AppText variant="small" style={selected ? styles.bold : undefined} numberOfLines={1}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 2 },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  bold: { fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
