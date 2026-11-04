/**
 * Trophies: milestones across every game. Pure, so progress and unlocks
 * are testable. Most come from stats each game already saves; a few need
 * the extra counters in Career.
 */
import type { CompareScore } from './compare';
import type { DailyStats } from './daily';
import type { MysteryStats } from './mystery';
import type { StreakStats } from './streak';

/** Counters no game keeps on its own. */
export type Career = {
  dailyNoClueWins: number;
  dailyDoubleWins: number;
  comparePerfect: number;
  versusViews: number;
  teamsVisited: string[];
  /** Trophy id -> date unlocked (YYYY-MM-DD). */
  unlocked: Record<string, string>;
};

export const EMPTY_CAREER: Career = {
  dailyNoClueWins: 0,
  dailyDoubleWins: 0,
  comparePerfect: 0,
  versusViews: 0,
  teamsVisited: [],
  unlocked: {},
};

export type Facts = {
  daily: DailyStats;
  streak: StreakStats;
  compare: CompareScore;
  mystery: MysteryStats;
  career: Career;
  follows: number;
};

export type Trophy = {
  id: string;
  title: string;
  description: string;
  game: 'Daily Guess' | 'Higher or Lower' | 'Who Has More?' | 'Box Score Mystery' | 'Explore';
  target: number;
  current: (f: Facts) => number;
};

export const TROPHIES: readonly Trophy[] = [
  { id: 'daily-first', title: 'First Name', description: 'Solve a Daily Guess', game: 'Daily Guess', target: 1, current: (f) => f.daily.won },
  { id: 'daily-noclue', title: 'Sharp Eye', description: 'Solve a Daily Guess with no clues', game: 'Daily Guess', target: 1, current: (f) => f.career.dailyNoClueWins },
  { id: 'daily-double', title: 'Double Up', description: 'Solve a Daily Guess on a double-points day', game: 'Daily Guess', target: 1, current: (f) => f.career.dailyDoubleWins },
  { id: 'daily-streak3', title: 'On a Roll', description: 'Reach a 3-day streak', game: 'Daily Guess', target: 3, current: (f) => f.daily.bestStreak },
  { id: 'daily-streak7', title: 'Week Warrior', description: 'Reach a 7-day streak', game: 'Daily Guess', target: 7, current: (f) => f.daily.bestStreak },
  { id: 'daily-streak30', title: 'Iron Man', description: 'Reach a 30-day streak', game: 'Daily Guess', target: 30, current: (f) => f.daily.bestStreak },
  { id: 'daily-played25', title: 'Regular', description: 'Play 25 Daily Guess puzzles', game: 'Daily Guess', target: 25, current: (f) => f.daily.played },
  { id: 'hl-5', title: 'Climber', description: 'Get 5 in a row in Higher or Lower', game: 'Higher or Lower', target: 5, current: (f) => f.streak.best },
  { id: 'hl-10', title: 'Sky High', description: 'Get 10 in a row in Higher or Lower', game: 'Higher or Lower', target: 10, current: (f) => f.streak.best },
  { id: 'hl-20', title: 'Coin Flip Master', description: 'Get 20 in a row in Higher or Lower', game: 'Higher or Lower', target: 20, current: (f) => f.streak.best },
  { id: 'cmp-perfect', title: 'Clean Sweep', description: 'Get all five right in a Who Has More? round', game: 'Who Has More?', target: 1, current: (f) => f.career.comparePerfect },
  { id: 'cmp-25', title: 'In the Black', description: 'Reach a Who Has More? score of 25', game: 'Who Has More?', target: 25, current: (f) => f.compare.score },
  { id: 'mys-first', title: 'Detective', description: 'Finish a Box Score Mystery', game: 'Box Score Mystery', target: 1, current: (f) => f.mystery.played },
  { id: 'mys-8', title: 'Box Score Reader', description: 'Score 8 or more in Box Score Mystery', game: 'Box Score Mystery', target: 8, current: (f) => f.mystery.best },
  { id: 'mys-perfect', title: 'Photographic Memory', description: 'Score 10 out of 10 in Box Score Mystery', game: 'Box Score Mystery', target: 1, current: (f) => f.mystery.perfect },
  { id: 'follow-5', title: 'Fan Club', description: 'Follow 5 players', game: 'Explore', target: 5, current: (f) => f.follows },
  { id: 'teams-10', title: 'Scout', description: 'Visit 10 team pages', game: 'Explore', target: 10, current: (f) => f.career.teamsVisited.length },
  { id: 'versus-5', title: 'Debate Club', description: 'Open 5 head-to-heads', game: 'Explore', target: 5, current: (f) => f.career.versusViews },
];

export function progress(t: Trophy, f: Facts): number {
  return Math.min(1, Math.max(0, t.current(f) / t.target));
}

/**
 * Trophies earned now but not yet recorded. Unlocks are permanent: a reset
 * score never takes a trophy back.
 */
export function newlyUnlocked(f: Facts): Trophy[] {
  return TROPHIES.filter((t) => !f.career.unlocked[t.id] && t.current(f) >= t.target);
}

export function recordUnlocks(career: Career, trophies: readonly Trophy[], date: string): Career {
  if (trophies.length === 0) return career;
  const unlocked = { ...career.unlocked };
  for (const t of trophies) unlocked[t.id] = date;
  return { ...career, unlocked };
}
