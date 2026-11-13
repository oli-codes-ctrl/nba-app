'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/Button';
import { Disclosure } from '@/components/ChartFrame';
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, CloseIcon } from '@/components/icons';
import { Avatar, Skeleton, TeamChip } from '@/components/primitives';
import type { Player } from '@/data/types';
import { loadStreakStats, saveStreakStats } from '@/game/storage';
import { endRun, isRight, level, nextRound, type Guess, type StreakRound, type StreakStats } from '@/game/streak';
import type { Trophy } from '@/game/trophies';
import { shortName } from '@/graphs/analysis';
import { formatStat, ordinal } from '@/lib/format';
import { playerPath } from '@/lib/routes';
import { CATALOG, type StatId } from '@/stats/catalog';
import { positionName } from '@/stats/views';

import { browserStore, claimTrophies } from './browser';
import { unpackStreak, type StreakData } from './gameData';
import { EarnedTrophies, ScoreList, ShareButton } from './GameParts';
import s from './games.module.css';

type Phase = 'guess' | 'right' | 'wrong';
const LEVEL_NAMES = ['Warm-up', 'Getting closer', 'Close calls', 'Coin flips'];
const PER_LEVEL = 4;
/** How long a right answer stays on screen before the next player is dealt (the app's timing). */
const ADVANCE_MS = 900;
const NOUNS: Partial<Record<StatId, string>> = {
  pts: 'points',
  reb: 'rebounds',
  ast: 'assists',
  stl: 'steals',
  blk: 'blocks',
  fg3m: 'threes',
  tov: 'turnovers',
  mpg: 'minutes',
};
const noun = (stat: StatId) => NOUNS[stat] ?? CATALOG[stat].label.toLowerCase();
const PATH = '/games/higher-lower/';

/**
 * Higher or Lower: one player's season average is shown; is the next
 * player's higher or lower? A right answer makes him the player to beat
 * with a new stat, and every 4 in a row the gaps get smaller. The rules
 * are the app's (`game/streak.ts`, unchanged).
 */
export function HigherLower({ data }: { data: StreakData }) {
  const pool = useMemo(() => unpackStreak(data), [data]);
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [round, setRound] = useState<StreakRound | null>(null);
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>('guess');
  const [newBest, setNewBest] = useState(false);
  const [earned, setEarned] = useState<Trophy[]>([]);
  const [said, setSaid] = useState('');
  const endedHere = useRef(false);

  // The first round is dealt in the browser once the saved record has loaded: deals are random.
  useEffect(() => {
    let cancelled = false;
    loadStreakStats(browserStore).then((saved) => {
      if (cancelled) return;
      setStats(saved);
      setRound(nextRound(pool, 0));
    });
    return () => {
      cancelled = true;
    };
  }, [pool]);

  // After a right answer, show the number briefly, then deal the next round.
  useEffect(() => {
    if (phase !== 'right' || !round) return;
    const t = window.setTimeout(() => {
      const next = nextRound(pool, run, round);
      setRound(next);
      setPhase('guess');
      if (next) setSaid(`Next: ${noun(next.stat)} per game. ${next.known.name} averages ${formatStat(next.stat, next.known.s[next.stat])}. Does ${next.mystery.name} average more or fewer?`);
    }, ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [phase, round, run, pool]);

  // Arrow keys answer when nothing else on the page has focus.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (document.activeElement !== document.body || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        answer(e.key === 'ArrowUp' ? 'higher' : 'lower');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function start() {
    setRun(0);
    setNewBest(false);
    setEarned([]);
    endedHere.current = false;
    const next = nextRound(pool, 0);
    setRound(next);
    setPhase('guess');
    setSaid(next ? `New run. ${noun(next.stat)} per game: ${next.known.name} averages ${formatStat(next.stat, next.known.s[next.stat])}.` : '');
    window.requestAnimationFrame(() => document.getElementById('hl-higher')?.focus());
  }

  function answer(guess: Guess) {
    if (!round || phase !== 'guess' || !stats) return;
    const { stat, known, mystery } = round;
    const mv = formatStat(stat, mystery.s[stat]);
    if (isRight(round, guess)) {
      setRun((r) => r + 1);
      setPhase('right');
      setSaid(`Right: ${mystery.name} averages ${mv}. Streak ${run + 1}.`);
      return;
    }
    const updated = endRun(stats, run);
    setNewBest(run > 0 && run > stats.best);
    setStats(updated);
    endedHere.current = true;
    setPhase('wrong');
    setSaid(`Wrong: ${mystery.name} averages ${mv}, ${isRight(round, 'higher') ? 'more' : 'fewer'} than ${known.name}. Run over at ${run}.`);
    saveStreakStats(browserStore, updated)
      .then(() => claimTrophies())
      .then((fresh) => {
        if (fresh.length) setEarned(fresh);
      });
  }

  function onBoardKey(e: KeyboardEvent<HTMLElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      answer(e.key === 'ArrowUp' ? 'higher' : 'lower');
    }
  }

  const revealed = phase !== 'guess';
  const lvl = level(run);
  const best = stats ? Math.max(stats.best, run) : 0;

  return (
    <>
      <header className={s.header}>
        <h1 className="t-display-md">Higher or lower?</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          One player’s season average is showing. Does the next player average more or less? Get it right and he
          becomes the player to beat, with a new stat. Every {PER_LEVEL} in a row, the numbers get closer.
        </p>
      </header>

      <div className={s.grid}>
        <section className={`${s.panel} ${s.stage}`} aria-labelledby="hl-question" onKeyDown={onBoardKey}>
          {!round || !stats ? (
            stats && pool.length < 2 ? (
              <p className="t-body t-muted">Not enough qualified players yet. Check back after a few more games.</p>
            ) : (
              <div className={s.stageSkeleton} aria-busy="true">
                <Skeleton height={16} width="30%" />
                <Skeleton height={32} width="70%" />
                <div className={s.duel}>
                  <Skeleton height={220} />
                  <Skeleton height={220} />
                </div>
                <Skeleton height={56} />
              </div>
            )
          ) : (
            <>
              <header className={s.panelHead}>
                <p className="t-eyebrow t-subtle num">
                  Level {lvl + 1} of {LEVEL_NAMES.length} · {LEVEL_NAMES[lvl]}
                </p>
                <h2 id="hl-question" className="t-headline">
                  Higher or lower: {CATALOG[round.stat].label.toLowerCase()}?
                </h2>
                <p className="t-body-sm t-muted num">
                  Does {round.mystery.name} average more or fewer {noun(round.stat)} than {shortName(round.known.name)}’s{' '}
                  {formatStat(round.stat, round.known.s[round.stat])}?
                </p>
              </header>

              <div className={s.duel}>
                <DuelCard role="Player to beat" player={round.known} stat={round.stat} pool={pool} shown />
                <span className={s.versus} aria-hidden="true">
                  vs
                </span>
                <DuelCard
                  key={round.mystery.id}
                  role="Next player"
                  player={round.mystery}
                  stat={round.stat}
                  pool={pool}
                  shown={revealed}
                  mark={phase === 'right' ? 'right' : phase === 'wrong' ? 'wrong' : null}
                />
              </div>

              {phase === 'wrong' ? (
                <RunOver
                  round={round}
                  run={run}
                  best={best}
                  newBest={newBest}
                  earned={earned}
                  focus={endedHere.current}
                  onAgain={start}
                />
              ) : (
                <div className={s.choice}>
                  <Button
                    id="hl-higher"
                    className={s.choiceButton}
                    icon={<ArrowUpIcon size={20} />}
                    aria-disabled={phase !== 'guess'}
                    aria-keyshortcuts="ArrowUp"
                    onClick={() => answer('higher')}>
                    Higher
                  </Button>
                  <Button
                    className={s.choiceButton}
                    icon={<ArrowDownIcon size={20} />}
                    aria-disabled={phase !== 'guess'}
                    aria-keyshortcuts="ArrowDown"
                    onClick={() => answer('lower')}>
                    Lower
                  </Button>
                </div>
              )}
            </>
          )}
          <p className="visually-hidden" aria-live="polite">
            {said}
          </p>
        </section>

        <div className={s.rail}>
          <section className={s.panel} aria-labelledby="run-title">
            <header className={s.panelHead}>
              <h2 id="run-title" className="t-card-title">
                How’s your run going?
              </h2>
              <p className="t-caption t-subtle">Your record in this browser.</p>
            </header>
            <ScoreList
              items={[
                ['This run', stats ? String(run) : '–'],
                ['Best run', stats ? String(best) : '–'],
                ['Runs played', stats ? String(stats.runs) : '–'],
              ]}
            />
            <LevelMeter run={run} />
            <Disclosure summary="How It Works">
            <p>
              The players are the {pool.length} who play the most minutes, among those who qualify. Stats are season
              averages per game: points, rebounds, assists, steals, blocks, threes, turnovers and minutes.
            </p>
            <p>
              Every {PER_LEVEL} right answers in a row, the two numbers get closer: from far apart at the warm-up to
              within a few percent of each other on coin flips. One miss ends the run.
            </p>
            <p>Answer with the Higher and Lower buttons, or the up and down arrow keys.</p>
            </Disclosure>
          </section>
        </div>
      </div>
    </>
  );
}

/** Which of the 4 levels the run is on, and how far to the next. */
function LevelMeter({ run }: { run: number }) {
  const lvl = level(run);
  const top = lvl === LEVEL_NAMES.length - 1;
  const toNext = PER_LEVEL - (run % PER_LEVEL);
  return (
    <div className={s.level}>
      <div className={s.levelSteps} aria-hidden="true">
        {LEVEL_NAMES.map((name, i) => (
          <span key={name} className={i <= lvl ? `${s.levelStep} ${s.levelStepOn}` : s.levelStep} />
        ))}
      </div>
      <p className="t-caption t-subtle num">
        Level {lvl + 1}, {LEVEL_NAMES[lvl].toLowerCase()}.{' '}
        {top ? 'The closest calls from here on.' : `${toNext} more right for ${LEVEL_NAMES[lvl + 1].toLowerCase()}.`}
      </p>
    </div>
  );
}

function rankText(pool: readonly Player[], stat: StatId, p: Player): string {
  const v = p.s[stat];
  if (v == null) return '';
  const above = pool.filter((x) => (x.s[stat] ?? -Infinity) > v).length;
  const tied = pool.some((x) => x.id !== p.id && x.s[stat] === v);
  return `${tied ? 'Tied for ' : ''}${ordinal(above + 1)} most of these ${pool.length}`;
}

function DuelCard({
  role,
  player,
  stat,
  pool,
  shown,
  mark = null,
}: {
  role: string;
  player: Player;
  stat: StatId;
  pool: readonly Player[];
  shown: boolean;
  mark?: 'right' | 'wrong' | null;
}) {
  const v = player.s[stat];
  const max = Math.max(...pool.map((p) => p.s[stat] ?? 0));
  const share = v != null && max > 0 ? Math.max(0.02, v / max) : 0;
  const markClass = mark === 'right' ? s.duelRight : mark === 'wrong' ? s.duelWrong : '';
  return (
    <article className={`${s.duelCard} ${markClass}`} aria-label={`${role}: ${player.name}`}>
      <p className={`t-eyebrow t-subtle ${s.duelRole}`}>{role}</p>
      <div className={s.duelWho}>
        <Avatar name={player.name} size={40} />
        <span className={s.duelName}>
          <span className={s.duelNameText}>{player.name}</span>
          <span className={`t-caption t-subtle ${s.duelMeta}`}>
            <TeamChip abbr={player.team} />
            {positionName(player.pos)}
          </span>
        </span>
      </div>
      <p className={s.duelValueRow}>
        <span className={`num ${s.duelValue}`} aria-hidden={!shown}>
          {shown ? formatStat(stat, v) : '?'}
        </span>
        {shown ? null : <span className="visually-hidden">Hidden until you answer</span>}
        {mark === 'right' ? (
          <span className={s.duelMark}>
            <CheckIcon size={20} />
            Right
          </span>
        ) : mark === 'wrong' ? (
          <span className={`${s.duelMark} ${s.duelMarkWrong}`}>
            <CloseIcon size={20} />
            Wrong
          </span>
        ) : null}
      </p>
      <span className={s.duelBar} aria-hidden="true">
        <span className={s.duelBarFill} style={{ transform: `scaleX(${shown ? share : 0})` }} />
      </span>
      <p className={`t-caption t-subtle num ${s.duelRank}`}>{shown ? rankText(pool, stat, player) : `${noun(stat)} per game`}</p>
    </article>
  );
}

function RunOver({
  round,
  run,
  best,
  newBest,
  earned,
  focus,
  onAgain,
}: {
  round: StreakRound;
  run: number;
  best: number;
  newBest: boolean;
  earned: readonly Trophy[];
  focus: boolean;
  onAgain: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) heading.current?.focus();
  }, [focus]);
  const { stat, known, mystery } = round;
  return (
    <div className={s.runOver}>
      <h3 ref={heading} tabIndex={-1} className={`t-card-title ${s.resultTitle}`}>
        {newBest ? `New best: ${run} in a row` : `Run over at ${run}`}
      </h3>
      <p className="t-body-sm t-muted num">
        {mystery.name} averages {formatStat(stat, mystery.s[stat])} {noun(stat)},{' '}
        {isRight(round, 'higher') ? 'more' : 'fewer'} than {known.name}’s {formatStat(stat, known.s[stat])}.
        {newBest ? '' : ` Your best is ${best}.`}
      </p>
      <EarnedTrophies earned={earned} />
      <div className={s.actions}>
        <Button variant="primary" onClick={onAgain}>
          Play Again
        </Button>
        <ShareButton
          variant="secondary"
          label="Share Run"
          path={PATH}
          text={() => `Hoops Higher or Lower: a streak of ${run}. Best ${best}.`}
        />
      </div>
      <p className="t-caption t-subtle">
        Look them up:{' '}
        <Link href={playerPath(known)} className={s.inlineLink} prefetch={false}>
          {known.name}
        </Link>
        ,{' '}
        <Link href={playerPath(mystery)} className={s.inlineLink} prefetch={false}>
          {mystery.name}
        </Link>
        .
      </p>
    </div>
  );
}
