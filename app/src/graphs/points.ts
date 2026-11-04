import type { Player } from '@/data/types';
import type { StatId } from '@/stats/catalog';
import { hasSample, type AttemptRules } from '@/stats/samples';

import type { ChartPoint } from './math';

export type GraphMode = 'trend' | 'color' | 'density';

export const GRAPH_MODES: { id: GraphMode; label: string; help: string }[] = [
  {
    id: 'trend',
    label: 'Trend',
    help: 'Each dot is a player. The line is the best fit; dots are colored by which side of it they fall.',
  },
  {
    id: 'color',
    label: 'Color by',
    help: 'Each dot is a player, shaded by a third stat. Darker means more in light mode, brighter in dark mode.',
  },
  {
    id: 'density',
    label: 'Density',
    help: 'Players counted in a grid. Shading shows how many players fall in each square.',
  },
];

/**
 * Qualified players with values for every stat in use. Players missing a
 * value are left out, never filled in, and so are players with too few
 * attempts for a shooting percentage on either axis.
 */
export function buildPoints(
  players: readonly Player[],
  x: StatId,
  y: StatId,
  z: StatId | null,
  rules?: AttemptRules,
): ChartPoint[] {
  const used = z ? [x, y, z] : [x, y];
  const out: ChartPoint[] = [];
  for (const p of players) {
    if (!p.q) continue;
    const xv = p.s[x];
    const yv = p.s[y];
    const zv = z ? p.s[z] : null;
    if (xv == null || yv == null || (z && zv == null)) continue;
    if (!used.every((s) => hasSample(p, s, rules))) continue;
    out.push({ id: p.id, name: p.name, x: xv, y: yv, z: zv });
  }
  return out;
}

/** Why qualified players are missing from a chart, for its caption. */
export function leftOut(
  players: readonly Player[],
  stats: readonly StatId[],
  rules?: AttemptRules,
): { noValue: number; smallSample: number } {
  let noValue = 0;
  let smallSample = 0;
  for (const p of players) {
    if (!p.q) continue;
    if (stats.some((s) => p.s[s] == null)) noValue++;
    else if (!stats.every((s) => hasSample(p, s, rules))) smallSample++;
  }
  return { noValue, smallSample };
}
