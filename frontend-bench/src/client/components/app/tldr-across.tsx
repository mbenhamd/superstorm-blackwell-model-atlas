import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { setupStandings, type SetupEntry } from "../../../domain/setups.js";
import type { VariantRow } from "../../../domain/variants.js";
import { useAppState } from "../../state.js";
import { num } from "../../lib/display.js";
import { rowsFor, shapeKey, useVariantRowsByWorkload } from "./tldr-data.js";
import { catalogOrder, Missing, tpm } from "./tldr-parts.js";
import { ProfileBadge } from "./performance.js";

/*
 * The same setup on every dataset: its rank among this model × shape's setups there, its sustainable tok/min/GPU and
 * its Δ vs that dataset's best. A ranking holds for one dataset only, so this answers "is the winner here the winner
 * everywhere?" without leaving the sheet. A setup is the same variant (configuration, shape, recorded runtime_config);
 * a dataset where that exact variant has no run shows the configuration's best other variant, flagged "other runtime
 * config"; with no run of the configuration at all it reads "not run", never 0.
 */

/** Variant key of the same setup on another dataset (planning keys and variant keys both carry the dataset). */
export function keyOnDataset(key: string, dataset: string): string {
  if (key.startsWith("planning|")) return key.replace(/\|[^|]*$/, `|${dataset}`);
  try {
    const parts = JSON.parse(key) as unknown[];
    if (!Array.isArray(parts) || parts.length < 2) return key;
    parts[1] = dataset;
    return JSON.stringify(parts);
  } catch { return key; }
}

interface Cell { workloadId: string; entry: SetupEntry<VariantRow> | null; sibling: boolean; ranked: number }

export function AcrossWorkloads({ row, onPick }: { row: VariantRow; onPick: (workloadId: string, key: string) => void }) {
  const state = useAppState();
  const byWorkload = useVariantRowsByWorkload();
  const cells = React.useMemo((): Cell[] => {
    const shape = shapeKey(row.deployment);
    return state.snapshot.workloads.map((workload) => {
      const entries = setupStandings(rowsFor(byWorkload.get(workload.id), row.deployment.modelId, shape).sort(catalogOrder));
      const key = keyOnDataset(row.key, workload.id);
      const planningKey = `planning|${row.deployment.configurationId}|${workload.id}`;
      const exact = entries.find((item) => item.row.key === key) ?? entries.find((item) => item.row.key === planningKey) ?? null;
      // The exact runtime config never ran there, but the configuration did: show its best variant, flagged.
      const sibling = exact ? null : entries.find((item) => item.row.variant && item.row.deployment.configurationId === row.deployment.configurationId) ?? null;
      return { workloadId: workload.id, entry: exact ?? sibling, sibling: sibling !== null, ranked: entries.filter((item) => item.position !== null).length };
    });
  }, [byWorkload, row, state.snapshot.workloads]);
  const measured = cells.filter((cell) => cell.entry && tpm(cell.entry.row) !== null);
  if (!measured.length || state.snapshot.workloads.length < 2) return null;
  return (
    <section className="space-y-2" data-testid="setup-across">
      <h3 className="flex items-baseline justify-between gap-3 text-xs font-semibold">
        Across workloads<span className="text-muted-foreground font-normal">rank among this model's setups on each dataset</span>
      </h3>
      <ul className="divide-y rounded-lg border">
        {cells.map(({ workloadId, entry, sibling, ranked }) => {
          const workload = state.snapshot.workloads.find((item) => item.id === workloadId);
          const value = entry ? tpm(entry.row) : null;
          const active = workloadId === state.workload;
          const standing = entry?.standing;
          const body = (
            <>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-mono text-[12px]">{workloadId}</span>
                {sibling ? <span className="text-muted-foreground text-[11.5px]" title="This exact runtime config has no run on this dataset; the configuration's best other runtime config is shown" data-across-sibling="">other runtime config</span> : null}
                <ProfileBadge workload={workload} plain className="w-fit" />
              </span>
              <span className="text-muted-foreground text-xs tabular-nums" data-across-rank={entry?.position ?? ""}>
                {entry?.position ? `#${entry.position} of ${ranked}` : value === null && entry?.row.variant ? "no passing level" : "not run"}
              </span>
              <span className="text-right text-[13px] font-medium tabular-nums">{value === null ? <Missing label="Not measured" /> : num(value)}</span>
              <span className="flex justify-end">
                {standing?.kind === "best" ? <Badge variant="info">Best</Badge>
                  : standing?.kind === "tie" ? <Badge variant="neutral">tie</Badge>
                  : standing?.kind === "behind" ? <DeltaBadge delta={standing.fraction} variant="soft" />
                  : null}
              </span>
            </>
          );
          const grid = "grid grid-cols-[minmax(0,1fr)_auto_auto_3.75rem] items-center gap-x-3 px-3 py-2";
          return (
            <li key={workloadId} data-across-workload={workloadId} data-active={active || undefined} data-standing={standing?.kind ?? "none"}>
              {active || !entry ? (
                <div className={cn(grid, active && "bg-subtle")} aria-current={active ? "true" : undefined}>{body}</div>
              ) : (
                <button type="button" className={cn(grid, "hover:bg-subtle w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring")} onClick={() => onPick(workloadId, entry.row.key)} aria-label={`Rank setups on ${workloadId}`}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
