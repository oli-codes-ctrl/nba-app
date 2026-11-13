'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button, type ButtonVariant } from '@/components/Button';
import { CheckIcon, ShareIcon } from '@/components/icons';
import type { Trophy } from '@/game/trophies';

import { shareResult } from './browser';
import s from './games.module.css';

/** Share a result: the share sheet on touch, the clipboard elsewhere, with what happened said out loud. */
export function ShareButton({
  text,
  path,
  label = 'Share Result',
  variant = 'primary',
}: {
  text: () => string;
  path: string;
  label?: string;
  variant?: ButtonVariant;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function share() {
    const outcome = await shareResult(text(), path);
    if (outcome === 'copied' || outcome === 'failed') {
      setState(outcome);
      window.setTimeout(() => setState('idle'), 2500);
    }
  }
  return (
    <>
      <Button variant={variant} icon={state === 'copied' ? <CheckIcon /> : <ShareIcon />} onClick={share}>
        {state === 'copied' ? 'Copied' : label}
      </Button>
      {state === 'failed' ? (
        <p className={`t-caption t-subtle ${s.fullRow}`}>This browser blocked copying. Take a screenshot of the result instead.</p>
      ) : null}
      <span className="visually-hidden" aria-live="polite">
        {state === 'copied' ? 'Result copied to the clipboard.' : ''}
      </span>
    </>
  );
}

/** The trophies a game just earned, with the way to the full list. */
export function EarnedTrophies({ earned }: { earned: readonly Trophy[] }) {
  if (!earned.length) return null;
  return (
    <p className={`t-body-sm ${s.trophy}`}>
      {earned.length === 1 ? 'Trophy earned: ' : 'Trophies earned: '}
      {earned.map((t, i) => (
        <span key={t.id}>
          {i > 0 ? ', ' : ''}
          <strong>{t.title}</strong> ({t.description})
        </span>
      ))}
      .{' '}
      <Link href="/games/trophies" className={s.inlineLink}>
        See Trophies
      </Link>
    </p>
  );
}

/** A row of labelled figures (the reader's record). Dashes until loaded. */
export function ScoreList({ items, label }: { items: readonly (readonly [string, string])[]; label?: string }) {
  return (
    <dl className={items.length === 4 ? `${s.record} ${s.record4}` : s.record} aria-label={label}>
      {items.map(([name, value]) => (
        <div key={name} className={s.recordItem}>
          <dt className="t-caption t-subtle">{name}</dt>
          <dd className={`num ${s.recordValue}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
