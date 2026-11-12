/**
 * Single source of truth for stat labels, units and direction.
 * Every id must also appear in STAT_IDS in pipeline/hoops_pipeline/metrics.py,
 * in the same order (a test checks this). Formulas live in
 * pipeline/hoops_pipeline/formulas.py.
 */

export const STAT_IDS = [
  'gp', 'mpg', 'age',
  'pts', 'reb', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'tov', 'pf',
  'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta',
  'fg_pct', 'fg2_pct', 'fg3_pct', 'ft_pct', 'efg_pct', 'ts_pct',
  'fg3a_rate', 'fta_rate',
  'usg_pct', 'ast_pct', 'tov_pct', 'oreb_pct', 'dreb_pct', 'reb_pct', 'stl_pct', 'blk_pct',
  'pts36', 'reb36', 'ast36', 'stl36', 'blk36', 'fg3m36', 'tov36',
  'pts100', 'reb100', 'ast100', 'stl100', 'blk100', 'fg3m100', 'tov100',
  'game_score',
] as const;

export type StatId = (typeof STAT_IDS)[number];

export type StatUnit = 'count' | 'perGame' | 'per36' | 'per100' | 'percent' | 'minutes' | 'years' | 'score';

export type StatGroup = 'context' | 'overall' | 'scoring' | 'shooting' | 'other' | 'rates' | 'per36' | 'per100';

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
  /**
   * A role or volume, not a quality: more is neither better nor worse
   * (usage, shot volume, shot diet). Shown on a neutral scale.
   */
  neutral: boolean;
  /** Has a percentile among qualified players. */
  ranked: boolean;
};

type Spec = Omit<StatDef, 'id' | 'lowerIsBetter' | 'neutral' | 'ranked'> & { lowerIsBetter?: boolean };

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
  fg3a_rate: { short: '3PAr', label: 'Share of shots from three', unit: 'percent', group: 'shooting', decimals: 1 },
  fta_rate: { short: 'FTr', label: 'Free throw attempts per 100 shots', unit: 'percent', group: 'shooting', decimals: 1 },

  reb: { short: 'REB', label: 'Rebounds per game', unit: 'perGame', group: 'other', decimals: 1 },
  oreb: { short: 'OREB', label: 'Offensive rebounds per game', unit: 'perGame', group: 'other', decimals: 1 },
  dreb: { short: 'DREB', label: 'Defensive rebounds per game', unit: 'perGame', group: 'other', decimals: 1 },
  ast: { short: 'AST', label: 'Assists per game', unit: 'perGame', group: 'other', decimals: 1 },
  stl: { short: 'STL', label: 'Steals per game', unit: 'perGame', group: 'other', decimals: 1 },
  blk: { short: 'BLK', label: 'Blocks per game', unit: 'perGame', group: 'other', decimals: 1 },
  tov: { short: 'TOV', label: 'Turnovers per game', unit: 'perGame', group: 'other', decimals: 1, lowerIsBetter: true },
  pf: { short: 'PF', label: 'Fouls per game', unit: 'perGame', group: 'other', decimals: 1, lowerIsBetter: true },

  usg_pct: { short: 'USG%', label: 'Usage rate', unit: 'percent', group: 'rates', decimals: 1 },
  ast_pct: { short: 'AST%', label: 'Assist percentage', unit: 'percent', group: 'rates', decimals: 1 },
  tov_pct: { short: 'TOV%', label: 'Turnover percentage', unit: 'percent', group: 'rates', decimals: 1, lowerIsBetter: true },
  oreb_pct: { short: 'OREB%', label: 'Offensive rebound percentage', unit: 'percent', group: 'rates', decimals: 1 },
  dreb_pct: { short: 'DREB%', label: 'Defensive rebound percentage', unit: 'percent', group: 'rates', decimals: 1 },
  reb_pct: { short: 'REB%', label: 'Rebound percentage', unit: 'percent', group: 'rates', decimals: 1 },
  stl_pct: { short: 'STL%', label: 'Steal percentage', unit: 'percent', group: 'rates', decimals: 1 },
  blk_pct: { short: 'BLK%', label: 'Block percentage', unit: 'percent', group: 'rates', decimals: 1 },

  pts36: { short: 'PTS/36', label: 'Points per 36 minutes', unit: 'per36', group: 'per36', decimals: 1 },
  reb36: { short: 'REB/36', label: 'Rebounds per 36 minutes', unit: 'per36', group: 'per36', decimals: 1 },
  ast36: { short: 'AST/36', label: 'Assists per 36 minutes', unit: 'per36', group: 'per36', decimals: 1 },
  stl36: { short: 'STL/36', label: 'Steals per 36 minutes', unit: 'per36', group: 'per36', decimals: 1 },
  blk36: { short: 'BLK/36', label: 'Blocks per 36 minutes', unit: 'per36', group: 'per36', decimals: 1 },
  fg3m36: { short: '3PM/36', label: 'Threes made per 36 minutes', unit: 'per36', group: 'per36', decimals: 1 },
  tov36: { short: 'TOV/36', label: 'Turnovers per 36 minutes', unit: 'per36', group: 'per36', decimals: 1, lowerIsBetter: true },

  pts100: { short: 'PTS/100', label: 'Points per 100 possessions', unit: 'per100', group: 'per100', decimals: 1 },
  reb100: { short: 'REB/100', label: 'Rebounds per 100 possessions', unit: 'per100', group: 'per100', decimals: 1 },
  ast100: { short: 'AST/100', label: 'Assists per 100 possessions', unit: 'per100', group: 'per100', decimals: 1 },
  stl100: { short: 'STL/100', label: 'Steals per 100 possessions', unit: 'per100', group: 'per100', decimals: 1 },
  blk100: { short: 'BLK/100', label: 'Blocks per 100 possessions', unit: 'per100', group: 'per100', decimals: 1 },
  fg3m100: { short: '3PM/100', label: 'Threes made per 100 possessions', unit: 'per100', group: 'per100', decimals: 1 },
  tov100: {
    short: 'TOV/100',
    label: 'Turnovers per 100 possessions',
    unit: 'per100',
    group: 'per100',
    decimals: 1,
    lowerIsBetter: true,
  },

  game_score: { short: 'GmSc', label: 'Game Score', unit: 'score', group: 'overall', decimals: 1 },
};

/** Context stats, not performance. Mirrors PERCENTILE_STATS in metrics.py. */
const UNRANKED: ReadonlySet<StatId> = new Set<StatId>(['gp', 'age']);

/** Roles and volumes: ranked, but higher is not better. */
const NEUTRAL: ReadonlySet<StatId> = new Set<StatId>(['fga', 'fg3a', 'fta', 'fg3a_rate', 'fta_rate', 'usg_pct']);

export const CATALOG = Object.fromEntries(
  STAT_IDS.map((id): [StatId, StatDef] => [
    id,
    {
      id,
      ...SPECS[id],
      lowerIsBetter: SPECS[id].lowerIsBetter ?? false,
      neutral: NEUTRAL.has(id),
      ranked: !UNRANKED.has(id),
    },
  ]),
) as Record<StatId, StatDef>;

export const GROUPS: { id: StatGroup; title: string; note?: string }[] = [
  { id: 'overall', title: 'Overall', note: 'Game Score adds up a box score into one number (John Hollinger’s formula).' },
  { id: 'scoring', title: 'Scoring' },
  { id: 'shooting', title: 'Shooting', note: 'From season totals. Percentages rank only with enough attempts.' },
  { id: 'other', title: 'Rebounding, passing and defense' },
  {
    id: 'rates',
    title: 'Share of team plays',
    note: 'What share of his team’s plays he finishes, assists, rebounds or steals while on the court, so starters and bench players compare fairly.',
  },
  { id: 'per36', title: 'Per 36 minutes', note: 'Scaled to the same playing time.' },
  { id: 'per100', title: 'Per 100 possessions', note: 'Scaled to the same playing time and pace of play.' },
];

export function statsInGroup(group: StatGroup): StatDef[] {
  return STAT_IDS.map((id) => CATALOG[id]).filter((s) => s.group === group);
}

export function isStatId(value: string): value is StatId {
  return (STAT_IDS as readonly string[]).includes(value);
}
