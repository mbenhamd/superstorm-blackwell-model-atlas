import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { hasMeasuredLevels, setupStandings, type SetupEntry } from "../../../domain/setups.js";
import type { VariantRow } from "../../../domain/variants.js";
import { useAppState } from "../../state.js";
import { num } from "../../lib/display.js";
import { rowsFor, shapeLabel, useVariantRowsByWorkload } from "./tldr-data.js";
import { catalogOrder, Missing, StandingCell, tpm } from "./tldr-parts.js";
import { ProfileBadge } from "./performance.js";

/*
 * The same setup on every dataset: its rank among this model × shape's setups there, its sustainable tok/min/GPU and
 * its Δ vs that dataset's best. A ranking holds for one dataset only, so this answers "is the winner here the winner
 * everywhere?" without leaving the sheet. Ranks use the TL;DR's applied GPU-shape filter, so the active dataset's row
 * always matches the sheet header. A setup is the same variant (configuration, shape, recorded runtime_config). Where
 * that exact variant has no run but the configuration does, the row says so ("not run with this runtime config"),
 * shows no rank, value or standing of its own, and offers the measured variant as a link; for a planning row (no
 * recorded runtime config) the configuration's best measured variant is shown, labelled as such. With no run of the
 * configuration at all the row reads "not run", never 0.
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

const isPlanningRow = (row: VariantRow) => row.key.startsWith("planning|");

export function AcrossWorkloads({ row, shapeFilter, onPick }: { row: VariantRow; shapeFilter: string; onPick: (workloadId: string, key: string) => void }) {
  const state = useAppState();
  const byWorkload = useVariantRowsByWorkload();
  const cells = React.useMemo((): Cell[] => {
    return state.snapshot.workloads.map((workload) => {
      const entries = setupStandings(rowsFor(byWorkload.get(workload.id), row.deployment.modelId, shapeFilter).sort(catalogOrder));
      const key = keyOnDataset(row.key, workload.id);
      const planningKey = `planning|${row.deployment.configurationId}|${workload.id}`;
      const exact = entries.find((item) => item.row.key === key) ?? entries.find((item) => item.row.key === planningKey) ?? null;
      // The exact runtime config never ran there, but the configuration did: show its best variant, flagged.
      const sibling = exact ? null : entries.find((item) => item.row.variant && item.row.deployment.configurationId === row.deployment.configurationId) ?? null;
      return { workloadId: workload.id, entry: exact ?? sibling, sibling: sibling !== null, ranked: entries.filter((item) => item.position !== null).length };
    });
  }, [byWorkload, row, shapeFilter, state.snapshot.workloads]);
  const planning = isPlanningRow(row);
  const measured = cells.filter((cell) => cell.entry && (planning || !cell.sibling) && tpm(cell.entry.row) !== null);
  if (!measured.length || state.snapshot.workloads.length < 2) return null;
  return (
    <section className="space-y-2" data-testid="setup-across">
      <h3 className="flex items-baseline justify-between gap-3 text-xs font-semibold">
        Across workloads<span className="text-muted-foreground font-normal">rank among this model's setups on each dataset · {shapeFilter ? shapeLabel(shapeFilter) : "all GPU shapes"}</span>
      </h3>
      <ul className="divide-y rounded-lg border">
        {cells.map(({ workloadId, entry, sibling, ranked }) => {
          const workload = state.snapshot.workloads.find((item) => item.id === workloadId);
          // A sibling of a measured variant is another runtime config: no rank, value or standing is attributed to this setup.
          const foreign = sibling && !planning;
          const shown = foreign ? null : entry;
          const value = shown ? tpm(shown.row) : null;
          const active = workloadId === state.workload;
          const standing = shown?.standing;
          const status = foreign ? "not run with this runtime config"
            : shown?.position ? `#${shown.position} of ${ranked}`
            : shown && hasMeasuredLevels(shown.row) ? "no passing level"
            : "not run";
          const body = (
            <>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-mono text-[12px]">{workloadId}</span>
                {sibling ? (
                  <span className="text-muted-foreground text-[11.5px]" data-across-sibling={foreign ? "foreign" : "planning"}>
                    {foreign ? "another runtime config of this configuration ran: open it" : "best measured runtime config of this configuration"}
                  </span>
                ) : null}
                <ProfileBadge workload={workload} plain className="w-fit" />
              </span>
              <span className="text-muted-foreground text-right text-xs tabular-nums" data-across-rank={shown?.position ?? ""}>{status}</span>
              <span className="text-right text-[13px] font-medium tabular-nums">{value === null ? <Missing label="Not measured" /> : num(value)}</span>
              <span className="flex justify-end">
                {standing && (standing.kind === "best" || standing.kind === "tie" || standing.kind === "behind")
                  ? <StandingCell standing={standing} leader={null} compact plain />
                  : null}
              </span>
            </>
          );
          const grid = "grid grid-cols-[minmax(0,1fr)_auto_auto_4.25rem] items-center gap-x-3 px-3 py-2";
          return (
            <li key={workloadId} data-across-workload={workloadId} data-active={active || undefined} data-standing={foreign ? "sibling" : standing?.kind ?? "none"}>
              {active || !entry ? (
                <div className={cn(grid, active && "bg-subtle")} aria-current={active ? "true" : undefined}>{body}</div>
              ) : (
                <button type="button" className={cn(grid, "hover:bg-subtle w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring")} onClick={() => onPick(workloadId, entry.row.key)} aria-label={foreign ? `Open the runtime config that ran on ${workloadId}` : `Rank setups on ${workloadId}`}>
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
