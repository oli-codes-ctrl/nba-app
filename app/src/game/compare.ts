/**
 * "Who has more?" — port of the MATLAB Player Comparison tab.
 *
 * - Two random players who average at least 30 minutes.
 * - For each of five stats, pick which player has more.
 * - Right: +1 (+2 on a double-points round). Wrong: -1. Ties count as right
 *   whichever player you pick, as in the MATLAB version.
 * - MATLAB made a round double points when two random numbers from 1-100
 *   multiplied to more than 2000. Same rule here.
 */
import type { Player } from '@/data/types';
import type { StatId } from '@/stats/catalog';

/** Same stats and order as the MATLAB checkboxes: APG, PPG, SPG, BPG, Fouls. */
export const COMPARE_STATS: StatId[] = ['ast', 'pts', 'stl', 'blk', 'pf'];
export const MIN_MPG = 30;
const FALLBACK_POOL = 20;

export type Side = 'a' | 'b';
export type Answers = Partial<Record<StatId, Side>>;

export type Round = { a: Player; b: Player; double: boolean };

export type StatResult = {
  stat: StatId;
  a: number | null;
  b: number | null;
  picked: Side;
  correct: boolean;
};

/** Deterministic 0-1 random source from a string seed (FNV-1a hash into mulberry32). */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let t = h >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random integer in [min, max] from a 0-1 random source. */
function randInt(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/**
 * Qualified players at 30+ minutes a game. Early in a season that can be too
 * few, so fall back to the qualified players with the most minutes.
 */
export function comparePool(players: readonly Player[]): Player[] {
  const hasStats = (p: Player) => COMPARE_STATS.every((s) => p.s[s] != null);
  const qualified = players.filter((p) => p.q && hasStats(p));
  const heavy = qualified.filter((p) => (p.s.mpg ?? 0) >= MIN_MPG);
  if (heavy.length >= 2) return heavy;
  return [...qualified].sort((x, y) => (y.s.mpg ?? 0) - (x.s.mpg ?? 0)).slice(0, FALLBACK_POOL);
}

export function newRound(pool: readonly Player[], rand: () => number = Math.random): Round | null {
  if (pool.length < 2) return null;
  const i = randInt(rand, 0, pool.length - 1);
  let j = randInt(rand, 0, pool.length - 2);
  if (j >= i) j += 1;
  const double = randInt(rand, 1, 100) * randInt(rand, 1, 100) > 2000;
  return { a: pool[i], b: pool[j], double };
}

export function isComplete(answers: Answers): boolean {
  return COMPARE_STATS.every((s) => answers[s] != null);
}

export function grade(round: Round, answers: Answers): StatResult[] {
  return COMPARE_STATS.flatMap((stat) => {
    const picked = answers[stat];
    if (!picked) return [];
    const a = round.a.s[stat];
    const b = round.b.s[stat];
    const correct = a == null || b == null || a === b || (picked === 'a' ? a > b : b > a);
    return [{ stat, a, b, picked, correct }];
  });
}

export function roundPoints(round: Round, results: readonly StatResult[]): number {
  const win = round.double ? 2 : 1;
  return results.reduce((sum, r) => sum + (r.correct ? win : -1), 0);
}

export type CompareScore = { score: number; rounds: number; best: number };
export const EMPTY_SCORE: CompareScore = { score: 0, rounds: 0, best: 0 };

export function addRound(total: CompareScore, points: number): CompareScore {
  return { score: total.score + points, rounds: total.rounds + 1, best: Math.max(total.best, points) };
}
