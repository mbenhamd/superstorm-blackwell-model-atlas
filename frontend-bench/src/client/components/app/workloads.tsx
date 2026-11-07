import { Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DistributionBar } from "@/components/ui/distribution-bar";
import type { Workload } from "../../../domain/types.js";
import { update, updateView, useAppState } from "../../state.js";
import { num } from "../../lib/display.js";
import { WorkloadTags } from "./performance.js";

export const openWorkloads = () => update((s) => { s.workloadsOpen = true; });

/** Info button beside the workload picker; opens the workload reference. */
export function WorkloadInfoButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="About workloads" data-testid="workloads-info" onClick={openWorkloads}>
          <Info aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>About workloads</TooltipContent>
    </Tooltip>
  );
}

/** Per-turn input/output token budget and its input/output share (input dark, output light). */
function TokenBudget({ workload }: { workload: Workload }) {
  if (workload.inputTokens === null || workload.outputTokens === null) return <p className="text-muted-foreground text-xs">Variable lengths</p>;
  const { inputTokens: input, outputTokens: output } = workload;
  return (
    <div className="space-y-1.5" data-testid="workload-budget">
      <div className="font-mono text-[12.5px] tabular-nums">{num(input)} in / {num(output)} out{workload.turns > 1 ? ` · ${workload.turns} turns` : ""}</div>
      <DistributionBar showLegend={false} valueFormatter={(value) => num(value)}
        segments={[{ name: "Input", value: input, color: "var(--chart-1)" }, { name: "Output", value: output, color: "color-mix(in oklab, var(--chart-1) 35%, transparent)" }]} />
    </div>
  );
}

export function WorkloadsDialog() {
  const state = useAppState();
  const close = () => update((s) => { s.workloadsOpen = false; });
  return (
    <Dialog open={state.workloadsOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-h-[min(780px,calc(100dvh-2rem))] overflow-y-auto sm:max-w-[860px]" data-testid="workloads-dialog">
        <DialogHeader>
          <DialogTitle>Workloads — what each dataset measures</DialogTitle>
          <DialogDescription>Budgets per turn; bar = input (dark) / output (light) share. Runs on different datasets are never ranked together.</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.snapshot.workloads.map((workload) => {
            const active = workload.id === state.workload;
            const measured = state.snapshot.deployments.filter((d) => d.workloadId === workload.id && d.evidence === "measured").length;
            return (
              <li key={workload.id} data-workload-card={workload.id} className={cn("bg-card flex flex-col gap-3 rounded-lg border p-4", active && "border-link/50 ring-link/15 ring-2", workload.tags.includes("legacy") && "bg-subtle")}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 truncate font-mono text-[13px] font-medium">{workload.name}</h3>
                  {active
                    ? <span className="text-link inline-flex h-7 shrink-0 items-center gap-1 text-xs font-medium"><Check className="size-3.5" aria-hidden="true" />Active</span>
                    : <Button variant="outline" size="sm" className="shrink-0" onClick={() => { updateView((s) => { s.workload = workload.id; s.selected = []; s.workloadsOpen = false; }); }}>Use</Button>}
                </div>
                <WorkloadTags tags={workload.tags} />
                <TokenBudget workload={workload} />
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="neutral">×{workload.multiplier}</Badge>
                  {workload.sharedPrefixes ? <Badge variant="neutral">{workload.sharedPrefixes}</Badge> : null}
                  {workload.conversations !== null ? <Badge variant="neutral">{num(workload.conversations)} conversations</Badge> : null}
                  {measured ? <Badge variant="good">{measured} imported run{measured === 1 ? "" : "s"}</Badge> : null}
                </div>
                <p className="text-ink-2 text-[12.5px]">{workload.description}</p>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground flex flex-wrap justify-between gap-2 text-xs"><span>Budgets are per turn: input → output.</span><span><kbd className="bg-muted rounded border px-1 font-mono text-[11px]">Esc</kbd> closes</span></p>
      </DialogContent>
    </Dialog>
  );
}
