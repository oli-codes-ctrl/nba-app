import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { betterPct, formatStat, ordinal } from '@/lib/format';
import { CATALOG } from '@/stats/catalog';
import { percentileColor, radius, spacing } from '@/theme/tokens';
import { useChartColors, useColors, useScheme } from '@/theme/useTokens';

import { CARD_SECTIONS, ELITE, type CardInsights, type CardRow } from './card';

const RING = 30;
/** The likely-range bar under each ring. */
const BAND = 4;
const BAND_GAP = 3;
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
 * 0-100 line (right is better), colored cold to hot; the bar under it is
 * where his rank could sit allowing for luck. Roles (usage) get a
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

      <Key />

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
        100 is best; for turnovers, fewer counts as better. A short bar means his rank is settled. Game Score has
        no bar: it adds up too many parts for a simple range. Usage is a role, so it gets no color. Tap a stat to
        see everyone.
      </AppText>
    </View>
  );
}

/** What the two marks mean, before the rows. */
function Key() {
  const colors = useColors();
  return (
    <View style={styles.key} accessible accessibilityLabel="Ring: his percentile. Bar under it: where his rank could sit, allowing for luck.">
      <View style={styles.keyItem}>
        <View style={[styles.keyRing, { borderColor: colors.textSecondary }]} />
        <AppText variant="caption" color="textSecondary">
          His percentile
        </AppText>
      </View>
      <View style={styles.keyItem}>
        <View style={[styles.keyBar, { backgroundColor: colors.textSecondary }]} />
        <AppText variant="caption" color="textSecondary">
          Where it could be, allowing for luck (95%)
        </AppText>
      </View>
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
      ? `, ${row.neutral ? 'higher' : 'better'} than ${betterPct(row.better!)} percent` +
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
          {/* The range sits under the ring, so a settled (short) one still shows as a dash. */}
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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, minHeight: 44, paddingVertical: 2 },
  pressed: { opacity: 0.6 },
  // Label and value centered on the ring (small text has a 20 line height, numbers 22).
  label: { width: 112, marginTop: (RING - 20) / 2 },
  value: { width: 56, textAlign: 'right', marginTop: (RING - 22) / 2 },
  track: { flex: 1, height: RING + BAND_GAP + BAND },
  line: { position: 'absolute', left: 0, right: 0, top: RING / 2 - 1, height: 2, borderRadius: 1 },
  // Positions inside are percentages of the 0-100 line, inset so a ring at
  // either end stays inside the track.
  inner: { position: 'absolute', left: RING / 2, right: RING / 2, top: 0, bottom: 0 },
  mid: { position: 'absolute', left: '50%', width: 1, marginLeft: -0.5, top: RING / 2 - 5, height: 10 },
  band: { position: 'absolute', top: RING + BAND_GAP, height: BAND, minWidth: BAND, borderRadius: BAND / 2 },
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
  key: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  keyRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  keyBar: { width: 18, height: BAND, borderRadius: BAND / 2 },
  unranked: { position: 'absolute', alignSelf: 'center' },
});
