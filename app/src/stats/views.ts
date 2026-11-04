/**
 * Ways to view the same stats: per game, per 36 minutes or per 100
 * possessions, and position groups (ESPN gives only G, F and C).
 */
import type { StatId } from './catalog';

export type Normalization = 'game' | 'per36' | 'per100';

export const NORMALIZATIONS: readonly { id: Normalization; label: string }[] = [
  { id: 'game', label: 'Per game' },
  { id: 'per36', label: 'Per 36 min' },
  { id: 'per100', label: 'Per 100 poss.' },
];

const VARIANTS: Partial<Record<StatId, Record<Exclude<Normalization, 'game'>, StatId>>> = {
  pts: { per36: 'pts36', per100: 'pts100' },
  reb: { per36: 'reb36', per100: 'reb100' },
  ast: { per36: 'ast36', per100: 'ast100' },
  stl: { per36: 'stl36', per100: 'stl100' },
  blk: { per36: 'blk36', per100: 'blk100' },
  fg3m: { per36: 'fg3m36', per100: 'fg3m100' },
  tov: { per36: 'tov36', per100: 'tov100' },
};

/** The stat to show for a per-game stat under a normalization; unchanged if it has no scaled version. */
export function normalized(stat: StatId, n: Normalization): StatId {
  return n === 'game' ? stat : (VARIANTS[stat]?.[n] ?? stat);
}

/** Counting stats can be scaled; percentages, ratings and minutes can't. */
export function hasVariants(stat: StatId): boolean {
  return VARIANTS[stat] != null;
}

export type PositionGroup = 'G' | 'F' | 'C';

export const POSITION_GROUPS: readonly PositionGroup[] = ['G', 'F', 'C'];

const NOUNS: Record<PositionGroup, { one: string; many: string }> = {
  G: { one: 'Guard', many: 'guards' },
  F: { one: 'Forward', many: 'forwards' },
  C: { one: 'Center', many: 'centers' },
};

export function positionGroup(pos: string): PositionGroup | null {
  return pos === 'G' || pos === 'F' || pos === 'C' ? pos : null;
}

/** "guards", "forwards", "centers". */
export function groupNoun(g: PositionGroup): string {
  return NOUNS[g].many;
}

/** "Guard", "Forward", "Center", or the raw code for anything else. */
export function positionName(pos: string): string {
  const g = positionGroup(pos);
  return g ? NOUNS[g].one : pos;
}
