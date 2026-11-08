import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { ChartContainer } from "@/components/ui/chart";
import { yAxisTitleLabel, yAxisWidth } from "@/lib/chart-axis";
import { niceDomain } from "@/scale";
import type { Capacity, Deployment } from "../../../domain/types.js";
import { gpusOf, num } from "../../lib/display.js";

/*
 * Total throughput (input + output tok/s per GPU) against the measured concurrency levels of one run.
 * x: the measured levels as evenly spaced categories (1, 2, 4 … 48, 64 …); no level is invented between them.
 * Line style encodes the SLO verdict: a segment is continuous only between two passing levels, otherwise dashed;
 * passing levels are filled points, failing levels hollow. The ring and its label mark C_max; the dashed horizontal
 * line is the sustainable rate (observed total tok/s/GPU at C_max × margin); the shaded band covers the levels
 * beyond C_max. One y-axis. The SLO evaluation table below the chart is its textual equivalent.
 *
 * Published overlay (optional): external curves whose metric is the chart's own (total tok/s per GPU) are drawn on
 * the same axis in neutral grey, short-dashed, with small hollow points and a tag ("P1") at their last level. Their
 * concurrency levels join the category axis (the union stays evenly spaced); a measured segment still joins two
 * adjacent measured levels only. External values never feed C_max, the sustainable line or the SLO verdicts. This
 * component takes plain curves, so the chart module does not import the external data layer.
 */

/** One published curve on the chart's metric: concurrency → value as the source published it. */
export interface OverlayCurve {
  key: string; tag: string; label: string; derived: boolean; points: { concurrency: number; value: number }[];
  /** Published workload ("ISL 1,024 / OSL 256" or "workload not stated"). */
  workload: string;
  /** True when the published ISL/OSL is not the measured run's workload (or is not stated). */
  workloadDiffers: boolean;
}

interface Datum {
  level: string; concurrency: number;
  /** Measured value at this level; null for a level only a published curve has. */
  value: number | null; passes: boolean; cmax: boolean;
  ttft: number | null; ttftCeiling: number | null; itl: number | null; failures: string[];
  [key: string]: unknown;
}

function ChartTooltip({ active, payload, curves }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }>; curves: readonly OverlayCurve[] }) {
  const datum = payload?.find((entry) => entry.payload)?.payload as Datum | undefined;
  if (!active || !datum) return null;
  const external = curves.flatMap((curve, index) => {
    const value = datum[`ext${index}`];
    return typeof value === "number" ? [{ curve, value }] : [];
  });
  return (
    <div className="bg-popover text-popover-foreground shadow-float grid min-w-[13rem] max-w-[20rem] gap-1.5 rounded-lg border px-3 py-2.5 text-xs">
      <div className="font-medium tabular-nums">{datum.concurrency} concurrent requests{datum.cmax ? " · C_max" : ""}</div>
      {datum.value !== null ? (
        <div className="grid gap-1 border-t pt-1.5 tabular-nums">
          <span className="flex justify-between gap-4"><span className="text-muted-foreground">Total tok/s per GPU</span><span className="font-semibold">{num(datum.value)}</span></span>
          <span className="flex justify-between gap-4"><span className="text-muted-foreground">TTFT p95 / ceiling</span><span>{num(datum.ttft)} / {num(datum.ttftCeiling)} ms</span></span>
          <span className="flex justify-between gap-4"><span className="text-muted-foreground">ITL p95</span><span>{num(datum.itl, 1)} ms</span></span>
          <span className={datum.passes ? "text-good-text" : "text-critical-text"}>{datum.passes ? "Meets SLO" : `Out of SLO · ${datum.failures.join(", ")}`}</span>
        </div>
      ) : <div className="text-muted-foreground border-t pt-1.5">No measured level here</div>}
      {external.length ? (
        <div className="grid gap-1 border-t pt-1.5 tabular-nums" data-tooltip-external="">
          <span className="text-muted-foreground">Published (external, no SLO applied)</span>
          {external.map(({ curve, value }) => (
            <span key={curve.key} className="grid gap-0" data-tooltip-curve={curve.tag}>
              <span className="flex justify-between gap-4">
                <span className="text-muted-foreground min-w-0 truncate"><span className="text-foreground font-medium">{curve.tag}</span> {curve.label}</span>
                <span>{num(value)}{curve.derived ? " (derived)" : ""}</span>
              </span>
              <span className={cn("text-[11px]", curve.workloadDiffers ? "text-warning-text" : "text-muted-foreground")} data-workload-differs={curve.workloadDiffers || undefined}>{curve.workload}{curve.workloadDiffers ? " · workload differs" : " · same workload"}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Legend swatch: a short line (solid or dashed) through a point (filled or hollow). */
function LineSwatch({ dashed, hollow, color = "var(--chart-1)", dash = "4 3" }: { dashed?: boolean; hollow?: boolean; color?: string; dash?: string }) {
  return (
    <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true" className="shrink-0">
      <line x1="1" y1="5" x2="25" y2="5" stroke={color} strokeWidth="2" strokeDasharray={dashed ? dash : undefined} />
      <circle cx="13" cy="5" r="3.5" fill={hollow ? "var(--card)" : color} stroke={hollow ? color : "var(--card)"} strokeWidth="1.5" />
    </svg>
  );
}

/** Published-curve legend swatch (shared with the external panel so the encoding is stated once). */
export const ExternalSwatch = () => <LineSwatch dashed hollow color="var(--chart-neutral)" dash="2 2" />;

export function ThroughputConcurrencyChart({ deployment: d, capacity: c, margin, expanded = false, className, external = [] }: {
  deployment: Deployment; capacity: Capacity; margin: number; expanded?: boolean; className?: string; external?: readonly OverlayCurve[];
}) {
  const gpus = gpusOf(d);
  const cmax = c.selectedPoint;
  const own = new Map(c.points.map((point) => [point.concurrency, point]));
  const levels = [...new Set([...c.points.map((point) => point.concurrency), ...external.flatMap((curve) => curve.points.map((point) => point.concurrency))])].sort((a, b) => a - b);
  const data: Datum[] = levels.map((concurrency) => {
    const point = own.get(concurrency);
    const datum: Datum = point
      ? { level: String(concurrency), concurrency, value: point.totalTps / gpus, passes: point.passes, cmax: point === cmax, ttft: point.ttftP95Ms, ttftCeiling: point.ttftCeilingMs, itl: point.itlP95Ms, failures: point.failures }
      : { level: String(concurrency), concurrency, value: null, passes: false, cmax: false, ttft: null, ttftCeiling: null, itl: null, failures: [] };
    external.forEach((curve, index) => { datum[`ext${index}`] = curve.points.find((item) => item.concurrency === concurrency)?.value ?? null; });
    return datum;
  });
  const measured = data.filter((datum) => datum.value !== null);
  if (!measured.length) return null;
  // Continuous segments: one line per pair of adjacent measured levels that both pass (endpoints only, so a level
  // that only a published curve has never breaks or bends a measured segment).
  const segments: number[] = [];
  measured.forEach((datum, index) => {
    const next = measured[index + 1];
    if (!next || !datum.passes || !next.passes) return;
    const key = `seg${segments.length}`;
    datum[key] = datum.value; next[key] = next.value;
    segments.push(segments.length);
  });
  const sustainable = c.observedTotalTpsPerGpu === null ? null : c.observedTotalTpsPerGpu * margin;
  const externalValues = external.flatMap((curve) => curve.points.map((point) => point.value));
  const y = niceDomain(0, Math.max(...measured.map((datum) => datum.value!), sustainable ?? 0, ...externalValues) * 1.08, 4);
  const format = (value: number) => num(value);
  const last = data.at(-1)!;
  const lastMeasured = measured.at(-1)!;
  // Shaded band: every level beyond C_max (or the whole sweep when no level passes).
  const band = cmax === null ? { x1: data[0]!.level, x2: last.level } : cmax.concurrency !== last.concurrency ? { x1: String(cmax.concurrency), x2: last.level } : null;
  const dot = (props: unknown) => {
    const { cx, cy, payload, index } = props as { cx?: number; cy?: number; payload?: Datum; index?: number };
    if (cx === undefined || cy === undefined || cx === null || cy === null || !payload || payload.value === null) return <g key={index} />;
    const rising = payload.concurrency !== lastMeasured.concurrency;
    return (
      <g key={index} data-level={payload.concurrency} data-pass={payload.passes ? "true" : "false"}>
        {payload.cmax ? (
          <>
            <circle cx={cx} cy={cy} r={8.5} fill="none" stroke="var(--chart-1)" strokeWidth={1.5} data-cmax-ring="true" />
            {/* Above-left of the ring when a higher level follows, so the rising segment beyond C_max never crosses the text. */}
            <text x={rising ? cx - 12 : cx} y={rising ? cy - 10 : cy - 15} textAnchor={rising ? "end" : "middle"} fill="var(--foreground)" fontSize={11.5} fontWeight={600} data-cmax-label="true">C_max={payload.concurrency}</text>
          </>
        ) : null}
        <circle cx={cx} cy={cy} r={4} fill={payload.passes ? "var(--chart-1)" : "var(--card)"} stroke={payload.passes ? "var(--card)" : "var(--chart-1)"} strokeWidth={2} />
      </g>
    );
  };
  // Curves that end on the same level put their tags side by side instead of on top of each other.
  const tagOffset = (curveIndex: number): number => {
    const end = external[curveIndex]?.points.at(-1)?.concurrency;
    return external.slice(0, curveIndex).filter((curve) => curve.points.at(-1)?.concurrency === end).length * 20;
  };
  const externalDot = (curveIndex: number) => (props: unknown) => {
    const { cx, cy, payload, index } = props as { cx?: number | null; cy?: number | null; payload?: Datum; index?: number };
    const value = payload?.[`ext${curveIndex}`];
    if (cx == null || cy == null || typeof value !== "number") return <g key={index} />;
    const curve = external[curveIndex]!;
    const end = curve.points.at(-1)?.concurrency === payload!.concurrency;
    return (
      <g key={index} data-external-point={curve.key} data-level={payload!.concurrency}>
        <circle cx={cx} cy={cy} r={2.75} fill="var(--card)" stroke="var(--chart-neutral)" strokeWidth={1.5} />
        {end ? <text x={cx + 6 + tagOffset(curveIndex)} y={cy + 4} fill="var(--muted-foreground)" fontSize={11} fontWeight={600} data-external-tag={curve.tag}>{curve.tag}</text> : null}
      </g>
    );
  };
  const passing = measured.filter((datum) => datum.passes).length;
  const label = `Total throughput per GPU against ${measured.length} measured concurrency levels; ${passing} meet the SLO; ${cmax ? `C_max ${cmax.concurrency}` : "no level meets the SLO"}${sustainable !== null ? `; sustainable rate ${num(sustainable)} tok/s per GPU (observed × ${margin})` : ""}${external.length ? `; ${external.length} published curve${external.length === 1 ? "" : "s"} (external, grey dashed, listed below the chart)` : ""}. Exact values are in the SLO evaluation table.`;
  return (
    <figure className={cn("m-0", className)} data-testid="throughput-chart" data-external-curves={external.length || undefined}>
      <ChartContainer
        config={{ value: { label: "Total tok/s per GPU", color: "var(--chart-1)" } }}
        className={cn("aspect-auto w-full", expanded ? "h-[min(64vh,600px)]" : "h-[280px] max-sm:h-[248px]")}
        role="img"
        aria-label={label}
      >
        <ComposedChart data={data} accessibilityLayer margin={{ top: 28, right: external.length ? 28 + Math.max(0, ...external.map((_, index) => tagOffset(index))) : 16, bottom: 18, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="" />
          {band ? <ReferenceArea x1={band.x1} x2={band.x2} yAxisId="left" fill="var(--muted-foreground)" fillOpacity={0.08} stroke="none" ifOverflow="extendDomain" /> : null}
          <XAxis dataKey="level" type="category" tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={8} interval={0} padding={{ left: 12, right: 12 }}
            label={{ value: external.length ? "Concurrent requests (measured and published levels)" : "Concurrent requests (measured levels)", position: "insideBottomRight", offset: -14, className: "fill-muted-foreground text-[11.5px]" }} />
          <YAxis yAxisId="left" domain={[y.min, y.max]} ticks={y.ticks} tickLine={false} axisLine={false} tickMargin={8} width={yAxisWidth(y.ticks, format)} tickFormatter={format} label={yAxisTitleLabel("Total tok/s per GPU")} />
          <RechartsTooltip cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} isAnimationActive={false} content={<ChartTooltip curves={external} />} />
          {sustainable !== null ? (
            <ReferenceLine yAxisId="left" y={sustainable} stroke="var(--secondary-ink)" strokeWidth={1} strokeDasharray="6 4" ifOverflow="extendDomain"
              label={{ value: `Sustainable ×${margin}`, position: "insideTopLeft", fill: "var(--secondary-ink)", fontSize: 11.5, fontWeight: 500 }} />
          ) : null}
          {/* Published curves first, so the measured run draws on top. */}
          {external.map((curve, index) => (
            <Line key={curve.key} yAxisId="left" dataKey={`ext${index}`} type="linear" stroke="var(--chart-neutral)" strokeWidth={1.5} strokeDasharray="2 2" connectNulls
              dot={externalDot(index)} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" />
          ))}
          {/* Dashed line through every measured level (carries the points), continuous line only between passing levels. */}
          <Line yAxisId="left" dataKey="value" type="linear" stroke="var(--chart-1)" strokeWidth={2} strokeDasharray="5 4" connectNulls dot={dot} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
          {segments.map((index) => (
            <Line key={`seg${index}`} yAxisId="left" dataKey={`seg${index}`} type="linear" stroke="var(--chart-1)" strokeWidth={2.25} connectNulls dot={false} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" />
          ))}
        </ComposedChart>
      </ChartContainer>
      <figcaption className="text-ink-2 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs" data-testid="throughput-chart-legend">
        <span className="inline-flex items-center gap-1.5" data-legend="meets"><LineSwatch />Meets SLO — continuous line, filled point</span>
        <span className="inline-flex items-center gap-1.5" data-legend="out"><LineSwatch dashed hollow />Out of SLO — dashed line, hollow point (TTFT/ITL p95 or success breach)</span>
        {sustainable !== null ? (
          <span className="inline-flex items-center gap-1.5" data-legend="sustainable">
            <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" stroke="var(--secondary-ink)" strokeWidth="1.5" strokeDasharray="5 3" /></svg>
            Sustainable rate — observed ×{margin} ({num(sustainable)} tok/s/GPU)
          </span>
        ) : null}
        {band ? <span className="inline-flex items-center gap-1.5" data-legend="beyond"><span className="bg-muted-foreground/15 h-2.5 w-4 rounded-[2px]" aria-hidden="true" />{cmax ? "Beyond C_max" : "No level inside the SLO"}</span> : null}
        {external.length ? (
          <span className="inline-flex items-center gap-1.5" data-legend="external">
            <ExternalSwatch />Published (external) — grey short dash, {external.map((curve) => curve.tag).join(", ")}; sources under the chart, no SLO applied
          </span>
        ) : null}
        {external.some((curve) => curve.workloadDiffers) ? (
          <span className="inline-flex flex-wrap items-center gap-1.5" data-legend="workload-differs">
            <span className="bg-muted text-ink-2 inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium before:size-1.5 before:rounded-full before:bg-warning before:content-['']">workload differs</span>
            <span className="tabular-nums">{external.filter((curve) => curve.workloadDiffers).map((curve) => `${curve.tag} ${curve.workload}`).join(" · ")} — not the measured run's input/output lengths</span>
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
