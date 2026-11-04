import { StyleSheet, View } from 'react-native';

import { radius } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

/**
 * `value` is "better than X% of qualified players", 0-100. Neutral stats
 * (roles and volumes) use one color, since more is neither good nor bad.
 */
export function PercentileBar({ value, neutral = false }: { value: number; neutral?: boolean }) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(100, value));
  const fill = neutral
    ? colors.scaleNeutral
    : clamped >= 67
      ? colors.scaleHigh
      : clamped >= 33
        ? colors.scaleMid
        : colors.scaleLow;
  return (
    <View style={[styles.track, { backgroundColor: colors.scaleTrack }]}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: radius.pill },
});
