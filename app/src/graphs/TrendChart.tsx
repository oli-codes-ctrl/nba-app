import { useState } from 'react';
import { Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import type { TrailingPoint } from '@/games/logs';
import { formatDate } from '@/lib/format';
import { useChartColors, useColors } from '@/theme/useTokens';

import { extent, paddedDomain, pressPoint, scale, tickLabel, ticks } from './math';

const MARGIN = { left: 34, right: 12, top: 14, bottom: 28 };
const HEIGHT = 220;
const DOT = 4;
const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;

type Props = {
  values: readonly number[];
  dates: readonly string[];
  trailing: readonly TrailingPoint[];
  seasonMean: number;
  selected: number | null;
  surface: string;
  summary: string;
  onSelect: (index: number) => void;
};

/** "Short" date for axis ends: "Oct 21". */
function shortDate(iso: string): string {
  return formatDate(iso).replace(/, \d{4}$/, '');
}

/**
 * One dot per game in order, the trailing average as a line with the band
 * his true level likely sits in, and the season average as a dashed line.
 */
export function TrendChart({ values, dates, trailing, seasonMean, selected, surface, summary, onSelect }: Props) {
  const ui = useColors();
  const cc = useChartColors();
  const [width, setWidth] = useState(0);

  const lows = trailing.map((t) => t.lo ?? t.mean);
  const highs = trailing.map((t) => t.hi ?? t.mean);
  const yd = paddedDomain(extent([...values, ...lows, ...highs, seasonMean, 0]));
  const plot = { x0: MARGIN.left, x1: width - MARGIN.right, y0: HEIGHT - MARGIN.bottom, y1: MARGIN.top };
  const n = values.length;
  // Games sit at even steps; a single game sits in the middle.
  const sx = (i: number) => (n <= 1 ? (plot.x0 + plot.x1) / 2 : plot.x0 + 6 + (i / (n - 1)) * (plot.x1 - plot.x0 - 12));
  const sy = scale(yd, [plot.y0, plot.y1]);

  const band =
    n >= 2 && trailing.every((t) => t.lo != null && t.hi != null)
      ? `M ${trailing.map((t, i) => `${sx(i)} ${sy(t.hi!)}`).join(' L ')} L ${[...trailing]
          .map((t, i) => ({ t, i }))
          .reverse()
          .map(({ t, i }) => `${sx(i)} ${sy(t.lo!)}`)
          .join(' L ')} Z`
      : null;
  const line = n >= 2 ? `M ${trailing.map((t, i) => `${sx(i)} ${sy(t.mean)}`).join(' L ')}` : null;

  function onLayout(e: LayoutChangeEvent) {
    setWidth(Math.round(e.nativeEvent.layout.width));
  }

  const yTicks = ticks(yd, 4);
  const seasonY = sy(seasonMean);

  return (
    <View onLayout={onLayout} style={{ height: HEIGHT }}>
      {width > 0 && (
        <Pressable
          accessibilityRole="image"
          accessibilityLabel={summary}
          accessibilityHint="Tap a game to see its box line"
          onPress={(e) => {
            if (n === 0) return;
            const { x } = pressPoint(e);
            if (!Number.isFinite(x)) return;
            let best = 0;
            for (let i = 1; i < n; i++) if (Math.abs(sx(i) - x) < Math.abs(sx(best) - x)) best = i;
            onSelect(best);
          }}>
          <Svg width={width} height={HEIGHT} pointerEvents="none">
            {yTicks.map((t) => (
              <G key={t}>
                <Line x1={plot.x0} x2={plot.x1} y1={sy(t)} y2={sy(t)} stroke={cc.grid} strokeWidth={1} />
                <SvgText x={plot.x0 - 6} y={sy(t) + 4} fontSize={11} fill={cc.axisLabel} textAnchor="end" fontFamily={FONT}>
                  {tickLabel(t, yd)}
                </SvgText>
              </G>
            ))}

            {band && <Path d={band} fill={cc.band} />}
            <Line x1={plot.x0} x2={plot.x1} y1={seasonY} y2={seasonY} stroke={cc.median} strokeWidth={1.5} strokeDasharray="4 4" />
            {line && <Path d={line} stroke={cc.trendLine} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />}

            {values.map((v, i) =>
              i === selected ? null : (
                <Circle key={i} cx={sx(i)} cy={sy(v)} r={DOT} fill={ui.textSecondary} stroke={surface} strokeWidth={1.25} />
              ),
            )}
            {selected != null && selected < n && (
              <G>
                <Circle cx={sx(selected)} cy={sy(values[selected])} r={8} fill={surface} />
                <Circle cx={sx(selected)} cy={sy(values[selected])} r={6} fill={cc.highlight} stroke={ui.text} strokeWidth={2} />
              </G>
            )}

            <Line x1={plot.x0} x2={plot.x1} y1={plot.y0} y2={plot.y0} stroke={cc.axis} strokeWidth={1} />
            {n > 0 && (
              <G>
                <SvgText x={sx(0)} y={HEIGHT - 8} fontSize={11} fill={cc.axisLabel} textAnchor={n === 1 ? 'middle' : 'start'} fontFamily={FONT}>
                  {shortDate(dates[0])}
                </SvgText>
                {n > 1 && (
                  <SvgText x={sx(n - 1)} y={HEIGHT - 8} fontSize={11} fill={cc.axisLabel} textAnchor="end" fontFamily={FONT}>
                    {shortDate(dates[n - 1])}
                  </SvgText>
                )}
              </G>
            )}
          </Svg>
        </Pressable>
      )}
    </View>
  );
}
