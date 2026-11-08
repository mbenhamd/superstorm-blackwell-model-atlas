import * as React from "react";
import { Activity, ArrowDown, ChevronRight, Columns2, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { groupSetups, hasMeasuredLevels, sortSetups, type SetupEntry, type SetupSort } from "../../../domain/setups.js";
import type { VariantRow } from "../../../domain/variants.js";
import type { Deployment } from "../../../domain/types.js";
import type { ExternalRecord } from "../../../domain/external.js";
import { appState, MAX_COMPARE, navigate, routeUrl, update, useAppState } from "../../state.js";
import { configLabel, num, shape } from "../../lib/display.js";
import { artifact } from "../../lib/atlas.js";
import { exportRows } from "../../lib/export.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { openRun } from "./overlays.js";
import { EngineBuild } from "./engine-build.js";
import { Panel } from "./primitives.js";
import { ConfigChips, RunQualityBadge } from "./performance.js";
import { StatusBadge } from "./status-badge.js";
import { chipsOf, enginesOf, isFiltered, matchesFilter, NO_FILTER, precisionOf, shapeKey, shapeLabel, specDecodeOf, variantName, type LadderFilter } from "./tldr-data.js";
import { Bar, cmax, dateOf, Missing, StandingCell, TIE_NOTE, tpm, useSetupEntries } from "./tldr-parts.js";
import { PublishedLine, usePublishedByConfiguration } from "./tldr-published.js";

/*
 * TL;DR setups ladder: every setup of one model × GPU shape on the active dataset and SLO. A measured setup is a
 * variant (configuration × shape × recorded runtime_config, fronted by its best run across engine versions, "best of N
 * runtimes"); a catalog configuration without a run there is a planning row. Grouped by weights export, always
 * expanded: sustainable tok/min/GPU with a bar scaled to the best, Δ vs best (±3% = tie), C_max, p95 latencies at
 * C_max, latest run. Filter chips (engine, precision, speculative decoding) hide rows but never re-elect the best.
 * At ≥1280px the full recorded knob string is each row's second line and the header is sticky; any row expands to its
 * full knobs and every run of the variant. Published (external) records that state an exact catalog setup appear as a
 * muted sub-row under the first row of that setup, never in the ranking columns. Ranking and Δ: domain/setups.ts.
 */

const gb = (bytes: number | null | undefined) => (bytes ? `${num(bytes / 1e9, bytes >= 1e11 ? 0 : 1)} GB` : null);
const PRECISIONS = ["BF16", "FP8", "FP4/FP8", "MXFP4", "NVFP4"];

/** Incomplete / errored requests of the fronting run as one compact badge (full counts in its label and title). */
function RunWarnings({ row, className }: { row: VariantRow; className?: string }) {
  return <RunQualityBadge incomplete={row.capacity.incomplete} errored={row.capacity.errored} className={className} />;
}

/**
 * Setup identity: knob (the row's one evidence-sheet trigger), precision chip, probe badge and an optional slot.
 * `dense` (ladder table): one line; a long knob name ends in an ellipsis (full name in the title and the evidence sheet).
 */
function SetupName({ row, extra, dense = false }: { row: VariantRow; extra?: React.ReactNode; dense?: boolean }) {
  const d = row.deployment;
  const knob = d.knob ?? "Baseline";
  return (
    <span className={cn("flex min-w-0 items-center gap-x-2 gap-y-1", dense ? "flex-nowrap leading-5" : "flex-wrap")}>
      <button type="button" className={cn("hover:text-link min-w-0 text-left text-[13px] font-medium outline-none hover:underline focus-visible:underline", dense && "truncate")} title={dense ? knob : undefined} data-action="open-run" aria-label={`Open evidence: ${configLabel(d)}`} onClick={(event) => { event.stopPropagation(); openRun(d.id); }}>
        {knob}
      </button>
      <Badge variant="mono" title={artifact(d.artifactId)?.precisionDetail ?? d.quantMethod}>{d.precision}</Badge>
      {d.status === "candidate" ? null : <StatusBadge deployment={d} />}
      {extra}
    </span>
  );
}

/**
 * Two lines at most: the configured engine build (the latest release recheck folded into an icon with its tooltip),
 * then, when measured, the best run's runtime_version and "best of N runtimes". `dense` (ladder table) keeps each on
 * one line, truncating a long tag (full text in the title); cards wrap.
 */
function Runtime({ row, dense = false }: { row: VariantRow; dense?: boolean }) {
  const d = row.deployment, variant = row.variant;
  return (
    <span className="flex min-w-0 flex-col">
      <EngineBuild deployment={d} recheck="icon" />
      {variant && d.runtimeTag ? (
        <span className={cn("text-muted-foreground flex min-w-0 items-center gap-x-1.5 font-mono text-[11px] leading-4", dense ? "flex-nowrap" : "flex-wrap")} title={`runtime_version recorded by the variant's best run: ${d.runtimeTag}`}>
          <span className={cn("min-w-0", dense ? "truncate" : "whitespace-nowrap")}>ran {d.runtimeTag}</span>
          {/* Dense: "best of N" (the column header says "best of N runtimes"), so the run's tag keeps its width. */}
          {variant.runtimeCount > 1 ? <span className="shrink-0 font-sans whitespace-nowrap" data-runtime-count={variant.runtimeCount} title={`Best of ${variant.runtimeCount} runtimes (engine versions) measured with this runtime config: ${variant.runtimeVersions.join(", ")}`}>· best of {variant.runtimeCount}{dense ? "" : " runtimes"}</span> : null}
        </span>
      ) : null}
    </span>
  );
}

/** Full recorded knob string (measured) or configured engine arguments as chips (planning), one muted mono line. */
/**
 * Full recorded knob string (measured) or configured engine arguments (planning) as one muted mono line; a string
 * wider than the column ends in an ellipsis, the whole string is in the title and in the expanded row.
 */
function KnobLine({ row, className }: { row: VariantRow; className?: string }) {
  const knobs = chipsOf(row).join(" · ");
  if (!knobs) return null;
  return <span className={cn("text-muted-foreground block truncate font-mono text-[11px] leading-4", className)} data-knob-string title={`${row.variant ? "Recorded runtime_config" : "Configured engine arguments (catalog)"}: ${knobs}`}>{knobs}</span>;
}

/** True when the configuration's newest run on the dataset (what Compare, Throughput and the evidence sheet open) is not this row's run. */
function opensOtherRun(row: VariantRow): Deployment | null {
  if (!row.variant) return null;
  const current = appState.snapshot.deployments.find((item) => item.id === row.deployment.id);
  return current && current.runId && current.runId !== row.deployment.runId ? current : null;
}

/**
 * Row actions: expand (full knobs and every run), add the configuration to compare (Compare holds configurations and
 * opens their newest run; the label says so when that is not this variant's run), and open this variant in Throughput:
 * the link carries the variant's best run (`rid`), so the runtime-config and run pickers preselect it.
 */
function RowActions({ row, selected, full, expanded, onExpand }: { row: VariantRow; selected: Set<string>; full: boolean; expanded: boolean; onExpand: () => void }) {
  const d = row.deployment;
  const inCompare = selected.has(d.configurationId) || selected.has(d.id);
  const label = configLabel(d);
  const other = opensOtherRun(row);
  const note = other ? ` (Compare holds configurations and opens this one's newest run, ${other.runtimeTag ?? ""} ${dateOf(other.measuredAt) ?? ""}, not this variant's best run)` : "";
  const bestRun = row.variant?.best.run.id;
  const throughputHref = routeUrl("throughput", bestRun ? { run: d.id, rid: bestRun } : { run: d.id });
  const toggle = () => update((s) => { s.selected = s.selected.includes(d.id) ? s.selected.filter((id) => id !== d.id) : s.selected.length >= MAX_COMPARE ? s.selected : [...s.selected, d.id]; });
  return (
    <span className="flex shrink-0 items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
      <Button size="icon" variant="ghost" className="size-7" onClick={onExpand} aria-expanded={expanded} aria-label={`${expanded ? "Hide" : "Show"} knobs and runs: ${label}`} title={expanded ? "Hide knobs and runs" : "Full knobs and every run"} data-action="expand">
        <ChevronRight className={cn("transition-transform", expanded && "rotate-90")} aria-hidden="true" />
      </Button>
      <label className={cn("hover:bg-accent flex size-7 items-center justify-center rounded-md", !inCompare && full ? "cursor-not-allowed" : "cursor-pointer")} title={!inCompare && full ? `Compare holds ${MAX_COMPARE} setups` : `${inCompare ? "Remove" : "Add"} ${other ? "the configuration" : "this setup"} ${inCompare ? "from" : "to"} compare${note}`}>
        <Checkbox checked={inCompare} disabled={!inCompare && full} onCheckedChange={toggle} aria-label={inCompare ? `Remove ${label}${other ? " configuration" : ""} from compare` : `Add ${label}${other ? " configuration" : ""} to compare`} data-action="compare" data-adds="configuration" />
      </label>
      <Button size="icon" variant="ghost" className="size-7" asChild>
        <a href={throughputHref} aria-label={`Throughput: ${label}${bestRun ? " (this variant's best run)" : ""}`} title={bestRun ? "Open this variant's best run in Throughput" : "Open in Throughput"} data-action="throughput" data-run-id={bestRun}><Activity aria-hidden="true" /></a>
      </Button>
    </span>
  );
}

/** Expanded detail: the full knob list and, for a measured variant, every run (engine version, date, values) newest first. */
function VariantDetail({ row }: { row: VariantRow }) {
  const variant = row.variant;
  const other = opensOtherRun(row);
  const chips = chipsOf(row);
  return (
    <div className="flex min-w-0 flex-col gap-2 py-1 text-xs" data-variant-detail={row.key}>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-muted-foreground">{variant ? "Recorded runtime_config (every key)" : "Configured engine arguments (catalog; not measured)"}</span>
        {chips.length ? <span className="flex flex-wrap gap-1">{chips.map((chip, index) => <Badge key={`${chip}-${index}`} variant="mono" className="h-auto max-w-full py-0.5 whitespace-normal break-all">{chip}</Badge>)}</span> : <Missing />}
      </span>
      {variant ? (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-muted-foreground">{variant.runCount} run{variant.runCount === 1 ? "" : "s"} on {variant.runtimeCount} engine version{variant.runtimeCount === 1 ? "" : "s"} · {variant.numGpus}× {variant.gpuType}{variant.maxSystemReplicas > 1 ? ` · ${variant.maxSystemReplicas} replicas` : ""} · newest first</span>
          <span className="grid w-fit grid-cols-[auto_auto_auto_auto_auto] gap-x-4 gap-y-0.5 tabular-nums" role="table" aria-label="Runs of this variant">
            <span role="row" className="contents text-muted-foreground">
              <span role="columnheader">Runtime version</span><span role="columnheader">Run date</span><span role="columnheader" className="text-right">Sustainable tok/min/GPU</span><span role="columnheader" className="text-right">C_max</span><span role="columnheader"><span className="sr-only">Role</span></span>
            </span>
            {variant.runs.map((item) => {
              const fronts = item.run.id === variant.best.run.id;
              return (
                <span role="row" key={item.run.id} className="contents" data-variant-run={item.run.id} data-fronts={fronts || undefined}>
                  <span role="cell" className="font-mono text-[11px]">{item.run.identity.runtimeVersion}</span>
                  <span role="cell">{dateOf(item.run.runDate)}</span>
                  <span role="cell" className="text-right">{item.capacity.sustainableTpmPerGpu === null ? <Missing /> : num(item.capacity.sustainableTpmPerGpu)}</span>
                  <span role="cell" className="text-right">{item.capacity.highestPassingConcurrency === null ? <Missing /> : num(item.capacity.highestPassingConcurrency)}</span>
                  <span role="cell">{fronts ? <Badge variant="outline">fronts this row</Badge> : null}</span>
                </span>
              );
            })}
          </span>
          {other ? <span className="text-muted-foreground text-pretty">Throughput opens this variant's best run; Compare and the evidence sheet open the configuration's newest run ({other.runtimeTag} · {dateOf(other.measuredAt)}).</span> : null}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Export identity for a group: label, precision (only when the label does not already start with it, so no
 * "FP8 [FP8]"), weights ("— GB" when the catalog records no size), repository and setup counts.
 */
function GroupHeader({ entries }: { entries: SetupEntry<VariantRow>[] }) {
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

/** Filter chips: engine family, precision, speculative decoding. Only facets with more than one value are offered. */
function FilterBar({ rows, filter, onFilter, shown }: { rows: VariantRow[]; filter: LadderFilter; onFilter: (filter: LadderFilter) => void; shown: number }) {
  const engines = enginesOf(rows);
  const precisions = PRECISIONS.filter((precision) => rows.some((row) => precisionOf(row.deployment) === precision));
  const specs = new Set(rows.map((row) => specDecodeOf(row.deployment)));
  const facets = (engines.length > 1 ? 1 : 0) + (precisions.length > 1 ? 1 : 0) + (specs.size > 1 ? 1 : 0);
  if (!facets) return null;
  const count = (predicate: (row: VariantRow) => boolean) => rows.filter(predicate).length;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2" role="toolbar" aria-label="Filter setups" data-testid="setup-filters">
      {engines.length > 1 ? (
        <ToggleGroup type="multiple" variant="outline" size="sm" value={filter.engines} aria-label="Engine" data-testid="filter-engine" onValueChange={(value: string[]) => onFilter({ ...filter, engines: value })}>
          {engines.map((engine) => <ToggleGroupItem key={engine} value={engine} className="px-2.5" data-filter={engine}>{engine} <span className="text-muted-foreground tabular-nums">{count((row) => row.deployment.runtime === engine)}</span></ToggleGroupItem>)}
        </ToggleGroup>
      ) : null}
      {precisions.length > 1 ? (
        <ToggleGroup type="multiple" variant="outline" size="sm" value={filter.precisions} aria-label="Precision" data-testid="filter-precision" onValueChange={(value: string[]) => onFilter({ ...filter, precisions: value })} className="flex-wrap">
          {precisions.map((precision) => <ToggleGroupItem key={precision} value={precision} className="px-2.5" data-filter={precision}>{precision} <span className="text-muted-foreground tabular-nums">{count((row) => precisionOf(row.deployment) === precision)}</span></ToggleGroupItem>)}
        </ToggleGroup>
      ) : null}
      {specs.size > 1 ? (
        <ToggleGroup type="single" variant="outline" size="sm" value={filter.spec} aria-label="Speculative decoding" data-testid="filter-spec" onValueChange={(value: string) => { if (value) onFilter({ ...filter, spec: value as LadderFilter["spec"] }); }}>
          <ToggleGroupItem value="all" className="px-2.5">Spec decode: any</ToggleGroupItem>
          <ToggleGroupItem value="on" className="px-2.5" data-filter="spec-on">On <span className="text-muted-foreground tabular-nums">{count((row) => specDecodeOf(row.deployment))}</span></ToggleGroupItem>
          <ToggleGroupItem value="off" className="px-2.5" data-filter="spec-off">Off <span className="text-muted-foreground tabular-nums">{count((row) => !specDecodeOf(row.deployment))}</span></ToggleGroupItem>
        </ToggleGroup>
      ) : null}
      <span className="text-muted-foreground text-xs tabular-nums" data-testid="filter-count">{shown} of {rows.length} shown</span>
      {isFiltered(filter) ? <Button size="sm" variant="ghost" onClick={() => onFilter(NO_FILTER)} data-testid="filter-clear"><X aria-hidden="true" />Clear</Button> : null}
    </div>
  );
}

/** Height of the page's sticky region (TEST DATA banner + top bar) so the ladder header sticks just below it. */
function useStickyOffset(): number {
  const [offset, setOffset] = React.useState(48);
  React.useEffect(() => {
    const region = document.getElementById("main-content")?.previousElementSibling;
    if (!(region instanceof HTMLElement)) return;
    const measure = () => setOffset(region.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(region);
    return () => observer.disconnect();
  }, []);
  return offset;
}

export function SetupsTable({ modelId, shape: shapeFilter, sort, filter, onFilter, showWeak }: { modelId: string; shape: string; sort: SetupSort; filter: LadderFilter; onFilter: (filter: LadderFilter) => void; showWeak: boolean }) {
  const state = useAppState();
  const narrow = useMediaQuery(NARROW_MD);
  const sticky = useStickyOffset();
  const { rows, entries } = useSetupEntries(modelId, shapeFilter, state.workload);
  const published = usePublishedByConfiguration(modelId, showWeak);
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(new Set());
  const model = state.snapshot.models.find((item) => item.id === modelId);
  if (!model) return null;
  const nameOf = (row: VariantRow) => variantName(row, rows);
  const visible = entries.filter((entry) => matchesFilter(entry.row, filter));
  const sorted = sortSetups(visible, sort, nameOf);
  const groups = groupSetups(sorted, (entry) => entry.row.deployment.artifactId);
  const leader = entries.find((entry) => entry.standing.kind === "best")?.row ?? null;
  const leaderName = leader ? nameOf(leader) : undefined;
  const best = leader ? tpm(leader) : null;
  const ranked = entries.filter((entry) => entry.position !== null);
  const maxCmax = Math.max(0, ...entries.map((entry) => cmax(entry.row) ?? 0)) || null;
  const measured = entries.filter((entry) => hasMeasuredLevels(entry.row)).length;
  const selected = new Set(state.selected);
  const full = selected.size >= MAX_COMPARE;
  const shapes = [...new Set(entries.map((entry) => shapeKey(entry.row.deployment)))];
  // The GPU shape is in the panel scope line when only one is listed; rows repeat it only for "All shapes" with several.
  const showShape = shapes.length > 1;
  const measuredEngines = enginesOf(entries.filter((entry) => hasMeasuredLevels(entry.row)).map((entry) => entry.row));
  // Compare holds configurations: the top three distinct configurations (two variants of one configuration count once).
  const topIds = [...new Set(ranked.map((entry) => entry.row.deployment.id))].slice(0, 3);
  const compareTop = () => {
    appState.selected = [...topIds]; appState.compare = [...topIds];
    navigate("compare", { runs: topIds.join(",") });
  };
  const toggleExpanded = (key: string) => setExpanded((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const scope = [model.name, shapeFilter ? shapeLabel(shapeFilter) : shapes.length === 1 ? shapeLabel(shapes[0]!) : "all shapes", state.workload].join(" · ");
  const compareDisabled = topIds.length < 2;
  // Nothing measured on this dataset: the metric columns would be "—" in every row, so they collapse into one
  // "Metrics · not measured" column (DESIGN.md › Tables) and the dashed tracks are dropped.
  const collapsed = measured === 0;
  const columns = collapsed ? 5 : 9;
  const compareReason = `Needs ≥2 measured setups with a sustainable value on ${state.workload}; ${topIds.length} now.`;
  // Compare holds configurations: say so on the button, since ladder ranks are variants (rank 3 can be a second
  // runtime config of rank 1's configuration, which then counts once).
  const lastTop = topIds.length ? ranked.findIndex((entry) => entry.row.deployment.id === topIds.at(-1)) : -1;
  const skipped = lastTop + 1 - topIds.length;
  const compareNote = `Top ${topIds.length} configurations by sustainable tok/min/GPU; variants of one configuration count once${skipped > 0 ? ` (${skipped} ladder row${skipped === 1 ? "" : "s"} skipped)` : ""}. Compare opens each configuration's newest run on ${state.workload}.`;
  const compareButton = (
    <Button size="sm" variant="outline" onClick={compareTop} disabled={compareDisabled} data-testid="compare-top" data-skipped={skipped > 0 ? skipped : undefined} aria-describedby={compareDisabled ? "compare-top-reason" : "compare-top-note"}><Columns2 aria-hidden="true" />Compare top {topIds.length === 2 ? 2 : 3}</Button>
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
  // Published sub-rows: under the first displayed row of each configuration that external records match exactly.
  const publishedAt = new Map<string, ExternalRecord[]>();
  const placed = new Set<string>();
  for (const entry of sorted) {
    const id = entry.row.deployment.configurationId, records = published.get(id);
    if (records && !placed.has(id)) { placed.add(id); publishedAt.set(entry.row.key, records); }
  }
  const publishedCount = [...publishedAt.values()].reduce((total, list) => total + list.length, 0);
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
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>{compareButton}</TooltipTrigger>
              <TooltipContent className="max-w-72 text-pretty" data-testid="compare-top-tooltip">{compareNote}</TooltipContent>
            </Tooltip>
          )}
          {compareDisabled ? <span id="compare-top-reason" className="sr-only">{compareReason}</span> : <span id="compare-top-note" className="sr-only">{compareNote}</span>}
          <Button size="sm" variant="ghost" onClick={toChampions} data-testid="jump-champions" title="Scroll to Champions by workload"><ArrowDown aria-hidden="true" />Champions by workload</Button>
          <Button size="sm" variant="outline" onClick={() => exportRows(sorted.map((entry) => entry.row), `tldr-${model.id}`)}><Download aria-hidden="true" />Export</Button>
        </>
      }
      bodyClassName="p-0"
    >
      <FilterBar rows={rows} filter={filter} onFilter={onFilter} shown={visible.length} />
      {entries.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-[13px]">No setup of {model.name} on this GPU shape.</p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-[13px]" data-testid="filter-empty">No setup matches these filters. <button type="button" className="text-link hover:underline" onClick={() => onFilter(NO_FILTER)}>Clear filters</button></p>
      ) : narrow ? (
        <div className="divide-y" data-testid="setups-table" data-layout="cards">
          {groups.map((group) => (
            <section key={group.key} data-setup-group={group.key} aria-label={group.items[0]!.row.deployment.exportLabel}>
              <div className="bg-subtle border-b px-4 py-2"><GroupHeader entries={group.items} /></div>
              <ul className="divide-y">
                {group.items.map((entry) => (
                  <SetupCard key={entry.row.key} entry={entry} best={best} leader={leader} leaderName={leaderName} collapsed={collapsed} published={publishedAt.get(entry.row.key)} expanded={expanded.has(entry.row.key)}
                    actions={<RowActions row={entry.row} selected={selected} full={full} expanded={expanded.has(entry.row.key)} onExpand={() => toggleExpanded(entry.row.key)} />} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto xl:overflow-visible" data-testid="setups-table" data-layout="table" data-collapsed={collapsed || undefined} style={{ "--tldr-sticky": `${sticky}px` } as React.CSSProperties}>
          <table data-slot="table" className={cn("w-full table-fixed caption-bottom text-sm", collapsed ? "min-w-[760px]" : "min-w-[940px]")}>
            <colgroup>
              {collapsed
                ? <><col className="w-8" /><col className="w-[42%]" /><col className="w-[200px]" /><col /><col className="w-[100px]" /></>
                : <><col className="w-9" /><col /><col className="w-[212px]" /><col className="w-[120px]" /><col className="w-[116px]" /><col className="w-[60px]" /><col className="w-[100px]" /><col className="w-[100px]" /><col className="w-[100px]" /></>}
            </colgroup>
            <TableHeader className="[&_th]:bg-card xl:[&_th]:sticky xl:[&_th]:top-[var(--tldr-sticky)] xl:[&_th]:z-10 xl:[&_th]:shadow-[inset_0_-1px_0_var(--border)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right" title="Rank by sustainable tok/min/GPU">#</TableHead>
                <TableHead>Setup <span className="text-muted-foreground font-normal max-xl:hidden">· recorded knobs</span></TableHead>
                <TableHead className="h-auto py-1.5 leading-tight" title="Configured engine build (recheck icon: latest release recheck), then the run that fronts the row and how many runtimes it is the best of">Runtime<span className="text-muted-foreground block font-normal">configured · ran, best of N runtimes</span></TableHead>
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
                  <TableCell colSpan={columns} className="py-1.5 whitespace-normal"><GroupHeader entries={group.items} /></TableCell>
                </TableRow>
                {group.items.map((entry) => {
                  const { row } = entry, d = row.deployment;
                  const value = tpm(row), c = cmax(row), point = row.capacity.selectedPoint;
                  const open = expanded.has(row.key);
                  const external = publishedAt.get(row.key);
                  return (
                    <React.Fragment key={row.key}>
                      <TableRow data-setup-row={d.configurationId} data-variant-key={row.key} data-standing={entry.standing.kind} data-position={entry.position ?? undefined} aria-selected={selected.has(d.id) || undefined} className={cn("[&>td]:py-1", open && "border-b-0")}>
                        <TableCell className="text-muted-foreground text-right align-top text-xs tabular-nums">{entry.position ?? ""}</TableCell>
                        <TableCell className="align-top whitespace-normal">
                          <SetupName row={row} dense extra={showShape ? <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">{shapeLabel(shapeKey(d))} · {shape(d)}</span> : undefined} />
                          <ConfigChips deployment={d} max={collapsed ? 4 : 3} className="mt-1 xl:hidden" />
                          <KnobLine row={row} className="max-xl:hidden" />
                        </TableCell>
                        <TableCell className="align-top text-[13px] whitespace-normal"><Runtime row={row} dense /></TableCell>
                        {collapsed ? (
                          <TableCell className="align-top"><StandingCell standing={entry.standing} leader={leader} leaderName={leaderName} /></TableCell>
                        ) : (
                          <>
                            <TableCell className="text-right align-top">
                              <span className="block text-[13px] font-medium tabular-nums">{value === null ? <Missing /> : num(value)}</span>
                              <Bar value={value} max={best} best={entry.standing.kind === "best"} className="mt-1.5 ml-auto w-28" />
                            </TableCell>
                            <TableCell className="align-top"><StandingCell standing={entry.standing} leader={leader} leaderName={leaderName} /></TableCell>
                            <TableCell className="text-right align-top tabular-nums">
                              <span className="block text-[13px]">{c === null ? <Missing /> : num(c)}</span>
                              {hasMeasuredLevels(row) ? <Bar value={c} max={maxCmax} best={false} className="mt-1.5 ml-auto w-12" /> : null}
                            </TableCell>
                            <TableCell className="text-right align-top text-[13px] tabular-nums">
                              {point ? <>{num(point.ttftP95Ms)} <span className="text-muted-foreground">/</span> {num(point.itlP95Ms, 1)}</> : <Missing />}
                            </TableCell>
                            <TableCell className="align-top text-[13px] whitespace-normal tabular-nums">
                              <span className="block leading-5 whitespace-nowrap">{dateOf(row.variant?.latestRunDate ?? d.measuredAt) ?? <Missing />}</span>
                              <RunWarnings row={row} className="flex w-fit" />
                            </TableCell>
                          </>
                        )}
                        <TableCell className="align-top"><RowActions row={row} selected={selected} full={full} expanded={open} onExpand={() => toggleExpanded(row.key)} /></TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow className={cn("hover:bg-transparent", external && "border-b-0")} data-detail-for={row.key}>
                          <TableCell />
                          <TableCell colSpan={columns - 1} className="pt-0 whitespace-normal"><VariantDetail row={row} /></TableCell>
                        </TableRow>
                      ) : null}
                      {external ? (
                        <TableRow className="hover:bg-transparent" data-published-row={d.configurationId}>
                          <TableCell />
                          <TableCell colSpan={columns - 1} className="h-auto pt-0 pb-2 whitespace-normal">
                            <span className="flex flex-col gap-1">{external.slice(0, 2).map((record) => <PublishedLine key={record.id} record={record} />)}
                              {external.length > 2 ? <a href="#published" className="text-link w-fit text-xs hover:underline" onClick={(event) => { event.preventDefault(); document.getElementById("published")?.scrollIntoView({ block: "start" }); }}>+{external.length - 2} more published for this setup</a> : null}
                            </span>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            ))}
          </table>
        </div>
      )}
      <p className="text-muted-foreground border-t px-4 py-2 text-xs text-pretty" data-testid="setups-caption" data-measured={measured}>
        {measured === 0
          ? <>No measured setup on {state.workload} yet; ranking appears once runs are imported. Sustainable = total tok/s at C_max × {num(state.slo.margin, 2)} margin × 60 ÷ GPUs, under the active SLO.</>
          : <>A measured setup is one recorded runtime config of a configuration, shown with its best run across engine versions ("best of N runtimes"). Sustainable = total tok/s at C_max × {num(state.slo.margin, 2)} margin × 60 ÷ GPUs, under the active SLO. Bars scale to the best measured value for this model; the best is highlighted. Δ vs best = (setup − best) ÷ best, against all {entries.length} setups even when filters hide some. {TIE_NOTE} Unmeasured setups are listed last.</>}
        {publishedCount ? <> {publishedCount} published (external) record{publishedCount === 1 ? "" : "s"} matching a setup sit under it, outside the ranking.</> : null}
        {measuredEngines.length > 1 ? <> {model.name} was measured on {measuredEngines.length} engine families{shapeFilter ? ` on ${shapeLabel(shapeFilter)}` : ""} — <a href={routeUrl("engine", { model: model.id })} className="text-link hover:underline" data-testid="setups-engine-link">open the engine head-to-head</a>.</> : null}
      </p>
    </Panel>
  );
}

/** Phone layout: one stacked card per setup (setup line, runtime line, metric line with bar and Δ, chips wrap). */
function SetupCard({ entry, best, leader, leaderName, collapsed, actions, published, expanded }: { entry: SetupEntry<VariantRow>; best: number | null; leader: VariantRow | null; leaderName?: string; collapsed: boolean; actions: React.ReactNode; published?: ExternalRecord[]; expanded: boolean }) {
  const { row } = entry, d = row.deployment;
  const value = tpm(row), c = cmax(row), point = row.capacity.selectedPoint;
  const date = dateOf(row.variant?.latestRunDate ?? d.measuredAt);
  return (
    <li className="flex min-w-0 flex-col gap-1.5 px-4 py-3" data-setup-row={d.configurationId} data-variant-key={row.key} data-standing={entry.standing.kind} data-position={entry.position ?? undefined}>
      <span className="flex min-w-0 items-start gap-2">
        {entry.position !== null ? <span className="text-muted-foreground mt-px w-5 shrink-0 text-xs tabular-nums">#{entry.position}</span> : null}
        <span className="min-w-0 flex-1"><SetupName row={row} /></span>
        {actions}
      </span>
      <span className="text-muted-foreground flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
        <Runtime row={row} />
        <span className="tabular-nums">{shapeLabel(shapeKey(d))} · {shape(d)}</span>
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-[13px] tabular-nums">{value === null ? <Missing /> : <><span className="font-semibold">{num(value)}</span> <span className="text-muted-foreground text-[11px]">tok/min/GPU</span></>}</span>
        {collapsed ? <span className="flex-1" /> : <Bar value={value} max={best} best={entry.standing.kind === "best"} className="min-w-8 flex-1" />}
        <span className="shrink-0"><StandingCell standing={entry.standing} leader={leader} leaderName={leaderName} compact /></span>
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
      {expanded ? <VariantDetail row={row} /> : null}
      {published?.length ? <span className="flex min-w-0 flex-col gap-1">{published.slice(0, 2).map((record) => <PublishedLine key={record.id} record={record} />)}</span> : null}
    </li>
  );
}

