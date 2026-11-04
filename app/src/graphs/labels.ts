/**
 * Direct labels for chosen dots, placed without collisions. Each label tries
 * right, left, above and below its dot; the first spot inside the plot that
 * overlaps nothing already placed wins. Labels that fit nowhere are skipped
 * (callers pass the most important labels first).
 */

export type Box = { x0: number; y0: number; x1: number; y1: number };
export type LabelRequest = { id: number; dotX: number; dotY: number; radius: number; text: string };
export type PlacedLabel = { id: number; x: number; y: number; anchor: 'start' | 'middle' | 'end'; text: string; box: Box };

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

export function placeLabels(
  requests: readonly LabelRequest[],
  bounds: Box,
  fontSize: number,
  occupied: readonly Box[] = [],
): PlacedLabel[] {
  const taken: Box[] = [...occupied];
  const placed: PlacedLabel[] = [];
  const ascent = fontSize * 0.8;
  const descent = fontSize * 0.25;
  for (const r of requests) {
    const w = textWidth(r.text, fontSize);
    const gap = r.radius + 4;
    const candidates: Omit<PlacedLabel, 'id' | 'text' | 'box'>[] = [
      { x: r.dotX + gap, y: r.dotY + fontSize * 0.35, anchor: 'start' },
      { x: r.dotX - gap, y: r.dotY + fontSize * 0.35, anchor: 'end' },
      { x: r.dotX, y: r.dotY - gap - 1, anchor: 'middle' },
      { x: r.dotX, y: r.dotY + gap + ascent, anchor: 'middle' },
    ];
    for (const c of candidates) {
      const left = c.anchor === 'start' ? c.x : c.anchor === 'end' ? c.x - w : c.x - w / 2;
      const box = { x0: left - 2, y0: c.y - ascent - 1, x1: left + w + 2, y1: c.y + descent + 1 };
      if (!inside(box, bounds) || taken.some((t) => overlaps(t, box))) continue;
      taken.push(box);
      placed.push({ id: r.id, text: r.text, box, ...c });
      break;
    }
  }
  return placed;
}
