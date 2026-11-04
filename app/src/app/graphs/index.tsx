import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { FirstLoad } from '@/components/DataStatus';
import { PercentileBar } from '@/components/PercentileBar';
import { PlayerPicker } from '@/components/PlayerPicker';
import { Segmented } from '@/components/Segmented';
import { StatPicker } from '@/components/StatPicker';
import { TeamChip } from '@/components/TeamChip';
import { useData } from '@/data/DataProvider';
import type { Player } from '@/data/types';
import {
  describeRelationship,
  median,
  pearson,
  quadrantCounts,
  quadrantExemplars,
  sharedInputs,
  shortName,
  thinSamples,
  type QuadrantKey,
} from '@/graphs/analysis';
import { classBreaks, classIndex, extent, linearFit, type ChartPoint } from '@/graphs/math';
import { buildPoints, chartColumns, leftOut } from '@/graphs/points';
import { CUSTOM_ID, PRESETS, presetById } from '@/graphs/presets';
import { ScatterChart } from '@/graphs/ScatterChart';
import { betterThan, formatDate, formatStat, rankText } from '@/lib/format';
import { CATALOG, isStatId, type StatId } from '@/stats/catalog';
import { minimumsText } from '@/stats/samples';
import { groupNoun, POSITION_GROUPS, type PositionGroup } from '@/stats/views';
import { radius, spacing } from '@/theme/tokens';
import { useChartColors, useColors } from '@/theme/useTokens';

const MAX_HIGHLIGHTS = 3;
const EXAMPLE_LABELS = 4;
const RAMP_CLASSES = 5;

type PickerTarget = 'x' | 'y' | 'z' | 'player' | null;
type PositionFilter = 'all' | PositionGroup;
type ColorMode = 'position' | 'stat';

/**
 * Links set the starting view, e.g. /graphs?preset=efficiency&hl=3975,6442,
 * or a custom chart: /graphs?x=age&y=pts&color=stat&z=reb.
 */
type GraphParams = {
  preset?: string;
  x?: string;
  y?: string;
  z?: string;
  color?: string;
  hl?: string;
  player?: string;
  pos?: string;
};

function statParam(value: string | undefined, fallback: StatId): StatId {
  return value && isStatId(value) ? value : fallback;
}

function idsParam(value: string | undefined): number[] {
  return (value ?? '')
    .split(',')
    .filter((s) => /^\d+$/.test(s))
    .map(Number)
    .slice(0, MAX_HIGHLIGHTS);
}

const POSITION_OPTIONS: readonly { id: PositionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...POSITION_GROUPS.map((g) => ({ id: g, label: groupNoun(g).replace(/^./, (c) => c.toUpperCase()) })),
];

export default function GraphsScreen() {
  const { snapshot, playerById } = useData();
  const colors = useColors();
  const cc = useChartColors();
  const params = useLocalSearchParams<GraphParams>();

  const [presetId, setPresetId] = useState<string>(() => {
    if (params.preset && (presetById(params.preset) || params.preset === CUSTOM_ID)) return params.preset;
    return params.x || params.y ? CUSTOM_ID : PRESETS[0].id;
  });
  const [cx, setCx] = useState<StatId>(() => statParam(params.x, 'age'));
  const [cy, setCy] = useState<StatId>(() => statParam(params.y, 'pts'));
  const [cz, setCz] = useState<StatId>(() => statParam(params.z, 'reb'));
  const [colorMode, setColorMode] = useState<ColorMode>(params.color === 'stat' ? 'stat' : 'position');
  const [showTrend, setShowTrend] = useState(false);
  const [position, setPosition] = useState<PositionFilter>(() =>
    params.pos === 'G' || params.pos === 'F' || params.pos === 'C' ? params.pos : 'all',
  );
  const [highlights, setHighlights] = useState<number[]>(() => idsParam(params.hl ?? params.player));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [showList, setShowList] = useState(false);

  const preset = presetById(presetId);
  const custom = !preset;
  const x = preset ? preset.x : cx;
  const y = preset ? preset.y : cy;
  const z = custom && colorMode === 'stat' ? cz : null;
  // "Up" means better: lower-is-better stats on the Y axis are drawn flipped.
  const invertY = preset ? !!preset.invertY : CATALOG[y].lowerIsBetter;

  const players = snapshot?.players.players;
  const rules = snapshot?.players.minAttempts;
  const pos = position === 'all' ? null : position;
  const points = useMemo(
    () => (players ? buildPoints(players, x, y, z, rules, pos) : []),
    [players, x, y, z, rules, pos],
  );

  const analysis = useMemo(() => {
    if (points.length < 5) return null;
    const mx = median(points.map((p) => p.x));
    const my = median(points.map((p) => p.y));
    const hollow = thinSamples(points);
    return {
      medians: { x: mx, y: my },
      counts: quadrantCounts(points, mx, my, invertY),
      hollow,
      examples: quadrantExemplars(points, mx, my, invertY, new Set([...hollow, ...highlights])),
      relationship: describeRelationship(points, CATALOG[x].label.toLowerCase(), CATALOG[y].label.toLowerCase()),
      fit: linearFit(points),
      r: pearson(
        points.map((p) => p.x),
        points.map((p) => p.y),
      ),
      zd: z ? extent(points.flatMap((p) => (p.z == null ? [] : [p.z]))) : null,
    };
  }, [points, invertY, highlights, x, y, z]);

  if (!snapshot || !players) return <FirstLoad />;

  const nameOf = (id: number) => playerById.get(id)?.name ?? '';
  const onChart = new Set(points.map((p) => p.id));
  const used = z ? [x, y, z] : [x, y];
  const missing = leftOut(players, used, rules, pos);
  const under = minimumsText(used, rules);
  const noun = pos ? groupNoun(pos) : 'players';
  const through = snapshot.manifest.gamesThrough ?? snapshot.manifest.asOf;
  const shared = custom ? sharedInputs(x, y) : [];

  const colorOf = (p: ChartPoint): string => {
    if (z && analysis?.zd && p.z != null) return cc.ramp[classIndex(p.z, analysis.zd, RAMP_CLASSES)];
    const g = p.group as PositionGroup | undefined;
    return g ? cc.positions[g] : cc.neutral;
  };

  const quadrantLabels: Record<QuadrantKey, string> | null =
    preset && analysis
      ? {
          topRight: `${preset.quadrants.topRight} · ${analysis.counts.topRight}`,
          topLeft: `${preset.quadrants.topLeft} · ${analysis.counts.topLeft}`,
          bottomLeft: `${preset.quadrants.bottomLeft} · ${analysis.counts.bottomLeft}`,
          bottomRight: `${preset.quadrants.bottomRight} · ${analysis.counts.bottomRight}`,
        }
      : null;

  const labels = [
    ...highlights.filter((id) => onChart.has(id)).map((id) => ({ id, text: shortName(nameOf(id)) })),
    ...(analysis?.examples ?? []).slice(0, EXAMPLE_LABELS).map((id) => ({ id, text: shortName(nameOf(id)) })),
  ];

  const title = preset ? preset.question : `${CATALOG[y].label} vs. ${CATALOG[x].label.toLowerCase()}`;
  const selected = selectedId == null ? undefined : playerById.get(selectedId);

  function toggleHighlight(id: number) {
    setHighlights((h) => (h.includes(id) ? h.filter((v) => v !== id) : [...h, id].slice(-MAX_HIGHLIGHTS)));
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      {/* Questions first: each chip is a chart an analyst would draw. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
        {[...PRESETS.map((p) => ({ id: p.id, label: p.label })), { id: CUSTOM_ID, label: 'Custom' }].map((o) => {
          const on = o.id === presetId;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              onPress={() => {
                setPresetId(o.id);
                setSelectedId(null);
              }}
              style={[styles.chip, { backgroundColor: on ? colors.accentFill : colors.surface }]}>
              <AppText variant="small" color={on ? 'textOnAccent' : 'text'} style={styles.bold}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <Segmented accessibilityLabel="Position" options={POSITION_OPTIONS} value={position} onChange={setPosition} />

      {custom && (
        <View style={styles.controls}>
          <View style={styles.row}>
            <PickerButton label="Up (Y)" value={CATALOG[y].short} onPress={() => setPicker('y')} />
            <PickerButton label="Across (X)" value={CATALOG[x].short} onPress={() => setPicker('x')} />
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Segmented
                accessibilityLabel="Color dots by"
                options={[
                  { id: 'position', label: 'Color: position' },
                  { id: 'stat', label: 'Color: a stat' },
                ]}
                value={colorMode}
                onChange={setColorMode}
              />
            </View>
          </View>
          {colorMode === 'stat' && <PickerButton label="Color by" value={CATALOG[cz].short} onPress={() => setPicker('z')} />}
          <View style={styles.row}>
            <AppText variant="small" style={styles.flex}>
              Straight-line trend
            </AppText>
            <Switch
              value={showTrend}
              onValueChange={setShowTrend}
              trackColor={{ true: colors.accentFill, false: colors.border }}
              accessibilityLabel="Show a straight-line trend"
            />
          </View>
        </View>
      )}

      <HighlightRow
        ids={highlights}
        nameOf={nameOf}
        onRemove={toggleHighlight}
        onAdd={() => setPicker('player')}
        canAdd={highlights.length < MAX_HIGHLIGHTS}
      />

      <Card style={styles.chartCard}>
        <View style={styles.titleBlock}>
          <AppText variant="title">{title}</AppText>
          <AppText variant="caption" color="textSecondary">
            {points.length} qualified {noun} · games through {formatDate(through)}
            {missing.smallSample > 0 && under ? ` · ${missing.smallSample} left out with ${under}` : ''}
            {missing.noValue > 0 ? ` · ${missing.noValue} without a value` : ''}
          </AppText>
        </View>

        {points.length < 5 ? (
          <AppText color="textSecondary">Not enough qualified {noun} with these stats yet.</AppText>
        ) : (
          <ScatterChart
            points={points}
            xStat={x}
            yStat={y}
            invertY={invertY}
            color={colorOf}
            hollowIds={analysis?.hollow}
            medians={analysis?.medians}
            quadrants={quadrantLabels}
            trend={custom && showTrend ? (analysis?.fit ?? null) : null}
            highlightIds={highlights}
            labels={labels}
            surface={colors.surface}
            summary={`${title} ${points.length} ${noun}. ${analysis?.relationship.text ?? ''}`}
            onSelect={setSelectedId}
          />
        )}

        <Legend colorMode={z ? 'stat' : 'position'} z={z} zd={analysis?.zd ?? null} />

        {analysis && (
          <View style={styles.insight}>
            <AppText variant="small">{analysis.relationship.text}</AppText>
            {custom && showTrend && Number.isFinite(analysis.r) && (
              <AppText variant="caption" color="textSecondary">
                The line is a least-squares fit (r = {analysis.r.toFixed(2).replace('-', '−')}). It shows the average
                trend, not a rule for any one player.
              </AppText>
            )}
            {shared.length > 0 && (
              <AppText variant="caption" color="danger">
                Heads-up: both stats are built from some of the same numbers ({shared.join(', ').toUpperCase()}), so
                part of any pattern is automatic.
              </AppText>
            )}
            {preset && (
              <AppText variant="caption" color="textSecondary">
                {preset.note}
              </AppText>
            )}
          </View>
        )}
      </Card>

      {selected ? (
        <SelectedCard
          player={selected}
          stats={chartColumns(x, y, z).map((c) => c.stat)}
          poolSize={snapshot.players.poolSize}
          onChart={onChart.has(selected.id)}
          highlighted={highlights.includes(selected.id)}
          canHighlight={highlights.length < MAX_HIGHLIGHTS}
          onToggleHighlight={() => toggleHighlight(selected.id)}
        />
      ) : (
        <AppText variant="small" color="textSecondary">
          Tap a dot to see that player’s numbers.
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
        <ValueTable points={points} x={x} y={y} z={z} onSelect={setSelectedId} selectedId={selectedId} />
      )}

      <StatPicker
        visible={picker === 'x' || picker === 'y' || picker === 'z'}
        title={picker === 'x' ? 'Across (X)' : picker === 'y' ? 'Up (Y)' : 'Color by'}
        selected={picker === 'x' ? x : picker === 'y' ? y : cz}
        onSelect={(id) => (picker === 'x' ? setCx(id) : picker === 'y' ? setCy(id) : setCz(id))}
        onClose={() => setPicker(null)}
      />
      <PlayerPicker
        visible={picker === 'player'}
        title="Highlight a player"
        players={players}
        onSelect={(id) => {
          if (!highlights.includes(id)) toggleHighlight(id);
        }}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
}

function HighlightRow({
  ids,
  nameOf,
  onRemove,
  onAdd,
  canAdd,
}: {
  ids: number[];
  nameOf: (id: number) => string;
  onRemove: (id: number) => void;
  onAdd: () => void;
  canAdd: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.highlights}>
      {ids.map((id) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${nameOf(id)} from the chart`}
          onPress={() => onRemove(id)}
          style={[styles.highlightChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <AppText variant="small" style={styles.bold} numberOfLines={1}>
            {nameOf(id)}
          </AppText>
          <AppText variant="small" color="textSecondary">
            ✕
          </AppText>
        </Pressable>
      ))}
      {canAdd && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Highlight a player"
          onPress={onAdd}
          style={[styles.highlightChip, { borderColor: colors.border }]}>
          <AppText variant="small" color="accent" style={styles.bold}>
            {ids.length ? '+ Add player' : '+ Highlight players'}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

function PickerButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Change`}
      onPress={onPress}
      style={({ pressed }) => [styles.pickerButton, { backgroundColor: pressed ? colors.border : colors.surface }]}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value} ▾</AppText>
    </Pressable>
  );
}

function Legend({ colorMode, z, zd }: { colorMode: ColorMode; z: StatId | null; zd: readonly [number, number] | null }) {
  const cc = useChartColors();
  const colors = useColors();
  return (
    <View style={styles.legendBlock}>
      {colorMode === 'stat' && z && zd ? (
        <>
          <AppText variant="caption" color="textSecondary">
            Color: {CATALOG[z].label}
          </AppText>
          <View style={styles.legend}>
            {cc.ramp.map((c, i) => {
              const breaks = classBreaks(zd, RAMP_CLASSES);
              return (
                <View key={c} style={styles.legendItem}>
                  <Swatch color={c} />
                  <AppText variant="caption">
                    {formatStat(z, breaks[i])}–{formatStat(z, breaks[i + 1])}
                  </AppText>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.legend}>
          {POSITION_GROUPS.map((g) => (
            <View key={g} style={styles.legendItem}>
              <Swatch color={cc.positions[g]} />
              <AppText variant="caption">{groupNoun(g).replace(/^./, (c) => c.toUpperCase())}</AppText>
            </View>
          ))}
        </View>
      )}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.hollow, { borderColor: colors.textSecondary }]} />
          <AppText variant="caption" color="textSecondary">
            Under half the typical minutes
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dash, { borderColor: cc.median }]} />
          <AppText variant="caption" color="textSecondary">
            Median
          </AppText>
        </View>
      </View>
    </View>
  );
}

function Swatch({ color }: { color: string }) {
  return <View style={[styles.swatch, { backgroundColor: color }]} />;
}

function SelectedCard({
  player,
  stats,
  poolSize,
  onChart,
  highlighted,
  canHighlight,
  onToggleHighlight,
}: {
  player: Player;
  stats: StatId[];
  poolSize: Partial<Record<StatId, number>>;
  onChart: boolean;
  highlighted: boolean;
  canHighlight: boolean;
  onToggleHighlight: () => void;
}) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
          {player.name}
        </AppText>
        <TeamChip abbr={player.team} />
      </View>
      {!onChart && (
        <AppText variant="caption" color="textSecondary">
          Not on this chart: a missing value, too few attempts, or another position.
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
      <View style={styles.row}>
        {(highlighted || canHighlight) && (
          <Pressable accessibilityRole="button" onPress={onToggleHighlight} style={styles.flex}>
            <AppText variant="bodyStrong" color="accent">
              {highlighted ? 'Remove highlight' : 'Highlight on chart'}
            </AppText>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/graphs/player/[id]', params: { id: String(player.id) } })}>
          <AppText variant="bodyStrong" color="accent">
            Player page ›
          </AppText>
        </Pressable>
      </View>
    </Card>
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
  const columns = chartColumns(x, y, z);
  return (
    <View style={[styles.table, { borderColor: colors.border }]}>
      <View style={[styles.tableRow, { backgroundColor: colors.surface }]}>
        <AppText variant="caption" color="textSecondary" style={styles.flex}>
          Player
        </AppText>
        {columns.map((c) => (
          <AppText key={c.stat} variant="caption" color="textSecondary" style={styles.tableNum}>
            {CATALOG[c.stat].short}
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
          {columns.map((c) => (
            <AppText key={c.stat} variant="small" style={styles.tableNum}>
              {formatStat(c.stat, p[c.axis])}
            </AppText>
          ))}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  bleed: { marginHorizontal: -spacing.lg },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, minHeight: 36, justifyContent: 'center' },
  controls: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pickerButton: { flex: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  highlights: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chartCard: { paddingHorizontal: spacing.md, gap: spacing.sm },
  titleBlock: { gap: 2, paddingHorizontal: spacing.xs },
  insight: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  legendBlock: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  hollow: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  dash: { width: 16, borderTopWidth: 1, borderStyle: 'dashed' },
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
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  tableNum: { width: 56, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
