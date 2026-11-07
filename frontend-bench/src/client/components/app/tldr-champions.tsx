import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { hasMeasuredLevels, setupStandings, type SetupEntry } from "../../../domain/setups.js";
import type { RankedDeployment, Workload } from "../../../domain/types.js";
import { updateView, useAppState } from "../../state.js";
import { num, runtimeTag, workloadBudget } from "../../lib/display.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { openRun } from "./overlays.js";
import { Panel } from "./primitives.js";
import { rowsFor, setupName, shapeLabel, useRowsByWorkload } from "./tldr-data.js";
import { signedPercent, TIE_NOTE } from "./tldr-setups.js";

/*
 * Champions by workload: for the selected model × GPU shape, the best setup on every dataset (sustainable tok/min/GPU
 * and C_max under the active SLO) and its challengers with their Δ vs that champion. Leaders are never pooled across
 * datasets. Selecting a workload makes it the active (top-bar) workload.
 */

const INLINE = 3;
const PRESET: Record<string, string> = { classic: "Classic", "low-latency": "Low-latency", frontier: "Frontier", custom: "Custom" };

interface ChampionRow { workload: Workload; entries: SetupEntry[]; champion: SetupEntry | null; challengers: SetupEntry[]; measured: number }

function useChampionRows(modelId: string, shape: string): ChampionRow[] {
  const state = useAppState();
  const byWorkload = useRowsByWorkload();
  return state.snapshot.workloads.map((workload) => {
    const entries = setupStandings(rowsFor(byWorkload.get(workload.id), modelId, shape));
    return {
      workload, entries,
      champion: entries.find((entry) => entry.standing.kind === "best") ?? null,
      challengers: entries.filter((entry) => entry.standing.kind === "tie" || entry.standing.kind === "behind"),
      measured: entries.filter((entry) => hasMeasuredLevels(entry.row)).length,
    };
  });
}

const tpm = (row: RankedDeployment) => row.capacity.sustainableTpmPerGpu;

/** One challenger: setup name and its Δ vs the champion ("tie −0.8%" inside the band). */
function Challenger({ entry }: { entry: SetupEntry }) {
  const standing = entry.standing;
  if (standing.kind !== "tie" && standing.kind !== "behind") return null;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs" data-challenger={entry.row.deployment.configurationId} data-delta={standing.kind}>
      <span className="text-ink-2 min-w-0 truncate">{setupName(entry.row.deployment)}</span>
      {standing.kind === "tie" ? <Badge variant="neutral">tie</Badge> : null}
      <span className={cn("shrink-0 tabular-nums", standing.kind === "tie" ? "text-muted-foreground" : "text-foreground font-medium")}>{signedPercent(standing.fraction)}</span>
    </span>
  );
}

function Challengers({ row }: { row: ChampionRow }) {
  if (!row.champion) return <span className="text-muted-foreground" data-missing="true">—</span>;
  if (!row.challengers.length) return <span className="text-muted-foreground text-xs">No other measured setup</span>;
  const shown = row.challengers.slice(0, INLINE), rest = row.challengers.slice(INLINE);
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {shown.map((entry) => <Challenger key={entry.row.deployment.id} entry={entry} />)}
      {rest.length ? (
        <Tooltip>
          <TooltipTrigger asChild><button type="button" className="text-muted-foreground w-fit text-xs underline decoration-dotted underline-offset-2" onClick={(event) => event.stopPropagation()}>+{rest.length} more</button></TooltipTrigger>
          <TooltipContent className="max-w-80">
            <span className="flex flex-col gap-0.5">
              {rest.map((entry) => entry.standing.kind === "tie" || entry.standing.kind === "behind" ? (
                <span key={entry.row.deployment.id} className="flex justify-between gap-4"><span className="truncate">{setupName(entry.row.deployment)}</span><span className="tabular-nums">{entry.standing.kind === "tie" ? "tie " : ""}{signedPercent(entry.standing.fraction)}</span></span>
              ) : null)}
            </span>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

/** Champion identity (opens its evidence) and the run's runtime_version. */
function Champion({ row }: { row: ChampionRow }) {
  if (!row.champion) {
    return row.measured
      ? <Badge variant="critical" title="Measured, but no tested level meets the SLO">{row.measured} measured · none inside SLO</Badge>
      : <Badge variant="neutral" className="border-dashed" data-testid="champion-not-measured">Not measured</Badge>;
  }
  const d = row.champion.row.deployment;
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <button type="button" className="hover:text-link min-w-0 truncate text-left text-[13px] font-medium hover:underline" title={setupName(d)} onClick={(event) => { event.stopPropagation(); openRun(d.id); }}>{setupName(d)}</button>
      <span className="text-muted-foreground truncate font-mono text-[11px]">{runtimeTag(d)}</span>
    </span>
  );
}

export function ChampionsByWorkload({ modelId, shape }: { modelId: string; shape: string }) {
  const state = useAppState();
  const narrow = useMediaQuery(NARROW_MD);
  const rows = useChampionRows(modelId, shape);
  const model = state.snapshot.models.find((item) => item.id === modelId);
  const select = (id: string) => updateView((s) => { s.workload = id; s.selected = []; });
  const anyMeasured = rows.some((row) => row.measured > 0);
  const scope = [model?.name ?? modelId, shape ? shapeLabel(shape) : "all shapes", `${PRESET[state.slo.preset] ?? state.slo.preset} SLO`].join(" · ");
  const workloadButton = (workload: Workload, active: boolean) => (
    <button type="button" className="min-w-0 text-left outline-none focus-visible:underline" aria-pressed={active} aria-label={`Show workload ${workload.name}`} onClick={(event) => { event.stopPropagation(); select(workload.id); }}>
      <span className={cn("block truncate font-mono text-[12.5px]", active ? "text-foreground font-semibold" : "text-ink-2")}>{workload.name}</span>
      <span className="text-muted-foreground block text-xs tabular-nums">{workloadBudget(workload)}{workload.turns > 1 ? "" : " · 1 turn"}</span>
    </button>
  );
  return (
    <Panel
      id="champions"
      className="scroll-mt-16"
      title="Champions by workload"
      description={<span data-testid="champions-scope">Best setup per dataset · {scope} · challengers with Δ vs champion</span>}
      bodyClassName="p-0"
    >
      <div data-testid="workload-comparison" data-collapsed={anyMeasured ? undefined : true}>
        {!anyMeasured ? (
          // No dataset has a run of this model × shape: one compact block instead of a table of "Not measured" rows.
          // The workloads stay selectable (they set the top-bar workload).
          <div className="flex flex-col gap-3 px-4 py-4">
            <p className="text-muted-foreground text-[13px] text-pretty">No run of {model?.name ?? modelId} on {shape ? shapeLabel(shape) : "any GPU shape"} yet. Once runs are imported, each workload lists its champion, sustainable tok/min/GPU, C_max and the challengers' Δ vs champion.</p>
            <ul className="flex flex-wrap gap-2" aria-label="Workloads">
              {rows.map((row) => {
                const active = row.workload.id === state.workload;
                return (
                  <li key={row.workload.id} data-workload-row={row.workload.id} aria-current={active || undefined} className={cn("rounded-md border border-dashed px-2.5 py-1.5", active ? "bg-subtle border-border-strong shadow-[inset_2px_0_0_var(--brand)]" : "hover:bg-accent")}>
                    {workloadButton(row.workload, active)}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : narrow ? (
          <ul className="divide-y">
            {rows.map((row) => {
              const active = row.workload.id === state.workload;
              return (
                <li key={row.workload.id} data-workload-row={row.workload.id} aria-current={active || undefined} className={cn("flex min-w-0 flex-col gap-1.5 px-4 py-3", active && "bg-subtle")}>
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    {workloadButton(row.workload, active)}
                    <span className="shrink-0 text-right text-[13px] tabular-nums">
                      {row.champion ? <><span className="font-semibold">{num(tpm(row.champion.row))}</span> <span className="text-muted-foreground text-[11px]">tok/min/GPU</span><span className="text-muted-foreground block text-xs">C_max {num(row.champion.row.capacity.highestPassingConcurrency)}</span></> : <span className="text-muted-foreground" data-missing="true">—</span>}
                    </span>
                  </span>
                  <Champion row={row} />
                  {row.champion ? <Challengers row={row} /> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <Table className="table-fixed">
            <colgroup><col className="w-[200px]" /><col /><col className="w-[150px]" /><col className="w-[80px]" /><col className="w-[34%]" /></colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Workload</TableHead>
                <TableHead>Champion</TableHead>
                <TableHead className="text-right">Sustainable <span className="text-muted-foreground font-normal">tok/min/GPU</span></TableHead>
                <TableHead className="text-right">C_max</TableHead>
                <TableHead>Challengers <span className="text-muted-foreground font-normal">Δ vs champion</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const active = row.workload.id === state.workload;
                return (
                  <TableRow key={row.workload.id} data-workload-row={row.workload.id} aria-current={active || undefined} className={cn("cursor-pointer", active && "bg-subtle hover:bg-subtle shadow-[inset_2px_0_0_var(--brand)]")} onClick={() => select(row.workload.id)}>
                    <TableCell className="align-top">{workloadButton(row.workload, active)}</TableCell>
                    <TableCell className="align-top whitespace-normal"><Champion row={row} /></TableCell>
                    <TableCell className="text-right align-top text-[13px] font-medium tabular-nums">{row.champion ? num(tpm(row.champion.row)) : <span className="text-muted-foreground font-normal" data-missing="true">—</span>}</TableCell>
                    <TableCell className="text-right align-top text-[13px] tabular-nums">{row.champion ? num(row.champion.row.capacity.highestPassingConcurrency) : <span className="text-muted-foreground" data-missing="true">—</span>}</TableCell>
                    <TableCell className="align-top whitespace-normal"><Challengers row={row} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="text-muted-foreground border-t px-4 py-2 text-xs text-pretty">Champion = highest sustainable tok/min/GPU on that dataset; datasets are never pooled. {TIE_NOTE}</p>
    </Panel>
  );
}
