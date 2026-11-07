import * as React from "react";
import { Activity, ArrowDown, Columns2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { groupSetups, hasMeasuredLevels, setupStandings, sortSetups, SETUP_TIE_BAND, type SetupEntry, type SetupSort, type SetupStanding } from "../../../domain/setups.js";
import type { Deployment, RankedDeployment } from "../../../domain/types.js";
import { appState, MAX_COMPARE, navigate, routeUrl, update, useAppState } from "../../state.js";
import { configLabel, num, shape } from "../../lib/display.js";
import { artifact } from "../../lib/atlas.js";
import { exportRows } from "../../lib/export.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { openRun } from "./overlays.js";
import { EngineBuild } from "./engine-build.js";
import { Panel } from "./primitives.js";
import { ConfigChips, ErroredBadge, IncompleteBadge } from "./performance.js";
import { StatusBadge } from "./status-badge.js";
import { rowsFor, setupName, shapeKey, shapeLabel, useRowsByWorkload } from "./tldr-data.js";

/*
 * TL;DR setups table: every configuration of one model × GPU shape on the active dataset and SLO, grouped by weights
 * export, each with sustainable tok/min/GPU (bar scaled to the best measured value), Δ vs best (±3% = tie), C_max and
 * the p95 latencies at C_max. Always expanded. Unmeasured setups stay listed after measured ones with "—" cells, a
 * dashed empty track (never a zero-length bar) and one "Not measured" badge. Ranking and Δ: domain/setups.ts.
 */

const BAND = num(SETUP_TIE_BAND * 100);
export const TIE_NOTE = `|Δ| ≤ ${BAND}% reads as a tie: assumed single-run noise (unverified policy), not a measured interval.`;
const precisionOrder = ["BF16", "FP8", "FP4/FP8", "MXFP4", "NVFP4"];
const gb = (bytes: number | null | undefined) => (bytes ? `${num(bytes / 1e9, bytes >= 1e11 ? 0 : 1)} GB` : null);
const dateOf = (iso: string | null) => (iso ? iso.slice(0, 10) : null);
const tpm = (row: RankedDeployment) => (hasMeasuredLevels(row) ? row.capacity.sustainableTpmPerGpu : null);
const cmax = (row: RankedDeployment) => (hasMeasuredLevels(row) ? row.capacity.highestPassingConcurrency : null);
/** Signed percentage with a real minus sign, one decimal: "−3.8%", "+0.0%". */
export const signedPercent = (fraction: number) => `${fraction < 0 ? "−" : "+"}${num(Math.abs(fraction) * 100, 1)}%`;
const signedTpm = (value: number) => `${value < 0 ? "−" : "+"}${num(Math.abs(value))}`;

/** Catalog order inside a model: precision class, export, engine, GPUs, knob. Unmeasured rows keep it. */
function catalogOrder(a: RankedDeployment, b: RankedDeployment): number {
  const index = (row: RankedDeployment) => precisionOrder.indexOf(artifact(row.deployment.artifactId)?.precision ?? row.deployment.precision);
  return index(a) - index(b)
    || a.deployment.artifactId.localeCompare(b.deployment.artifactId)
    || a.deployment.runtime.localeCompare(b.deployment.runtime)
    || a.deployment.gpus - b.deployment.gpus
    || (a.deployment.knob ?? "").localeCompare(b.deployment.knob ?? "");
}

/** Standings for one model × shape on one dataset, in catalog order before ranking (stable within tiers). */
export function useSetupEntries(modelId: string, shapeFilter: string, workloadId: string): SetupEntry[] {
  const byWorkload = useRowsByWorkload();
  return React.useMemo(() => setupStandings(rowsFor(byWorkload.get(workloadId), modelId, shapeFilter).sort(catalogOrder)), [byWorkload, workloadId, modelId, shapeFilter]);
}

const Missing = ({ label }: { label?: string }) => <span className="text-muted-foreground" data-missing="true" aria-label={label}>—</span>;

/** Horizontal data bar scaled to `max`; best in accent, others neutral; a missing value is a dashed empty track. */
function Bar({ value, max, best, className }: { value: number | null; max: number | null; best: boolean; className?: string }) {
  if (value === null || !max) return <span className={cn("block h-1.5 rounded-full border border-dashed border-border-strong", className)} data-bar="empty" aria-hidden="true" />;
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <span className={cn("bg-muted block h-1.5 overflow-hidden rounded-full", className)} data-bar={best ? "best" : "other"} aria-hidden="true">
      <span className={cn("block h-full rounded-full", best ? "bg-brand" : "bg-chart-neutral")} style={{ width: `${ratio * 100}%` }} />
    </span>
  );
}

/** Δ vs best: "Best", "tie" (with the signed %), a signed %, "No passing level" or "Not measured". Absolute Δ in the tooltip. */
export function StandingCell({ standing, leader, compact = false }: { standing: SetupStanding; leader: RankedDeployment | null; compact?: boolean }) {
  if (standing.kind === "best") return <Badge variant="outline" data-delta="best" title="Highest sustainable tok/min/GPU of these setups">Best</Badge>;
  if (standing.kind === "unmeasured") return <Badge variant="neutral" className="border-dashed" data-delta="unmeasured" data-testid="setup-not-measured">Not measured</Badge>;
  if (standing.kind === "no-passing") return <Badge variant="critical" data-delta="no-passing" title="Measured, but no tested load level meets the SLO: no sustainable value and no Δ">No passing level</Badge>;
  const tie = standing.kind === "tie";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex cursor-default items-center gap-1.5 rounded-sm whitespace-nowrap tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring" data-delta={tie ? "tie" : "behind"} data-fraction={standing.fraction.toFixed(4)}>
          {tie ? <Badge variant="neutral" data-testid="tie-badge">tie</Badge> : null}
          <span className={tie ? "text-muted-foreground text-xs" : "text-foreground font-medium"}>{signedPercent(standing.fraction)}</span>
          {compact ? null : <span className="sr-only"> vs best</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">
        <span className="block font-medium tabular-nums">{signedTpm(standing.absolute)} tok/min/GPU ({signedPercent(standing.fraction)}) vs best</span>
        {leader ? <span className="text-background/80 block">Best: {setupName(leader.deployment)}</span> : null}
        {tie ? <span className="text-background/80 mt-1 block">{TIE_NOTE}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

function RunWarnings({ row, className }: { row: RankedDeployment; className?: string }) {
  if (!row.capacity.incomplete && !row.capacity.errored) return null;
  return <span className={cn("flex flex-wrap gap-1", className)}><IncompleteBadge count={row.capacity.incomplete} /><ErroredBadge count={row.capacity.errored} /></span>;
}

/** Setup identity: knob (the row's one evidence-sheet trigger), precision chip and a probe badge. */
function SetupName({ deployment: d, extra }: { deployment: Deployment; extra?: React.ReactNode }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <button type="button" className="hover:text-link min-w-0 text-left text-[13px] font-medium outline-none hover:underline focus-visible:underline" data-action="open-run" aria-label={`Open evidence: ${configLabel(d)}`} onClick={(event) => { event.stopPropagation(); openRun(d.id); }}>
        {d.knob ?? "Baseline"}
      </button>
      <Badge variant="mono" title={artifact(d.artifactId)?.precisionDetail ?? d.quantMethod}>{d.precision}</Badge>
      {d.status === "candidate" ? null : <StatusBadge deployment={d} />}
      {extra}
    </span>
  );
}

/** Configured engine build (recheck as a muted second line) and, when measured, the run's recorded runtime_version. */
function Runtime({ deployment: d }: { deployment: Deployment }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <EngineBuild deployment={d} />
      {d.evidence === "measured" && d.runtimeTag ? <span className="text-muted-foreground font-mono text-[11px] whitespace-nowrap" title="runtime_version recorded by the run">ran {d.runtimeTag}</span> : null}
    </span>
  );
}

/** Row actions besides the setup name (which opens the evidence sheet): add to compare and open in Throughput. */
function RowActions({ deployment: d, selected, full }: { deployment: Deployment; selected: Set<string>; full: boolean }) {
  const inCompare = selected.has(d.id);
  const label = configLabel(d);
  const toggle = () => update((s) => { s.selected = s.selected.includes(d.id) ? s.selected.filter((id) => id !== d.id) : s.selected.length >= MAX_COMPARE ? s.selected : [...s.selected, d.id]; });
  return (
    <span className="flex shrink-0 items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
      <label className={cn("hover:bg-accent flex size-7 items-center justify-center rounded-md", !inCompare && full ? "cursor-not-allowed" : "cursor-pointer")} title={!inCompare && full ? `Compare holds ${MAX_COMPARE} setups` : inCompare ? "Remove from compare" : "Add to compare"}>
        <Checkbox checked={inCompare} disabled={!inCompare && full} onCheckedChange={toggle} aria-label={inCompare ? `Remove ${label} from compare` : `Add ${label} to compare`} data-action="compare" />
      </label>
      <Button size="icon" variant="ghost" className="size-7" asChild>
        <a href={routeUrl("throughput", { run: d.id })} aria-label={`Throughput: ${label}`} title="Open in Throughput" data-action="throughput"><Activity aria-hidden="true" /></a>
      </Button>
    </span>
  );
}

/**
 * Export identity for a group: label, precision (only when the label does not already start with it, so no
 * "FP8 [FP8]"), weights ("— GB" when the catalog records no size), repository and setup counts.
 */
function GroupHeader({ entries }: { entries: SetupEntry[] }) {
  const d = entries[0]!.row.deployment;
  const exported = artifact(d.artifactId);
  const measured = entries.filter((entry) => hasMeasuredLevels(entry.row)).length;
  const weights = gb(exported?.weightBytes);
  const precision = exported?.precision ?? d.precision;
  const labelLead = d.exportLabel.split(/[\s·]+/)[0]?.toLowerCase();
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs" data-group-header>
      <span className="text-foreground text-[13px] font-semibold" title={exported?.precisionDetail}>{d.exportLabel}</span>
      {labelLead === precision.toLowerCase() ? null : <Badge variant="mono" data-group-precision>{precision}</Badge>}
      {weights
        ? <span className="text-ink-2 tabular-nums" title="Ideal weight bytes (safetensors index)" data-group-weights>{weights}</span>
        : <span className="text-muted-foreground tabular-nums" title="Weight size not recorded in the catalog" data-group-weights="missing">— GB</span>}
      <span className="text-muted-foreground tabular-nums">{entries.length} setup{entries.length === 1 ? "" : "s"}{measured ? ` · ${measured} measured` : ""}</span>
      <span className="text-muted-foreground min-w-0 font-mono text-[11px] break-all">{d.exportHfId}</span>
    </span>
  );
}

export function SetupsTable({ modelId, shape: shapeFilter, sort }: { modelId: string; shape: string; sort: SetupSort }) {
  const state = useAppState();
  const narrow = useMediaQuery(NARROW_MD);
  const entries = useSetupEntries(modelId, shapeFilter, state.workload);
  const model = state.snapshot.models.find((item) => item.id === modelId);
  if (!model) return null;
  const sorted = sortSetups(entries, sort, (row) => setupName(row.deployment));
  const groups = groupSetups(sorted, (entry) => entry.row.deployment.artifactId);
  const leader = entries.find((entry) => entry.standing.kind === "best")?.row ?? null;
  const best = leader ? tpm(leader) : null;
  const ranked = entries.filter((entry) => entry.position !== null);
  const maxCmax = Math.max(0, ...entries.map((entry) => cmax(entry.row) ?? 0)) || null;
  const measured = entries.filter((entry) => hasMeasuredLevels(entry.row)).length;
  const selected = new Set(state.selected);
  const full = selected.size >= MAX_COMPARE;
  const shapes = [...new Set(entries.map((entry) => shapeKey(entry.row.deployment)))];
  const compareTop = () => {
    const ids = ranked.slice(0, 3).map((entry) => entry.row.deployment.id);
    appState.selected = [...ids]; appState.compare = [...ids];
    navigate("compare", { runs: ids.join(",") });
  };
  const scope = [model.name, shapeFilter ? shapeLabel(shapeFilter) : shapes.length === 1 ? shapeLabel(shapes[0]!) : "all shapes", state.workload].join(" · ");
  const compareDisabled = ranked.length < 2;
  // Nothing measured on this dataset: the metric columns would be "—" in every row, so they collapse into one
  // "Metrics · not measured" column (DESIGN.md › Tables) and the dashed tracks are dropped.
  const collapsed = measured === 0;
  const compareReason = `Needs ≥2 measured setups with a sustainable value on ${state.workload}; ${ranked.length} now.`;
  const compareButton = (
    <Button size="sm" variant="outline" onClick={compareTop} disabled={compareDisabled} data-testid="compare-top" aria-describedby={compareDisabled ? "compare-top-reason" : undefined}><Columns2 aria-hidden="true" />Compare top {ranked.length === 2 ? 2 : 3}</Button>
  );
  const toChampions = () => {
    const target = document.getElementById("champions");
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    const heading = document.getElementById("champions-title");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  };
  return (
    <Panel
      id="setups"
      title={<>Setups <span className="text-muted-foreground font-normal">ranked by sustainable tok/min/GPU</span></>}
      description={<span className="tabular-nums" data-testid="setups-scope">{scope} · {entries.length} setups · {measured} measured</span>}
      actions={
        <>
          {compareDisabled ? (
            <Tooltip>
              <TooltipTrigger asChild><span tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="compare-top-wrapper">{compareButton}</span></TooltipTrigger>
              <TooltipContent className="max-w-64 text-pretty" data-testid="compare-top-tooltip">{compareReason}</TooltipContent>
            </Tooltip>
          ) : compareButton}
          {compareDisabled ? <span id="compare-top-reason" className="sr-only">{compareReason}</span> : null}
          <Button size="sm" variant="ghost" onClick={toChampions} data-testid="jump-champions" title="Scroll to Champions by workload"><ArrowDown aria-hidden="true" />Champions by workload</Button>
          <Button size="sm" variant="outline" onClick={() => exportRows(sorted.map((entry) => entry.row), `tldr-${model.id}`)}><Download aria-hidden="true" />Export</Button>
        </>
      }
      bodyClassName="p-0"
    >
      {entries.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-[13px]">No setup of {model.name} on this GPU shape.</p>
      ) : narrow ? (
        <div className="divide-y" data-testid="setups-table" data-layout="cards">
          {groups.map((group) => (
            <section key={group.key} data-setup-group={group.key} aria-label={group.items[0]!.row.deployment.exportLabel}>
              <div className="bg-subtle border-b px-4 py-2"><GroupHeader entries={group.items} /></div>
              <ul className="divide-y">
                {group.items.map((entry) => <SetupCard key={entry.row.deployment.id} entry={entry} best={best} leader={leader} collapsed={collapsed} actions={<RowActions deployment={entry.row.deployment} selected={selected} full={full} />} />)}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto" data-testid="setups-table" data-layout="table" data-collapsed={collapsed || undefined}>
          <Table className={cn("table-fixed", collapsed ? "min-w-[760px]" : "min-w-[1000px]")}>
            <colgroup>
              {collapsed
                ? <><col className="w-8" /><col className="w-[42%]" /><col className="w-[200px]" /><col /><col className="w-[96px]" /></>
                : <><col className="w-8" /><col /><col className="w-[148px]" /><col className="w-[148px]" /><col className="w-[100px]" /><col className="w-[72px]" /><col className="w-[112px]" /><col className="w-[100px]" /><col className="w-[96px]" /></>}
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right" title="Rank by sustainable tok/min/GPU">#</TableHead>
                <TableHead>Setup</TableHead>
                <TableHead>Runtime</TableHead>
                {collapsed ? (
                  <TableHead className="h-auto py-1.5 leading-tight whitespace-normal" data-testid="metrics-not-measured"><span title="Sustainable tok/min/GPU, Δ vs best, C_max, TTFT / ITL p95 and latest run">Metrics</span><span className="text-muted-foreground block font-normal">not measured on {state.workload}</span></TableHead>
                ) : (
                  <>
                    <TableHead className="h-auto py-1.5 text-right leading-tight whitespace-normal">Sustainable<span className="text-muted-foreground block font-normal">tok/min/GPU</span></TableHead>
                    <TableHead>Δ vs best</TableHead>
                    <TableHead className="text-right">C_max</TableHead>
                    <TableHead className="h-auto py-1.5 text-right leading-tight" title="TTFT p95 / ITL p95 at C_max, verbatim from the run report">TTFT / ITL p95<span className="text-muted-foreground block font-normal">ms at C_max</span></TableHead>
                    <TableHead>Latest run</TableHead>
                  </>
                )}
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            {groups.map((group) => (
              <TableBody key={group.key} data-setup-group={group.key}>
                <TableRow className="bg-subtle hover:bg-subtle">
                  <TableCell colSpan={collapsed ? 5 : 9} className="py-1.5 whitespace-normal"><GroupHeader entries={group.items} /></TableCell>
                </TableRow>
                {group.items.map((entry) => {
                  const { row } = entry, d = row.deployment;
                  const value = tpm(row), c = cmax(row), point = row.capacity.selectedPoint;
                  return (
                    <TableRow key={d.id} data-setup-row={d.configurationId} data-standing={entry.standing.kind} data-position={entry.position ?? undefined} aria-selected={selected.has(d.id) || undefined}>
                      <TableCell className="text-muted-foreground text-right align-top text-xs tabular-nums">{entry.position ?? ""}</TableCell>
                      <TableCell className="align-top whitespace-normal">
                        <SetupName deployment={d} extra={<span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">{shapeLabel(shapeKey(d))} · {shape(d)}</span>} />
                        <ConfigChips deployment={d} max={collapsed ? 4 : 2} className="mt-1" />
                      </TableCell>
                      <TableCell className="align-top text-[13px] whitespace-normal"><Runtime deployment={d} /></TableCell>
                      {collapsed ? (
                        <TableCell className="align-top"><StandingCell standing={entry.standing} leader={leader} /></TableCell>
                      ) : (
                        <>
                          <TableCell className="text-right align-top">
                            <span className="block text-[13px] font-medium tabular-nums">{value === null ? <Missing /> : num(value)}</span>
                            <Bar value={value} max={best} best={entry.standing.kind === "best"} className="mt-1.5 ml-auto w-28" />
                          </TableCell>
                          <TableCell className="align-top"><StandingCell standing={entry.standing} leader={leader} /></TableCell>
                          <TableCell className="text-right align-top tabular-nums">
                            <span className="block text-[13px]">{c === null ? <Missing /> : num(c)}</span>
                            {hasMeasuredLevels(row) ? <Bar value={c} max={maxCmax} best={false} className="mt-1.5 ml-auto w-12" /> : null}
                          </TableCell>
                          <TableCell className="text-right align-top text-[13px] tabular-nums">
                            {point ? <>{num(point.ttftP95Ms)} <span className="text-muted-foreground">/</span> {num(point.itlP95Ms, 1)}</> : <Missing />}
                          </TableCell>
                          <TableCell className="align-top text-[13px] whitespace-normal tabular-nums">
                            {dateOf(d.measuredAt) ?? <Missing />}
                            <RunWarnings row={row} className="mt-1" />
                          </TableCell>
                        </>
                      )}
                      <TableCell className="align-top"><RowActions deployment={d} selected={selected} full={full} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            ))}
          </Table>
        </div>
      )}
      <p className="text-muted-foreground border-t px-4 py-2 text-xs text-pretty" data-testid="setups-caption" data-measured={measured}>
        {measured === 0
          ? <>No measured setup on {state.workload} yet; ranking appears once runs are imported. Sustainable = total tok/s at C_max × {num(state.slo.margin, 2)} margin × 60 ÷ GPUs, under the active SLO.</>
          : <>Sustainable = total tok/s at C_max × {num(state.slo.margin, 2)} margin × 60 ÷ GPUs, under the active SLO. Bars scale to the best measured value for this model; the best is highlighted. Δ vs best = (setup − best) ÷ best. {TIE_NOTE} Unmeasured setups are listed last.</>}
      </p>
    </Panel>
  );
}

/** Phone layout: one stacked card per setup (setup line, runtime line, metric line with bar and Δ, chips wrap). */
function SetupCard({ entry, best, leader, collapsed, actions }: { entry: SetupEntry; best: number | null; leader: RankedDeployment | null; collapsed: boolean; actions: React.ReactNode }) {
  const { row } = entry, d = row.deployment;
  const value = tpm(row), c = cmax(row), point = row.capacity.selectedPoint;
  const date = dateOf(d.measuredAt);
  return (
    <li className="flex min-w-0 flex-col gap-1.5 px-4 py-3" data-setup-row={d.configurationId} data-standing={entry.standing.kind} data-position={entry.position ?? undefined}>
      <span className="flex min-w-0 items-start gap-2">
        {entry.position !== null ? <span className="text-muted-foreground mt-px w-5 shrink-0 text-xs tabular-nums">#{entry.position}</span> : null}
        <span className="min-w-0 flex-1"><SetupName deployment={d} /></span>
        {actions}
      </span>
      <span className="text-muted-foreground flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
        <Runtime deployment={d} />
        <span className="tabular-nums">{shapeLabel(shapeKey(d))} · {shape(d)}</span>
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-[13px] tabular-nums">{value === null ? <Missing /> : <><span className="font-semibold">{num(value)}</span> <span className="text-muted-foreground text-[11px]">tok/min/GPU</span></>}</span>
        {collapsed ? <span className="flex-1" /> : <Bar value={value} max={best} best={entry.standing.kind === "best"} className="min-w-8 flex-1" />}
        <span className="shrink-0"><StandingCell standing={entry.standing} leader={leader} compact /></span>
      </span>
      {hasMeasuredLevels(row) ? (
        <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
          <span>C_max <span className="text-foreground">{num(c)}</span></span>
          <span>p95 TTFT / ITL <span className="text-foreground">{point ? `${num(point.ttftP95Ms)} / ${num(point.itlP95Ms, 1)} ms` : "—"}</span></span>
          {date ? <span>{date}</span> : null}
          <RunWarnings row={row} />
        </span>
      ) : null}
      <ConfigChips deployment={d} max={3} />
    </li>
  );
}
