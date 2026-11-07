import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Capacity } from "../../../domain/types.js";

/**
 * Bench Console mark: a disc cut by a convex frontier curve. The filled lower-left region is
 * the dominated set; the arc is the quality/capacity frontier. Monochrome, like the rest of the chrome.
 */
export function BrandMark({ className }: { className?: string }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("text-foreground size-[22px] shrink-0", className)}>
      <defs>
        <clipPath id={`${id}-disc`}><circle cx="12" cy="12" r="11" /></clipPath>
      </defs>
      <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
      <path d="M0 3.2C11.5 3.2 20.8 12.5 20.8 24H0Z" fill="currentColor" clipPath={`url(#${id}-disc)`} />
      <circle cx="14.7" cy="9.3" r="2.4" fill="var(--brand)" stroke="var(--background)" strokeWidth="1.25" />
    </svg>
  );
}

/** H1 + one factual sentence + at most two actions, always top-right. */
export function PageHeader({ title, description, actions, children }: { title: string; description: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="text-[20px] leading-7 font-semibold tracking-[-0.4px]">{title}</h1>
        <p className="text-muted-foreground max-w-[80ch] text-[13px]">{description}</p>
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({ title, description, actions, children, className, bodyClassName, id }: { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string; id?: string }) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("bg-card shadow-panel min-w-0 rounded-lg border", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 id={headingId} className="text-[13px] leading-5 font-semibold">{title}</h2> : null}
            {description ? <p className="text-muted-foreground text-[12px]">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export type Tone = "brand" | "violet" | "good" | "warning" | "neutral" | "orange";
const toneChip: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  violet: "bg-muted text-ink-2",
  good: "bg-muted text-ink-2",
  warning: "bg-warning-soft text-warning-text",
  orange: "bg-muted text-ink-2",
  neutral: "bg-muted text-ink-2",
};
const toneBar: Record<Tone, string> = { brand: "bg-brand", violet: "bg-brand", good: "bg-good", warning: "bg-warning", orange: "bg-brand", neutral: "bg-ink-2" };
/** Small tinted icon tile used by metric cards and pick rows. */
export function IconChip({ icon: Icon, tone = "neutral", className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", toneChip[tone], className)} aria-hidden="true">
      <Icon className="size-3.5" strokeWidth={2} />
    </span>
  );
}
/** meter: a real proportion (0–1) of the shown value, e.g. 10 of 11 evaluated; never a trend. */
export interface Metric { label: React.ReactNode; value: React.ReactNode; unit?: string; detail?: React.ReactNode; badge?: React.ReactNode; icon?: LucideIcon; tone?: Tone; meter?: number | null; meterLabel?: string }
/** One bordered container with hairline-separated cells (the dashboardcn KPI-row pattern, without invented trends). */
export function MetricStrip({ items, className }: { items: Metric[]; className?: string }) {
  return (
    <dl
      className={cn("bg-card shadow-panel grid overflow-hidden rounded-lg border", "grid-cols-2", items.length >= 5 ? "lg:grid-cols-5" : items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3", className)}
    >
      {items.map((item, index) => (
        <div key={index} className={cn("relative flex min-w-0 flex-col gap-1 px-4 py-3 shadow-[-1px_-1px_0_var(--border)]", items.length % 2 === 1 && index === items.length - 1 && "col-span-2 lg:col-span-1")}>
          <dt className="text-muted-foreground flex min-w-0 items-center justify-between gap-2 text-[12px] font-medium">
            <span className="truncate">{item.label}</span>
          </dt>
          <dd className="flex min-w-0 items-baseline gap-1.5">
            <span className="metric-value text-[22px] leading-7 font-semibold tracking-[-0.5px]">{item.value}</span>
            {item.unit ? <span className="text-muted-foreground truncate text-xs">{item.unit}</span> : null}
            {item.badge ? <span className="ml-auto self-center">{item.badge}</span> : null}
          </dd>
          {item.meter !== undefined && item.meter !== null ? (
            <dd className="bg-muted mt-1 h-1 overflow-hidden rounded-full" role="img" aria-label={item.meterLabel}>
              <span className={cn("block h-full rounded-full", toneBar[item.tone ?? "brand"])} style={{ width: `${Math.max(0, Math.min(1, item.meter)) * 100}%` }} />
            </dd>
          ) : null}
          {item.detail ? <dd className="text-muted-foreground line-clamp-2 text-xs text-pretty">{item.detail}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={cn("empty-state flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      <span className="bg-subtle text-ink-2 mb-1 grid size-9 place-items-center rounded-lg border">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-[44ch] text-[13px]">{description}</p>
      {action ? <div className="mt-2 flex gap-2">{action}</div> : null}
    </div>
  );
}

export function Notice({ tone = "info", icon: Icon, children, action }: { tone?: "info" | "warning"; icon: LucideIcon; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div role={tone === "warning" ? "alert" : "note"} className={cn("notice flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px]", tone === "warning" ? "notice-warning border-warning/40 bg-warning-soft" : "bg-card")}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "warning" ? "text-warning-text" : "text-ink-2")} aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const definitions: Record<string, string> = {
  SLO: "Service-level objective: prefill speed (sets the TTFT ceiling), ITL p95 ceiling and success-rate floor a concurrency level must meet. Presets: Classic 1,300 tok/s · 26 ms, Low-latency 2,600 tok/s · 19 ms, Frontier 1,000 tok/s · 50 ms.",
  TTFT: "Time to first token, as reported by GuideLLM per concurrency level (p50/p95/p99). The ceiling is prompt tokens ÷ prefill speed.",
  ITL: "Inter-token latency between streamed tokens after the first, as reported by GuideLLM (p50/p95/p99).",
  "Prefill speed": "Prompt tokens processed per second for one request. The TTFT ceiling for a level is its prompt tokens divided by this speed.",
  "tok/s/GPU": "Tokens per second divided by the GPUs of the run. Labels say whether the figure is total (input + output) or output only.",
  "SLO capacity": "Sustainable throughput: total (input + output) tok/s observed at C_max (the last concurrency level inside the SLO) × safety margin × 60 ÷ GPUs, in tok/min/GPU. GPUs = the run's num_gpus, read as GPUs per replica (assumption). Assumed definition; numerator, rate window and incomplete handling not yet confirmed at source. Never interpolated.",
  "Sustainable throughput": "Total (input + output) tok/s observed at C_max × safety margin × 60 ÷ GPUs, in tok/min/GPU. GPUs = the run's num_gpus, read as GPUs per replica (assumption; multi-replica runs are flagged). Assumed definition, not yet confirmed at source. Never interpolated.",
  "tok/min/GPU": "Tokens per minute per GPU: tok/s × 60 ÷ GPUs of the run. Sustainable figures count input + output tokens; output-only figures say so.",
  "C_max": "The last measured concurrency level that is still inside the SLO.",
  "Safety margin": "Multiplier applied to the throughput observed at C_max to turn a measurement into a deployable commitment (×0.8 by default).",
  Intelligence: "Artificial Analysis Intelligence Index v5.0.1: a third-party, model-level score (0–100) for a lab or provider endpoint at a stated effort. It does not transfer to a quantized export, engine or GPU.",
  Quality: "Model-level Artificial Analysis Intelligence Index v5.0.1 (highest published effort variant). Not measured on the export or engine shown.",
  Frontier: "Configurations not beaten on both intelligence and sustainable throughput (tok/min/GPU) by another configuration on the same dataset.",
};
/** A term with a dotted underline that explains itself on hover and keyboard focus. */
export function Term({ name, children }: { name: keyof typeof definitions | string; children?: React.ReactNode }) {
  const text = definitions[name];
  if (!text) return <>{children ?? name}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="decoration-muted-foreground/60 cursor-help underline decoration-dotted underline-offset-[3px] outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
          {children ?? name}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">{text}</TooltipContent>
    </Tooltip>
  );
}

export function LevelsBadge({ capacity }: { capacity: Capacity }) {
  if (capacity.totalLevels === 0) return <Badge variant="neutral">Not measured</Badge>;
  if (capacity.passingLevels === 0) return <Badge variant="critical">No passing level</Badge>;
  return (
    <span className="inline-flex items-center gap-2" title={`${capacity.passingLevels} of ${capacity.totalLevels} tested load levels meet the SLO`}>
      <span className="flex gap-[2px]" aria-hidden="true">
        {/* One tick per tested level in concurrency order, lit where that level actually passes (passing levels need not be contiguous). */}
        {capacity.points.map((point) => (
          <span key={point.concurrency} className={cn("h-3 w-[3px] rounded-[1px]", point.passes ? "bg-ink-2" : "bg-muted-foreground/25")} />
        ))}
      </span>
      <span className="text-ink-2 text-xs tabular-nums">{capacity.passingLevels}/{capacity.totalLevels}</span>
      <span className="sr-only">load levels meet the SLO</span>
    </span>
  );
}

export function SeriesSwatch({ index, className }: { index: number; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: `var(--chart-${index + 1})` }} />;
}

/** Value with a small inline data bar scaled to the column maximum (bars start at zero). */
export function InlineBar({ value, max, children, className }: { value: number | null | undefined; max: number; children: React.ReactNode; className?: string }) {
  const ratio = value === null || value === undefined || !max ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <span className={cn("inline-flex items-center justify-end gap-2.5", className)}>
      <span className="whitespace-nowrap">{children}</span>
      <span className="bg-muted hidden h-1.5 w-14 overflow-hidden rounded-full md:block" aria-hidden="true">
        <span className="bg-brand block h-full rounded-full" style={{ width: `${ratio * 100}%` }} />
      </span>
    </span>
  );
}
