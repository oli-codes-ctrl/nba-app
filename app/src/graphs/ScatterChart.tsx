import { useMemo, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { CATALOG, type StatId } from '@/stats/catalog';
import { useChartColors, useColors } from '@/theme/useTokens';

import {
  bin2d,
  classIndex,
  extent,
  linearFit,
  nearestIndex,
  paddedDomain,
  scale,
  tickLabel,
  ticks,
  type ChartPoint,
  type Domain,
} from './math';
import type { GraphMode } from './points';

const MARGIN = { left: 40, right: 14, top: 14, bottom: 26 };
const DOT_RADIUS = 4.5;
const HIGHLIGHT_RADIUS = 7.5;
const TAP_RADIUS = 28;
export const RAMP_CLASSES = 5;

export type ChartScales = {
  xd: Domain;
  yd: Domain;
  zd: Domain | null;
  maxBinCount: number;
};

type Props = {
  points: readonly ChartPoint[];
  mode: GraphMode;
  xStat: StatId;
  yStat: StatId;
  bins: { nx: number; ny: number };
  highlightId: number | null;
  onSelect: (id: number) => void;
};

export function useChartScales(points: readonly ChartPoint[], mode: GraphMode, bins: { nx: number; ny: number }): ChartScales {
  return useMemo(() => {
    const xd = paddedDomain(extent(points.map((p) => p.x)));
    const yd = paddedDomain(extent(points.map((p) => p.y)));
    const zs = points.flatMap((p) => (p.z == null ? [] : [p.z]));
    const zd = zs.length ? extent(zs) : null;
    const maxBinCount =
      mode === 'density' ? Math.max(1, ...bin2d(points, bins.nx, bins.ny, xd, yd).map((b) => b.count)) : 1;
    return { xd, yd, zd, maxBinCount };
  }, [points, mode, bins.nx, bins.ny]);
}

export function ScatterChart({ points, mode, xStat, yStat, bins, highlightId, onSelect }: Props) {
  const ui = useColors();
  const cc = useChartColors();
  const [width, setWidth] = useState(0);
  const { xd, yd, zd, maxBinCount } = useChartScales(points, mode, bins);

  const height = Math.round(Math.min(420, Math.max(260, width * 0.9)));
  const plot = {
    x0: MARGIN.left,
    x1: width - MARGIN.right,
    y0: height - MARGIN.bottom,
    y1: MARGIN.top,
  };
  const sx = scale(xd, [plot.x0, plot.x1]);
  const sy = scale(yd, [plot.y0, plot.y1]);

  const screen = useMemo(
    () => points.map((p) => ({ sx: sx(p.x), sy: sy(p.y) })),
    // sx/sy are rebuilt from these inputs each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, width, xd, yd],
  );

  const fit = mode === 'trend' ? linearFit(points) : null;
  const densityBins = mode === 'density' ? bin2d(points, bins.nx, bins.ny, xd, yd) : [];
  const highlightIndex = highlightId == null ? -1 : points.findIndex((p) => p.id === highlightId);
  const highlight = highlightIndex >= 0 ? points[highlightIndex] : null;

  function dotColor(p: ChartPoint): string {
    if (mode === 'trend' && fit) {
      return p.y >= fit.slope * p.x + fit.intercept ? cc.aboveTrend : cc.belowTrend;
    }
    if (mode === 'color' && zd && p.z != null) return cc.ramp[classIndex(p.z, zd, RAMP_CLASSES)];
    return cc.aboveTrend;
  }

  function onLayout(e: LayoutChangeEvent) {
    setWidth(Math.round(e.nativeEvent.layout.width));
  }

  const xTicks = ticks(xd);
  const yTicks = ticks(yd);
  const xLabel = CATALOG[xStat].short;
  const yLabel = CATALOG[yStat].short;

  return (
    <View onLayout={onLayout} style={{ height: height || 300 }}>
      {width > 0 && (
        <Pressable
          accessibilityRole="image"
          accessibilityLabel={`Chart of ${CATALOG[yStat].label} against ${CATALOG[xStat].label} for ${points.length} qualified players.`}
          accessibilityHint="Tap to pick the nearest player. The list below the chart has every value."
          onPress={(e) => {
            const i = nearestIndex(screen, e.nativeEvent.locationX, e.nativeEvent.locationY, TAP_RADIUS);
            if (i != null) onSelect(points[i].id);
          }}>
          <Svg width={width} height={height} pointerEvents="none">
            <Defs>
              <ClipPath id="plot">
                <Rect x={plot.x0} y={plot.y1} width={plot.x1 - plot.x0} height={plot.y0 - plot.y1} />
              </ClipPath>
            </Defs>

            {/* Grid and axes: solid hairlines, recessive. */}
            {yTicks.map((t) => (
              <G key={`y${t}`}>
                <Line x1={plot.x0} x2={plot.x1} y1={sy(t)} y2={sy(t)} stroke={cc.grid} strokeWidth={1} />
                <SvgText
                  x={plot.x0 - 6}
                  y={sy(t) + 4}
                  fontSize={11}
                  fill={cc.axisLabel}
                  textAnchor="end">
                  {tickLabel(t, yd)}
                </SvgText>
              </G>
            ))}
            {xTicks.map((t) => (
              <G key={`x${t}`}>
                <Line x1={sx(t)} x2={sx(t)} y1={plot.y0} y2={plot.y1} stroke={cc.grid} strokeWidth={1} />
                <SvgText x={sx(t)} y={plot.y0 + 16} fontSize={11} fill={cc.axisLabel} textAnchor="middle">
                  {tickLabel(t, xd)}
                </SvgText>
              </G>
            ))}
            <Line x1={plot.x0} x2={plot.x1} y1={plot.y0} y2={plot.y0} stroke={cc.axis} strokeWidth={1} />
            <Line x1={plot.x0} x2={plot.x0} y1={plot.y0} y2={plot.y1} stroke={cc.axis} strokeWidth={1} />

            <G clipPath="url(#plot)">
              {mode === 'density' &&
                densityBins.map((b) => {
                  const bx0 = sx(xd[0] + ((xd[1] - xd[0]) * b.col) / bins.nx);
                  const bx1 = sx(xd[0] + ((xd[1] - xd[0]) * (b.col + 1)) / bins.nx);
                  const by0 = sy(yd[0] + ((yd[1] - yd[0]) * b.row) / bins.ny);
                  const by1 = sy(yd[0] + ((yd[1] - yd[0]) * (b.row + 1)) / bins.ny);
                  return (
                    <Rect
                      key={`${b.col}-${b.row}`}
                      // 1px inset on each side leaves a 2px gap between tiles.
                      x={bx0 + 1}
                      y={by1 + 1}
                      width={Math.max(0, bx1 - bx0 - 2)}
                      height={Math.max(0, by0 - by1 - 2)}
                      rx={2}
                      fill={cc.ramp[classIndex(b.count, [1, maxBinCount + 1e-9], RAMP_CLASSES)]}
                    />
                  );
                })}

              {mode !== 'density' &&
                points.map((p, i) =>
                  i === highlightIndex ? null : (
                    <Circle
                      key={p.id}
                      cx={screen[i].sx}
                      cy={screen[i].sy}
                      r={DOT_RADIUS}
                      fill={dotColor(p)}
                      // Surface ring keeps overlapping dots apart.
                      stroke={ui.background}
                      strokeWidth={1.5}
                    />
                  ),
                )}

              {fit && (
                <Line
                  x1={sx(xd[0])}
                  y1={sy(fit.slope * xd[0] + fit.intercept)}
                  x2={sx(xd[1])}
                  y2={sy(fit.slope * xd[1] + fit.intercept)}
                  stroke={cc.trendLine}
                  strokeWidth={2}
                />
              )}

              {highlight && (
                <Circle
                  cx={screen[highlightIndex].sx}
                  cy={screen[highlightIndex].sy}
                  r={HIGHLIGHT_RADIUS}
                  fill={cc.highlight}
                  stroke={ui.background}
                  strokeWidth={2}
                />
              )}
            </G>

            {highlight && (
              <SvgText
                x={screen[highlightIndex].sx + (screen[highlightIndex].sx > width * 0.6 ? -12 : 12)}
                y={Math.max(plot.y1 + 12, screen[highlightIndex].sy - 10)}
                fontSize={13}
                fontWeight="600"
                fill={ui.text}
                textAnchor={screen[highlightIndex].sx > width * 0.6 ? 'end' : 'start'}>
                {highlight.name}
              </SvgText>
            )}

            <SvgText x={plot.x0 + 4} y={plot.y1 + 2} fontSize={11} fontWeight="600" fill={ui.textSecondary}>
              {yLabel}
            </SvgText>
            <SvgText x={plot.x1} y={plot.y0 - 6} fontSize={11} fontWeight="600" fill={ui.textSecondary} textAnchor="end">
              {xLabel}
            </SvgText>
          </Svg>
        </Pressable>
      )}
    </View>
  );
}
