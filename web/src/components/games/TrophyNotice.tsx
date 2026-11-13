'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { CloseIcon, TrophyIcon } from '@/components/icons';

import s from './notice.module.css';
import { FOLLOWS_EVENT, TROPHY_EVENT, type TrophyEventDetail } from './trophyEvent';

const SHOW_MS = 8000;

/**
 * Says so when a trophy is earned away from a game (a team page, a
 * head-to-head, following a player). The games' code loads only when it is
 * needed, so every other page stays light.
 */
export function TrophyNotice() {
  const [shown, setShown] = useState<TrophyEventDetail['trophies']>([]);
  const timer = useRef<number | undefined>(undefined);
  const paused = useRef(false);

  useEffect(() => {
    const onEarned = (e: Event) => {
      const { trophies } = (e as CustomEvent<TrophyEventDetail>).detail;
      if (!trophies.length) return;
      setShown(trophies);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (!paused.current) setShown([]);
      }, SHOW_MS);
    };
    const onFollows = () => {
      import('./browser').then((m) => m.claimTrophies({ announce: true })).catch(() => {});
    };
    window.addEventListener(TROPHY_EVENT, onEarned);
    window.addEventListener(FOLLOWS_EVENT, onFollows);
    return () => {
      window.removeEventListener(TROPHY_EVENT, onEarned);
      window.removeEventListener(FOLLOWS_EVENT, onFollows);
      window.clearTimeout(timer.current);
    };
  }, []);

  // Stays while the pointer or focus is on it, then leaves a few seconds later.
  const hold = () => {
    paused.current = true;
    window.clearTimeout(timer.current);
  };
  const release = () => {
    paused.current = false;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown([]), SHOW_MS / 2);
  };

  const first = shown[0];
  return (
    <div className={s.region} role="status" aria-live="polite">
      {first ? (
        <div
          className={s.notice}
          onPointerEnter={hold}
          onPointerLeave={release}
          onFocus={hold}
          onBlur={release}>
          <span className={s.icon} aria-hidden="true">
            <TrophyIcon size={20} />
          </span>
          <span className={s.text}>
            <span className={`t-eyebrow ${s.eyebrow}`}>{shown.length === 1 ? 'Trophy earned' : `${shown.length} trophies earned`}</span>
            <span className={s.title}>{shown.map((t) => t.title).join(', ')}</span>
            <span className="t-caption t-subtle">{first.description}</span>
            <Link href="/games/trophies" className={s.link} onClick={() => setShown([])}>
              See Trophies
            </Link>
          </span>
          <button type="button" className={s.close} aria-label="Dismiss" onClick={() => setShown([])}>
            <CloseIcon />
          </button>
        </div>
      ) : null}
    </div>
  );
}
