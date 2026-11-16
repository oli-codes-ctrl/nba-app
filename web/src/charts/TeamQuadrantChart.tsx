'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Skeleton } from '@/components/primitives';
import { placeLabels, textWidth, type Box } from '@/graphs/labels';
import { scale, tickLabel, ticks } from '@/graphs/math';
import { ordinal } from '@/lib/format';
import { teamPath } from '@/lib/routes';
import { netLines, squareDomains, TEAM_QUADRANTS, teamQuadrant, type TeamQuadrant } from '@/teams/analysis';
import { teamInfo } from '@/theme/teams';

import s from './charts.module.css';
import { useChartBox } from './useChartBox';

export type QuadTeam = {
  abbr: string;
  name: string;
  ortg: number;
  drtg: number;
  net: number;
  /** 95% half-width of the net rating from game-to-game luck. */
  noise: number | null;
  rank: { ortg?: number; drtg?: number; net?: number };
};

const MARGIN = { left: 40, right: 12, top: 28, bottom: 44 };
const MAX_SIDE = 600;
const DOT = 5;
const BIG_DOT = 7.5;
const LABEL_SIZE = 11;
const CORNER_SIZE = 11;
const HIT = 28;

type Props = {
  teams: readonly QuadTeam[];
  /** League average rating: the same for offense and defense. */
  league: number;
  /** The team this page is about: drawn larger and always named. */
  highlight?: string | null;
  /** The chart in a sentence, for screen readers. */
  summary: string;
};

function signed(v: number): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
}

/**
 * "Who's actually good?" Offense (points scored per 100 possessions) across,
 * defense (points allowed per 100) up, flipped so up is better. Both axes use
 * one scale, so the net-rating diagonals run at 45 degrees. Hover or the
 * arrow keys show a team; selecting one opens its page.
 */
export function TeamQuadrantChart({ teams, league, highlight = null, summary }: Props) {
  const { ref, width, ready, entering } = useChartBox<HTMLDivElement>();
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const pointer = useRef('mouse');

  const domains = useMemo(
    () => squareDomains([...teams.map((t) => t.ortg), league], [...teams.map((t) => t.drtg), league]),
    [teams, league],
  );
  const side = Math.max(0, Math.min(MAX_SIDE, width - MARGIN.left - MARGIN.right));
  const height = side + MARGIN.top + MARGIN.bottom;
  // The square plot sits in the middle of a wide column.
  const x0 = Math.max(MARGIN.left, (width - side - MARGIN.left - MARGIN.right) / 2 + MARGIN.left);
  const plot = { x0, x1: x0 + side, y0: MARGIN.top + side, y1: MARGIN.top };
  const sx = scale(domains.x, [plot.x0, plot.x1]);
  // Flipped: fewer points allowed is higher.
  const sy = scale(domains.y, [plot.y1, plot.y0]);
  const screen = teams.map((t) => ({ x: sx(t.ortg), y: sy(t.drtg) }));
  const hi = highlight ? teams.findIndex((t) => t.abbr === highlight) : -1;
  // Keyboard order: best net rating first.
  const order = useMemo(() => teams.map((_, i) => i).sort((a, b) => teams[b].net - teams[a].net), [teams]);

  const counts = useMemo(() => {
    const c: Record<TeamQuadrant, number> = { both: 0, defense: 0, offense: 0, neither: 0 };
    for (const t of teams) c[teamQuadrant(t.ortg, t.drtg, league)]++;
    return c;
  }, [teams, league]);

  const corners: { key: TeamQuadrant; x: number; y: number; anchor: 'start' | 'end' }[] = [
    { key: 'both', x: plot.x1 - 4, y: plot.y1 + CORNER_SIZE + 3, anchor: 'end' },
    { key: 'defense', x: plot.x0 + 4, y: plot.y1 + CORNER_SIZE + 3, anchor: 'start' },
    { key: 'neither', x: plot.x0 + 4, y: plot.y0 - 6, anchor: 'start' },
    { key: 'offense', x: plot.x1 - 4, y: plot.y0 - 6, anchor: 'end' },
  ];
  const cornerText = (k: TeamQuadrant) => `${TEAM_QUADRANTS[k]} (${counts[k]})`;
  const cornerBoxes: Box[] = corners.map((c) => {
    const w = textWidth(cornerText(c.key), CORNER_SIZE);
    const left = c.anchor === 'start' ? c.x : c.x - w;
    return { x0: left - 2, y0: c.y - CORNER_SIZE, x1: left + w + 2, y1: c.y + 3 };
  });

  // Net-rating lines (ORtg - DRtg = c), each labeled at a free end.
  const lines = netLines(domains.x, domains.y).map((c) => {
    const start = Math.max(domains.x[0], domains.y[0] + c);
    const end = Math.min(domains.x[1], domains.y[1] + c);
    return { c, start: { x: sx(start), y: sy(start - c) }, end: { x: sx(end), y: sy(end - c) } };
  });
  const hits = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const lineLabels: { c: number; text: string; x: number; y: number; box: Box }[] = [];
  for (const l of lines) {
    const text = l.c > 0 ? `+${l.c} net` : l.c < 0 ? `−${Math.abs(l.c)} net` : 'Even';
    const w = textWidth(text, 12);
    const spots = [
      { x: l.start.x + 3, y: l.start.y + 13 },
      { x: l.end.x - w - 3, y: l.end.y - 3 },
    ].map((p) => {
      const x = Math.min(plot.x1 - w - 2, Math.max(plot.x0 + 3, p.x));
      const y = Math.max(plot.y1 + 13, Math.min(plot.y0 - 3, p.y));
      return { x, y, box: { x0: x - 1, y0: y - 11, x1: x + w + 1, y1: y + 3 } };
    });
    const free = spots.find((p) => ![...cornerBoxes, ...lineLabels.map((o) => o.box)].some((b) => hits(p.box, b)));
    if (free) lineLabels.push({ c: l.c, text, ...free });
  }

  const labelOrder = teams.map((_, i) => i).sort((a, b) => (a === hi ? -1 : b === hi ? 1 : 0));
  const placed =
    side > 0
      ? placeLabels(
          labelOrder.map((i) => ({
            id: i,
            dotX: screen[i].x,
            dotY: screen[i].y,
            radius: i === hi ? BIG_DOT : DOT,
            text: teams[i].abbr,
            required: i === hi,
          })),
          { x0: plot.x0, y0: plot.y1, x1: plot.x1, y1: plot.y0 },
          LABEL_SIZE,
          [...cornerBoxes, ...lineLabels.map((l) => l.box)],
          screen.map((p, i) => ({ id: i, x: p.x, y: p.y, r: (i === hi ? BIG_DOT : DOT) + 1, weight: i === hi ? 20 : 1 })),
        )
      : [];

  function nearest(e: { clientX: number; clientY: number }): number | null {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return null;
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    let best: number | null = null;
    let bestD = HIT * HIT;
    screen.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  function open(i: number) {
    if (teams[i].abbr !== highlight) router.push(teamPath(teams[i].abbr));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const at = picked == null ? -1 : order.indexOf(picked);
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = order[Math.min(order.length - 1, at + 1)];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = order[Math.max(0, at - 1)];
    else if (e.key === 'Home') next = order[0];
    else if (e.key === 'End') next = order[order.length - 1];
    else if (e.key === 'Enter' && picked != null) {
      e.preventDefault();
      open(picked);
      return;
    } else if (e.key === 'Escape') {
      setPicked(null);
      return;
    } else return;
    e.preventDefault();
    setPicked(next);
  }

  const active = hover ?? picked;
  const tip = active != null ? teams[active] : null;
  const tipAt = active != null ? screen[active] : null;
  const xTicks = ticks(domains.x);
  const yTicks = ticks(domains.y);

  return (
    <div
      ref={ref}
      className={s.chart}
      style={{ height: height || 400, cursor: hover != null ? 'pointer' : 'crosshair' }}
      tabIndex={0}
      role="group"
      aria-roledescription="chart"
      aria-label={`${summary} Use the arrow keys to go through teams, best net rating first, and Enter to open one.`}
      onPointerDown={(e) => {
        pointer.current = e.pointerType;
      }}
      onPointerMove={(e) => e.pointerType !== 'touch' && setHover(nearest(e))}
      onPointerLeave={() => setHover(null)}
      onBlur={() => setPicked(null)}
      onClick={(e) => {
        const i = nearest(e);
        if (i == null) return;
        // Touch has no hover: the first touch shows the team, a second opens it.
        if (pointer.current === 'touch' && picked !== i) setPicked(i);
        else open(i);
      }}
      onKeyDown={onKeyDown}>
      {!ready ? (
        <Skeleton height={height || 400} radius="var(--radius-md)" />
      ) : (
        <svg width={width} height={height} aria-hidden="true" className={entering ? s.enter : undefined}>
          <defs>
            <clipPath id="team-plot">
              <rect x={plot.x0} y={plot.y1} width={side} height={side} />
            </clipPath>
          </defs>

          <text x={plot.x0} y={14} className={s.axisTitle}>
            ↑ Defense: fewer points allowed per 100
          </text>
          <text x={plot.x1} y={height - 6} textAnchor="end" className={s.axisTitle}>
            Offense: points scored per 100 →
          </text>

          {yTicks.map((t) => (
            <text key={`y${t}`} x={plot.x0 - 8} y={sy(t) + 4} textAnchor="end" className={s.tick}>
              {tickLabel(t, domains.y)}
            </text>
          ))}
          {xTicks.map((t) => (
            <text key={`x${t}`} x={sx(t)} y={plot.y0 + 16} textAnchor="middle" className={s.tick}>
              {tickLabel(t, domains.x)}
            </text>
          ))}
          <line x1={plot.x0} x2={plot.x1} y1={plot.y0} y2={plot.y0} className={s.axis} />
          <line x1={plot.x0} x2={plot.x0} y1={plot.y0} y2={plot.y1} className={s.axis} />

          <g clipPath="url(#team-plot)">
            {/* Net rating: scored minus allowed is the same all along each diagonal. */}
            {lines.map((l) => (
              <line
                key={`n${l.c}`}
                x1={sx(domains.x[0])}
                y1={sy(domains.x[0] - l.c)}
                x2={sx(domains.x[1])}
                y2={sy(domains.x[1] - l.c)}
                className={l.c === 0 ? s.netZero : s.grid}
              />
            ))}
            <line x1={sx(league)} x2={sx(league)} y1={plot.y0} y2={plot.y1} className={s.reference} />
            <line x1={plot.x0} x2={plot.x1} y1={sy(league)} y2={sy(league)} className={s.reference} />

            <g className={s.marks}>
              {teams.map((t, i) =>
                i === hi ? null : (
                  // The ring is the team's color: identity, repeated by the label, never the encoding.
                  <circle
                    key={t.abbr}
                    cx={screen[i].x}
                    cy={screen[i].y}
                    r={i === active ? DOT + 1.5 : DOT}
                    className={i === active ? s.dotHover : s.dotTeam}
                    style={i === active ? undefined : { stroke: teamInfo(t.abbr).color }}
                  />
                ),
              )}
              {hi >= 0 ? <circle cx={screen[hi].x} cy={screen[hi].y} r={BIG_DOT} className={s.dotFocus} /> : null}
              {active != null && active !== hi ? (
                <circle cx={screen[active].x} cy={screen[active].y} r={DOT + 4} className={s.dotRing} />
              ) : null}
            </g>
          </g>

          {lineLabels.map((l) => (
            <text key={`nl${l.c}`} x={l.x} y={l.y} className={`${s.tick} ${s.halo}`}>
              {l.text}
            </text>
          ))}
          {corners.map((c) => (
            <text key={c.key} x={c.x} y={c.y} textAnchor={c.anchor} className={`${s.corner} ${s.halo}`}>
              {cornerText(c.key)}
            </text>
          ))}
          {placed.map((l) => (
            <g key={`l${l.id}`}>
              {l.leader ? <line {...l.leader} className={s.leader} /> : null}
              <text x={l.x} y={l.y} textAnchor={l.anchor} className={`${l.id === hi ? s.labelStrong : s.label} ${s.halo}`}>
                {l.text}
              </text>
            </g>
          ))}
        </svg>
      )}

      {ready && tip && tipAt ? (
        <div
          className={tipAt.y < 120 ? `${s.tooltip} ${s.tooltipBelow}` : s.tooltip}
          style={{
            left: Math.min(Math.max(tipAt.x, 100), Math.max(100, width - 100)),
            top: tipAt.y,
            borderTopColor: teamInfo(tip.abbr).color,
          }}
          aria-hidden="true">
          <div className={s.tipTitle}>{tip.name}</div>
          <div className={s.tipValue}>
            {signed(tip.net)} net{tip.noise != null ? ` ± ${tip.noise.toFixed(1)}` : ''}
          </div>
          <div className={s.tipRow}>
            <span>Offense</span>
            <span>
              {tip.ortg.toFixed(1)}
              {tip.rank.ortg ? ` · ${ordinal(tip.rank.ortg)}` : ''}
            </span>
          </div>
          <div className={s.tipRow}>
            <span>Defense</span>
            <span>
              {tip.drtg.toFixed(1)}
              {tip.rank.drtg ? ` · ${ordinal(tip.rank.drtg)}` : ''}
            </span>
          </div>
          <div className={s.tipRow}>
            <span>{TEAM_QUADRANTS[teamQuadrant(tip.ortg, tip.drtg, league)]}</span>
          </div>
        </div>
      ) : null}
      <p className="visually-hidden" aria-live="polite">
        {picked != null
          ? `${teams[picked].name}: net rating ${signed(teams[picked].net)}, offense ${teams[picked].ortg.toFixed(1)}, defense ${teams[picked].drtg.toFixed(1)}. ${TEAM_QUADRANTS[teamQuadrant(teams[picked].ortg, teams[picked].drtg, league)]}.${teams[picked].abbr !== highlight ? ' Press Enter to open.' : ''}`
          : ''}
      </p>
    </div>
  );
}
