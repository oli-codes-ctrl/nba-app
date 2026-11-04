import type { Player } from '@/data/types';
import type { StatId } from '@/stats/catalog';
import { hasSample, type AttemptRules } from '@/stats/samples';
import { positionGroup, type PositionGroup } from '@/stats/views';

import type { ChartPoint } from './math';

/**
 * Qualified players with values for every stat in use, optionally at one
 * position. Players missing a value are left out, never filled in, and so
 * are players with too few attempts for a shooting percentage in use.
 */
export function buildPoints(
  players: readonly Player[],
  x: StatId,
  y: StatId,
  z: StatId | null,
  rules?: AttemptRules,
  position: PositionGroup | null = null,
): ChartPoint[] {
  const used = z ? [x, y, z] : [x, y];
  const out: ChartPoint[] = [];
  for (const p of players) {
    if (!p.q) continue;
    if (position && positionGroup(p.pos) !== position) continue;
    const xv = p.s[x];
    const yv = p.s[y];
    const zv = z ? p.s[z] : null;
    if (xv == null || yv == null || (z && zv == null)) continue;
    if (!used.every((s) => hasSample(p, s, rules))) continue;
    out.push({
      id: p.id,
      name: p.name,
      x: xv,
      y: yv,
      z: zv,
      group: positionGroup(p.pos) ?? undefined,
      minutes: (p.s.gp ?? 0) * (p.s.mpg ?? 0),
    });
  }
  return out;
}

export type Axis = 'x' | 'y' | 'z';

/**
 * The stats on a chart in reading order (Y, then X, then color), each once.
 * The same stat can sit on two axes; lists keyed by stat must not repeat it.
 */
export function chartColumns(x: StatId, y: StatId, z: StatId | null): { stat: StatId; axis: Axis }[] {
  const out: { stat: StatId; axis: Axis }[] = [];
  const candidates: [StatId | null, Axis][] = [
    [y, 'y'],
    [x, 'x'],
    [z, 'z'],
  ];
  for (const [stat, axis] of candidates) {
    if (stat && !out.some((c) => c.stat === stat)) out.push({ stat, axis });
  }
  return out;
}

/** Why qualified players (at a position, if given) are missing from a chart, for its caption. */
export function leftOut(
  players: readonly Player[],
  stats: readonly StatId[],
  rules?: AttemptRules,
  position: PositionGroup | null = null,
): { noValue: number; smallSample: number } {
  let noValue = 0;
  let smallSample = 0;
  for (const p of players) {
    if (!p.q) continue;
    if (position && positionGroup(p.pos) !== position) continue;
    if (stats.some((s) => p.s[s] == null)) noValue++;
    else if (!stats.every((s) => hasSample(p, s, rules))) smallSample++;
  }
  return { noValue, smallSample };
}
