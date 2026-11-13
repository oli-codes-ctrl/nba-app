'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CheckIcon } from '@/components/icons';
import { Skeleton } from '@/components/primitives';
import { progress, type Facts, type Trophy } from '@/game/trophies';
import { formatDate } from '@/lib/format';

import { claimTrophies, loadFacts, SITE_TROPHIES } from './browser';
import s from './games.module.css';

type Group = { game: Trophy['game']; title: string; href: string; action: string };

const GROUPS: readonly Group[] = [
  { game: 'Daily Guess', title: 'Daily Guess', href: '/games/daily', action: 'Play Daily Guess' },
  { game: 'Higher or Lower', title: 'Higher or Lower', href: '/games/higher-lower', action: 'Play Higher or Lower' },
  { game: 'Box Score Mystery', title: 'Box Score Mystery', href: '/games/box-score', action: 'Play Box Score Mystery' },
  { game: 'Explore', title: 'Around the site', href: '/teams', action: 'Browse the Teams' },
];

/**
 * Every trophy the site offers, earned or not, with progress toward each.
 * Read from this browser after hydration; a trophy, once earned, is kept.
 */
export function TrophyCase() {
  const [facts, setFacts] = useState<Facts | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Record anything earned but not yet written down (older progress), then read.
    claimTrophies()
      .then(() => loadFacts())
      .then((f) => {
        if (!cancelled) setFacts(f);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const earned = facts ? SITE_TROPHIES.filter((t) => facts.career.unlocked[t.id]).length : 0;
  const total = SITE_TROPHIES.length;
  const latest = facts
    ? SITE_TROPHIES.filter((t) => facts.career.unlocked[t.id]).sort((a, b) =>
        facts.career.unlocked[b.id].localeCompare(facts.career.unlocked[a.id]),
      )[0]
    : undefined;

  return (
    <>
      <section className={`${s.panel} ${s.trophySummary}`} aria-labelledby="summary-title" aria-busy={facts == null}>
        <h2 id="summary-title" className="visually-hidden">
          Trophies earned
        </h2>
        <p className={s.bigScore}>
          <span className="num">{facts ? `${earned} of ${total}` : `– of ${total}`}</span>
          <span className="t-body t-muted">
            {facts == null
              ? 'Loading your trophies…'
              : earned === 0
                ? 'No trophies yet. Solving one Daily Guess earns the first.'
                : earned === total
                  ? 'Every trophy earned. Nothing left to win.'
                  : `trophies earned. The latest: ${latest?.title}.`}
          </span>
        </p>
        <span className={s.progressTrack} aria-hidden="true">
          <span className={s.progressFill} style={{ transform: `scaleX(${earned / total})` }} />
        </span>
        <p className="t-caption t-subtle">Once earned, a trophy is yours to keep. They live in this browser.</p>
      </section>

      <div className={s.trophyGrid}>
        {GROUPS.map((g, i) => {
          const list = SITE_TROPHIES.filter((t) => t.game === g.game);
          return (
            <section key={g.game} className={s.panel} aria-labelledby={`group-${i}`}>
              <header className={s.trophyHead}>
                <h2 id={`group-${i}`} className="t-card-title">
                  {g.title}
                </h2>
                <span className="t-caption t-subtle num">
                  {facts ? `${list.filter((t) => facts.career.unlocked[t.id]).length} of ${list.length}` : ''}
                </span>
              </header>
              <ul className={i === 0 ? `${s.trophyList} ${s.trophyListWide}` : s.trophyList}>
                {list.map((t) => (
                  <TrophyRow key={t.id} trophy={t} facts={facts} />
                ))}
              </ul>
              <Link href={g.href} className={`${s.inlineLink} ${s.pushDown}`}>
                {g.action}
              </Link>
            </section>
          );
        })}
      </div>
    </>
  );
}

function TrophyRow({ trophy: t, facts }: { trophy: Trophy; facts: Facts | null }) {
  if (!facts) {
    return (
      <li className={s.trophyRow}>
        <Skeleton height={32} width={32} radius="50%" />
        <span className={s.trophyText}>
          <span className={s.trophyTitle}>{t.title}</span>
          <span className="t-body-sm t-muted">{t.description}</span>
        </span>
      </li>
    );
  }
  const date = facts.career.unlocked[t.id];
  const current = Math.min(t.current(facts), t.target);
  return (
    <li className={date ? `${s.trophyRow} ${s.trophyEarned}` : s.trophyRow}>
      <span className={date ? `${s.medal} ${s.medalEarned}` : s.medal} aria-hidden="true">
        {date ? <CheckIcon size={16} /> : null}
      </span>
      <span className={s.trophyText}>
        <span className={s.trophyTitle}>
          {t.title}
          <span className="visually-hidden">{date ? ', earned' : ', not earned yet'}</span>
        </span>
        <span className="t-body-sm t-muted">{t.description}</span>
        {date ? (
          <span className="t-caption t-subtle">Earned {formatDate(date)}</span>
        ) : t.target > 1 ? (
          <span className={s.trophyProgress}>
            <span className={s.progressTrack} aria-hidden="true">
              <span className={s.progressFill} style={{ transform: `scaleX(${progress(t, facts)})` }} />
            </span>
            <span className={`t-caption t-subtle num ${s.trophyCount}`}>
              {current} of {t.target}
            </span>
          </span>
        ) : null}
      </span>
    </li>
  );
}
