import * as React from "react";
import { Check, ChevronRight, Columns2, Info, Server, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { TickBar } from "@/components/ui/tick-bar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Timeline, TimelineConnector, TimelineContent, TimelineHeader, TimelineItem, TimelineMarker, TimelineRail, TimelineTime, TimelineTitle } from "@/components/ui/timeline";
import { capacity, relativeDelta, tieBand } from "../../domain/metrics.js";
import { splitRuntime } from "../../domain/catalog.js";
import type { Deployment } from "../../domain/types.js";
import { SweepChart } from "../components/app/charts.js";
import { ChartPanel } from "../components/app/chart-panel.js";
import { CommandBlock } from "../components/app/command-block.js";
import { HeadToHead } from "../components/app/head-to-head.js";
import { NotMeasuredBlock } from "../components/app/not-measured-block.js";
import { StatusBadge } from "../components/app/status-badge.js";
import { EngineBuild } from "../components/app/engine-build.js";
import { EngineIntelDisclosure } from "../components/app/engine-intel-disclosure.js";
import { openRun } from "../components/app/overlays.js";
import { Combobox } from "../components/app/pickers.js";
import { EmptyState, PageHeader, Panel, SeriesSwatch, Term } from "../components/app/primitives.js";
import { appState, navigate, updateView, useAppState } from "../state.js";
import { engineVersion, isMeasured, recheckNote, runtimeTag, testedLabel, modelOf, num, shape, topology } from "../lib/display.js";
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

/** Flag-name mapping between the engines. Names map; semantics can differ and are not asserted equal. */
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

/** One engine of the pair: configured build, latest recheck, status and the release review, in one card. */
function EngineSide({ deployment: d, review }: { deployment: Deployment; review?: { release: string; assessment: string; nvfp4Assessment: string | null; sourceIds: string[] } }) {
  const count = flags(d.engineArgs).size;
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-md border p-4" data-engine-side={d.runtime}>
      {/* Title: engine and configured build at panel-title size; the release recheck is the secondary line. */}
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex min-w-0 items-start gap-1.5"><SeriesSwatch index={engineIndex(d)} className="mt-1.5" /><EngineBuild deployment={d} size="title" /></span>
        <StatusBadge deployment={d} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="neutral">{testedLabel(d.testedOnTarget)}</Badge>
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

function ArgumentsDiff({ pair }: { pair: EnginePair }) {
  const a = flags(pair.vllm.engineArgs), b = flags(pair.sglang.engineArgs);
  const used = new Set<string>();
  const pick = (map: Map<string, string>, names: string[]) => {
    for (const name of names) if (map.has(name)) { used.add(name); return `${name} ${map.get(name)}`.replace(/ on$/, ""); }
    return null;
  };
  const rows = concepts.map(([label, va, sg]) => ({ label, vllm: pick(a, va), sglang: pick(b, sg) })).filter((row) => row.vllm || row.sglang);
  const rest = (map: Map<string, string>) => [...map].filter(([name]) => !used.has(name)).map(([name, value]) => value === "on" ? name : `${name} ${value}`);
  const otherA = rest(a), otherB = rest(b);
  const same = (row: (typeof rows)[number]) => row.vllm !== null && row.sglang !== null && flagValue(row.vllm) === flagValue(row.sglang);
  const differing = rows.filter((row) => !same(row)), matching = rows.filter(same);
  const cell = (value: string | null) => value ?? <span className="text-muted-foreground font-sans">default</span>;
  const row = (r: (typeof rows)[number]) => (
    <TableRow key={r.label} data-arg-row={r.label}>
      <TableCell className="text-ink-2 whitespace-nowrap">{r.label}</TableCell>
      <TableCell className="font-mono text-xs break-all whitespace-normal">{cell(r.vllm)}</TableCell>
      <TableCell className="font-mono text-xs break-all whitespace-normal">{cell(r.sglang)}</TableCell>
    </TableRow>
  );
  return (
    <Panel
      title={<span className="inline-flex items-center gap-1.5">Argument differences
        <Tooltip><TooltipTrigger asChild><Info tabIndex={0} className="text-muted-foreground size-3.5 cursor-help" aria-label="About flag mapping" /></TooltipTrigger><TooltipContent className="max-w-72">A row maps related flags. Semantics can differ.</TooltipContent></Tooltip>
      </span>}
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

/**
 * Version history per engine for the selected export and GPU count: each configured build, the release rechecks
 * (reviews, not validations) and every imported run on the active dataset with its change against the previous run.
 */
function RuntimeVersions({ pair }: { pair: EnginePair }) {
  const state = useAppState();
  const bases = state.snapshot.deployments.filter((d) => d.id === d.configurationId && d.artifactId === pair.vllm.artifactId && d.gpus === pair.vllm.gpus);
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
    return { run, base, deployment };
  });
  const events = (runtime: "vLLM" | "SGLang"): VersionEvent[] => {
    const list: VersionEvent[] = [];
    const seen = new Set<string>();
    for (const d of bases.filter((item) => item.runtime === runtime)) {
      // A measured configuration is represented by its runs; its recheck facts are still listed below.
      if (!measured.some((m) => m.base.configurationId === d.configurationId)) list.push({ key: d.id, date: d.reviewedOn, status: "default", row: runtimeTag(d), title: <span className="font-mono text-xs">{runtimeTag(d)}</span>, detail: `${shape(d)} · ${d.knob ?? "baseline"}`, onClick: () => openRun(d.id) });
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
    const own = measured.filter((m) => m.base.runtime === runtime).sort((x, y) => (x.run.runDate ?? "").localeCompare(y.run.runDate ?? ""));
    own.forEach((m, index) => {
      const c = capacity(m.deployment, state.slo);
      const before = own.slice(0, index).reverse().find((other) => other.base.configurationId === m.base.configurationId);
      const delta = before ? relativeDelta(c.sustainableTpmPerGpu, capacity(before.deployment, state.slo).sustainableTpmPerGpu) : null;
      list.push({ key: m.run.id, date: m.run.runDate, status: "done", row: m.run.identity.runtimeVersion, onClick: () => openRun(m.base.id),
        title: <span className="font-mono text-xs">{m.run.identity.runtimeVersion}</span>,
        detail: <span className="inline-flex items-center gap-2">{num(c.sustainableTpmPerGpu)} tok/min/GPU · C_max {num(c.highestPassingConcurrency)}{delta !== null ? <DeltaBadge delta={delta} variant="soft" /> : null}</span> });
    });
    return list.sort((x, y) => (x.date ?? "").localeCompare(y.date ?? ""));
  };
  const chartDeployments = measured.map((m) => m.deployment).slice(-6);
  // Only a version-over-version chart: with one run per engine it would duplicate the head-to-head chart.
  const multiVersion = (["vLLM", "SGLang"] as const).some((runtime) => measured.filter((m) => m.base.runtime === runtime).length > 1);
  return (
    <>
      <Panel title="Runtime versions" description={state.workload}>
        <div className="grid gap-6 md:grid-cols-2" data-testid="runtime-versions">
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
      </Panel>
      {multiVersion ? <ChartPanel title="Throughput by runtime version" chart={(expanded) => <SweepChart expanded={expanded} title="Throughput by runtime version" deployments={chartDeployments} metric="totalTpsPerGpu" perMinute markCapacity yAxisTitle="Total tok/min per GPU" unit="tok/min/GPU" />} /> : null}
    </>
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
  const pair = pairs.find((item) => item.key === state.pair) ?? pairs.find((item) => item.vllm.modelId === state.model) ?? pairs[0];
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
  return (
    <div className="space-y-4">
      <PageHeader
        title="Engine"
        description="vLLM vs SGLang on one export and shape."
        actions={
          <Combobox label="Matched pair" testId="engine-model" value={pair.key} onChange={(value) => updateView((s) => { s.pair = value; s.model = "all"; })} className="w-[min(300px,calc(100vw-48px))]" align="end" searchPlaceholder="Search pairs…"
            triggerLabel={<span className="flex min-w-0 items-baseline gap-1.5"><span className="truncate font-medium">{pairLabel(pair)}</span><span className="text-muted-foreground truncate text-xs">{shape(pair.vllm)}</span></span>}
            options={pairs.map((item) => ({ value: item.key, label: pairLabel(item), detail: `${shape(item.vllm)} · ${topology(item.vllm)}`, group: modelOf(item.vllm)?.name }))} />
        }
      />
      <Panel
        title={`${pairLabel(pair)} · ${shape(pair.vllm)} · ${topology(pair.vllm)}`}
        description={<span className="inline-flex flex-wrap items-center gap-x-2"><span data-testid="engine-verdict">{verdict}</span><span aria-hidden="true">·</span><span>{state.workload}</span>{aa ? <><span aria-hidden="true">·</span><span title="Artificial Analysis index, model level: identical for both engines">AA (model) {aa.index.toFixed(1)} {effortLabel(aa.variant)}</span></> : null}</span>}
        actions={<Button variant="outline" size="sm" onClick={() => { appState.compare = [a.id, b.id]; navigate("compare", { runs: `${a.id},${b.id}` }); }}><Columns2 aria-hidden="true" />Open in Compare</Button>}
        bodyClassName="space-y-4"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <EngineSide deployment={a} review={reviewOf(a)} />
          <EngineSide deployment={b} review={reviewOf(b)} />
        </div>
        <Controls a={a} b={b} />
      </Panel>
      {/* Head-to-head only once either engine is measured; before that the panel description already reads "Not measured". */}
      {isMeasured(a) || isMeasured(b) ? <HeadToHead deployments={[a, b]} capacities={[ca, cb]} /> : null}
      {isMeasured(a) || isMeasured(b) ? (
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Sustainable throughput vs concurrency" chart={(expanded) => <SweepChart expanded={expanded} title="Engine throughput" deployments={[a, b]} metric="totalTpsPerGpu" perMinute markCapacity yAxisTitle="Total tok/min per GPU" unit="tok/min/GPU" />} />
        <ChartPanel title="ITL p95 vs concurrency" chart={(expanded) => <SweepChart expanded={expanded} title="Engine ITL p95" deployments={[a, b]} metric="itlP95Ms" digits={1} threshold={state.slo.itlP95Ms} thresholdLabel={`ITL p95 ≤ ${num(state.slo.itlP95Ms)} ms`} yAxisTitle="ITL p95 (ms)" unit="ms" />} />
      </div>
      ) : (
        <NotMeasuredBlock testId="engine-charts-empty" planFor={pair.vllm.id} description="Sustainable throughput and ITL p95 against concurrency for both engines appear once either configuration has an imported run." />
      )}
      <ArgumentsDiff pair={pair} />
      <ServeCommands a={a} b={b} />
      <RuntimeVersions pair={pair} />
      <MatchedPairs pairs={pairs} active={pair.key} />
    </div>
  );
}
