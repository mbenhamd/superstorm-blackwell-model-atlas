import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { capacity } from "../../../domain/metrics.js";
import type { Deployment, SloPolicy } from "../../../domain/types.js";
import { updateView, useAppState } from "../../state.js";
import { num, workloadOf } from "../../lib/display.js";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProfileBadge } from "./performance.js";
import { budgetLabel, workloadProfile } from "./throughput-profile.js";

/** "×2.9" / "×0.22": two significant digits below 1, one decimal above. */
const ratioText = (ratio: number): string => `×${ratio >= 1 ? num(ratio, 1) : num(ratio, 2)}`;

/**
 * One tile per dataset this configuration was measured on (newest run per dataset): profile, dataset and run date,
 * sustainable tok/min/GPU, C_max and the token budget. The active dataset's tile is highlighted; selecting a tile
 * switches the dataset. "×n vs Balanced" divides two measured sustainable values of this configuration and appears
 * only when both exist. Hidden when the only measured dataset is the active one (the KPI strip already shows it).
 */
export function WorkloadProfileTiles({ configurationId, slo }: { configurationId: string; slo: SloPolicy }) {
  const state = useAppState();
  const order = new Map(state.snapshot.workloads.map((workload, index) => [workload.id, index]));
  const tiles = state.snapshot.deployments
    .filter((d) => d.configurationId === configurationId && d.evidence === "measured" && d.points.length > 0)
    .sort((a, b) => (order.get(a.workloadId) ?? 99) - (order.get(b.workloadId) ?? 99))
    .map((deployment) => {
      const workload = workloadOf(deployment.workloadId);
      return { deployment, workload, profile: workloadProfile(workload), capacity: capacity(deployment, slo) };
    });
  if (!tiles.length || (tiles.length === 1 && tiles[0]!.deployment.workloadId === state.workload)) return null;
  // Reference tile: the first Balanced dataset that is not tagged legacy, else any Balanced one.
  const balanced = tiles.find((tile) => tile.profile === "Balanced" && !tile.workload?.tags.includes("legacy")) ?? tiles.find((tile) => tile.profile === "Balanced");
  const reference = balanced?.capacity.sustainableTpmPerGpu ?? null;
  const pick = (d: Deployment) => updateView((s) => { s.workload = d.workloadId; });
  const note = "Ratios divide two measured sustainable values of this configuration under the active SLO. Datasets differ in prompt and output lengths, so a ratio describes workload sensitivity, not an engine or quantization effect.";
  // Compact strip: heading beside one row of two-line tiles at ≥1280px (above it on narrower screens), so the strip
  // stays about one tile high and the SLO evaluation still starts in the first viewport.
  return (
    <section className="bg-card shadow-panel min-w-0 space-y-2 rounded-lg border px-3 py-2.5 sm:px-4 xl:flex xl:items-center xl:gap-4 xl:space-y-0" aria-labelledby="profile-tiles-title" data-testid="profile-strip">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 xl:w-[168px] xl:shrink-0 xl:flex-col xl:items-start">
        <span className="inline-flex items-center gap-1">
          <h2 id="profile-tiles-title" className="text-[13px] leading-5 font-semibold"><span className="xl:sr-only">Sustainable throughput </span><span className="xl:capitalize">by</span> workload profile</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground inline-grid size-5 place-items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="About profile ratios"><Info className="size-3.5" aria-hidden="true" /></button>
            </TooltipTrigger>
            <TooltipContent className="max-w-72 text-pretty">{note}</TooltipContent>
          </Tooltip>
        </span>
        <span className="text-muted-foreground text-xs text-pretty">{tiles.length} measured dataset{tiles.length === 1 ? "" : "s"} · newest run each<span className="xl:hidden"> · select to switch the dataset</span></span>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] xl:flex-1" data-testid="profile-tiles">
        {tiles.map((tile) => {
          const d = tile.deployment, c = tile.capacity;
          const active = d.workloadId === state.workload;
          const ratio = balanced && tile !== balanced && reference !== null && c.sustainableTpmPerGpu !== null && reference > 0 ? c.sustainableTpmPerGpu / reference : null;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => pick(d)}
              aria-pressed={active}
              data-profile-tile={d.workloadId}
              data-active={active || undefined}
              className={cn(
                "flex min-w-0 flex-col gap-1 rounded-md border px-2.5 py-1.5 text-left transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-ring/60 bg-selection" : "hover:bg-muted/60",
              )}
            >
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                <ProfileBadge workload={tile.workload} plain />
                <span className="text-foreground min-w-0 font-mono text-xs [overflow-wrap:anywhere]" title={`${tile.workload?.name ?? d.workloadId} · ${d.measuredAt?.slice(0, 10) ?? "—"}`}>{tile.workload?.name ?? d.workloadId}</span>
                {tile.workload?.tags.includes("legacy") ? <Badge variant="warning">legacy</Badge> : null}
                {tile === balanced ? <Badge variant="neutral" className="ml-auto shrink-0" data-ratio="reference">Reference</Badge>
                  : ratio !== null ? <Badge variant="outline" className="ml-auto shrink-0 tabular-nums" data-ratio={ratio.toFixed(4)} title="This dataset's sustainable value ÷ the Balanced dataset's, both measured on this configuration">{ratioText(ratio)} vs Balanced</Badge> : null}
              </span>
              <span className="text-muted-foreground flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs tabular-nums">
                <span><span className={cn("text-[15px] font-semibold tracking-tight", c.sustainableTpmPerGpu === null ? "text-muted-foreground" : "text-foreground")}>{num(c.sustainableTpmPerGpu)}</span>{c.sustainableTpmPerGpu !== null ? " tok/min/GPU" : ""}</span>
                <span>C_max <span className="text-foreground font-medium">{num(c.highestPassingConcurrency)}</span></span>
                <span>{budgetLabel(tile.workload, (value) => num(value)) ?? "variable lengths"}</span>
                <span>{d.measuredAt?.slice(0, 10) ?? "—"}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
