import { beeswarm, midRankPercentile, quantile, rankBand } from '@/graphs/distribution';

describe('quantile (type 7)', () => {
  it('matches R / NumPy defaults', () => {
    // R: quantile(c(1,2,3,4), c(.25,.5,.75)) -> 1.75 2.50 3.25
    expect(quantile([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75);
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5);
    expect(quantile([1, 2, 3, 4], 0.75)).toBeCloseTo(3.25);
    expect(quantile([5], 0.5)).toBe(5);
    expect(quantile([1, 9], 0)).toBe(1);
    expect(quantile([1, 9], 1)).toBe(9);
    expect(quantile([], 0.5)).toBeNaN();
  });
});

describe('midRankPercentile', () => {
  it('counts ties as half, like the pipeline', () => {
    const pool = [1, 2, 2, 3];
    expect(midRankPercentile(2, pool)).toBe(50); // 1 below + half of 2 equal = 2 of 4
    expect(midRankPercentile(0, pool)).toBe(0);
    expect(midRankPercentile(4, pool)).toBe(100);
    expect(midRankPercentile(1, pool)).toBe(12.5);
  });
});

describe('rankBand', () => {
  const pool = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100

  it('ranks the two ends of a likely range', () => {
    const [lo, hi] = rankBand([30, 70], pool);
    expect(lo).toBeCloseTo(29.5);
    expect(hi).toBeCloseTo(69.5);
  });

  it('flips for lower-is-better stats and stays ordered', () => {
    // Few turnovers rank well: a range of 10-20 sits near the top.
    const [lo, hi] = rankBand([10, 20], pool, true);
    expect(lo).toBeLessThan(hi);
    expect(lo).toBeCloseTo(100 - 19.5);
    expect(hi).toBeCloseTo(100 - 9.5);
  });
});

describe('beeswarm', () => {
  const xs = [10, 10, 10, 10, 11, 12, 30, 31, 31, 31, 31, 80];

  it('keeps every x exactly and never overlaps when there is room', () => {
    const { dots, radius } = beeswarm(xs, 100);
    expect(radius).toBe(4);
    expect(dots).toHaveLength(xs.length);
    for (const d of dots) expect(d.x).toBe(xs[d.index]);
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dist = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
        expect(dist).toBeGreaterThanOrEqual(2 * radius - 1e-6);
      }
    }
  });

  it('puts a lone dot on the center line', () => {
    const { dots } = beeswarm([50], 20);
    expect(dots[0].y).toBe(0);
  });

  it('shrinks the dots before spilling out of a short band', () => {
    const crowd = Array.from({ length: 40 }, () => 50);
    const { dots, radius } = beeswarm(crowd, 30);
    expect(radius).toBeLessThan(4);
    expect(radius).toBeGreaterThanOrEqual(2);
    for (const d of dots) expect(Math.abs(d.y)).toBeLessThanOrEqual(30 - radius + 1e-9);
  });
});
