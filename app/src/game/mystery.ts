/**
 * "Box Score Mystery": ten stat lines, four names each. Pick who posted it.
 * Uses last night's box lines when enough players have one, otherwise
 * season averages, so the game works every day of the season.
 *
 * Pure functions, no React or storage.
 */
import type { GameLine, Player } from '@/data/types';

export const QUIZ_LENGTH = 10;
const OPTIONS = 4;
const MIN_GAME_LINES = 16;
const NEAREST = 8;

export type MysteryKind = 'game' | 'season';
export type Question = { answer: Player; options: Player[] };
export type Quiz = { kind: MysteryKind; questions: Question[] };

export type MysteryStats = { best: number; played: number; perfect: number };
export const EMPTY_MYSTERY_STATS: MysteryStats = { best: 0, played: 0, perfect: 0 };

type WithGame = Player & { g: GameLine };

/** Which lines to quiz on, and the pool answers and decoys come from. */
export function mysteryPool(players: readonly Player[]): { kind: MysteryKind; pool: Player[] } {
  const games = players.filter((p): p is WithGame => p.q && p.g != null && (p.g.mpg ?? 0) >= 20);
  if (games.length >= MIN_GAME_LINES) return { kind: 'game', pool: games };
  return { kind: 'season', pool: players.filter((p) => p.q && (p.s.mpg ?? 0) >= 24) };
}

/** Points in the line being shown, used to pick believable decoys. */
function shownPoints(p: Player, kind: MysteryKind): number {
  return (kind === 'game' ? p.g?.pts : p.s.pts) ?? 0;
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deal a quiz. Answers never repeat. Decoys come from the players whose
 * points are closest to the answer's, so the line itself has to decide it.
 */
export function makeQuiz(players: readonly Player[], rand: () => number = Math.random): Quiz | null {
  const { kind, pool } = mysteryPool(players);
  if (pool.length < OPTIONS + 1) return null;
  const answers = shuffle(pool, rand).slice(0, Math.min(QUIZ_LENGTH, pool.length));
  const questions = answers.map((answer) => {
    const pts = shownPoints(answer, kind);
    const nearest = pool
      .filter((p) => p.id !== answer.id)
      .sort((a, b) => Math.abs(shownPoints(a, kind) - pts) - Math.abs(shownPoints(b, kind) - pts) || a.id - b.id)
      .slice(0, NEAREST);
    const decoys = shuffle(nearest, rand).slice(0, OPTIONS - 1);
    return { answer, options: shuffle([answer, ...decoys], rand) };
  });
  return { kind, questions };
}

export function finishQuiz(stats: MysteryStats, score: number, length: number): MysteryStats {
  return {
    best: Math.max(stats.best, score),
    played: stats.played + 1,
    perfect: stats.perfect + (score === length && length > 0 ? 1 : 0),
  };
}

export function mysteryShareText(marks: readonly boolean[]): string {
  const score = marks.filter(Boolean).length;
  return `Hoops Box Score Mystery ${score}/${marks.length} ${marks.map((m) => (m ? '🟩' : '🟥')).join('')}`;
}
