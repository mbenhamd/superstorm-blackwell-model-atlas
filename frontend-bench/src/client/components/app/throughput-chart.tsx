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
 */

interface Datum {
  level: string; concurrency: number; value: number; solid: number | null; passes: boolean; cmax: boolean;
  ttft: number | null; ttftCeiling: number | null; itl: number | null; failures: string[];
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const datum = payload?.find((entry) => entry.payload)?.payload as Datum | undefined;
  if (!active || !datum) return null;
  return (
    <div className="bg-popover text-popover-foreground shadow-float grid min-w-[13rem] gap-1.5 rounded-lg border px-3 py-2.5 text-xs">
      <div className="font-medium tabular-nums">{datum.concurrency} concurrent requests{datum.cmax ? " · C_max" : ""}</div>
      <div className="grid gap-1 border-t pt-1.5 tabular-nums">
        <span className="flex justify-between gap-4"><span className="text-muted-foreground">Total tok/s per GPU</span><span className="font-semibold">{num(datum.value)}</span></span>
        <span className="flex justify-between gap-4"><span className="text-muted-foreground">TTFT p95 / ceiling</span><span>{num(datum.ttft)} / {num(datum.ttftCeiling)} ms</span></span>
        <span className="flex justify-between gap-4"><span className="text-muted-foreground">ITL p95</span><span>{num(datum.itl, 1)} ms</span></span>
        <span className={datum.passes ? "text-good-text" : "text-critical-text"}>{datum.passes ? "Meets SLO" : `Out of SLO · ${datum.failures.join(", ")}`}</span>
      </div>
    </div>
  );
}

/** Legend swatch: a short line (solid or dashed) through a point (filled or hollow). */
function LineSwatch({ dashed, hollow }: { dashed?: boolean; hollow?: boolean }) {
  return (
    <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true" className="shrink-0">
      <line x1="1" y1="5" x2="25" y2="5" stroke="var(--chart-1)" strokeWidth="2" strokeDasharray={dashed ? "4 3" : undefined} />
      <circle cx="13" cy="5" r="3.5" fill={hollow ? "var(--card)" : "var(--chart-1)"} stroke={hollow ? "var(--chart-1)" : "var(--card)"} strokeWidth="1.5" />
    </svg>
  );
}

export function ThroughputConcurrencyChart({ deployment: d, capacity: c, margin, expanded = false, className }: {
  deployment: Deployment; capacity: Capacity; margin: number; expanded?: boolean; className?: string;
}) {
  const gpus = gpusOf(d);
  const cmax = c.selectedPoint;
  const data: Datum[] = c.points.map((point) => {
    const value = point.totalTps / gpus;
    return {
      level: String(point.concurrency), concurrency: point.concurrency, value, solid: point.passes ? value : null, passes: point.passes,
      cmax: point === cmax, ttft: point.ttftP95Ms, ttftCeiling: point.ttftCeilingMs, itl: point.itlP95Ms, failures: point.failures,
    };
  });
  if (!data.length) return null;
  const sustainable = c.observedTotalTpsPerGpu === null ? null : c.observedTotalTpsPerGpu * margin;
  const y = niceDomain(0, Math.max(...data.map((datum) => datum.value), sustainable ?? 0) * 1.08, 4);
  const format = (value: number) => num(value);
  const last = data.at(-1)!;
  // Shaded band: every level beyond C_max (or the whole sweep when no level passes).
  const band = cmax === null ? { x1: data[0]!.level, x2: last.level } : cmax.concurrency !== last.concurrency ? { x1: String(cmax.concurrency), x2: last.level } : null;
  const dot = (props: unknown) => {
    const { cx, cy, payload, index } = props as { cx?: number; cy?: number; payload?: Datum; index?: number };
    if (cx === undefined || cy === undefined || !payload) return <g key={index} />;
    return (
      <g key={index} data-level={payload.concurrency} data-pass={payload.passes ? "true" : "false"}>
        {payload.cmax ? (
          <>
            <circle cx={cx} cy={cy} r={8.5} fill="none" stroke="var(--chart-1)" strokeWidth={1.5} data-cmax-ring="true" />
            {/* Above-left of the ring when a higher level follows, so the rising segment beyond C_max never crosses the text. */}
            <text x={payload.concurrency === last.concurrency ? cx : cx - 12} y={payload.concurrency === last.concurrency ? cy - 15 : cy - 10} textAnchor={payload.concurrency === last.concurrency ? "middle" : "end"} fill="var(--foreground)" fontSize={11.5} fontWeight={600} data-cmax-label="true">C_max={payload.concurrency}</text>
          </>
        ) : null}
        <circle cx={cx} cy={cy} r={4} fill={payload.passes ? "var(--chart-1)" : "var(--card)"} stroke={payload.passes ? "var(--card)" : "var(--chart-1)"} strokeWidth={2} />
      </g>
    );
  };
  const passing = data.filter((datum) => datum.passes).length;
  const label = `Total throughput per GPU against ${data.length} measured concurrency levels; ${passing} meet the SLO; ${cmax ? `C_max ${cmax.concurrency}` : "no level meets the SLO"}${sustainable !== null ? `; sustainable rate ${num(sustainable)} tok/s per GPU (observed × ${margin})` : ""}. Exact values are in the SLO evaluation table.`;
  return (
    <figure className={cn("m-0", className)} data-testid="throughput-chart">
      <ChartContainer
        config={{ value: { label: "Total tok/s per GPU", color: "var(--chart-1)" } }}
        className={cn("aspect-auto w-full", expanded ? "h-[min(64vh,600px)]" : "h-[280px] max-sm:h-[248px]")}
        role="img"
        aria-label={label}
      >
        <ComposedChart data={data} accessibilityLayer margin={{ top: 28, right: 16, bottom: 18, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="" />
          {band ? <ReferenceArea x1={band.x1} x2={band.x2} yAxisId="left" fill="var(--muted-foreground)" fillOpacity={0.08} stroke="none" ifOverflow="extendDomain" /> : null}
          <XAxis dataKey="level" type="category" tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={8} interval={0} padding={{ left: 12, right: 12 }}
            label={{ value: "Concurrent requests (measured levels)", position: "insideBottomRight", offset: -14, className: "fill-muted-foreground text-[11.5px]" }} />
          <YAxis yAxisId="left" domain={[y.min, y.max]} ticks={y.ticks} tickLine={false} axisLine={false} tickMargin={8} width={yAxisWidth(y.ticks, format)} tickFormatter={format} label={yAxisTitleLabel("Total tok/s per GPU")} />
          <RechartsTooltip cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} isAnimationActive={false} content={<ChartTooltip />} />
          {sustainable !== null ? (
            <ReferenceLine yAxisId="left" y={sustainable} stroke="var(--secondary-ink)" strokeWidth={1} strokeDasharray="6 4" ifOverflow="extendDomain"
              label={{ value: `Sustainable ×${margin}`, position: "insideTopLeft", fill: "var(--secondary-ink)", fontSize: 11.5, fontWeight: 500 }} />
          ) : null}
          {/* Dashed line through every level (carries the points), continuous line only between passing levels. */}
          <Line yAxisId="left" dataKey="value" type="linear" stroke="var(--chart-1)" strokeWidth={2} strokeDasharray="5 4" dot={dot} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
          <Line yAxisId="left" dataKey="solid" type="linear" stroke="var(--chart-1)" strokeWidth={2.25} dot={false} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" />
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
      </figcaption>
    </figure>
  );
}
