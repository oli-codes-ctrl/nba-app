import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function PrimaryButton({ label, onPress, disabled = false, style, accessibilityLabel }: Props) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: disabled ? colors.border : colors.accentFill, opacity: pressed ? 0.85 : 1 },
        style,
      ]}>
      <AppText variant="bodyStrong" color={disabled ? 'textSecondary' : 'textOnAccent'} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled = false, style, accessibilityLabel }: Props) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles.outline,
        { borderColor: colors.border, backgroundColor: pressed ? colors.surface : 'transparent' },
        style,
      ]}>
      <AppText variant="bodyStrong" color={disabled ? 'textSecondary' : 'accent'} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  outline: { borderWidth: StyleSheet.hairlineWidth },
});
