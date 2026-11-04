import type { Player } from '@/data/types';
import {
  describeRelationship,
  median,
  quadrantCounts,
  quadrantExemplars,
  quadrantOf,
  ranks,
  sharedInputs,
  shortName,
  significanceThreshold,
  spearman,
  thinSamples,
} from '@/graphs/analysis';
import { placeLabels } from '@/graphs/labels';
import type { ChartPoint } from '@/graphs/math';
import { buildPoints } from '@/graphs/points';
import { PRESETS } from '@/graphs/presets';
import { CATALOG, STAT_IDS, type StatId } from '@/stats/catalog';

const pt = (id: number, x: number, y: number, minutes = 300): ChartPoint => ({ id, name: `P${id}`, x, y, z: null, minutes });

describe('ranks and correlation', () => {
  it('averages tied ranks', () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('matches a reference Spearman value', () => {
    // R: cor(c(1,2,3,4,5), c(5,6,7,8,7), method = "spearman") = 0.8207827
    expect(spearman([1, 2, 3, 4, 5], [5, 6, 7, 8, 7])).toBeCloseTo(0.8207827, 6);
    // Any increasing relationship, even a curved one, is a perfect rank correlation.
    expect(spearman([1, 2, 3, 4], [1, 8, 27, 64])).toBeCloseTo(1, 10);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10);
  });

  it('needs a stronger correlation to count when there are fewer players', () => {
    expect(significanceThreshold(318)).toBeCloseTo(0.11, 2);
    expect(significanceThreshold(45)).toBeCloseTo(0.295, 3);
  });
});

describe('describing a relationship', () => {
  it('describes a reliable link in words, with rho and n', () => {
    const points = Array.from({ length: 60 }, (_, i) => pt(i, i, i * 0.5 + (i % 7)));
    const r = describeRelationship(points, 'usage rate', 'true shooting');
    expect(r.reliable).toBe(true);
    expect(r.text).toMatch(/^A (very )?strong link: higher usage rate goes with higher true shooting \(ρ = 0\.\d\d, 60 players\)\.$/);
  });

  it('refuses to read a weak pattern in a small group', () => {
    const points = [pt(1, 1, 3), pt(2, 2, 1), pt(3, 3, 4), pt(4, 4, 2), pt(5, 5, 5), pt(6, 6, 1)];
    const r = describeRelationship(points, 'x', 'y');
    expect(r.reliable).toBe(false);
    expect(r.text).toContain('could be chance');
  });

  it('describes a negative link with a minus sign', () => {
    const points = Array.from({ length: 50 }, (_, i) => pt(i, i, -i + (i % 5)));
    expect(describeRelationship(points, 'a', 'b').text).toContain('goes with lower b (ρ = −');
  });
});

describe('quadrants', () => {
  const points = [pt(1, 1, 1), pt(2, 9, 9), pt(3, 1, 9), pt(4, 9, 1), pt(5, 5, 5)];

  it('splits at the medians, ties counting as the higher side', () => {
    expect(quadrantOf(points[1], 5, 5)).toBe('topRight');
    expect(quadrantOf(points[4], 5, 5)).toBe('topRight');
    expect(quadrantCounts(points, 5, 5)).toEqual({ topRight: 2, topLeft: 1, bottomLeft: 1, bottomRight: 1 });
  });

  it('flips up and down for a lower-is-better axis', () => {
    expect(quadrantOf(points[0], 5, 5, true)).toBe('topLeft');
    expect(quadrantOf(points[1], 5, 5, true)).toBe('bottomRight');
  });

  it('labels the most extreme player in each quadrant, never a thin sample', () => {
    const many = [...points, pt(6, 10, 10), pt(7, 0, 0, 20)];
    const ids = quadrantExemplars(many, 5, 5, false, new Set([7]));
    expect(ids).toContain(6); // furthest top-right
    expect(ids).not.toContain(7);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks under half the median playing time as a thin sample', () => {
    const set = [pt(1, 0, 0, 400), pt(2, 0, 0, 300), pt(3, 0, 0, 100), pt(4, 0, 0, 350)];
    expect([...thinSamples(set)]).toEqual([3]); // median 325, cut 162.5
  });
});

describe('labels', () => {
  it('places labels inside the plot without overlapping', () => {
    const bounds = { x0: 0, y0: 0, x1: 300, y1: 200 };
    const placed = placeLabels(
      [
        { id: 1, dotX: 150, dotY: 100, radius: 4, text: 'N. Jokić' },
        { id: 2, dotX: 152, dotY: 101, radius: 4, text: 'L. Dončić' },
        { id: 3, dotX: 295, dotY: 100, radius: 4, text: 'S. Curry' },
      ],
      bounds,
      11,
    );
    for (const p of placed) {
      expect(p.box.x0).toBeGreaterThanOrEqual(0);
      expect(p.box.x1).toBeLessThanOrEqual(300);
    }
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i].box;
        const b = placed[j].box;
        expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1).toBe(false);
      }
    }
    expect(placed.find((p) => p.id === 3)?.anchor).toBe('end'); // no room on the right
  });

  it('shortens names for labels', () => {
    expect(shortName('Nikola Jokić')).toBe('N. Jokić');
    expect(shortName('Jaren Jackson Jr.')).toBe('J. Jackson');
    expect(shortName('Nenê')).toBe('Nenê');
  });
});

describe('shared inputs', () => {
  it('flags pairs built from the same counts', () => {
    expect(sharedInputs('fgm', 'fg_pct')).toEqual(['fgm']);
    expect(sharedInputs('fgm', 'pts')).toEqual(['fgm']); // points are built from made shots
    expect(sharedInputs('ftm', 'pts100')).toEqual(['ftm']);
    expect(sharedInputs('pts', 'pts36')).toEqual(['pts']);
    expect(sharedInputs('reb', 'oreb')).toEqual(['oreb']);
    expect(sharedInputs('ast', 'blk')).toEqual([]);
    expect(sharedInputs('age', 'pts')).toEqual([]);
  });
});

describe('presets', () => {
  it('use ranked stats, distinct ids, and flip only lower-is-better axes', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    for (const p of PRESETS) {
      expect(CATALOG[p.x].ranked && CATALOG[p.y].ranked).toBe(true);
      expect(!!p.invertY).toBe(CATALOG[p.y].lowerIsBetter);
      // Curated pairs may share a denominator (shot diet: both per field goal attempt);
      // what they must never do is chart a stat against itself.
      expect(p.x).not.toBe(p.y);
    }
  });
});

describe('points', () => {
  function player(id: number, pos: string, q = true): Player {
    const s = Object.fromEntries(STAT_IDS.map((sid) => [sid, 10])) as Record<StatId, number | null>;
    Object.assign(s, { gp: 5, mpg: 30 });
    return { id, name: `P${id}`, searchName: `p${id}`, team: 'BOS', teams: ['BOS'], conf: 'East', pos, q, s };
  }

  it('filters by position and carries position and minutes', () => {
    const ps = [player(1, 'G'), player(2, 'C'), player(3, 'G', false)];
    const all = buildPoints(ps, 'pts', 'reb', null);
    expect(all.map((p) => p.id)).toEqual([1, 2]);
    expect(all[0]).toMatchObject({ group: 'G', minutes: 150 });
    expect(buildPoints(ps, 'pts', 'reb', null, undefined, 'C').map((p) => p.id)).toEqual([2]);
  });
});
