import type { Puzzle } from '@/data/types';
import {
  EMPTY_STATS,
  guess,
  isDoublePoints,
  localDate,
  MAX_GUESSES,
  newGame,
  pointsAvailable,
  puzzleFor,
  recordResult,
  revealClue,
  score,
  shareText,
  type GameState,
} from '@/game/daily';
import { loadGame, loadStats, saveGame, saveStats } from '@/game/storage';

const ANSWER = 100;

function puzzle(date: string, number = 1): Puzzle {
  return {
    date,
    number,
    answerId: ANSWER,
    xStat: 'age',
    hintStats: ['pts', 'ast', 'reb', 'stl', 'blk'],
    clues: { position: 'G', conference: 'West', team: 'OKC' },
    pool: [],
  };
}

/** Find dates with and without double points so tests don't depend on the hash. */
function findDate(double: boolean): string {
  for (let d = 1; d <= 366; d++) {
    const iso = new Date(Date.UTC(2026, 0, d)).toISOString().slice(0, 10);
    if (isDoublePoints(iso) === double) return iso;
  }
  throw new Error('no date found');
}

const NORMAL_DAY = findDate(false);
const DOUBLE_DAY = findDate(true);

const play = (date: string, steps: (s: GameState) => GameState) => steps(newGame(date));

describe('scoring', () => {
  const p = puzzle(NORMAL_DAY);

  it('gives 3, 2 or 1 points by clues used', () => {
    expect(score(play(NORMAL_DAY, (s) => guess(s, p, ANSWER)), p)).toBe(3);
    expect(score(play(NORMAL_DAY, (s) => guess(revealClue(s), p, ANSWER)), p)).toBe(2);
    expect(score(play(NORMAL_DAY, (s) => guess(revealClue(revealClue(s)), p, ANSWER)), p)).toBe(1);
  });

  it('takes a point for each wrong guess', () => {
    const won = play(NORMAL_DAY, (s) => guess(guess(s, p, 1), p, ANSWER));
    expect(won.status).toBe('won');
    expect(score(won, p)).toBe(2);
    const lost = play(NORMAL_DAY, (s) => guess(guess(guess(s, p, 1), p, 2), p, 3));
    expect(lost.status).toBe('lost');
    expect(score(lost, p)).toBe(-3);
  });

  it('doubles the points on double-points days, but not the penalty', () => {
    const dp = puzzle(DOUBLE_DAY);
    expect(pointsAvailable(newGame(DOUBLE_DAY))).toBe(6);
    expect(score(play(DOUBLE_DAY, (s) => guess(guess(revealClue(s), dp, 1), dp, ANSWER)), dp)).toBe(3);
  });

  it('makes double points rare, like the MATLAB 6%', () => {
    let doubles = 0;
    for (let d = 0; d < 1000; d++) {
      if (isDoublePoints(new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10))) doubles++;
    }
    expect(doubles).toBeGreaterThan(20);
    expect(doubles).toBeLessThan(120);
  });
});

describe('guess rules', () => {
  const p = puzzle(NORMAL_DAY);

  it(`ends after ${MAX_GUESSES} wrong guesses`, () => {
    let s = newGame(NORMAL_DAY);
    for (let i = 1; i <= MAX_GUESSES; i++) s = guess(s, p, i);
    expect(s.status).toBe('lost');
    expect(guess(s, p, ANSWER)).toBe(s);
  });

  it('ignores repeated guesses and anything after the game ends', () => {
    const s = guess(newGame(NORMAL_DAY), p, 1);
    expect(guess(s, p, 1)).toBe(s);
    const won = guess(s, p, ANSWER);
    expect(revealClue(won)).toBe(won);
    expect(guess(won, p, 5)).toBe(won);
  });

  it('caps clues at two', () => {
    expect(revealClue(revealClue(revealClue(newGame(NORMAL_DAY)))).clues).toBe(2);
  });
});

describe('puzzleFor', () => {
  const puzzles = [puzzle('2026-11-01', 1), puzzle('2026-11-02', 2), puzzle('2026-11-03', 3)];

  it("picks today's puzzle", () => {
    expect(puzzleFor(puzzles, '2026-11-02')?.number).toBe(2);
  });

  it('falls back to the latest earlier puzzle', () => {
    expect(puzzleFor(puzzles, '2026-11-09')?.number).toBe(3);
  });

  it('returns null when every puzzle is in the future', () => {
    expect(puzzleFor(puzzles, '2026-10-01')).toBeNull();
  });

  it('formats the local date', () => {
    expect(localDate(new Date(2026, 10, 3, 23, 59))).toBe('2026-11-03');
  });
});

describe('stats', () => {
  const win = (date: string) => guess(newGame(date), puzzle(date), ANSWER);
  const loss = (date: string) => {
    let s = newGame(date);
    for (let i = 1; i <= MAX_GUESSES; i++) s = guess(s, puzzle(date), i);
    return s;
  };

  it('counts streaks across consecutive days and resets on a loss or a gap', () => {
    let st = recordResult(EMPTY_STATS, win('2026-11-01'), puzzle('2026-11-01'));
    st = recordResult(st, win('2026-11-02'), puzzle('2026-11-02'));
    expect(st.currentStreak).toBe(2);
    st = recordResult(st, loss('2026-11-03'), puzzle('2026-11-03'));
    expect(st.currentStreak).toBe(0);
    expect(st.bestStreak).toBe(2);
    st = recordResult(st, win('2026-11-05'), puzzle('2026-11-05'));
    expect(st.currentStreak).toBe(1);
    expect(st).toMatchObject({ played: 4, won: 3 });
  });

  it('carries streaks across month ends', () => {
    let st = recordResult(EMPTY_STATS, win('2026-10-31'), puzzle('2026-10-31'));
    st = recordResult(st, win('2026-11-01'), puzzle('2026-11-01'));
    expect(st.currentStreak).toBe(2);
  });

  it('records each day once and ignores unfinished or older games', () => {
    const once = recordResult(EMPTY_STATS, win('2026-11-02'), puzzle('2026-11-02'));
    expect(recordResult(once, win('2026-11-02'), puzzle('2026-11-02'))).toBe(once);
    expect(recordResult(once, win('2026-11-01'), puzzle('2026-11-01'))).toBe(once);
    expect(recordResult(once, newGame('2026-11-03'), puzzle('2026-11-03'))).toBe(once);
  });
});

describe('shareText', () => {
  it('shows guesses as squares without naming the player', () => {
    const p = puzzle(NORMAL_DAY, 7);
    const s = guess(guess(revealClue(newGame(NORMAL_DAY)), p, 1), p, ANSWER);
    expect(shareText(s, p)).toBe('Hoops Daily #7 🟥🟩 · 1 clue · 1 pt');
  });
});

describe('storage', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: async (k: string) => data.get(k) ?? null,
      setItem: async (k: string, v: string) => {
        data.set(k, v);
      },
    };
  };

  it('saves and restores a day and the stats', async () => {
    const store = memory();
    const s = revealClue(newGame('2026-11-03'));
    await saveGame(store, s);
    expect(await loadGame(store, '2026-11-03')).toEqual(s);
    expect(await loadGame(store, '2026-11-04')).toEqual(newGame('2026-11-04'));
    await saveStats(store, { ...EMPTY_STATS, played: 2 });
    expect((await loadStats(store)).played).toBe(2);
  });

  it('starts fresh when saved data is corrupt', async () => {
    const store = memory();
    store.data.set('hoops:daily:v1:game:2026-11-03', '{not json');
    expect(await loadGame(store, '2026-11-03')).toEqual(newGame('2026-11-03'));
    expect(await loadStats(store)).toEqual(EMPTY_STATS);
  });
});
