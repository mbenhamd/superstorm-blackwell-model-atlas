import * as React from "react";
import { Check, ChevronRight, Columns2, Info, Server, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TickBar } from "@/components/ui/tick-bar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Timeline, TimelineConnector, TimelineContent, TimelineHeader, TimelineItem, TimelineMarker, TimelineRail, TimelineTime, TimelineTitle } from "@/components/ui/timeline";
import { capacity, tieBand } from "../../domain/metrics.js";
import { splitRuntime } from "../../domain/catalog.js";
import { configChips } from "../../domain/config-chips.js";
import { CONTROLS, effectiveControls, type ControlKey, type ControlValue } from "../../domain/run-config.js";
import type { Deployment } from "../../domain/types.js";
import { SweepChart } from "../components/app/charts.js";
import { ExpandableChartPanel as ChartPanel } from "../components/app/throughput-chart-panel.js";
import { EnginePublished } from "../components/app/engine-published.js";
import { CommandBlock } from "../components/app/command-block.js";
import { HeadToHead } from "../components/app/head-to-head.js";
import { StatusBadge } from "../components/app/status-badge.js";
import { EngineBuild } from "../components/app/engine-build.js";
import { EngineIntelDisclosure } from "../components/app/engine-intel-disclosure.js";
import { EngineMatchup } from "../components/app/engine-matchup.js";
import { bestPerEngine } from "../components/app/engine-data.js";
import { EngineVersions } from "../components/app/engine-versions.js";
import { EngineWorkloadVerdicts } from "../components/app/engine-workload-verdicts.js";
import { openRun } from "../components/app/overlays.js";
import { Combobox } from "../components/app/pickers.js";
import { EmptyState, PageHeader, Panel, SeriesSwatch } from "../components/app/primitives.js";
import { appState, navigate, updateView, useAppState } from "../state.js";
import { engineVersion, isMeasured, measuredHereLabel, recheckNote, runtimeTag, testedLabel, modelOf, num, shape, topology } from "../lib/display.js";
import { cn } from "@/lib/utils";
import { aaHeadline, atlasModel, effortLabel, shortSha } from "../lib/atlas.js";

/**
 * A matched engine pair: the vLLM and SGLang baseline configurations of the same export at the same
 * GPU count and parallel shape. Anything else would confound the engine with another variable.
 */
export interface EnginePair { key: string; vllm: Deployment; sglang: Deployment }

export function enginePairs(deployments: Deployment[]): EnginePair[] {
  const bases = deployments.filter((d) => d.id === d.configurationId && d.knob === null);
  const pairs: EnginePair[] = [];
  for (const vllm of bases.filter((d) => d.runtime === "vLLM")) {
    const sglang = bases.find((d) => d.runtime === "SGLang" && d.artifactId === vllm.artifactId && d.gpus === vllm.gpus && d.tensorParallel === vllm.tensorParallel && d.dataParallel === vllm.dataParallel);
    if (sglang) pairs.push({ key: `${vllm.artifactId}@${vllm.gpus}`, vllm, sglang });
  }
  return pairs;
}

/**
 * Flag-name mapping between the engines. Names map; semantics can differ and are not asserted equal. The five
 * engine-equivalent runtime controls (CONTROL_ROWS) are not read from these flags but from the same normalised values
 * the matchup verdict uses (domain/run-config.ts), so both views agree.
 */
const CONTROL_ROWS: Partial<Record<string, ControlKey>> = {
  "Context length": "max_model_len", "Memory fraction": "memory_fraction", "Max concurrent sequences": "max_num_seqs", "KV-cache dtype": "kv_cache_dtype", "Prefix cache": "prefix_caching",
};
const concepts: [string, string[], string[]][] = [
  ["Model revision", ["--revision"], ["--revision"]],
  ["Tensor parallel", ["--tensor-parallel-size", "-tp"], ["--tp-size", "--tp"]],
  ["Data parallel", ["--data-parallel-size", "-dp"], ["--dp-size", "--dp"]],
  ["Expert parallel", ["--enable-expert-parallel"], ["--ep-size", "--enable-ep-moe"]],
  ["Context length", ["--max-model-len"], ["--context-length"]],
  ["Memory fraction", ["--gpu-memory-utilization"], ["--mem-fraction-static"]],
  ["Max concurrent sequences", ["--max-num-seqs"], ["--max-running-requests"]],
  ["Prefill chunk", ["--max-num-batched-tokens"], ["--chunked-prefill-size"]],
  ["KV-cache dtype", ["--kv-cache-dtype"], ["--kv-cache-dtype"]],
  ["Prefix cache", ["--enable-prefix-caching", "--no-enable-prefix-caching"], ["--disable-radix-cache"]],
  ["Quantization", ["--quantization"], ["--quantization"]],
  ["Attention backend", ["--attention-backend", "--attention-config"], ["--attention-backend"]],
  ["MoE backend", ["--moe-backend"], ["--moe-runner-backend"]],
  ["Speculative decoding", ["--speculative-config"], ["--speculative-algorithm"]],
  ["Reasoning parser", ["--reasoning-parser"], ["--reasoning-parser"]],
  ["Tool-call parser", ["--tool-call-parser"], ["--tool-call-parser"]],
];

/** Parse engine arguments into flag → value ("on" for boolean flags). */
function flags(args: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("-")) continue;
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith("-")) { out.set(arg, next); i++; } else out.set(arg, "on");
  }
  return out;
}

const pairLabel = (p: EnginePair) => `${modelOf(p.vllm)?.name ?? p.vllm.modelId} · ${p.vllm.exportLabel}`;
const engineIndex = (d: Deployment) => (d.runtime === "vLLM" ? 0 : 1);

/** Measured counterpart of a catalog configuration on the active dataset, else the configuration itself. */
function useMeasured() {
  const state = useAppState();
  return (d: Deployment) => state.snapshot.deployments.find((item) => item.configurationId === d.configurationId && item.workloadId === state.workload && isMeasured(item)) ?? d;
}

/**
 * Every matched pair: shape and sustainable total tok/min/GPU per engine; the ratio only where both pass the SLO.
 * Collapsed by default (the pair picker in the header selects too); rows stay mounted inside the native disclosure.
 */
function MatchedPairs({ pairs, active }: { pairs: EnginePair[]; active: string }) {
  const state = useAppState();
  const pick = useMeasured();
  const select = (key: string) => updateView((s) => { s.pair = key; s.model = "all"; });
  return (
    <EngineIntelDisclosure variant="card" summary="All matched pairs" meta={pairs.length} data-testid="engine-pairs-disclosure">
      <div className="overflow-x-auto" data-testid="engine-pairs">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Pair</TableHead>
              <TableHead>Shape</TableHead>
              <TableHead className="text-right"><span className="inline-flex items-center gap-1.5"><SeriesSwatch index={0} />vLLM tok/min/GPU</span></TableHead>
              <TableHead className="text-right"><span className="inline-flex items-center gap-1.5"><SeriesSwatch index={1} />SGLang tok/min/GPU</span></TableHead>
              <TableHead className="text-right">SGLang ÷ vLLM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairs.map((pair) => {
              const va = capacity(pick(pair.vllm), state.slo).sustainableTpmPerGpu, vb = capacity(pick(pair.sglang), state.slo).sustainableTpmPerGpu;
              const current = pair.key === active;
              const verdict = tieBand(vb, va);
              return (
                <TableRow
                  key={pair.key}
                  data-engine-pair={pair.key}
                  aria-current={current || undefined}
                  tabIndex={0}
                  onClick={() => select(pair.key)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(pair.key); } }}
                  className={cn("cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", current && "bg-selection hover:bg-selection")}
                >
                  <TableCell className="whitespace-nowrap"><span className="font-medium">{modelOf(pair.vllm)?.name ?? pair.vllm.modelId}</span> <span className="text-muted-foreground">{pair.vllm.exportLabel}</span></TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">{shape(pair.vllm)} · {topology(pair.vllm)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(va)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(vb)}</TableCell>
                  <TableCell className="text-right tabular-nums">{va !== null && vb !== null && va > 0 ? <span className="inline-flex items-center gap-1.5">{verdict === "tie" ? <Badge variant="neutral">tie</Badge> : null}×{num(vb / va, 2)}</span> : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </EngineIntelDisclosure>
  );
}

/**
 * One engine of the baseline pair: configured build, status, imported-run state and the release review. The atlas
 * B300 flag is labelled as catalog evidence so it never reads as a statement about the imported runs.
 */
function EngineSide({ deployment: d, review }: { deployment: Deployment; review?: { release: string; assessment: string; nvfp4Assessment: string | null; sourceIds: string[] } }) {
  const count = flags(d.engineArgs).size;
  const here = measuredHereLabel(d);
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-md border p-4" data-engine-side={d.runtime}>
      {/* Title: engine and configured build at panel-title size; the release recheck is the secondary line. */}
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex min-w-0 items-start gap-1.5"><SeriesSwatch index={engineIndex(d)} className="mt-1.5" /><EngineBuild deployment={d} size="title" /></span>
        <StatusBadge deployment={d} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {here ? <Badge variant="good" data-measured-here={d.runtime}>{here}</Badge> : null}
        <Badge variant="neutral" title="Catalog flag (testedOnTarget): whether the catalog holds a B300 validation record. Independent of runs imported here." data-catalog-target={d.testedOnTarget}>{testedLabel(d.testedOnTarget)}</Badge>
        <Badge variant="neutral">{count} flags</Badge>
        {isMeasured(d) && d.runtimeTag ? <Badge variant="mono" title={`Run ${d.measuredAt?.slice(0, 10) ?? ""}`} data-run-tag={d.runtimeTag}>run {d.runtimeTag}</Badge> : null}
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => openRun(d.id)}>Details</Button>
      </div>
      {review ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="link" size="sm" className="h-auto justify-start self-start p-0 text-xs" data-engine-review={d.runtime}>Review {review.release}<ChevronRight aria-hidden="true" /></Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(420px,calc(100vw-32px))] space-y-2 text-[13px]">
            <p className="text-pretty">{review.assessment}</p>
            {review.nvfp4Assessment ? <p className="text-ink-2 text-pretty"><span className="text-foreground font-medium">NVFP4: </span>{review.nvfp4Assessment}</p> : null}
            <div className="flex flex-wrap gap-1">{review.sourceIds.map((id) => <Badge key={id} variant="mono">{id}</Badge>)}</div>
          </PopoverContent>
        </Popover>
      ) : null}
    </section>
  );
}

/** The variables held constant across the pair, as a tick bar of matched controls. */
function Controls({ a, b }: { a: Deployment; b: Deployment }) {
  const controls: [string, string, string][] = [
    ["Export", a.exportHfId, b.exportHfId],
    ["Revision", shortSha(a.artifactRevision), shortSha(b.artifactRevision)],
    ["Hardware", topology(a), topology(b)],
    ["Shape", shape(a), shape(b)],
    ["Knob", a.knob ?? "Baseline", b.knob ?? "Baseline"],
  ];
  const matched = controls.filter(([, x, y]) => x === y).length;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4" data-testid="engine-controls">
      <span className="text-[13px] whitespace-nowrap"><span className="font-medium tabular-nums">{matched}/{controls.length}</span> <span className="text-muted-foreground">controls matched</span></span>
      <TickBar value={matched} max={controls.length} segments={controls.length} shape="pill" className="h-2 w-full sm:w-40" color={matched === controls.length ? "var(--chart-3)" : "var(--chart-2)"} aria-label="Matched controls" />
      <ul className="flex flex-wrap gap-1.5">
        {controls.map(([label, x, y]) => (
          <li key={label}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="bg-muted text-ink-2 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11.5px]" data-control={label} data-matched={x === y}>
                  {x === y ? <Check className="size-3" aria-hidden="true" /> : <X className="text-warning-text size-3" aria-hidden="true" />}{label}
                </span>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">{x === y ? x : `vLLM ${x} · SGLang ${y}`}</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </div>
  );
}

const flagValue = (text: string | null) => text?.replace(/^\S+\s?/, "") ?? null;

/** "--kv-cache-dtype fp8" / "kv_cache_dtype fp8_e4m3" with its source; null when neither run nor command sets it. */
const controlCell = (value: ControlValue): string | null => value.value === null ? null : `${value.field ?? value.key} ${value.raw ?? value.value}`.replace(/ on$/, "");

interface ArgRow { label: string; vllm: string | null; sglang: string | null; same: boolean; sources?: [ControlValue["source"], ControlValue["source"]] }

/**
 * Argument differences of the baseline pair. Runtime controls (KV dtype, max sequences, memory fraction, prefix cache,
 * context length) come from the measured runs' recorded runtime_config, else the configured command, normalised as
 * the matchup verdict normalises them (fp8 ≈ fp8_e4m3); every other row maps the configured command flags (catalog).
 */
function ArgumentsDiff({ pair, a: shownA, b: shownB }: { pair: EnginePair; a: Deployment; b: Deployment }) {
  const a = flags(pair.vllm.engineArgs), b = flags(pair.sglang.engineArgs);
  const used = new Set<string>();
  const pick = (map: Map<string, string>, names: string[]) => {
    for (const name of names) if (map.has(name)) { used.add(name); return `${name} ${map.get(name)}`.replace(/ on$/, ""); }
    return null;
  };
  const controlsA = effectiveControls(shownA), controlsB = effectiveControls(shownB);
  for (const spec of CONTROLS) for (const flag of spec.flags) used.add(flag);
  const rows: ArgRow[] = concepts.map(([label, va, sg]): ArgRow => {
    const key = CONTROL_ROWS[label];
    if (key) {
      const x = controlsA.find((item) => item.key === key)!, y = controlsB.find((item) => item.key === key)!;
      return { label, vllm: controlCell(x), sglang: controlCell(y), same: x.value === y.value, sources: [x.source, y.source] };
    }
    const vllm = pick(a, va), sglang = pick(b, sg);
    return { label, vllm, sglang, same: vllm !== null && sglang !== null && flagValue(vllm) === flagValue(sglang) };
  }).filter((row) => row.vllm || row.sglang);
  const rest = (map: Map<string, string>) => [...map].filter(([name]) => !used.has(name)).map(([name, value]) => value === "on" ? name : `${name} ${value}`);
  const otherA = rest(a), otherB = rest(b);
  const differing = rows.filter((row) => !row.same), matching = rows.filter((row) => row.same);
  const cell = (value: string | null, source?: ControlValue["source"]) => value === null
    ? <span className="text-muted-foreground font-sans">default</span>
    : <>{value}{source && source !== "default" ? <span className="text-muted-foreground font-sans" data-control-source={source}> ({source})</span> : null}</>;
  const row = (r: ArgRow) => (
    <TableRow key={r.label} data-arg-row={r.label} data-normalised={r.sources ? "true" : undefined}>
      <TableCell className="text-ink-2 whitespace-nowrap">{r.label}{r.sources ? <span className="text-muted-foreground block text-[11px]">normalised</span> : null}</TableCell>
      <TableCell className="font-mono text-xs break-all whitespace-normal">{cell(r.vllm, r.sources?.[0])}</TableCell>
      <TableCell className="font-mono text-xs break-all whitespace-normal">{cell(r.sglang, r.sources?.[1])}</TableCell>
    </TableRow>
  );
  return (
    <Panel
      title={<span className="inline-flex items-center gap-1.5">Argument differences
        <Tooltip><TooltipTrigger asChild><Info tabIndex={0} className="text-muted-foreground size-3.5 cursor-help" aria-label="About flag mapping" /></TooltipTrigger><TooltipContent className="max-w-72 text-pretty">A row maps related flags. Semantics can differ. Rows marked normalised use the matchup's values (recorded runtime_config, else the configured command; fp8 ≈ fp8_e4m3, max_num_seqs ≈ max_running_requests, gpu_memory_utilization ≈ mem_fraction_static).</TooltipContent></Tooltip>
      </span>}
      description="Runtime controls as the matchup reads them (recorded runtime_config, else configured; normalised); other flags from the configured commands (catalog)."
      actions={<Badge variant="neutral">{differing.length + (otherA.length || otherB.length ? 1 : 0)} differ · {matching.length} same</Badge>}
      bodyClassName="px-0 pb-0"
    >
      {differing.length ? (
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="w-[28%]">Control</TableHead><TableHead><span className="inline-flex items-center gap-1.5"><SeriesSwatch index={0} />vLLM</span></TableHead><TableHead><span className="inline-flex items-center gap-1.5"><SeriesSwatch index={1} />SGLang</span></TableHead></TableRow></TableHeader>
          <TableBody>{differing.map(row)}</TableBody>
        </Table>
      ) : <p className="text-muted-foreground px-4 py-3 text-xs">No mapped control differs.</p>}
      {otherA.length || otherB.length ? (
        <EngineIntelDisclosure summary="Engine-only flags" meta={`vLLM ${otherA.length} · SGLang ${otherB.length}`} data-testid="engine-only-flags">
          <div className="grid gap-x-6 gap-y-3 px-4 pb-3 sm:grid-cols-2">
            {([["vLLM", otherA], ["SGLang", otherB]] as const).map(([runtime, list], index) => (
              <div key={runtime} className="min-w-0" data-engine-only={runtime}>
                <h3 className="text-muted-foreground mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium"><SeriesSwatch index={index} />{runtime}</h3>
                {list.length ? (
                  <ul className="space-y-1">{list.map((flag) => <li key={flag} className="font-mono text-xs break-all">{flag}</li>)}</ul>
                ) : <p className="text-muted-foreground text-xs">None</p>}
              </div>
            ))}
          </div>
        </EngineIntelDisclosure>
      ) : null}
      {matching.length ? (
        <EngineIntelDisclosure summary="Identical values" meta={matching.length}>
          <Table><TableBody>{matching.map(row)}</TableBody></Table>
        </EngineIntelDisclosure>
      ) : null}
    </Panel>
  );
}

type VersionEvent = { key: string; date: string | null; status: "default" | "current" | "done"; title: React.ReactNode; detail?: React.ReactNode; tip?: React.ReactNode; row: string; onClick?: () => void };

/** Catalog configurations of the pair's export on its GPU count (every knob and engine). */
const pairBases = (deployments: Deployment[], pair: EnginePair) =>
  deployments.filter((d) => d.id === d.configurationId && d.artifactId === pair.vllm.artifactId && d.gpus === pair.vllm.gpus);

/**
 * Configured builds and release rechecks (reviews, not validations) per engine for the selected export and GPU
 * count. Imported runs are listed once, in Every measured version; this timeline adds only the catalog facts and
 * sits collapsed inside that panel.
 */
function BuildsAndRechecks({ pair }: { pair: EnginePair }) {
  const state = useAppState();
  const bases = pairBases(state.snapshot.deployments, pair);
  const events = (runtime: "vLLM" | "SGLang"): VersionEvent[] => {
    const list: VersionEvent[] = [];
    const seen = new Set<string>();
    for (const d of bases.filter((item) => item.runtime === runtime)) {
      list.push({ key: d.id, date: d.reviewedOn, status: "default", row: runtimeTag(d), title: <span className="font-mono text-xs">{runtimeTag(d)}</span>, detail: `${shape(d)} · ${d.knob ?? "baseline"} · configured build`, onClick: () => openRun(d.id) });
      for (const prior of d.priorRechecks) {
        const key = `${prior.engineRelease}@${prior.checkedOn}`;
        if (seen.has(key)) continue; seen.add(key);
        list.push({ key, date: prior.checkedOn, status: "done", row: `recheck ${prior.engineRelease}`, title: `Rechecked ${prior.engineRelease}` });
      }
      if (d.recheck) {
        const key = `${d.recheck.engineRelease}@${d.recheck.checkedOn}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ key, date: d.recheck.checkedOn, status: "current", row: `recheck ${d.recheck.engineRelease}`, title: recheckNote(d), tip: <>{d.recheck.argumentStatus ?? "Argument status not recorded."} {testedLabel(d.recheck.testedOnTarget)}.</> });
        }
      }
    }
    return list.sort((x, y) => (x.date ?? "").localeCompare(y.date ?? ""));
  };
  const total = events("vLLM").length + events("SGLang").length;
  return (
    <EngineIntelDisclosure summary="Configured builds and release rechecks" meta={`${total} catalog entr${total === 1 ? "y" : "ies"} · reviews, not validations`} data-testid="runtime-versions-disclosure">
      <div className="grid gap-6 px-4 pt-1 pb-2 md:grid-cols-2" data-testid="runtime-versions">
        {(["vLLM", "SGLang"] as const).map((runtime, index) => (
          <div key={runtime} className="min-w-0">
            <h3 className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium"><SeriesSwatch index={index} />{runtime}</h3>
            <Timeline>
              {events(runtime).map((event) => (
                <TimelineItem key={event.key} status={event.status} data-runtime-row={event.row}>
                  <TimelineRail><TimelineMarker className="size-3" /><TimelineConnector /></TimelineRail>
                  <TimelineContent className="pb-4">
                    <TimelineHeader>
                      <TimelineTitle className="text-[13px] font-normal">
                        {event.tip ? (
                          <Tooltip><TooltipTrigger asChild><span tabIndex={0} className="cursor-help underline decoration-dotted underline-offset-2">{event.title}</span></TooltipTrigger><TooltipContent className="max-w-80">{event.tip}</TooltipContent></Tooltip>
                        ) : event.onClick ? <button type="button" className="hover:underline" onClick={event.onClick}>{event.title}</button> : event.title}
                      </TimelineTitle>
                      <TimelineTime>{event.date?.slice(0, 10) ?? "—"}</TimelineTime>
                    </TimelineHeader>
                    {event.detail ? <span className="text-muted-foreground text-xs">{event.detail}</span> : null}
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </div>
        ))}
      </div>
    </EngineIntelDisclosure>
  );
}

/** Engine hue stays fixed (vLLM chart-1, SGLang chart-2); older versions of an engine are lighter and dashed. */
const VERSION_DASH = [undefined, "6 3", "2 3"] as const;
const VERSION_MIX = [100, 62, 42] as const;

/**
 * Total throughput per GPU against concurrency for each imported run of the pair's export and GPU count on the
 * active dataset (up to six). Drawn only when an engine has more than one run: otherwise it repeats the pair chart.
 */
function VersionChart({ pair }: { pair: EnginePair }) {
  const state = useAppState();
  const bases = pairBases(state.snapshot.deployments, pair);
  const runs = (state.snapshot.runs ?? []).filter((run) => run.identity.dataset === state.workload && bases.some((d) => d.configurationId === run.configurationId));
  const measured = runs.map((run) => {
    const base = bases.find((d) => d.configurationId === run.configurationId)!;
    const version = splitRuntime(run.identity.runtimeVersion).version ?? run.identity.runtimeVersion;
    // Each historical run keeps its own recorded identity (GPU divisor, replicas, tag); the configured build
    // (runtimeVersion) stays the catalog's, and the run's version appears in the knob and runtimeTag.
    const { identity } = run;
    const deployment: Deployment = {
      ...base, id: `${base.id}#${run.id}`, knob: [`v${version.replace(/^v/, "")}`, base.knob].filter(Boolean).join(" · "),
      points: run.metrics, evidence: "measured", measuredAt: run.runDate, runId: run.id, workloadId: identity.dataset,
      runtimeTag: identity.runtimeVersion, runConfig: identity.runtimeConfig, gpuType: identity.gpuType,
      replicas: identity.maxSystemReplicas, runGpus: identity.numGpus, topologyMismatch: identity.numGpus !== base.gpus,
    };
    return deployment;
  });
  const multiVersion = (["vLLM", "SGLang"] as const).some((runtime) => measured.filter((d) => d.runtime === runtime).length > 1);
  if (!multiVersion) return null;
  // Runs sharing one version of one configuration (several recorded runtime configs) are told apart by the knob chips
  // that differ between them, so the legend never lists the same label twice.
  const chipsOf = (d: Deployment) => configChips({ runConfig: d.runConfig, engineArgs: [] });
  for (const d of measured) {
    const twins = measured.filter((other) => other.configurationId === d.configurationId && other.runtimeTag === d.runtimeTag);
    if (twins.length < 2) continue;
    const common = chipsOf(d).filter((chip) => twins.every((other) => chipsOf(other).includes(chip)));
    const own = chipsOf(d).filter((chip) => !common.includes(chip)).slice(0, 2);
    d.knob = [d.knob, own.length ? own.join(" · ") : `run ${d.measuredAt?.slice(0, 10) ?? ""}`].filter(Boolean).join(" · ");
  }
  const shown = measured.slice(-6);
  // Rank within the engine, newest run first: rank 0 is the full engine colour, solid.
  const rank = (d: Deployment) => shown.filter((other) => other.runtime === d.runtime && (other.measuredAt ?? "") > (d.measuredAt ?? "")).length;
  const style = (d: Deployment) => {
    const r = Math.min(rank(d), VERSION_DASH.length - 1);
    const hue = `var(--chart-${engineIndex(d) + 1})`;
    return { color: VERSION_MIX[r] === 100 ? hue : `color-mix(in oklab, ${hue} ${VERSION_MIX[r]}%, var(--card))`, dash: VERSION_DASH[r] };
  };
  return (
    <ChartPanel
      title="Throughput by runtime version"
      description="Total tok/s per GPU · engine colour fixed; older versions lighter and dashed"
      chart={(expanded) => <SweepChart expanded={expanded} title="Throughput by runtime version" deployments={shown} metric="totalTpsPerGpu" markCapacity yAxisTitle="Total tok/s per GPU" unit="tok/s/GPU" seriesStyle={style} />}
    />
  );
}

/** One serve command at a time behind a vLLM | SGLang toggle, collapsed by default. */
function ServeCommands({ a, b }: { a: Deployment; b: Deployment }) {
  const [engine, setEngine] = React.useState<"vLLM" | "SGLang">("vLLM");
  const d = engine === "vLLM" ? a : b;
  return (
    <EngineIntelDisclosure variant="card" summary="Serve commands" meta="KServe container command" data-testid="engine-commands" contentClassName="space-y-3 p-4">
      <ToggleGroup type="single" variant="outline" size="sm" value={engine} onValueChange={(value) => { if (value) setEngine(value as "vLLM" | "SGLang"); }} aria-label="Engine">
        {(["vLLM", "SGLang"] as const).map((item, index) => <ToggleGroupItem key={item} value={item} className="px-3"><SeriesSwatch index={index} />{item}</ToggleGroupItem>)}
      </ToggleGroup>
      <CommandBlock
        title={<button type="button" className="hover:underline" onClick={() => openRun(d.id)}>{d.runtime} · {engineVersion(d)}</button>}
        command={d.command}
        testId={engine === "vLLM" ? "engine-command-vllm" : "engine-command-sglang"}
      />
    </EngineIntelDisclosure>
  );
}

export function EnginePage() {
  const state = useAppState();
  const pick = useMeasured();
  const pairs = enginePairs(state.snapshot.deployments);
  // No pair in the URL: among the model's pairs (the URL model, else the first model with a run on the active dataset),
  // open on the pair the matchup above describes, i.e. the configurations that are each engine's best there, so the
  // pair charts and the headline tell one story; else the first measured pair, else the first pair.
  const pair = pairs.find((item) => item.key === state.pair) ?? defaultPair();
  function defaultPair() {
    const anchor = pairs.find((item) => item.vllm.modelId === state.model)
      ?? pairs.find((item) => isMeasured(pick(item.vllm)) || isMeasured(pick(item.sglang))) ?? pairs[0];
    if (!anchor) return undefined;
    const best = bestPerEngine(state.snapshot.deployments, { modelId: anchor.vllm.modelId, gpus: anchor.vllm.gpus, hardwareId: anchor.vllm.hardwareId }, state.workload, state.slo);
    const v = best.vLLM.deployment?.configurationId, g = best.SGLang.deployment?.configurationId;
    const same = pairs.filter((item) => item.vllm.modelId === anchor.vllm.modelId && item.vllm.gpus === anchor.vllm.gpus);
    return same.find((item) => item.vllm.configurationId === v && item.sglang.configurationId === g)
      ?? same.find((item) => item.vllm.configurationId === v || item.sglang.configurationId === g)
      ?? anchor;
  }
  if (!pair) return <EmptyState icon={Server} title="No matched engine pair" description="No export has both a vLLM and an SGLang baseline at the same shape." />;
  const a = pick(pair.vllm), b = pick(pair.sglang);
  const ca = capacity(a, state.slo), cb = capacity(b, state.slo);
  const measuredBoth = isMeasured(a) && isMeasured(b);
  const va = ca.sustainableTpmPerGpu, vb = cb.sustainableTpmPerGpu;
  const band = tieBand(va, vb);
  const lead = (x: number, y: number) => num(((x - y) / y) * 100, 1);
  const verdict = !measuredBoth ? "Not measured · builds and arguments"
    : va === null && vb === null ? "Neither engine passes this SLO"
    : va === null ? "Only SGLang passes this SLO"
    : vb === null ? "Only vLLM passes this SLO"
    : band === "tie" ? "Tie within ±3% (assumed single-run noise)"
    : band === "a" ? `vLLM +${lead(va, vb)}% sustainable tok/min/GPU`
    : `SGLang +${lead(vb, va)}% sustainable tok/min/GPU`;
  const model = modelOf(pair.vllm);
  const aa = model ? aaHeadline(model.id) : null;
  const reviews = model ? atlasModel(model.id)?.reviews.engines ?? [] : [];
  const reviewOf = (d: Deployment) => reviews.find((review) => review.engine === d.runtime);
  // Model-level sections: one base model on the pair's GPU count, across its exports, knobs and engines.
  const scope = { modelId: pair.vllm.modelId, gpus: pair.vllm.gpus, hardwareId: pair.vllm.hardwareId };
  const shapeKey = `${pair.vllm.gpus}x${pair.vllm.gpuType}`, shapeLabel = `${pair.vllm.gpus}× ${pair.vllm.gpuType}`;
  const modelName = model?.name ?? pair.vllm.modelId;
  const pairDetail = `${pair.vllm.exportLabel} · ${shape(pair.vllm)}`;
  return (
    <div className="space-y-4">
      <PageHeader
        title="Engine"
        description="vLLM vs SGLang for one model and GPU shape."
        actions={
          <Combobox label="Matched pair" testId="engine-model" value={pair.key} onChange={(value) => updateView((s) => { s.pair = value; s.model = "all"; })} className="w-[min(300px,calc(100vw-48px))]" align="end" searchPlaceholder="Search pairs…"
            triggerLabel={<span className="flex min-w-0 items-baseline gap-1.5"><span className="truncate font-medium">{pairLabel(pair)}</span><span className="text-muted-foreground truncate text-xs">{shape(pair.vllm)}</span></span>}
            options={pairs.map((item) => ({ value: item.key, label: pairLabel(item), detail: `${shape(item.vllm)} · ${topology(item.vllm)}`, group: modelOf(item.vllm)?.name, keywords: [modelOf(item.vllm)?.name ?? "", shape(item.vllm), topology(item.vllm)] }))} />
        }
      />
      <EngineMatchup
        scope={scope} fallback={{ vLLM: a, SGLang: b }} shapeKey={shapeKey} modelName={modelName}
        details={
          /* The selected baseline pair (builds, controls, values at C_max) is the matchup's detail, not a second card. */
          <EngineIntelDisclosure
            summary="Baseline pair details"
            meta={`${pairLabel(pair)} · ${shape(pair.vllm)} · ${topology(pair.vllm)}`}
            aside={<span className="text-muted-foreground hidden text-xs sm:inline">builds, controls{isMeasured(a) || isMeasured(b) ? ", values at C_max" : ""}</span>}
            data-testid="engine-baseline-pair"
            className="-mx-4 -mb-4"
            contentClassName="space-y-4 px-4 pt-1 pb-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground inline-flex flex-wrap items-center gap-x-2 text-xs">
                <span className="text-foreground font-medium" data-testid="engine-verdict">{verdict}</span><span aria-hidden="true">·</span><span>{state.workload}</span>
                {aa ? <><span aria-hidden="true">·</span><span title="Artificial Analysis index, model level: identical for both engines">AA (model) {aa.index.toFixed(1)} {effortLabel(aa.variant)}</span></> : null}
              </p>
              <Button variant="outline" size="sm" onClick={() => { appState.compare = [a.id, b.id]; navigate("compare", { runs: `${a.id},${b.id}` }); }}><Columns2 aria-hidden="true" />Open in Compare</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <EngineSide deployment={a} review={reviewOf(a)} />
              <EngineSide deployment={b} review={reviewOf(b)} />
            </div>
            <Controls a={a} b={b} />
            {isMeasured(a) || isMeasured(b) ? <div data-testid="engine-head-to-head"><HeadToHead deployments={[a, b]} capacities={[ca, cb]} /></div> : null}
          </EngineIntelDisclosure>
        }
      />
      <EngineWorkloadVerdicts scope={scope} modelName={modelName} shapeLabel={shapeLabel} />
      <EngineVersions scope={scope} modelName={modelName} shapeLabel={shapeLabel}><BuildsAndRechecks pair={pair} /></EngineVersions>
      <VersionChart pair={pair} />
      {isMeasured(a) || isMeasured(b) ? (
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Total throughput vs concurrency" description={`Baseline pair · ${pairDetail} · total (input + output) tok/s per GPU at each measured level`} chart={(expanded) => <SweepChart expanded={expanded} title="Engine throughput" deployments={[a, b]} metric="totalTpsPerGpu" markCapacity yAxisTitle="Total tok/s per GPU" unit="tok/s/GPU" />} />
        <ChartPanel title="ITL p95 vs concurrency" description={`Baseline pair · ${pairDetail}`} chart={(expanded) => <SweepChart expanded={expanded} title="Engine ITL p95" deployments={[a, b]} metric="itlP95Ms" digits={1} threshold={state.slo.itlP95Ms} thresholdLabel={`ITL p95 ≤ ${num(state.slo.itlP95Ms)} ms`} yAxisTitle="ITL p95 (ms)" unit="ms" />} />
      </div>
      ) : null}
      <EnginePublished modelId={pair.vllm.modelId} modelName={modelName} />
      <ArgumentsDiff pair={pair} a={a} b={b} />
      <ServeCommands a={a} b={b} />
      <MatchedPairs pairs={pairs} active={pair.key} />
    </div>
  );
}
