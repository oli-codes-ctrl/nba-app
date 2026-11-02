/**
 * Shapes of the JSON the pipeline publishes under /v1/.
 * Source: pipeline/hoops_pipeline/publish.py and puzzles.py.
 */
import type { StatId } from '@/stats/catalog';

export const SCHEMA_VERSION = 1;

export type Manifest = {
  schemaVersion: number;
  /** Start year: 2026 means 2026-27. */
  season: number;
  generatedAt: string;
  /** Date the stats cover, YYYY-MM-DD. */
  asOf: string;
  source: string;
  playerCount: number;
  qualifiedCount: number;
  files: { players: string; puzzles: string };
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
  /** Present only for qualified players. */
  pct?: Partial<Record<StatId, number>>;
  rank?: Partial<Record<StatId, number>>;
};

export type PlayersDoc = {
  schemaVersion: number;
  season: number;
  poolSize: Partial<Record<StatId, number>>;
  lowerIsBetter: StatId[];
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

/** Everything the app needs from one data refresh. */
export type Snapshot = {
  manifest: Manifest;
  players: PlayersDoc;
  puzzles: PuzzlesDoc;
  /** When this device last fetched it (ISO time). */
  fetchedAt: string;
};
