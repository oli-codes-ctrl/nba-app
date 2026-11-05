import { useMemo, useState } from 'react';
import { Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { useChartColors, useColors } from '@/theme/useTokens';

import { beeswarm } from './distribution';
import { placeLabels, type Box } from './labels';
import { nearestIndex, pressPoint, scale } from './math';

const PAD = { left: 12, right: 12, top: 22, bottom: 34 };
const BAND = 64;
const LABEL_SIZE = 10.5;
const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;

export type LuckPoint = { abbr: string; luck: number };

type Props = {
  teams: readonly LuckPoint[];
  /** 95% half-width of luck alone, in wins: the shaded "normal luck" band. */
  noise: number;
  highlight?: string | null;
  surface: string;
  summary: string;
  onSelect?: (abbr: string) => void;
};

function signed(v: number): string {
  return v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0';
}

/**
 * "Who's been lucky?" Each team's wins above or below what its point
 * differential predicts, one dot per team. The shaded band is what coin-flip
 * close games produce on their own; only teams outside it are labeled lucky
 * or unlucky.
 */
export function LuckStrip({ teams, noise, highlight = null, surface, summary, onSelect }: Props) {
  const ui = useColors();
  const cc = useChartColors();
  const [width, setWidth] = useState(0);

  const reach = Math.max(noise * 1.6, ...teams.map((t) => Math.abs(t.luck) + 0.3), 1);
  const limit = Math.ceil(reach);
  const height = PAD.top + BAND + PAD.bottom;
  const x0 = PAD.left;
  const x1 = width - PAD.right;
  const sx = scale([-limit, limit], [x0, x1]);
  const mid = PAD.top + BAND / 2;
  const axisY = PAD.top + BAND + 4;

  const swarm = useMemo(
    () => (width > 0 ? beeswarm(teams.map((t) => sx(t.luck)), BAND / 2, 5, 3) : { dots: [], radius: 5 }),
    // sx depends only on width and limit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teams, width, limit],
  );
  const screen = useMemo(() => {
    const out = teams.map(() => ({ sx: 0, sy: 0 }));
    for (const d of swarm.dots) out[d.index] = { sx: d.x, sy: mid + d.y };
    return out;
  }, [swarm, teams, mid]);

  const hi = highlight ? teams.findIndex((t) => t.abbr === highlight) : -1;
  // Label the highlighted team, then everyone outside normal luck, most extreme first.
  const toLabel = teams
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => i === hi || Math.abs(t.luck) > noise)
    .sort((a, b) => (a.i === hi ? -1 : b.i === hi ? 1 : Math.abs(b.t.luck) - Math.abs(a.t.luck)));
  const dotBoxes: Box[] = screen.map((s) => ({ x0: s.sx - swarm.radius, y0: s.sy - swarm.radius, x1: s.sx + swarm.radius, y1: s.sy + swarm.radius }));
  const bounds = { x0, y0: 0, x1, y1: PAD.top + BAND };
  const request = ({ t, i }: (typeof toLabel)[number]) => ({
    id: i,
    dotX: screen[i].sx,
    dotY: screen[i].sy,
    radius: i === hi ? 7 : swarm.radius,
    text: t.abbr,
  });
  // The highlighted team is always named, even over a crowded swarm; the
  // others only where they cover no dot.
  const first = width > 0 && hi >= 0 ? placeLabels(toLabel.filter((l) => l.i === hi).map(request), bounds, LABEL_SIZE) : [];
  const placed =
    width > 0
      ? [
          ...first,
          ...placeLabels(
            toLabel.filter((l) => l.i !== hi).map(request),
            bounds,
            LABEL_SIZE,
            [...dotBoxes, ...first.map((l) => l.box)],
          ),
        ]
      : [];

  function onLayout(e: LayoutChangeEvent) {
    setWidth(Math.round(e.nativeEvent.layout.width));
  }

  const ticks = Array.from({ length: 2 * limit + 1 }, (_, i) => i - limit).filter((v) => limit <= 4 || v % 2 === 0);
  const halo = { stroke: surface, strokeWidth: 3, strokeLinejoin: 'round' as const };

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Pressable
          accessibilityRole="image"
          accessibilityLabel={summary}
          disabled={!onSelect}
          onPress={(e) => {
            const i = nearestIndex(screen, pressPoint(e).x, pressPoint(e).y, 24);
            if (i != null) onSelect?.(teams[i].abbr);
          }}>
          <Svg width={width} height={height} pointerEvents="none">
            {/* What luck alone produces: coin-flip close games. */}
            <Rect x={sx(-noise)} y={PAD.top} width={Math.max(1, sx(noise) - sx(-noise))} height={BAND} fill={cc.band} rx={4} />
            <SvgText x={sx(0)} y={PAD.top - 8} fontSize={11} fontWeight="600" fill={ui.textSecondary} textAnchor="middle" fontFamily={FONT}>
              {`Normal luck: within ${noise.toFixed(1)} wins`}
            </SvgText>
            <Line x1={sx(0)} x2={sx(0)} y1={PAD.top} y2={PAD.top + BAND} stroke={cc.median} strokeWidth={1.5} strokeDasharray="4 4" />

            {teams.map((t, i) =>
              i === hi ? null : (
                <Circle key={t.abbr} cx={screen[i].sx} cy={screen[i].sy} r={swarm.radius} fill={ui.textSecondary} stroke={surface} strokeWidth={1.25} />
              ),
            )}
            {hi >= 0 && (
              <G>
                <Circle cx={screen[hi].sx} cy={screen[hi].sy} r={9} fill={surface} />
                <Circle cx={screen[hi].sx} cy={screen[hi].sy} r={7} fill={cc.highlight} stroke={ui.text} strokeWidth={2} />
              </G>
            )}

            <Line x1={x0} x2={x1} y1={axisY} y2={axisY} stroke={cc.axis} strokeWidth={1} />
            {ticks.map((v) => (
              <SvgText key={v} x={sx(v)} y={axisY + 14} fontSize={11} fill={cc.axisLabel} textAnchor="middle" fontFamily={FONT}>
                {signed(v)}
              </SvgText>
            ))}
            <SvgText x={x0} y={height - 2} fontSize={11} fontWeight="600" fill={ui.textSecondary} fontFamily={FONT}>
              ← Fewer wins than expected
            </SvgText>
            <SvgText x={x1} y={height - 2} fontSize={11} fontWeight="600" fill={ui.textSecondary} textAnchor="end" fontFamily={FONT}>
              More →
            </SvgText>

            {placed.map((l) => (
              <G key={`l${l.id}`}>
                <SvgText x={l.x} y={l.y} fontSize={LABEL_SIZE} fontWeight={l.id === hi ? '800' : '600'} textAnchor={l.anchor} fontFamily={FONT} fill={surface} {...halo}>
                  {l.text}
                </SvgText>
                <SvgText x={l.x} y={l.y} fontSize={LABEL_SIZE} fontWeight={l.id === hi ? '800' : '600'} textAnchor={l.anchor} fontFamily={FONT} fill={ui.text}>
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
