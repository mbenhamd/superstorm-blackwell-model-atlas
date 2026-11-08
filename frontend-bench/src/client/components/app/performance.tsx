import * as React from "react";
import { HardDrive, MessagesSquare, Play, Scale, ShieldCheck, Tag, Timer, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KpiRowCard, type KpiRowMetric } from "@/components/blocks/kpi-row-card";
import { configChips } from "../../../domain/config-chips.js";
import { nominalTtftCeilingMs, SLO_PRESETS, tieBand } from "../../../domain/metrics.js";
import type { Deployment, PointMetrics, RankedDeployment, SloPolicy, Workload } from "../../../domain/types.js";
import { update } from "../../state.js";
import { compactNum, gpusOf, hardwareShape, isMeasured, num, pct } from "../../lib/display.js";
import { LevelsBadge } from "./primitives.js";
import { budgetLabel, PROFILE_HINT, workloadProfile } from "./throughput-profile.js";

/*
 * Shared performance vocabulary for every page: the SLO strip, workload tags and profile, knob chips and
 * verdict badges (the Throughput tables live in throughput-tables.tsx). Values come from domain/metrics (capacity, measurePoint); this file formats, never computes.
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

/** Red "n errored" when requests failed with an error; nothing for 0 or unknown. One badge on every page. */
export function ErroredBadge({ count, className }: { count: number | null | undefined; className?: string }) {
  if (!count) return null;
  return <Badge variant="critical" className={className} data-testid="errored-badge" title="Requests that ended in an error; they count against the success rate">{num(count)} errored</Badge>;
}

/**
 * Dense ladders: incomplete and errored requests merged into one short badge ("1 inc · 3 err"), critical when any
 * request errored; the full counts are its accessible name and title. Nothing for 0 / unknown on both.
 */
export function RunQualityBadge({ incomplete, errored, className }: { incomplete: number | null | undefined; errored: number | null | undefined; className?: string }) {
  if (!incomplete && !errored) return null;
  const parts = [incomplete ? `${num(incomplete)} inc` : null, errored ? `${num(errored)} err` : null].filter(Boolean).join(" · ");
  const full = [incomplete ? `${num(incomplete)} incomplete` : null, errored ? `${num(errored)} errored` : null].filter(Boolean).join(", ");
  return (
    <Badge variant={errored ? "critical" : "warning"} className={cn("h-4 px-1.5 text-[11px]", className)} data-testid="run-quality-badge" data-incomplete={incomplete || undefined} data-errored={errored || undefined}
      aria-label={`${full} requests`} title={`${full} requests in the fronting run; they count against the success rate`}>
      {parts}
    </Badge>
  );
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

/* ── Workload profile ──────────────────────────────────────────────────────────────────────── */

/** Balanced / Decode-intensive / Prefill-intensive (console classification, see throughput-profile.ts); nothing without a fixed budget. */
export function ProfileBadge({ workload, plain = false, className }: { workload: Workload | null | undefined; plain?: boolean; className?: string }) {
  const profile = workloadProfile(workload);
  if (!profile) return null;
  // Inside another control (a tile button) the badge must not be a focus stop: the hint moves to a title.
  if (plain) return <Badge variant="outline" className={className} data-profile={profile} title={PROFILE_HINT}>{profile}</Badge>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" tabIndex={0} className={cn("cursor-default", className)} data-profile={profile}>{profile}</Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">{PROFILE_HINT}</TooltipContent>
    </Tooltip>
  );
}

/* ── Performance strip ─────────────────────────────────────────────────────────────────────── */

/** TTFT ceiling: at C_max, computed from the measured prompt tokens ÷ prefill speed; else the nominal budget one; else per level. */
function ttftCeilingLabel(row: RankedDeployment, workload: Workload | null | undefined, slo: SloPolicy): string {
  const measured = row.capacity.selectedPoint?.ttftCeilingMs ?? null;
  if (measured !== null) return `TTFT p95 ≤ ${num(measured)} ms (computed from measured prompt length)`;
  const nominal = nominalTtftCeilingMs(workload, slo);
  return nominal === null ? "TTFT ceiling per level" : `TTFT p95 ≤ ${num(nominal)} ms nominal`;
}

/** SLO preset switch inside the strip (same state as the top-bar SLO popover; custom values are edited there). */
function PresetSwitch({ slo }: { slo: SloPolicy }) {
  return (
    <ToggleGroup
      type="single" variant="outline" size="sm" value={slo.preset === "custom" ? "" : slo.preset} aria-label="SLO expectancy"
      data-testid="strip-slo-presets"
      onValueChange={(value: string) => { if (value in SLO_PRESETS) update((s) => { s.slo = { ...SLO_PRESETS[value as keyof typeof SLO_PRESETS] }; }); }}
    >
      {(Object.keys(SLO_PRESETS) as (keyof typeof SLO_PRESETS)[]).map((key) => (
        <ToggleGroupItem key={key} value={key} className="px-2.5 text-xs" data-strip-preset={key}>{PRESET_LABEL[key]}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export interface PerformanceStripProps {
  row: RankedDeployment;
  workload: Workload | null | undefined;
  slo: SloPolicy;
  /** Shown beside "Not measured" on an unmeasured row. */
  action?: React.ReactNode;
  className?: string;
}

const lines = (...items: React.ReactNode[]) => (
  <span className="flex flex-col gap-0.5">{items.filter(Boolean).map((item, index) => <span key={index}>{item}</span>)}</span>
);

/**
 * SLO strip. Header: SLO preset chip, workload profile, token budget, TTFT and ITL ceilings, or "Not measured"
 * (incomplete / errored request badges sit once on the identity line above); on the right the SLO preset switch (the TTFT and ITL ceilings are stated once in the header text). Four cells: C_max, sustainable
 * tok/min/GPU (hero), per-user speed, deployment-wide tok/min. A missing value is a lone neutral "—": no unit and no
 * inline label next to it; the caption names what the cell holds. Rates are the report's per-level values at C_max.
 */
export function PerformanceStrip({ row, workload, slo, action, className }: PerformanceStripProps) {
  const c = row.capacity, d = row.deployment, point = c.selectedPoint;
  const measured = isMeasured(d);
  const has = measured && point !== null;
  const text = (value: number | null | undefined, digits = 0) => value === null || value === undefined || !has ? null : num(value, digits);
  const gpus = `${gpusOf(d)} GPU${gpusOf(d) === 1 ? "" : "s"}`;
  const budget = budgetLabel(workload, (value) => num(value));
  const metrics: KpiRowMetric[] = [
    {
      label: "C_max", value: measured && c.highestPassingConcurrency !== null ? num(c.highestPassingConcurrency) : null, unit: "concurrent",
      adornment: measured ? <LevelsBadge capacity={c} /> : undefined,
      detail: measured ? `${c.passingLevels} of ${c.totalLevels} measured levels in SLO` : "Highest measured level inside the SLO",
      attrs: { "data-kpi": "cmax" },
    },
    {
      label: "Sustainable throughput", value: text(c.sustainableTpmPerGpu), unit: "tok/min/GPU",
      detail: has ? `Observed ${num(c.observedTotalTpsPerGpu)} tok/s/GPU at the C_max ring · ×${slo.margin} margin` : `Total tok/s at C_max × ${slo.margin} × 60 ÷ ${gpus}`,
      attrs: { "data-kpi": "sustainable" },
    },
    {
      label: "Per-user speed", value: text(point?.outputTpsPerUser, 1), unit: "tok/s/user median",
      // The imported report carries the per-user median only: the p95 is named as missing, never replaced by another metric.
      detail: has ? lines(
        <span data-missing-metric="per-user-p95" title="The imported GuideLLM report records the per-user output rate as a median only">per-user p95 —</span>,
        point?.itlP50Ms != null ? <span title="ITL p50: median inter-token latency at C_max">median token every {num(point.itlP50Ms, 1)} ms</span> : null,
        point?.itlP95Ms != null ? `ITL p95 ${num(point.itlP95Ms, 1)} ms${point.itlP50Ms != null ? ` · p50 ${num(point.itlP50Ms, 1)} ms` : ""}` : null,
      ) : "Output tok/s per request at C_max",
      attrs: { "data-kpi": "per-user" },
    },
    {
      label: "Deployment-wide", value: text(c.deploymentWideTpm), unit: "tok/min",
      detail: has ? lines(
        `observed ${num(point!.totalTps)} tok/s · ${hardwareShape(d)}`,
        `${compactNum(c.deploymentInputTpm)} in / ${compactNum(c.deploymentOutputTpm)} out tok/min`,
        `${num(point!.requestsPerSecond, 2)} req/s at C_max`,
        <span data-missing-metric="request-rate-percentiles" title="The imported report records one request rate per level; p50 / p95 request rates are not recorded">req/s p50 / p95 —</span>,
      ) : `Per replica × ${slo.margin} · ${hardwareShape(d)}`,
      attrs: { "data-kpi": "deployment" },
    },
  ];
  const header = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-normal">
      <Badge variant="info" data-testid="strip-slo" title={`Prefill ≥ ${num(slo.prefillTps)} tok/s · ITL p95 ≤ ${num(slo.itlP95Ms)} ms · success ≥ ${pct(slo.minSuccessRate, 0)} · ×${slo.margin} margin`}>{PRESET_LABEL[slo.preset]} SLO</Badge>
      <ProfileBadge workload={workload} />
      <span className="text-muted-foreground inline-flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums" data-testid="strip-budget">
        {budget ? <span className="text-foreground">{budget}</span> : null}
        <span data-testid="strip-ttft-ceiling">{ttftCeilingLabel(row, workload, slo)}</span>
        <span>ITL p95 ≤ {num(slo.itlP95Ms)} ms</span>
      </span>
      {measured ? null : <><Badge variant="neutral" data-testid="not-measured-badge">Not measured</Badge>{action}</>}
    </span>
  );
  return (
    <KpiRowCard
      title={header}
      headerAction={<PresetSwitch slo={slo} />}
      metrics={metrics}
      data-testid="performance-strip"
      data-measured={measured || undefined}
      className={cn(
        "gap-3 rounded-lg py-3",
        // The accent marks the sustainable value only when there is one; a missing value stays neutral.
        has && c.sustainableTpmPerGpu !== null && "[&_[data-slot=kpi-row-metric]:nth-child(2)_[data-slot=metric-value]]:text-brand",
        "[&_[data-slot=kpi-row-metric]:nth-child(2)_[data-slot=metric-value]]:@lg:text-[28px]",
        !measured && "border-dashed shadow-none",
        className,
      )}
    />
  );
}
