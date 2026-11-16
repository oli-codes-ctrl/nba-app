'use client';

import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

import { Skeleton } from '@/components/primitives';
import type { TrailingPoint } from '@/games/logs';
import { extent, paddedDomain, scale, tickLabel, ticks } from '@/graphs/math';
import { formatDate } from '@/lib/format';

import s from './charts.module.css';
import { useChartBox } from './useChartBox';

const MARGIN = { left: 36, right: 12, top: 12, bottom: 28 };
const HEIGHT = 240;
const DOT = 4;

type Props = {
  values: readonly number[];
  dates: readonly string[];
  trailing: readonly TrailingPoint[];
  seasonMean: number;
  /** The pinned game (its box line shows under the chart). */
  selected: number;
  onSelect: (index: number) => void;
  /** The whole chart in one sentence, for screen readers. */
  summary: string;
  /** Tooltip body for one game. */
  tooltip: (index: number) => ReactNode;
};

/** "Oct 21" */
function shortDate(iso: string): string {
  return formatDate(iso).replace(/, \d{4}$/, '');
}

/**
 * One dot per game in order, the trailing average as a line with the band
 * his true level likely sits in, and the season average as a dashed line.
 * Hover shows a game; click or the arrow keys pin one.
 */
export function TrendChart({ values, dates, trailing, seasonMean, selected, onSelect, summary, tooltip }: Props) {
  const { ref, width, ready, entering } = useChartBox<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = values.length;

  const lows = trailing.map((t) => t.lo ?? t.mean);
  const highs = trailing.map((t) => t.hi ?? t.mean);
  const yd = paddedDomain(extent([...values, ...lows, ...highs, seasonMean, 0]));
  const plot = { x0: MARGIN.left, x1: width - MARGIN.right, y0: HEIGHT - MARGIN.bottom, y1: MARGIN.top };
  // Games sit at even steps; a single game sits in the middle.
  const sx = (i: number) => (n <= 1 ? (plot.x0 + plot.x1) / 2 : plot.x0 + 8 + (i / (n - 1)) * (plot.x1 - plot.x0 - 16));
  const sy = scale(yd, [plot.y0, plot.y1]);

  const band =
    n >= 2 && trailing.every((t) => t.lo != null && t.hi != null)
      ? `M ${trailing.map((t, i) => `${sx(i)} ${sy(t.hi!)}`).join(' L ')} L ${trailing
          .map((t, i) => `${sx(i)} ${sy(t.lo!)}`)
          .reverse()
          .join(' L ')} Z`
      : null;
  const line = n >= 2 ? `M ${trailing.map((t, i) => `${sx(i)} ${sy(t.mean)}`).join(' L ')}` : null;

  function nearest(clientX: number): number {
    const left = ref.current?.getBoundingClientRect().left ?? 0;
    const x = clientX - left;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(sx(i) - x) < Math.abs(sx(best) - x)) best = i;
    return best;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    // Touch has no hover: a tap pins the game instead.
    if (e.pointerType === 'touch' || n === 0) return;
    setHover(nearest(e.clientX));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (n === 0) return;
    let next = selected;
    if (e.key === 'ArrowLeft') next = Math.max(0, selected - 1);
    else if (e.key === 'ArrowRight') next = Math.min(n - 1, selected + 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    onSelect(next);
  }

  // Ask for six so a typical range gets four or five labeled lines, not two.
  const yTicks = ticks(yd, 6);
  const tipX = hover == null ? 0 : Math.min(Math.max(sx(hover), 96), Math.max(96, width - 96));
  const tipY = hover == null ? 0 : sy(values[hover]);

  return (
    <div
      ref={ref}
      className={s.chart}
      style={{ height: HEIGHT }}
      tabIndex={0}
      role="group"
      aria-roledescription="chart"
      aria-label={`${summary} Use the left and right arrow keys to move through games.`}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => n > 0 && onSelect(nearest(e.clientX))}
      onKeyDown={onKeyDown}>
      {!ready ? (
        <Skeleton height={HEIGHT} radius="var(--radius-md)" />
      ) : (
        <svg width={width} height={HEIGHT} aria-hidden="true" className={entering ? s.enter : undefined}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={plot.x0} x2={plot.x1} y1={sy(t)} y2={sy(t)} className={s.grid} />
              <text x={plot.x0 - 8} y={sy(t) + 4} textAnchor="end" className={s.tick}>
                {tickLabel(t, yd)}
              </text>
            </g>
          ))}

          <g className={s.marks}>
            {band ? <path d={band} className={s.band} /> : null}
            <line x1={plot.x0} x2={plot.x1} y1={sy(seasonMean)} y2={sy(seasonMean)} className={s.reference} />
            {line ? <path d={line} className={s.line} /> : null}

            {hover != null ? <line x1={sx(hover)} x2={sx(hover)} y1={plot.y1} y2={plot.y0} className={s.crosshair} /> : null}

            {values.map((v, i) =>
              i === selected ? null : (
                <circle key={i} cx={sx(i)} cy={sy(v)} r={i === hover ? DOT + 1.5 : DOT} className={i === hover ? s.dotHover : s.dot} />
              ),
            )}
            {selected < n ? (
              <circle cx={sx(selected)} cy={sy(values[selected])} r={6} className={s.dotSelected} />
            ) : null}
          </g>

          <line x1={plot.x0} x2={plot.x1} y1={plot.y0} y2={plot.y0} className={s.axis} />
          {n > 0 ? (
            <text x={sx(0)} y={HEIGHT - 8} textAnchor={n === 1 ? 'middle' : 'start'} className={s.tick}>
              {shortDate(dates[0])}
            </text>
          ) : null}
          {n > 1 ? (
            <text x={sx(n - 1)} y={HEIGHT - 8} textAnchor="end" className={s.tick}>
              {shortDate(dates[n - 1])}
            </text>
          ) : null}
        </svg>
      )}

      {ready && hover != null ? (
        <div
          className={tipY < 96 ? `${s.tooltip} ${s.tooltipBelow}` : s.tooltip}
          style={{ left: tipX, top: tipY }}
          aria-hidden="true">
          {tooltip(hover)}
        </div>
      ) : null}
    </div>
  );
}
