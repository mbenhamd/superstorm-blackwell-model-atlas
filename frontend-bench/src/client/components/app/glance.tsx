import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";
import { ActivityRingsCard, type ActivityRingsMetric } from "@/components/blocks/activity-rings-card";
import type { Capacity, SloPolicy } from "../../../domain/types.js";
import { num } from "../../lib/display.js";

/*
 * Glanceable encodings shared across pages (dashboardcn sparkline and activity rings). Neither shows a trend over
 * time: the data has no time series.
 *  - LoadCurve: one measured sweep as a sparkline, x = tested concurrency levels in ascending order (spaced as
 *    tested, like the main chart's categorical axis), y = total tok/s per GPU. Text equivalent in its label.
 *  - SloBudgetCard: SLO budget used at C_max, one ring per latency gate (p95 ÷ ceiling; a full ring is the limit).
 */

/** A sweep's points as [concurrency, value] in ascending concurrency; `per` divides the value (e.g. GPUs). */
export function curveOf(points: readonly { concurrency: number; value: number | null }[]): { concurrency: number; value: number }[] {
  return points.filter((point): point is { concurrency: number; value: number } => point.value !== null && Number.isFinite(point.value))
    .sort((a, b) => a.concurrency - b.concurrency);
}

/**
 * Sparkline of a concurrency ladder. Fewer than two levels draw nothing ("—"): one point is not a curve.
 * `highlight` draws it in the brand color (the best setup); others are neutral.
 */
export function LoadCurve({ points, unit, cmax, highlight = false, className, testId }: {
  points: readonly { concurrency: number; value: number | null }[]; unit: string; cmax?: number | null; highlight?: boolean; className?: string; testId?: string;
}) {
  const curve = curveOf(points);
  if (curve.length < 2) return <span className="text-muted-foreground text-xs" data-load-curve="0" aria-label="No load curve: fewer than two tested levels">—</span>;
  const label = `${unit} by tested concurrency: ${curve.map((point) => `${num(point.concurrency)} → ${num(point.value)}`).join(", ")}${cmax ? `; C_max ${num(cmax)}` : ""}`;
  return (
    <span role="img" aria-label={label} title={label} className={cn("inline-block h-6 w-20 align-middle", className)} data-load-curve={curve.length} data-testid={testId}>
      <Sparkline data={curve.map((point) => point.value)} variant="line" curve="monotone" strokeWidth={1.5} animate={false} color={highlight ? "var(--brand)" : "var(--chart-neutral)"} className="h-full w-full" />
    </span>
  );
}

/** Total tok/s per GPU at each tested level of a measured sweep. */
export const totalPerGpuCurve = (capacity: Capacity, gpus: number) =>
  capacity.points.map((point) => ({ concurrency: point.concurrency, value: gpus > 0 ? point.totalTps / gpus : null }));

/**
 * SLO budget used at C_max: ITL p95 ÷ ITL ceiling and TTFT p95 ÷ TTFT ceiling, as concentric rings (a full ring is the
 * limit; a passing level never exceeds it). Rendered only when C_max exists and both values and ceilings are recorded.
 */
export function SloBudgetCard({ capacity, slo, className, layout = "side", size = 132 }: { capacity: Capacity; slo: SloPolicy; className?: string; layout?: "side" | "stacked"; size?: number }) {
  const point = capacity.selectedPoint;
  if (!point || capacity.highestPassingConcurrency === null) return null;
  const metrics: ActivityRingsMetric[] = [];
  if (point.itlP95Ms !== null) metrics.push({ label: "ITL p95", value: point.itlP95Ms, max: slo.itlP95Ms, display: `${num(point.itlP95Ms, 1)} of ${num(slo.itlP95Ms)} ms`, color: "var(--chart-1)" });
  if (point.ttftP95Ms !== null && point.ttftCeilingMs !== null) metrics.push({ label: "TTFT p95", value: point.ttftP95Ms, max: point.ttftCeilingMs, display: `${num(point.ttftP95Ms)} of ${num(point.ttftCeilingMs)} ms`, color: "var(--chart-3)" });
  if (!metrics.length) return null;
  return (
    <ActivityRingsCard
      title="SLO budget used at C_max"
      caption={`C_max ${num(capacity.highestPassingConcurrency)} · full ring = at the limit`}
      metrics={metrics}
      layout={layout}
      size={size}
      thickness={12}
      center={<span className="flex flex-col leading-tight"><span className="text-muted-foreground text-[11px]">C_max</span><span className="text-base font-semibold tabular-nums">{num(capacity.highestPassingConcurrency)}</span></span>}
      className={cn("shadow-none", className)}
      data-testid="slo-budget"
    />
  );
}
