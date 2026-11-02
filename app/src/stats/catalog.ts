/**
 * Single source of truth for stat labels, units and direction.
 * Every id must also appear in STAT_IDS in pipeline/hoops_pipeline/metrics.py
 * (a test checks this).
 */

export const STAT_IDS = [
  'gp', 'mpg', 'age',
  'pts', 'reb', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'tov', 'pf',
  'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta',
  'fg_pct', 'fg2_pct', 'fg3_pct', 'ft_pct', 'efg_pct', 'ts_pct',
  'pts36', 'reb36', 'ast36',
  'off_score', 'def_score', 'game_score',
] as const;

export type StatId = (typeof STAT_IDS)[number];

export type StatUnit = 'count' | 'perGame' | 'per36' | 'percent' | 'minutes' | 'years' | 'score';

export type StatGroup = 'context' | 'scoring' | 'shooting' | 'other' | 'per36' | 'composite';

export type StatDef = {
  id: StatId;
  /** Short label for tables and chips, e.g. "PTS". */
  short: string;
  /** Full label, e.g. "Points per game". */
  label: string;
  unit: StatUnit;
  group: StatGroup;
  decimals: number;
  /** Fewer is better (turnovers, fouls). The UI flips the wording; ranks stay by value. */
  lowerIsBetter: boolean;
  /** Has a percentile among qualified players. */
  ranked: boolean;
};

type Spec = Omit<StatDef, 'id' | 'lowerIsBetter' | 'ranked'> & { lowerIsBetter?: boolean };

const SPECS: Record<StatId, Spec> = {
  gp: { short: 'GP', label: 'Games played', unit: 'count', group: 'context', decimals: 0 },
  mpg: { short: 'MIN', label: 'Minutes per game', unit: 'minutes', group: 'context', decimals: 1 },
  age: { short: 'AGE', label: 'Age', unit: 'years', group: 'context', decimals: 0 },

  pts: { short: 'PTS', label: 'Points per game', unit: 'perGame', group: 'scoring', decimals: 1 },
  fgm: { short: 'FGM', label: 'Field goals made per game', unit: 'perGame', group: 'scoring', decimals: 1 },
  fga: { short: 'FGA', label: 'Field goal attempts per game', unit: 'perGame', group: 'scoring', decimals: 1 },
  fg3m: { short: '3PM', label: 'Threes made per game', unit: 'perGame', group: 'scoring', decimals: 1 },
  fg3a: { short: '3PA', label: 'Three attempts per game', unit: 'perGame', group: 'scoring', decimals: 1 },
  ftm: { short: 'FTM', label: 'Free throws made per game', unit: 'perGame', group: 'scoring', decimals: 1 },
  fta: { short: 'FTA', label: 'Free throw attempts per game', unit: 'perGame', group: 'scoring', decimals: 1 },

  fg_pct: { short: 'FG%', label: 'Field goal percentage', unit: 'percent', group: 'shooting', decimals: 1 },
  fg2_pct: { short: '2P%', label: 'Two-point percentage', unit: 'percent', group: 'shooting', decimals: 1 },
  fg3_pct: { short: '3P%', label: 'Three-point percentage', unit: 'percent', group: 'shooting', decimals: 1 },
  ft_pct: { short: 'FT%', label: 'Free throw percentage', unit: 'percent', group: 'shooting', decimals: 1 },
  efg_pct: { short: 'eFG%', label: 'Effective field goal percentage', unit: 'percent', group: 'shooting', decimals: 1 },
  ts_pct: { short: 'TS%', label: 'True shooting percentage', unit: 'percent', group: 'shooting', decimals: 1 },

  reb: { short: 'REB', label: 'Rebounds per game', unit: 'perGame', group: 'other', decimals: 1 },
  oreb: { short: 'OREB', label: 'Offensive rebounds per game', unit: 'perGame', group: 'other', decimals: 1 },
  dreb: { short: 'DREB', label: 'Defensive rebounds per game', unit: 'perGame', group: 'other', decimals: 1 },
  ast: { short: 'AST', label: 'Assists per game', unit: 'perGame', group: 'other', decimals: 1 },
  stl: { short: 'STL', label: 'Steals per game', unit: 'perGame', group: 'other', decimals: 1 },
  blk: { short: 'BLK', label: 'Blocks per game', unit: 'perGame', group: 'other', decimals: 1 },
  tov: { short: 'TOV', label: 'Turnovers per game', unit: 'perGame', group: 'other', decimals: 1, lowerIsBetter: true },
  pf: { short: 'PF', label: 'Fouls per game', unit: 'perGame', group: 'other', decimals: 1, lowerIsBetter: true },

  pts36: { short: 'PTS/36', label: 'Points per 36 minutes', unit: 'per36', group: 'per36', decimals: 1 },
  reb36: { short: 'REB/36', label: 'Rebounds per 36 minutes', unit: 'per36', group: 'per36', decimals: 1 },
  ast36: { short: 'AST/36', label: 'Assists per 36 minutes', unit: 'per36', group: 'per36', decimals: 1 },

  off_score: { short: 'OFF', label: 'Offensive Score', unit: 'score', group: 'composite', decimals: 1 },
  def_score: { short: 'DEF', label: 'Defensive Score', unit: 'score', group: 'composite', decimals: 1 },
  game_score: { short: 'GmSc', label: 'Game Score', unit: 'score', group: 'composite', decimals: 1 },
};

/** Context stats, not performance. Mirrors PERCENTILE_STATS in metrics.py. */
const UNRANKED: ReadonlySet<StatId> = new Set<StatId>(['gp', 'age']);

export const CATALOG = Object.fromEntries(
  STAT_IDS.map((id): [StatId, StatDef] => [
    id,
    { id, ...SPECS[id], lowerIsBetter: SPECS[id].lowerIsBetter ?? false, ranked: !UNRANKED.has(id) },
  ]),
) as Record<StatId, StatDef>;

export const GROUPS: { id: StatGroup; title: string; note?: string }[] = [
  { id: 'composite', title: 'Overall', note: 'Offensive and Defensive Score are the two halves of Game Score.' },
  { id: 'scoring', title: 'Scoring' },
  { id: 'shooting', title: 'Shooting', note: 'Percentages come from season totals.' },
  { id: 'other', title: 'Rebounding, passing and defense' },
  { id: 'per36', title: 'Per 36 minutes' },
];

export function statsInGroup(group: StatGroup): StatDef[] {
  return STAT_IDS.map((id) => CATALOG[id]).filter((s) => s.group === group);
}

export function isStatId(value: string): value is StatId {
  return (STAT_IDS as readonly string[]).includes(value);
}
