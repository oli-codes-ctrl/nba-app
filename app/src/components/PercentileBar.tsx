import { StyleSheet, View } from 'react-native';

import { radius } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

/** `value` is "better than X% of qualified players", 0-100. */
export function PercentileBar({ value }: { value: number }) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(100, value));
  const fill = clamped >= 67 ? colors.scaleHigh : clamped >= 33 ? colors.scaleMid : colors.scaleLow;
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
