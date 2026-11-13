'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Skeleton } from '@/components/primitives';
import type { QuadrantKey } from '@/graphs/analysis';
import { placeLabels, textWidth, type Box } from '@/graphs/labels';
import { extent, paddedDomain, scale, tickLabel, ticks, type ChartPoint } from '@/graphs/math';

import s from './charts.module.css';
import { useChartBox } from './useChartBox';

const MARGIN = { left: 44, right: 12, top: 28, bottom: 44 };
const DOT = 4.5;
const BIG_DOT = 7;
const LABEL_SIZE = 11;
const CORNER_SIZE = 11;
const HIT = 24;

/** What the tooltip says about one dot. */
export type ScatterTip = { title: string; meta?: string; rows: readonly (readonly [string, string])[]; note?: string };

type Props = {
  points: readonly ChartPoint[];
  /** Dot colors, aligned with `points`. */
  colors: readonly string[];
  /** Axis titles in words. */
  xTitle: string;
  yTitle: string;
  /** Draw Y upside down so "up" is better, for lower-is-better stats. */
  invertY?: boolean;
  /** Thin samples, drawn as hollow rings. */
  hollow: ReadonlySet<number>;
  /** Medians of the plotted players: dashed reference lines. */
  medians: { x: number; y: number } | null;
  /** Corner names for the quadrants the medians create. */
  quadrants: Record<QuadrantKey, string> | null;
  /** Optional straight-line fit. */
  trend: { slope: number; intercept: number } | null;
  /** Players drawn larger, on top, and always named. */
  highlightIds: readonly number[];
  /** Names to print beside dots, most important first; one per `group` at most. */
  labels: readonly { id: number; text: string; group?: string }[];
  /** The player shown in the panel beside the chart. */
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  tip: (p: ChartPoint) => ScatterTip;
  /** One sentence about a player, read out as the arrow keys reach him. */
  speak: (p: ChartPoint) => string;
  /** The chart in a sentence, for screen readers. */
  summary: string;
};

/**
 * One dot per player, two stats. Medians split the plot into named corners;
 * hover shows a player, a click or Enter selects him for the panel beside
 * the chart. The arrow keys move between dots: left and right across, up
 * and down the chart.
 */
export function ScatterChart({
  points,
  colors,
  xTitle,
  yTitle,
  invertY = false,
  hollow,
  medians,
  quadrants,
  trend,
  highlightIds,
  labels,
  selectedId,
  onSelect,
  tip,
  speak,
  summary,
}: Props) {
  const { ref, width, ready, entering } = useChartBox<HTMLDivElement>();
  const clipId = `scatter-${useId().replace(/:/g, '')}`;
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const pointer = useRef('mouse');

  const xd = useMemo(() => paddedDomain(extent(points.map((p) => p.x))), [points]);
  const yd = useMemo(() => paddedDomain(extent(points.map((p) => p.y))), [points]);
  // Narrow columns get a plot taller than wide, so hundreds of dots still separate; wide ones fit the first screen.
  const height = Math.round(width < 560 ? Math.min(520, Math.max(320, width * 1.1)) : Math.min(560, Math.max(320, width * 0.58)));
  const plot = { x0: MARGIN.left, x1: Math.max(MARGIN.left, width - MARGIN.right), y0: height - MARGIN.bottom, y1: MARGIN.top };
  const sx = scale(xd, [plot.x0, plot.x1]);
  const sy = scale(yd, invertY ? [plot.y1, plot.y0] : [plot.y0, plot.y1]);

  const screen = useMemo(
    () => points.map((p) => ({ x: sx(p.x), y: sy(p.y) })),
    // sx and sy are rebuilt from these inputs on every render.
    [points, width, height, xd, yd, invertY],
  );
  const indexById = useMemo(() => new Map(points.map((p, i) => [p.id, i])), [points]);
  const highlighted = useMemo(() => new Set(highlightIds.filter((id) => indexById.has(id))), [highlightIds, indexById]);

  // Keyboard orders: left to right, and bottom to top.
  const orderX = useMemo(() => points.map((_, i) => i).sort((a, b) => screen[a].x - screen[b].x || screen[b].y - screen[a].y), [points, screen]);
  const orderUp = useMemo(() => points.map((_, i) => i).sort((a, b) => screen[b].y - screen[a].y || screen[a].x - screen[b].x), [points, screen]);

  const corners: { key: QuadrantKey; x: number; y: number; anchor: 'start' | 'end' }[] = [
    { key: 'topRight', x: plot.x1 - 4, y: plot.y1 + CORNER_SIZE + 3, anchor: 'end' },
    { key: 'topLeft', x: plot.x0 + 4, y: plot.y1 + CORNER_SIZE + 3, anchor: 'start' },
    { key: 'bottomLeft', x: plot.x0 + 4, y: plot.y0 - 6, anchor: 'start' },
    { key: 'bottomRight', x: plot.x1 - 4, y: plot.y0 - 6, anchor: 'end' },
  ];
  const cornerKey = quadrants ? corners.map((c) => quadrants[c.key]).join('|') : '';

  const placed = useMemo(() => {
    if (plot.x1 <= plot.x0) return [];
    const cornerBoxes: Box[] = quadrants
      ? corners.map((c) => {
          const w = textWidth(quadrants[c.key], CORNER_SIZE);
          const left = c.anchor === 'start' ? c.x : c.x - w;
          return { x0: left - 2, y0: c.y - CORNER_SIZE, x1: left + w + 2, y1: c.y + 3 };
        })
      : [];
    return placeLabels(
      labels.flatMap((l) => {
        const i = indexById.get(l.id);
        if (i == null) return [];
        const big = highlighted.has(l.id);
        // Players the reader picked always get their name; examples only where it covers no one.
        return [{ id: l.id, dotX: screen[i].x, dotY: screen[i].y, radius: big ? BIG_DOT : DOT, text: l.text, required: big, group: l.group }];
      }),
      { x0: plot.x0, y0: plot.y1, x1: plot.x1, y1: plot.y0 },
      LABEL_SIZE,
      cornerBoxes,
      points.map((p, i) => {
        const big = highlighted.has(p.id);
        return { id: p.id, x: screen[i].x, y: screen[i].y, r: (big ? BIG_DOT : DOT) + 1, weight: big ? 20 : 1 };
      }),
    );
    // The corner boxes derive from the plot edges and cornerKey.
  }, [labels, indexById, highlighted, screen, points, cornerKey, plot.x0, plot.x1, plot.y0, plot.y1]);
  const named = useMemo(() => new Set(placed.map((l) => l.id)), [placed]);

  // The dots, drawn once per layout: hovering only redraws the rings on top.
  const dots = useMemo(
    () =>
      points.map((p, i) => {
        if (highlighted.has(p.id)) return null;
        const thin = hollow.has(p.id);
        return (
          <circle
            key={p.id}
            cx={screen[i].x}
            cy={screen[i].y}
            r={named.has(p.id) ? DOT + 0.5 : DOT}
            className={named.has(p.id) ? s.dotNamed : thin ? s.dotHollow : s.dotFilled}
            style={thin ? { stroke: colors[i] } : { fill: colors[i] }}
          />
        );
      }),
    [points, screen, colors, hollow, highlighted, named],
  );

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

  /** Where the arrow keys start: the selected player, a highlighted one, the first named example, or the leftmost dot. */
  function startIndex(): number | null {
    const candidates = [selectedId, ...highlightIds, ...placed.map((l) => l.id)];
    for (const id of candidates) {
      const i = id == null ? undefined : indexById.get(id);
      if (i != null) return i;
    }
    return orderX[0] ?? null;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const at = picked != null ? (indexById.get(picked) ?? null) : null;
    const step = (order: number[], by: number) => {
      if (at == null) return startIndex();
      const k = order.indexOf(at);
      return order[Math.max(0, Math.min(order.length - 1, k + by))];
    };
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = step(orderX, 1);
    else if (e.key === 'ArrowLeft') next = step(orderX, -1);
    else if (e.key === 'ArrowUp') next = step(orderUp, 1);
    else if (e.key === 'ArrowDown') next = step(orderUp, -1);
    else if (e.key === 'Home') next = orderX[0] ?? null;
    else if (e.key === 'End') next = orderX[orderX.length - 1] ?? null;
    else if ((e.key === 'Enter' || e.key === ' ') && at != null) {
      e.preventDefault();
      onSelect(points[at].id);
      return;
    } else if (e.key === 'Escape') {
      if (picked == null && selectedId == null) return;
      e.preventDefault();
      setPicked(null);
      onSelect(null);
      return;
    } else return;
    e.preventDefault();
    if (next != null) setPicked(points[next].id);
  }

  const activeId = hover ?? picked;
  const active = activeId != null ? indexById.get(activeId) : undefined;
  const selected = selectedId != null ? indexById.get(selectedId) : undefined;
  const info = active != null ? tip(points[active]) : null;
  const at = active != null ? screen[active] : null;
  const spoken = picked != null && indexById.has(picked) ? speak(points[indexById.get(picked)!]) : '';
  const xTicks = ticks(xd);
  const yTicks = ticks(yd);

  return (
    <div
      ref={ref}
      className={s.chart}
      style={{ height: height || 400, cursor: hover != null ? 'pointer' : 'crosshair' }}
      tabIndex={0}
      role="group"
      aria-roledescription="chart"
      aria-label={`${summary} Use the arrow keys to move between players, left and right across the chart or up and down it, and Enter to select one.`}
      onPointerDown={(e) => {
        pointer.current = e.pointerType;
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'touch') return;
        const i = nearest(e);
        setHover(i == null ? null : points[i].id);
      }}
      onPointerLeave={() => setHover(null)}
      onBlur={() => setPicked(null)}
      onClick={(e) => {
        const i = nearest(e);
        if (i == null) return;
        const id = points[i].id;
        // Touch has no hover: a touch shows the player's numbers on the dot as well as selecting him.
        if (pointer.current === 'touch') setPicked(id);
        onSelect(id === selectedId && pointer.current !== 'touch' ? null : id);
      }}
      onKeyDown={onKeyDown}>
      {!ready ? (
        <Skeleton height={height || 400} radius="var(--radius-md)" />
      ) : (
        <svg width={width} height={height} aria-hidden="true" className={entering ? s.enter : undefined}>
          <defs>
            <clipPath id={clipId}>
              <rect x={plot.x0} y={plot.y1} width={plot.x1 - plot.x0} height={plot.y0 - plot.y1} />
            </clipPath>
          </defs>

          <text x={plot.x0} y={14} className={s.axisTitle}>
            ↑ {yTitle}
          </text>
          <text x={plot.x1} y={height - 6} textAnchor="end" className={s.axisTitle}>
            {xTitle} →
          </text>

          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={plot.x0} x2={plot.x1} y1={sy(t)} y2={sy(t)} className={s.grid} />
              <text x={plot.x0 - 8} y={sy(t) + 4} textAnchor="end" className={s.tick}>
                {tickLabel(t, yd)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} x2={sx(t)} y1={plot.y0} y2={plot.y1} className={s.grid} />
              <text x={sx(t)} y={plot.y0 + 16} textAnchor="middle" className={s.tick}>
                {tickLabel(t, xd)}
              </text>
            </g>
          ))}
          <line x1={plot.x0} x2={plot.x1} y1={plot.y0} y2={plot.y0} className={s.axis} />
          <line x1={plot.x0} x2={plot.x0} y1={plot.y0} y2={plot.y1} className={s.axis} />

          <g clipPath={`url(#${clipId})`}>
            {medians ? (
              <>
                <line x1={sx(medians.x)} x2={sx(medians.x)} y1={plot.y0} y2={plot.y1} className={s.reference} />
                <line x1={plot.x0} x2={plot.x1} y1={sy(medians.y)} y2={sy(medians.y)} className={s.reference} />
              </>
            ) : null}
            {trend ? (
              <line
                x1={sx(xd[0])}
                y1={sy(trend.slope * xd[0] + trend.intercept)}
                x2={sx(xd[1])}
                y2={sy(trend.slope * xd[1] + trend.intercept)}
                className={s.line}
              />
            ) : null}

            <g className={s.marks}>
              {dots}
              {/* Highlighted players last, so they sit on top. */}
              {points.map((p, i) =>
                highlighted.has(p.id) ? (
                  <g key={`h${p.id}`}>
                    <circle cx={screen[i].x} cy={screen[i].y} r={BIG_DOT + 2} className={s.dotHalo} />
                    <circle
                      cx={screen[i].x}
                      cy={screen[i].y}
                      r={BIG_DOT}
                      className={s.dotPicked}
                      style={hollow.has(p.id) ? undefined : { fill: colors[i] }}
                    />
                  </g>
                ) : null,
              )}
              {selected != null ? (
                <circle
                  cx={screen[selected].x}
                  cy={screen[selected].y}
                  r={(highlighted.has(points[selected].id) ? BIG_DOT : DOT) + 4.5}
                  className={s.dotRing}
                />
              ) : null}
              {active != null && active !== selected ? (
                <circle
                  cx={screen[active].x}
                  cy={screen[active].y}
                  r={(highlighted.has(points[active].id) ? BIG_DOT : DOT) + 3.5}
                  className={s.dotRingSoft}
                />
              ) : null}
            </g>
          </g>

          {quadrants
            ? corners.map((c) => (
                <text key={c.key} x={c.x} y={c.y} textAnchor={c.anchor} className={`${s.corner} ${s.halo}`}>
                  {quadrants[c.key]}
                </text>
              ))
            : null}
          {placed.map((l) => (
            <g key={`l${l.id}`}>
              {l.leader ? <line {...l.leader} className={s.leader} /> : null}
              <text
                x={l.x}
                y={l.y}
                textAnchor={l.anchor}
                className={`${highlighted.has(l.id) ? s.labelStrong : s.label} ${s.halo}`}>
                {l.text}
              </text>
            </g>
          ))}
        </svg>
      )}

      {ready && info && at ? (
        <div
          className={at.y < 140 ? `${s.tooltip} ${s.tooltipBelow}` : s.tooltip}
          style={{ left: Math.min(Math.max(at.x, 110), Math.max(110, width - 110)), top: at.y }}
          aria-hidden="true">
          <div className={s.tipValue}>{info.title}</div>
          {info.meta ? <div className={s.tipTitle}>{info.meta}</div> : null}
          {info.rows.map(([label, value]) => (
            <div key={label} className={s.tipRow}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
          {info.note ? <div className={s.tipTitle}>{info.note}</div> : null}
        </div>
      ) : null}
      <p className="visually-hidden" aria-live="polite">
        {spoken}
      </p>
    </div>
  );
}
