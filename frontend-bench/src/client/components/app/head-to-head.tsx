import * as React from "react";
import { cn } from "@/lib/utils";
import { DualMetricCard } from "@/components/blocks/dual-metric-card";
import type { Capacity, Deployment } from "../../../domain/types.js";
import { appState, useAppState } from "../../state.js";
import { isMeasured, num } from "../../lib/display.js";

/** Built-in head-to-head metrics. Latency rows show the share of their SLO ceiling; the others compare the series. */
export type HeadToHeadMetricId = "sustainable" | "cmax" | "itl-p50" | "itl-p95" | "ttft-p95" | "per-user";

/** One card: a value per series, read from that series' capacity at its own C_max on the active dataset and SLO. */
export interface HeadToHeadMetric {
  id: string;
  title: string;
  read: (c: Capacity) => number | null;
  unit: string;
  digits: number;
  /** When set, bars show value ÷ ceiling (share of the SLO ceiling); otherwise value ÷ the largest value shown. */
  ceiling?: (c: Capacity) => number | null;
  /** "At C_max" fact under each measured series; unmeasured series show none. */
  detail?: (c: Capacity, d: Deployment) => React.ReactNode;
}

const ttftCeiling = (c: Capacity) => c.selectedPoint?.ttftCeilingMs ?? null;

/** Definitions of the built-in metrics; SLO values are read from the current app state when the card renders. */
export function headToHeadMetric(id: HeadToHeadMetricId): HeadToHeadMetric {
  const slo = appState.slo;
  switch (id) {
    case "sustainable":
      return { id, title: "Sustainable throughput", read: (c) => c.sustainableTpmPerGpu, unit: "tok/min/GPU", digits: 0, detail: (c) => c.observedTotalTpsPerGpu === null ? "—" : `${num(c.observedTotalTpsPerGpu)} tok/s/GPU observed · ×${slo.margin}` };
    case "cmax":
      return { id, title: "C_max", read: (c) => c.highestPassingConcurrency, unit: "concurrent", digits: 0, detail: (c) => c.totalLevels ? `${c.passingLevels} of ${c.totalLevels} levels in SLO` : "—" };
    case "itl-p50":
      return { id, title: "ITL p50 at C_max", read: (c) => c.selectedPoint?.itlP50Ms ?? null, unit: "ms", digits: 1, ceiling: () => slo.itlP95Ms, detail: () => `ITL p95 ceiling ${num(slo.itlP95Ms)} ms` };
    case "itl-p95":
      return { id, title: "ITL p95 at C_max", read: (c) => c.selectedPoint?.itlP95Ms ?? null, unit: "ms", digits: 1, ceiling: () => slo.itlP95Ms, detail: () => `Ceiling ${num(slo.itlP95Ms)} ms` };
    case "ttft-p95":
      return { id, title: "TTFT p95 at C_max", read: (c) => c.selectedPoint?.ttftP95Ms ?? null, unit: "ms", digits: 0, ceiling: ttftCeiling, detail: (c) => ttftCeiling(c) === null ? "Ceiling per level" : `Ceiling ${num(ttftCeiling(c))} ms` };
    case "per-user":
      return { id, title: "Per-user output at C_max", read: (c) => c.selectedPoint?.outputTpsPerUser ?? null, unit: "tok/s", digits: 1, detail: (c) => c.highestPassingConcurrency === null ? "—" : `${num(c.highestPassingConcurrency)} concurrent` };
  }
}

export const ENGINE_HEAD_TO_HEAD: HeadToHeadMetricId[] = ["sustainable", "cmax", "itl-p50", "ttft-p95"];

export interface HeadToHeadProps {
  /** 2–4 series in selection order; series i uses var(--chart-{i+1}). */
  deployments: Deployment[];
  /** Capacity of each deployment, same order and length as `deployments`. */
  capacities: Capacity[];
  /** Cards in order; built-in ids or custom definitions. Defaults to the engine set (sustainable, C_max, ITL p50, TTFT p95). */
  metrics?: (HeadToHeadMetricId | HeadToHeadMetric)[];
  /** Series label; defaults to the engine name (`deployment.runtime`). Unmeasured series get " · not measured". */
  label?: (deployment: Deployment, index: number) => string;
  /** Grid classes; defaults to two cards per row from md. */
  className?: string;
  "data-testid"?: string;
}

/**
 * Head-to-head cards: per metric, one value and bar per series at its own C_max on the active dataset and SLO.
 * Values stay "—" (dashed track) until a run is imported; bars compare the series (throughput, C_max) or show the
 * share of the SLO ceiling (latency).
 */
export function HeadToHead({ deployments, capacities, metrics = ENGINE_HEAD_TO_HEAD, label = (d) => d.runtime, className, "data-testid": testId = "engine-head-to-head" }: HeadToHeadProps) {
  useAppState(); // re-render on SLO / workload changes
  const cards = metrics.map((metric) => (typeof metric === "string" ? headToHeadMetric(metric) : metric));
  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)} data-testid={testId}>
      {cards.map((card) => {
        const values = capacities.map((c) => card.read(c));
        const top = Math.max(0, ...values.map((value) => value ?? 0));
        const progress = (c: Capacity, value: number | null) => {
          if (value === null) return 0;
          const ceiling = card.ceiling?.(c);
          return card.ceiling ? (ceiling ? (value / ceiling) * 100 : 0) : top ? (value / top) * 100 : 0;
        };
        return (
          <DualMetricCard
            key={card.id}
            title={card.title}
            data-metric={card.title}
            segments={24}
            metrics={deployments.map((d, index) => {
              const c = capacities[index]!, value = values[index] ?? null;
              const name = label(d, index);
              return {
                label: isMeasured(d) ? name : `${name} · not measured`, value, unit: card.unit, maximumFractionDigits: card.digits, compactFrom: Number.POSITIVE_INFINITY, meter: "bar" as const, showShare: false,
                progress: progress(c, value), color: `var(--chart-${index + 1})`,
                detail: card.detail && isMeasured(d) ? { label: "At C_max", value: card.detail(c, d) } : undefined,
              };
            })}
          />
        );
      })}
    </div>
  );
}
