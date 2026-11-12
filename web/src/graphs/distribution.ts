/**
 * Math for the distribution view ("where does he stand?"). Pure, tested.
 */

/** Quantile with linear interpolation between order statistics (R's type 7, the common default). */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const h = (sorted.length - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

/**
 * Share of the pool below a value, counting ties as half (0-100): the same
 * mid-rank percentile the pipeline publishes.
 */
export function midRankPercentile(value: number, pool: readonly number[]): number {
  if (pool.length === 0) return NaN;
  let below = 0;
  let equal = 0;
  for (const v of pool) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return ((below + 0.5 * equal) / pool.length) * 100;
}

/**
 * Where a player's likely range (95%) would rank: the "better than X%"
 * percentiles of its two ends. A wide band means his true rank is still
 * uncertain. For lower-is-better stats, lower values rank better.
 */
export function rankBand(
  range: readonly [number, number],
  pool: readonly number[],
  lowerIsBetter = false,
): [number, number] {
  const a = midRankPercentile(range[0], pool);
  const b = midRankPercentile(range[1], pool);
  const [lo, hi] = lowerIsBetter ? [100 - b, 100 - a] : [a, b];
  return [Math.min(lo, hi), Math.max(lo, hi)];
}

export type SwarmDot = { index: number; x: number; y: number };

/**
 * Beeswarm: each dot keeps its exact x position and is pushed up or down
 * just enough not to overlap dots already placed, nearest the center line
 * first. If the swarm would be taller than the band, the radius shrinks
 * (down to minRadius) before dots are allowed to overlap.
 */
export function beeswarm(
  xs: readonly number[],
  maxHalfHeight: number,
  radius = 4,
  minRadius = 2,
): { dots: SwarmDot[]; radius: number } {
  for (let r = radius; ; r = Math.max(minRadius, r - 0.5)) {
    const dots = place(xs, r);
    const tallest = Math.max(0, ...dots.map((d) => Math.abs(d.y)));
    if (tallest <= maxHalfHeight - r || r <= minRadius) {
      // Clamp anything still too tall rather than spill out of the band.
      const limit = Math.max(0, maxHalfHeight - r);
      return { dots: dots.map((d) => ({ ...d, y: Math.max(-limit, Math.min(limit, d.y)) })), radius: r };
    }
  }
}

function place(xs: readonly number[], r: number): SwarmDot[] {
  const order = xs.map((x, index) => ({ x, index })).sort((a, b) => a.x - b.x);
  const placed: SwarmDot[] = [];
  const diameter = 2 * r;
  let windowStart = 0;
  for (const { x, index } of order) {
    // Only dots within one diameter to the left can collide.
    while (windowStart < placed.length && x - placed[windowStart].x > diameter) windowStart++;
    const near = placed.slice(windowStart);
    let y = 0;
    for (let k = 0; ; k++) {
      // 0, +d, -d, +2d, -2d, ... : the free slot nearest the center line.
      const step = Math.ceil(k / 2) * diameter * 0.9;
      y = k % 2 === 1 ? step : -step;
      if (k === 0) y = 0;
      const clash = near.some((d) => (d.x - x) ** 2 + (d.y - y) ** 2 < diameter * diameter - 1e-6);
      if (!clash) break;
    }
    placed.push({ index, x, y });
  }
  return placed;
}
