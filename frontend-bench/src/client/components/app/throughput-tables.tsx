import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LatencyStats, MetricRow, PointMetrics, RankedDeployment, SloPolicy } from "../../../domain/types.js";
import { gpusOf, num, pct } from "../../lib/display.js";

/*
 * Throughput tables. SLO evaluation: one row per measured level with the two p95 values the verdict reads and
 * one mark per gate (TTFT, ITL, success) plus the overall verdict; the C_max row is highlighted and tagged.
 * Measured results: every statistic the imported GuideLLM report carries per level, verbatim; "—" when not reported.
 */

function Gate({ pass, label, title, detail }: { pass: boolean; label: string; title?: string; detail?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center gap-1 font-medium", pass ? "text-good-text" : "text-critical-text")} data-gate={label} data-result={pass ? "pass" : "fail"} title={title}>
      {pass ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
      <span className="sr-only">{label} {pass ? "pass" : "fail"}{detail ? `, ${detail}` : ""}</span>
    </span>
  );
}

const gateTitle = (point: PointMetrics, gate: "TTFT" | "ITL" | "Success", slo: SloPolicy): string => {
  if (gate === "TTFT") return point.ttftP95Ms === null || point.ttftCeilingMs === null ? "Missing TTFT p95 or ceiling: never passes" : `TTFT p95 ${num(point.ttftP95Ms)} ms vs ceiling ${num(point.ttftCeilingMs)} ms`;
  if (gate === "ITL") return point.itlP95Ms === null ? "Missing ITL p95: never passes" : `ITL p95 ${num(point.itlP95Ms, 1)} ms vs ceiling ${num(slo.itlP95Ms)} ms`;
  return `Success ${pct(point.successRate)} vs floor ${pct(slo.minSuccessRate, 0)}`;
};

/**
 * Per-level SLO verdicts: p95 TTFT (with its ceiling), p95 ITL, one mark per gate and the overall verdict. Below
 * 640px the three per-gate columns drop: the failed criterion is the red value (TTFT, ITL, or a red success rate
 * under the overall mark), so concurrency, both p95 values and the overall verdict fit without horizontal scroll.
 */
export function SloEvaluationTable({ row, slo }: { row: RankedDeployment; slo: SloPolicy }) {
  const c = row.capacity;
  // One ceiling for every level (single-turn datasets): state it once in the header and keep the rows narrow.
  // Compared as displayed (whole ms): per-level prompt token counts can differ by a fraction of a millisecond.
  const ceilings = new Set(c.points.map((point) => num(point.ttftCeilingMs)));
  const shared = ceilings.size === 1 && c.points[0]?.ttftCeilingMs != null ? c.points[0].ttftCeilingMs : null;
  return (
    <div className="overflow-x-auto">
      <Table data-testid="slo-evaluation" className="text-[12.5px] [&_td]:px-2 [&_th]:h-auto [&_th]:px-2 [&_th]:py-1.5">
        <TableHeader>
          <TableRow>
            <TableHead title="Concurrent requests">Concurrency</TableHead>
            <TableHead className="text-right" title="p95 time to first token, ms, against its ceiling">TTFT p95 <span className="font-normal text-muted-foreground">ms</span>{shared !== null ? <span className="block font-normal text-muted-foreground leading-tight" data-testid="slo-ttft-ceiling">≤ {num(shared)}</span> : null}</TableHead>
            <TableHead className="text-right" title="p95 inter-token latency, ms per token">ITL p95 <span className="font-normal text-muted-foreground">ms</span></TableHead>
            <TableHead className="text-center max-sm:hidden">TTFT</TableHead>
            <TableHead className="text-center max-sm:hidden">ITL</TableHead>
            <TableHead className="text-center max-sm:hidden" title="Request success rate against its floor">Success</TableHead>
            <TableHead className="text-center">Overall</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {c.points.map((point) => {
            const cmax = point === c.selectedPoint;
            const fails = (gate: string) => point.failures.includes(gate);
            return (
              <TableRow key={point.concurrency} data-level={point.concurrency} data-capacity={cmax || undefined} data-verdict={point.passes ? "pass" : "fail"} className={cn("h-9", cmax && "bg-selection hover:bg-selection")}>
                <TableCell className="py-1.5 font-medium tabular-nums">
                  <span className="inline-flex items-center gap-2">{point.concurrency}{cmax ? <Badge variant="info" data-testid="cmax-tag">C_max</Badge> : null}</span>
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">
                  <span className={cn(fails("TTFT") && "text-critical-text font-medium")}>{num(point.ttftP95Ms)}</span>
                  {shared === null ? <span className="text-muted-foreground"> / ≤ {num(point.ttftCeilingMs)}</span> : null}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums"><span className={cn(fails("ITL") && "text-critical-text font-medium")}>{num(point.itlP95Ms, 1)}</span></TableCell>
                <TableCell className="py-1.5 text-center max-sm:hidden"><Gate pass={!fails("TTFT")} label="TTFT" title={gateTitle(point, "TTFT", slo)} /></TableCell>
                <TableCell className="py-1.5 text-center max-sm:hidden"><Gate pass={!fails("ITL")} label="ITL" title={gateTitle(point, "ITL", slo)} /></TableCell>
                <TableCell className="py-1.5 text-center max-sm:hidden"><Gate pass={!fails("Success")} label="Success" title={gateTitle(point, "Success", slo)} /></TableCell>
                <TableCell className="py-1.5 text-center">
                  <Gate pass={point.passes} label="Overall" title={point.passes ? "All gates hold" : `Failed: ${point.failures.join(", ")}`} detail={point.passes ? undefined : `failed ${point.failures.join(", ")}`} />
                  {!point.passes && fails("Success") ? <span className="text-critical-text block text-[11px] font-medium sm:hidden" data-narrow-failure="Success">success {pct(point.successRate)}</span> : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const STAT_KEYS = ["mean", "p50", "p95", "p99"] as const;

function StatCells({ stats, digits = 0 }: { stats: LatencyStats; digits?: number }) {
  return (
    <>
      {STAT_KEYS.map((key, index) => (
        <TableCell key={key} className={cn("text-right tabular-nums", index === 0 && "border-l", stats[key] === null && "text-muted-foreground")}>{num(stats[key], digits)}</TableCell>
      ))}
    </>
  );
}

/**
 * Every level as the report carries it: request rate, input (prefill) / output / total tok/s (aggregate and per
 * GPU), per-user p50, TTFT / ITL / request latency mean · p50 · p95 · p99, request outcomes and level duration.
 * Rates are single values per level in the report (no distribution), so they carry no percentile columns.
 */
export function MeasuredResultsTable({ row }: { row: RankedDeployment }) {
  const d = row.deployment, gpus = gpusOf(d);
  const raw = new Map<number, MetricRow>(d.points.map((point) => [point.concurrency, point]));
  const cmax = row.capacity.selectedPoint?.concurrency ?? null;
  const levels = [...raw.keys()].sort((a, b) => a - b);
  const group = (label: string, span: number) => <TableHead colSpan={span} className="border-l text-center">{label}</TableHead>;
  return (
    <div className="overflow-x-auto">
      <Table data-testid="concurrency-table" className="text-[12.5px] whitespace-nowrap">
        <TableHeader>
          <TableRow className="[&>th]:h-8">
            <TableHead />
            {group("Rates, per level", 6)}
            {group("TTFT, ms", 4)}
            {group("ITL, ms", 4)}
            {group("Request latency, ms", 4)}
            {group("Requests", 4)}
          </TableRow>
          <TableRow>
            <TableHead>Concurrency</TableHead>
            <TableHead className="border-l text-right">req/s</TableHead>
            <TableHead className="text-right">Prefill tok/s</TableHead>
            <TableHead className="text-right">Output tok/s</TableHead>
            <TableHead className="text-right">Total tok/s</TableHead>
            <TableHead className="text-right">Total tok/s/GPU</TableHead>
            <TableHead className="text-right">Per-user p50</TableHead>
            {[0, 1, 2].map((index) => <React.Fragment key={index}>{STAT_KEYS.map((key, i) => <TableHead key={key} className={cn("text-right", i === 0 && "border-l")}>{key}</TableHead>)}</React.Fragment>)}
            <TableHead className="border-l text-right">OK</TableHead>
            <TableHead className="text-right">Err</TableHead>
            <TableHead className="text-right">Inc</TableHead>
            <TableHead className="text-right">Duration, s</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {levels.map((level) => {
            const m = raw.get(level)!;
            const current = level === cmax;
            return (
              <TableRow key={level} data-level={level} data-capacity={current || undefined} className={cn(current && "bg-selection hover:bg-selection")}>
                <TableCell className="font-medium tabular-nums">{level}{current ? <Badge variant="info" className="ml-2">C_max</Badge> : null}</TableCell>
                <TableCell className="border-l text-right tabular-nums">{num(m.requestsPerSecond, 2)}</TableCell>
                <TableCell className="text-right tabular-nums">{num(m.inputTps)}</TableCell>
                <TableCell className="text-right tabular-nums">{num(m.outputTps)}</TableCell>
                <TableCell className="text-right tabular-nums">{num(m.totalTps)}</TableCell>
                <TableCell className="text-right tabular-nums">{num(m.totalTps / gpus)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", m.outputTpsPerUserP50 === null && "text-muted-foreground")}>{num(m.outputTpsPerUserP50, 1)}</TableCell>
                <StatCells stats={m.ttftMs} />
                <StatCells stats={m.itlMs} digits={1} />
                <StatCells stats={m.requestLatencyMs} />
                <TableCell className="border-l text-right tabular-nums">{num(m.successful)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", m.errored > 0 ? "text-critical-text font-medium" : "text-muted-foreground")}>{num(m.errored)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", m.incomplete > 0 ? "text-warning-text font-medium" : "text-muted-foreground")}>{num(m.incomplete)}</TableCell>
                <TableCell className="text-right tabular-nums">{num(m.durationSeconds)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
