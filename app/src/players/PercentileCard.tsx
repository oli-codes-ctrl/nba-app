import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { formatStat, ordinal } from '@/lib/format';
import { CATALOG } from '@/stats/catalog';
import { percentileColor, radius, spacing } from '@/theme/tokens';
import { useChartColors, useColors, useScheme } from '@/theme/useTokens';

import { CARD_SECTIONS, ELITE, type CardInsights, type CardRow } from './card';

const RING = 30;
const BAND = 6;
const LIST = 3;

type Props = {
  title: string;
  /** Who he is compared with, e.g. "132 qualified guards". */
  poolText: string;
  through: string;
  rows: readonly CardRow[];
  insights: CardInsights;
  onOpen: (row: CardRow) => void;
};

/**
 * Savant-style percentile card. Each stat is a ring at his percentile on a
 * 0-100 line (right is better), colored cold to hot; the thick part of the
 * line is where his rank could sit allowing for luck. Roles (usage) get a
 * gray ring: more is neither good nor bad.
 */
export function PercentileCard({ title, poolText, through, rows, insights, onOpen }: Props) {
  const colors = useColors();
  const byStat = new Map(rows.map((r) => [r.stat, r]));
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.head}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="caption" color="textSecondary">
          Percentiles among {poolText} · games through {through}
        </AppText>
      </View>

      <Answer insights={insights} />

      {CARD_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <AppText variant="kicker" color="textSecondary">
            {section.title}
          </AppText>
          {section.rows.map(({ stat }) => {
            const row = byStat.get(stat);
            return row ? <Row key={stat} row={row} onPress={() => onOpen(row)} /> : null;
          })}
        </View>
      ))}

      <AppText variant="caption" color="textSecondary">
        Each ring is his percentile: 100 is best, and for turnovers fewer counts as better. The thick line is
        where his rank could sit allowing for luck (95%). Usage is a role, so it gets no color. Tap a stat to see
        everyone.
      </AppText>
    </View>
  );
}

function list(rows: readonly CardRow[]): string {
  return rows
    .slice(0, LIST)
    .map((r) => r.label)
    .join(', ');
}

/** The answer first: what the ranges let us say for sure. */
function Answer({ insights }: { insights: CardInsights }) {
  const { elite, weak, unsettled } = insights;
  const lines: { kicker: string; text: string }[] = [];
  if (elite.length) lines.push({ kicker: 'Elite', text: list(elite) });
  if (weak.length) lines.push({ kicker: 'Weak spot', text: list(weak) });
  if (unsettled.length) {
    lines.push({
      kicker: 'Not settled',
      text: unsettled
        .slice(0, LIST)
        .map((r) => `${r.label} (${ordinal(Math.round(r.better ?? 0))})`)
        .join(', '),
    });
  }
  return (
    <View style={styles.answer} accessibilityRole="summary">
      {!elite.length && !weak.length ? (
        <AppText variant="small">
          Nothing is clearly elite or weak yet: every range still reaches the middle of the pack.
        </AppText>
      ) : null}
      {lines.map((l) => (
        <View key={l.kicker} style={styles.answerLine}>
          <AppText variant="kicker" color="textSecondary" style={styles.answerKicker}>
            {l.kicker}
          </AppText>
          <AppText variant="bodyStrong" style={styles.flex}>
            {l.text}
          </AppText>
        </View>
      ))}
      {lines.length > 0 && (
        <AppText variant="caption" color="textSecondary">
          {elite.length || weak.length
            ? `Elite and weak spots hold even allowing for luck: his whole range ranks in the top or bottom ${100 - ELITE}%. `
            : ''}
          {unsettled.length ? 'Not settled: top or bottom 10% so far, but it could still be luck.' : ''}
        </AppText>
      )}
    </View>
  );
}

function Row({ row, onPress }: { row: CardRow; onPress: () => void }) {
  const colors = useColors();
  const cc = useChartColors();
  const scheme = useScheme();
  const def = CATALOG[row.stat];
  const ranked = row.better != null;
  const ring = row.neutral || !ranked ? colors.textSecondary : percentileColor(scheme, row.better!);
  const spoken =
    `${row.label}: ${formatStat(row.stat, row.value)}` +
    (ranked
      ? `, ${row.neutral ? 'higher' : 'better'} than ${Math.round(row.better!)} percent` +
        (row.band
          ? `; allowing for luck, between the ${ordinal(Math.round(row.band[0]))} and ${ordinal(Math.round(row.band[1]))} percentile`
          : '')
      : ', not ranked yet');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint="Shows where he ranks among every qualified player"
      disabled={!def.ranked}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <AppText variant="small" numberOfLines={1} style={styles.label}>
        {row.label}
      </AppText>
      <View style={styles.track}>
        <View style={[styles.line, { backgroundColor: colors.scaleTrack }]} />
        <View style={styles.inner} pointerEvents="none">
          <View style={[styles.mid, { backgroundColor: cc.axis }]} />
          {ranked && row.band && (
            <View
              style={[
                styles.band,
                {
                  left: `${row.band[0]}%`,
                  width: `${Math.max(0, row.band[1] - row.band[0])}%`,
                  backgroundColor: ring,
                },
              ]}
            />
          )}
          {ranked ? (
            <View style={[styles.ring, { left: `${row.better}%`, borderColor: ring, backgroundColor: colors.surface }]}>
              <AppText variant="caption" style={styles.ringText}>
                {Math.round(row.better!)}
              </AppText>
            </View>
          ) : null}
        </View>
        {!ranked && (
          <AppText variant="caption" color="textSecondary" style={styles.unranked}>
            Not ranked yet
          </AppText>
        )}
      </View>
      <AppText variant="number" style={styles.value}>
        {formatStat(row.stat, row.value)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  head: { gap: 2 },
  flex: { flex: 1 },
  answer: { gap: spacing.xs },
  answerLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  answerKicker: { width: 112 },
  section: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  pressed: { opacity: 0.6 },
  label: { width: 112 },
  value: { width: 56, textAlign: 'right' },
  track: { flex: 1, height: RING, justifyContent: 'center' },
  line: { height: 2, borderRadius: 1 },
  // Positions inside are percentages of the 0-100 line, inset so a ring at
  // either end stays inside the track.
  inner: { position: 'absolute', left: RING / 2, right: RING / 2, top: 0, bottom: 0 },
  mid: { position: 'absolute', left: '50%', width: 1, marginLeft: -0.5, top: RING / 2 - 5, height: 10 },
  band: { position: 'absolute', top: (RING - BAND) / 2, height: BAND, borderRadius: BAND / 2 },
  ring: {
    position: 'absolute',
    top: 0,
    width: RING,
    height: RING,
    marginLeft: -RING / 2,
    borderRadius: RING / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  unranked: { position: 'absolute', alignSelf: 'center' },
});
