/** Pure chart-geometry helpers. No DOM access, so they are unit-tested in tests/scale.test.ts. */

/** Step from the 1 / 2 / 2.5 / 5 × 10^n family closest above range / target. */
export function niceStep(range: number, target = 5): number {
  if (!Number.isFinite(range) || range <= 0) return 1;
  const raw = range / Math.max(1, target);
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}
export interface LinearDomain { min: number; max: number; step: number; ticks: number[] }
/** Expands [min, max] outward to whole nice steps and lists the ticks. */
export function niceDomain(min: number, max: number, target = 5): LinearDomain {
  let lo = Math.min(min, max), hi = Math.max(min, max);
  if (lo === hi) { lo -= lo === 0 ? 1 : Math.abs(lo) * 0.1; hi += hi === 0 ? 1 : Math.abs(hi) * 0.1; }
  const step = niceStep(hi - lo, target);
  const start = Math.floor(lo / step + 1e-9) * step;
  const end = Math.ceil(hi / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 1e6; value += step) ticks.push(Math.round(value * 1e6) / 1e6);
  return { min: start, max: end, step, ticks };
}
/** 1-2-5 ticks bracketing [min, max] for a base-10 log axis. */
export function logTicks(min: number, max: number): number[] {
  const lo = Math.max(min, 1e-9), hi = Math.max(max, lo);
  const values: number[] = [];
  for (let power = Math.floor(Math.log10(lo)) - 1; power <= Math.ceil(Math.log10(hi)) + 1; power++) {
    for (const mantissa of [1, 2, 5]) values.push(mantissa * 10 ** power);
  }
  const below = values.filter((value) => value <= lo).at(-1) ?? lo;
  const above = values.find((value) => value >= hi) ?? hi;
  return values.filter((value) => value >= below && value <= above);
}
export interface Box { x0: number; y0: number; x1: number; y1: number }
export interface LabelRequest { id: string; x: number; y: number; r: number; width: number; height: number; priority: number }
export interface PlacedLabel {
  id: string; x: number; y: number; anchor: "start" | "end" | "middle"; box: Box;
  /** Distance in px from the marker centre to the nearest point of the label box. */
  offset: number;
  /** Present when the label sits further than `maxOffset` from its marker: a short line from the marker edge to the label. */
  leader?: Segment;
}
const overlaps = (a: Box, b: Box, pad = 2): boolean => a.x0 < b.x1 + pad && a.x1 + pad > b.x0 && a.y0 < b.y1 + pad && a.y1 + pad > b.y0;
const inside = (a: Box, bounds: Box): boolean => a.x0 >= bounds.x0 && a.x1 <= bounds.x1 && a.y0 >= bounds.y0 && a.y1 <= bounds.y1;
export interface Segment { x0: number; y0: number; x1: number; y1: number }

/** True when the segment passes through the box (inflated by pad). Sampled; exact enough at chart scale. */
export function segmentHitsBox(segment: Segment, box: Box, pad = 1): boolean {
  const steps = Math.max(8, Math.ceil(Math.hypot(segment.x1 - segment.x0, segment.y1 - segment.y0) / 3));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = segment.x0 + (segment.x1 - segment.x0) * t, y = segment.y0 + (segment.y1 - segment.y0) * t;
    if (x > box.x0 - pad && x < box.x1 + pad && y > box.y0 - pad && y < box.y1 + pad) return true;
  }
  return false;
}

/** Nearest point of a box to (x, y) and its distance. */
export function nearestPointOnBox(x: number, y: number, box: Box): { x: number; y: number; distance: number } {
  const nx = Math.min(Math.max(x, box.x0), box.x1), ny = Math.min(Math.max(y, box.y0), box.y1);
  return { x: nx, y: ny, distance: Math.hypot(nx - x, ny - y) };
}

/** Leader from the marker edge (radius r) to just short of the label box; undefined when they touch. */
export function leaderLine(x: number, y: number, r: number, box: Box, gap = 2): Segment | undefined {
  const near = nearestPointOnBox(x, y, box);
  if (near.distance <= r + gap) return undefined;
  const ux = (near.x - x) / near.distance, uy = (near.y - y) / near.distance;
  return { x0: x + ux * r, y0: y + uy * r, x1: near.x - ux * gap, y1: near.y - uy * gap };
}

export interface PlaceLabelOptions {
  /** Largest marker-to-label distance drawn without a leader line. Default 24px. */
  maxOffset?: number;
  /** Largest marker-to-label distance allowed at all; beyond it the label is omitted. Default 2 × maxOffset. */
  leaderMaxOffset?: number;
}

/**
 * Scored greedy label placement. Each label (highest priority first) tries positions around its
 * point. Positions that leave the plot, cover a marker or overlap a placed label are rejected; the
 * rest are scored by how many polyline segments (e.g. the frontier line) they cross, whether they
 * need a leader line, and position preference. A label further than `maxOffset` from its marker
 * always carries a leader; one further than `leaderMaxOffset` is never placed. Labels that fit
 * nowhere are omitted; tooltips and tables keep the value.
 */
export function placeLabels(labels: LabelRequest[], markers: { x: number; y: number; r: number }[], bounds: Box, gap = 6, segments: Segment[] = [], options: PlaceLabelOptions = {}): PlacedLabel[] {
  const maxOffset = options.maxOffset ?? 24;
  const leaderMaxOffset = Math.max(maxOffset, options.leaderMaxOffset ?? maxOffset * 2);
  const placed: PlacedLabel[] = [];
  const markerBoxes = markers.map((m) => ({ x0: m.x - m.r, y0: m.y - m.r, x1: m.x + m.r, y1: m.y + m.r }));
  for (const label of [...labels].sort((a, b) => b.priority - a.priority)) {
    const { x, y, r, width: w, height: h } = label, d = r + gap, far = d + h * 0.75, out = d + h + 8;
    const candidates: { box: Box; anchor: PlacedLabel["anchor"]; tx: number }[] = [
      { box: { x0: x + d, y0: y - h / 2, x1: x + d + w, y1: y + h / 2 }, anchor: "start", tx: x + d },
      { box: { x0: x - d - w, y0: y - h / 2, x1: x - d, y1: y + h / 2 }, anchor: "end", tx: x - d },
      { box: { x0: x - w / 2, y0: y - d - h, x1: x + w / 2, y1: y - d }, anchor: "middle", tx: x },
      { box: { x0: x - w / 2, y0: y + d, x1: x + w / 2, y1: y + d + h }, anchor: "middle", tx: x },
      { box: { x0: x + r, y0: y - d - h, x1: x + r + w, y1: y - d }, anchor: "start", tx: x + r },
      { box: { x0: x + r, y0: y + d, x1: x + r + w, y1: y + d + h }, anchor: "start", tx: x + r },
      { box: { x0: x - r - w, y0: y - d - h, x1: x - r, y1: y - d }, anchor: "end", tx: x - r },
      { box: { x0: x - r - w, y0: y + d, x1: x - r, y1: y + d + h }, anchor: "end", tx: x - r },
      { box: { x0: x + d, y0: y - far - h, x1: x + d + w, y1: y - far }, anchor: "start", tx: x + d },
      { box: { x0: x + d, y0: y + far, x1: x + d + w, y1: y + far + h }, anchor: "start", tx: x + d },
      { box: { x0: x - d - w, y0: y - far - h, x1: x - d, y1: y - far }, anchor: "end", tx: x - d },
      { box: { x0: x - d - w, y0: y + far, x1: x - d, y1: y + far + h }, anchor: "end", tx: x - d },
      // Further out, only usable with a leader line.
      { box: { x0: x - w / 2, y0: y - out - h, x1: x + w / 2, y1: y - out }, anchor: "middle", tx: x },
      { box: { x0: x - w / 2, y0: y + out, x1: x + w / 2, y1: y + out + h }, anchor: "middle", tx: x },
      { box: { x0: x + r, y0: y - out - h, x1: x + r + w, y1: y - out }, anchor: "start", tx: x + r },
      { box: { x0: x - r - w, y0: y + out, x1: x - r, y1: y + out + h }, anchor: "end", tx: x - r },
      { box: { x0: x - r - w, y0: y - out - h, x1: x - r, y1: y - out }, anchor: "end", tx: x - r },
      { box: { x0: x + r, y0: y + out, x1: x + r + w, y1: y + out + h }, anchor: "start", tx: x + r },
    ];
    let best: { box: Box; anchor: PlacedLabel["anchor"]; tx: number; offset: number } | undefined, bestScore = Infinity;
    candidates.forEach((candidate, order) => {
      const offset = nearestPointOnBox(x, y, candidate.box).distance;
      if (offset > leaderMaxOffset) return;
      if (!inside(candidate.box, bounds)) return;
      if (markerBoxes.some((box) => overlaps(candidate.box, box, 1))) return;
      if (placed.some((item) => overlaps(candidate.box, item.box))) return;
      if (offset > maxOffset) {
        // A leader must not run through a label that is already placed.
        const leader = leaderLine(x, y, r, candidate.box);
        if (leader && placed.some((item) => segmentHitsBox(leader, item.box, 0))) return;
      }
      const crossings = segments.filter((segment) => segmentHitsBox(segment, candidate.box)).length;
      const score = crossings * 100 + (offset > maxOffset ? 30 : 0) + order;
      if (score < bestScore) { bestScore = score; best = { ...candidate, offset }; }
    });
    if (best) {
      const chosen: { box: Box; anchor: PlacedLabel["anchor"]; tx: number; offset: number } = best;
      const leader = chosen.offset > maxOffset ? leaderLine(x, y, r, chosen.box) : undefined;
      placed.push({ id: label.id, x: chosen.tx, y: (chosen.box.y0 + chosen.box.y1) / 2, anchor: chosen.anchor, box: chosen.box, offset: chosen.offset, ...(leader ? { leader } : {}) });
    }
  }
  return placed;
}
/** Index of the value nearest to target, for snapping a crosshair to observed positions. */
export function nearestIndex(values: readonly number[], target: number): number {
  let best = -1, distance = Infinity;
  values.forEach((value, index) => { const next = Math.abs(value - target); if (next < distance) { distance = next; best = index; } });
  return best;
}
