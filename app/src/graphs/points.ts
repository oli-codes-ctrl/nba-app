import type { Player } from '@/data/types';
import type { StatId } from '@/stats/catalog';

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
 * value (for example 3P% with no attempts) are left out, never filled in.
 */
export function buildPoints(players: readonly Player[], x: StatId, y: StatId, z: StatId | null): ChartPoint[] {
  const out: ChartPoint[] = [];
  for (const p of players) {
    if (!p.q) continue;
    const xv = p.s[x];
    const yv = p.s[y];
    const zv = z ? p.s[z] : null;
    if (xv == null || yv == null || (z && zv == null)) continue;
    out.push({ id: p.id, name: p.name, x: xv, y: yv, z: zv });
  }
  return out;
}
