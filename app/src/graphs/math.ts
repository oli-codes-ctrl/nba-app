/** Pure helpers for the Graphs tab. No React, so they are easy to test. */

export type Domain = readonly [number, number];

export type ChartPoint = {
  id: number;
  name: string;
  x: number;
  y: number;
  /** Third stat when coloring by a stat. */
  z: number | null;
  /** Position group (G, F, C) for coloring by position. */
  group?: string;
  /** Total minutes played: the sample behind the dot. */
  minutes?: number;
};

/** Min and max, padded when every value is the same. */
export function extent(values: readonly number[]): Domain {
  if (values.length === 0) return [0, 1];
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min === max ? [min - 1, max + 1] : [min, max];
}

function niceStep(span: number, count: number): number {
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

/**
 * Widen a domain by a fraction of its span on each side, so edge dots are not
 * cut in half. Ticks are then placed inside it; the ends need not be ticks.
 * A domain that starts at or above zero never pads below zero.
 */
export function paddedDomain([min, max]: Domain, fraction = 0.05): Domain {
  const pad = (max - min) * fraction;
  const lo = min >= 0 ? Math.max(0, min - pad) : min - pad;
  return [lo, max + pad];
}

/** Tick values on 1/2/5 steps covering the domain. */
export function ticks([min, max]: Domain, count = 5): number[] {
  const step = niceStep(max - min, count);
  const out: number[] = [];
  const first = Math.ceil(min / step - 1e-9) * step;
  for (let v = first; v <= max + step * 1e-9; v += step) {
    // Trim float noise (0.6000000000000001) and negative zero.
    out.push(Number((Math.round(v / step) * step).toPrecision(12)) + 0);
  }
  return out;
}

export function tickLabel(value: number, [min, max]: Domain): string {
  const step = niceStep(max - min, 5);
  const decimals = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)));
  return value.toFixed(decimals);
}

export function scale([d0, d1]: Domain, [r0, r1]: readonly [number, number]) {
  const k = (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/** Ordinary least squares y = slope * x + intercept, or null if x never varies. */
export function linearFit(points: readonly { x: number; y: number }[]): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

/**
 * Split [min, max] into `classes` equal bands and return the band index for
 * a value (0 = lowest). Used for the five-step color ramp.
 */
export function classIndex(value: number, [min, max]: Domain, classes: number): number {
  if (max <= min) return 0;
  const i = Math.floor(((value - min) / (max - min)) * classes);
  return Math.max(0, Math.min(classes - 1, i));
}

/** Band boundaries for a legend: classes + 1 numbers from min to max. */
export function classBreaks([min, max]: Domain, classes: number): number[] {
  return Array.from({ length: classes + 1 }, (_, i) => min + ((max - min) * i) / classes);
}

/** Index of the point closest to (px, py) in screen space, within maxDistance. */
export function nearestIndex(
  screen: readonly { sx: number; sy: number }[],
  px: number,
  py: number,
  maxDistance: number,
): number | null {
  let best: number | null = null;
  let bestD = maxDistance * maxDistance;
  screen.forEach((p, i) => {
    const d = (p.sx - px) ** 2 + (p.sy - py) ** 2;
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}
