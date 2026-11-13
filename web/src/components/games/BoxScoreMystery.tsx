'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/Button';
import { Disclosure } from '@/components/ChartFrame';
import { CheckIcon, CloseIcon } from '@/components/icons';
import { Skeleton, TeamChip } from '@/components/primitives';
import type { Player } from '@/data/types';
import { finishQuiz, makeQuiz, mysteryShareText, QUIZ_LENGTH, type MysteryKind, type MysteryStats, type Quiz } from '@/game/mystery';
import { loadMysteryStats, saveMysteryStats } from '@/game/storage';
import type { Trophy } from '@/game/trophies';
import { formatStat } from '@/lib/format';
import { playerPath } from '@/lib/routes';
import { positionName } from '@/stats/views';

import { browserStore, claimTrophies } from './browser';
import { unpackMystery, type MysteryData } from './gameData';
import { EarnedTrophies, ScoreList, ShareButton } from './GameParts';
import s from './games.module.css';

/** How long an answer stays on screen before the next line (the app's timing). */
const ADVANCE_MS = 1100;
const PATH = '/games/box-score/';

type Cell = { label: string; title: string; value: string };

/** The line as it is shown: six counting stats, then the shooting and minutes. */
function lineOf(p: Player, kind: MysteryKind): { cells: Cell[]; foot: string; spoken: string } {
  const g = p.g;
  if (kind === 'game' && g) {
    const n = (v: number | undefined) => String(v ?? 0);
    const cells: Cell[] = [
      { label: 'PTS', title: 'Points', value: n(g.pts) },
      { label: 'REB', title: 'Rebounds', value: n(g.reb) },
      { label: 'AST', title: 'Assists', value: n(g.ast) },
      { label: 'STL', title: 'Steals', value: n(g.stl) },
      { label: 'BLK', title: 'Blocks', value: n(g.blk) },
      { label: 'TOV', title: 'Turnovers', value: n(g.tov) },
    ];
    const foot = `${n(g.fgm)}-${n(g.fga)} FG · ${n(g.fg3m)}-${n(g.fg3a)} 3PT · ${n(g.ftm)}-${n(g.fta)} FT · ${n(g.mpg)} MIN`;
    const spoken = `${n(g.pts)} points, ${n(g.reb)} rebounds, ${n(g.ast)} assists, ${n(g.stl)} steals, ${n(g.blk)} blocks, ${n(g.tov)} turnovers; ${n(g.fgm)} of ${n(g.fga)} from the field, ${n(g.fg3m)} of ${n(g.fg3a)} threes, ${n(g.ftm)} of ${n(g.fta)} free throws, in ${n(g.mpg)} minutes.`;
    return { cells, foot, spoken };
  }
  const v = p.s;
  const cells: Cell[] = [
    { label: 'PTS', title: 'Points per game', value: formatStat('pts', v.pts) },
    { label: 'REB', title: 'Rebounds per game', value: formatStat('reb', v.reb) },
    { label: 'AST', title: 'Assists per game', value: formatStat('ast', v.ast) },
    { label: 'STL', title: 'Steals per game', value: formatStat('stl', v.stl) },
    { label: 'BLK', title: 'Blocks per game', value: formatStat('blk', v.blk) },
    { label: 'TOV', title: 'Turnovers per game', value: formatStat('tov', v.tov) },
  ];
  const foot = `${formatStat('fg_pct', v.fg_pct)} FG · ${formatStat('fg3_pct', v.fg3_pct)} 3PT · ${formatStat('mpg', v.mpg)} MIN · ${v.gp} games · ${positionName(p.pos)}`;
  const spoken = `${cells.map((c) => `${c.value} ${c.title.toLowerCase()}`).join(', ')}; ${foot}.`;
  return { cells, foot, spoken };
}

function headline(p: Player, kind: MysteryKind): string {
  const [pts, reb, ast] = lineOf(p, kind).cells;
  return `${pts.value} PTS · ${reb.value} REB · ${ast.value} AST`;
}

/**
 * Box Score Mystery: ten stat lines, four names each. The decoys scored
 * about as many points, so the rest of the line has to decide it. The
 * rules are the app's (`game/mystery.ts`, unchanged).
 */
export function BoxScoreMystery({ data, through }: { data: MysteryData; through: string }) {
  const players = useMemo(() => unpackMystery(data), [data]);
  const [stats, setStats] = useState<MysteryStats | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [marks, setMarks] = useState<boolean[]>([]);
  const [earned, setEarned] = useState<Trophy[]>([]);
  const [said, setSaid] = useState('');
  const endedHere = useRef(false);
  const kind = data.kind;

  // Quizzes are random, so the first one is dealt in the browser.
  useEffect(() => {
    let cancelled = false;
    loadMysteryStats(browserStore).then((saved) => {
      if (cancelled) return;
      setStats(saved);
      setQuiz(makeQuiz(players));
    });
    return () => {
      cancelled = true;
    };
  }, [players]);

  const total = quiz?.questions.length ?? 0;
  const done = quiz != null && total > 0 && marks.length === total && picked == null;

  // After an answer, pause on the reveal, then move on (or finish).
  useEffect(() => {
    if (picked == null || !quiz) return;
    const t = window.setTimeout(() => {
      setPicked(null);
      if (index + 1 < quiz.questions.length) {
        const next = quiz.questions[index + 1].answer;
        setIndex(index + 1);
        setSaid(`Line ${index + 2} of ${quiz.questions.length}: ${lineOf(next, kind).spoken}`);
      }
    }, ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [picked, index, quiz, kind]);

  function start() {
    setQuiz(makeQuiz(players));
    setIndex(0);
    setPicked(null);
    setMarks([]);
    setEarned([]);
    endedHere.current = false;
    setSaid('New quiz. Line 1 of 10.');
    window.requestAnimationFrame(() => document.getElementById('bsm-option-0')?.focus());
  }

  function pick(id: number) {
    if (!quiz || !stats || picked != null || marks.length > index) return;
    const question = quiz.questions[index];
    const right = id === question.answer.id;
    const nextMarks = [...marks, right];
    const chosen = question.options.find((p) => p.id === id);
    setPicked(id);
    setMarks(nextMarks);
    setSaid(right ? `Right: ${question.answer.name}.` : `Wrong: it was ${question.answer.name}, not ${chosen?.name ?? 'that player'}.`);
    if (nextMarks.length === quiz.questions.length) {
      const score = nextMarks.filter(Boolean).length;
      const updated = finishQuiz(stats, score, nextMarks.length);
      setStats(updated);
      endedHere.current = true;
      saveMysteryStats(browserStore, updated)
        .then(() => claimTrophies())
        .then((fresh) => {
          if (fresh.length) setEarned(fresh);
        });
    }
  }

  function onOptionsKey(e: KeyboardEvent<HTMLElement>) {
    if (!quiz || done || e.altKey || e.ctrlKey || e.metaKey) return;
    const n = Number(e.key);
    const options = quiz.questions[index].options;
    if (Number.isInteger(n) && n >= 1 && n <= options.length) {
      e.preventDefault();
      pick(options[n - 1].id);
    }
  }

  const score = marks.filter(Boolean).length;
  const source =
    kind === 'game'
      ? `Each player’s latest game, through ${through}`
      : `Season averages, games through ${through}`;

  return (
    <>
      <header className={s.header}>
        <h1 className="t-display-md">Whose line is it?</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          {kind === 'game'
            ? `Ten real stat lines from the latest games, through ${through}. Pick who posted each one from four names. The other three scored about as many points, so the rest of the line has to decide it.`
            : 'Ten players’ season averages. Pick who each line belongs to from four names. The other three score about as many points, so the rest of the line has to decide it.'}
        </p>
      </header>

      <div className={s.grid}>
        <section className={`${s.panel} ${s.stage}`} aria-labelledby="bsm-title" onKeyDown={onOptionsKey}>
          {!quiz || !stats ? (
            stats && !quiz ? (
              <p className="t-body t-muted">Not enough qualified players yet. Check back after a few more games.</p>
            ) : (
              <div className={s.stageSkeleton} aria-busy="true">
                <Skeleton height={16} width="30%" />
                <Skeleton height={200} />
                <div className={s.optionGrid}>
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} height={56} />
                  ))}
                </div>
              </div>
            )
          ) : done ? (
            <QuizResult
              quiz={quiz}
              marks={marks}
              stats={stats}
              earned={earned}
              focus={endedHere.current}
              onAgain={start}
            />
          ) : (
            <Question
              kind={kind}
              source={source}
              number={index + 1}
              total={total}
              marks={marks}
              question={quiz.questions[index]}
              picked={picked}
              onPick={pick}
            />
          )}
          <p className="visually-hidden" aria-live="polite">
            {said}
          </p>
        </section>

        <div className={s.rail}>
          <section className={s.panel} aria-labelledby="bsm-record-title">
            <header className={s.panelHead}>
              <h2 id="bsm-record-title" className="t-card-title">
                How are you doing?
              </h2>
              <p className="t-caption t-subtle">Your record in this browser.</p>
            </header>
            <ScoreList
              items={[
                ['This quiz', quiz && stats ? `${score}/${total}` : '–'],
                ['Best', stats ? (stats.played ? `${stats.best}/${QUIZ_LENGTH}` : '–') : '–'],
                ['Played', stats ? String(stats.played) : '–'],
                ['Perfect', stats ? String(stats.perfect) : '–'],
              ]}
            />
            <Disclosure summary="How It Works">
            <p>
              {kind === 'game'
                ? `The lines are real box scores: each player’s latest game, through ${through}, for qualified players who played at least 20 minutes in it.`
                : 'The lines are season averages of qualified players who play at least 24 minutes a game. Once enough players have a fresh game, the quiz switches to real box scores.'}
            </p>
            <p>
              The three wrong names are drawn from the players whose points are closest to the answer’s, so points
              alone won’t give it away. Look at the assists, rebounds and shooting.
            </p>
            <p>Answer with the buttons, or the number keys 1 to 4.</p>
            </Disclosure>
          </section>
        </div>
      </div>
    </>
  );
}

function Marks({ marks, total, current }: { marks: readonly boolean[]; total: number; current: number | null }) {
  return (
    <div className={s.marks} role="img" aria-label={`${marks.filter(Boolean).length} right of ${marks.length} answered, ${total} lines in all`}>
      {Array.from({ length: total }, (_, i) => {
        const m = marks[i];
        const cls = m === true ? s.markRight : m === false ? s.markWrong : i === current ? s.markNow : '';
        return (
          <span key={i} className={`${s.mark} ${cls}`}>
            {m === true ? <CheckIcon size={12} /> : m === false ? <CloseIcon size={12} /> : null}
          </span>
        );
      })}
    </div>
  );
}

function Question({
  kind,
  source,
  number,
  total,
  marks,
  question,
  picked,
  onPick,
}: {
  kind: MysteryKind;
  source: string;
  number: number;
  total: number;
  marks: readonly boolean[];
  question: Quiz['questions'][number];
  picked: number | null;
  onPick: (id: number) => void;
}) {
  const revealed = picked != null;
  const { cells, foot, spoken } = lineOf(question.answer, kind);
  return (
    <>
      <header className={s.quizHead}>
        <h2 id="bsm-title" className="t-card-title num">
          Line {number} of {total}
        </h2>
        <Marks marks={marks} total={total} current={number - 1} />
      </header>

      <figure className={s.boxLine}>
        <figcaption className="t-eyebrow t-subtle">{source}</figcaption>
        <dl className={s.boxCells} aria-hidden="true">
          {cells.map((c) => (
            <div key={c.label} className={s.boxCell}>
              <dt className={s.boxLabel}>
                <abbr title={c.title}>{c.label}</abbr>
              </dt>
              <dd className={`num ${s.boxValue}`}>{c.value}</dd>
            </div>
          ))}
        </dl>
        <p className={`num ${s.boxFoot}`} aria-hidden="true">
          {foot}
        </p>
        <p className="visually-hidden">{spoken}</p>
      </figure>

      <div className={s.optionsBlock}>
        <p id="bsm-ask" className="t-body-sm t-muted">
          Who posted this line?
        </p>
        <div className={s.optionGrid} role="group" aria-labelledby="bsm-ask">
          {question.options.map((p, i) => {
            const isAnswer = p.id === question.answer.id;
            const isPicked = p.id === picked;
            const state = revealed && isAnswer ? s.optionRight : revealed && isPicked ? s.optionWrong : '';
            return (
              <button
                key={i}
                id={`bsm-option-${i}`}
                type="button"
                className={`${s.optionButton} ${state}`}
                aria-disabled={revealed}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => onPick(p.id)}>
                <span className={s.optionKey} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={s.slotName}>{p.name}</span>
                {revealed && (isAnswer || isPicked) ? (
                  <>
                    <TeamChip abbr={p.team} />
                    {isAnswer ? <CheckIcon size={18} className={s.iconRight} /> : <CloseIcon size={18} className={s.iconWrong} />}
                    <span className="visually-hidden">{isAnswer ? ', the answer' : ', your pick'}</span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function verdict(score: number, total: number): string {
  if (score === total) return 'Perfect. You know your box scores.';
  if (score >= 8) return 'Sharp.';
  if (score >= 5) return 'Not bad.';
  return 'Tough set.';
}

function QuizResult({
  quiz,
  marks,
  stats,
  earned,
  focus,
  onAgain,
}: {
  quiz: Quiz;
  marks: readonly boolean[];
  stats: MysteryStats;
  earned: readonly Trophy[];
  focus: boolean;
  onAgain: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) heading.current?.focus();
  }, [focus]);
  const score = marks.filter(Boolean).length;
  const total = quiz.questions.length;
  return (
    <>
      <header className={s.quizHead}>
        <h2 id="bsm-title" ref={heading} tabIndex={-1} className={`t-card-title ${s.resultTitle}`}>
          How did you do?
        </h2>
        <Marks marks={marks} total={total} current={null} />
      </header>
      <p className={s.bigScore}>
        <span className="num">
          {score}/{total}
        </span>
        <span className="t-body t-muted">
          {verdict(score, total)} Your best is {stats.best}/{QUIZ_LENGTH}.
        </span>
      </p>
      <EarnedTrophies earned={earned} />
      <div className={s.actions}>
        <Button variant="primary" onClick={onAgain}>
          Play Again
        </Button>
        <ShareButton variant="secondary" path={PATH} text={() => mysteryShareText(marks)} />
      </div>

      <section className={s.answers} aria-labelledby="answers-title">
        <h3 id="answers-title" className="t-eyebrow t-subtle">
          The answers
        </h3>
        <ol className={s.answerList}>
          {quiz.questions.map((q, i) => (
            <li key={q.answer.id} className={s.answerItem}>
              {marks[i] ? <CheckIcon size={18} className={s.iconRight} /> : <CloseIcon size={18} className={s.iconWrong} />}
              <span className="visually-hidden">{marks[i] ? 'Right:' : 'Missed:'}</span>
              <span className={s.answerText}>
                <Link href={playerPath(q.answer)} className={s.inlineLink} prefetch={false}>
                  {q.answer.name}
                </Link>
                <span className="t-caption t-subtle num">{headline(q.answer, quiz.kind)}</span>
              </span>
              <TeamChip abbr={q.answer.team} />
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
