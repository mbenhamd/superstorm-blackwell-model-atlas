import * as React from "react";
import { ExternalLink, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  bestPublished, derivationText, displayFlags, displayUnit, engineFamily, externalCoverage, filterExternal, flagLabels, hardwareClass, hardwareStatus, HARDWARE_CLASSES, isWeak, metricIndexes, metricName, recordDate,
  VERSION_CLASS_LABELS, weakReasons, type ExternalLevel, type ExternalMetric, type ExternalRecord, type MetricKind,
} from "../../../domain/external.js";
import { routeUrl, useAppState } from "../../state.js";
import { num } from "../../lib/display.js";
import { externalDataset } from "../../lib/external.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { Panel } from "./primitives.js";
import { VersionString } from "./published-badges.js";

/*
 * TL;DR "Published results": external published benchmarks of the selected model (evidence class "external": third
 * parties, engine projects, vendors). Shown beside the measured ladder, never inside it: no value here enters a rank,
 * a sustainable rate, C_max, Δ vs best, ties or champions, and no SLO is applied. Every number keeps the source's
 * metric name and unit, its source (publisher, date, link, evidence class), hardware, engine build with its audit class
 * and its caveats. Weak records (invalid engine version, unverified extraction, superseded run) are hidden by default.
 */

const ENGINE_LABEL: Record<string, string> = { vllm: "vLLM", sglang: "SGLang", "tensorrt-llm": "TensorRT-LLM", dynamo: "Dynamo" };
export const engineLabel = (family: string | null): string => (family ? ENGINE_LABEL[family] ?? family : "Engine not stated");
const ALL = "all";
/** Headline metric order for a record: per-GPU output first, then per-GPU total, then aggregate and per-user rates. */
const HEADLINE_KINDS: readonly MetricKind[] = ["output-per-gpu", "total-per-gpu", "output", "total", "per-user"];

/** The record's highest published value of its first headline metric kind (levels with a qualifier skipped). */
export function headline(record: ExternalRecord): { metric: ExternalMetric; level: ExternalLevel; value: number } | null {
  for (const kind of HEADLINE_KINDS) {
    let best: { metric: ExternalMetric; level: ExternalLevel; value: number } | null = null;
    for (const index of metricIndexes(record, kind)) {
      for (const level of record.levels) {
        const value = level.values[index];
        if (value === null || value === undefined || level.details[index]?.qualifier) continue;
        if (!best || value > best.value) best = { metric: record.metrics[index]!, level, value };
      }
    }
    if (best) return best;
  }
  return null;
}

/** "@ conc 64", "@ peak", or "" when the level states neither. */
const loadOf = (level: ExternalLevel): string => (level.concurrency !== null ? `@ conc ${num(level.concurrency)}` : level.label ? `@ ${level.label}` : level.requestRate !== null ? `@ ${num(level.requestRate, 2)} req/s` : "");
const digits = (value: number) => (Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2);

/** The model's external records, weak ones only when asked. */
export function usePublishedRecords(modelId: string, showWeak: boolean): { records: ExternalRecord[]; weak: number } {
  return React.useMemo(() => {
    const all = externalDataset().records.filter((record) => record.modelId === modelId);
    const records = filterExternal(all, { showWeak });
    return { records, weak: all.filter(isWeak).length };
  }, [modelId, showWeak]);
}

/** Records linked to a catalog configuration that carry a throughput figure, by configuration id (closest-configuration hints and figure-less records excluded; the Published page lists those). */
export function usePublishedByConfiguration(modelId: string, showWeak: boolean): Map<string, ExternalRecord[]> {
  const { records } = usePublishedRecords(modelId, showWeak);
  return React.useMemo(() => {
    const map = new Map<string, ExternalRecord[]>();
    for (const record of records) {
      if (!record.catalogConfigurationId || !headline(record)) continue;
      const list = map.get(record.catalogConfigurationId);
      if (list) list.push(record); else map.set(record.catalogConfigurationId, [record]);
    }
    return map;
  }, [records]);
}

/**
 * Engine as published, the resolved version inline in mono (long image tags clamp with an ellipsis; full string on
 * hover/focus) and the audit class as a badge (tooltip: published string, resolved tag, release date, class definition).
 */
function EngineAudit({ record, dense = false }: { record: ExternalRecord; dense?: boolean }) {
  const data = externalDataset();
  const audit = record.audit;
  const label = VERSION_CLASS_LABELS[audit.class];
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-x-1.5 gap-y-0.5", dense ? "flex-nowrap" : "flex-wrap")} data-version-class={audit.class}>
      <span className="shrink-0 font-medium">{record.engine}</span>
      <VersionString record={record} className={cn("text-[11px]", dense ? "line-clamp-1 max-w-[16ch] min-w-0" : "max-w-[28ch]")} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={audit.class === "stable" ? "outline" : audit.class === "invalid" ? "critical" : "neutral"} tabIndex={0} className="cursor-default" data-testid="version-class">{label}</Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-80 text-left text-pretty">
          <span className="block font-medium">Engine version as published: <span className="font-mono">{record.engineVersion}</span></span>
          {audit.canonical ? <span className="text-background/80 block">Resolved: <span className="font-mono">{audit.canonical}</span>{audit.releaseDate ? ` · released ${audit.releaseDate}` : ""}</span> : null}
          <span className="text-background/80 mt-1 block">{data.conventions.versionClasses[audit.class] ?? label}</span>
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

/** Caveat flags as short labels; the file's long description in each tooltip; the rest folded into "+N". */
function Flags({ record, max = 2 }: { record: ExternalRecord; max?: number }) {
  const data = externalDataset();
  const labels = flagLabels(record), flags = displayFlags(record);
  if (!labels.length) return <span className="text-muted-foreground text-xs">No caveat flag</span>;
  const shown = flags.slice(0, max), rest = flags.slice(max);
  const chip = (flag: string, index: number) => (
    <Tooltip key={`${flag}-${index}`}>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="bg-muted text-ink-2 max-w-full cursor-default rounded-[4px] px-1.5 py-0.5 text-[11px] leading-tight outline-none focus-visible:ring-2 focus-visible:ring-ring" data-flag={flag}>{labels[index]}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">{data.conventions.flags[flag] ?? labels[index]}</TooltipContent>
    </Tooltip>
  );
  return (
    <span className="flex min-w-0 flex-wrap gap-1">
      {shown.map((flag, index) => chip(flag, index))}
      {rest.length ? (
        <Tooltip>
          <TooltipTrigger asChild><span tabIndex={0} className="bg-muted text-ink-2 cursor-default rounded-[4px] px-1.5 py-0.5 text-[11px] leading-tight outline-none focus-visible:ring-2 focus-visible:ring-ring">+{rest.length}</span></TooltipTrigger>
          <TooltipContent className="max-w-72 text-pretty">{labels.slice(max).join(" · ")}</TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

/** Source: publisher (link), date, evidence class. */
function SourceCell({ record }: { record: ExternalRecord }) {
  const data = externalDataset();
  const source = data.sources[record.sourceId];
  const date = recordDate(record, data.sources);
  return (
    <span className="flex min-w-0 flex-col">
      {source ? (
        <a href={source.url} target="_blank" rel="noreferrer noopener" className="text-link inline-flex min-w-0 items-center gap-1 hover:underline" title={source.title} data-source-link={record.sourceId}>
          <span className="min-w-0 truncate">{source.publisher}</span><ExternalLink className="size-3 shrink-0" aria-hidden="true" />
        </a>
      ) : <span>{record.sourceId}</span>}
      <span className="text-muted-foreground text-xs">{date ?? "date not stated"} · {record.evidenceClass}</span>
    </span>
  );
}

/** Hardware as published; a badge marks a stated non-B300 GPU ("not B300") or a GPU type the source does not state. */
function HardwareCell({ record }: { record: ExternalRecord }) {
  const status = hardwareStatus(record);
  const count = record.gpuCount ? `${record.gpuCount}× ` : "";
  if (status === "target") return <span className="tabular-nums whitespace-nowrap">{count}{record.gpuType}</span>;
  if (status === "unstated") return <Badge variant="neutral" title="The source states no GPU type: unknown hardware, not a stated mismatch" data-hardware-unstated>{count}hardware not stated</Badge>;
  return <Badge variant="warning" title={`Not B300: published on ${record.gpuType}, other hardware than the console's target`} data-hardware-mismatch>{count}{record.gpuType}</Badge>;
}

/** Published value with its metric name and unit as the source states them; "derived" when computed as aggregate ÷ GPUs. */
function Value({ metric, value, level }: { metric: ExternalMetric; value: number; level: ExternalLevel }) {
  return (
    <span className="flex min-w-0 flex-col items-end text-right">
      <span className="whitespace-nowrap tabular-nums"><span className="text-[13px] font-semibold">{num(value, digits(value))}</span> <span className="text-muted-foreground text-[11px]">{displayUnit(metric) ?? ""}</span></span>
      <span className="text-muted-foreground max-w-full text-right text-[11px] leading-snug whitespace-normal text-pretty [overflow-wrap:anywhere]" data-load-level>
        {loadOf(level)}
        {metric.derived ? <> · <span title={metric.note ?? "Computed as the published aggregate ÷ GPU count, not published per GPU"} data-derived>derived</span></> : null}
      </span>
    </span>
  );
}

/**
 * One sub-row per matched record under a ladder setup, on a fixed grid so consecutive records align:
 * value + metric (unit normalised, "derived" once) · load | source + date | hardware + engine + audit class | caveats.
 * Narrow screens stack the four cells. Never in the ranking columns.
 */
export function PublishedLine({ record }: { record: ExternalRecord }) {
  const data = externalDataset();
  const top = headline(record);
  const source = data.sources[record.sourceId];
  const date = recordDate(record, data.sources);
  return (
    <span className="grid min-w-0 items-center gap-x-3 gap-y-1 text-xs md:grid-cols-[minmax(0,20rem)_minmax(0,14rem)_minmax(0,15rem)_minmax(0,1fr)]" data-published-record={record.id} data-published-grid="">
      <span className="flex min-w-0 items-center gap-2" data-cell="value">
        <Badge variant="outline" className="border-dashed" title="External published result: not measured here, never ranked">Published</Badge>
        {top ? (
          <span className="flex min-w-0 items-baseline gap-1 tabular-nums" title={`${num(top.value, digits(top.value))} ${displayUnit(top.metric) ?? ""} ${metricName(top.metric)}${top.metric.derived ? ` (${derivationText(top.metric, record.gpuCount)})` : ""} ${loadOf(top.level)}`}>
            <span className="text-foreground shrink-0 font-medium" data-unit={displayUnit(top.metric) ?? ""}>{num(top.value, digits(top.value))} {displayUnit(top.metric) ?? ""}</span>
            <span className="text-muted-foreground min-w-0 truncate">{metricName(top.metric)}{top.metric.derived ? " · derived" : ""}</span>
            <span className="text-muted-foreground shrink-0" data-load="">{loadOf(top.level)}</span>
          </span>
        ) : <span className="text-muted-foreground min-w-0 truncate" data-no-throughput>No throughput figure ({[...new Set(record.metrics.map((metric) => metric.name))].join(", ")})</span>}
      </span>
      <span className="flex min-w-0 items-center gap-1.5" data-cell="source">
        {source ? <a href={source.url} target="_blank" rel="noreferrer noopener" className="text-link inline-flex min-w-0 items-center gap-1 hover:underline" title={source.title}><span className="truncate">{source.publisher}</span><ExternalLink className="size-3 shrink-0" aria-hidden="true" /></a> : <span className="text-muted-foreground">source not resolved</span>}
        <span className="text-muted-foreground shrink-0 tabular-nums">{date ?? "date not stated"}</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5 overflow-hidden" data-cell="engine">
        <HardwareCell record={record} />
        <EngineAudit record={record} dense />
      </span>
      <span className="flex min-w-0 items-center gap-1" data-cell="flags">
        {record.mismatch ? <Badge variant="warning" title={`Linked to this setup, but differs: ${record.mismatch}`} data-differs="">differs<span className="sr-only">: {record.mismatch}</span></Badge> : null}
        <Flags record={record} max={2} />
        {isWeak(record) ? <Badge variant="critical" title={weakReasons(record).join("; ")}>weak record</Badge> : null}
      </span>
    </span>
  );
}

const engineKey = (record: ExternalRecord) => engineFamily(record) ?? "not-stated";

/**
 * Published results for one model: coverage chips (records per hardware and engine family), then the best published
 * output tok/s/GPU per hardware × engine family under the hardware / engine filters (default B300 when it has records).
 */
export function PublishedResults({ modelId, showWeak, onShowWeak }: { modelId: string; showWeak: boolean; onShowWeak: (value: boolean) => void }) {
  const state = useAppState();
  const narrow = useMediaQuery(NARROW_MD);
  const { records, weak } = usePublishedRecords(modelId, showWeak);
  const model = state.snapshot.models.find((item) => item.id === modelId);
  const coverage = externalCoverage(records);
  const hardwareOptions = HARDWARE_CLASSES.filter((hardware) => coverage.some((cell) => cell.hardware === hardware));
  const [hardwarePick, setHardware] = React.useState<string | null>(null);
  const [enginePick, setEngine] = React.useState<string>(ALL);
  React.useEffect(() => { setHardware(null); setEngine(ALL); }, [modelId]);
  const hardware = hardwarePick ?? (hardwareOptions.includes("B300") ? "B300" : ALL);
  const inHardware = records.filter((record) => hardware === ALL || hardwareClass(record.gpuType) === hardware);
  const engineCounts = new Map<string, number>();
  for (const record of records) engineCounts.set(engineKey(record), (engineCounts.get(engineKey(record)) ?? 0) + 1);
  const engineOptions = [...engineCounts.keys()].sort((a, b) => (a === "vllm" ? -1 : b === "vllm" ? 1 : a === "sglang" ? -1 : b === "sglang" ? 1 : a.localeCompare(b)));
  const engine = engineOptions.includes(enginePick) ? enginePick : ALL;
  const shown = inHardware.filter((record) => engine === ALL || engineKey(record) === engine);
  const best = bestPublished(shown, "output-per-gpu");
  const matched = shown.filter((record) => record.catalogConfigurationId).length;
  const ladders = shown.filter((record) => record.kind === "ladder").length;
  const hardwareLabel = hardware === ALL ? "all hardware" : hardware;
  const explorer = routeUrl("published", { model: modelId });
  // Empty state: one click to the other GPU classes. A class that publishes output tok/s/GPU switches the filter here;
  // one that only publishes other metrics opens the explorer on that model × GPU (this block shows output tok/s/GPU only).
  const engineMatch = (record: ExternalRecord) => engine === ALL || engineKey(record) === engine;
  const alternatives = best.length ? [] : hardwareOptions.filter((key) => key !== hardware).map((key) => {
    const own = records.filter((record) => hardwareClass(record.gpuType) === key && engineMatch(record));
    return { key, total: own.length, output: own.filter((record) => bestPublished([record], "output-per-gpu").length > 0).length };
  }).filter((item) => item.total > 0);
  const anyOutput = alternatives.some((item) => item.output > 0);
  return (
    <Panel
      id="published"
      className="scroll-mt-16"
      title={<>Published results <span className="text-muted-foreground font-normal">external · never ranked</span></>}
      description={<span data-testid="published-scope">{model?.name ?? modelId} · {records.length} record{records.length === 1 ? "" : "s"} from third parties, engine projects and vendors · not measured here, no SLO applied</span>}
      actions={
        <>
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            <Switch checked={showWeak} onCheckedChange={onShowWeak} aria-label="Show weak records" data-testid="published-weak" />
            Show weak records{weak ? <span className="tabular-nums"> ({weak})</span> : null}
          </label>
          <a href={explorer} className="text-link inline-flex items-center gap-1 text-xs hover:underline" data-testid="published-explorer"><Globe className="size-3.5" aria-hidden="true" />Open all published</a>
        </>
      }
      bodyClassName="p-0"
    >
      <div data-testid="published-results" data-records={records.length}>
        {records.length === 0 ? (
          <p className="text-muted-foreground px-4 py-4 text-[13px]">No published result of {model?.name ?? modelId}{weak && !showWeak ? ` outside ${weak} weak record${weak === 1 ? "" : "s"}` : ""}.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5" data-testid="published-coverage">
              <span className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Hardware</span>
                {coverage.map((cell) => (
                  <Badge key={cell.hardware} variant="neutral" title={`${cell.ladders} concurrency ladder${cell.ladders === 1 ? "" : "s"} · ${cell.points} single point${cell.points === 1 ? "" : "s"}`} data-coverage={cell.hardware}>
                    {cell.hardware === "other" ? "Other" : cell.hardware} <span className="text-foreground">{cell.ladders + cell.points}</span>
                  </Badge>
                ))}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Engines</span>
                {engineOptions.map((key) => <Badge key={key} variant="neutral" data-coverage-engine={key}>{key === "not-stated" ? "not stated" : engineLabel(key)} <span className="text-foreground">{engineCounts.get(key)}</span></Badge>)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2" role="toolbar" aria-label="Published results filters">
              <ToggleGroup type="single" variant="outline" size="sm" value={hardware} aria-label="Published hardware" data-testid="published-hardware" onValueChange={(value: string) => { if (value) setHardware(value); }} className="flex-wrap">
                <ToggleGroupItem value={ALL} className="px-2.5" data-hardware="all">All</ToggleGroupItem>
                {hardwareOptions.map((key) => <ToggleGroupItem key={key} value={key} className="px-2.5" data-hardware={key}>{key === "other" ? "Other" : key}</ToggleGroupItem>)}
              </ToggleGroup>
              <ToggleGroup type="single" variant="outline" size="sm" value={engine} aria-label="Published engine" data-testid="published-engine" onValueChange={(value: string) => { if (value) setEngine(value); }} className="flex-wrap">
                <ToggleGroupItem value={ALL} className="px-2.5">All engines</ToggleGroupItem>
                {engineOptions.map((key) => <ToggleGroupItem key={key} value={key} className="px-2.5" data-engine={key}>{key === "not-stated" ? "Not stated" : engineLabel(key)}</ToggleGroupItem>)}
              </ToggleGroup>
              <span className="text-muted-foreground text-xs tabular-nums">{shown.length} on {hardwareLabel} · {ladders} ladder{ladders === 1 ? "" : "s"} · {matched} matched to a catalog setup</span>
            </div>
            <BestPublished best={best} narrow={narrow} empty={
              <>
                No published output tok/s/GPU for {hardwareLabel}{engine === ALL ? "" : ` · ${engineLabel(engine === "not-stated" ? null : engine)}`}; {shown.length} record{shown.length === 1 ? "" : "s"} publish other metrics.
                {alternatives.length ? (
                  <span className="mt-2 flex flex-wrap items-center gap-1.5" data-testid="published-alternatives">
                    <span>{anyOutput ? "Show" : `No other GPU class publishes output tok/s/GPU for ${model?.name ?? modelId} either; open`}</span>
                    {alternatives.map((item) => item.output > 0 ? (
                      <Button key={item.key} size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setHardware(item.key)} data-alternative={item.key} data-alternative-kind="filter">
                        <span>{item.key === "other" ? "Other" : item.key} · <span className="tabular-nums">{item.output}</span> with output tok/s/GPU</span>
                      </Button>
                    ) : (
                      <Button key={item.key} size="sm" variant="outline" className="h-6 px-2 text-xs" asChild>
                        <a href={routeUrl("published", { model: modelId, hw: item.key })} data-alternative={item.key} data-alternative-kind="explorer" title={`Open the published explorer on ${model?.name ?? modelId} · ${item.key}: other metrics (total tok/s/GPU, per-user rates, latency)`}>
                          <span>{item.key === "other" ? "Other" : item.key} · <span className="tabular-nums">{item.total}</span> in the explorer</span>
                        </a>
                      </Button>
                    ))}
                  </span>
                ) : null}
              </>
            } />
          </>
        )}
      </div>
      <p className="text-muted-foreground border-t px-4 py-2 text-xs text-pretty">
        Best published output tok/s/GPU per hardware × engine family: the source's number at one published load level, in the source's own metric and workload — not a sustainable rate, no SLO applied, never compared with measured setups. "derived" = published aggregate ÷ GPU count. Records stating an exact catalog setup also appear under that setup in the ladder. Weak records (invalid engine version, unverified extraction, superseded run) are hidden unless shown.
      </p>
    </Panel>
  );
}

function BestPublished({ best, narrow, empty }: { best: ReturnType<typeof bestPublished>; narrow: boolean; empty: React.ReactNode }) {
  if (!best.length) return <div className="text-muted-foreground px-4 py-4 text-[13px] text-pretty" data-testid="published-best-empty">{empty}</div>;
  if (narrow) {
    return (
      <ul className="divide-y" data-testid="published-best" data-layout="cards">
        {best.map((entry) => (
          <li key={`${entry.hardware}|${entry.engine}`} className="flex min-w-0 flex-col gap-1.5 px-4 py-3" data-published-best={`${entry.hardware}|${entry.engine ?? "not-stated"}`}>
            <span className="flex min-w-0 items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-1 text-[13px]"><HardwareCell record={entry.record} /><EngineAudit record={entry.record} /></span>
              <Value metric={entry.metric} value={entry.value} level={entry.level} />
            </span>
            <SourceCell record={entry.record} />
            <Flags record={entry.record} max={3} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div data-testid="published-best" data-layout="table">
      <Table className="table-fixed min-w-[820px]">
        <colgroup><col className="w-[132px]" /><col /><col className="w-[176px]" /><col className="w-[180px]" /><col className="w-[24%]" /></colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Hardware</TableHead>
            <TableHead>Engine <span className="text-muted-foreground font-normal">build · audit</span></TableHead>
            <TableHead className="h-auto py-1.5 text-right leading-tight whitespace-normal">Output<span className="text-muted-foreground block font-normal">tok/s/GPU, as published</span></TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Caveats</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {best.map((entry) => (
            <TableRow key={`${entry.hardware}|${entry.engine}`} data-published-best={`${entry.hardware}|${entry.engine ?? "not-stated"}`}>
              <TableCell className="align-top text-[13px]"><HardwareCell record={entry.record} /></TableCell>
              <TableCell className="min-w-0 align-top text-[13px] whitespace-normal"><EngineAudit record={entry.record} /><span className="text-muted-foreground mt-0.5 block min-w-0 text-[11px] text-pretty [overflow-wrap:anywhere]">{entry.record.precision} · {entry.record.workload.isl !== null && entry.record.workload.osl !== null ? `${num(entry.record.workload.isl)} in / ${num(entry.record.workload.osl)} out` : "workload shape not stated"}</span></TableCell>
              <TableCell className="align-top whitespace-normal"><Value metric={entry.metric} value={entry.value} level={entry.level} /></TableCell>
              <TableCell className="align-top text-[13px] whitespace-normal"><SourceCell record={entry.record} /></TableCell>
              <TableCell className="align-top whitespace-normal"><Flags record={entry.record} max={3} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

