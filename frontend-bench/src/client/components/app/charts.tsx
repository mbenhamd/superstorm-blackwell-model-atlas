import * as React from "react";
import { cn } from "@/lib/utils";
import { ComposedChart, type ComposedSeries } from "@/components/ui/composed-chart";
import { ScatterChart } from "@/components/ui/scatter-chart";
import { ChartContainer } from "@/components/ui/chart";
import { CartesianGrid, Scatter, ScatterChart as RechartsScatterChart, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { yAxisTitleLabel, yAxisWidth } from "@/lib/chart-axis";
import { logTicks, niceDomain } from "@/scale";
import { capacity } from "../../../domain/metrics.js";
import type { Deployment, PointMetrics, RankedDeployment } from "../../../domain/types.js";
import { appState } from "../../state.js";
import { configDetail, configLabel, configName, num } from "../../lib/display.js";

/* ---------------------------------- frontier ---------------------------------- */
export interface FrontierPoint { id: string; name: string; detail: string; label: string; capacity: number; quality: number }

export function frontierPoints(rows: RankedDeployment[]): FrontierPoint[] {
  return rows.filter((row) => row.quality !== null && row.capacity.sustainableTpmPerGpu !== null).map((row) => ({
    id: row.deployment.id, name: configName(row.deployment), detail: configDetail(row.deployment),
    label: `${row.model.name} · ${row.deployment.runtime}`, capacity: row.capacity.sustainableTpmPerGpu ?? 0, quality: row.quality ?? 0,
  }));
}

export function FrontierChart({ points, frontierIds, frontierOnly, log, selectedId, highlightId, onSelect, onHover, className, expanded = false }: {
  points: FrontierPoint[]; frontierIds: Set<string>; frontierOnly: boolean; log: boolean; selectedId?: string; highlightId?: string;
  onSelect: (id: string) => void; onHover: (id: string | null) => void; className?: string; expanded?: boolean;
}) {
  const edge = points.filter((point) => frontierIds.has(point.id)).sort((a, b) => a.capacity - b.capacity);
  // Disambiguate labels that would otherwise repeat (same model and precision on two engines).
  const counts = new Map<string, number>();
  edge.forEach((point) => counts.set(point.label, (counts.get(point.label) ?? 0) + 1));
  const labelled = edge.map((point) => ({ ...point, label: (counts.get(point.label) ?? 0) > 1 ? `${point.label} · ${point.detail.split(" · ")[0]}` : point.label }));
  const rest = frontierOnly ? [] : points.filter((point) => !frontierIds.has(point.id));
  const visible = [...rest, ...edge];
  const xs = visible.map((point) => point.capacity), ys = visible.map((point) => point.quality);
  // One distinct quality value: a ±1 window would fake vertical resolution, so the axis starts at zero instead.
  const y = new Set(ys).size < 2 ? niceDomain(0, Math.max(1, ...ys) * 1.25, 4) : niceDomain(Math.min(...ys) - 1, Math.max(...ys) + 1, 5);
  const xTicks = log ? logTicks(Math.min(...xs), Math.max(...xs)) : niceDomain(0, Math.max(...xs), 5).ticks;
  const xDomain: [number, number] = [xTicks[0] ?? 0, xTicks.at(-1) ?? 1];
  return (
    <figure className={cn("m-0", className)}>
      <ScatterChart
        className={expanded ? "h-[min(68vh,640px)]" : "h-[340px] max-sm:h-[300px] lg:h-[460px]"}
        series={[
          ...(rest.length ? [{ key: "configs", label: "Configuration", data: rest as unknown as Record<string, unknown>[], color: "var(--chart-neutral)" }] : []),
          { key: "frontier", label: "Frontier", data: labelled as unknown as Record<string, unknown>[], color: "var(--chart-1)", line: true, labels: true },
        ]}
        xKey="capacity" yKey="quality" idKey="id" nameKey="name" detailKey="detail" labelKey="label"
        xLabel="Sustainable (total tok/min/GPU)" yLabel="AA index (model)"
        xAxisTitle={`Sustainable throughput, total tok/min per GPU${log ? " (log scale)" : ""}`} yAxisTitle="AA Intelligence Index, base model (published)"
        xFormatter={(value) => num(value)} yFormatter={(value) => num(value, Number.isInteger(value) ? 0 : 1)}
        xTicks={xTicks} xDomain={xDomain} xScale={log ? "log" : "linear"}
        yTicks={y.ticks} yDomain={[y.min, y.max]}
        selectedId={selectedId} highlightId={highlightId}
        onPointSelect={(row) => onSelect(String(row.id))}
        onPointHover={(row) => onHover(row ? String(row.id) : null)}
        animate={false}
        role="group"
        aria-label={`Published base-model AA index versus measured SLO capacity for ${visible.length} configurations; ${edge.length} on the frontier. Use Tab to move between points and Enter to select.`}
      />
      <figcaption className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="bg-chart-neutral size-2 rounded-full" aria-hidden="true" />Configuration</span>
        <span className="inline-flex items-center gap-1.5"><span className="bg-chart-1 size-2 rounded-full" aria-hidden="true" /><span className="bg-chart-1/45 h-0.5 w-3 rounded-full" aria-hidden="true" />Frontier, not beaten on both axes</span>
        <span className="sm:ml-auto">Higher and further right is better{log ? " · log scale" : ""}</span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------- concurrency sweep ------------------------------ */
/**
 * Plottable per-level metrics. Throughput keys are per GPU (divided by the run's GPUs): outputTps = output
 * tok/s/GPU, totalTpsPerGpu = total (input + output) tok/s/GPU; `perMinute` multiplies them by 60.
 */
export type SweepMetric = "outputTps" | "totalTpsPerGpu" | "ttftP95Ms" | "ttftP50Ms" | "ttftCeilingMs" | "itlP95Ms" | "itlP50Ms" | "successRate" | "outputTpsPerUser";
const gpusOf = (deployment: Deployment) => deployment.runGpus ?? deployment.gpus;
const isThroughput = (key: SweepMetric) => key === "outputTps" || key === "totalTpsPerGpu";
export function sweepValue(point: PointMetrics, key: SweepMetric, deployment: Deployment, perMinute = false): number | null {
  const scale = perMinute ? 60 : 1;
  if (key === "outputTps") return point.outputTps / gpusOf(deployment) * scale;
  if (key === "totalTpsPerGpu") return point.totalTps / gpusOf(deployment) * scale;
  if (key === "successRate") return point.successRate === null ? null : point.successRate * 100;
  return point[key];
}

/**
 * Metric against concurrency, one series per configuration. Hollow markers are levels outside the SLO; with
 * `markCapacity` every series gets a C_max ring and, for a single series, a vertical C_max line. `sustainable`
 * adds the horizontal sustainable line (C_max value × margin) for throughput metrics of a single series.
 * With no measured levels it renders the empty frame: axis titles, gridlines and the known policy reference
 * lines (`threshold`), a centred `emptyLabel`, no series and no invented concurrency ticks.
 * `secondary` adds a dashed companion series per configuration (e.g. ITL p50 beside p95, or the per-level
 * measured TTFT ceiling); it carries no pass marker and never defines C_max.
 */
/** Two x positions with no series values: gives the empty frame an x domain so policy reference lines draw. */
const EMPTY_FRAME = [{ concurrency: 0 }, { concurrency: 1 }];

/** Per-series stroke: colour and optional dash pattern, with an optional legend label. */
export interface SweepSeriesStyle { color: string; dash?: string; label?: string }

export function SweepChart({ deployments, metric, yAxisTitle, unit, threshold, thresholdLabel, markCapacity = false, sustainable = false, perMinute = false, percent = false, digits = 0, className, colorOffset = 0, title, expanded = false, legend = true, emptyLabel = "Not measured", secondary, seriesStyle }: {
  deployments: Deployment[]; metric: SweepMetric; yAxisTitle: string; unit: string; threshold?: number | null; thresholdLabel?: string;
  markCapacity?: boolean; sustainable?: boolean; perMinute?: boolean; percent?: boolean; digits?: number; className?: string; colorOffset?: number; title: string; expanded?: boolean; legend?: boolean; emptyLabel?: string;
  secondary?: { metric: SweepMetric; label: string };
  /** Overrides the default index colour per series (e.g. a fixed engine hue with versions told apart by lightness and dash). */
  seriesStyle?: (deployment: Deployment, index: number) => SweepSeriesStyle;
}) {
  const styleOf = (deployment: Deployment, index: number): SweepSeriesStyle => seriesStyle?.(deployment, index) ?? { color: `var(--chart-${((index + colorOffset) % 4) + 1})` };
  const sweeps = deployments.map((deployment) => ({ deployment, c: capacity(deployment, appState.slo) }));
  const levels = [...new Set(sweeps.flatMap(({ c }) => c.points.map((point) => point.concurrency)))].sort((a, b) => a - b);
  const limit = threshold ?? undefined;
  const height = expanded ? "h-[min(64vh,600px)]" : "h-[248px]";
  if (!levels.length) {
    const top = percent ? 100 : limit !== undefined ? limit * 1.5 : 1;
    const y = percent ? { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] } : niceDomain(0, top, 4);
    return (
      <figure className={cn("relative m-0", className)} data-empty-chart="true">
        <ComposedChart
          className={height} data={EMPTY_FRAME} xKey="concurrency" xScale="linear" xTicks={[]} xAxisTitle="Concurrent requests" yAxisTitle={yAxisTitle} showYAxis
          yDomain={[y.min, y.max]} yTicks={limit === undefined && !percent ? [] : y.ticks} yFormatter={(value) => percent ? `${num(value, 0)}%` : num(value, digits)} series={[]}
          referenceLines={limit !== undefined ? [{ y: limit, label: thresholdLabel ?? `SLO ${num(limit)} ${unit}` }] : []}
          animate={false} role="img" aria-label={`${title}: ${emptyLabel}.${limit !== undefined ? ` Ceiling ${num(limit)} ${unit}.` : ""}`}
        />
        <figcaption className="text-muted-foreground pointer-events-none absolute inset-0 grid place-items-center pb-6 text-xs font-medium">{emptyLabel}</figcaption>
      </figure>
    );
  }
  const data = levels.map((concurrency) => {
    const row: Record<string, unknown> = { concurrency };
    sweeps.forEach(({ deployment, c }, index) => {
      const point = c.points.find((item) => item.concurrency === concurrency);
      const value = point ? sweepValue(point, metric, deployment, perMinute) : null;
      if (point && value !== null) { row[`s${index}`] = value; row[`s${index}_pass`] = point.passes; }
      const extra = point && secondary ? sweepValue(point, secondary.metric, deployment, perMinute) : null;
      if (extra !== null) row[`s${index}_b`] = extra;
    });
    return row;
  });
  const single = sweeps.length === 1 ? sweeps[0]! : null;
  const sustainableValue = sustainable && single && isThroughput(metric) && single.c.selectedPoint
    ? (sweepValue(single.c.selectedPoint, metric, single.deployment, perMinute) ?? 0) * appState.slo.margin : null;
  const values = data.flatMap((row) => sweeps.flatMap((_, index) => [Number(row[`s${index}`]), Number(row[`s${index}_b`])])).filter(Number.isFinite);
  const y = percent ? { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] } : niceDomain(0, Math.max(...values, limit ?? 0) * 1.04, 4);
  const styles = sweeps.map(({ deployment }, index) => styleOf(deployment, index));
  const series: ComposedSeries[] = sweeps.map(({ deployment }, index) => ({
    key: `s${index}`, label: styles[index]!.label ?? configLabel(deployment), type: sweeps.length === 1 ? "area" : "line", curve: "linear", passKey: `s${index}_pass`,
    color: styles[index]!.color, dashArray: styles[index]!.dash,
  }));
  if (secondary) sweeps.forEach(({ deployment }, index) => series.push({
    key: `s${index}_b`, label: `${configLabel(deployment)} · ${secondary.label}`, type: "line", curve: "linear", dashed: true,
    color: styles[index]!.color,
  }));
  const markers = markCapacity ? sweeps.flatMap(({ deployment, c }, index) => {
    const point = c.selectedPoint;
    const value = point ? sweepValue(point, metric, deployment, perMinute) : null;
    return point && value !== null ? [{ x: point.concurrency, y: value, label: single ? `C_max ${point.concurrency}` : undefined, seriesKey: `s${index}` }] : [];
  }) : [];
  const referenceLines = [
    ...(limit !== undefined ? [{ y: limit, label: thresholdLabel ?? `SLO ${num(limit)} ${unit}` }] : []),
    ...(sustainableValue !== null ? [{ y: sustainableValue, label: `Sustainable ×${appState.slo.margin}`, dashed: true }] : []),
    ...(markCapacity && single?.c.selectedPoint ? [{ x: single.c.selectedPoint.concurrency, dashed: true }] : []),
  ];
  const format = (value: number) => percent ? `${num(value, 0)}%` : num(value, digits);
  const tickTarget = levels.length > 7 ? levels.filter((level) => level !== 48) : levels;
  return (
    <figure className={cn("m-0", className)}>
      <ComposedChart
        className={height}
        data={data}
        xKey="concurrency"
        xScale="log"
        xTicks={tickTarget}
        xFormatter={(value) => String(value)}
        tooltipLabelFormatter={(value) => `${value} concurrent request${String(value) === "1" ? "" : "s"}`}
        xAxisTitle="Concurrent requests (log scale)"
        yAxisTitle={yAxisTitle}
        showYAxis
        yDomain={[y.min, y.max]}
        yTicks={y.ticks}
        yFormatter={format}
        series={series}
        referenceLines={referenceLines}
        markers={markers}
        animate={false}
        role="img"
        aria-label={`${title}. ${sweeps.map(({ deployment }) => configLabel(deployment)).join(", ")}. Hollow markers are load levels outside the SLO. Exact values are in the table.`}
      />
      {legend || expanded ? <figcaption className="text-ink-2 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {sweeps.length > 1 ? sweeps.map(({ deployment }, index) => (
          <span key={deployment.id} className="inline-flex items-center gap-1.5" data-png-legend="" data-series-legend={index} data-series-color={styles[index]!.color} data-series-dash={styles[index]!.dash ?? "solid"}>
            <svg width="14" height="4" viewBox="0 0 14 4" aria-hidden="true" className="shrink-0"><line data-png-swatch="" x1="0" y1="2" x2="14" y2="2" stroke={styles[index]!.color} strokeWidth="2" strokeDasharray={styles[index]!.dash} /></svg>
            {styles[index]!.label ?? configLabel(deployment)}
          </span>
        )) : null}
        <SweepKey className={sweeps.length > 1 ? "sm:ml-auto" : undefined} />
      </figcaption> : null}
    </figure>
  );
}

export function SweepKey({ className }: { className?: string }) {
  return (
    <span className={cn("text-muted-foreground inline-flex items-center gap-3 text-xs", className)}>
      <span className="inline-flex items-center gap-1.5"><span className="bg-ink-2 size-2 rounded-full" aria-hidden="true" />Meets SLO</span>
      <span className="inline-flex items-center gap-1.5"><span className="border-ink-2 size-2 rounded-full border-[1.5px]" aria-hidden="true" />Outside SLO</span>
    </span>
  );
}

/* --------------------------- throughput vs interactivity --------------------------- */
interface InteractivityDatum { x: number; y: number; concurrency: number; passes: boolean; cmax: boolean; ttft: number | null; itl: number | null }

function InteractivityTooltip({ active, payload, labels }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown; name?: unknown }>; labels: Map<string, { label: string; color: string }> }) {
  const item = payload?.find((entry) => entry.payload);
  if (!active || !item) return null;
  const datum = item.payload as InteractivityDatum;
  const series = labels.get(String(item.name));
  return (
    <div className="bg-popover text-popover-foreground shadow-float grid min-w-[13rem] gap-1.5 rounded-lg border px-3 py-2.5 text-xs">
      <div className="font-medium tabular-nums">{datum.concurrency} concurrent requests{datum.cmax ? " · C_max" : ""}</div>
      {series ? <div className="text-muted-foreground flex items-center gap-2"><span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: series.color }} aria-hidden="true" /><span className="truncate">{series.label}</span></div> : null}
      <div className="grid gap-1 border-t pt-1.5 tabular-nums">
        <span className="flex justify-between gap-4"><span className="text-muted-foreground">Per-user speed, p50</span><span className="font-semibold">{num(datum.x, 1)} tok/s</span></span>
        <span className="flex justify-between gap-4"><span className="text-muted-foreground">Output per GPU</span><span className="font-semibold">{num(datum.y)} tok/s</span></span>
        <span className="flex justify-between gap-4"><span className="text-muted-foreground">TTFT p95 · ITL p95</span><span>{num(datum.ttft)} · {num(datum.itl, 1)} ms</span></span>
        <span className={datum.passes ? "text-good-text" : "text-warning-text"}>{datum.passes ? "Inside SLO" : "Outside SLO"}</span>
      </div>
    </div>
  );
}

/**
 * Output tok/s per GPU against per-user output speed (p50), one line per configuration in concurrency order.
 * Levels without a per-user observation are skipped (never plotted as zero). Hollow markers are levels outside
 * the SLO; the ring marks C_max. Up and to the right is better.
 */
export function InteractivityChart({ deployments, title, className, expanded = false, colorOffset = 0 }: {
  deployments: Deployment[]; title: string; className?: string; expanded?: boolean; colorOffset?: number;
}) {
  const sweeps = deployments.map((deployment, index) => {
    const c = capacity(deployment, appState.slo);
    const data: InteractivityDatum[] = c.points
      .filter((point) => point.outputTpsPerUser !== null && Number.isFinite(point.outputTpsPerUser))
      .map((point) => ({ x: point.outputTpsPerUser!, y: point.outputTps / gpusOf(deployment), concurrency: point.concurrency, passes: point.passes, cmax: point === c.selectedPoint, ttft: point.ttftP95Ms, itl: point.itlP95Ms }));
    return { key: `s${index}`, deployment, data, color: `var(--chart-${((index + colorOffset) % 4) + 1})` };
  }).filter((sweep) => sweep.data.length);
  const xs = sweeps.flatMap((s) => s.data.map((d) => d.x)), ys = sweeps.flatMap((s) => s.data.map((d) => d.y));
  if (!xs.length) return <p className="text-muted-foreground py-8 text-center text-xs">No level reports per-user speed.</p>;
  const x = niceDomain(0, Math.max(...xs) * 1.04, 5), y = niceDomain(0, Math.max(...ys) * 1.04, 4);
  const config = Object.fromEntries(sweeps.map((s) => [s.key, { label: configLabel(s.deployment), color: s.color }]));
  const labels = new Map(sweeps.map((s) => [s.key, { label: configLabel(s.deployment), color: s.color }]));
  const yFormat = (value: number) => num(value);
  const dot = (color: string) => (props: unknown) => {
    const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: InteractivityDatum };
    if (cx === undefined || cy === undefined || !payload) return <g />;
    return (
      <g>
        {payload.cmax ? <circle cx={cx} cy={cy} r={8} fill="none" stroke={color} strokeWidth={1.5} /> : null}
        <circle cx={cx} cy={cy} r={4} fill={payload.passes ? color : "var(--card)"} stroke={payload.passes ? "var(--card)" : color} strokeWidth={2} />
      </g>
    );
  };
  return (
    <figure className={cn("m-0", className)}>
      <ChartContainer
        config={config}
        className={cn("aspect-auto w-full", expanded ? "h-[min(64vh,600px)]" : "h-[248px]")}
        role="img"
        aria-label={`${title}. ${sweeps.map((s) => `${configLabel(s.deployment)}: ${s.data.length} levels`).join("; ")}. Hollow markers are load levels outside the SLO; the ring marks C_max. Exact values are in the summary table.`}
      >
        <RechartsScatterChart accessibilityLayer={false} margin={{ top: 26, right: 16, bottom: 18, left: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="" vertical={false} />
          <XAxis type="number" dataKey="x" domain={[x.min, x.max]} ticks={x.ticks} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={8} tickFormatter={(value: number) => num(value)}
            label={{ value: "Per-user output speed, p50 (tok/s per request)", position: "insideBottomRight", offset: -14, className: "fill-muted-foreground text-[11.5px]" }} />
          <YAxis type="number" dataKey="y" domain={[y.min, y.max]} ticks={y.ticks} tickLine={false} axisLine={false} tickMargin={8} width={yAxisWidth(y.ticks, yFormat)} tickFormatter={yFormat} label={yAxisTitleLabel("Output tok/s per GPU")} />
          <RechartsTooltip cursor={false} isAnimationActive={false} content={<InteractivityTooltip labels={labels} />} />
          {sweeps.map((s) => (
            <Scatter key={s.key} name={s.key} data={s.data} fill={s.color} line={{ stroke: s.color, strokeWidth: 2, strokeOpacity: 0.7 }} lineType="joint" shape={dot(s.color)} isAnimationActive={false} />
          ))}
        </RechartsScatterChart>
      </ChartContainer>
      {expanded ? <figcaption className="text-ink-2 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {sweeps.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />{configLabel(s.deployment)}</span>)}
        <SweepKey className="sm:ml-auto" />
      </figcaption> : null}
    </figure>
  );
}

/**
 * Token mix per load level: input and output tok/s per GPU at every measured concurrency as stacked bars (input dark,
 * output light, one hue, one y-axis), so the prefill/decode share and where throughput stops growing read at a glance.
 * The dashed vertical line marks C_max; levels outside the SLO are drawn outlined and faint. Measured values only, no margin applied;
 * a level without data has no bar. The stack top equals totalTps / GPU, the numerator of the sustainable value: the import
 * (parseMetricRow) rejects rows where totalTps and inputTps + outputTps differ by more than 1 %.
 */
export function TokenMixChart({ deployment, cmax, className, expanded = false }: { deployment: Deployment; cmax: number | null; className?: string; expanded?: boolean }) {
  const gpus = gpusOf(deployment);
  const points = [...deployment.points].sort((a, b) => a.concurrency - b.concurrency);
  // Pass/fail per level under the active SLO, so a level outside it is drawn as failed (outlined, faint), not as capacity.
  const passByLevel = new Map(capacity(deployment, appState.slo).points.map((point) => [point.concurrency, point.passes]));
  const data = points.map((point) => ({ level: String(point.concurrency), input: point.inputTps / gpus, output: point.outputTps / gpus, pass: passByLevel.get(point.concurrency) ?? false }));
  const failing = data.filter((row) => !row.pass).length;
  const height = expanded ? "h-[min(62vh,560px)]" : "h-[260px]";
  const y = niceDomain(0, Math.max(1, ...data.map((row) => row.input + row.output)), 5);
  return (
    <figure className={cn("m-0", className)} data-testid="token-mix-chart" data-levels={data.length}>
      <ComposedChart
        className={height}
        data={data}
        xKey="level"
        series={[
          { key: "input", label: "Input tok/s/GPU", type: "bar", stackId: "mix", color: "var(--chart-1)", passKey: "pass" },
          { key: "output", label: "Output tok/s/GPU", type: "bar", stackId: "mix", color: "color-mix(in oklab, var(--chart-1) 40%, var(--card))", passKey: "pass" },
        ]}
        referenceLines={cmax !== null ? [{ x: String(cmax), label: `C_max=${num(cmax)}`, dashed: true }] : []}
        showYAxis
        yDomain={[y.min, y.max]}
        yTicks={y.ticks}
        yFormatter={(value) => num(value)}
        xAxisTitle="Concurrent requests"
        yAxisTitle="tok/s per GPU"
        tooltipLabelFormatter={(value) => `${value} concurrent request${String(value) === "1" ? "" : "s"}`}
        barRadius={2}
        animate={false}
        role="img"
        aria-label={`Input and output tok/s per GPU by concurrency for ${configLabel(deployment)}: ${data.map((row) => `${row.level}: ${num(row.input)} in, ${num(row.output)} out${row.pass ? "" : " (outside the SLO)"}`).join("; ")}.${cmax !== null ? ` C_max ${num(cmax)}.` : ""}`}
      />
      <figcaption className="text-ink-2 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5" data-png-legend=""><span className="size-2.5 rounded-[2px]" style={{ backgroundColor: "var(--chart-1)" }} aria-hidden="true" data-png-swatch="" />Input</span>
        <span className="inline-flex items-center gap-1.5" data-png-legend=""><span className="size-2.5 rounded-[2px]" style={{ backgroundColor: "color-mix(in oklab, var(--chart-1) 40%, var(--card))" }} aria-hidden="true" data-png-swatch="" />Output</span>
        {failing ? <span className="inline-flex items-center gap-1.5" data-png-legend="" data-testid="token-mix-failing"><span className="size-2.5 rounded-[2px] border border-dashed" style={{ borderColor: "var(--chart-1)" }} aria-hidden="true" data-png-swatch="" />Outside the SLO ({failing} level{failing === 1 ? "" : "s"})</span> : null}
        <span className="text-muted-foreground sm:ml-auto">Observed, before the {num(appState.slo.margin, 2)} margin</span>
      </figcaption>
    </figure>
  );
}
