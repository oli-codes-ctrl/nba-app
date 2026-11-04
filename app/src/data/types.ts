/**
 * Shapes of the JSON the pipeline publishes under /v1/.
 * Source: pipeline/hoops_pipeline/publish.py and puzzles.py.
 */
import type { StatId } from '@/stats/catalog';

/** 2: Off/Def scores retired, team context and the teams file added. */
export const SCHEMA_VERSION = 2;

export type Manifest = {
  schemaVersion: number;
  /** Start year: 2026 means 2026-27. */
  season: number;
  generatedAt: string;
  /** Last day whose games are all included (US Eastern), YYYY-MM-DD. */
  asOf: string;
  /** Same as asOf, named for what it means. Older files lack it. */
  gamesThrough?: string;
  source: string;
  playerCount: number;
  qualifiedCount: number;
  files: { players: string; puzzles: string; teams: string };
};

export type StatLine = Record<StatId, number | null>;

export type Player = {
  id: number;
  name: string;
  searchName: string;
  /** Current team abbreviation. */
  team: string;
  /** Current team first, then earlier teams this season. */
  teams: string[];
  conf: string;
  pos: string;
  /** Qualified for percentiles and games. */
  q: boolean;
  s: StatLine;
  /** Season attempt totals: the sample behind each shooting percentage. */
  att?: Attempts;
  /**
   * Present only for qualified players. Shooting percentages are missing
   * when the player is below that stat's attempt minimum.
   */
  pct?: Partial<Record<StatId, number>>;
  rank?: Partial<Record<StatId, number>>;
  /** Averages over the recent window (PlayersDoc.recent). Absent if no games in it. */
  r?: RecentLine;
  /** Box line of the player's latest game, when exactly one game was played since PlayersDoc.latest.since. */
  g?: GameLine;
};

export type AttemptKey = 'fga' | 'fg2a' | 'fg3a' | 'fta';
export type Attempts = Record<AttemptKey, number>;
/** Attempts a shooting percentage needs before it is ranked. */
export type AttemptRule = { by: AttemptKey; min: number };

/** Averages over the recent window. Percentages are from the window's totals. */
export type RecentLine = { gp: number } & Partial<Record<StatId, number | null>>;

/** One game's box line. mpg is that game's minutes. */
export type GameLine = Partial<Record<StatId, number>>;

export type PlayersDoc = {
  schemaVersion: number;
  season: number;
  poolSize: Partial<Record<StatId, number>>;
  lowerIsBetter: StatId[];
  /** Attempt minimums for shooting percentages, scaled to the season so far. */
  minAttempts?: Partial<Record<StatId, AttemptRule>>;
  /** Present once the pipeline has an earlier night to compare with. */
  latest?: { since: string };
  /** Present once the pipeline has at least a few days of history. */
  recent?: { since: string; days: number };
  players: Player[];
};

export type PuzzlePoolEntry = {
  id: number;
  name: string;
  searchName: string;
  team: string;
  age: number;
  pts: number;
  ast: number;
  reb: number;
  stl: number;
  blk: number;
};

export type Puzzle = {
  date: string;
  number: number;
  answerId: number;
  xStat: StatId;
  hintStats: StatId[];
  clues: { position: string; conference: string; team: string };
  pool: PuzzlePoolEntry[];
};

export type PuzzlesDoc = {
  schemaVersion: number;
  puzzles: Puzzle[];
};

/** Team stats published per team, with league ranks (1 = best, or fastest for pace). */
export type TeamStatId =
  | 'ortg'
  | 'drtg'
  | 'net'
  | 'pace'
  | 'efg_pct'
  | 'tov_pct'
  | 'oreb_pct'
  | 'ft_rate'
  | 'fg3a_rate'
  | 'opp_efg_pct'
  | 'opp_tov_pct'
  | 'dreb_pct'
  | 'opp_ft_rate';

/** One team's season. Formulas: pipeline/hoops_pipeline/formulas.py. */
export type TeamSeason = Record<TeamStatId, number | null> & {
  abbr: string;
  gp: number;
  w: number | null;
  l: number | null;
  /** Points for and against. */
  pf: number;
  pa: number;
  poss: number | null;
  /** Wins a point differential usually produces (Pythagorean expectation). */
  pyth_w: number | null;
  /** Wins above that expectation. */
  luck: number | null;
  rank: Partial<Record<TeamStatId, number>>;
};

export type TeamsDoc = {
  schemaVersion: number;
  season: number;
  gamesThrough: string;
  league: Partial<Record<TeamStatId, number | null>>;
  teams: TeamSeason[];
};

/** Everything the app needs from one data refresh. */
export type Snapshot = {
  manifest: Manifest;
  players: PlayersDoc;
  puzzles: PuzzlesDoc;
  teams: TeamsDoc;
  /** When this device last fetched it (ISO time). */
  fetchedAt: string;
};
