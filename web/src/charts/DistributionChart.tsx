'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Skeleton } from '@/components/primitives';
import { beeswarm, quantile } from '@/graphs/distribution';
import { textWidth } from '@/graphs/labels';
import { extent, paddedDomain, scale, tickLabel, ticks } from '@/graphs/math';

import { teamInfo } from '@/theme/teams';

import s from './charts.module.css';
import type { ScatterTip } from './ScatterChart';
import { useChartBox } from './useChartBox';

const PAD = { left: 16, right: 16, top: 30 };
const HIT = 18;
const RANGE_LABEL = 'His likely range (95%)';

export type DistributionDot = { id: number; value: number; color: string };

type Props = {
  dots: readonly DistributionDot[];
  /** Lower is better: draw the axis reversed, so right is always better. */
  reversed: boolean;
  /** The marked player, drawn larger and named. */
  markId: number | null;
  markLabel?: string;
  /** His likely range (95%), as a bracket under the axis. */
  range: readonly [number, number] | null;
  format: (value: number) => string;
  tip: (id: number) => ScatterTip;
  speak: (id: number) => string;
  /** A click or Enter marks that player. */
  onPick: (id: number) => void;
  summary: string;
};

/**
 * One dot per ranked player along the stat's axis, packed into a beeswarm
 * so every player stays visible. The shaded band is the middle half, the
 * dashed line the median. Hover shows a player; arrow keys walk the dots
 * from worst to best; a click or Enter marks him.
 */
export function DistributionChart({ dots, reversed, markId, markLabel, range, format, tip, speak, onPick, summary }: Props) {
  const { ref, width, ready, entering } = useChartBox<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const pointer = useRef('mouse');

  const band = width < 560 ? 170 : 210;
  const axisY = PAD.top + band + 6;
  const height = axisY + (range ? 62 : 30);
  const x0 = PAD.left;
  const x1 = Math.max(x0 + 1, width - PAD.right);
  const mid = PAD.top + band / 2;

  const values = useMemo(() => dots.map((d) => d.value), [dots]);
  const sorted = useMemo(() => [...values].sort((a, b) => a - b), [values]);
  const domain = useMemo(() => paddedDomain(extent(range ? [...values, range[0], range[1]] : values)), [values, range]);
  const sx = scale(domain, reversed ? [x1, x0] : [x0, x1]);

  const swarm = useMemo(
    () => (width > 0 ? beeswarm(dots.map((d) => sx(d.value)), band / 2, 4.5, 2) : { dots: [], radius: 4 }),
    // sx depends only on width, domain and direction.
    [dots, width, domain, reversed, band],
  );
  const screen = useMemo(() => {
    const out = dots.map(() => ({ x: 0, y: 0 }));
    for (const d of swarm.dots) out[d.index] = { x: d.x, y: mid + d.y };
    return out;
  }, [swarm, dots, mid]);
  const indexById = useMemo(() => new Map(dots.map((d, i) => [d.id, i])), [dots]);
  // Keyboard order: left to right, which is worst to best.
  const order = useMemo(() => dots.map((_, i) => i).sort((a, b) => screen[a].x - screen[b].x), [dots, screen]);

  const q1 = quantile(sorted, 0.25);
  const med = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const mark = markId == null ? undefined : indexById.get(markId);

  const marks = useMemo(
    () =>
      dots.map((d, i) =>
        i === mark ? null : (
          <circle key={d.id} cx={screen[i].x} cy={screen[i].y} r={swarm.radius} className={s.dotFilled} style={{ fill: d.color }} />
        ),
      ),
    [dots, screen, swarm.radius, mark],
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

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const at = picked != null ? (indexById.get(picked) ?? null) : null;
    const start = mark ?? order[Math.floor(order.length / 2)];
    const step = (by: number) => (at == null ? start : order[Math.max(0, Math.min(order.length - 1, order.indexOf(at) + by))]);
    let next: number | undefined;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = step(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = step(-1);
    else if (e.key === 'Home') next = order[0];
    else if (e.key === 'End') next = order[order.length - 1];
    else if ((e.key === 'Enter' || e.key === ' ') && at != null) {
      e.preventDefault();
      onPick(dots[at].id);
      return;
    } else if (e.key === 'Escape' && picked != null) {
      e.preventDefault();
      setPicked(null);
      return;
    } else return;
    e.preventDefault();
    if (next != null) setPicked(dots[next].id);
  }

  const activeId = hover ?? picked;
  const active = activeId != null ? indexById.get(activeId) : undefined;
  const info = activeId != null && active != null ? tip(activeId) : null;
  const at = active != null ? screen[active] : null;
  const xTicks = ticks(domain);
  const iqrLeft = Math.min(sx(q1), sx(q3));
  const iqrRight = Math.max(sx(q1), sx(q3));
  const medLabel = `Median ${format(med)}`;
  const medW = textWidth(medLabel, 11);
  const medX = Math.min(x1 - medW / 2, Math.max(x0 + medW / 2, sx(med)));
  const rangeLeft = range ? Math.min(sx(range[0]), sx(range[1])) : 0;
  const rangeRight = range ? Math.max(sx(range[0]), sx(range[1])) : 0;
  const markAnchor = mark == null ? 'middle' : screen[mark].x > width * 0.75 ? 'end' : screen[mark].x < width * 0.25 ? 'start' : 'middle';

  return (
    <div
      ref={ref}
      className={s.chart}
      style={{ height: height || 300, cursor: hover != null ? 'pointer' : 'default' }}
      tabIndex={0}
      role="group"
      aria-roledescription="chart"
      aria-label={`${summary} Use the arrow keys to move between players, worst to best, and Enter to mark one.`}
      onPointerDown={(e) => {
        pointer.current = e.pointerType;
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'touch') return;
        const i = nearest(e);
        setHover(i == null ? null : dots[i].id);
      }}
      onPointerLeave={() => setHover(null)}
      onBlur={() => setPicked(null)}
      onClick={(e) => {
        const i = nearest(e);
        if (i == null) return;
        // Touch has no hover: the first touch shows the player, a second marks him.
        if (pointer.current === 'touch' && picked !== dots[i].id) setPicked(dots[i].id);
        else onPick(dots[i].id);
      }}
      onKeyDown={onKeyDown}>
      {!ready ? (
        <Skeleton height={height || 300} radius="var(--radius-md)" />
      ) : (
        <svg width={width} height={height} aria-hidden="true" className={entering ? s.enter : undefined}>
          {/* The middle half of the pool, and its median. */}
          <rect x={iqrLeft} y={PAD.top} width={Math.max(1, iqrRight - iqrLeft)} height={band} rx={4} className={s.bandRect} />
          <line x1={sx(med)} x2={sx(med)} y1={PAD.top - 4} y2={PAD.top + band} className={s.reference} />
          <text x={medX} y={PAD.top - 10} textAnchor="middle" className={`${s.corner} ${s.halo}`}>
            {medLabel}
          </text>

          <g className={s.marks}>
            {marks}
            {mark != null ? (
              <>
                <circle cx={screen[mark].x} cy={screen[mark].y} r={9} className={s.dotHalo} />
                <circle cx={screen[mark].x} cy={screen[mark].y} r={7} className={s.dotPicked} style={{ fill: dots[mark].color }} />
              </>
            ) : null}
            {active != null ? (
              <circle
                cx={screen[active].x}
                cy={screen[active].y}
                r={(active === mark ? 7 : swarm.radius) + 3.5}
                className={s.dotRing}
              />
            ) : null}
          </g>

          {mark != null && markLabel ? (
            <text
              x={Math.min(x1, Math.max(x0, screen[mark].x))}
              y={Math.max(PAD.top + 12, screen[mark].y - 14)}
              textAnchor={markAnchor}
              className={`${s.labelStrong} ${s.halo}`}>
              {markLabel}
            </text>
          ) : null}

          <line x1={x0} x2={x1} y1={axisY} y2={axisY} className={s.axis} />
          {xTicks.map((t) => (
            <text key={t} x={sx(t)} y={axisY + 16} textAnchor="middle" className={s.tick}>
              {tickLabel(t, domain)}
            </text>
          ))}

          {range ? (
            <g>
              <line x1={rangeLeft} x2={rangeRight} y1={axisY + 30} y2={axisY + 30} className={s.bracket} />
              <line x1={rangeLeft} x2={rangeLeft} y1={axisY + 25} y2={axisY + 35} className={s.bracket} />
              <line x1={rangeRight} x2={rangeRight} y1={axisY + 25} y2={axisY + 35} className={s.bracket} />
              <text
                // Starts under the bracket, but never runs off the right edge.
                x={Math.max(x0, Math.min(rangeLeft, x1 - textWidth(RANGE_LABEL, 11)))}
                y={axisY + 52}
                className={s.label}>
                {RANGE_LABEL}
              </text>
            </g>
          ) : null}
        </svg>
      )}

      {ready && info && at ? (
        <div
          className={at.y < 130 ? `${s.tooltip} ${s.tooltipBelow}` : s.tooltip}
          style={{
            left: Math.min(Math.max(at.x, 110), Math.max(110, width - 110)),
            top: at.y,
            borderTopColor: info.team ? teamInfo(info.team).color : undefined,
          }}
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
        {picked != null && indexById.has(picked) ? speak(picked) : ''}
      </p>
    </div>
  );
}
