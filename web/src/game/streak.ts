/**
 * "Higher or Lower": one player's stat is shown; guess whether the next
 * player's is higher or lower. A right answer moves the next player into the
 * known slot and deals a new stat, so a run is a chain. Pairs get closer as
 * the streak grows. One wrong answer ends the run.
 *
 * Pure functions, no React or storage.
 */
import type { Player } from '@/data/types';
import { formatStat } from '@/lib/format';
import type { StatId } from '@/stats/catalog';

export const STREAK_STATS: readonly StatId[] = ['pts', 'reb', 'ast', 'stl', 'blk', 'fg3m', 'tov', 'mpg'];
export const POOL_SIZE = 150;
const MIN_MPG = 20;

export type Guess = 'higher' | 'lower';

export type StreakRound = { stat: StatId; known: Player; mystery: Player };

export type StreakStats = { best: number; runs: number; lastRun: number };
export const EMPTY_STREAK_STATS: StreakStats = { best: 0, runs: 0, lastRun: 0 };

/**
 * How close the two values may be, as the gap divided by the larger value.
 * Level 0 is obvious; level 3 is a coin flip for casual fans.
 */
const BANDS: readonly (readonly [number, number])[] = [
  [0.35, 1],
  [0.18, 0.5],
  [0.08, 0.3],
  [0.02, 0.15],
];

export function level(streak: number): number {
  return Math.min(BANDS.length - 1, Math.floor(streak / 4));
}

/** The players people are most likely to know: qualified, most minutes. */
export function streakPool(players: readonly Player[]): Player[] {
  return players
    .filter((p) => p.q && (p.s.mpg ?? 0) >= MIN_MPG)
    .sort((a, b) => (b.s.mpg ?? 0) - (a.s.mpg ?? 0) || a.id - b.id)
    .slice(0, POOL_SIZE);
}

function value(p: Player, stat: StatId): number | null {
  return p.s[stat] ?? null;
}

/** Values that look the same on screen can't be guessed, so they never pair. */
function distinct(a: Player, b: Player, stat: StatId): boolean {
  const va = value(a, stat);
  const vb = value(b, stat);
  return va != null && vb != null && formatStat(stat, va) !== formatStat(stat, vb);
}

function gap(a: Player, b: Player, stat: StatId): number {
  const va = value(a, stat) ?? 0;
  const vb = value(b, stat) ?? 0;
  const top = Math.max(Math.abs(va), Math.abs(vb));
  return top === 0 ? 0 : Math.abs(va - vb) / top;
}

const pick = <T,>(items: readonly T[], rand: () => number): T => items[Math.floor(rand() * items.length)];

/**
 * Deal the next round. After a right answer pass the previous round, so its
 * mystery player becomes the known one and the stat changes.
 */
export function nextRound(
  pool: readonly Player[],
  streak: number,
  previous: StreakRound | null = null,
  rand: () => number = Math.random,
): StreakRound | null {
  if (pool.length < 2) return null;
  const stats = STREAK_STATS.filter((s) => s !== previous?.stat);
  const [lo, hi] = BANDS[level(streak)];

  for (let attempt = 0; attempt < 400; attempt++) {
    const stat = pick(stats, rand);
    const known = previous ? previous.mystery : pick(pool, rand);
    const mystery = pick(pool, rand);
    if (mystery.id === known.id || !distinct(known, mystery, stat)) continue;
    const g = gap(known, mystery, stat);
    // Late attempts relax the band so a thin pool still deals a round.
    if (attempt < 300 && (g < lo || g > hi)) continue;
    return { stat, known, mystery };
  }
  return null;
}

export function isRight(round: StreakRound, guess: Guess): boolean {
  const k = value(round.known, round.stat) ?? 0;
  const m = value(round.mystery, round.stat) ?? 0;
  return guess === 'higher' ? m > k : m < k;
}

/** Fold a finished run into the saved stats. */
export function endRun(stats: StreakStats, run: number): StreakStats {
  return { best: Math.max(stats.best, run), runs: stats.runs + 1, lastRun: run };
}
