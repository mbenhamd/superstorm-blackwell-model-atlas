import { relativeDelta, tieBand } from "./metrics.js";
import type { RankedDeployment } from "./types.js";

/*
 * Setup leaderboard for one model × hardware shape on one dataset and SLO: every configuration, its standing against
 * the best measured sustainable tok/min/GPU, and the ±band tie reading. Values come from `rank()`/`capacity()`; this
 * module only orders and compares them. A Δ exists only between two measured setups with a passing level.
 */

export type SetupSort = "sustainable" | "cmax" | "name";
export const SETUP_SORTS: readonly SetupSort[] = ["sustainable", "cmax", "name"];
/** Assumed single-run noise band (±3%): a policy, not a measured interval. */
export const SETUP_TIE_BAND = 0.03;

export type SetupStanding =
  /** Highest sustainable tok/min/GPU of the set. */
  | { kind: "best" }
  /** Within the tie band of the best; `fraction` is (value − best) ÷ best, `absolute` the tok/min/GPU difference. */
  | { kind: "tie"; fraction: number; absolute: number }
  | { kind: "behind"; fraction: number; absolute: number }
  /** Measured, but no tested level meets the SLO: no sustainable value, no Δ. */
  | { kind: "no-passing" }
  | { kind: "unmeasured" };

export interface SetupEntry<T extends RankedDeployment = RankedDeployment> {
  row: T;
  /** Competition rank (1, 2, 2, 4) by sustainable tok/min/GPU among setups with a value; null otherwise. */
  position: number | null;
  standing: SetupStanding;
}

/** A row carries measured levels (the client's `isMeasured`: evidence "measured" with at least one point). */
export const hasMeasuredLevels = (row: RankedDeployment): boolean => row.deployment.evidence === "measured" && row.deployment.points.length > 0;
const sustainable = (row: RankedDeployment): number | null => (hasMeasuredLevels(row) ? row.capacity.sustainableTpmPerGpu : null);
const cmax = (row: RankedDeployment): number | null => (hasMeasuredLevels(row) ? row.capacity.highestPassingConcurrency : null);
/** 0 = measured with a sustainable value, 1 = measured without a passing level, 2 = not measured. */
const tier = (row: RankedDeployment): number => (!hasMeasuredLevels(row) ? 2 : sustainable(row) === null ? 1 : 0);
const desc = (a: number | null, b: number | null): number => (b ?? -Infinity) - (a ?? -Infinity);

/** Δ of `value` against `best`: signed fraction, absolute difference and the tie reading; null unless both exist. */
export function deltaVsBest(value: number | null, best: number | null, band = SETUP_TIE_BAND): { fraction: number; absolute: number; tie: boolean } | null {
  const fraction = relativeDelta(value, best);
  const verdict = tieBand(value, best, band);
  if (fraction === null || verdict === null || value === null || best === null) return null;
  return { fraction, absolute: value - best, tie: verdict === "tie" };
}

/**
 * Standing of every row against the best sustainable tok/min/GPU in `rows`. The best is the first row with the highest
 * value (input order breaks exact ties); rows within ±band of it read "tie". Output order: sustainable descending,
 * then measured rows without a passing level, then unmeasured rows (input order within each tier).
 */
export function setupStandings<T extends RankedDeployment>(rows: readonly T[], band = SETUP_TIE_BAND): SetupEntry<T>[] {
  const ordered = rows.map((row, index) => ({ row, index })).sort((a, b) => tier(a.row) - tier(b.row) || desc(sustainable(a.row), sustainable(b.row)) || a.index - b.index).map((item) => item.row);
  const leader = ordered.find((row) => sustainable(row) !== null) ?? null;
  const best = leader ? sustainable(leader) : null;
  let previous: number | null = null, position = 0;
  return ordered.map((row, index): SetupEntry<T> => {
    const value = sustainable(row);
    if (value !== null && value !== previous) { position = index + 1; previous = value; }
    if (!hasMeasuredLevels(row)) return { row, position: null, standing: { kind: "unmeasured" } };
    if (value === null) return { row, position: null, standing: { kind: "no-passing" } };
    if (row === leader) return { row, position, standing: { kind: "best" } };
    const delta = deltaVsBest(value, best, band)!;
    return { row, position, standing: { kind: delta.tie ? "tie" : "behind", fraction: delta.fraction, absolute: delta.absolute } };
  });
}

/**
 * Display order of standings. Measured setups always precede unmeasured ones; within a tier "sustainable" orders by
 * sustainable tok/min/GPU, "cmax" by highest passing concurrency (then sustainable), "name" by `nameOf`. Stable.
 */
export function sortSetups<T extends RankedDeployment>(entries: readonly SetupEntry<T>[], sort: SetupSort, nameOf: (row: T) => string): SetupEntry<T>[] {
  return entries.map((entry, index) => ({ entry, index })).sort((a, b) => {
    const x = a.entry.row, y = b.entry.row;
    const byTier = tier(x) - tier(y);
    if (byTier) return byTier;
    const key = sort === "sustainable" ? desc(sustainable(x), sustainable(y))
      : sort === "cmax" ? desc(cmax(x), cmax(y)) || desc(sustainable(x), sustainable(y))
        : nameOf(x).localeCompare(nameOf(y), undefined, { numeric: true });
    return key || a.index - b.index;
  }).map((item) => item.entry);
}

/** Groups in order of first appearance (so a sorted list yields groups ordered by their leading member). */
export function groupSetups<T>(items: readonly T[], keyOf: (item: T) => string): { key: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item); else groups.set(key, [item]);
  }
  return [...groups].map(([key, members]) => ({ key, items: members }));
}
