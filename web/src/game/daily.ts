/**
 * Daily "Guess the Player" rules. Pure functions, no React or storage.
 *
 * Ported from the MATLAB Player Guess tab:
 * - A correct guess scores 3 points with no clues, 2 with one, 1 with both.
 * - Each wrong guess costs 1 point.
 * - About 6% of days are double points (MATLAB rolled randi(50) > 46).
 * Changes for a daily game: three guesses, and the "easy modes" (team logo,
 * silhouette) became text clues, since the app shows no logos or photos.
 */
import type { Puzzle } from '@/data/types';

export const MAX_GUESSES = 3;
export const MAX_CLUES = 2;
const BASE_POINTS = [3, 2, 1] as const;

export type GameStatus = 'playing' | 'won' | 'lost';

export type GameState = {
  date: string;
  /** Player ids guessed, in order. */
  guesses: number[];
  /** Clues revealed: 0, 1 (position and conference) or 2 (plus team). */
  clues: number;
  status: GameStatus;
};

export function newGame(date: string): GameState {
  return { date, guesses: [], clues: 0, status: 'playing' };
}

/** The device's local calendar date as YYYY-MM-DD. */
export function localDate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Today's puzzle for this device. The pipeline publishes yesterday through
 * two days ahead, which covers every timezone. If today is missing (a failed
 * nightly run), fall back to the latest earlier puzzle.
 */
export function puzzleFor(puzzles: readonly Puzzle[], today: string): Puzzle | null {
  const exact = puzzles.find((p) => p.date === today);
  if (exact) return exact;
  const earlier = puzzles.filter((p) => p.date < today).sort((a, b) => b.date.localeCompare(a.date));
  return earlier[0] ?? null;
}

/** Deterministic per date, so everyone gets the same double-points days. */
export function isDoublePoints(date: string): boolean {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 50 > 46;
}

export function revealClue(state: GameState): GameState {
  if (state.status !== 'playing' || state.clues >= MAX_CLUES) return state;
  return { ...state, clues: state.clues + 1 };
}

export function guess(state: GameState, puzzle: Puzzle, playerId: number): GameState {
  if (state.status !== 'playing' || state.guesses.includes(playerId)) return state;
  const guesses = [...state.guesses, playerId];
  const status: GameStatus =
    playerId === puzzle.answerId ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
  return { ...state, guesses, status };
}

export function wrongGuesses(state: GameState, puzzle: Puzzle): number {
  return state.guesses.filter((id) => id !== puzzle.answerId).length;
}

/** Points a correct guess is worth right now (before wrong-guess penalties). */
export function pointsAvailable(state: GameState): number {
  return BASE_POINTS[state.clues] * (isDoublePoints(state.date) ? 2 : 1);
}

/** Final score for a finished game, or the running total while playing. */
export function score(state: GameState, puzzle: Puzzle): number {
  const penalty = wrongGuesses(state, puzzle);
  return (state.status === 'won' ? pointsAvailable(state) : 0) - penalty;
}

export type DailyStats = {
  played: number;
  won: number;
  totalScore: number;
  currentStreak: number;
  bestStreak: number;
  /** Date of the last finished game, to keep streaks honest. */
  lastDate: string | null;
};

export const EMPTY_STATS: DailyStats = {
  played: 0,
  won: 0,
  totalScore: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastDate: null,
};

function previousDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return dt.toISOString().slice(0, 10);
}

/** The streak as it stands today: it lapses once a whole day goes unplayed. */
export function liveStreak(stats: DailyStats, today: string): number {
  return stats.lastDate === today || stats.lastDate === previousDay(today) ? stats.currentStreak : 0;
}

/** Fold a finished game into the running stats. Recording the same day twice is a no-op. */
export function recordResult(stats: DailyStats, state: GameState, puzzle: Puzzle): DailyStats {
  if (state.status === 'playing' || stats.lastDate === state.date) return stats;
  if (stats.lastDate && stats.lastDate > state.date) return stats;
  const won = state.status === 'won';
  const continues = stats.lastDate === previousDay(state.date);
  const currentStreak = won ? (continues ? stats.currentStreak + 1 : 1) : 0;
  return {
    played: stats.played + 1,
    won: stats.won + (won ? 1 : 0),
    totalScore: stats.totalScore + score(state, puzzle),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    lastDate: state.date,
  };
}

/** Spoiler-free result line for sharing. */
export function shareText(state: GameState, puzzle: Puzzle): string {
  const marks = state.guesses.map((id) => (id === puzzle.answerId ? '🟩' : '🟥')).join('');
  const clues = state.clues === 0 ? 'no clues' : state.clues === 1 ? '1 clue' : '2 clues';
  const pts = score(state, puzzle);
  const double = isDoublePoints(state.date) ? ' · double points' : '';
  return `Hoops Daily #${puzzle.number} ${marks} · ${clues} · ${pts} ${Math.abs(pts) === 1 ? 'pt' : 'pts'}${double}`;
}
