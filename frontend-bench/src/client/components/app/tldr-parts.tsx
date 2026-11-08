import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { hasMeasuredLevels, setupStandings, SETUP_TIE_BAND, type SetupEntry, type SetupStanding } from "../../../domain/setups.js";
import type { VariantRow } from "../../../domain/variants.js";
import type { RankedDeployment } from "../../../domain/types.js";
import { num } from "../../lib/display.js";
import { artifact } from "../../lib/atlas.js";
import { rowsFor, setupName, useVariantRowsByWorkload } from "./tldr-data.js";

/*
 * Pieces the TL;DR sections share: standings of one model × shape on one dataset (variant rows), the data bar, the
 * Δ vs best cell and the tie wording. Ranking and Δ come from domain/setups.ts; nothing here computes a metric.
 */

const BAND = num(SETUP_TIE_BAND * 100);
export const TIE_NOTE = `|Δ| ≤ ${BAND}% reads as a tie: assumed single-run noise (unverified policy), not a measured interval.`;
/** Signed percentage with a real minus sign, one decimal: "−3.8%", "+0.0%". */
export const signedPercent = (fraction: number) => `${fraction < 0 ? "−" : "+"}${num(Math.abs(fraction) * 100, 1)}%`;
const signedTpm = (value: number) => `${value < 0 ? "−" : "+"}${num(Math.abs(value))}`;
export const tpm = (row: RankedDeployment): number | null => (hasMeasuredLevels(row) ? row.capacity.sustainableTpmPerGpu : null);
export const cmax = (row: RankedDeployment): number | null => (hasMeasuredLevels(row) ? row.capacity.highestPassingConcurrency : null);
export const dateOf = (iso: string | null): string | null => (iso ? iso.slice(0, 10) : null);

const precisionOrder = ["BF16", "FP8", "FP4/FP8", "MXFP4", "NVFP4"];
/** Catalog order inside a model: precision class, export, engine, GPUs, knob, then variant key. Unmeasured rows keep it. */
export function catalogOrder(a: VariantRow, b: VariantRow): number {
  const index = (row: RankedDeployment) => precisionOrder.indexOf(artifact(row.deployment.artifactId)?.precision ?? row.deployment.precision);
  return index(a) - index(b)
    || a.deployment.artifactId.localeCompare(b.deployment.artifactId)
    || a.deployment.runtime.localeCompare(b.deployment.runtime)
    || a.deployment.gpus - b.deployment.gpus
    || (a.deployment.knob ?? "").localeCompare(b.deployment.knob ?? "")
    || a.key.localeCompare(b.key);
}

/**
 * Standings of every setup (measured variant or planning row) of one model × shape on one dataset. Δ is always
 * against the best of this whole set: ladder filters hide rows, they never re-elect the best.
 */
export function useSetupEntries(modelId: string, shapeFilter: string, workloadId: string): { rows: VariantRow[]; entries: SetupEntry<VariantRow>[] } {
  const byWorkload = useVariantRowsByWorkload();
  return React.useMemo(() => {
    const rows = rowsFor(byWorkload.get(workloadId), modelId, shapeFilter).sort(catalogOrder);
    return { rows, entries: setupStandings(rows) };
  }, [byWorkload, workloadId, modelId, shapeFilter]);
}

export const Missing = ({ label }: { label?: string }) => <span className="text-muted-foreground" data-missing="true" aria-label={label}>—</span>;

/** Horizontal data bar scaled to `max`; best in accent, others neutral; a missing value is a dashed empty track. */
export function Bar({ value, max, best, className }: { value: number | null; max: number | null; best: boolean; className?: string }) {
  if (value === null || !max) return <span className={cn("block h-1.5 rounded-full border border-dashed border-border-strong", className)} data-bar="empty" aria-hidden="true" />;
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <span className={cn("bg-muted block h-1.5 overflow-hidden rounded-full", className)} data-bar={best ? "best" : "other"} aria-hidden="true">
      <span className={cn("block h-full rounded-full", best ? "bg-brand" : "bg-chart-neutral")} style={{ width: `${ratio * 100}%` }} />
    </span>
  );
}

/**
 * Δ vs best: "Best", "tie" (with the signed %), a signed % (dashboardcn delta badge, neutral ink: being behind the best is
 * not a failure state), "No passing level" or "Not measured". Absolute Δ and the best setup in the tooltip.
 */
export function StandingCell({ standing, leader, leaderName, compact = false, plain = false }: { standing: SetupStanding; leader: RankedDeployment | null; leaderName?: string; compact?: boolean; plain?: boolean }) {
  if (standing.kind === "best") return <Badge variant="outline" data-delta="best" title="Highest sustainable tok/min/GPU of these setups">Best</Badge>;
  if (standing.kind === "unmeasured") return <Badge variant="neutral" className="border-dashed" data-delta="unmeasured" data-testid="setup-not-measured">Not measured</Badge>;
  if (standing.kind === "no-passing") return <Badge variant="critical" data-delta="no-passing" title="Measured, but no tested load level meets the SLO: no sustainable value and no Δ">No passing level</Badge>;
  const tie = standing.kind === "tie";
  const cell = (
    <span tabIndex={plain ? undefined : 0} className="inline-flex cursor-default items-center gap-1.5 rounded-sm whitespace-nowrap tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring" data-delta={tie ? "tie" : "behind"} data-fraction={standing.fraction.toFixed(4)}>
      {tie ? <Badge variant="neutral" data-testid="tie-badge">tie</Badge> : null}
      <DeltaBadge delta={standing.fraction} variant="text" showIcon={false} className={tie ? "text-muted-foreground font-normal" : "text-foreground text-[13px]"}>{signedPercent(standing.fraction)}</DeltaBadge>
      {compact ? null : <span className="sr-only"> vs best</span>}
    </span>
  );
  // Inside an interactive row (ranked list) the cell is plain text: no nested focus stop, the row's label carries Δ.
  if (plain) return cell;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{cell}</TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">
        <span className="block font-medium tabular-nums">{signedTpm(standing.absolute)} tok/min/GPU ({signedPercent(standing.fraction)}) vs best</span>
        {leader ? <span className="text-background/80 block">Best: {leaderName ?? setupName(leader.deployment)}</span> : null}
        {tie ? <span className="text-background/80 mt-1 block">{TIE_NOTE}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

/** Scroll a ladder row into view and focus its evidence trigger (reduced motion: no smooth scroll). */
export function jumpToVariant(key: string): void {
  const row = [...document.querySelectorAll<HTMLElement>("[data-variant-key]")].find((element) => element.dataset.variantKey === key);
  if (!row) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  row.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  row.querySelector<HTMLElement>('[data-action="open-run"]')?.focus({ preventScroll: true });
}

export type { SetupEntry };
