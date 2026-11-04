import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ordinal } from '@/lib/format';
import { percentileColor, radius, spacing } from '@/theme/tokens';
import { useChartColors, useColors, useScheme } from '@/theme/useTokens';

import type { FactorRow } from './analysis';

const BAR = 6;
const Z_CAP = 2.5;

type Props = {
  sides: { side: 'Offense' | 'Defense'; rows: FactorRow[] }[];
  teams: number;
};

/**
 * "Where do they win and lose?" Dean Oliver's four factors on each end,
 * each as a bar from the league average: right is better, and the length is
 * how far it sits from average compared with the other teams.
 */
export function FourFactors({ sides, teams }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {sides.map(({ side, rows }) => (
        <View key={side} style={styles.side}>
          <AppText variant="kicker" color="textSecondary">
            {side}
          </AppText>
          {rows.map((r) => (
            <FactorBar key={r.id} row={r} teams={teams} />
          ))}
        </View>
      ))}
    </View>
  );
}

function show(row: FactorRow, v: number): string {
  return row.unit === 'percent' ? `${v.toFixed(1)}%` : v.toFixed(1);
}

function FactorBar({ row, teams }: { row: FactorRow; teams: number }) {
  const colors = useColors();
  const cc = useChartColors();
  const scheme = useScheme();
  const better = row.rank == null ? 50 : ((teams - row.rank) / Math.max(1, teams - 1)) * 100;
  const share = (Math.abs(row.z) / Z_CAP) * 50;
  const verdict = Math.abs(row.z) < 0.25 ? 'about average' : row.z > 0 ? 'better than average' : 'worse than average';
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${row.label}: ${show(row, row.value)}, league ${show(row, row.league)}${row.rank ? `, ${ordinal(row.rank)} of ${teams}` : ''}, ${verdict}`}>
      <View style={styles.top}>
        <AppText variant="small" numberOfLines={1} style={styles.flex}>
          {row.label}
        </AppText>
        <AppText variant="number">{show(row, row.value)}</AppText>
        <AppText variant="caption" color="textSecondary" style={styles.rank}>
          {row.rank ? ordinal(row.rank) : ''}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.line, { backgroundColor: colors.scaleTrack }]} />
        <View
          style={[
            styles.bar,
            {
              backgroundColor: percentileColor(scheme, better),
              width: `${share}%`,
              ...(row.z >= 0 ? { left: '50%' } : { right: '50%' }),
            },
          ]}
        />
        <View style={[styles.mid, { backgroundColor: cc.axis }]} />
      </View>
      <AppText variant="caption" color="textSecondary">
        League {show(row, row.league)} · about {row.weight} of what decides games
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg },
  side: { gap: spacing.md },
  flex: { flex: 1 },
  row: { gap: spacing.xs },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  rank: { width: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
  track: { height: 12, justifyContent: 'center' },
  line: { height: 2, borderRadius: 1 },
  bar: { position: 'absolute', height: BAR, top: (12 - BAR) / 2, borderRadius: BAR / 2 },
  mid: { position: 'absolute', left: '50%', width: 1.5, marginLeft: -0.75, top: 0, height: 12 },
});
