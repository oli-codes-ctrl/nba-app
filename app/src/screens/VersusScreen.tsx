import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import { FirstLoad } from '@/components/DataStatus';
import { PlayerPicker } from '@/components/PlayerPicker';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import { updateCareer } from '@/game/storage';
import { useTrophies } from '@/game/TrophyProvider';
import { betterPct, betterThan, formatStat } from '@/lib/format';
import { usePlayerLink } from '@/lib/usePlayerLink';
import { clearTally, tally, versusRows, versusShareText, type Side, type VersusRow } from '@/players/versus';
import { shortName } from '@/graphs/analysis';
import { CATALOG } from '@/stats/catalog';
import { radius, spacing } from '@/theme/tokens';
import { useChartColors, useColors } from '@/theme/useTokens';

export default function VersusScreen() {
  const params = useLocalSearchParams<{ a?: string; b?: string }>();
  const { snapshot, playerById } = useData();
  const colors = useColors();
  const openPlayer = usePlayerLink();
  const { check } = useTrophies();
  const [picking, setPicking] = useState<Side | null>(null);

  const a = params.a ? playerById.get(Number(params.a)) : undefined;
  const b = params.b ? playerById.get(Number(params.b)) : undefined;
  const rules = snapshot?.players.minAttempts;
  const rows = useMemo(() => (a && b ? versusRows(a, b, rules) : []), [a, b, rules]);
  const pairKey = a && b ? `${a.id}-${b.id}` : null;

  // Count each matchup toward the Debate Club trophy.
  useEffect(() => {
    if (!pairKey) return;
    updateCareer(AsyncStorage, (c) => ({ ...c, versusViews: c.versusViews + 1 })).then(() => check());
  }, [pairKey, check]);

  if (!snapshot) return <FirstLoad />;
  const players = snapshot.players.players;
  const t = tally(rows);
  const c = clearTally(rows);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.heads}>
        <Head player={a} label="Player 1" onChange={() => setPicking('a')} onOpen={openPlayer} />
        <AppText variant="small" color="textSecondary">
          vs.
        </AppText>
        <Head player={b} label="Player 2" onChange={() => setPicking('b')} onOpen={openPlayer} />
      </View>

      {a && b ? (
        <>
          <View style={[styles.tally, { backgroundColor: colors.surface }]}>
            <AppText variant="large" style={styles.tabular}>
              {t.a} – {t.b}
            </AppText>
            <AppText color="textSecondary" style={styles.center}>
              {t.a === t.b
                ? `Dead even across ${rows.length} stats.`
                : `${t.a > t.b ? a.name : b.name} leads in ${Math.max(t.a, t.b)} of ${rows.length} stats.`}
            </AppText>
            <AppText variant="bodyStrong" style={styles.center}>
              Clear edges allowing for luck: {shortName(a.name)} {c.a}, {shortName(b.name)} {c.b}.
              {c.close ? ` ${c.close} too close to call.` : ''}
            </AppText>
          </View>

          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            <View style={styles.legend} accessible accessibilityLabel={`Filled dot: ${a.name}. Ring: ${b.name}.`}>
              <View style={styles.legendItem}>
                <Glyph side="a" />
                <AppText variant="caption">{shortName(a.name)}</AppText>
              </View>
              <View style={styles.legendItem}>
                <Glyph side="b" />
                <AppText variant="caption">{shortName(b.name)}</AppText>
              </View>
              <AppText variant="caption" color="textSecondary" style={styles.legendNote}>
                Percentile · right is better
              </AppText>
            </View>
            {rows.map((r) => (
              <Row key={r.stat} row={r} a={a} b={b} />
            ))}
          </View>
          <AppText variant="caption" color="textSecondary" style={styles.center}>
            Dots show where each ranks among qualified players, so stats with different units line up. For
            turnovers, fewer wins. An edge is clear when the gap holds allowing for luck (95%); shooting
            percentages only count with enough attempts.
          </AppText>

          <View style={styles.actions}>
            <PrimaryButton
              label="Share"
              style={styles.flex}
              onPress={() => Share.share({ message: versusShareText(a, b, rows) })}
            />
            <SecondaryButton
              label="Swap sides"
              style={styles.flex}
              onPress={() => router.setParams({ a: String(b.id), b: String(a.id) })}
            />
          </View>
        </>
      ) : (
        <View style={[styles.tally, { backgroundColor: colors.surface }]}>
          <AppText color="textSecondary" style={styles.center}>
            Pick two players to see who wins each stat.
          </AppText>
          <PrimaryButton label={a ? 'Pick a second player' : 'Pick a player'} onPress={() => setPicking(a ? 'b' : 'a')} />
        </View>
      )}

      <PlayerPicker
        visible={picking != null}
        title={picking === 'a' ? 'Pick player 1' : 'Pick player 2'}
        players={players}
        excludeId={picking === 'a' ? b?.id : a?.id}
        onSelect={(id) => router.setParams(picking === 'a' ? { a: String(id) } : { b: String(id) })}
        onClose={() => setPicking(null)}
      />
    </ScrollView>
  );
}

function Head({
  player,
  label,
  onChange,
  onOpen,
}: {
  player: Player | undefined;
  label: string;
  onChange: () => void;
  onOpen: (id: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.head, { backgroundColor: colors.surface }]}>
      {player ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${player.name}`} onPress={() => onOpen(player.id)} style={styles.headTop}>
          <AppText variant="bodyStrong" numberOfLines={2} style={styles.center}>
            {player.name}
          </AppText>
          <TeamChip abbr={player.team} />
        </Pressable>
      ) : (
        <AppText color="textSecondary">{label}</AppText>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={`Change ${label}`} onPress={onChange} hitSlop={8}>
        <AppText variant="small" color="accent" style={styles.bold}>
          {player ? 'Change' : 'Pick'}
        </AppText>
      </Pressable>
    </View>
  );
}

const DOT = 12;
const RING = 16;

/** Player 1 is a filled dot, player 2 a ring: told apart by shape, in text color. */
function Glyph({ side, size = 10 }: { side: Side; size?: number }) {
  const colors = useColors();
  return side === 'a' ? (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.text }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.text }} />
  );
}

function Row({ row, a, b }: { row: VersusRow; a: Player; b: Player }) {
  const colors = useColors();
  const cc = useChartColors();
  const def = CATALOG[row.stat];
  const pa = a.pct?.[row.stat];
  const pb = b.pct?.[row.stat];
  const ba = pa == null ? null : betterThan(row.stat, pa);
  const bb = pb == null ? null : betterThan(row.stat, pb);
  const status = row.smallSample
    ? 'too few attempts to score'
    : row.winner === 'tie'
      ? 'tied'
      : row.clear === false
        ? 'too close to call'
        : row.clear === true
          ? `clear edge: ${shortName((row.winner === 'a' ? a : b).name)}`
          : '';
  // Bold only a win that holds (or one with no range to test).
  const strong = (side: Side) => row.winner === side && row.clear !== false;
  const label =
    `${def.label}: ${a.name} ${formatStat(row.stat, row.a)}${ba != null ? `, better than ${betterPct(ba)} percent` : ''}; ` +
    `${b.name} ${formatStat(row.stat, row.b)}${bb != null ? `, better than ${betterPct(bb)} percent` : ''}` +
    (status ? `. ${status}` : '');
  return (
    <View accessible accessibilityLabel={label} style={[styles.row, { borderTopColor: colors.border }]}>
      <AppText variant="caption" color="textSecondary" style={styles.center} numberOfLines={1}>
        {def.label}
        {status ? ` · ${status}` : ''}
      </AppText>
      <View style={styles.rowMain}>
        <View style={styles.valueLeft}>
          <Glyph side="a" size={8} />
          <AppText variant="number" color={strong('a') ? 'text' : 'textSecondary'} style={strong('a') && styles.win}>
            {formatStat(row.stat, row.a)}
          </AppText>
        </View>
        <View style={styles.dotTrack}>
          <View style={[styles.line, { backgroundColor: colors.scaleTrack }]} />
          <View style={styles.inner} pointerEvents="none">
            <View style={[styles.mid, { backgroundColor: cc.axis }]} />
            {bb != null && (
              <View style={[styles.ring, { left: `${bb}%`, borderColor: colors.text, backgroundColor: colors.surface }]} />
            )}
            {ba != null && (
              <View style={[styles.dot, { left: `${ba}%`, backgroundColor: colors.text, borderColor: colors.surface }]} />
            )}
          </View>
        </View>
        <View style={styles.valueRight}>
          <AppText variant="number" color={strong('b') ? 'text' : 'textSecondary'} style={strong('b') && styles.win}>
            {formatStat(row.stat, row.b)}
          </AppText>
          <Glyph side="b" size={8} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  center: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  heads: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  head: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    minHeight: 116,
  },
  headTop: { alignItems: 'center', gap: spacing.xs },
  tally: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  list: { borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendNote: { flex: 1, textAlign: 'right' },
  row: { paddingVertical: spacing.sm, gap: 4, borderTopWidth: StyleSheet.hairlineWidth },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  valueLeft: { width: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  valueRight: { width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs },
  win: { fontWeight: '800' },
  dotTrack: { flex: 1, height: RING, justifyContent: 'center' },
  line: { height: 2, borderRadius: 1 },
  // Positions are percentages of the 0-100 line, inset so end dots stay inside.
  inner: { position: 'absolute', left: RING / 2, right: RING / 2, top: 0, bottom: 0 },
  mid: { position: 'absolute', left: '50%', width: 1, marginLeft: -0.5, top: 2, height: RING - 4 },
  ring: { position: 'absolute', top: 0, width: RING, height: RING, marginLeft: -RING / 2, borderRadius: RING / 2, borderWidth: 2 },
  dot: {
    position: 'absolute',
    top: (RING - DOT) / 2,
    width: DOT,
    height: DOT,
    marginLeft: -DOT / 2,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
