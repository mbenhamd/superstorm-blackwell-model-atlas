import * as React from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  derivationText, displayFlags, displayUnit, filterExternal, flagLabels, hardwareStatus, isWeak, metricIndexes, metricName, recordDate,
  VERSION_CLASS_LABELS, weakReasons, type ExternalLevel, type ExternalMetric, type ExternalRecord, type MetricKind,
} from "../../../domain/external.js";
import { num } from "../../lib/display.js";
import { externalDataset } from "../../lib/external.js";
import { VersionString } from "./published-badges.js";

/*
 * Published (external) records of one TL;DR setup, shown in the setup sheet (evidence class "external": third
 * parties, engine projects, vendors). Never inside the ranking: no value here enters a rank,
 * a sustainable rate, C_max, Δ vs best or ties, and no SLO is applied. Every number keeps the source's
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

/**
 * One published record as a stacked card for the setup sheet: headline value with the source's metric name and load,
 * source + date, hardware + engine build with its audit class, and the caveats (incl. "differs" from this setup).
 */
export function PublishedCard({ record }: { record: ExternalRecord }) {
  const top = headline(record);
  return (
    <li className="flex min-w-0 flex-col gap-1.5 px-3.5 py-3 text-xs" data-published-record={record.id}>
      <span className="flex min-w-0 items-start justify-between gap-3">
        {top ? (
          <span className="flex min-w-0 flex-col" title={top.metric.derived ? derivationText(top.metric, record.gpuCount) ?? undefined : undefined}>
            <span className="tabular-nums"><span className="text-[15px] font-semibold">{num(top.value, digits(top.value))}</span> <span className="text-muted-foreground">{displayUnit(top.metric) ?? ""}</span></span>
            <span className="text-muted-foreground">{metricName(top.metric)}{top.metric.derived ? " · derived" : ""} <span data-load="">{loadOf(top.level)}</span></span>
          </span>
        ) : <span className="text-muted-foreground" data-no-throughput>No throughput figure</span>}
        <span className="shrink-0"><SourceCell record={record} /></span>
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <HardwareCell record={record} />
        <EngineAudit record={record} />
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {record.mismatch ? <Badge variant="warning" title={`Linked to this setup, but differs: ${record.mismatch}`} data-differs="">differs</Badge> : null}
        <Flags record={record} max={3} />
        {isWeak(record) ? <Badge variant="critical" title={weakReasons(record).join("; ")}>weak record</Badge> : null}
      </span>
      {record.mismatch ? <span className="text-muted-foreground text-pretty">Differs from this setup: {record.mismatch}</span> : null}
    </li>
  );
}
