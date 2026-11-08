import * as React from "react";
import { CartesianGrid, ComposedChart, Line, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { yAxisTitleLabel, yAxisWidth } from "@/lib/chart-axis";
import { niceDomain } from "@/scale";
import { FLAG_LABELS, derivationText, sourceLinkText, displayUnit, externalSeries, metricName, recordDate, type ExternalLevel, type ExternalMetric, type ExternalRecord } from "../../../domain/external.js";
import { externalDataset } from "../../lib/external.js";
import { configLabel } from "../../lib/display.js";
import { navigate, update, useAppState } from "../../state.js";
import { EngineVersion, ExternalEvidenceBadge, HardwareMark, SourceLink, VersionAuditBadge, WeakBadge } from "./published-badges.js";
import { defaultLadderMetric, formatValue, ladderMetrics, metricTitle } from "./published-data.js";

/*
 * Expanded view of one external record: the concurrency ladder as a small line chart (x = published concurrency
 * levels as evenly spaced categories, never time; y = one published metric with its own name and unit), the full
 * levels table (its textual equivalent, every metric as published) and the record facts with the source link.
 * External curves are drawn neutral grey and dashed, the same mark as external overlays elsewhere; no SLO, C_max or
 * sustainable rate is computed from them.
 */

interface Datum { level: string; concurrency: number; value: number }

function LadderTooltip({ active, payload, metric }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }>; metric: ExternalMetric }) {
  const datum = payload?.find((entry) => entry.payload)?.payload as Datum | undefined;
  // No box at all between points (no active datum or no numeric value): never an empty frame over the chart.
  if (!active || !datum || typeof datum.value !== "number") return null;
  return (
    <div className="bg-popover text-popover-foreground shadow-float grid w-max max-w-[min(16rem,calc(100vw-4rem))] min-w-[10rem] gap-1 rounded-lg border px-3 py-2 text-xs" data-testid="published-ladder-tooltip">
      <span className="font-medium tabular-nums">{datum.concurrency} concurrent requests</span>
      <span className="flex items-baseline justify-between gap-3 border-t pt-1.5">
        <span className="text-muted-foreground min-w-0 text-pretty">{metricName(metric)}{metric.percentile ? ` ${metric.percentile}` : ""}{metric.derived ? " (derived)" : ""}</span>
        <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">{formatValue(datum.value)}{displayUnit(metric) ? <span className="text-muted-foreground ml-0.5 font-normal">{displayUnit(metric)}</span> : null}</span>
      </span>
    </div>
  );
}

/** One published metric against concurrency. Returns null when the metric has fewer than two concurrency levels. */
export function PublishedLadderChart({ record, metricIndex, className, height = 200 }: { record: ExternalRecord; metricIndex: number; className?: string; height?: number }) {
  const series = externalSeries(record, metricIndex);
  if (!series || series.points.length < 2) return null;
  const { metric, points } = series;
  const data: Datum[] = points.map((point) => ({ level: String(point.concurrency), concurrency: point.concurrency, value: point.value }));
  const values = data.map((datum) => datum.value);
  const y = niceDomain(Math.min(0, ...values), Math.max(...values) * 1.06, 4);
  const unit = displayUnit(metric);
  const derivation = derivationText(metric, record.gpuCount);
  const yTitle = `${metricName(metric)}${metric.percentile ? ` ${metric.percentile}` : ""}${unit ? ` (${unit})` : ""}`;
  const label = `Published ${yTitle}${derivation ? `, ${derivation}` : ""} at ${data.length} concurrency levels from ${data[0]!.concurrency} to ${data.at(-1)!.concurrency}; highest ${formatValue(Math.max(...values))}${unit ? ` ${unit}` : ""}. External evidence; exact values are in the levels table.`;
  return (
    <figure className={cn("m-0 min-w-0", className)} data-testid="published-ladder-chart" data-metric-index={metricIndex}>
      <ChartContainer config={{ value: { label: yTitle, color: "var(--chart-neutral)" } }} className="aspect-auto w-full" style={{ height }} role="img" aria-label={label}>
        <ComposedChart data={data} margin={{ top: 26, right: 12, bottom: 18, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="" />
          <XAxis dataKey="level" type="category" tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={6} interval="preserveStartEnd" padding={{ left: 10, right: 10 }}
            label={{ value: "Concurrency (published levels)", position: "insideBottomRight", offset: -14, className: "fill-muted-foreground text-[11.5px]" }} />
          <YAxis domain={[y.min, y.max]} ticks={y.ticks} tickLine={false} axisLine={false} tickMargin={6} width={yAxisWidth(y.ticks, formatValue)} tickFormatter={formatValue} label={yAxisTitleLabel(yTitle)} />
          {/* Kept inside the chart box, so never past the viewport on phones; long metric names wrap inside it. */}
          <RechartsTooltip cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} isAnimationActive={false} allowEscapeViewBox={{ x: false, y: false }} offset={12}
            wrapperStyle={{ pointerEvents: "none", zIndex: 5 }} content={<LadderTooltip metric={metric} />} />
          <Line dataKey="value" type="linear" stroke="var(--chart-neutral)" strokeWidth={2} strokeDasharray="5 4" isAnimationActive={false}
            dot={{ r: 3.5, fill: "var(--chart-neutral)", stroke: "var(--card)", strokeWidth: 1.5 }} activeDot={{ r: 5, fill: "var(--chart-neutral)", stroke: "var(--card)", strokeWidth: 2 }} />
        </ComposedChart>
      </ChartContainer>
      <figcaption className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" data-testid="published-ladder-legend">
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" stroke="var(--chart-neutral)" strokeWidth="2" strokeDasharray="5 4" /><circle cx="11" cy="5" r="3" fill="var(--chart-neutral)" /></svg>
          Published curve (external) · no SLO applied
        </span>
        {derivation ? <span data-derived="true">{derivation.replace(/^derived/, "Derived")}</span> : null}
      </figcaption>
    </figure>
  );
}

function cellText(level: ExternalLevel, index: number): { text: string; note: string | null } {
  const value = level.values[index] ?? null, detail = level.details[index];
  const range = detail?.range ? `${formatValue(detail.range[0])}–${formatValue(detail.range[1])}` : null;
  const text = value === null ? range ?? "—" : `${detail?.qualifier ?? ""}${formatValue(value)}${detail?.valueMax !== null && detail?.valueMax !== undefined ? `–${formatValue(detail.valueMax)}` : ""}${detail?.of !== null && detail?.of !== undefined ? ` of ${formatValue(detail.of)}` : ""}`;
  return { text, note: value !== null && range ? `range ${range}` : null };
}
const extraText = (extras: Record<string, unknown>): string => Object.entries(extras).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`).join(" · ");

/** Every published level and metric as published; the textual equivalent of the ladder chart. Scrolls inside its frame. */
export function PublishedLevelsTable({ record, highlight }: { record: ExternalRecord; highlight?: number | null }) {
  const hasRate = record.levels.some((level) => level.requestRate !== null);
  const hasLabel = record.levels.some((level) => level.label !== null);
  const hasExtras = record.levels.some((level) => Object.keys(level.extras).length > 0);
  return (
    // Auto width (never stretched to the detail): value columns sit next to Concurrency; scrolls inside its frame.
    <div className="w-fit max-w-full overflow-x-auto rounded-md border" data-testid="published-levels">
      <table className="w-auto text-xs tabular-nums">
        <thead className="bg-subtle text-muted-foreground">
          <tr className="border-b">
            <th scope="col" className="px-2.5 py-1.5 text-right font-medium whitespace-nowrap">Concurrency</th>
            {hasLabel ? <th scope="col" className="px-2.5 py-1.5 text-left font-medium whitespace-nowrap">Load point</th> : null}
            {hasRate ? <th scope="col" className="px-2.5 py-1.5 text-right font-medium whitespace-nowrap">Request rate</th> : null}
            {record.metrics.map((metric, index) => (
              <th key={index} scope="col" className={cn("max-w-[16ch] px-2.5 py-1.5 text-right align-bottom font-medium", index === highlight && "text-foreground")} data-metric-kind={metric.kind}>
                <span className="block leading-tight">{metricName(metric)}{metric.percentile ? ` ${metric.percentile}` : ""}</span>
                <span className="text-muted-foreground block font-normal">{displayUnit(metric) ?? "—"}{metric.derived ? " · derived" : ""}</span>
              </th>
            ))}
            {hasExtras ? <th scope="col" className="px-2.5 py-1.5 text-left font-medium whitespace-nowrap">Level details</th> : null}
          </tr>
        </thead>
        <tbody>
          {record.levels.map((level, row) => (
            <tr key={row} className="border-b last:border-0" data-level={level.concurrency ?? level.label ?? row}>
              <th scope="row" className="px-2.5 py-1.5 text-right font-medium">{level.concurrency ?? <span className="text-muted-foreground">—</span>}</th>
              {hasLabel ? <td className="px-2.5 py-1.5 text-left whitespace-nowrap">{level.label ?? <span className="text-muted-foreground">—</span>}</td> : null}
              {hasRate ? <td className="px-2.5 py-1.5 text-right">{level.requestRate === null ? <span className="text-muted-foreground">—</span> : formatValue(level.requestRate)}</td> : null}
              {record.metrics.map((_, index) => {
                const { text, note } = cellText(level, index);
                return <td key={index} className={cn("px-2.5 py-1.5 text-right whitespace-nowrap", text === "—" && "text-muted-foreground", index === highlight && "bg-muted/60 font-medium")}>{text}{note ? <span className="text-muted-foreground ml-1">({note})</span> : null}</td>;
              })}
              {hasExtras ? <td className="text-muted-foreground max-w-[48ch] min-w-[24ch] px-2.5 py-1.5 text-left [overflow-wrap:anywhere]">{extraText(level.extras) || "—"}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-1.5 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-3">
      <dt className="text-muted-foreground text-xs">{term}</dt>
      <dd className="min-w-0 text-[13px] [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** A catalog configuration named by the record (exact match or closest), with a one-click Throughput link. */
function CatalogLink({ id }: { id: string }) {
  const state = useAppState();
  const deployment = state.snapshot.deployments.find((item) => item.id === id);
  if (!deployment) return <span className="font-mono text-xs">{id}</span>;
  return (
    <Button variant="link" size="sm" className="h-auto p-0 text-[13px]" data-catalog-config={id}
      onClick={() => { update((s) => { s.run = id; }); navigate("throughput", { run: id }); }}>
      {configLabel(deployment)}
    </Button>
  );
}

/** The expanded record: chart + metric picker, record facts, levels table. */
export function PublishedRecordDetail({ record }: { record: ExternalRecord }) {
  const data = externalDataset();
  const source = data.sources[record.sourceId];
  const drawable = ladderMetrics(record);
  const [metricIndex, setMetricIndex] = React.useState<number | null>(() => defaultLadderMetric(record));
  const date = recordDate(record, data.sources);
  return (
    // One minmax(0,1fr) track: no child (a long source title, the metric picker) can size the detail past its frame.
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 py-2" data-testid="published-detail" data-record-id={record.id}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <ExternalEvidenceBadge />
        <SourceLink source={source} showTitle className="max-w-full text-[13px]" />
        {/* A slug-only title already reads "publisher · date" as the link: then only the evidence class follows. */}
        <span className="text-muted-foreground">{source && sourceLinkText(source) !== source.title ? `${date && sourceLinkText(source).includes(date) ? "" : `${date ?? "date not stated"} · `}${record.evidenceClass}` : `${source?.publisher ?? ""}${date ? ` · ${date}` : " · date not stated"} · ${record.evidenceClass}`}</span>
        <WeakBadge record={record} />
      </div>
      <div className={cn("grid gap-4", drawable.length && "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]")}>
        {drawable.length && metricIndex !== null ? (
          <div className="min-w-0 space-y-2">
            <Select value={String(metricIndex)} onValueChange={(value) => setMetricIndex(Number(value))}>
              <SelectTrigger size="sm" className="h-8 w-full max-w-full min-w-0 sm:w-auto" aria-label="Chart metric" data-testid="published-ladder-metric">
                <span className="text-muted-foreground">Metric</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start" className="max-w-[min(92vw,420px)]">
                {drawable.map((index) => <SelectItem key={index} value={String(index)}>{metricTitle(record.metrics[index]!)}{record.metrics[index]!.derived ? " · derived" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <PublishedLadderChart record={record} metricIndex={metricIndex} />
          </div>
        ) : null}
        <dl className="min-w-0 divide-y" data-testid="published-facts">
          <Fact term="Published model">{record.publishedModel} <span className="text-muted-foreground">· {record.precision}</span></Fact>
          <Fact term="Hardware"><span className="inline-flex flex-wrap items-center gap-1.5"><HardwareMark record={record} />{record.topology ? <span className="text-muted-foreground">{record.topology}</span> : null}{record.hardware ? <span className="text-muted-foreground">{record.hardware}</span> : null}</span></Fact>
          <Fact term="Engine"><span className="grid gap-0.5"><EngineVersion record={record} /><span className="text-muted-foreground text-xs">As published: {record.engine} · {record.engineVersion}</span></span></Fact>
          <Fact term="Configuration"><code className="font-mono text-[12px]">{record.config}</code></Fact>
          <Fact term="Workload">{record.workload.name}{record.workload.isl !== null || record.workload.osl !== null ? <span className="text-muted-foreground tabular-nums"> · ISL {record.workload.isl ?? "—"} / OSL {record.workload.osl ?? "—"}</span> : null}</Fact>
          <Fact term="Catalog setup">
            {record.catalogConfigurationId ? (record.mismatch
              ? <span className="grid gap-0.5" data-catalog-link="differs"><span className="inline-flex flex-wrap items-baseline gap-1.5"><Badge variant="warning">Linked setup · differs</Badge><CatalogLink id={record.catalogConfigurationId} /></span><span className="text-muted-foreground text-xs">Differs: {record.mismatch}</span></span>
              : <span className="inline-flex flex-wrap items-baseline gap-1.5" data-catalog-link="same"><Badge variant="neutral">Same setup</Badge><CatalogLink id={record.catalogConfigurationId} /></span>)
              : record.closestCatalogConfigurationId ? <span className="grid gap-0.5"><span className="inline-flex flex-wrap items-baseline gap-1.5"><span className="text-muted-foreground">Closest (not a match):</span><CatalogLink id={record.closestCatalogConfigurationId} /></span>{record.mismatch ? <span className="text-muted-foreground text-xs">Differs: {record.mismatch}</span> : null}</span>
                : <span className="text-muted-foreground">No matching catalog setup{record.mismatch ? ` · ${record.mismatch}` : ""}</span>}
          </Fact>
          <Fact term="Caveats">
            {record.flags.length ? (
              <ul className="grid gap-0.5" data-testid="published-flags">
                {record.flags.map((flag) => <li key={flag} data-flag={flag}><span className="font-medium">{FLAG_LABELS[flag] ?? flag}</span><span className="text-muted-foreground"> · {data.conventions.flags[flag] ?? ""}</span></li>)}
              </ul>
            ) : <span className="text-muted-foreground">None recorded</span>}
          </Fact>
          <Fact term="Version audit"><span className="inline-flex flex-wrap items-center gap-1.5"><VersionAuditBadge record={record} /><span className="text-muted-foreground text-xs">{data.conventions.versionClasses[record.audit.class]}</span></span></Fact>
          {record.notes ? <Fact term="Notes">{record.notes}</Fact> : null}
          {record.correction ? <Fact term="Correction"><span className="text-muted-foreground">{record.correction.note}</span></Fact> : null}
        </dl>
      </div>
      <PublishedLevelsTable record={record} highlight={metricIndex} />
      <p className="text-muted-foreground text-xs">Values as published ({record.levels.length} level{record.levels.length === 1 ? "" : "s"}, {record.metrics.length} metric{record.metrics.length === 1 ? "" : "s"}); “derived” per-GPU values were computed by the extraction (aggregate ÷ GPUs). {data.conventions.kserve}</p>
    </div>
  );
}
