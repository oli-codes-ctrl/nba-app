import { useMemo, useState } from 'react';
import { Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { CATALOG, type StatId } from '@/stats/catalog';
import { useChartColors, useColors } from '@/theme/useTokens';

import type { QuadrantKey } from './analysis';
import { placeLabels, textWidth, type Box } from './labels';
import { extent, nearestIndex, pressPoint, paddedDomain, scale, tickLabel, ticks, type ChartPoint } from './math';

const MARGIN = { left: 40, right: 12, top: 24, bottom: 40 };
const DOT = 4.5;
const BIG_DOT = 7;
const TAP_RADIUS = 28;
const LABEL_SIZE = 11;
const QUADRANT_SIZE = 10;
/** SVG text ignores the app font on the web; ask for the system UI font there. */
const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;

type Props = {
  points: readonly ChartPoint[];
  xStat: StatId;
  yStat: StatId;
  /** Draw Y upside down so "up" is better, for lower-is-better stats. */
  invertY?: boolean;
  /** Dot color; one neutral color when omitted. */
  color?: (p: ChartPoint) => string;
  /** Thin samples, drawn as hollow rings. */
  hollowIds?: ReadonlySet<number>;
  /** League medians: dashed reference lines. */
  medians?: { x: number; y: number } | null;
  /** Corner labels for the quadrants the medians create. */
  quadrants?: Record<QuadrantKey, string> | null;
  /** Optional straight-line fit (custom charts only). */
  trend?: { slope: number; intercept: number } | null;
  /** Players drawn larger, on top, with a ring. */
  highlightIds?: readonly number[];
  /** Names to print beside dots, most important first. */
  labels?: readonly { id: number; text: string }[];
  /** The color behind the chart, for dot rings and label halos. */
  surface?: string;
  /** Spoken summary of the chart. */
  summary: string;
  onSelect: (id: number) => void;
};

export function ScatterChart({
  points,
  xStat,
  yStat,
  invertY = false,
  color,
  hollowIds,
  medians = null,
  quadrants = null,
  trend = null,
  highlightIds = [],
  labels = [],
  surface,
  summary,
  onSelect,
}: Props) {
  const ui = useColors();
  const cc = useChartColors();
  const bg = surface ?? ui.background;
  const [width, setWidth] = useState(0);

  const xd = useMemo(() => paddedDomain(extent(points.map((p) => p.x))), [points]);
  const yd = useMemo(() => paddedDomain(extent(points.map((p) => p.y))), [points]);

  const height = Math.round(Math.min(440, Math.max(280, width * 0.92)));
  const plot = { x0: MARGIN.left, x1: width - MARGIN.right, y0: height - MARGIN.bottom, y1: MARGIN.top };
  const sx = scale(xd, [plot.x0, plot.x1]);
  const sy = scale(yd, invertY ? [plot.y1, plot.y0] : [plot.y0, plot.y1]);

  const screen = useMemo(
    () => points.map((p) => ({ sx: sx(p.x), sy: sy(p.y) })),
    // sx/sy are rebuilt from these inputs each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, width, xd, yd, invertY],
  );
  const indexById = useMemo(() => new Map(points.map((p, i) => [p.id, i])), [points]);
  const highlighted = new Set(highlightIds.filter((id) => indexById.has(id)));
  const dotColor = (p: ChartPoint) => (color ? color(p) : cc.neutral);

  // Quadrant names sit in the plot's corners; labels must steer around them.
  const corners: { key: QuadrantKey; x: number; y: number; anchor: 'start' | 'end' }[] = [
    { key: 'topRight', x: plot.x1 - 4, y: plot.y1 + QUADRANT_SIZE + 2, anchor: 'end' },
    { key: 'topLeft', x: plot.x0 + 4, y: plot.y1 + QUADRANT_SIZE + 2, anchor: 'start' },
    { key: 'bottomLeft', x: plot.x0 + 4, y: plot.y0 - 5, anchor: 'start' },
    { key: 'bottomRight', x: plot.x1 - 4, y: plot.y0 - 5, anchor: 'end' },
  ];
  const cornerBoxes: Box[] = quadrants
    ? corners.map((c) => {
        const w = textWidth(quadrants[c.key], QUADRANT_SIZE);
        const left = c.anchor === 'start' ? c.x : c.x - w;
        return { x0: left - 2, y0: c.y - QUADRANT_SIZE, x1: left + w + 2, y1: c.y + 3 };
      })
    : [];

  const placed =
    width > 0
      ? placeLabels(
          labels.flatMap((l) => {
            const i = indexById.get(l.id);
            return i == null ? [] : [{ id: l.id, dotX: screen[i].sx, dotY: screen[i].sy, radius: highlighted.has(l.id) ? BIG_DOT : DOT, text: l.text }];
          }),
          plot.x1 > plot.x0 ? { x0: plot.x0, y0: plot.y1, x1: plot.x1, y1: plot.y0 } : { x0: 0, y0: 0, x1: 0, y1: 0 },
          LABEL_SIZE,
          cornerBoxes,
        )
      : [];

  function onLayout(e: LayoutChangeEvent) {
    setWidth(Math.round(e.nativeEvent.layout.width));
  }

  const xTicks = ticks(xd);
  const yTicks = ticks(yd);
  const halo = { stroke: bg, strokeWidth: 3, strokeLinejoin: 'round' as const };

  return (
    <View onLayout={onLayout} style={{ height: height || 320 }}>
      {width > 0 && (
        <Pressable
          accessibilityRole="image"
          accessibilityLabel={summary}
          accessibilityHint="Tap to pick the nearest player. The list below the chart has every value."
          onPress={(e) => {
            const i = nearestIndex(screen, pressPoint(e).x, pressPoint(e).y, TAP_RADIUS);
            if (i != null) onSelect(points[i].id);
          }}>
          <Svg width={width} height={height} pointerEvents="none">
            <Defs>
              <ClipPath id="plot">
                <Rect x={plot.x0} y={plot.y1} width={plot.x1 - plot.x0} height={plot.y0 - plot.y1} />
              </ClipPath>
            </Defs>

            {/* Axis titles in words, outside the plot. */}
            <SvgText x={plot.x0} y={13} fontSize={11.5} fontWeight="600" fill={ui.textSecondary} fontFamily={FONT}>
              {`↑ ${CATALOG[yStat].label}${invertY ? ' (fewer is higher)' : ''}`}
            </SvgText>
            <SvgText
              x={plot.x1}
              y={height - 6}
              fontSize={11.5}
              fontWeight="600"
              fill={ui.textSecondary}
              textAnchor="end"
              fontFamily={FONT}>
              {`${CATALOG[xStat].label} →`}
            </SvgText>

            {/* Grid and axes: solid hairlines, recessive. */}
            {yTicks.map((t) => (
              <G key={`y${t}`}>
                <Line x1={plot.x0} x2={plot.x1} y1={sy(t)} y2={sy(t)} stroke={cc.grid} strokeWidth={1} />
                <SvgText x={plot.x0 - 6} y={sy(t) + 4} fontSize={11} fill={cc.axisLabel} textAnchor="end" fontFamily={FONT}>
                  {tickLabel(t, yd)}
                </SvgText>
              </G>
            ))}
            {xTicks.map((t) => (
              <G key={`x${t}`}>
                <Line x1={sx(t)} x2={sx(t)} y1={plot.y0} y2={plot.y1} stroke={cc.grid} strokeWidth={1} />
                <SvgText x={sx(t)} y={plot.y0 + 15} fontSize={11} fill={cc.axisLabel} textAnchor="middle" fontFamily={FONT}>
                  {tickLabel(t, xd)}
                </SvgText>
              </G>
            ))}
            <Line x1={plot.x0} x2={plot.x1} y1={plot.y0} y2={plot.y0} stroke={cc.axis} strokeWidth={1} />
            <Line x1={plot.x0} x2={plot.x0} y1={plot.y0} y2={plot.y1} stroke={cc.axis} strokeWidth={1} />

            <G clipPath="url(#plot)">
              {medians && (
                <G>
                  <Line x1={sx(medians.x)} x2={sx(medians.x)} y1={plot.y0} y2={plot.y1} stroke={cc.median} strokeWidth={1} strokeDasharray="4 4" />
                  <Line x1={plot.x0} x2={plot.x1} y1={sy(medians.y)} y2={sy(medians.y)} stroke={cc.median} strokeWidth={1} strokeDasharray="4 4" />
                </G>
              )}

              {trend && (
                <Line
                  x1={sx(xd[0])}
                  y1={sy(trend.slope * xd[0] + trend.intercept)}
                  x2={sx(xd[1])}
                  y2={sy(trend.slope * xd[1] + trend.intercept)}
                  stroke={cc.trendLine}
                  strokeWidth={2}
                />
              )}

              {points.map((p, i) => {
                if (highlighted.has(p.id)) return null;
                const c = dotColor(p);
                const hollow = hollowIds?.has(p.id);
                return (
                  <Circle
                    key={p.id}
                    cx={screen[i].sx}
                    cy={screen[i].sy}
                    r={DOT}
                    fill={hollow ? bg : c}
                    // Hollow rings mark thin samples; a surface ring keeps filled dots apart.
                    stroke={hollow ? c : bg}
                    strokeWidth={hollow ? 1.5 : 1.25}
                  />
                );
              })}

              {/* Highlighted players last, so they sit on top. */}
              {points.map((p, i) =>
                highlighted.has(p.id) ? (
                  <G key={`h${p.id}`}>
                    <Circle cx={screen[i].sx} cy={screen[i].sy} r={BIG_DOT + 2} fill={bg} />
                    <Circle cx={screen[i].sx} cy={screen[i].sy} r={BIG_DOT} fill={dotColor(p)} stroke={ui.text} strokeWidth={2} />
                  </G>
                ) : null,
              )}
            </G>

            {quadrants &&
              corners.map((c) => (
                <G key={c.key}>
                  <SvgText x={c.x} y={c.y} fontSize={QUADRANT_SIZE} fontWeight="700" textAnchor={c.anchor} fontFamily={FONT} fill={bg} {...halo}>
                    {quadrants[c.key]}
                  </SvgText>
                  <SvgText x={c.x} y={c.y} fontSize={QUADRANT_SIZE} fontWeight="700" textAnchor={c.anchor} fontFamily={FONT} fill={ui.textSecondary}>
                    {quadrants[c.key]}
                  </SvgText>
                </G>
              ))}

            {placed.map((l) => (
              <G key={`l${l.id}`}>
                <SvgText x={l.x} y={l.y} fontSize={LABEL_SIZE} fontWeight="600" textAnchor={l.anchor} fontFamily={FONT} fill={bg} {...halo}>
                  {l.text}
                </SvgText>
                <SvgText x={l.x} y={l.y} fontSize={LABEL_SIZE} fontWeight="600" textAnchor={l.anchor} fontFamily={FONT} fill={ui.text}>
                  {l.text}
                </SvgText>
              </G>
            ))}
          </Svg>
        </Pressable>
      )}
    </View>
  );
}
