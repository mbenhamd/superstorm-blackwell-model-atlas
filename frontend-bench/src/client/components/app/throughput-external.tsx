import * as React from "react";
import { ArrowUpRight, ExternalLink, Globe } from "lucide-react";
import { CartesianGrid, Line, LineChart, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChartContainer } from "@/components/ui/chart";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { yAxisTitleLabel, yAxisWidth } from "@/lib/chart-axis";
import { niceDomain } from "@/scale";
import {
  displayFlags, FLAG_LABELS, hardwareClass, hardwareStatus, recordDate, VERSION_CLASS_LABELS, weakReasons,
  type ExternalDataset, type ExternalRecord, type HardwareClass, type SeriesPoint, type VersionClass,
} from "../../../domain/external.js";
import type { Deployment, Workload } from "../../../domain/types.js";
import { externalDataset } from "../../lib/external.js";
import { num } from "../../lib/display.js";
import { routeUrl, useAppState } from "../../state.js";
import { ExternalSwatch, type OverlayCurve } from "./throughput-chart.js";
import { deploymentEngine, metricTitle, publishedCurves, recordWorkload, sameWorkload, SCOPE_LABELS, type PublishedCurve, type PublishedScope } from "./throughput-external-data.js";

export { metricTitle, plottedMetric, type PublishedCurve } from "./throughput-external-data.js";

/*
 * Published (external) curves for the Throughput and Engine pages. Evidence class "external": ladders published by
 * third parties, engine projects and vendors (data/external-benchmarks.json). They are drawn beside the measured run,
 * never inside C_max, sustainable throughput, verdicts or rankings, and keep the source's metric names and units
 * (never "sustainable"). Every curve states its source (link), publisher, date, evidence class, hardware (badge when
 * not B300), engine and version with its audit class, caveat flags and "derived" when a per-GPU value was divided by
 * the GPU count. Weak records (invalid engine version, unverified extraction, superseded run) stay hidden unless
 * "Show weak records" is on.
 */

const AUDIT_VARIANT: Record<VersionClass, "good" | "warning" | "critical" | "neutral"> = {
  stable: "good", prerelease: "warning", "nightly-or-commit": "warning", "custom-tag": "warning", "not-stated": "neutral", invalid: "critical",
};

/** Engine and version as published, with the audit class (stable ✓ / nightly / custom / not stated / invalid ✗). */
export function EngineVersionBadges({ record }: { record: ExternalRecord }) {
  const { audit } = record;
  const detail = [`Published: ${audit.raw || "not stated"}`, audit.canonical ? `reads as ${audit.canonical}` : null, audit.releaseDate ? `released ${audit.releaseDate}` : null].filter(Boolean).join(" · ");
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1">
      <Badge variant="mono" className="max-w-[16rem] truncate" title={record.engineVersion}>{record.engine}{audit.canonical ? ` ${audit.canonical}` : ""}</Badge>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={AUDIT_VARIANT[audit.class]} tabIndex={0} className="cursor-default" data-audit-class={audit.class}>{VERSION_CLASS_LABELS[audit.class]}</Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-80 text-pretty">Engine-version audit: {detail}.</TooltipContent>
      </Tooltip>
    </span>
  );
}

const HARDWARE_FLAGS = new Set(["hardware-mismatch", "other-hardware", "gpu-type-unstated"]);

/**
 * Caveat flags as short labels, each with the dataset's long description in a tooltip; with `max`, the first `max`
 * chips and a "+N" chip whose tooltip lists the rest (the published explorer has the full list).
 */
export function FlagChips({ record, descriptions, max }: { record: ExternalRecord; descriptions: Record<string, string>; max?: number }) {
  // Compact (with max): hardware caveats are dropped because the hardware badge beside them already states them.
  const flags = displayFlags(record).filter((flag) => max === undefined || !HARDWARE_FLAGS.has(flag));
  if (!flags.length) return null;
  const shown = max === undefined ? flags : flags.slice(0, max), rest = max === undefined ? [] : flags.slice(max);
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1" data-testid="published-flags" data-flag-count={flags.length}>
      {shown.map((flag) => (
        <Tooltip key={flag}>
          <TooltipTrigger asChild>
            <Badge variant={flag === "hardware-mismatch" || flag === "other-hardware" ? "neutral" : "outline"} tabIndex={0} className="cursor-default font-normal" data-flag={flag}>{FLAG_LABELS[flag] ?? flag}</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-80 text-pretty">{descriptions[flag] ?? FLAG_LABELS[flag] ?? flag}</TooltipContent>
        </Tooltip>
      ))}
      {rest.length ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" tabIndex={0} className="cursor-default font-normal" data-flag-more={rest.length} aria-label={`${rest.length} more caveats: ${rest.map((flag) => FLAG_LABELS[flag] ?? flag).join(", ")}`}>+{rest.length}</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-80 text-left text-pretty">
            {rest.map((flag) => <span key={flag} className="block"><span className="font-medium">{FLAG_LABELS[flag] ?? flag}</span> · {descriptions[flag] ?? ""}</span>)}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

/**
 * "8× B300"; a stated non-B300 GPU in a warning tone with "not B300"; a GPU type the source does not state reads
 * "hardware not stated" (neutral): unknown hardware is never shown as a mismatch.
 */
export function HardwareBadge({ record }: { record: ExternalRecord }) {
  const status = hardwareStatus(record);
  const count = `${record.gpuCount ?? "?"}×`;
  const text = status === "unstated" ? `${count} · hardware not stated` : `${count} ${record.gpuType}${status === "other" ? " · not B300" : ""}`;
  return <Badge variant={status === "other" ? "warning" : status === "unstated" ? "neutral" : "mono"} title={record.topology ?? undefined} data-hardware={hardwareClass(record.gpuType)} data-hardware-status={status}>{text}</Badge>;
}

/**
 * One published curve's identity: tag and swatch, source link (publisher · date), evidence class, then hardware,
 * engine/version with the audit class, the plotted metric (with "derived"), workload and caveat flags.
 */
export function PublishedRecordLine({ curve, dataset, swatch, className, compact = false, workloadDiffers = false }: {
  curve: PublishedCurve; dataset: ExternalDataset; swatch?: React.ReactNode; className?: string;
  /** Throughput list: the ladder's ISL/OSL is not the measured run's (or is not stated). */
  workloadDiffers?: boolean;
  /** Small multiples: the metric and "derived" sit in the chart subtitle, caveats fold to two chips plus "+N". */
  compact?: boolean;
}) {
  const { record, metric } = curve;
  const source = dataset.sources[record.sourceId];
  const date = recordDate(record, dataset.sources);
  const weak = weakReasons(record);
  const workload = record.workload.isl !== null && record.workload.osl !== null ? `ISL ${num(record.workload.isl)} / OSL ${num(record.workload.osl)}` : record.workload.name;
  return (
    <span className={cn("flex min-w-0 flex-col gap-1", className)} data-published-record={record.id}>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        {swatch}
        <span className="text-foreground font-semibold tabular-nums">{curve.tag}</span>
        {source ? (
          <a className="text-link inline-flex min-w-0 items-center gap-0.5 hover:underline" href={source.url} target="_blank" rel="noreferrer" title={source.title} data-source-link={record.sourceId}>
            <span className="truncate">{source.publisher}</span><ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          </a>
        ) : <span className="text-muted-foreground">source not resolved</span>}
        <span className="text-muted-foreground tabular-nums">{date ?? "date not stated"}</span>
        <span className="text-muted-foreground">{record.evidenceClass}</span>
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        <HardwareBadge record={record} />
        <EngineVersionBadges record={record} />
        {compact ? null : <Badge variant="neutral" className="font-normal" title={metric.note ?? undefined} data-plotted-metric={metric.kind}>{metricTitle(metric)}</Badge>}
        {metric.derived && !compact ? <Badge variant="outline" title={dataset.conventions.derived} data-derived="">derived ÷{record.gpuCount ?? "N"}</Badge> : null}
        <span className="text-muted-foreground text-[11.5px]" title={record.workload.name}>{workload}</span>
        {workloadDiffers ? <Badge variant="warning" title="Input/output lengths differ from the measured run's workload (or are not stated)" data-workload-differs="">workload differs</Badge> : null}
        <FlagChips record={record} descriptions={dataset.conventions.flags} max={compact ? 2 : undefined} />
        {weak.length ? <Badge variant="critical" title="Weak record: shown only with Show weak records">{weak.join(", ")}</Badge> : null}
      </span>
    </span>
  );
}

/* ── Charts ──────────────────────────────────────────────────────────────────────────────────── */

export interface LadderLine { key: string; tag: string; label: string; color: string; dash: string; points: SeriesPoint[] }

/**
 * Concurrency ladder chart for published values: x = the union of the lines' concurrency levels as evenly spaced
 * categories (never time), y = one metric (its published name and unit as the axis title), dashed lines with hollow
 * points and the tag at each line's last level. Tooltip lists every line's value at a level; the aria-label states
 * the full series.
 */
export function PublishedLadderChart({ lines, yTitle, title, height = "h-[200px]", testId, xScale = "category" }: {
  lines: readonly LadderLine[]; yTitle: string; title: string; height?: string; testId?: string;
  /**
   * "log": numeric log₂ concurrency axis, so ladders with different level sets keep their true spacing on one chart
   * (power-of-two ticks); "category" (default): the union of levels evenly spaced, for a single ladder.
   */
  xScale?: "category" | "log";
}) {
  const levels = [...new Set(lines.flatMap((line) => line.points.map((point) => point.concurrency)))].sort((a, b) => a - b);
  if (!levels.length) return null;
  const log = xScale === "log" && levels[0]! > 0 && levels.length > 1;
  const data = levels.map((concurrency) => Object.fromEntries([["level", String(concurrency)], ["x", concurrency], ...lines.map((line, index) => [`l${index}`, line.points.find((point) => point.concurrency === concurrency)?.value ?? null])]));
  const xTicks = log ? powerTicks(levels[0]!, levels.at(-1)!) : undefined;
  const values = lines.flatMap((line) => line.points.map((point) => point.value));
  const y = niceDomain(0, Math.max(...values) * 1.08, 4);
  const digits = y.max <= 10 ? 2 : y.max <= 100 ? 1 : 0;
  const format = (value: number) => num(value, digits);
  const label = `${title}: ${lines.map((line) => `${line.tag} ${line.label}: ${line.points.map((point) => `${point.concurrency} → ${format(point.value)}`).join(", ")}`).join("; ")}. Published values (external).`;
  // Lines ending on the same level at nearby values set their tags side by side instead of on top of each other.
  const tagOffset = (index: number): number => {
    const end = lines[index]!.points.at(-1);
    if (!end) return 0;
    return lines.slice(0, index).filter((line) => {
      const other = line.points.at(-1);
      return other?.concurrency === end.concurrency && Math.abs(other.value - end.value) < y.max * 0.08;
    }).length * 18;
  };
  const maxOffset = Math.max(0, ...lines.map((_, index) => tagOffset(index)));
  const dot = (index: number) => (props: unknown) => {
    const { cx, cy, payload, index: key } = props as { cx?: number | null; cy?: number | null; payload?: Record<string, unknown>; index?: number };
    const line = lines[index]!;
    if (cx == null || cy == null || typeof payload?.[`l${index}`] !== "number") return <g key={key} />;
    const end = String(line.points.at(-1)?.concurrency) === payload.level;
    return (
      <g key={key}>
        <circle cx={cx} cy={cy} r={2.75} fill="var(--card)" stroke={line.color} strokeWidth={1.5} />
        {end ? <text x={cx + 5 + tagOffset(index)} y={cy + 4} fill="var(--muted-foreground)" fontSize={10.5} fontWeight={600}>{line.tag}</text> : null}
      </g>
    );
  };
  return (
    <ChartContainer config={{}} className={cn("aspect-auto w-full", height)} role="img" aria-label={label} data-testid={testId}>
      <LineChart data={data} margin={{ top: 12, right: 26 + maxOffset, bottom: 16, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        {log ? (
          <XAxis dataKey="x" type="number" scale="log" domain={[xTicks![0]!, xTicks!.at(-1)!]} ticks={xTicks} allowDataOverflow={false} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={6} padding={{ left: 8, right: 8 }}
            tickFormatter={(value: number) => num(value)} label={{ value: "Concurrent requests (log scale)", position: "insideBottomRight", offset: -12, className: "fill-muted-foreground text-[11px]" }} />
        ) : (
          <XAxis dataKey="level" type="category" tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={6} interval="preserveStartEnd" padding={{ left: 8, right: 8 }}
            label={{ value: "Concurrent requests (published levels)", position: "insideBottomRight", offset: -12, className: "fill-muted-foreground text-[11px]" }} />
        )}
        <YAxis domain={[y.min, y.max]} ticks={y.ticks} tickLine={false} axisLine={false} tickMargin={6} width={yAxisWidth(y.ticks, format)} tickFormatter={format} label={yAxisTitleLabel(yTitle)} />
        <RechartsTooltip
          isAnimationActive={false}
          allowEscapeViewBox={{ x: false, y: false }}
          wrapperStyle={{ pointerEvents: "none", zIndex: 5 }}
          cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as Record<string, unknown> | undefined;
            if (!active || !row) return null;
            return (
              <div className="bg-popover text-popover-foreground shadow-float grid w-max min-w-[11rem] max-w-[min(20rem,calc(100vw-4rem))] gap-1 rounded-lg border px-3 py-2 text-xs tabular-nums">
                <span className="font-medium">{String(row.level)} concurrent requests · published</span>
                {lines.map((line, index) => typeof row[`l${index}`] === "number" ? (
                  <span key={line.key} className="flex justify-between gap-4"><span className="text-muted-foreground min-w-0 truncate"><span className="text-foreground font-medium">{line.tag}</span> {line.label}</span><span>{format(row[`l${index}`] as number)}</span></span>
                ) : null)}
              </div>
            );
          }}
        />
        {lines.map((line, index) => (
          <Line key={line.key} dataKey={`l${index}`} type="linear" stroke={line.color} strokeWidth={1.75} strokeDasharray={line.dash} connectNulls dot={dot(index)} activeDot={false} isAnimationActive={false} />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

/** Power-of-two ticks covering [lo, hi] (log concurrency axis); at most ~7 ticks (every other power when wider). */
export function powerTicks(lo: number, hi: number): number[] {
  const from = Math.floor(Math.log2(lo)), to = Math.ceil(Math.log2(hi));
  const step = to - from > 7 ? 2 : 1;
  const ticks: number[] = [];
  for (let exponent = from; exponent <= to; exponent += step) ticks.push(2 ** exponent);
  if (ticks.at(-1)! < hi) ticks.push(2 ** (ticks.length ? Math.log2(ticks.at(-1)!) + step : to));
  return ticks;
}

/* ── Throughput: state and panel ─────────────────────────────────────────────────────────────── */

const STORE_KEY = "bench.throughput.external";
const readOn = (): boolean => { try { return localStorage.getItem(STORE_KEY) === "on"; } catch { return false; } };
const writeOn = (on: boolean): void => { try { localStorage.setItem(STORE_KEY, on ? "on" : "off"); } catch { /* per-viewer convenience only */ } };

/** Default selection: up to four overlay curves and four own-axis curves, newest first. */
const DEFAULT_PER_KIND = 4;

export interface PublishedState {
  on: boolean; setOn: (on: boolean) => void;
  scope: PublishedScope; setScope: (scope: PublishedScope) => void;
  showWeak: boolean; setShowWeak: (show: boolean) => void;
  curves: PublishedCurve[]; chosen: PublishedCurve[]; toggle: (id: string) => void;
  /** Chosen overlay curves in the chart's form. */
  overlay: OverlayCurve[];
  dataset: ExternalDataset; hardware: HardwareClass; engine: string;
  /** Ladders of the model in each scope (for the scope switch counts). */
  counts: Record<PublishedScope, number>;
  /** The measured run's workload (ISL/OSL reference for "workload differs"). */
  workload: Workload | null;
}

/** External-curve state of the Throughput chart for one deployment (scope, weak records, selection). Off by default. */
export function usePublishedCurves(d: Deployment): PublishedState {
  const dataset = externalDataset();
  const workload = useAppState().snapshot.workloads.find((item) => item.id === d.workloadId) ?? null;
  const [on, setOnState] = React.useState(readOn);
  const [scope, setScope] = React.useState<PublishedScope>("same");
  const [showWeak, setShowWeak] = React.useState(false);
  const hardware = hardwareClass(d.gpuType), engine = deploymentEngine(d);
  const key = `${d.modelId}|${hardware}|${engine}|${scope}|${showWeak}`;
  const [selection, setSelection] = React.useState<{ key: string; ids: string[] } | null>(null);
  const options = { modelId: d.modelId, hardware, engine, showWeak, overlayKind: "total-per-gpu" as const };
  const curves = React.useMemo(() => publishedCurves(dataset, { ...options, scope }), [dataset, key]);
  const counts = React.useMemo(() => ({
    same: publishedCurves(dataset, { ...options, scope: "same" }).length,
    engine: publishedCurves(dataset, { ...options, scope: "engine" }).length,
    all: publishedCurves(dataset, { ...options, scope: "all" }).length,
  }), [dataset, `${d.modelId}|${hardware}|${engine}|${showWeak}`]);
  const defaults = [...curves.filter((curve) => curve.overlay).slice(0, DEFAULT_PER_KIND), ...curves.filter((curve) => !curve.overlay).slice(0, DEFAULT_PER_KIND)].map((curve) => curve.record.id);
  const ids = selection?.key === key ? selection.ids : defaults;
  const chosen = curves.filter((curve) => ids.includes(curve.record.id));
  const toggle = (id: string) => setSelection({ key, ids: ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] });
  const setOn = (value: boolean) => { setOnState(value); writeOn(value); };
  const overlay: OverlayCurve[] = on ? chosen.filter((curve) => curve.overlay).map((curve) => ({
    key: curve.record.id, tag: curve.tag, label: `${dataset.sources[curve.record.sourceId]?.publisher ?? curve.record.sourceId} · ${curve.record.gpuCount ?? "?"}× ${curve.record.gpuType ?? "GPU"}`,
    derived: curve.metric.derived, points: curve.points,
    workload: recordWorkload(curve.record), workloadDiffers: !sameWorkload(curve.record, workload),
  })) : [];
  return { on, setOn, scope, setScope, showWeak, setShowWeak, curves, chosen, toggle, overlay, dataset, hardware, engine, counts, workload };
}

/** The chart-header toggle: "External curves" (pressed state), with the in-scope count. */
export function ExternalCurvesToggle({ state }: { state: PublishedState }) {
  return (
    <Button variant={state.on ? "secondary" : "outline"} size="sm" aria-pressed={state.on} aria-controls={state.on ? "published-curves" : undefined} onClick={() => state.setOn(!state.on)} data-testid="external-curves-toggle"
      title="Overlay published ladders (external evidence) of this model; never part of C_max or sustainable throughput">
      <Globe aria-hidden="true" />External curves<span className="text-muted-foreground tabular-nums" title={`${state.counts[state.scope]} in the current scope · ${state.counts.all} for this model`} data-testid="external-curves-count">{state.counts[state.scope]}</span>
    </Button>
  );
}

/**
 * Published curves panel (shown while the toggle is on): scope switch (same GPU + engine by default), weak-record
 * switch, the curve list with a checkbox per curve and its full identity, then one small chart per chosen curve whose
 * metric is not the main chart's (own title and y-axis; never a second axis on the main chart).
 */
export function PublishedCurvesPanel({ state, deployment: d, modelName, standalone = false }: { state: PublishedState; deployment: Deployment; modelName: string; standalone?: boolean }) {
  const [all, setAll] = React.useState(false);
  const { curves, chosen, dataset } = state;
  const ownAxis = chosen.filter((curve) => !curve.overlay);
  // Without a measured chart (nothing imported for this setup), the total tok/s per GPU curves share one chart here.
  const shared = standalone ? chosen.filter((curve) => curve.overlay) : [];
  const listed = all ? curves : curves.slice(0, 8);
  const scopeText = state.scope === "same" ? `${state.hardware} · ${d.runtime}` : state.scope === "engine" ? `${d.runtime} · any GPU` : "every GPU and engine";
  return (
    <section id="published-curves" className="bg-card shadow-panel min-w-0 rounded-lg border" aria-labelledby="published-curves-title" data-testid="published-curves">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 id="published-curves-title" className="inline-flex items-center gap-1.5 text-[13px] leading-5 font-semibold"><ExternalSwatch />Published curves (external)</h2>
          <p className="text-muted-foreground text-[12px] text-pretty">
            {modelName} · {scopeText} · ladders published by third parties, engine projects and vendors. Not measured here: no SLO, C_max or sustainable rate is derived from them.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ToggleGroup type="single" variant="outline" size="sm" value={state.scope} aria-label="Published scope" data-testid="published-scope" className="w-full sm:w-fit"
            onValueChange={(value: string) => { if (value === "same" || value === "engine" || value === "all") state.setScope(value); }}>
            {(Object.keys(SCOPE_LABELS) as PublishedScope[]).map((key) => (
              <ToggleGroupItem key={key} value={key} className="min-w-0 flex-1 px-2 text-xs sm:flex-none sm:px-2.5" data-scope={key}>{SCOPE_LABELS[key]}<span className="text-muted-foreground tabular-nums">{state.counts[key]}</span></ToggleGroupItem>
            ))}
          </ToggleGroup>
          <label className="text-ink-2 inline-flex items-center gap-1.5 text-xs">
            <Switch size="sm" checked={state.showWeak} onCheckedChange={(value) => state.setShowWeak(value === true)} data-testid="published-show-weak" aria-label="Show weak records" />Show weak records
          </label>
        </div>
      </div>
      {!curves.length ? (
        <p className="text-muted-foreground px-4 py-3 text-[13px] text-pretty" data-testid="published-empty">
          No published concurrency ladder of {modelName} for {scopeText}{state.showWeak ? "" : " (weak records hidden)"}.
          {state.scope !== "all" && state.counts.all ? ` ${state.counts.all} ladder${state.counts.all === 1 ? "" : "s"} in a wider scope.` : ""}
        </p>
      ) : (
        <>
          <ul className="divide-y" data-testid="published-curve-list">
            {listed.map((curve) => {
              const checked = chosen.includes(curve);
              return (
                <li key={curve.record.id} className="flex min-w-0 items-start gap-3 px-4 py-2" data-curve={curve.tag} data-overlay={curve.overlay || undefined} data-chosen={checked || undefined}>
                  <Checkbox className="mt-0.5" checked={checked} onCheckedChange={() => state.toggle(curve.record.id)} aria-label={`Show ${curve.tag}`} />
                  <PublishedRecordLine curve={curve} dataset={dataset} className="flex-1" workloadDiffers={!sameWorkload(curve.record, state.workload)} />
                  <Badge variant={curve.overlay && checked ? "info" : "neutral"} className="shrink-0" title={curve.overlay ? (standalone ? "Total tok/s per GPU: drawn on the shared published chart below when checked" : "Same metric as the chart (total tok/s per GPU): drawn on it when checked") : "Different metric: drawn on its own chart below when checked"}>{curve.overlay ? (standalone ? "shared chart" : checked ? "on chart" : "same metric") : "own chart"}</Badge>
                </li>
              );
            })}
          </ul>
          {curves.length > 8 ? (
            <div className="border-t px-4 py-2"><Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAll(!all)} aria-expanded={all}>{all ? "Show fewer" : `Show all ${curves.length}`}</Button></div>
          ) : null}
          {shared.length ? (
            <div className="border-t px-4 py-3" data-testid="published-shared-chart">
              <h3 className="text-[13px] font-semibold">Published total tok/s per GPU</h3>
              <p className="text-muted-foreground mb-2 text-xs text-pretty">Nothing measured here for this setup yet, so the published curves of the throughput chart's metric share one chart. Values as published.</p>
              <PublishedLadderChart title="Published total tok/s per GPU" yTitle="Total tok/s per GPU (published)"
                lines={shared.map((curve) => ({ key: curve.record.id, tag: curve.tag, label: dataset.sources[curve.record.sourceId]?.publisher ?? curve.record.sourceId, color: "var(--chart-neutral)", dash: "3 3", points: curve.points }))} height="h-[220px]" />
            </div>
          ) : null}
          {ownAxis.length ? (
            <div className="border-t px-4 py-3" data-testid="published-small-multiples">
              <h3 className="text-[13px] font-semibold">Published in other metrics</h3>
              <p className="text-muted-foreground mb-3 text-xs text-pretty">One chart per curve, each with the source's metric and its own y-axis; not comparable with total tok/s per GPU, so never drawn on the main chart.</p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {ownAxis.map((curve) => (
                  <figure key={curve.record.id} className="m-0 min-w-0" data-small-multiple={curve.tag}>
                    <figcaption className="mb-1 flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs">
                      <span className="font-semibold">{curve.tag}</span>
                      <span className="text-foreground">{metricTitle(curve.metric)}</span>
                      {curve.metric.derived ? <span className="text-muted-foreground">(derived)</span> : null}
                      <span className="text-muted-foreground truncate">{dataset.sources[curve.record.sourceId]?.publisher} · {curve.record.gpuCount ?? "?"}× {curve.record.gpuType ?? "GPU"}</span>
                    </figcaption>
                    <PublishedLadderChart title={`${curve.tag} ${metricTitle(curve.metric)}`} yTitle={curve.metric.unit ?? curve.metric.name}
                      lines={[{ key: curve.record.id, tag: curve.tag, label: curve.metric.name, color: "var(--chart-neutral)", dash: "3 3", points: curve.points }]} height="h-[170px]" />
                  </figure>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2.5 text-xs">
        <span className="text-pretty">Values as published (source metric names and units). {standalone ? "Total tok/s per GPU curves share one chart; other metrics get their own" : "Overlay only when the metric is total tok/s per GPU"}; workloads, configurations and versions differ per source.</span>
        <a className="text-link inline-flex items-center gap-0.5 hover:underline" href={routeUrl("published")} data-testid="published-explorer-link">All published results<ArrowUpRight className="size-3" aria-hidden="true" /></a>
      </div>
    </section>
  );
}
