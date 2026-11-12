'use client';

import { useRef, type KeyboardEvent } from 'react';

import s from './ui.module.css';

type Option<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  /** What is being chosen, for screen readers. */
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
};

/**
 * One choice from a few, as a radio group: arrow keys move and select, Tab
 * enters and leaves the group once.
 */
export function SegmentedControl<T extends string>({ label, options, value, onChange, compact }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((o) => o.id === value);
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    else return;
    e.preventDefault();
    onChange(options[next].id);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className={compact ? `${s.segmented} ${s.segmentedCompact}` : s.segmented}
      onKeyDown={onKeyDown}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          tabIndex={o.id === value ? 0 : -1}
          className={s.segment}
          onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
