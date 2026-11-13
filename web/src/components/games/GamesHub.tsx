'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ButtonLink } from '@/components/Button';
import { ChevronRightIcon, HigherLowerIcon, TableIcon, TrophyIcon } from '@/components/icons';
import { Badge, StatTiles } from '@/components/primitives';
import type { Puzzle } from '@/data/types';
import {
  EMPTY_STATS,
  isDoublePoints,
  liveStreak,
  MAX_GUESSES,
  puzzleFor,
  score,
  type DailyStats,
  type GameState,
} from '@/game/daily';
import { QUIZ_LENGTH, type MysteryStats } from '@/game/mystery';
import { loadGame, loadStats } from '@/game/storage';
import type { StreakStats } from '@/game/streak';
import { extent, paddedDomain, scale } from '@/graphs/math';

import { browserStore, loadFacts, SITE_TROPHIES, untilMidnight, useToday } from './browser';
import s from './games.module.css';

type Props = {
  puzzles: readonly Puzzle[];
  buildDate: string;
  /** h2 on the games hub, h3 inside a home page section. */
  level?: 2 | 3;
};

type Progress = { game: GameState; daily: DailyStats };

/**
 * The games hub's Daily Guess panel and the reader's record. Progress lives
 * in this browser, so the static HTML shows the fresh-puzzle state and the
 * saved one replaces it on hydration.
 */
export function DailyFeature({ puzzles, buildDate, level = 2 }: Props) {
  const Heading = level === 3 ? 'h3' : 'h2';
  const today = useToday();
  const puzzle = puzzleFor(puzzles, today ?? buildDate);
  const date = puzzle?.date ?? null;
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    Promise.all([loadGame(browserStore, date), loadStats(browserStore)]).then(([game, daily]) => {
      if (!cancelled) setProgress({ game, daily });
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (!puzzle) {
    return (
      <article className={s.daily} aria-labelledby="daily-title">
        <div className={s.dailyText}>
          <p className="t-eyebrow t-subtle">Daily Guess</p>
          <Heading id="daily-title" className="t-headline">
            Who’s today’s mystery player?
          </Heading>
          <p className="t-body t-muted">The next puzzle is published with tonight’s stats.</p>
        </div>
      </article>
    );
  }

  const game = progress?.game.date === puzzle.date ? progress.game : null;
  const status = game?.status ?? 'playing';
  const streak = progress && today ? liveStreak(progress.daily, today) : 0;
  const left = MAX_GUESSES - (game?.guesses.length ?? 0);
  const double = isDoublePoints(puzzle.date);

  let line: string;
  let cta: string;
  if (status === 'won' && game) {
    const pts = score(game, puzzle);
    line = `Solved today for ${pts} ${Math.abs(pts) === 1 ? 'point' : 'points'}. The next puzzle unlocks in ${untilMidnight(new Date())}.`;
    cta = 'See Your Result';
  } else if (status === 'lost') {
    line = `Not today. The next puzzle unlocks in ${untilMidnight(new Date())}.`;
    cta = 'See Your Result';
  } else if (game && game.guesses.length > 0) {
    line = `In progress: ${left} ${left === 1 ? 'guess' : 'guesses'} left.`;
    cta = 'Keep Playing';
  } else {
    line =
      streak > 0
        ? `Play today to keep your ${streak}-day streak going. You get 3 guesses, and clues cost points.`
        : `One of the top ${puzzle.pool.length} scorers is hidden on a chart. You get 3 guesses, and clues cost points.`;
    cta = 'Play Today’s Puzzle';
  }

  return (
    <article className={s.daily} aria-labelledby="daily-title">
      <div className={s.dailyText}>
        <p className={`t-eyebrow t-subtle ${s.eyebrowRow}`}>
          <span className="num">Daily Guess · #{puzzle.number}</span>
          {double ? <Badge>Double points</Badge> : null}
        </p>
        <Heading id="daily-title" className="t-headline">
          Who’s today’s mystery player?
        </Heading>
        <p className="t-body t-muted num">{line}</p>
        <div className={s.dailyActions}>
          <ButtonLink variant="primary" href="/games/daily">
            {cta}
          </ButtonLink>
        </div>
      </div>
      <MiniScatter puzzle={puzzle} solved={status !== 'playing'} />
    </article>
  );
}

/** The reader's Daily Guess record, from this browser. Dashes until it has loaded. */
export function DailyRecord() {
  const today = useToday();
  const [daily, setDaily] = useState<DailyStats | null>(null);
  useEffect(() => {
    loadStats(browserStore).then(setDaily);
  }, []);
  const d = daily ?? EMPTY_STATS;
  const ready = daily != null && today != null;
  const show = (v: string) => (ready ? v : '–');
  return (
    <StatTiles
      label="Your Daily Guess record"
      tiles={[
        { label: 'Played', value: show(String(d.played)) },
        { label: 'Solved', value: show(String(d.won)) },
        { label: 'Win rate', value: show(d.played ? `${Math.round((d.won / d.played) * 100)}%` : '–') },
        { label: 'Streak', value: show(String(today ? liveStreak(d, today) : 0)), note: 'Days in a row' },
        { label: 'Best streak', value: show(String(d.bestStreak)) },
        { label: 'Total points', value: show(String(d.totalScore)) },
      ]}
    />
  );
}

/** A thumbnail of today's chart: top scorers by age and points, the mystery dot ringed. Decorative. */
function MiniScatter({ puzzle, solved }: { puzzle: Puzzle; solved: boolean }) {
  // Drawn at the measured width, so text and dots keep their real size on every screen.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const H = Math.round(Math.min(240, Math.max(150, W * 0.4)));
  const pad = { l: 8, r: 8, t: 24, b: 24 };
  const xs = puzzle.pool.map((e) => e.age);
  const ys = puzzle.pool.map((e) => e.pts);
  const sx = scale(paddedDomain(extent(xs)), [pad.l, W - pad.r]);
  const sy = scale(paddedDomain(extent(ys)), [H - pad.b, pad.t]);
  const answer = puzzle.pool.find((e) => e.id === puzzle.answerId);
  const grid = [0.25, 0.5, 0.75].map((f) => pad.t + f * (H - pad.t - pad.b));
  if (W === 0) {
    return <div ref={box} className={s.mini} aria-hidden="true" style={{ minHeight: 182 }} />;
  }
  return (
    <div ref={box} className={s.mini} aria-hidden="true">
      <svg width={W} height={H} className={s.miniSvg}>
        {grid.map((y) => (
          <line key={y} x1={pad.l} x2={W - pad.r} y1={y} y2={y} className={s.miniGrid} />
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className={s.miniAxis} />
        {puzzle.pool.map((e) =>
          e.id === puzzle.answerId ? null : <circle key={e.id} cx={sx(e.age)} cy={sy(e.pts)} r={4} className={s.miniDot} />,
        )}
        {answer ? (
          <g>
            <circle cx={sx(answer.age)} cy={sy(answer.pts)} r={10} className={s.miniHalo} />
            <circle cx={sx(answer.age)} cy={sy(answer.pts)} r={6.5} className={s.miniMystery} />
            <text
              x={sx(answer.age) + (sx(answer.age) > W - 60 ? -16 : 16)}
              y={sy(answer.pts) + 5}
              textAnchor={sx(answer.age) > W - 60 ? 'end' : 'start'}
              className={s.miniLabel}>
              {solved ? answer.name.split(' ').slice(-1)[0] : '?'}
            </text>
          </g>
        ) : null}
        <text x={pad.l} y={12} className={s.miniAxisTitle}>
          ↑ Points
        </text>
        <text x={W - pad.r} y={H - 4} textAnchor="end" className={s.miniAxisTitle}>
          Age →
        </text>
      </svg>
    </div>
  );
}

type Progress8b = { streak: StreakStats; mystery: MysteryStats; trophies: number };

/** The other games, each with the reader's progress once it has loaded. */
export function OtherGames() {
  const [p, setP] = useState<Progress8b | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadFacts().then((f) => {
      if (!cancelled)
        setP({ streak: f.streak, mystery: f.mystery, trophies: SITE_TROPHIES.filter((t) => f.career.unlocked[t.id]).length });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <ul className={s.gameList}>
      <GameRow
        title="Higher or Lower"
        href="/games/higher-lower"
        icon={<HigherLowerIcon size={20} />}
        blurb="Does the next player average more or less? Keep the chain going as the gaps get smaller."
        status={p && p.streak.best > 0 ? `Best run ${p.streak.best}` : undefined}
      />
      <GameRow
        title="Box Score Mystery"
        href="/games/box-score"
        icon={<TableIcon size={20} />}
        blurb="Ten real stat lines, four names each. Whose line is it?"
        status={p && p.mystery.played ? `Best ${p.mystery.best}/${QUIZ_LENGTH}` : undefined}
      />
      <GameRow
        title="Trophies"
        href="/games/trophies"
        icon={<TrophyIcon size={20} />}
        blurb="Milestones across every game, from your first solve to a 30-day streak."
        status={p ? `${p.trophies} of ${SITE_TROPHIES.length}` : undefined}
      />
    </ul>
  );
}

/** One of the other games: a link once it exists, a plain row until then. */
function GameRow({
  title,
  blurb,
  icon,
  href,
  status,
}: {
  title: string;
  blurb: string;
  icon: ReactNode;
  href?: string;
  status?: string;
}) {
  const body = (
    <>
      <span className={s.gameIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={s.gameText}>
        <span className={s.gameTitle}>{title}</span>
        <span className="t-body-sm t-muted">{blurb}</span>
      </span>
      {status ? <Badge>{status}</Badge> : null}
      {href ? <ChevronRightIcon className={s.gameChevron} /> : null}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className={`${s.game} ${s.gameLink}`}>
          {body}
        </Link>
      ) : (
        <div className={s.game}>{body}</div>
      )}
    </li>
  );
}
