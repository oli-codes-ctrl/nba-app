import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { FirstLoad } from '@/components/DataStatus';
import { PercentileBar } from '@/components/PercentileBar';
import { PlayerPicker } from '@/components/PlayerPicker';
import { Segmented } from '@/components/Segmented';
import { StatPicker } from '@/components/StatPicker';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import { classBreaks, countRanges, type ChartPoint } from '@/graphs/math';
import { buildPoints, GRAPH_MODES, leftOut, type GraphMode } from '@/graphs/points';
import { RAMP_CLASSES, ScatterChart, useChartScales } from '@/graphs/ScatterChart';
import { minimumsText } from '@/stats/samples';
import { betterThan, formatStat, rankText } from '@/lib/format';
import { CATALOG, isStatId, type StatId } from '@/stats/catalog';
import { radius, spacing } from '@/theme/tokens';
import { useChartColors, useColors } from '@/theme/useTokens';

type PickerTarget = 'x' | 'y' | 'z' | 'player' | null;

const MIN_BINS = 3;
const MAX_BINS = 12;

type GraphParams = { x?: string; y?: string; z?: string; mode?: string; player?: string };

function statParam(value: string | undefined, fallback: StatId): StatId {
  return value && isStatId(value) ? value : fallback;
}

export default function GraphsScreen() {
  const { snapshot, playerById } = useData();
  const colors = useColors();
  // Links like /graphs?y=ts_pct&x=mpg&mode=color&z=age&player=3945274 set the starting view.
  const params = useLocalSearchParams<GraphParams>();
  const [x, setX] = useState<StatId>(() => statParam(params.x, 'age'));
  const [y, setY] = useState<StatId>(() => statParam(params.y, 'pts'));
  const [z, setZ] = useState<StatId>(() => statParam(params.z, 'reb'));
  const [mode, setMode] = useState<GraphMode>(() =>
    GRAPH_MODES.some((m) => m.id === params.mode) ? (params.mode as GraphMode) : 'trend',
  );
  const [bins, setBins] = useState({ nx: 6, ny: 6 });
  const [highlightId, setHighlightId] = useState<number | null>(() =>
    params.player && /^\d+$/.test(params.player) ? Number(params.player) : null,
  );
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [showList, setShowList] = useState(false);

  const players = snapshot?.players.players;
  const rules = snapshot?.players.minAttempts;
  const points = useMemo(
    () => (players ? buildPoints(players, x, y, mode === 'color' ? z : null, rules) : []),
    [players, x, y, z, mode, rules],
  );
  const scales = useChartScales(points, mode, bins);

  if (!snapshot || !players) return <FirstLoad />;

  const highlight = highlightId == null ? undefined : playerById.get(highlightId);
  const highlightOnChart = highlight != null && points.some((p) => p.id === highlight.id);
  const modeInfo = GRAPH_MODES.find((m) => m.id === mode)!;
  const used = mode === 'color' ? [x, y, z] : [x, y];
  const missing = leftOut(players, used, rules);
  const under = minimumsText(used, rules);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      {/* One control area above the chart scopes everything below it. */}
      <View style={styles.controls}>
        <View style={styles.axisRow}>
          <PickerButton label="Y axis" value={CATALOG[y].short} onPress={() => setPicker('y')} />
          <PickerButton label="X axis" value={CATALOG[x].short} onPress={() => setPicker('x')} />
          {mode === 'color' && (
            <PickerButton label="Color by" value={CATALOG[z].short} onPress={() => setPicker('z')} />
          )}
        </View>
        <Segmented
          options={GRAPH_MODES.map((m) => ({ id: m.id, label: m.label }))}
          value={mode}
          onChange={setMode}
        />
        {mode === 'density' && (
          <View style={styles.axisRow}>
            <Stepper
              label="Columns"
              value={bins.nx}
              onChange={(nx) => setBins((b) => ({ ...b, nx }))}
            />
            <Stepper label="Rows" value={bins.ny} onChange={(ny) => setBins((b) => ({ ...b, ny }))} />
          </View>
        )}
        <View style={[styles.highlightRow, { backgroundColor: colors.surface }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={highlight ? `Highlighted: ${highlight.name}. Change` : 'Highlight a player'}
            onPress={() => setPicker('player')}
            style={styles.highlightButton}>
            <AppText variant="small" color="textSecondary">
              Highlight
            </AppText>
            <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
              {highlight ? highlight.name : 'Choose a player'}
            </AppText>
          </Pressable>
          {highlight && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear highlighted player"
              onPress={() => setHighlightId(null)}
              style={styles.clearButton}>
              <AppText variant="small" color="accent">
                Clear
              </AppText>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.titleBlock}>
        <AppText variant="title">
          {CATALOG[y].label} vs. {CATALOG[x].label.toLowerCase()}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {points.length} qualified players
          {missing.smallSample > 0 && under ? ` · ${missing.smallSample} left out with ${under}` : ''}
          {missing.noValue > 0 ? ` · ${missing.noValue} without a value left out` : ''}. {modeInfo.help}
        </AppText>
      </View>

      <ScatterChart
        points={points}
        mode={mode}
        xStat={x}
        yStat={y}
        bins={bins}
        highlightId={highlightOnChart ? highlightId : null}
        onSelect={setHighlightId}
      />

      <Legend mode={mode} z={z} zd={scales.zd} maxBinCount={scales.maxBinCount} />

      {highlight && (
        <SelectedCard
          player={highlight}
          stats={mode === 'color' ? [y, x, z] : [y, x]}
          poolSize={snapshot.players.poolSize}
          onChart={highlightOnChart}
        />
      )}
      {!highlight && (
        <AppText variant="small" color="textSecondary">
          Tap the chart to pick the nearest player and see their numbers and percentiles.
        </AppText>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showList }}
        onPress={() => setShowList((v) => !v)}
        style={[styles.listToggle, { borderColor: colors.border }]}>
        <AppText variant="bodyStrong" color="accent">
          {showList ? 'Hide values' : 'Show values as a list'}
        </AppText>
      </Pressable>
      {showList && (
        <ValueTable
          points={points}
          x={x}
          y={y}
          z={mode === 'color' ? z : null}
          onSelect={setHighlightId}
          selectedId={highlightId}
        />
      )}

      <StatPicker
        visible={picker === 'x' || picker === 'y' || picker === 'z'}
        title={picker === 'x' ? 'X axis' : picker === 'y' ? 'Y axis' : 'Color by'}
        selected={picker === 'x' ? x : picker === 'y' ? y : z}
        onSelect={(id) => (picker === 'x' ? setX(id) : picker === 'y' ? setY(id) : setZ(id))}
        onClose={() => setPicker(null)}
      />
      <PlayerPicker
        visible={picker === 'player'}
        players={players}
        onSelect={setHighlightId}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
}

function PickerButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Change`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickerButton,
        { backgroundColor: pressed ? colors.border : colors.surface },
      ]}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value} ▾</AppText>
    </Pressable>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const colors = useColors();
  const step = (d: number) => onChange(Math.max(MIN_BINS, Math.min(MAX_BINS, value + d)));
  return (
    <View
      style={[styles.stepper, { backgroundColor: colors.surface }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      <AppText variant="caption" color="textSecondary" style={styles.flex}>
        {label}
      </AppText>
      <Pressable hitSlop={8} onPress={() => step(-1)} disabled={value <= MIN_BINS} style={styles.stepButton}>
        <AppText variant="title" color={value <= MIN_BINS ? 'textSecondary' : 'accent'}>
          −
        </AppText>
      </Pressable>
      <AppText variant="number" style={styles.stepValue}>
        {value}
      </AppText>
      <Pressable hitSlop={8} onPress={() => step(1)} disabled={value >= MAX_BINS} style={styles.stepButton}>
        <AppText variant="title" color={value >= MAX_BINS ? 'textSecondary' : 'accent'}>
          +
        </AppText>
      </Pressable>
    </View>
  );
}

function Swatch({ color, round = true }: { color: string; round?: boolean }) {
  return <View style={[styles.swatch, { backgroundColor: color, borderRadius: round ? 6 : 2 }]} />;
}

function Legend({
  mode,
  z,
  zd,
  maxBinCount,
}: {
  mode: GraphMode;
  z: StatId;
  zd: readonly [number, number] | null;
  maxBinCount: number;
}) {
  const cc = useChartColors();
  if (mode === 'trend') {
    return (
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Swatch color={cc.aboveTrend} />
          <AppText variant="caption">Above the line</AppText>
        </View>
        <View style={styles.legendItem}>
          <Swatch color={cc.belowTrend} />
          <AppText variant="caption">Below the line</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.lineSwatch, { backgroundColor: cc.trendLine }]} />
          <AppText variant="caption">Best fit</AppText>
        </View>
      </View>
    );
  }
  if (mode === 'color') {
    if (!zd) return null;
    const breaks = classBreaks(zd, RAMP_CLASSES);
    return (
      <View style={styles.legendBlock}>
        <AppText variant="caption" color="textSecondary">
          {CATALOG[z].label}
        </AppText>
        <View style={styles.legend}>
          {cc.ramp.map((color, i) => (
            <View key={color} style={styles.legendItem}>
              <Swatch color={color} />
              <AppText variant="caption">
                {formatStat(z, breaks[i])}–{formatStat(z, breaks[i + 1])}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    );
  }
  const ranges = countRanges(maxBinCount, RAMP_CLASSES);
  return (
    <View style={styles.legendBlock}>
      <AppText variant="caption" color="textSecondary">
        Players per square
      </AppText>
      <View style={styles.legend}>
        {ranges.map((r, i) =>
          r ? (
            <View key={cc.ramp[i]} style={styles.legendItem}>
              <Swatch color={cc.ramp[i]} round={false} />
              <AppText variant="caption">{r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`}</AppText>
            </View>
          ) : null,
        )}
      </View>
    </View>
  );
}

function SelectedCard({
  player,
  stats,
  poolSize,
  onChart,
}: {
  player: Player;
  stats: StatId[];
  poolSize: Partial<Record<StatId, number>>;
  onChart: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
          {player.name}
        </AppText>
        <TeamChip abbr={player.team} />
      </View>
      {!onChart && (
        <AppText variant="caption" color="textSecondary">
          Not on this chart: missing a value for one of these stats.
        </AppText>
      )}
      {stats.map((id) => {
        const pct = player.pct?.[id];
        const rank = player.rank?.[id];
        const pool = poolSize[id];
        return (
          <View key={id} style={styles.cardStat}>
            <View style={styles.cardStatTop}>
              <AppText variant="small" style={styles.flex}>
                {CATALOG[id].label}
              </AppText>
              <AppText variant="number">{formatStat(id, player.s[id])}</AppText>
            </View>
            {pct != null && (
              <View style={styles.cardStatBottom}>
                <PercentileBar value={betterThan(id, pct)} neutral={CATALOG[id].neutral} />
                <AppText variant="caption" color="textSecondary" style={styles.rank}>
                  {rank != null && pool ? rankText(id, rank, pool) : ''}
                </AppText>
              </View>
            )}
          </View>
        );
      })}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/graphs/player/[id]', params: { id: String(player.id) } })}>
        <AppText variant="bodyStrong" color="accent">
          Open player page
        </AppText>
      </Pressable>
    </View>
  );
}

function ValueTable({
  points,
  x,
  y,
  z,
  onSelect,
  selectedId,
}: {
  points: readonly ChartPoint[];
  x: StatId;
  y: StatId;
  z: StatId | null;
  onSelect: (id: number) => void;
  selectedId: number | null;
}) {
  const colors = useColors();
  const sorted = useMemo(
    () => [...points].sort((a, b) => b.y - a.y || a.name.localeCompare(b.name)),
    [points],
  );
  return (
    <View style={[styles.table, { borderColor: colors.border }]}>
      <View style={[styles.tableRow, { backgroundColor: colors.surface }]}>
        <AppText variant="caption" color="textSecondary" style={styles.flex}>
          Player
        </AppText>
        {[y, x, ...(z ? [z] : [])].map((id) => (
          <AppText key={id} variant="caption" color="textSecondary" style={styles.tableNum}>
            {CATALOG[id].short}
          </AppText>
        ))}
      </View>
      {sorted.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          onPress={() => onSelect(p.id)}
          style={[
            styles.tableRow,
            { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
            p.id === selectedId && { backgroundColor: colors.surface },
          ]}>
          <AppText variant="small" style={styles.flex} numberOfLines={1}>
            {p.name}
          </AppText>
          <AppText variant="small" style={styles.tableNum}>
            {formatStat(y, p.y)}
          </AppText>
          <AppText variant="small" style={styles.tableNum}>
            {formatStat(x, p.x)}
          </AppText>
          {z && (
            <AppText variant="small" style={styles.tableNum}>
              {formatStat(z, p.z)}
            </AppText>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  controls: { gap: spacing.sm },
  axisRow: { flexDirection: 'row', gap: spacing.sm },
  pickerButton: { flex: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  stepButton: { paddingHorizontal: spacing.xs },
  stepValue: { minWidth: 20, textAlign: 'center' },
  highlightRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md },
  highlightButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  clearButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  titleBlock: { gap: spacing.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs },
  legendBlock: { gap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  swatch: { width: 12, height: 12 },
  lineSwatch: { width: 16, height: 2 },
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardStat: { gap: spacing.xs },
  cardStatTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  cardStatBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rank: { minWidth: 96, textAlign: 'right', fontVariant: ['tabular-nums'] },
  listToggle: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  table: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  tableNum: { width: 56, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
