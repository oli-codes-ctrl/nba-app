/**
 * Direct labels for chosen dots, placed without collisions. Each label tries
 * eight spots around its dot (right, left, above, below, then the
 * diagonals) at four distances, nearest first, and takes the first spot
 * inside the plot that touches no other label, no reserved area (quadrant
 * names) and no other player's dot. A label placed away from its dot gets a
 * leader line. Optional labels that fit nowhere are skipped; required ones
 * (players the reader picked) take the spot covering the fewest dots,
 * weighted so another picked player's dot is avoided first.
 * Callers pass the most important labels first.
 */

export type Box = { x0: number; y0: number; x1: number; y1: number };
export type LabelRequest = {
  id: number;
  dotX: number;
  dotY: number;
  radius: number;
  text: string;
  /** Always shown, even over other dots (never over another label). */
  required?: boolean;
  /** At most one label per group is placed (the first that fits). */
  group?: string;
};
export type PlacedLabel = {
  id: number;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  text: string;
  box: Box;
  /** From the dot's edge to the label, when the label sits away from its dot. */
  leader: { x1: number; y1: number; x2: number; y2: number } | null;
};
/**
 * A dot labels should not cover. `weight` is how bad covering it is
 * (default 1); highlighted players' dots should weigh much more.
 */
export type DotMark = { id: number; x: number; y: number; r: number; weight?: number };

/** Rough rendered width of a label at this size (system UI fonts, semibold). */
export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function inside(a: Box, bounds: Box): boolean {
  return a.x0 >= bounds.x0 && a.x1 <= bounds.x1 && a.y0 >= bounds.y0 && a.y1 <= bounds.y1;
}

function hitsDot(box: Box, d: DotMark): boolean {
  // Circle against rectangle: nearest point of the box to the dot's center.
  const nx = Math.max(box.x0, Math.min(d.x, box.x1));
  const ny = Math.max(box.y0, Math.min(d.y, box.y1));
  return (nx - d.x) ** 2 + (ny - d.y) ** 2 < d.r * d.r;
}

/** Extra distance from the dot for the second and third rings of spots. */
const RINGS = [0, 10, 22, 36];

type Spot = { x: number; y: number; anchor: PlacedLabel['anchor']; ring: number };

function spots(r: LabelRequest, fontSize: number): Spot[] {
  const ascent = fontSize * 0.8;
  const mid = fontSize * 0.35; // baseline offset that centers text on the dot
  const out: Spot[] = [];
  RINGS.forEach((extra, ring) => {
    const g = r.radius + 4 + extra;
    const d = g * 0.75; // diagonal offset per axis
    out.push(
      { x: r.dotX + g, y: r.dotY + mid, anchor: 'start', ring },
      { x: r.dotX - g, y: r.dotY + mid, anchor: 'end', ring },
      { x: r.dotX, y: r.dotY - g - 1, anchor: 'middle', ring },
      { x: r.dotX, y: r.dotY + g + ascent, anchor: 'middle', ring },
      { x: r.dotX + d, y: r.dotY - d, anchor: 'start', ring },
      { x: r.dotX - d, y: r.dotY - d, anchor: 'end', ring },
      { x: r.dotX + d, y: r.dotY + d + ascent, anchor: 'start', ring },
      { x: r.dotX - d, y: r.dotY + d + ascent, anchor: 'end', ring },
    );
  });
  return out;
}

export function placeLabels(
  requests: readonly LabelRequest[],
  bounds: Box,
  fontSize: number,
  occupied: readonly Box[] = [],
  dots: readonly DotMark[] = [],
): PlacedLabel[] {
  const taken: Box[] = [...occupied];
  const placed: PlacedLabel[] = [];
  const ascent = fontSize * 0.8;
  const descent = fontSize * 0.25;
  const groupsDone = new Set<string>();
  for (const r of requests) {
    if (r.group && groupsDone.has(r.group)) continue;
    const w = textWidth(r.text, fontSize);
    const others = dots.filter((d) => d.id !== r.id);
    let best: { spot: Spot; box: Box; covered: number } | null = null;
    for (const spot of spots(r, fontSize)) {
      const left = spot.anchor === 'start' ? spot.x : spot.anchor === 'end' ? spot.x - w : spot.x - w / 2;
      const box = { x0: left - 2, y0: spot.y - ascent - 1, x1: left + w + 2, y1: spot.y + descent + 1 };
      if (!inside(box, bounds) || taken.some((t) => overlaps(t, box))) continue;
      const covered = others.reduce((n, d) => n + (hitsDot(box, d) ? (d.weight ?? 1) : 0), 0);
      if (covered === 0) {
        best = { spot, box, covered };
        break;
      }
      if (r.required && (!best || covered < best.covered)) best = { spot, box, covered };
    }
    if (!best) continue;
    if (r.group) groupsDone.add(r.group);
    taken.push(best.box);
    placed.push({
      id: r.id,
      text: r.text,
      box: best.box,
      x: best.spot.x,
      y: best.spot.y,
      anchor: best.spot.anchor,
      leader: best.spot.ring > 0 ? leaderLine(r, best.box) : null,
    });
  }
  return placed;
}

/** A short line from the dot's edge toward the nearest point of its label. */
function leaderLine(r: LabelRequest, box: Box): PlacedLabel['leader'] {
  const tx = Math.max(box.x0, Math.min(r.dotX, box.x1));
  const ty = Math.max(box.y0, Math.min(r.dotY, box.y1));
  const dx = tx - r.dotX;
  const dy = ty - r.dotY;
  const len = Math.hypot(dx, dy);
  if (len <= r.radius + 2) return null;
  const ux = dx / len;
  const uy = dy / len;
  return { x1: r.dotX + ux * (r.radius + 1), y1: r.dotY + uy * (r.radius + 1), x2: tx - ux * 1.5, y2: ty - uy * 1.5 };
}
