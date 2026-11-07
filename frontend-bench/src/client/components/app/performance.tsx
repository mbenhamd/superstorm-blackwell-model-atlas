import * as React from "react";
import { HardDrive, MessagesSquare, Play, Scale, ShieldCheck, Tag, Timer, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KpiRowCard, type KpiRowMetric } from "@/components/blocks/kpi-row-card";
import { configChips } from "../../../domain/config-chips.js";
import { nominalTtftCeilingMs, tieBand } from "../../../domain/metrics.js";
import type { Deployment, PointMetrics, RankedDeployment, SloPolicy, Workload } from "../../../domain/types.js";
import { useAppState } from "../../state.js";
import { compactNum, gpusOf, hardwareShape, isMeasured, num, pct } from "../../lib/display.js";
import { LevelsBadge } from "./primitives.js";

/*
 * Shared performance vocabulary for every page: the SLO strip, workload tags, knob chips and
 * per-level table. Values come from domain/metrics (capacity, measurePoint); this file formats, never computes.
 * Missing values render "—"; an unmeasured row keeps the same layout with a dashed frame and one "Not measured" badge.
 */

const PRESET_LABEL: Record<SloPolicy["preset"], string> = { classic: "Classic", "low-latency": "Low-latency", frontier: "Frontier", custom: "Custom" };

/* ── Workload tags ─────────────────────────────────────────────────────────────────────────── */

const TAGS: { match: (tag: string) => boolean; icon: LucideIcon; hint: string; tone?: "warning" }[] = [
  { match: (t) => t === "prefix-immune", icon: ShieldCheck, hint: "Every request has a different prefix: prefix caching cannot inflate throughput." },
  { match: (t) => t === "default run", icon: Play, hint: "Dataset the bench runs by default." },
  { match: (t) => t.startsWith("costly"), icon: Timer, hint: "Long run: adds wall-clock time per sweep." },
  { match: (t) => t === "multi-turn", icon: MessagesSquare, hint: "Conversations carry history: prompts grow per turn and prefixes are shared, so the TTFT ceiling is derived per level from measured prompt tokens." },
  { match: (t) => t === "KV-saturation", icon: HardDrive, hint: "Fills the KV cache; point measurements only." },
  { match: (t) => t === "balanced profile", icon: Scale, hint: "8,000 input / 500 output tokens per request." },
  { match: (t) => t === "legacy", icon: TriangleAlert, hint: "V1 profile, not prefix-immune: compare with care.", tone: "warning" },
];
const tagMeta = (tag: string) => TAGS.find((item) => item.match(tag)) ?? { icon: Tag, hint: tag, tone: undefined };
/** One-line meaning of a workload tag (the same text as its tooltip), for legends. */
export const workloadTagHint = (tag: string): string => tagMeta(tag).hint;

/**
 * Dataset tags with icons and hover tooltips; `compact` shows icons only (label in the tooltip and accessible name)
 * and makes each icon focusable. Full tags are not tab stops: their text is visible, and a focus tooltip would
 * swallow the first Escape inside dialogs.
 */
export function WorkloadTags({ tags, compact = false, className }: { tags: readonly string[]; compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)} data-testid="workload-tags">
      {tags.map((tag) => {
        const { icon: Icon, hint, tone } = tagMeta(tag);
        return (
          <Tooltip key={tag}>
            <TooltipTrigger asChild>
              <Badge variant="neutral" tabIndex={compact ? 0 : undefined} data-tag={tag} aria-label={compact ? tag : undefined} className={cn("cursor-default", tone === "warning" && "text-warning-text", compact && "px-1")}>
                <Icon aria-hidden="true" />{compact ? null : tag}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-pretty">{compact ? <><span className="font-medium">{tag}</span> · </> : null}{hint}</TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}

/* ── Small badges ──────────────────────────────────────────────────────────────────────────── */

/** Amber "● n incomplete" when requests did not finish; nothing for 0 or unknown. */
export function IncompleteBadge({ count, className }: { count: number | null | undefined; className?: string }) {
  if (!count) return null;
  return <Badge variant="warning" className={className} data-testid="incomplete-badge" title="Requests that did not finish; they count against the success rate">{num(count)} incomplete</Badge>;
}

/** Verdict for one level (or C_max): pass, out of SLO (with the failed gates), or — when unmeasured. */
export function SloVerdictBadge({ point, className }: { point: Pick<PointMetrics, "passes" | "failures"> | null | undefined; className?: string }) {
  if (!point) return <span className={cn("text-muted-foreground", className)}>—</span>;
  return point.passes
    ? <Badge variant="good" className={className} data-verdict="pass">pass</Badge>
    : <Badge variant="critical" className={className} data-verdict="fail" title={`Failed: ${point.failures.join(", ")}`}>out of SLO</Badge>;
}

/** "tie" when two values are within the band (default ±3%, assumed single-run noise); nothing otherwise. */
export function TieBadge({ a, b, band = 0.03, className }: { a: number | null; b: number | null; band?: number; className?: string }) {
  if (tieBand(a, b, band) !== "tie") return null;
  return <Badge variant="neutral" className={className} data-testid="tie-badge" title={`Within ±${num(band * 100)}%: assumed single-run noise (unverified policy)`}>tie ±{num(band * 100)}%</Badge>;
}

/** Knob chips ("kv fp8", "mtp ×5", "ctx 65536"); the first `max` show, the rest fold into "+N" with a tooltip. */
export function ConfigChips({ deployment, max = 3, className }: { deployment: Pick<Deployment, "runConfig" | "engineArgs">; max?: number; className?: string }) {
  const chips = configChips(deployment);
  if (!chips.length) return null;
  const shown = chips.slice(0, max), rest = chips.slice(max);
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)} data-testid="config-chips">
      {shown.map((chip) => <Badge key={chip} variant="mono">{chip}</Badge>)}
      {rest.length ? (
        <Tooltip>
          <TooltipTrigger asChild><Badge variant="mono" tabIndex={0} className="cursor-default">+{rest.length}</Badge></TooltipTrigger>
          <TooltipContent className="max-w-72 font-mono text-[11px]">{rest.join(" · ")}</TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

/* ── SLO chips ─────────────────────────────────────────────────────────────────────────────── */

/** The active policy as chips: Prefill ≥, ITL p95 ≤, Success ≥ (console rule), ×margin. */
export function SloChips({ slo, direction = "row", className }: { slo: SloPolicy; direction?: "row" | "column"; className?: string }) {
  return (
    <span className={cn("flex flex-wrap gap-1", direction === "column" && "flex-col items-end", className)} data-testid="slo-chips">
      <Badge variant="outline">Prefill ≥ {num(slo.prefillTps)} tok/s</Badge>
      <Badge variant="outline">ITL p95 ≤ {num(slo.itlP95Ms)} ms</Badge>
      <Tooltip>
        <TooltipTrigger asChild><Badge variant="outline" tabIndex={0} className="cursor-default">Success ≥ {pct(slo.minSuccessRate, 0)}</Badge></TooltipTrigger>
        <TooltipContent className="max-w-64 text-pretty">Console rule; the SLO presets define only prefill speed and ITL. Errored and incomplete requests count against it.</TooltipContent>
      </Tooltip>
      <Badge variant="outline">×{slo.margin} margin</Badge>
    </span>
  );
}

/* ── Performance strip ─────────────────────────────────────────────────────────────────────── */

const budget = (workload: Workload | null | undefined): string | null =>
  !workload || workload.inputTokens === null || workload.outputTokens === null ? null
    : `${num(workload.inputTokens)} in / ${num(workload.outputTokens)} out${workload.turns > 1 ? ` · ${workload.turns} turns` : ""}`;

/** TTFT ceiling: the measured one at C_max (prompt tokens ÷ prefill), else the nominal budget one, else per level. */
function ttftCeilingLabel(row: RankedDeployment, workload: Workload | null | undefined, slo: SloPolicy): string {
  const measured = row.capacity.selectedPoint?.ttftCeilingMs ?? null;
  if (measured !== null) return `TTFT p95 ≤ ${num(measured)} ms measured`;
  const nominal = nominalTtftCeilingMs(workload, slo);
  return nominal === null ? "TTFT ceiling per level" : `TTFT p95 ≤ ${num(nominal)} ms nominal`;
}

export interface PerformanceStripProps {
  row: RankedDeployment;
  workload: Workload | null | undefined;
  slo: SloPolicy;
  /** Shown beside "Not measured" on an unmeasured row. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * SLO strip: header (SLO name chip, TTFT ceiling, incomplete count or "Not measured"; the thresholds themselves are in
 * the top bar), then four cells: C_max, sustainable tok/min/GPU, per-user speed, deployment-wide tok/min.
 * A missing value is a lone neutral "—": no unit and no inline label next to it; the caption names what the cell holds.
 */
export function PerformanceStrip({ row, workload, slo, action, className }: PerformanceStripProps) {
  const c = row.capacity, d = row.deployment, point = c.selectedPoint;
  const measured = isMeasured(d);
  const has = measured && point !== null;
  const text = (value: number | null | undefined, digits = 0) => value === null || value === undefined || !has ? null : num(value, digits);
  const gpus = `${gpusOf(d)} GPU${gpusOf(d) === 1 ? "" : "s"}`;
  const metrics: KpiRowMetric[] = [
    {
      label: "C_max", value: measured && c.highestPassingConcurrency !== null ? num(c.highestPassingConcurrency) : null, unit: "concurrent",
      adornment: measured ? <LevelsBadge capacity={c} /> : undefined,
      detail: measured ? `${c.passingLevels} of ${c.totalLevels} levels in SLO` : "Highest level inside the SLO",
    },
    {
      label: "Sustainable throughput", value: text(c.sustainableTpmPerGpu), unit: "tok/min/GPU",
      detail: has ? `observed ${num(c.observedTotalTpsPerGpu)} total tok/s/GPU at C_max · ×${slo.margin}` : `Total tok at C_max × ${slo.margin} ÷ ${gpus}`,
    },
    {
      label: "Per-user speed p50", value: text(point?.outputTpsPerUser, 1), unit: "tok/s/user",
      detail: has && point?.itlP50Ms != null ? `ITL p50 ${num(point.itlP50Ms, 1)} ms` : "Output tok/s per request at C_max",
    },
    {
      label: "Deployment-wide", value: text(c.deploymentWideTpm), unit: "tok/min",
      detail: has ? `${compactNum(c.deploymentInputTpm)} in / ${compactNum(c.deploymentOutputTpm)} out tok/min · ${hardwareShape(d)}` : hardwareShape(d),
    },
  ];
  const header = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-normal">
      <Badge variant="info" title={`Prefill ≥ ${num(slo.prefillTps)} tok/s · ITL p95 ≤ ${num(slo.itlP95Ms)} ms · success ≥ ${pct(slo.minSuccessRate, 0)} · ×${slo.margin} margin`}>{PRESET_LABEL[slo.preset]} SLO</Badge>
      <span className="text-muted-foreground tabular-nums" data-testid="strip-ttft-ceiling" title={workload ? budget(workload) ?? undefined : undefined}>{ttftCeilingLabel(row, workload, slo)}</span>
      {measured ? <IncompleteBadge count={c.incomplete} /> : <><Badge variant="neutral" data-testid="not-measured-badge">Not measured</Badge>{action}</>}
    </span>
  );
  return (
    <KpiRowCard
      title={header}
      metrics={metrics}
      data-testid="performance-strip"
      data-measured={measured || undefined}
      className={cn(
        "gap-3 rounded-lg py-4",
        // The accent marks the sustainable value only when there is one; a missing value stays neutral.
        has && c.sustainableTpmPerGpu !== null && "[&_[data-slot=kpi-row-metric]:nth-child(2)_[data-slot=metric-value]]:text-brand",
        !measured && "border-dashed shadow-none",
        className,
      )}
    />
  );
}

/* ── Concurrency table ─────────────────────────────────────────────────────────────────────── */

function VsCeiling({ p50, p95, ceiling, digits = 0 }: { p50: number | null; p95: number | null; ceiling: number | null; digits?: number }) {
  const over = p95 !== null && ceiling !== null && p95 > ceiling;
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      <span className="tabular-nums">{num(p50, digits)} / <span className={cn(over && "text-critical-text font-medium")}>{num(p95, digits)}</span></span>
      <span className="text-muted-foreground text-[11px] tabular-nums">≤ {num(ceiling, digits)}</span>
    </span>
  );
}

/** Every measured level: rates, per-user speed, TTFT and ITL against their ceilings, request outcomes, verdict. */
export function ConcurrencyTable({ row, className }: { row: RankedDeployment; className?: string }) {
  const { slo } = useAppState();
  const c = row.capacity, d = row.deployment, gpus = gpusOf(d);
  const measured = isMeasured(d);
  return (
    <Table className={className} data-testid="concurrency-table">
      <TableHeader>
        <TableRow>
          <TableHead>Concurrency</TableHead>
          <TableHead className="text-right">req/s</TableHead>
          <TableHead className="text-right">Total tok/s/GPU</TableHead>
          <TableHead className="text-right">Output tok/s/GPU</TableHead>
          <TableHead className="text-right">Per-user p50</TableHead>
          <TableHead className="text-right">TTFT p50 / p95 ms</TableHead>
          <TableHead className="text-right">ITL p50 / p95 ms</TableHead>
          <TableHead className="text-right">Success · err · inc</TableHead>
          <TableHead>Verdict</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {measured ? c.points.map((p) => {
          const cmax = p === c.selectedPoint;
          return (
            <TableRow key={p.concurrency} data-capacity={cmax || undefined} className={cn(cmax && "bg-selection hover:bg-selection")}>
              <TableCell className="font-medium tabular-nums">{p.concurrency}{cmax ? <Badge variant="info" className="ml-2">C_max</Badge> : null}</TableCell>
              <TableCell className="text-right tabular-nums">{num(p.requestsPerSecond, 2)}</TableCell>
              <TableCell className="text-right tabular-nums">{num(p.totalTps / gpus)}</TableCell>
              <TableCell className="text-right tabular-nums">{num(p.outputTps / gpus)}</TableCell>
              <TableCell className="text-right tabular-nums">{num(p.outputTpsPerUser, 1)}</TableCell>
              <TableCell className="text-right"><VsCeiling p50={p.ttftP50Ms} p95={p.ttftP95Ms} ceiling={p.ttftCeilingMs} /></TableCell>
              <TableCell className="text-right"><VsCeiling p50={p.itlP50Ms} p95={p.itlP95Ms} ceiling={slo.itlP95Ms} digits={1} /></TableCell>
              <TableCell className="text-right tabular-nums">
                <span className={cn(p.successRate !== null && p.successRate < slo.minSuccessRate && "text-critical-text font-medium")}>{pct(p.successRate)}</span>
                <span className="text-muted-foreground"> · {num(p.errored)} · </span>
                <span className={cn(p.incomplete > 0 ? "text-warning-text font-medium" : "text-muted-foreground")}>{num(p.incomplete)}</span>
              </TableCell>
              <TableCell><SloVerdictBadge point={p} /></TableCell>
            </TableRow>
          );
        }) : (
          <TableRow data-empty="true">
            <TableCell colSpan={9} className="text-muted-foreground py-6 text-center"><Badge variant="neutral">Not measured</Badge></TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
