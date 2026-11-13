'use client';

import { useRef, type KeyboardEvent } from 'react';

import s from './ui.module.css';

/**
 * One choice from several, as wrapping chips with radio semantics: arrow keys
 * move and select, Tab enters and leaves the group once. For option lists too
 * long for a segmented control (questions, stats).
 */
export function ChoiceChips<T extends string>({
  labelledBy,
  label,
  options,
  value,
  onChange,
}: {
  /** The id of the visible heading that names the group, or `label` when there is none. */
  labelledBy?: string;
  label?: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
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
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      className={s.choiceChips}
      onKeyDown={onKeyDown}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          tabIndex={o.id === value ? 0 : -1}
          className={s.choiceChip}
          onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
