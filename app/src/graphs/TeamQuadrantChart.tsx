import { useMemo, useState } from 'react';
import { Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { netLines, squareDomains, TEAM_QUADRANTS, teamQuadrant, type TeamQuadrant } from '@/teams/analysis';
import { useChartColors, useColors } from '@/theme/useTokens';

import { placeLabels, textWidth, type Box } from './labels';
import { nearestIndex, scale, tickLabel, ticks } from './math';

const MARGIN = { left: 36, right: 12, top: 24, bottom: 40 };
const DOT = 5;
const BIG_DOT = 7.5;
const LABEL_SIZE = 10.5;
const CORNER_SIZE = 10;
const TAP_RADIUS = 28;
const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;

export type TeamPoint = { abbr: string; ortg: number; drtg: number };

type Props = {
  teams: readonly TeamPoint[];
  /** League average rating: the same for offense and defense. */
  league: number;
  /** A team drawn larger, on top, labeled first. */
  highlight?: string | null;
  surface: string;
  summary: string;
  onSelect?: (abbr: string) => void;
};

/**
 * "Who's actually good?" Offense (points scored per 100 possessions) across,
 * defense (points allowed per 100) up, flipped so up is better. Both axes use
 * the same scale, so the diagonal net-rating lines (scored minus allowed)
 * run at 45 degrees; better teams sit up and to the right.
 */
export function TeamQuadrantChart({ teams, league, highlight = null, surface, summary, onSelect }: Props) {
  const ui = useColors();
  const cc = useChartColors();
  const [width, setWidth] = useState(0);

  const domains = useMemo(
    () => squareDomains([...teams.map((t) => t.ortg), league], [...teams.map((t) => t.drtg), league]),
    [teams, league],
  );
  const side = Math.max(0, width - MARGIN.left - MARGIN.right);
  const height = side + MARGIN.top + MARGIN.bottom;
  const plot = { x0: MARGIN.left, x1: MARGIN.left + side, y0: MARGIN.top + side, y1: MARGIN.top };
  const sx = scale(domains.x, [plot.x0, plot.x1]);
  // Flipped: fewer points allowed is higher.
  const sy = scale(domains.y, [plot.y1, plot.y0]);
  const screen = teams.map((t) => ({ sx: sx(t.ortg), sy: sy(t.drtg) }));
  const hi = highlight ? teams.findIndex((t) => t.abbr === highlight) : -1;

  const counts = useMemo(() => {
    const c: Record<TeamQuadrant, number> = { both: 0, defense: 0, offense: 0, neither: 0 };
    for (const t of teams) c[teamQuadrant(t.ortg, t.drtg, league)]++;
    return c;
  }, [teams, league]);

  const corners: { key: TeamQuadrant; x: number; y: number; anchor: 'start' | 'end' }[] = [
    { key: 'both', x: plot.x1 - 4, y: plot.y1 + CORNER_SIZE + 2, anchor: 'end' },
    { key: 'defense', x: plot.x0 + 4, y: plot.y1 + CORNER_SIZE + 2, anchor: 'start' },
    { key: 'neither', x: plot.x0 + 4, y: plot.y0 - 5, anchor: 'start' },
    { key: 'offense', x: plot.x1 - 4, y: plot.y0 - 5, anchor: 'end' },
  ];
  const cornerText = (k: TeamQuadrant) => `${TEAM_QUADRANTS[k]} (${counts[k]})`;
  const cornerBoxes: Box[] = corners.map((c) => {
    const w = textWidth(cornerText(c.key), CORNER_SIZE);
    const left = c.anchor === 'start' ? c.x : c.x - w;
    return { x0: left - 2, y0: c.y - CORNER_SIZE, x1: left + w + 2, y1: c.y + 3 };
  });

  // Net-rating lines (ORtg - DRtg = c). Each is labeled at the upper-left
  // end of the part inside the plot, or the lower-right end if that spot is
  // taken by a corner name.
  const lines = netLines(domains.x, domains.y).map((c) => {
    const start = Math.max(domains.x[0], domains.y[0] + c);
    const end = Math.min(domains.x[1], domains.y[1] + c);
    return { c, start: { x: sx(start), y: sy(start - c) }, end: { x: sx(end), y: sy(end - c) } };
  });
  const hits = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const shownLineLabels: { c: number; text: string; x: number; y: number; box: Box }[] = [];
  for (const l of lines) {
    const text = l.c > 0 ? `+${l.c}` : l.c < 0 ? `−${Math.abs(l.c)}` : '0';
    const w = textWidth(text, 9.5);
    const spots = [
      { x: l.start.x + 3, y: l.start.y + 11 },
      { x: l.end.x - w - 3, y: l.end.y - 3 },
    ].map((s) => {
      const x = Math.min(plot.x1 - w - 2, Math.max(plot.x0 + 3, s.x));
      const y = Math.max(plot.y1 + 11, Math.min(plot.y0 - 3, s.y));
      return { x, y, box: { x0: x - 1, y0: y - 9, x1: x + w + 1, y1: y + 2 } };
    });
    const free = spots.find((s) => ![...cornerBoxes, ...shownLineLabels.map((o) => o.box)].some((b) => hits(s.box, b)));
    if (free) shownLineLabels.push({ c: l.c, text, ...free });
  }

  const dotBoxes: Box[] = screen.map((s) => ({ x0: s.sx - DOT, y0: s.sy - DOT, x1: s.sx + DOT, y1: s.sy + DOT }));
  const order = teams.map((_, i) => i).sort((a, b) => (a === hi ? -1 : b === hi ? 1 : 0));
  const placed =
    width > 0
      ? placeLabels(
          order.map((i) => ({ id: i, dotX: screen[i].sx, dotY: screen[i].sy, radius: i === hi ? BIG_DOT : DOT, text: teams[i].abbr })),
          { x0: plot.x0, y0: plot.y1, x1: plot.x1, y1: plot.y0 },
          LABEL_SIZE,
          [...cornerBoxes, ...shownLineLabels.map((l) => l.box), ...dotBoxes],
        )
      : [];

  function onLayout(e: LayoutChangeEvent) {
    setWidth(Math.round(e.nativeEvent.layout.width));
  }

  const xTicks = ticks(domains.x);
  const yTicks = ticks(domains.y);
  const halo = { stroke: surface, strokeWidth: 3, strokeLinejoin: 'round' as const };

  return (
    <View onLayout={onLayout} style={{ height: height || 320 }}>
      {width > 0 && (
        <Pressable
          accessibilityRole="image"
          accessibilityLabel={summary}
          disabled={!onSelect}
          onPress={(e) => {
            const i = nearestIndex(screen, e.nativeEvent.locationX, e.nativeEvent.locationY, TAP_RADIUS);
            if (i != null) onSelect?.(teams[i].abbr);
          }}>
          <Svg width={width} height={height} pointerEvents="none">
            <Defs>
              <ClipPath id="teamPlot">
                <Rect x={plot.x0} y={plot.y1} width={side} height={side} />
              </ClipPath>
            </Defs>

            <SvgText x={plot.x0} y={13} fontSize={11.5} fontWeight="600" fill={ui.textSecondary} fontFamily={FONT}>
              ↑ Defense: fewer points allowed per 100
            </SvgText>
            <SvgText x={plot.x1} y={height - 6} fontSize={11.5} fontWeight="600" fill={ui.textSecondary} textAnchor="end" fontFamily={FONT}>
              Offense: points scored per 100 →
            </SvgText>

            {yTicks.map((t) => (
              <SvgText key={`y${t}`} x={plot.x0 - 6} y={sy(t) + 4} fontSize={11} fill={cc.axisLabel} textAnchor="end" fontFamily={FONT}>
                {tickLabel(t, domains.y)}
              </SvgText>
            ))}
            {xTicks.map((t) => (
              <SvgText key={`x${t}`} x={sx(t)} y={plot.y0 + 15} fontSize={11} fill={cc.axisLabel} textAnchor="middle" fontFamily={FONT}>
                {tickLabel(t, domains.x)}
              </SvgText>
            ))}
            <Line x1={plot.x0} x2={plot.x1} y1={plot.y0} y2={plot.y0} stroke={cc.axis} strokeWidth={1} />
            <Line x1={plot.x0} x2={plot.x0} y1={plot.y0} y2={plot.y1} stroke={cc.axis} strokeWidth={1} />

            <G clipPath="url(#teamPlot)">
              {/* Net rating: scored minus allowed is the same all along each diagonal. */}
              {lines.map((l) => (
                <Line
                  key={`n${l.c}`}
                  x1={sx(domains.x[0])}
                  y1={sy(domains.x[0] - l.c)}
                  x2={sx(domains.x[1])}
                  y2={sy(domains.x[1] - l.c)}
                  stroke={l.c === 0 ? cc.axis : cc.grid}
                  strokeWidth={l.c === 0 ? 1.5 : 1}
                />
              ))}
              <Line x1={sx(league)} x2={sx(league)} y1={plot.y0} y2={plot.y1} stroke={cc.median} strokeWidth={1} strokeDasharray="4 4" />
              <Line x1={plot.x0} x2={plot.x1} y1={sy(league)} y2={sy(league)} stroke={cc.median} strokeWidth={1} strokeDasharray="4 4" />

              {teams.map((t, i) =>
                i === hi ? null : (
                  <Circle key={t.abbr} cx={screen[i].sx} cy={screen[i].sy} r={DOT} fill={cc.neutral} stroke={surface} strokeWidth={1.25} />
                ),
              )}
              {hi >= 0 && (
                <G>
                  <Circle cx={screen[hi].sx} cy={screen[hi].sy} r={BIG_DOT + 2} fill={surface} />
                  <Circle cx={screen[hi].sx} cy={screen[hi].sy} r={BIG_DOT} fill={cc.highlight} stroke={ui.text} strokeWidth={2} />
                </G>
              )}
            </G>

            {shownLineLabels.map((l) => (
              <G key={`nl${l.c}`}>
                <SvgText x={l.x} y={l.y} fontSize={9.5} fontFamily={FONT} fill={surface} {...halo}>
                  {l.text}
                </SvgText>
                <SvgText x={l.x} y={l.y} fontSize={9.5} fontFamily={FONT} fill={cc.axisLabel}>
                  {l.text}
                </SvgText>
              </G>
            ))}

            {corners.map((c) => (
              <G key={c.key}>
                <SvgText x={c.x} y={c.y} fontSize={CORNER_SIZE} fontWeight="700" textAnchor={c.anchor} fontFamily={FONT} fill={surface} {...halo}>
                  {cornerText(c.key)}
                </SvgText>
                <SvgText x={c.x} y={c.y} fontSize={CORNER_SIZE} fontWeight="700" textAnchor={c.anchor} fontFamily={FONT} fill={ui.textSecondary}>
                  {cornerText(c.key)}
                </SvgText>
              </G>
            ))}

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
