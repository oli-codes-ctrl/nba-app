/**
 * The data Higher or Lower and Box Score Mystery embed, packed small. Each
 * game's pool is chosen at build time with the app's own rules
 * (`streakPool`, `mysteryPool`, unchanged), and the browser rebuilds just
 * the parts of each player those rules and the page read, so `nextRound`,
 * `isRight` and `makeQuiz` run unchanged on it.
 */
import type { GameLine, Player, StatLine } from '@/data/types';
import { mysteryPool, type MysteryKind } from '@/game/mystery';
import { STREAK_STATS, streakPool } from '@/game/streak';
import type { StatId } from '@/stats/catalog';

/** [id, name, team, position, ...values] */
type PackedRow = (string | number | null)[];

const HEAD = 4;

function pack(p: Player, values: readonly (number | null | undefined)[]): PackedRow {
  return [p.id, p.name, p.team, p.pos, ...values.map((v) => v ?? null)];
}

function base(row: PackedRow): Omit<Player, 's'> {
  const team = row[2] as string;
  return { id: row[0] as number, name: row[1] as string, searchName: '', team, teams: [team], conf: '', pos: row[3] as string, q: true };
}

function line(stats: readonly StatId[], row: PackedRow, from: number): Partial<Record<StatId, number>> {
  const out: Partial<Record<StatId, number>> = {};
  stats.forEach((id, i) => {
    const v = row[from + i];
    if (typeof v === 'number') out[id] = v;
  });
  return out;
}

// ---------- Higher or Lower ----------

export type StreakData = { stats: StatId[]; rows: PackedRow[] };

export function packStreak(players: readonly Player[]): StreakData {
  return {
    stats: [...STREAK_STATS],
    rows: streakPool(players).map((p) => pack(p, STREAK_STATS.map((id) => p.s[id]))),
  };
}

export function unpackStreak(data: StreakData): Player[] {
  return data.rows.map((row) => ({ ...base(row), s: line(data.stats, row, HEAD) as StatLine }));
}

// ---------- Box Score Mystery ----------

/** What a season-averages line shows. */
export const SEASON_FIELDS: readonly StatId[] = ['gp', 'mpg', 'pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fg_pct', 'fg3_pct'];
/** What a single-game line shows. */
export const GAME_FIELDS: readonly StatId[] = ['mpg', 'pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta'];

export type MysteryData = {
  kind: MysteryKind;
  season: StatId[];
  game: StatId[];
  /** [id, name, team, position, ...season values, ...game values (game kind only)] */
  rows: PackedRow[];
};

export function packMystery(players: readonly Player[]): MysteryData {
  const { kind, pool } = mysteryPool(players);
  return {
    kind,
    season: [...SEASON_FIELDS],
    game: kind === 'game' ? [...GAME_FIELDS] : [],
    rows: pool.map((p) =>
      pack(p, [...SEASON_FIELDS.map((id) => p.s[id]), ...(kind === 'game' ? GAME_FIELDS.map((id) => p.g?.[id]) : [])]),
    ),
  };
}

/**
 * Season pools carry no game lines, so `mysteryPool` run again on these
 * players picks the same kind and the same players.
 */
export function unpackMystery(data: MysteryData): Player[] {
  return data.rows.map((row) => {
    const s = line(data.season, row, HEAD) as StatLine;
    const g: GameLine | undefined = data.kind === 'game' ? line(data.game, row, HEAD + data.season.length) : undefined;
    return g ? { ...base(row), s, g } : { ...base(row), s };
  });
}
