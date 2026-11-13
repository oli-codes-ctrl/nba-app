'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Skeleton } from '@/components/primitives';
import { beeswarm } from '@/graphs/distribution';
import { placeLabels } from '@/graphs/labels';
import { scale } from '@/graphs/math';
import { teamPath } from '@/lib/routes';

import s from './charts.module.css';
import { useChartBox } from './useChartBox';

export type LuckPoint = {
  abbr: string;
  name: string;
  /** Wins above what the point differential predicts. */
  luck: number;
  record: string;
  /** Wins the point differential predicts. */
  expected: number | null;
  /** 95% half-width of luck alone for this team, in wins. */
  noise: number | null;
};

const PAD = { left: 16, right: 16, top: 28, bottom: 44 };
const BAND = 96;
const LABEL_SIZE = 11;
const HIT = 24;

type Props = {
  teams: readonly LuckPoint[];
  /** The usual 95% half-width of luck alone: the shaded "normal luck" band. */
  noise: number;
  highlight?: string | null;
  summary: string;
};

function signed(v: number, digits = 1): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}`;
}

/**
 * "Who's been lucky?" Each team's wins above or below what its point
 * differential predicts, one dot per team. The shaded band is what coin-flip
 * close games produce on their own; only teams outside it are named.
 */
export function LuckStrip({ teams, noise, highlight = null, summary }: Props) {
  const { ref, width, ready, entering } = useChartBox<HTMLDivElement>();
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const pointer = useRef('mouse');

  const limit = Math.ceil(Math.max(noise * 1.6, ...teams.map((t) => Math.abs(t.luck) + 0.3), 1));
  const height = PAD.top + BAND + PAD.bottom;
  const x0 = PAD.left;
  const x1 = Math.max(x0 + 1, width - PAD.right);
  const sx = scale([-limit, limit], [x0, x1]);
  const mid = PAD.top + BAND / 2;
  const axisY = PAD.top + BAND + 4;

  const swarm = useMemo(
    () => (width > 0 ? beeswarm(teams.map((t) => sx(t.luck)), BAND / 2, 6, 3) : { dots: [], radius: 6 }),
    // sx depends only on width and limit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teams, width, limit],
  );
  const screen = useMemo(() => {
    const out = teams.map(() => ({ x: 0, y: 0 }));
    for (const d of swarm.dots) out[d.index] = { x: d.x, y: mid + d.y };
    return out;
  }, [swarm, teams, mid]);
  const order = useMemo(() => teams.map((_, i) => i).sort((a, b) => teams[b].luck - teams[a].luck), [teams]);

  const hi = highlight ? teams.findIndex((t) => t.abbr === highlight) : -1;
  // Name the page's team, then everyone outside normal luck, most extreme first.
  const toLabel = teams
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => i === hi || Math.abs(t.luck) > noise)
    .sort((a, b) => (a.i === hi ? -1 : b.i === hi ? 1 : Math.abs(b.t.luck) - Math.abs(a.t.luck)));
  const dots = screen.map((p, i) => ({ id: i, x: p.x, y: p.y, r: (i === hi ? 8 : swarm.radius) + 1, weight: i === hi ? 20 : 1 }));
  const bounds = { x0, y0: PAD.top - 4, x1, y1: PAD.top + BAND };
  const request = ({ t, i }: (typeof toLabel)[number]) => ({
    id: i,
    dotX: screen[i].x,
    dotY: screen[i].y,
    radius: i === hi ? 8 : swarm.radius,
    text: t.abbr,
    required: i === hi,
  });
  const first = width > 0 && hi >= 0 ? placeLabels(toLabel.filter((l) => l.i === hi).map(request), bounds, LABEL_SIZE, [], dots) : [];
  const placed =
    width > 0
      ? [...first, ...placeLabels(toLabel.filter((l) => l.i !== hi).map(request), bounds, LABEL_SIZE, first.map((l) => l.box), dots)]
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

  const verdict = (t: LuckPoint) => {
    const band = t.noise ?? noise;
    return t.luck > band ? 'Luckier than normal' : t.luck < -band ? 'Unluckier than normal' : 'Within normal luck';
  };
  const step = limit <= 4 ? 1 : 2;
  const tickValues = Array.from({ length: 2 * limit + 1 }, (_, i) => i - limit).filter((v) => v % step === 0);
  const active = hover ?? picked;
  const tip = active != null ? teams[active] : null;
  const tipAt = active != null ? screen[active] : null;

  return (
    <div
      ref={ref}
      className={s.chart}
      style={{ height, cursor: hover != null ? 'pointer' : 'crosshair' }}
      tabIndex={0}
      role="group"
      aria-roledescription="chart"
      aria-label={`${summary} Use the arrow keys to go through teams, luckiest first, and Enter to open one.`}
      onPointerDown={(e) => {
        pointer.current = e.pointerType;
      }}
      onPointerMove={(e) => e.pointerType !== 'touch' && setHover(nearest(e))}
      onPointerLeave={() => setHover(null)}
      onBlur={() => setPicked(null)}
      onClick={(e) => {
        const i = nearest(e);
        if (i == null) return;
        if (pointer.current === 'touch' && picked !== i) setPicked(i);
        else open(i);
      }}
      onKeyDown={onKeyDown}>
      {!ready ? (
        <Skeleton height={height} radius="var(--radius-md)" />
      ) : (
        <svg width={width} height={height} aria-hidden="true" className={entering ? s.enter : undefined}>
          {/* What luck alone produces: coin-flip close games. */}
          <rect x={sx(-noise)} y={PAD.top} width={Math.max(1, sx(noise) - sx(-noise))} height={BAND} rx={4} className={s.bandRect} />
          <text x={sx(0)} y={PAD.top - 10} textAnchor="middle" className={s.axisTitle}>
            Normal luck: within {noise.toFixed(1)} wins
          </text>
          <line x1={sx(0)} x2={sx(0)} y1={PAD.top} y2={PAD.top + BAND} className={s.reference} />

          <g className={s.marks}>
            {teams.map((t, i) =>
              i === hi ? null : (
                <circle key={t.abbr} cx={screen[i].x} cy={screen[i].y} r={i === active ? swarm.radius + 1.5 : swarm.radius} className={i === active ? s.dotHover : s.dot} />
              ),
            )}
            {hi >= 0 ? <circle cx={screen[hi].x} cy={screen[hi].y} r={8} className={s.dotFocus} /> : null}
            {active != null && active !== hi ? (
              <circle cx={screen[active].x} cy={screen[active].y} r={swarm.radius + 4} className={s.dotRing} />
            ) : null}
          </g>

          <line x1={x0} x2={x1} y1={axisY} y2={axisY} className={s.axis} />
          {tickValues.map((v) => (
            <text key={v} x={sx(v)} y={axisY + 15} textAnchor="middle" className={s.tick}>
              {signed(v, 0)}
            </text>
          ))}
          <text x={x0} y={height - 4} className={s.axisTitle}>
            ← Fewer wins than expected
          </text>
          <text x={x1} y={height - 4} textAnchor="end" className={s.axisTitle}>
            More wins →
          </text>

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
          className={`${s.tooltip} ${s.tooltipBelow}`}
          style={{ left: Math.min(Math.max(tipAt.x, 100), Math.max(100, width - 100)), top: tipAt.y }}
          aria-hidden="true">
          <div className={s.tipTitle}>
            {tip.name} · {tip.record}
          </div>
          <div className={s.tipValue}>{signed(tip.luck)} wins</div>
          {tip.expected != null ? (
            <div className={s.tipRow}>
              <span>Point differential says</span>
              <span>{tip.expected.toFixed(1)}</span>
            </div>
          ) : null}
          <div className={s.tipRow}>
            <span>{verdict(tip)}</span>
          </div>
        </div>
      ) : null}
      <p className="visually-hidden" aria-live="polite">
        {picked != null
          ? `${teams[picked].name}, ${teams[picked].record}: ${signed(teams[picked].luck)} wins against what the point differential predicts. ${verdict(teams[picked])}.${teams[picked].abbr !== highlight ? ' Press Enter to open.' : ''}`
          : ''}
      </p>
    </div>
  );
}
