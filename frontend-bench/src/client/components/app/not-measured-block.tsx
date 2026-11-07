import type * as React from "react";
import { Activity, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppState } from "../../state.js";
import { workloadOf } from "../../lib/display.js";
import { openExperimentForm } from "./overlays.js";
import { SloChips } from "./performance.js";

/**
 * One compact block in place of a whole group of empty charts: the dataset that has no run, what appears after
 * import, a "Plan run" action and the active SLO thresholds as chips. Charts render only once a series exists, so
 * empty axes never read as missing data.
 */
export function NotMeasuredBlock({ planFor, description, testId, className, children }: {
  /** Configuration id the "Plan run" action preselects; "" opens an empty plan. */
  planFor?: string;
  description: React.ReactNode;
  testId?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const state = useAppState();
  const workload = workloadOf(state.workload);
  return (
    <section
      role="status"
      data-testid={testId}
      className={cn("bg-card flex flex-col gap-3 rounded-lg border border-dashed px-4 py-3.5 sm:flex-row sm:items-center", className)}
    >
      <span className="bg-subtle text-ink-2 grid size-8 shrink-0 place-items-center rounded-lg border" aria-hidden="true"><Activity className="size-4" /></span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[13px] font-semibold">Not measured on <span className="font-mono font-medium">{workload?.name ?? state.workload}</span></p>
        <p className="text-muted-foreground text-xs text-pretty">{description}</p>
        <SloChips slo={state.slo} />
        {children}
      </div>
      {planFor !== undefined ? (
        <Button variant="outline" size="sm" className="self-start sm:self-center" onClick={() => openExperimentForm(planFor)} data-testid="plan-run">
          <Plus aria-hidden="true" />Plan run
        </Button>
      ) : null}
    </section>
  );
}
