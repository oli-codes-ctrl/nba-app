/**
 * The players table's data, packed small for the browser. The page is static
 * HTML, so sorting and filtering happen in the browser on these rows: one
 * array per player instead of the full published record (about 60 KB for
 * the league instead of 1.5 MB).
 */
import type { Attempts, Player, StatLine } from '@/data/types';
import type { StatId } from '@/stats/catalog';
import { normalized, type Normalization } from '@/stats/views';

/** A column of the table. `scalable` columns switch to per-36 or per-100 values. */
export type Column = { stat: StatId; scalable: boolean };

export const COLUMNS: readonly Column[] = [
  { stat: 'game_score', scalable: false },
  { stat: 'gp', scalable: false },
  { stat: 'mpg', scalable: false },
  { stat: 'pts', scalable: true },
  { stat: 'reb', scalable: true },
  { stat: 'ast', scalable: true },
  { stat: 'stl', scalable: true },
  { stat: 'blk', scalable: true },
  { stat: 'fg3m', scalable: true },
  { stat: 'tov', scalable: true },
  { stat: 'fg_pct', scalable: false },
  { stat: 'fg3_pct', scalable: false },
  { stat: 'ft_pct', scalable: false },
  { stat: 'ts_pct', scalable: false },
  { stat: 'usg_pct', scalable: false },
];

export const SORTABLE: readonly StatId[] = COLUMNS.map((c) => c.stat);
export const DEFAULT_SORT: StatId = 'game_score';

const SCALES: readonly Normalization[] = ['game', 'per36', 'per100'];

/** Every stat id the table can show, in packing order. */
export const PACKED_STATS: readonly StatId[] = [
  ...new Set(COLUMNS.flatMap((c) => (c.scalable ? SCALES.map((n) => normalized(c.stat, n)) : [c.stat]))),
];

/** [id, name, searchName, team, position, qualified, FGA, 2PA, 3PA, FTA, ...PACKED_STATS] */
export type PackedPlayer = (string | number | null)[];

const HEAD = 10;

export function packPlayer(p: Player): PackedPlayer {
  return [
    p.id,
    p.name,
    p.searchName,
    p.team,
    p.pos,
    p.q ? 1 : 0,
    p.att?.fga ?? null,
    p.att?.fg2a ?? null,
    p.att?.fg3a ?? null,
    p.att?.fta ?? null,
    ...PACKED_STATS.map((id) => p.s[id] ?? null),
  ];
}

/** Rebuilds the parts of a player the table and its sort logic read. */
export function unpackPlayer(row: PackedPlayer): Player {
  const s: Partial<Record<StatId, number | null>> = {};
  PACKED_STATS.forEach((id, i) => {
    s[id] = row[HEAD + i] as number | null;
  });
  const att: Attempts | undefined =
    row[6] == null
      ? undefined
      : { fga: row[6] as number, fg2a: row[7] as number, fg3a: row[8] as number, fta: row[9] as number };
  return {
    id: row[0] as number,
    name: row[1] as string,
    searchName: row[2] as string,
    team: row[3] as string,
    teams: [row[3] as string],
    conf: '',
    pos: row[4] as string,
    q: row[5] === 1,
    s: s as StatLine,
    att,
  };
}
