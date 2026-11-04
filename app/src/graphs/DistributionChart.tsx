import { useMemo, useState } from 'react';
import { Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { formatStat } from '@/lib/format';
import { CATALOG, type StatId } from '@/stats/catalog';
import { useChartColors, useColors } from '@/theme/useTokens';

import { beeswarm, quantile } from './distribution';
import { textWidth } from './labels';
import { extent, nearestIndex, paddedDomain, scale, tickLabel, ticks } from './math';

const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;
const PAD = { left: 12, right: 12, top: 28, bottom: 56 };
const BAND = 150;
const RANGE_LABEL = 'His likely range';

export type DistributionDot = { id: number; value: number; color: string };

type Props = {
  stat: StatId;
  dots: readonly DistributionDot[];
  /** The player to mark, if he is in the pool. */
  focusId?: number | null;
  focusLabel?: string;
  /** His likely range (95%), drawn as a bracket under the swarm. */
  range?: readonly [number, number] | null;
  surface: string;
  summary: string;
  onSelect: (id: number) => void;
};

/**
 * One dot per player along the stat's axis, packed into a beeswarm so every
 * player stays visible. Right is always better: lower-is-better stats are
 * drawn reversed. The shaded band is the middle half of the pool; the
 * dashed line is the median.
 */
export function DistributionChart({ stat, dots, focusId = null, focusLabel, range = null, surface, summary, onSelect }: Props) {
  const ui = useColors();
  const cc = useChartColors();
  const [width, setWidth] = useState(0);
  const reversed = CATALOG[stat].lowerIsBetter;

  const values = useMemo(() => dots.map((d) => d.value), [dots]);
  const sorted = useMemo(() => [...values].sort((a, b) => a - b), [values]);
  const domain = useMemo(
    () => paddedDomain(extent(range ? [...values, range[0], range[1]] : values)),
    [values, range],
  );

  const height = PAD.top + BAND + PAD.bottom;
  const x0 = PAD.left;
  const x1 = width - PAD.right;
  const sx = scale(domain, reversed ? [x1, x0] : [x0, x1]);
  const mid = PAD.top + BAND / 2;

  const swarm = useMemo(
    () => (width > 0 ? beeswarm(dots.map((d) => sx(d.value)), BAND / 2) : { dots: [], radius: 4 }),
    // sx depends only on width, domain and direction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dots, width, domain, reversed],
  );
  const screen = useMemo(() => {
    const out = dots.map(() => ({ sx: 0, sy: 0 }));
    for (const d of swarm.dots) out[d.index] = { sx: d.x, sy: mid + d.y };
    return out;
  }, [swarm, dots, mid]);

  const q1 = quantile(sorted, 0.25);
  const med = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const focusIndex = focusId == null ? -1 : dots.findIndex((d) => d.id === focusId);
  const axisY = PAD.top + BAND + 6;

  function onLayout(e: LayoutChangeEvent) {
    setWidth(Math.round(e.nativeEvent.layout.width));
  }

  const xTicks = ticks(domain);
  const iqrLeft = Math.min(sx(q1), sx(q3));
  const iqrRight = Math.max(sx(q1), sx(q3));

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Pressable
          accessibilityRole="image"
          accessibilityLabel={summary}
          onPress={(e) => {
            const i = nearestIndex(screen, e.nativeEvent.locationX, e.nativeEvent.locationY, 24);
            if (i != null) onSelect(dots[i].id);
          }}>
          <Svg width={width} height={height} pointerEvents="none">
            {/* The middle half of the pool, and its median. */}
            <Rect x={iqrLeft} y={PAD.top} width={Math.max(1, iqrRight - iqrLeft)} height={BAND} fill={cc.grid} rx={4} />
            <Line x1={sx(med)} x2={sx(med)} y1={PAD.top - 4} y2={PAD.top + BAND} stroke={cc.median} strokeWidth={1.5} strokeDasharray="4 4" />
            <SvgText x={sx(med)} y={PAD.top - 8} fontSize={11} fontWeight="600" fill={ui.textSecondary} textAnchor="middle" fontFamily={FONT}>
              {`Median ${formatStat(stat, med)}`}
            </SvgText>

            {dots.map((d, i) =>
              i === focusIndex ? null : (
                <Circle key={d.id} cx={screen[i].sx} cy={screen[i].sy} r={swarm.radius} fill={d.color} stroke={surface} strokeWidth={1} />
              ),
            )}

            {focusIndex >= 0 && (
              <G>
                <Circle cx={screen[focusIndex].sx} cy={screen[focusIndex].sy} r={9} fill={surface} />
                <Circle
                  cx={screen[focusIndex].sx}
                  cy={screen[focusIndex].sy}
                  r={7}
                  fill={dots[focusIndex].color}
                  stroke={ui.text}
                  strokeWidth={2}
                />
              </G>
            )}

            {/* Axis: right is better. */}
            <Line x1={x0} x2={x1} y1={axisY} y2={axisY} stroke={cc.axis} strokeWidth={1} />
            {xTicks.map((t) => (
              <SvgText key={t} x={sx(t)} y={axisY + 15} fontSize={11} fill={cc.axisLabel} textAnchor="middle" fontFamily={FONT}>
                {tickLabel(t, domain)}
              </SvgText>
            ))}

            {range && (
              <G>
                <Line x1={sx(range[0])} x2={sx(range[1])} y1={axisY + 24} y2={axisY + 24} stroke={ui.text} strokeWidth={2.5} />
                <Line x1={sx(range[0])} x2={sx(range[0])} y1={axisY + 19} y2={axisY + 29} stroke={ui.text} strokeWidth={2} />
                <Line x1={sx(range[1])} x2={sx(range[1])} y1={axisY + 19} y2={axisY + 29} stroke={ui.text} strokeWidth={2} />
                <SvgText
                  // Starts under the bracket, but never runs off the right edge.
                  x={Math.max(x0, Math.min(Math.min(sx(range[0]), sx(range[1])), x1 - textWidth(RANGE_LABEL, 11)))}
                  y={height - 4}
                  fontSize={11}
                  fontWeight="600"
                  fill={ui.text}
                  fontFamily={FONT}>
                  {RANGE_LABEL}
                </SvgText>
              </G>
            )}

            {focusIndex >= 0 && focusLabel ? (
              <G>
                <SvgText
                  x={Math.min(x1, Math.max(x0, screen[focusIndex].sx))}
                  y={Math.max(14, screen[focusIndex].sy - 14)}
                  fontSize={12}
                  fontWeight="700"
                  textAnchor={screen[focusIndex].sx > width * 0.7 ? 'end' : screen[focusIndex].sx < width * 0.3 ? 'start' : 'middle'}
                  fontFamily={FONT}
                  fill={surface}
                  stroke={surface}
                  strokeWidth={3}>
                  {focusLabel}
                </SvgText>
                <SvgText
                  x={Math.min(x1, Math.max(x0, screen[focusIndex].sx))}
                  y={Math.max(14, screen[focusIndex].sy - 14)}
                  fontSize={12}
                  fontWeight="700"
                  textAnchor={screen[focusIndex].sx > width * 0.7 ? 'end' : screen[focusIndex].sx < width * 0.3 ? 'start' : 'middle'}
                  fontFamily={FONT}
                  fill={ui.text}>
                  {focusLabel}
                </SvgText>
              </G>
            ) : null}
          </Svg>
        </Pressable>
      )}
    </View>
  );
}
