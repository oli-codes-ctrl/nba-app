import type { Player } from '@/data/types';
import {
  bin2d,
  classBreaks,
  classIndex,
  countRanges,
  extent,
  linearFit,
  nearestIndex,
  paddedDomain,
  scale,
  tickLabel,
  ticks,
  type ChartPoint,
} from '@/graphs/math';
import { buildPoints } from '@/graphs/points';
import { STAT_IDS, type StatId } from '@/stats/catalog';

const pt = (id: number, x: number, y: number, z: number | null = null): ChartPoint => ({ id, name: `P${id}`, x, y, z });

describe('domains and ticks', () => {
  it('pads a flat extent', () => {
    expect(extent([5, 5, 5])).toEqual([4, 6]);
    expect(extent([])).toEqual([0, 1]);
    expect(extent([3, -1, 7])).toEqual([-1, 7]);
  });

  it('pads domains a little on each side without crossing zero', () => {
    expect(paddedDomain([19, 41])).toEqual([17.9, 42.1]);
    expect(paddedDomain([0.3, 37.7])).toEqual([0, expect.closeTo(39.57)]);
    expect(paddedDomain([-10, 10])).toEqual([-11, 11]);
  });

  it('keeps every tick inside the padded domain', () => {
    for (const d of [[19, 41], [0.3, 37.7], [42.1, 61.8], [-3.2, 4.4]] as const) {
      const pd = paddedDomain(d);
      const t = ticks(pd);
      expect(t.length).toBeGreaterThanOrEqual(3);
      expect(t[0]).toBeGreaterThanOrEqual(pd[0]);
      expect(t[t.length - 1]).toBeLessThanOrEqual(pd[1]);
    }
  });

  it('places ticks on 1/2/5 steps inside the domain', () => {
    expect(ticks([0, 40])).toEqual([0, 10, 20, 30, 40]);
    expect(ticks([15, 45])).toEqual([20, 30, 40]);
    expect(ticks([0, 1])).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(ticks([-10, 10])).toEqual([-10, -5, 0, 5, 10]);
  });

  it('labels ticks with only the decimals the step needs', () => {
    expect(tickLabel(20, [0, 40])).toBe('20');
    expect(tickLabel(0.4, [0, 1])).toBe('0.4');
  });

  it('maps a domain onto a range, including inverted ranges', () => {
    const s = scale([0, 10], [100, 0]);
    expect(s(0)).toBe(100);
    expect(s(5)).toBe(50);
    expect(s(10)).toBe(0);
  });
});

describe('linearFit', () => {
  it('recovers an exact line', () => {
    const fit = linearFit([pt(1, 0, 1), pt(2, 1, 3), pt(3, 2, 5)]);
    expect(fit?.slope).toBeCloseTo(2);
    expect(fit?.intercept).toBeCloseTo(1);
  });

  it('returns null when x never varies or there are too few points', () => {
    expect(linearFit([pt(1, 2, 1), pt(2, 2, 3)])).toBeNull();
    expect(linearFit([pt(1, 2, 1)])).toBeNull();
  });
});

describe('color classes', () => {
  it('bands values into equal classes, clamping the ends', () => {
    expect([0, 1.9, 2, 9.99, 10, -3, 13].map((v) => classIndex(v, [0, 10], 5))).toEqual([0, 0, 1, 4, 4, 0, 4]);
    expect(classIndex(5, [5, 5], 5)).toBe(0);
  });

  it('gives classes + 1 breaks for the legend', () => {
    expect(classBreaks([0, 10], 5)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('lists the counts each density class covers', () => {
    expect(countRanges(1, 5)).toEqual([[1, 1], null, null, null, null]);
    expect(countRanges(10, 5)).toEqual([[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]);
    expect(countRanges(3, 5)).toEqual([[1, 1], null, [2, 2], null, [3, 3]]);
  });
});

describe('bin2d', () => {
  it('counts points per grid square and skips empty squares', () => {
    const bins = bin2d([pt(1, 0, 0), pt(2, 0.4, 0.4), pt(3, 9, 9)], 2, 2, [0, 10], [0, 10]);
    expect(bins).toHaveLength(2);
    expect(bins.find((b) => b.col === 0 && b.row === 0)).toMatchObject({ count: 2, ids: [1, 2] });
    expect(bins.find((b) => b.col === 1 && b.row === 1)).toMatchObject({ count: 1, ids: [3] });
  });
});

describe('nearestIndex', () => {
  const screen = [
    { sx: 10, sy: 10 },
    { sx: 50, sy: 50 },
  ];
  it('finds the closest point within reach', () => {
    expect(nearestIndex(screen, 45, 52, 28)).toBe(1);
  });
  it('ignores taps too far from every point', () => {
    expect(nearestIndex(screen, 200, 200, 28)).toBeNull();
  });
});

describe('buildPoints', () => {
  function player(id: number, q: boolean, stats: Partial<Record<StatId, number | null>>): Player {
    const s = Object.fromEntries(STAT_IDS.map((sid) => [sid, 1])) as Record<StatId, number | null>;
    Object.assign(s, stats);
    return { id, name: `P${id}`, searchName: `p${id}`, team: 'BOS', teams: ['BOS'], conf: 'East', pos: 'G', q, s };
  }

  it('keeps qualified players with every value present and never fills gaps', () => {
    const players = [
      player(1, true, { age: 25, pts: 20, fg3_pct: 40 }),
      player(2, false, { age: 30, pts: 30 }),
      player(3, true, { age: 28, pts: 10, fg3_pct: null }),
    ];
    expect(buildPoints(players, 'age', 'pts', null).map((p) => p.id)).toEqual([1, 3]);
    expect(buildPoints(players, 'age', 'pts', 'fg3_pct').map((p) => [p.id, p.z])).toEqual([[1, 40]]);
    expect(buildPoints(players, 'age', 'fg3_pct', null).map((p) => p.id)).toEqual([1]);
  });
});
