'use client';

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import type { Side } from '@/players/versus';

import s from './compare.module.css';

/** The ring's width: marks at 0 and 100 stay inside the line by half of it (matches --ring in CSS). */
const RING = 16;
/** Half the tooltip's widest size, to keep it inside the chart. */
const TIP_HALF = 140;

export type DumbbellRow = {
  id: string;
  label: string;
  /** Positions on the 0-100 line; null draws no mark for that player. */
  a: number | null;
  b: number | null;
  aValue: string;
  bValue: string;
  /** The side whose value is set in bold (a win that holds). */
  strong?: Side | null;
  /** The outcome for this row, beside it (wide layout) or above the line (stacked). */
  verdict?: ReactNode;
  /** A row that is shown but not scored: quieter. */
  muted?: boolean;
  /** Shown when neither player has a mark. */
  emptyText?: string;
  tip: ReactNode;
  /** The row in one sentence, read out when it is reached with the arrow keys. */
  sentence: string;
};

export type DumbbellGroup = { title?: string; rows: readonly DumbbellRow[] };

type Props = {
  groups: readonly DumbbellGroup[];
  /** Tick labels on the 0-100 line. */
  ticks: readonly { at: number; label: string }[];
  /** "wide": label, values, line and verdict on one line. "stacked": label above the line. */
  layout: 'wide' | 'stacked';
  /** The chart in a sentence, for screen readers. */
  summary: string;
};

/**
 * Two players on one 0-100 line per stat: player 1 a filled dot, player 2 a
 * ring, joined by a line so the gap reads at a glance. Hover or the arrow
 * keys show a row's details; touch selects a row.
 */
export function DumbbellChart({ groups, ticks, layout, summary }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const pointer = useRef('mouse');
  const [active, setActive] = useState<number | null>(null);
  const [keyed, setKeyed] = useState(false);
  const rows = groups.flatMap((g) => g.rows);
  const current = active != null ? rows[active] : null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const n = rows.length;
    if (!n) return;
    let next = active ?? -1;
    if (e.key === 'ArrowDown') next = Math.min(n - 1, next + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, next < 0 ? 0 : next - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else if (e.key === 'Escape') {
      setActive(null);
      return;
    } else return;
    e.preventDefault();
    setKeyed(true);
    setActive(next);
    rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
  }

  // The tooltip sits above the selected row, over the gap between the two marks.
  const [tip, setTip] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const ca = current?.a ?? null;
  const cb = current?.b ?? null;
  useLayoutEffect(() => {
    const li = active != null ? rowRefs.current[active] : null;
    const track = li?.querySelector<HTMLElement>('[data-track]');
    if (!box.current || !track) {
      setTip(null);
      return;
    }
    const boxRect = box.current.getBoundingClientRect();
    const t = track.getBoundingClientRect();
    const marks = [ca, cb].filter((v): v is number => v != null);
    const at = marks.length ? (Math.min(...marks) + Math.max(...marks)) / 2 : 50;
    const raw = t.left - boxRect.left + RING / 2 + ((t.width - RING) * at) / 100;
    const half = Math.min(TIP_HALF, boxRect.width / 2);
    const left = Math.min(Math.max(raw, half), boxRect.width - half);
    const top = t.top - boxRect.top;
    setTip({ left, top, below: top < 140 });
  }, [active, ca, cb]);

  let i = 0;
  return (
    <div
      ref={box}
      className={`${s.dumbbell} ${layout === 'wide' ? s.wide : s.stacked}`}
      tabIndex={0}
      role="group"
      aria-roledescription="chart"
      aria-label={`${summary} Use the up and down arrow keys to go through the stats.`}
      onKeyDown={onKeyDown}
      onBlur={() => keyed && setActive(null)}
      onPointerLeave={(e) => e.pointerType !== 'touch' && setActive(null)}>
      <div className={s.scale} aria-hidden="true">
        <span className={s.scaleTrack}>
          {ticks.map((t) => (
            <span key={t.at} style={{ left: `${t.at}%` }}>
              {t.label}
            </span>
          ))}
        </span>
      </div>

      {groups.map((g, gi) => (
        <div key={g.title ?? gi} className={s.group}>
          {g.title ? <h3 className={`t-eyebrow ${s.groupTitle}`}>{g.title}</h3> : null}
          <ul>
            {g.rows.map((row) => {
              const index = i++;
              return (
                <li
                  key={row.id}
                  ref={(el) => {
                    rowRefs.current[index] = el;
                  }}
                  className={`${s.row} ${row.muted ? s.rowMuted : ''} ${index === active ? s.rowActive : ''}`}
                  onPointerEnter={(e) => {
                    if (e.pointerType === 'touch') return;
                    setKeyed(false);
                    setActive(index);
                  }}
                  onPointerDown={(e) => {
                    pointer.current = e.pointerType;
                  }}
                  onClick={() => {
                    setKeyed(false);
                    // Touch has no hover: a tap shows the row, a second tap hides it.
                    if (pointer.current === 'touch') setActive((v) => (v === index ? null : index));
                    else setActive(index);
                  }}>
                  <Line row={row} />
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {current && tip ? (
        <div
          className={`${s.tip} ${tip.below ? s.tipBelow : ''}`}
          style={{ left: tip.left, top: tip.below ? tip.top + 24 : tip.top - 6 }}
          aria-hidden="true">
          {current.tip}
        </div>
      ) : null}
      <p className="visually-hidden" aria-live="polite">
        {keyed && current ? current.sentence : ''}
      </p>
    </div>
  );
}

function Line({ row }: { row: DumbbellRow }) {
  const marks = [row.a, row.b].filter((v): v is number => v != null);
  const lo = marks.length === 2 ? Math.min(...marks) : null;
  const hi = marks.length === 2 ? Math.max(...marks) : null;
  return (
    <>
      <span className={s.label}>{row.label}</span>
      <span className={`num ${s.value} ${s.valueA} ${row.strong === 'a' ? s.strong : ''}`}>{row.aValue}</span>
      <span className={s.track} data-track="">
        <span className={s.trackLine} />
        <span className={s.trackInner}>
          <span className={s.trackMid} />
          {lo != null && hi != null ? (
            <span className={s.connector} style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
          ) : null}
          {row.b != null ? <span className={s.markRing} style={{ left: `${row.b}%` }} /> : null}
          {row.a != null ? <span className={s.markDot} style={{ left: `${row.a}%` }} /> : null}
        </span>
        {marks.length === 0 && row.emptyText ? <span className={`t-caption ${s.trackEmpty}`}>{row.emptyText}</span> : null}
      </span>
      <span className={`num ${s.value} ${s.valueB} ${row.strong === 'b' ? s.strong : ''}`}>{row.bValue}</span>
      {row.verdict !== undefined ? <span className={s.outcome}>{row.verdict}</span> : null}
    </>
  );
}
