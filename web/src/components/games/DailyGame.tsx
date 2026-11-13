'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import c from '@/charts/charts.module.css';
import { ScatterChart, type ScatterTip } from '@/charts/ScatterChart';
import { Button, ButtonLink } from '@/components/Button';
import { ChartFrame, Disclosure } from '@/components/ChartFrame';
import { ChoiceChips } from '@/components/ChoiceChips';
import { ChartIcon, CheckIcon, CloseIcon, TableIcon } from '@/components/icons';
import { Avatar, Badge, EmptyState, Note, Skeleton, TeamChip } from '@/components/primitives';
import tb from '@/components/table.module.css';
import type { Puzzle, PuzzlePoolEntry } from '@/data/types';
import {
  isDoublePoints,
  MAX_CLUES,
  MAX_GUESSES,
  pointsAvailable,
  puzzleFor,
  score,
  shareText,
  wrongGuesses,
  type DailyStats,
  type GameState,
} from '@/game/daily';
import type { Trophy } from '@/game/trophies';
import { shortName } from '@/graphs/analysis';
import type { ChartPoint } from '@/graphs/math';
import { fold } from '@/lib/fold';
import { formatDate, ordinal } from '@/lib/format';
import { playerPath } from '@/lib/routes';
import { useQuery } from '@/lib/useQueryParam';
import { positionName } from '@/stats/views';
import { teamInfo } from '@/theme/teams';

import { untilMidnight, useToday } from './browser';
import { EarnedTrophies, ScoreList, ShareButton } from './GameParts';
import s from './games.module.css';
import { useDailyGame } from './useDaily';

const SUGGESTIONS = 6;

/** The stats each pool entry carries. */
type PoolStat = 'age' | 'pts' | 'ast' | 'reb' | 'stl' | 'blk';
const POOL_STATS: Record<PoolStat, { label: string; short: string; noun: string }> = {
  age: { label: 'Age', short: 'Age', noun: 'years' },
  pts: { label: 'Points', short: 'PTS', noun: 'points' },
  ast: { label: 'Assists', short: 'AST', noun: 'assists' },
  reb: { label: 'Rebounds', short: 'REB', noun: 'rebounds' },
  stl: { label: 'Steals', short: 'STL', noun: 'steals' },
  blk: { label: 'Blocks', short: 'BLK', noun: 'blocks' },
};
const TABLE_STATS: readonly PoolStat[] = ['pts', 'ast', 'reb', 'stl', 'blk'];

function isPoolStat(id: string): id is PoolStat {
  return id in POOL_STATS;
}

function fmt(stat: PoolStat, value: number): string {
  return stat === 'age' ? String(value) : value.toFixed(1);
}

function pointsText(n: number): string {
  return `${n < 0 ? '−' : ''}${Math.abs(n)} ${Math.abs(n) === 1 ? 'point' : 'points'}`;
}

type Props = {
  puzzles: readonly Puzzle[];
  /** The puzzle date the static HTML shows; the reader's own date replaces it on hydration. */
  buildDate: string;
  /** "Nov 12, 2026" */
  through: string;
  /** Pool players with a page on the site. */
  pageIds: readonly number[];
};

/**
 * Daily Guess: one of the season's top scorers is a highlighted dot; switch
 * the stat on the chart to see where he stands, then name him. The rules
 * and scoring are the app's (`game/daily.ts`, unchanged).
 */
export function DailyGame({ puzzles, buildDate, through, pageIds }: Props) {
  const today = useToday();
  const puzzle = puzzleFor(puzzles, today ?? buildDate);
  if (!puzzle) {
    return (
      <EmptyState title="No puzzle yet.">
        The next one is published with tonight’s stats. <Link href="/games">Back to the games</Link>
      </EmptyState>
    );
  }
  return (
    <Board
      key={puzzle.date}
      puzzle={puzzle}
      stale={today != null && puzzle.date !== today}
      through={through}
      hasPage={pageIds.includes(puzzle.answerId)}
    />
  );
}

function Board({ puzzle, stale, through, hasPage }: { puzzle: Puzzle; stale: boolean; through: string; hasPage: boolean }) {
  const game = useDailyGame(puzzle);
  const { state, stats } = game;
  const [query, update] = useQuery();
  const [selected, setSelected] = useState<number | null>(null);
  const [said, setSaid] = useState('');
  const finishedHere = useRef(false);

  const hints = puzzle.hintStats.filter(isPoolStat);
  const statParam = query.get('stat') ?? '';
  const hint: PoolStat = hints.find((h) => h === statParam) ?? hints[0] ?? 'pts';
  const xStat: PoolStat = isPoolStat(puzzle.xStat) ? puzzle.xStat : 'age';
  const view = query.get('view') === 'table' ? 'table' : 'chart';
  const done = state != null && state.status !== 'playing';
  const pool = puzzle.pool;
  const byId = useMemo(() => new Map(pool.map((e) => [e.id, e])), [pool]);
  const answer = byId.get(puzzle.answerId);
  const ruledOut = useMemo(
    () => new Set((state?.guesses ?? []).filter((id) => id !== puzzle.answerId)),
    [state?.guesses, puzzle.answerId],
  );
  const double = isDoublePoints(puzzle.date);
  const mysteryName = done && answer ? answer.name : 'Mystery player';

  const points: ChartPoint[] = useMemo(
    () => pool.map((e) => ({ id: e.id, name: e.name, x: e[xStat], y: e[hint], z: null })),
    [pool, xStat, hint],
  );
  const colors = useMemo(() => points.map((p) => (p.id === puzzle.answerId ? 'var(--ink)' : 'var(--viz-mark)')), [points, puzzle.answerId]);

  function guess(id: number) {
    if (!state || state.status !== 'playing') return;
    const name = byId.get(id)?.name ?? 'That player';
    const next = state.guesses.length + 1;
    if (id === puzzle.answerId) {
      finishedHere.current = true;
      setSaid(`Correct: it’s ${name}.`);
    } else if (next >= MAX_GUESSES) {
      finishedHere.current = true;
      setSaid(`Not ${name}. Out of guesses: it was ${answer?.name ?? 'someone else'}.`);
    } else {
      const left = MAX_GUESSES - next;
      setSaid(`Not ${name}. ${left} ${left === 1 ? 'guess' : 'guesses'} left.`);
    }
    setSelected(null);
    game.guess(id);
  }

  // Where the mystery player ranks among the pool on the chosen stat, said in words.
  const mine = answer ? answer[hint] : null;
  let answerText = '';
  if (answer && mine != null) {
    const above = pool.filter((e) => e.id !== answer.id && e[hint] > mine).length;
    const tied = pool.some((e) => e.id !== answer.id && e[hint] === mine);
    const place = `${tied ? 'tied for ' : ''}the ${above === 0 ? '' : `${ordinal(above + 1)} `}most`;
    const line = `${fmt(hint, mine)} ${POOL_STATS[hint].noun} a game, ${place} among these ${pool.length} scorers`;
    answerText = done
      ? `It was ${answer.name}: ${line}.`
      : `The mystery player averages ${line}. He is ${fmt(xStat, answer[xStat])}.`;
  }

  const tip = (p: ChartPoint): ScatterTip => {
    const e = byId.get(p.id)!;
    const isAnswer = e.id === puzzle.answerId;
    return {
      title: isAnswer ? mysteryName : e.name,
      meta: isAnswer && !done ? 'Who is he?' : teamInfo(e.team).name,
      rows: [
        [POOL_STATS[xStat].label, fmt(xStat, e[xStat])],
        [POOL_STATS[hint].label, fmt(hint, e[hint])],
      ],
      note: ruledOut.has(e.id) ? 'You ruled him out' : isAnswer && done ? 'The answer' : undefined,
    };
  };
  const speak = (p: ChartPoint) => {
    const e = byId.get(p.id)!;
    const who = e.id === puzzle.answerId ? mysteryName : e.name;
    return `${who}: ${POOL_STATS[xStat].label.toLowerCase()} ${fmt(xStat, e[xStat])}, ${fmt(hint, e[hint])} ${POOL_STATS[hint].noun}.`;
  };

  return (
    <>
      <header className={s.header}>
        <h1 className="t-display-md">Who’s the mystery player?</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          Puzzle #{puzzle.number} · {formatDate(puzzle.date)}. One of the season’s top {pool.length} scorers is
          hidden on the chart. Switch stats to see where he stands, then name him in {MAX_GUESSES} guesses.
        </p>
        {double ? (
          <div>
            <Badge>Double points today</Badge>
          </div>
        ) : null}
        {stale ? <Note>Today’s puzzle isn’t out yet, so this is the most recent one.</Note> : null}
      </header>

      <div className={s.grid}>
        <ChartFrame
          id="mystery"
          title="Where does he stand?"
          meta={`Top ${pool.length} scorers · games through ${through}`}
          controls={
            <Button
              variant="tertiary"
              aria-pressed={view === 'table'}
              icon={view === 'table' ? <ChartIcon /> : <TableIcon />}
              onClick={() => update({ view: view === 'table' ? null : 'table' })}>
              {view === 'table' ? 'Chart' : 'Table'}
            </Button>
          }
          answer={answerText ? <p className={s.answerLead}>{answerText}</p> : null}
          howTo={
            <>
              <p>
                Each dot is one of the season’s top {pool.length} scorers: {POOL_STATS[xStat].label.toLowerCase()}{' '}
                across, the chosen stat up, per game. The large dot is the mystery player. Players you have guessed
                wrong turn hollow.
              </p>
              <p>Hover a dot to see who it is, or move with the arrow keys. Select one to guess him.</p>
            </>
          }>
          <div className={s.chartTools}>
            <span id="hint-label" className="visually-hidden">
              Stat on the chart
            </span>
            <ChoiceChips
              labelledBy="hint-label"
              options={hints.map((h) => ({ id: h, label: POOL_STATS[h].label }))}
              value={hint}
              onChange={(v) => update({ stat: v === hints[0] ? null : v })}
            />
            {view === 'chart' ? (
              <div className={c.legend} aria-hidden="true">
                <span className={c.legendItem}>
                  <span className={s.swatchMystery} />
                  {done ? mysteryName : 'Mystery player'}
                </span>
                <span className={c.legendItem}>
                  <span className={c.swatchDot} />
                  Other top scorers
                </span>
                {ruledOut.size ? (
                  <span className={c.legendItem}>
                    <span className={s.swatchHollow} />
                    Ruled out
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          {view === 'table' ? (
            <PoolTable pool={pool} hint={hint} answerId={puzzle.answerId} mysteryName={mysteryName} ruledOut={ruledOut} />
          ) : (
            <>
              <ScatterChart
                aspect={0.48}
                points={points}
                colors={colors}
                xTitle={POOL_STATS[xStat].label}
                yTitle={`${POOL_STATS[hint].label} per game`}
                hollow={ruledOut}
                medians={null}
                quadrants={null}
                trend={null}
                highlightIds={[puzzle.answerId]}
                labels={[{ id: puzzle.answerId, text: done && answer ? shortName(answer.name) : '?' }]}
                selectedId={selected}
                onSelect={setSelected}
                tip={tip}
                speak={speak}
                summary={`${POOL_STATS[hint].label} per game against ${POOL_STATS[xStat].label.toLowerCase()} for the top ${pool.length} scorers. The large dot is the mystery player.`}
              />
            </>
          )}
        </ChartFrame>

        <div className={s.rail}>
          {state == null || stats == null ? (
            <div className={s.panel} aria-busy="true">
              <Skeleton height={24} width="40%" />
              <Skeleton height={132} />
              <Skeleton height={44} />
            </div>
          ) : done ? (
            <Result
              puzzle={puzzle}
              state={state}
              stats={stats}
              earned={game.earned}
              answer={answer}
              hasPage={hasPage}
              focus={finishedHere.current}
            />
          ) : (
            <GuessPanel
              puzzle={puzzle}
              state={state}
              selected={selected}
              onGuess={guess}
              onClearSelected={() => setSelected(null)}
            />
          )}
          <Clues puzzle={puzzle} state={state} onClue={game.revealClue}>
          <Disclosure summary="How Scoring Works">
            <p>
              A right answer scores 3 points with no clues, 2 after 1 clue and 1 after both. Each wrong guess costs a
              point, so a day can end below zero. About 2 days a month count double.
            </p>
            <p>
              A new puzzle comes out at midnight your time. Win on consecutive days to build a streak. Scores stay in
              this browser.
            </p>
          </Disclosure>
          </Clues>
          <p className="visually-hidden" aria-live="polite">
            {said}
          </p>
        </div>
      </div>
    </>
  );
}

function GuessPanel({
  puzzle,
  state,
  selected,
  onGuess,
  onClearSelected,
}: {
  puzzle: Puzzle;
  state: GameState;
  selected: number | null;
  onGuess: (id: number) => void;
  onClearSelected: () => void;
}) {
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const needle = fold(text.trim());
  const options = needle
    ? puzzle.pool.filter((e) => e.searchName.includes(needle) && !state.guesses.includes(e.id)).slice(0, SUGGESTIONS)
    : [];
  const current = options[Math.min(active, options.length - 1)];
  const left = MAX_GUESSES - state.guesses.length;
  const worth = pointsAvailable(state) - wrongGuesses(state, puzzle);
  const pick = selected != null ? puzzle.pool.find((e) => e.id === selected) : undefined;

  function submit(id: number) {
    setText('');
    setActive(0);
    onGuess(id);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const n = options.length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      setActive((i) => (i + 1) % n);
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      setActive((i) => (i - 1 + n) % n);
    } else if (e.key === 'Enter' && current) {
      e.preventDefault();
      submit(current.id);
    } else if (e.key === 'Escape' && text) {
      e.preventDefault();
      setText('');
    }
  }

  return (
    <section className={s.panel} aria-labelledby="guess-title">
      <header className={s.panelHead}>
        <h2 id="guess-title" className="t-card-title">
          Who is it?
        </h2>
        <p className="t-caption t-subtle num">
          {left} {left === 1 ? 'guess' : 'guesses'} left · {pointsText(worth)} if you get it now
        </p>
      </header>

      <ol className={s.slots} aria-label="Your guesses">
        {Array.from({ length: MAX_GUESSES }, (_, i) => {
          const id = state.guesses[i];
          const e = id != null ? puzzle.pool.find((p) => p.id === id) : undefined;
          return e ? (
            <li key={i} className={`${s.slot} ${s.slotWrong}`}>
              <CloseIcon className={s.wrongIcon} />
              <span className={s.slotName}>{e.name}</span>
              <span className="t-caption t-subtle">Not him</span>
            </li>
          ) : (
            <li key={i} className={`${s.slot} ${s.slotEmpty}`}>
              <span className="t-caption t-subtle">Guess {i + 1}</span>
            </li>
          );
        })}
      </ol>

      {pick ? (
        <div className={s.pick}>
          {pick.id === puzzle.answerId ? (
            <p className="t-body-sm">That’s the mystery player. Who is he?</p>
          ) : state.guesses.includes(pick.id) ? (
            <p className="t-body-sm">{pick.name}: already ruled out.</p>
          ) : (
            <>
              <span className={s.pickWho}>
                <Avatar name={pick.name} size={28} />
                <span className={s.slotName}>{pick.name}</span>
                <TeamChip abbr={pick.team} />
              </span>
              <span className={s.pickActions}>
                <Button variant="primary" onClick={() => submit(pick.id)}>
                  Guess {shortName(pick.name)}
                </Button>
                <Button variant="tertiary" onClick={onClearSelected}>
                  Cancel
                </Button>
              </span>
            </>
          )}
        </div>
      ) : null}

      <div className={s.field}>
        <label htmlFor="guess-input" className={`t-eyebrow ${s.fieldLabel}`}>
          Name a player
        </label>
        <input
          id="guess-input"
          className={s.input}
          type="text"
          name="guess"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Type a name, like “Tatum”…"
          role="combobox"
          aria-expanded={options.length > 0}
          aria-controls="guess-options"
          aria-autocomplete="list"
          aria-activedescendant={current ? `guess-${current.id}` : undefined}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul id="guess-options" role="listbox" aria-label="Top scorers" className={s.options} hidden={options.length === 0}>
          {options.map((e) => (
            <li
              key={e.id}
              id={`guess-${e.id}`}
              role="option"
              aria-selected={e === current}
              className={s.option}
              onPointerMove={() => setActive(options.indexOf(e))}
              onClick={() => submit(e.id)}>
              <span className={s.slotName}>{e.name}</span>
              <TeamChip abbr={e.team} />
              <span className={s.optionAction}>Guess</span>
            </li>
          ))}
        </ul>
        {needle && options.length === 0 ? (
          <p className="t-caption t-subtle">
            No top scorer left matches “{text.trim()}”. The answer is one of the dots on the chart.
          </p>
        ) : !needle ? (
          <p className="t-caption t-subtle">Only the top {puzzle.pool.length} scorers are in play. Or select a dot on the chart.</p>
        ) : null}
      </div>
    </section>
  );
}

function Clues({
  puzzle,
  state,
  onClue,
  children,
}: {
  puzzle: Puzzle;
  state: GameState | null;
  onClue: () => void;
  /** The rules, at the foot of the panel. */
  children?: ReactNode;
}) {
  const done = state != null && state.status !== 'playing';
  const shown = state == null ? 0 : done ? MAX_CLUES : state.clues;
  const next = state ? pointsAvailable({ ...state, clues: Math.min(MAX_CLUES, state.clues + 1) }) : 0;
  const hidden = <span className={s.hiddenValue}>Hidden</span>;
  return (
    <section className={s.panel} aria-labelledby="clues-title">
      <header className={s.panelHead}>
        <h2 id="clues-title" className="t-card-title">
          {done ? 'What were the clues?' : 'Need a clue?'}
        </h2>
        {!done ? <p className="t-caption t-subtle">Each clue lowers what a right answer is worth.</p> : null}
      </header>
      <dl className={s.clues}>
        <div className={s.clue}>
          <dt className="t-body-sm t-subtle">Position and conference</dt>
          <dd className={s.clueValue}>
            {shown >= 1 ? `${positionName(puzzle.clues.position)} · ${puzzle.clues.conference}` : hidden}
          </dd>
        </div>
        <div className={s.clue}>
          <dt className="t-body-sm t-subtle">Team</dt>
          <dd className={s.clueValue}>
            {shown >= 2 ? (
              <>
                <TeamChip abbr={puzzle.clues.team} /> {teamInfo(puzzle.clues.team).name}
              </>
            ) : (
              hidden
            )}
          </dd>
        </div>
      </dl>
      {state && !done && state.clues < MAX_CLUES ? (
        <div className={s.clueAction}>
          <Button onClick={onClue}>Reveal a Clue</Button>
          <span className="t-caption t-subtle num">A right answer is then worth {pointsText(next)}.</span>
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Re-renders every minute, for the countdown to the next puzzle. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function Result({
  puzzle,
  state,
  stats,
  earned,
  answer,
  hasPage,
  focus,
}: {
  puzzle: Puzzle;
  state: GameState;
  stats: DailyStats;
  earned: readonly Trophy[];
  answer: PuzzlePoolEntry | undefined;
  hasPage: boolean;
  /** The game ended just now: move focus here, since the guess field it came from is gone. */
  focus: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const now = useNow();
  const won = state.status === 'won';
  const pts = score(state, puzzle);
  const tries = state.guesses.length;
  const winRate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;

  useEffect(() => {
    if (focus) heading.current?.focus();
  }, [focus]);

  const clueText = state.clues === 0 ? 'no clues' : state.clues === 1 ? '1 clue' : 'both clues';
  return (
    <section className={s.panel} aria-labelledby="result-title">
      <header className={s.panelHead}>
        <h2 id="result-title" ref={heading} tabIndex={-1} className={`t-card-title ${s.resultTitle}`}>
          How did you do?
        </h2>
        <p className={won ? `${s.verdict} ${s.verdictWin}` : `${s.verdict} ${s.verdictLoss}`}>
          {won ? <CheckIcon size={18} /> : <CloseIcon size={18} />}
          <span>
            {won
              ? `Solved in ${tries} ${tries === 1 ? 'guess' : 'guesses'} with ${clueText}.`
              : `Out of guesses.`}
          </span>
        </p>
      </header>

      {answer ? (
        <div className={s.answerRow}>
          <Avatar name={answer.name} size={40} />
          <span className={s.answerName}>
            {hasPage ? (
              <Link href={playerPath(answer)} className={s.answerLink}>
                {answer.name}
              </Link>
            ) : (
              answer.name
            )}
            <span className="t-caption t-subtle">
              {positionName(puzzle.clues.position)} · {teamInfo(answer.team).name}
            </span>
          </span>
          <TeamChip abbr={answer.team} />
        </div>
      ) : null}

      <ScoreList
        items={[
          ['Today', `${pts > 0 ? '+' : pts < 0 ? '−' : ''}${Math.abs(pts)}`],
          ['Streak', String(stats.currentStreak)],
          ['Best streak', String(stats.bestStreak)],
          ['Played', String(stats.played)],
          ['Won', `${winRate}%`],
          ['Total points', String(stats.totalScore)],
        ]}
      />

      <EarnedTrophies earned={earned} />

      <div className={s.actions}>
        <ShareButton text={() => shareText(state, puzzle)} path="/games/daily/" />
        {answer && hasPage ? <ButtonLink href={playerPath(answer)}>Player Page</ButtonLink> : null}
      </div>
      <p className="t-caption t-subtle num">Next puzzle in {untilMidnight(now)}, at midnight your time.</p>
    </section>
  );
}

function PoolTable({
  pool,
  hint,
  answerId,
  mysteryName,
  ruledOut,
}: {
  pool: readonly PuzzlePoolEntry[];
  hint: PoolStat;
  answerId: number;
  mysteryName: string;
  ruledOut: ReadonlySet<number>;
}) {
  const rows = [...pool].sort((a, b) => b[hint] - a[hint] || a.id - b.id);
  return (
    <div className={tb.tableBox} tabIndex={0} role="region" aria-label={`The top ${pool.length} scorers`}>
      <table className={tb.table}>
        <caption className="visually-hidden">
          The top {pool.length} scorers, most {POOL_STATS[hint].noun} first, with the mystery player marked.
        </caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col" className={tb.right}>
              Age
            </th>
            {TABLE_STATS.map((id) => (
              <th key={id} scope="col" className={tb.right}>
                <abbr title={`${POOL_STATS[id].label} per game`}>{POOL_STATS[id].short}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => {
            const mystery = e.id === answerId;
            return (
              <tr key={e.id} className={mystery ? tb.marked : undefined}>
                <th scope="row">
                  <span className={tb.tableName}>
                    {mystery ? mysteryName : e.name}
                    {ruledOut.has(e.id) ? <span className="t-caption t-subtle">Ruled out</span> : null}
                  </span>
                </th>
                <td className={`num ${tb.right}`}>{e.age}</td>
                {TABLE_STATS.map((id) => (
                  <td key={id} className={`num ${tb.right}`}>
                    {fmt(id, e[id])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
