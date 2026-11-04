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
import { betterThan, formatStat } from '@/lib/format';
import { usePlayerLink } from '@/lib/usePlayerLink';
import { tally, versusRows, versusShareText, type Side, type VersusRow } from '@/players/versus';
import { CATALOG } from '@/stats/catalog';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTokens';

export default function VersusScreen() {
  const params = useLocalSearchParams<{ a?: string; b?: string }>();
  const { snapshot, playerById } = useData();
  const colors = useColors();
  const openPlayer = usePlayerLink();
  const { check } = useTrophies();
  const [picking, setPicking] = useState<Side | null>(null);

  const a = params.a ? playerById.get(Number(params.a)) : undefined;
  const b = params.b ? playerById.get(Number(params.b)) : undefined;
  const rows = useMemo(() => (a && b ? versusRows(a, b) : []), [a, b]);
  const pairKey = a && b ? `${a.id}-${b.id}` : null;

  // Count each matchup toward the Debate Club trophy.
  useEffect(() => {
    if (!pairKey) return;
    updateCareer(AsyncStorage, (c) => ({ ...c, versusViews: c.versusViews + 1 })).then(() => check());
  }, [pairKey, check]);

  if (!snapshot) return <FirstLoad />;
  const players = snapshot.players.players;
  const t = tally(rows);

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
          </View>

          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            {rows.map((r, i) => (
              <Row key={r.stat} row={r} a={a} b={b} first={i === 0} />
            ))}
          </View>
          <AppText variant="caption" color="textSecondary" style={styles.center}>
            Bars show where each ranks among qualified players. For turnovers, fewer wins.
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

function Row({ row, a, b, first }: { row: VersusRow; a: Player; b: Player; first: boolean }) {
  const colors = useColors();
  const def = CATALOG[row.stat];
  const pa = a.pct?.[row.stat];
  const pb = b.pct?.[row.stat];
  const ba = pa == null ? null : betterThan(row.stat, pa);
  const bb = pb == null ? null : betterThan(row.stat, pb);
  const label = `${def.label}: ${a.name} ${formatStat(row.stat, row.a)}, ${b.name} ${formatStat(row.stat, row.b)}${
    row.winner === 'a' ? `, ${a.name} leads` : row.winner === 'b' ? `, ${b.name} leads` : ''
  }`;
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.row, !first && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <AppText variant="caption" color="textSecondary" style={styles.center} numberOfLines={1}>
        {def.label}
      </AppText>
      <View style={styles.rowMain}>
        <AppText
          variant="number"
          color={row.winner === 'b' ? 'textSecondary' : 'text'}
          style={[styles.value, row.winner === 'a' && styles.win]}>
          {row.winner === 'a' ? '◆ ' : ''}
          {formatStat(row.stat, row.a)}
        </AppText>
        <View style={styles.bars}>
          <MirrorBar value={ba} side="left" lead={row.winner === 'a'} />
          <MirrorBar value={bb} side="right" lead={row.winner === 'b'} />
        </View>
        <AppText
          variant="number"
          color={row.winner === 'a' ? 'textSecondary' : 'text'}
          style={[styles.value, styles.right, row.winner === 'b' && styles.win]}>
          {formatStat(row.stat, row.b)}
          {row.winner === 'b' ? ' ◆' : ''}
        </AppText>
      </View>
    </View>
  );
}

function MirrorBar({ value, side, lead }: { value: number | null; side: 'left' | 'right'; lead: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.track, { backgroundColor: colors.scaleTrack, flexDirection: side === 'left' ? 'row-reverse' : 'row' }]}>
      {value != null && (
        <View
          style={{
            width: `${Math.max(2, Math.round(value))}%`,
            backgroundColor: lead ? colors.accent : colors.textSecondary,
            borderRadius: 3,
          }}
        />
      )}
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
  list: { borderRadius: radius.lg, paddingHorizontal: spacing.md },
  row: { paddingVertical: spacing.sm, gap: 4 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  value: { width: 72 },
  right: { textAlign: 'right' },
  win: { fontWeight: '800' },
  bars: { flex: 1, flexDirection: 'row', gap: 4 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
