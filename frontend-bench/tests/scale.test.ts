import { describe, expect, test } from "bun:test";
import { leaderLine, logTicks, nearestIndex, nearestPointOnBox, niceDomain, niceStep, placeLabels, segmentHitsBox, type Box } from "../src/client/scale.js";

describe("chart scales", () => {
  test("nice steps come from the 1 / 2 / 2.5 / 5 family", () => {
    expect(niceStep(2000, 5)).toBe(500);
    expect(niceStep(21, 5)).toBe(5);
    expect(niceStep(9, 4)).toBe(2.5);
    expect(niceStep(0)).toBe(1);
  });
  test("domains expand outward to whole steps", () => {
    expect(niceDomain(0, 1989)).toEqual({ min: 0, max: 2000, step: 500, ticks: [0, 500, 1000, 1500, 2000] });
    expect(niceDomain(56.4, 77.4)).toEqual({ min: 55, max: 80, step: 5, ticks: [55, 60, 65, 70, 75, 80] });
  });
  test("degenerate domains still produce a range", () => {
    const domain = niceDomain(70, 70);
    expect(domain.min).toBeLessThan(70);
    expect(domain.max).toBeGreaterThan(70);
  });
  test("log ticks bracket the data with 1-2-5 values", () => {
    expect(logTicks(420, 1989)).toEqual([200, 500, 1000, 2000]);
  });
  test("nearest index snaps to observed positions", () => {
    expect(nearestIndex([1, 2, 4, 8], 5.5)).toBe(2);
    expect(nearestIndex([], 3)).toBe(-1);
  });
});

describe("label placement", () => {
  const bounds: Box = { x0: 0, y0: 0, x1: 400, y1: 300 };
  test("labels never overlap one another or markers", () => {
    const markers = [{ x: 100, y: 100, r: 5 }, { x: 108, y: 104, r: 5 }, { x: 116, y: 98, r: 5 }];
    const labels = markers.map((marker, index) => ({ id: String(index), ...marker, width: 70, height: 14, priority: 3 - index }));
    const placed = placeLabels(labels, markers, bounds);
    for (const a of placed) {
      for (const b of placed) if (a !== b) expect(a.box.x1 <= b.box.x0 || b.box.x1 <= a.box.x0 || a.box.y1 <= b.box.y0 || b.box.y1 <= a.box.y0).toBe(true);
      for (const m of markers) expect(a.box.x1 <= m.x - m.r || a.box.x0 >= m.x + m.r || a.box.y1 <= m.y - m.r || a.box.y0 >= m.y + m.r).toBe(true);
    }
  });
  test("labels stay inside the plot and flip at the right edge", () => {
    const placed = placeLabels([{ id: "edge", x: 395, y: 150, r: 5, width: 80, height: 14, priority: 1 }], [{ x: 395, y: 150, r: 5 }], bounds);
    expect(placed[0]?.anchor).toBe("end");
    expect(placed[0]!.box.x1).toBeLessThanOrEqual(400);
  });
  test("labels that fit nowhere are omitted rather than clipped", () => {
    const tight: Box = { x0: 0, y0: 0, x1: 20, y1: 20 };
    expect(placeLabels([{ id: "x", x: 10, y: 10, r: 4, width: 90, height: 14, priority: 1 }], [], tight)).toEqual([]);
  });
});

test("placeLabels avoids a polyline when a clear position exists", () => {
  const bounds = { x0: 0, y0: 0, x1: 400, y1: 300 };
  // A horizontal line running through the point: right and left positions would sit on it.
  const segments = [{ x0: 0, y0: 150, x1: 400, y1: 150 }];
  const [label] = placeLabels([{ id: "a", x: 200, y: 150, r: 4, width: 60, height: 14, priority: 1 }], [], bounds, 5, segments);
  expect(label).toBeDefined();
  expect(segmentHitsBox(segments[0]!, label!.box)).toBe(false);
});

test("segmentHitsBox detects crossings and misses", () => {
  const box = { x0: 10, y0: 10, x1: 20, y1: 20 };
  expect(segmentHitsBox({ x0: 0, y0: 0, x1: 30, y1: 30 }, box)).toBe(true);
  expect(segmentHitsBox({ x0: 0, y0: 40, x1: 30, y1: 40 }, box)).toBe(false);
});

describe("label displacement", () => {
  const bounds = { x0: 0, y0: 0, x1: 400, y1: 300 };
  test("a free label sits next to its marker without a leader", () => {
    const [label] = placeLabels([{ id: "a", x: 200, y: 150, r: 6, width: 60, height: 14, priority: 1 }], [{ x: 200, y: 150, r: 6 }], bounds, 5);
    expect(label).toBeDefined();
    expect(label!.offset).toBeLessThanOrEqual(24);
    expect(label!.leader).toBeUndefined();
  });
  test("labels pushed beyond the cap carry a leader and never exceed the hard limit", () => {
    // Unlabelled neighbours block every position next to the marker; only the outer ring is free.
    const target = { x: 200, y: 150, r: 6 };
    const markers = [target, ...[[240, 150], [160, 150], [200, 132], [200, 168], [240, 132], [160, 132], [240, 168], [160, 168]].map(([x, y]) => ({ x: x!, y: y!, r: 6 }))];
    const placed = placeLabels([{ id: "0", ...target, width: 60, height: 14, priority: 1 }], markers, bounds, 5, [], { maxOffset: 24 });
    expect(placed).toHaveLength(1);
    expect(placed.some((label) => label.offset > 24)).toBe(true);
    for (const label of placed) {
      expect(label.offset).toBeLessThanOrEqual(48);
      if (label.offset > 24) {
        expect(label.leader).toBeDefined();
        const marker = markers[Number(label.id)]!;
        // The leader starts on the marker edge and ends at the label box.
        expect(Math.hypot(label.leader!.x0 - marker.x, label.leader!.y0 - marker.y)).toBeCloseTo(marker.r, 5);
        const end = nearestPointOnBox(label.leader!.x1, label.leader!.y1, label.box);
        expect(end.distance).toBeLessThanOrEqual(2.01);
      } else {
        expect(label.leader).toBeUndefined();
      }
    }
  });
  test("leaderLine is omitted when the label touches the marker", () => {
    expect(leaderLine(0, 0, 6, { x0: 7, y0: -5, x1: 50, y1: 5 })).toBeUndefined();
    expect(leaderLine(0, 0, 6, { x0: 30, y0: -5, x1: 80, y1: 5 })).toEqual({ x0: 6, y0: 0, x1: 28, y1: 0 });
  });
});
