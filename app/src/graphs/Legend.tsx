import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { groupNoun, POSITION_GROUPS } from '@/stats/views';
import { spacing } from '@/theme/tokens';
import { useChartColors } from '@/theme/useTokens';

/** A legend dot. Text beside it stays in text colors; the dot carries the identity. */
export function Swatch({ color }: { color: string }) {
  return <View style={[styles.swatch, { backgroundColor: color }]} />;
}

/** The key for dots colored by position group (guards, forwards, centers). */
export function PositionLegend() {
  const cc = useChartColors();
  return (
    <View style={styles.legend}>
      {POSITION_GROUPS.map((g) => (
        <View key={g} style={styles.item}>
          <Swatch color={cc.positions[g]} />
          <AppText variant="caption">{groupNoun(g).replace(/^./, (c) => c.toUpperCase())}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 10, height: 10, borderRadius: 5 },
});
