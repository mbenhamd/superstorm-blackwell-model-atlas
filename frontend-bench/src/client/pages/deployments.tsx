import * as React from "react";
import { Activity, Columns2, Copy, Download, Ellipsis, FileSearch, History, Plus, RotateCcw, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableCard } from "@/components/blocks/data-table-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HeatmapChart } from "@/components/ui/heatmap-chart";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Deployment, RankedDeployment } from "../../domain/types.js";
import { addToCompare, openExperimentForm, openRun } from "../components/app/overlays.js";
import { Combobox } from "../components/app/pickers.js";
import { FacetedFilter } from "../components/app/pickers.js";
import { EmptyState, InlineBar, PageHeader, Panel, Term } from "../components/app/primitives.js";
import { ConfigChips, IncompleteBadge } from "../components/app/performance.js";
import { StatusBadge } from "../components/app/status-badge.js";
import { NARROW_MD, useMediaQuery } from "../lib/use-media.js";
import { MAX_COMPARE, navigate, update, updateView, useAppState } from "../state.js";
import { compactNum, configLabel, engineBuildDetail, engineVersion, filteredRows, gpusOf, hardwareShape, isMeasured, modelQuality, num, rankedRows, recheckNote, shape, sloSummary, testedLabel } from "../lib/display.js";
import { artifact } from "../lib/atlas.js";
import { exportRows } from "../lib/export.js";
import { toast } from "../lib/toast.js";

function RowActions({ row }: { row: RankedDeployment }) {
  const id = row.deployment.id;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${configLabel(row.deployment)}`} onClick={(event) => event.stopPropagation()}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem onSelect={() => openRun(id)}><FileSearch aria-hidden="true" />Inspect evidence</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => addToCompare(id)}><Columns2 aria-hidden="true" />Add to compare</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => { update((s) => { s.run = id; }); navigate("throughput", { run: id }); }}><Activity aria-hidden="true" />Open throughput</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openExperimentForm(id)}><Plus aria-hidden="true" />Plan experiment</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { void navigator.clipboard?.writeText(id).then(() => toast("ID copied", id), () => toast("Copy unavailable", id, true)); }}><Copy aria-hidden="true" />Copy ID</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const right = "flex items-baseline justify-end whitespace-nowrap";

/** One line: configured build; the latest release recheck is a muted marker whose tooltip carries the note (never the build). */
function EngineCell({ deployment: d }: { deployment: Deployment }) {
  const recheck = d.recheck ? (/^v\d/.test(d.recheck.engineRelease) ? d.recheck.engineRelease : "") : null;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" data-engine-build={d.runtimeVersion} title={engineBuildDetail(d)}>
      <span className="font-medium">{d.runtime}</span>
      <span className="text-ink-2">{engineVersion(d)}</span>
      {d.recheck && recheck !== null ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} data-recheck={d.recheck.engineRelease} className="text-muted-foreground inline-flex cursor-help items-center gap-0.5 text-[11.5px] outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => event.stopPropagation()}>
              <History className="size-3" aria-hidden="true" /><span className="sr-only">{recheck} {recheckNote(d)}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 text-left">
            <span className="block font-medium">{recheckNote(d)}</span>
            <span className="text-background/80 block">{d.recheck.checkedOn} · {testedLabel(d.recheck.testedOnTarget)}</span>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

/**
 * Per-level view of the same sweeps the table summarizes: one row per configuration, one column per
 * tested concurrency. Passing levels are shaded by total tok/min per GPU; levels outside the SLO and
 * untested levels stay on the muted track and say so in the tooltip and accessible name.
 * With no measured rows the panel is omitted (no invented concurrency ladder); the leaderboard caption says so.
 */
function LoadLevelHeatmap({ rows }: { rows: RankedDeployment[] }) {
  const ordered = [...rows].sort((a, b) => (b.capacity.sustainableTpmPerGpu ?? -1) - (a.capacity.sustainableTpmPerGpu ?? -1));
  const levels = [...new Set(ordered.flatMap((row) => row.capacity.points.map((point) => point.concurrency)))].sort((a, b) => a - b);
  const cell = (row: RankedDeployment, level: number) => row.capacity.points.find((point) => point.concurrency === level);
  const perGpu = (row: RankedDeployment, level: number) => { const p = cell(row, level); return p ? (p.totalTps * 60) / gpusOf(row.deployment) : null; };
  const describe = (r: number, c: number) => {
    const row = ordered[r]!, level = levels[c]!, p = cell(row, level);
    if (!p) return { head: "Not tested", detail: `${configLabel(row.deployment)} · ${level} concurrent` };
    const tpm = `${num(perGpu(row, level))} total tok/min/GPU`;
    return p.passes
      ? { head: `${tpm} · meets SLO`, detail: `${configLabel(row.deployment)} · ${level} concurrent · TTFT p95 ${num(p.ttftP95Ms)} ms` }
      : { head: `Outside SLO (${tpm} raw)`, detail: `${configLabel(row.deployment)} · ${level} concurrent · TTFT p95 ${num(p.ttftP95Ms)} ms · ITL p95 ${num(p.itlP95Ms, 1)} ms` };
  };
  // Without measured rows the panel is not rendered; the leaderboard caption carries the single page-level notice.
  if (!ordered.length) return null;
  return (
    <Panel title="Throughput by load level" id="load-levels" description="total tok/min/GPU; only passing levels shaded">
      <div className="-mx-4 overflow-x-auto px-4" data-testid="load-heatmap">
        <HeatmapChart
          className="min-w-[560px]"
          rows={ordered.map((row) => ({ label: configLabel(row.deployment), values: levels.map((level) => { const p = cell(row, level); return p?.passes ? perGpu(row, level) ?? 0 : 0; }) }))}
          columns={levels.map(String)}
          scale="sqrt"
          cellHeight={24}
          gap={3}
          showLegend={false}
          cellLabel={(datum) => { const d = describe(datum.row, datum.column); return `${d.head}, ${d.detail}`; }}
          renderTooltip={(datum) => { const d = describe(datum.row, datum.column); return (<><span className="font-medium tabular-nums">{d.head}</span><span className="text-background/70 block">{d.detail}</span></>); }}
          onCellClick={(datum) => openRun(ordered[datum.row]!.deployment.id)}
        />
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>Concurrent requests</span>
          <span className="inline-flex items-center gap-1">
            <span className="mr-0.5">Outside SLO</span>
            <span className="bg-muted size-3 rounded-[3px]" aria-hidden="true" />
            {[0.25, 0.5, 0.75, 1].map((t) => <span key={t} className="size-3 rounded-[3px]" aria-hidden="true" style={{ backgroundColor: `color-mix(in oklab, var(--chart-1) ${Math.round(12 + t * 88)}%, var(--muted))` }} />)}
            <span className="ml-0.5">Higher tok/min/GPU</span>
          </span>
        </div>
      </div>
    </Panel>
  );
}

const dash = <span className="text-muted-foreground">—</span>;
const sustainableOf = (row: RankedDeployment) => row.capacity.sustainableTpmPerGpu;

/** SLO verdict at the configuration level: pass when some level meets the SLO (C_max exists), out of SLO when none does, — when unmeasured. */
function SloCell({ row }: { row: RankedDeployment }) {
  if (!isMeasured(row.deployment)) return dash;
  const { passingLevels, totalLevels } = row.capacity;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={`${passingLevels} of ${totalLevels} tested levels meet the SLO`}>
      {passingLevels > 0 ? <Badge variant="good" data-verdict="pass">pass</Badge> : <Badge variant="critical" data-verdict="fail">out of SLO</Badge>}
      <span className="text-muted-foreground text-xs tabular-nums">{passingLevels}/{totalLevels}</span>
    </span>
  );
}

const rankColumn: DataTableColumnDef<RankedDeployment> = {
  id: "rank", size: 40, enableSorting: false, enableHiding: false,
  header: () => <span className="text-muted-foreground">#</span>,
  cell: ({ row, table }) => {
    const value = sustainableOf(row.original);
    if (value === null) return dash;
    const rank = 1 + table.getCoreRowModel().rows.filter((r) => (sustainableOf(r.original) ?? -1) > value).length;
    return <span className="text-muted-foreground tabular-nums" data-rank={rank}>{rank}</span>;
  },
};
const columnsAll: DataTableColumnDef<RankedDeployment>[] = [
  {
    id: "select", size: 36, enableSorting: false, enableHiding: false,
    header: () => <span className="sr-only">Select to compare</span>,
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        aria-label={`Select ${configLabel(row.original.deployment)} to compare`}
        data-compare-id={row.original.deployment.id}
        onClick={(event) => event.stopPropagation()}
        onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
      />
    ),
  },
  {
    id: "model", size: 220, accessorFn: (row) => `${row.model.name} ${row.deployment.exportLabel}`, enableHiding: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Configuration" />,
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-1 py-0.5" title={row.original.deployment.knob ? `${row.original.deployment.id} · ${row.original.deployment.knob}` : row.original.deployment.id}>
        <span className="flex min-w-0 items-center gap-1.5">
          <button type="button" className="hover:text-link min-w-0 truncate font-medium outline-none focus-visible:underline" data-action="open-run" data-id={row.original.deployment.id} onClick={(event) => { event.stopPropagation(); openRun(row.original.deployment.id); }}>{row.original.model.name}</button>
          <Badge variant="neutral" className="shrink-0">{row.original.deployment.exportLabel}</Badge>
        </span>
        <span className="flex min-w-0 items-center gap-1 overflow-hidden [&_[data-slot=badge]]:h-[18px] [&_[data-slot=badge]]:text-[10.5px]">
          <StatusBadge deployment={row.original.deployment} className="shrink-0" />
          <ConfigChips deployment={row.original.deployment} max={1} className="flex-nowrap" />
          <IncompleteBadge count={row.original.capacity.incomplete} className="shrink-0" />
        </span>
      </div>
    ),
  },
  {
    id: "engine", size: 140, accessorFn: (row) => `${row.deployment.runtime} ${row.deployment.runtimeVersion}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Engine" />,
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <EngineCell deployment={row.original.deployment} />
        <span className="text-muted-foreground text-[11px] whitespace-nowrap">{hardwareShape(row.original.deployment)} · {shape(row.original.deployment)}</span>
      </div>
    ),
  },


  {
    id: "sustainable", size: 108, accessorFn: (row) => sustainableOf(row) ?? undefined, sortUndefined: "last", enableHiding: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="tok/min/GPU" align="right" />,
    cell: ({ row, table }) => {
      const value = sustainableOf(row.original);
      if (value === null) return <div className={right} title={isMeasured(row.original.deployment) ? "No tested level meets the SLO" : "Not measured"}>{dash}</div>;
      const max = Math.max(0, ...table.getCoreRowModel().rows.map((r) => sustainableOf(r.original) ?? 0));
      return <div className={right}><InlineBar value={value} max={max}><span className="font-medium">{num(value)}</span></InlineBar></div>;
    },
  },
  {
    id: "C_max", size: 68, accessorFn: (row) => row.capacity.highestPassingConcurrency ?? undefined, sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="C_max" align="right" />,
    cell: ({ row }) => <div className={right}>{row.original.capacity.highestPassingConcurrency ?? dash}</div>,
  },
  {
    id: "TTFT p95", size: 80, accessorFn: (row) => row.capacity.selectedPoint?.ttftP95Ms ?? undefined, sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="TTFT p95" align="right" />,
    cell: ({ row }) => { const v = row.original.capacity.selectedPoint?.ttftP95Ms; return <div className={right} title="At C_max">{v == null ? dash : <>{num(v)}<span className="text-muted-foreground ml-0.5 text-xs">ms</span></>}</div>; },
  },
  {
    id: "ITL p50", size: 72, accessorFn: (row) => row.capacity.selectedPoint?.itlP50Ms ?? undefined, sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="ITL p50" align="right" />,
    cell: ({ row }) => { const v = row.original.capacity.selectedPoint?.itlP50Ms; return <div className={right} title="At C_max">{v == null ? dash : <>{num(v, 1)}<span className="text-muted-foreground ml-0.5 text-xs">ms</span></>}</div>; },
  },
  {
    id: "SLO", size: 84, accessorFn: (row) => (isMeasured(row.deployment) ? row.capacity.passingLevels : undefined), sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="SLO" />,
    cell: ({ row }) => <SloCell row={row.original} />,
  },  {
    id: "shape", size: 96, accessorFn: (row) => gpusOf(row.deployment) * 100 + row.deployment.tensorParallel,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hardware" />,
    cell: ({ row }) => <span className="whitespace-nowrap" title={`${shape(row.original.deployment)} · ${hardwareShape(row.original.deployment)}`}>{hardwareShape(row.original.deployment)} <span className="text-muted-foreground">· {shape(row.original.deployment)}</span></span>,
  },  {
    id: "status", size: 96, accessorFn: (row) => row.deployment.status,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge deployment={row.original.deployment} />,
  },
  {
    id: "per-user", size: 104, accessorFn: (row) => row.capacity.selectedPoint?.outputTpsPerUser ?? undefined, sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Per-user tok/s" align="right" />,
    cell: ({ row }) => { const v = row.original.capacity.selectedPoint?.outputTpsPerUser; return <div className={right} title="Per-user output tok/s p50 at C_max">{v == null ? dash : num(v, 1)}</div>; },
  },
  {
    id: "latest run", size: 104, accessorFn: (row) => row.deployment.measuredAt ?? undefined, sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Latest run" />,
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{row.original.deployment.measuredAt ? row.original.deployment.measuredAt.slice(0, 10) : dash}</span>,
  },
  {
    id: "context cap", size: 104, accessorFn: (row) => row.deployment.contextCap ?? undefined, sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Context cap" align="right" />,
    cell: ({ row }) => <div className={right}>{row.original.deployment.contextCap ? compactNum(row.original.deployment.contextCap) : dash}</div>,
  },
  {
    id: "weights", size: 104, accessorFn: (row) => artifact(row.deployment.artifactId)?.weightBytes ?? undefined, sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Weights, GB" align="right" />,
    cell: ({ row }) => { const bytes = artifact(row.original.deployment.artifactId)?.weightBytes; return <div className={right}>{bytes ? num(bytes / 1e9, 1) : dash}</div>; },
  },
  {
    id: "AA index", size: 92, accessorFn: (row) => modelQuality(row.model.id) ?? undefined, sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="AA (model)" align="right" />,
    cell: ({ row }) => <div className={right}>{modelQuality(row.original.model.id) === null ? dash : num(modelQuality(row.original.model.id), 1)}</div>,
  },
];
/** Metric columns that are "—" in every row until a run is imported; they collapse into one "Metrics" column. */
const METRIC_IDS = ["sustainable", "C_max", "TTFT p95", "ITL p50", "SLO"];
const metricsPlaceholder: DataTableColumnDef<RankedDeployment> = {
  id: "metrics", size: 96, enableSorting: false, enableHiding: false,
  header: () => <span className="text-muted-foreground font-normal" title="tok/min/GPU, C_max, TTFT p95, ITL p50 and SLO verdict appear once runs are imported">Metrics · not measured</span>,
  cell: () => <span className="text-muted-foreground" data-missing="true">—</span>,
};

/**
 * Phone layout (below md): one stacked card per configuration instead of a clipped wide table.
 * Line 1 name, export and status; line 2 engine build and shape; line 3 the sustainable value or "—"; chips wrap.
 */
const stackedColumn: DataTableColumnDef<RankedDeployment> = {
  id: "stacked", accessorFn: (row) => `${row.model.name} ${row.deployment.exportLabel}`, enableSorting: false, enableHiding: false,
  header: () => <span>Configuration</span>,
  cell: ({ row }) => {
    const d = row.original.deployment, value = sustainableOf(row.original);
    return (
      <div className="flex min-w-0 flex-col gap-1 py-0.5 whitespace-normal">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <button type="button" className="hover:text-link min-w-0 text-left font-medium outline-none focus-visible:underline" data-action="open-run" data-id={d.id} onClick={(event) => { event.stopPropagation(); openRun(d.id); }}>{row.original.model.name}</button>
          <Badge variant="neutral">{d.exportLabel}</Badge>
          <StatusBadge deployment={d} />
        </span>
        <span className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs"><EngineCell deployment={d} /><span>{hardwareShape(d)} · {shape(d)}</span></span>
        <span className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{value === null ? "Sustainable" : "Sustainable tok/min/GPU"}</span>
          {value === null ? <span className="text-muted-foreground" data-missing="true">—</span> : <span className="font-medium tabular-nums">{num(value)}</span>}
        </span>
        <ConfigChips deployment={d} max={4} />
      </div>
    );
  },
};
const actionsColumn: DataTableColumnDef<RankedDeployment> = { id: "actions", size: 44, enableSorting: false, enableHiding: false, header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <div className={right}><RowActions row={row.original} /></div> };

export function DeploymentsPage() {
  const state = useAppState();
  const all = rankedRows();
  const shapes = state.shape;
  const setShapes = (values: string[]) => updateView((s) => { s.shape = values; });
  const rows = filteredRows().filter((row) => shapes.length === 0 || shapes.includes(hardwareShape(row.deployment)));
  const facet = (values: string[], count: (value: string) => number, label: (value: string) => string = (value) => value) => values.map((value) => ({ value, label: label(value), count: count(value) }));
  const filtered = state.query || state.gpu.length || state.runtime.length || state.precision.length || state.model !== "all" || shapes.length;
  const reset = () => updateView((s) => { s.query = ""; s.gpu = []; s.shape = []; s.runtime = []; s.precision = []; s.model = "all"; });
  const anyMeasured = all.some((row) => isMeasured(row.deployment));
  const narrow = useMediaQuery(NARROW_MD);
  const columns = React.useMemo(() => {
    // Phone: the stacked card plus hidden copies of the other columns, so sorting by AA or sustainable still applies.
    if (narrow) return [columnsAll[0]!, stackedColumn, ...columnsAll.slice(1).map((column) => ({ ...column, enableHiding: true })), actionsColumn];
    if (anyMeasured) return [columnsAll[0]!, rankColumn, ...columnsAll.slice(1), actionsColumn];
    // Nothing measured: one "Metrics" column in place of five all-dash columns; the freed width goes to the name.
    const kept = columnsAll.slice(1).filter((column) => !METRIC_IDS.includes(column.id!)).map((column) => (column.id === "model" ? { ...column, size: 340 } : column));
    const metricsAt = kept.findIndex((column) => column.id === "engine") + 1;
    return [columnsAll[0]!, ...kept.slice(0, metricsAt), metricsPlaceholder, ...kept.slice(metricsAt), actionsColumn];
  }, [anyMeasured, narrow]);
  const precisions = ["BF16", "FP8", "FP4/FP8", "MXFP4", "NVFP4"].filter((value) => all.some((row) => row.deployment.precision === value));
  const shapeValues = [...new Set(all.map((row) => hardwareShape(row.deployment)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const selection: Record<string, true> = Object.fromEntries(state.selected.map((id) => [id, true as const]));
  const candidates = all.filter((row) => row.deployment.status === "candidate").length;
  const measured = all.filter((row) => isMeasured(row.deployment)).length;
  const presetName = { classic: "Classic", "low-latency": "Low-latency", frontier: "Frontier", custom: "Custom" }[state.slo.preset];
  return (
    <div className="space-y-4">
      <PageHeader
        title="Deployments"
        description={<span data-testid="deployment-meta" className="tabular-nums">{all.length} configs · {candidates} candidate · {all.length - candidates} probe · {measured} measured</span>}
      />
      <DataTableCard
        title={anyMeasured ? <>Ranked by <Term name="Sustainable throughput">sustainable tok/min/GPU</Term></> : "Leaderboard"}
        description={anyMeasured ? undefined : <span data-testid="leaderboard-caption">Not measured — ordered by AA index (model). <span data-testid="load-heatmap-empty">Throughput, latency, SLO verdicts and the per-level heatmap appear once runs are imported.</span></span>}
        className="gap-3 rounded-lg py-4 [&_[data-slot=card-header]]:px-4 [&_[data-slot=card-content]]:px-4"
        columns={columns}
        data={rows}
        getRowId={(row) => row.deployment.id}
        enableRowSelection
        rowSelection={selection}
        onRowSelectionChange={(next) => {
          const ids = Object.keys(next).filter((id) => next[id]);
          if (ids.length > MAX_COMPARE) { toast("Comparison is full", `Compare up to ${MAX_COMPARE} configurations at a time.`, true); return; }
          // Keep the click order so series colors follow the configuration, not its rank.
          update((s) => { s.selected = [...s.selected.filter((id) => ids.includes(id)), ...ids.filter((id) => !s.selected.includes(id))]; });
        }}
        initialSorting={[{ id: anyMeasured ? "sustainable" : "AA index", desc: true }]}
        key={narrow ? "stacked" : "table"}
        initialColumnVisibility={narrow
          ? Object.fromEntries(columnsAll.slice(1).map((column) => [column.id!, false]))
          : { shape: false, status: false, "context cap": false, weights: false, "per-user": false, "latest run": false }}
        pinnedColumns={narrow ? undefined : { start: ["select", "model"], end: ["actions"] }}
        pageSize={0}
        showPagination={false}
        density="compact"
        onRowClick={(row) => openRun(row.original.deployment.id)}
        rowProps={(row) => ({ "data-row-id": row.original.deployment.id } as React.ComponentProps<"tr">)}
        emptyMessage={<EmptyState icon={SearchX} title="No configurations match" description="Remove a filter or clear the text filter." action={<Button variant="outline" onClick={reset}><RotateCcw aria-hidden="true" />Reset filters</Button>} className="py-6" />}
        action={
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs tabular-nums" data-testid="result-count" aria-live="polite">{rows.length} of {all.length}</span>
            <Badge variant="outline" title={sloSummary()} data-testid="slo-preset-chip">{presetName} SLO</Badge>
            <Button variant="outline" size="sm" onClick={() => exportRows(rows, "deployments")}><Download aria-hidden="true" />Export CSV</Button>
          </span>
        }
        toolbar={
          <>
            {state.query ? (
              <Button variant="outline" size="sm" className="h-8 border-dashed" data-testid="query-chip" aria-label={`Clear text filter “${state.query}”`} onClick={() => updateView((s) => { s.query = ""; })}>
                <span className="text-muted-foreground">Matching</span><span className="max-w-40 truncate">{state.query}</span><X aria-hidden="true" />
              </Button>
            ) : null}
            <FacetedFilter title="Engine" selected={state.runtime} onChange={(values) => updateView((s) => { s.runtime = values; })} options={facet(["vLLM", "SGLang"], (value) => all.filter((row) => row.deployment.runtime === value).length)} />
            <FacetedFilter title="Precision" selected={state.precision} onChange={(values) => updateView((s) => { s.precision = values; })} options={facet(precisions, (value) => all.filter((row) => row.deployment.precision === value).length)} />
            <FacetedFilter title="GPUs" selected={shapes} onChange={setShapes} options={facet(shapeValues, (value) => all.filter((row) => hardwareShape(row.deployment) === value).length)} />
            <Combobox label="Model" testId="model-filter" value={state.model} onChange={(value) => updateView((s) => { s.model = value; })} className="w-44" searchPlaceholder="Search models…" options={[{ value: "all", label: "All models" }, ...state.snapshot.models.map((model) => ({ value: model.id, label: model.name, detail: `${model.architecture} · ${all.filter((row) => row.model.id === model.id).length} configs` }))]} />
            {filtered ? <Button variant="ghost" onClick={reset} data-testid="reset-filters"><X aria-hidden="true" />Reset</Button> : null}
          </>
        }
      />
      <LoadLevelHeatmap rows={rows.filter((row) => isMeasured(row.deployment))} />
    </div>
  );
}
