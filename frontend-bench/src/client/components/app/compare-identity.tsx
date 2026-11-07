import * as React from "react";
import { cn } from "@/lib/utils";
import type { Capacity, Deployment } from "../../../domain/types.js";
import { openRun } from "./overlays.js";
import { LevelsBadge, SeriesSwatch } from "./primitives.js";
import { IncompleteBadge, SloVerdictBadge } from "./performance.js";
import { StatusBadge } from "./status-badge.js";
import { headToHeadMetric, type HeadToHeadMetric, type HeadToHeadMetricId } from "./head-to-head.js";
import { configLabel, configName, engineBuildDetail, hardwareShape, isMeasured, modelOf, num, recheckNote, shape } from "../../lib/display.js";
import { artifact } from "../../lib/atlas.js";

/**
 * Shortest series labels that still tell the compared configurations apart: the identity parts shared by every
 * configuration are dropped (two engines of one export read "vLLM" / "SGLang"). Falls back to the full label.
 */
export function distinctLabels(deployments: Deployment[]): string[] {
  const parts = (d: Deployment) => [modelOf(d)?.name ?? d.modelId, d.exportLabel, d.runtime, shape(d), d.knob ?? ""];
  const all = deployments.map(parts);
  const varies = all[0]?.map((_, i) => new Set(all.map((row) => row[i])).size > 1) ?? [];
  return deployments.map((d, index) => {
    const kept = all[index]!.filter((part, i) => varies[i] && part);
    return kept.length ? kept.join(" · ") : deployments.length > 1 ? configLabel(d) : configName(d);
  });
}

/** Compare cards: sustainable capacity, C_max with per-user speed, then both latency gates at C_max. */
export function compareHeadToHeadMetrics(): (HeadToHeadMetricId | HeadToHeadMetric)[] {
  return [
    "sustainable",
    { ...headToHeadMetric("cmax"), detail: (c: Capacity) => c.selectedPoint?.outputTpsPerUser == null ? "—" : `${num(c.selectedPoint.outputTpsPerUser, 1)} tok/s per user · p50` },
    "ttft-p95",
    "itl-p95",
  ];
}

/**
 * Chip tooltip: configured engine build, run tag, hardware and weights. The latest release recheck sits on its own
 * line below a rule and is never presented as the build.
 */
export function CompareBuildSummary({ deployment: d }: { deployment: Deployment }) {
  const bytes = artifact(d.artifactId)?.weightBytes ?? null;
  const recheck = recheckNote(d);
  const rows: [string, React.ReactNode][] = [
    ["Engine build", engineBuildDetail(d)],
    ...(d.runtimeTag ? [["Run tag", <code key="tag" className="font-mono text-[11px]">{d.runtimeTag}</code>] as [string, React.ReactNode]] : []),
    ["Hardware", `${hardwareShape(d)} · ${shape(d)}`],
    ["Weights", bytes ? `${num(bytes / 1e9, 1)} GB` : "—"],
  ];
  return (
    <span className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-left" data-testid="compare-build-summary">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <span className="text-background/70">{label}</span>
          <span className="font-medium tabular-nums">{value}</span>
        </React.Fragment>
      ))}
      {recheck ? <span className="border-background/20 text-background/80 col-span-2 mt-1.5 border-t pt-1.5" data-recheck={d.recheck?.engineRelease}>{recheck}</span> : null}
      <span className="text-background/70 col-span-2 mt-1.5">Open for the evidence sheet</span>
    </span>
  );
}

/** Verdict point for the run: the C_max level when one passes, otherwise the lowest measured level (which fails). */
const verdictPoint = (c: Capacity) => c.selectedPoint ?? c.points[0] ?? null;

/**
 * Thin identity rows: swatch, configuration, SLO verdict and sustainable tok/min/GPU. A row opens the evidence
 * sheet. Per-row status badges appear only when at least one compared configuration is measured; otherwise the
 * panel's single "Not measured" badge carries the state.
 */
export function CompareIdentityList({ deployments, capacities }: { deployments: Deployment[]; capacities: Capacity[] }) {
  const anyMeasured = deployments.some(isMeasured);
  return (
    <div className="flex flex-col divide-y" data-testid="compare-identity">
      {deployments.map((d, index) => {
        const c = capacities[index]!;
        const sustainable = c.sustainableTpmPerGpu;
        return (
          <div
            key={d.id}
            role="button"
            tabIndex={0}
            data-compare-row={d.id}
            data-measured={isMeasured(d) ? "true" : undefined}
            onClick={() => openRun(d.id)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openRun(d.id); }
            }}
            className="hover:bg-muted/60 -mx-2 flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md px-2 py-2.5 text-[13px] transition-colors duration-150"
          >
            <span className="flex min-w-0 flex-1 basis-56 items-center gap-2.5">
              <SeriesSwatch index={index} />
              <span className="flex min-w-0 flex-col">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{configName(d)}</span>
                  <StatusBadge deployment={d} />
                </span>
                <span className="text-muted-foreground truncate text-xs">{[d.runtime, shape(d), d.knob].filter(Boolean).join(" · ")}</span>
              </span>
            </span>
            {anyMeasured ? (
              <span className="flex items-center gap-2">
                {c.totalLevels ? <SloVerdictBadge point={verdictPoint(c)} /> : null}
                <LevelsBadge capacity={c} />
                <IncompleteBadge count={c.incomplete} />
              </span>
            ) : null}
            <span className={cn("ml-auto min-w-24 text-right font-semibold tabular-nums", sustainable === null && "text-muted-foreground font-normal")} data-cell="sustainable">
              {sustainable === null ? "—" : <>{num(sustainable)}<span className="text-muted-foreground ml-1 text-xs font-normal">tok/min/GPU</span></>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
