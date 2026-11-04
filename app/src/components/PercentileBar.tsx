import { StyleSheet, View } from 'react-native';

import { percentileColor, radius } from '@/theme/tokens';
import { useColors, useScheme } from '@/theme/useTokens';

const MARKER = 12;

/**
 * Where a player ranks, 0-100.
 * - Performance stats: a bar filled to "better than X%", colored on the
 *   cold-to-hot scale (blue below average, gray around it, orange above).
 * - Neutral stats (roles and volumes, where more is neither good nor bad):
 *   a dot marking where he sits on the line, with no color judgment.
 */
export function PercentileBar({ value, neutral = false }: { value: number; neutral?: boolean }) {
  const colors = useColors();
  const scheme = useScheme();
  const clamped = Math.max(0, Math.min(100, value));
  if (neutral) {
    return (
      <View style={styles.markerTrack}>
        <View style={[styles.line, { backgroundColor: colors.scaleTrack }]} />
        <View
          style={[
            styles.marker,
            {
              left: `${clamped}%`,
              backgroundColor: colors.textSecondary,
              borderColor: colors.surface,
            },
          ]}
        />
      </View>
    );
  }
  return (
    <View style={[styles.track, { backgroundColor: colors.scaleTrack }]}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: percentileColor(scheme, clamped) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: radius.pill },
  // The dot is centered on its value, so the line leaves room at both ends.
  markerTrack: { flex: 1, height: MARKER, justifyContent: 'center', marginHorizontal: MARKER / 2 },
  line: { height: 2, borderRadius: 1 },
  marker: {
    position: 'absolute',
    width: MARKER,
    height: MARKER,
    marginLeft: -MARKER / 2,
    borderRadius: MARKER / 2,
    borderWidth: 2,
  },
});
