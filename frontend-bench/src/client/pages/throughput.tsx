import * as React from "react";
import { Activity, BookOpen, ChevronDown, ChevronRight, Columns2, Ellipsis, ExternalLink, FileSearch, Info, Plus, SquareTerminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { capacity, nominalTtftCeilingMs } from "../../domain/metrics.js";
import type { BenchmarkRun, Deployment, RankedDeployment } from "../../domain/types.js";
import { InteractivityChart, SweepChart } from "../components/app/charts.js";
import { ChartPanel } from "../components/app/chart-panel.js";
import { addToCompare, openExperimentForm, openRun } from "../components/app/overlays.js";
import { Combobox, configOptions } from "../components/app/pickers.js";
import { EmptyState, LevelsBadge, PageHeader, Panel, Term } from "../components/app/primitives.js";
import { NotMeasuredBlock } from "../components/app/not-measured-block.js";
import { StatusBadge } from "../components/app/status-badge.js";
import { ConcurrencyTable, ConfigChips, IncompleteBadge, PerformanceStrip } from "../components/app/performance.js";
import { RecheckDetails } from "../components/app/engine-build.js";
import { CommandBlock } from "../components/app/command-block.js";
import { openWorkloads } from "../components/app/workloads.js";
import { appState, configurationIdOf, updateView, useAppState } from "../state.js";
import {
  compactNum, configDetail, configName, engineBuildDetail, gpuDivisorUnconfirmed, gpuTotals, gpusOf, hardwareShape, isMeasured, modelOf, num, rankedRows,
  recheckNote, runtimeTag, shape, statusLabel, testedLabel, workloadBudget, workloadOf,
} from "../lib/display.js";
import { artifact, hfUrl, paramsLabel, shortSha } from "../lib/atlas.js";

/**
 * Run identity (seven-column upsert key of the experiments table) as it would be written for this configuration.
 * max_system_replicas is the KServe replica count recorded by a run; the catalog does not know it (never in-engine DP).
 */
export function runIdentity(d: Deployment, dataset: string): [string, string][] {
  return [
    ["model_name", artifact(d.artifactId)?.slug ?? d.artifactId],
    ["gpu_type", d.gpuType],
    ["num_gpus", String(gpusOf(d))],
    ["max_system_replicas", d.replicas === null ? "—" : String(d.replicas)],
    ["runtime_version", runtimeTag(d)],
    ["dataset", dataset],
    ["runtime_config", d.runConfig ? `${Object.keys(d.runConfig).length} recorded keys` : d.knob ? `${d.knob} · ${d.engineArgs.length} args` : `baseline · ${d.engineArgs.length} args`],
  ];
}

const runsOf = (d: Deployment): BenchmarkRun[] =>
  (appState.snapshot.runs ?? []).filter((run) => run.configurationId === d.configurationId).sort((a, b) => Date.parse(b.runDate) - Date.parse(a.runDate));

/** The row shown for a picked run: the same configuration with that run's metrics and recorded identity. */
function rowForRun(row: RankedDeployment, run: BenchmarkRun | undefined, slo = appState.slo): RankedDeployment {
  const d = row.deployment;
  if (!run || run.id === d.runId) return row;
  const { identity } = run;
  const shown: Deployment = {
    ...d, workloadId: identity.dataset, points: run.metrics, measuredAt: run.runDate, evidence: "measured", runId: run.id,
    runtimeTag: identity.runtimeVersion, gpuType: identity.gpuType, replicas: identity.maxSystemReplicas, runConfig: identity.runtimeConfig,
    runGpus: identity.numGpus, topologyMismatch: identity.numGpus !== d.gpus,
  };
  return { ...row, deployment: shown, capacity: capacity(shown, slo) };
}

export function ThroughputPage() {
  const state = useAppState();
  const rows = rankedRows();
  // state.run holds a base configuration id; rows carry the measured sibling for the active dataset when one exists.
  const base = rows.find((item) => item.deployment.configurationId === state.run) ?? rows[0];
  const [pickedRun, setPickedRun] = React.useState<string | null>(null);
  React.useEffect(() => setPickedRun(null), [base?.deployment.configurationId]);
  if (!base) return <EmptyState icon={Activity} title="No configurations in the catalog" description="The catalog is empty." />;
  const runs = runsOf(base.deployment);
  const picked = runs.find((run) => run.id === pickedRun && run.identity.dataset === state.workload);
  const row = rowForRun(base, picked, state.slo);
  const d = row.deployment;
  const measured = isMeasured(d);
  const workload = workloadOf(d.workloadId) ?? workloadOf(state.workload);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Throughput"
        description={<>C_max and sustainable throughput under the <Term name="SLO" />.</>}
        actions={
          <>
            <Combobox
              label="Configuration" testId="run-picker" value={base.deployment.id} wrap align="end" searchPlaceholder="Search configurations…"
              onChange={(value) => updateView((s) => { s.run = rows.find((item) => item.deployment.id === value)?.deployment.configurationId ?? configurationIdOf(value); })}
              options={configOptions(rows.map((item) => item.deployment))}
              className="max-sm:w-full sm:w-[min(360px,calc(100vw-420px))] sm:min-w-[240px]"
              triggerLabel={<span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-1.5"><span className="font-medium">{configName(d)}</span><span className="text-muted-foreground text-xs sm:truncate">{configDetail(d)}</span></span>}
            />
            {runs.length ? <RunPicker runs={runs} shown={d} onPick={(run) => { setPickedRun(run.id); if (run.identity.dataset !== state.workload) updateView((s) => { s.workload = run.identity.dataset; }); }} /> : null}
            <Button variant="outline" onClick={() => addToCompare(d.id)}><Columns2 aria-hidden="true" />Add to compare</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions" data-testid="throughput-more"><Ellipsis aria-hidden="true" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => openRun(d.id)}><FileSearch aria-hidden="true" />Evidence</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openExperimentForm(base.deployment.id)}><Plus aria-hidden="true" />Plan run</DropdownMenuItem>
                <DropdownMenuItem onSelect={openWorkloads}><BookOpen aria-hidden="true" />Workloads</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <IdentityLine row={row} />
      <PerformanceStrip row={row} workload={workload} slo={state.slo} />
      <Tabs value={state.runTab} onValueChange={(value) => updateView((s) => { s.runTab = value === "configuration" ? "configuration" : "sweep"; })}>
        <TabsList variant="pill" className="mb-1">
          <TabsTrigger value="sweep">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="sweep" className="space-y-4 pt-3"><Sweep row={row} planFor={base.deployment.id} /></TabsContent>
        <TabsContent value="configuration" className="pt-3"><RunConfiguration deployment={d} dataset={d.workloadId === base.deployment.workloadId ? state.workload : d.workloadId} /></TabsContent>
      </Tabs>
    </div>
  );
}

/** Runs recorded for this configuration (date · dataset · runtime_version); disabled with "No runs" until a run is imported. */
function RunPicker({ runs, shown, onPick }: { runs: BenchmarkRun[]; shown: Deployment; onPick: (run: BenchmarkRun) => void }) {
  const options = runs.map((run) => ({
    value: run.id,
    label: `${run.runDate.slice(0, 10)} · ${run.identity.dataset}`,
    detail: run.identity.runtimeVersion,
    group: run.identity.dataset,
  }));
  const current = runs.find((run) => run.id === shown.runId);
  return (
    <Combobox
      label="Run" testId="run-history" value={shown.runId ?? ""} options={options} searchPlaceholder="Search runs…" align="end"
      onChange={(value) => { const run = runs.find((item) => item.id === value); if (run) onPick(run); }}
      className="w-[min(260px,calc(100vw-120px))]"
      triggerLabel={<span className="flex min-w-0 items-baseline gap-1.5"><span className="text-muted-foreground text-xs">Run</span><span className="truncate">{current ? `${current.runDate.slice(0, 10)} · ${current.identity.dataset}` : `${runs.length} run${runs.length === 1 ? "" : "s"} · none on this dataset`}</span></span>}
    />
  );
}

/** Small info icon whose tooltip carries a caveat that would otherwise be a sentence on the page. */
function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground inline-grid size-5 place-items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={label}><Info className="size-3.5" aria-hidden="true" /></button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">{children}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Status line under the header: evidence state, warnings that change how a number reads (incomplete requests, GPU
 * count or divisor), and the serve-command toggle. Hardware, knobs, build and recheck live in the Configuration tab.
 */
function IdentityLine({ row }: { row: RankedDeployment }) {
  const d = row.deployment;
  const measured = isMeasured(d);
  const [open, setOpen] = React.useState(false);
  return (
    <section className="space-y-2" aria-label="Configuration status">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs" data-testid="throughput-identity">
        <Badge variant={measured ? "good" : "neutral"}>{measured ? `Measured · ${d.measuredAt?.slice(0, 10)}` : "Reference · no run"}</Badge>
        <StatusBadge deployment={d} />
        {measured ? <IncompleteBadge count={row.capacity.incomplete} /> : null}
        {d.topologyMismatch ? <Badge variant="warning" title={`Run used ${gpusOf(d)} GPUs; the catalog shape has ${d.gpus}.`}>GPU count differs</Badge> : null}
        {gpuDivisorUnconfirmed(d) ? <Badge variant="warning" data-testid="gpu-divisor-unconfirmed" title={`${d.replicas} system replicas: tok/min/GPU divides by num_gpus = ${gpusOf(d)}, read as GPUs per replica (unconfirmed). If throughput is aggregated over replicas, the per-GPU figure is overstated by ×${d.replicas}.`}>GPU divisor unconfirmed</Badge> : null}
        <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" aria-expanded={open} aria-controls="throughput-serve" onClick={() => setOpen((value) => !value)}>
          <SquareTerminal aria-hidden="true" />Serve command<ChevronDown className={cn("transition-transform", open && "rotate-180")} aria-hidden="true" />
        </Button>
      </div>
      {open ? (
        <div id="throughput-serve">
          <CommandBlock className="shadow-panel" testId="throughput-serve-command" title={`Serve command · ${engineBuildDetail(d)}`} caption={<><span className="font-mono">{d.exportHfId}@{shortSha(d.artifactRevision)}</span> · KServe container command</>} command={d.command} />
        </div>
      ) : null}
    </section>
  );
}

/**
 * Measured: throughput full width, then TTFT, ITL, per-user speed and interactivity, then the per-level table in a
 * native <details> (rows stay mounted while collapsed). Not measured: one compact block names the dataset, offers
 * "Plan run" and lists the SLO thresholds; no chart renders without a series.
 */
function Sweep({ row, planFor }: { row: RankedDeployment; planFor: string }) {
  const state = useAppState();
  const d = row.deployment, c = row.capacity, point = c.selectedPoint;
  const measured = isMeasured(d);
  const workload = workloadOf(d.workloadId);
  const nominal = workload ? nominalTtftCeilingMs(workload, state.slo) : null;
  const ttft = point?.ttftCeilingMs ?? nominal;
  const ttftLabel = ttft === null ? undefined : point?.ttftCeilingMs != null ? `Ceiling ${num(ttft)} ms at C_max` : `Ceiling ${num(ttft)} ms (nominal)`;
  if (!measured) {
    return (
      <NotMeasuredBlock
        testId="throughput-not-measured"
        planFor={planFor}
        description="Throughput per GPU, TTFT, ITL, per-user speed and the per-level table appear after a run is imported."
      />
    );
  }
  const throughput = (
    <ChartPanel
      title="Throughput per GPU"
      description="Total tok/min per GPU · ring marks C_max"
      chart={(expanded) => <SweepChart expanded={expanded} title="Throughput per GPU" deployments={[d]} metric="totalTpsPerGpu" perMinute yAxisTitle="Total tok/min per GPU" unit="tok/min/GPU" markCapacity sustainable />}
    />
  );
  return (
    <>
      {throughput}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Time to first token, p95" description={nominal === null && !point ? "Ceiling per level (multi-turn)" : "Dashed: prompt ÷ prefill speed"} chart={(expanded) => <SweepChart expanded={expanded} title="TTFT p95" deployments={[d]} metric="ttftP95Ms" yAxisTitle="TTFT p95, ms" unit="ms" threshold={ttft} thresholdLabel={ttftLabel} markCapacity />} />
        <ChartPanel title="Inter-token latency" description="p95 solid · p50 dashed" chart={(expanded) => <SweepChart expanded={expanded} title="ITL p95 and p50" deployments={[d]} metric="itlP95Ms" secondary={{ metric: "itlP50Ms", label: "p50" }} yAxisTitle="ITL, ms" unit="ms" threshold={state.slo.itlP95Ms} thresholdLabel={`ITL p95 ≤ ${num(state.slo.itlP95Ms)} ms`} digits={1} markCapacity />} />
        <ChartPanel title="Per-user speed, p50" description="Output tok/s per request" chart={(expanded) => <SweepChart expanded={expanded} title="Per-user speed" deployments={[d]} metric="outputTpsPerUser" yAxisTitle="tok/s per user" unit="tok/s/user" threshold={1000 / state.slo.itlP95Ms} thresholdLabel={`≈${num(1000 / state.slo.itlP95Ms, 1)} tok/s from ITL ceiling (computed)`} digits={1} markCapacity />} />
        <ChartPanel title="Throughput vs interactivity" description="Output per GPU vs per-user speed" chart={(expanded) => <InteractivityChart expanded={expanded} title="Throughput vs interactivity" deployments={[d]} />} />
      </div>
      <details className="group bg-card shadow-panel rounded-lg border" data-testid="concurrency-details">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
          <ChevronRight className="text-muted-foreground size-4 transition-transform group-open:rotate-90" aria-hidden="true" />
          Per-level table<span className="text-muted-foreground font-normal tabular-nums">· {c.totalLevels} level{c.totalLevels === 1 ? "" : "s"}</span>
          <span className="ml-auto"><LevelsBadge capacity={c} /></span>
        </summary>
        <div className="border-t"><ConcurrencyTable row={row} /></div>
      </details>
    </>
  );
}

const mono = (value: string) => <code className="font-mono text-xs">{value}</code>;

/** Run-identity values in a readable form; the verbatim key → value pairs live in the info tooltip. */
const identityText = (key: string, value: string): string =>
  key === "num_gpus" ? `${value} GPU${value === "1" ? "" : "s"}` : key === "max_system_replicas" ? `replicas ${value}` : value;

/**
 * Second caption line of the serve command: the seven-value run identity (upsert key) in one muted line.
 * Spans, not <code>: tests read the command text through `command-block code`.
 */
function RunIdentityCaption({ deployment: d, dataset, measured }: { deployment: Deployment; dataset: string; measured: boolean }) {
  const identity = runIdentity(d, dataset);
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5" data-testid="run-identity">
      <span className="text-foreground inline-flex items-center gap-0.5 font-medium">
        Run identity
        <InfoTip label="About run identity">
          <span className="block">Upsert key of the experiments table. Re-running the same seven values replaces that cell's metrics.</span>
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
            {identity.map(([key, value]) => <React.Fragment key={key}><dt className="opacity-70">{key}</dt><dd className="[overflow-wrap:anywhere]">{value}</dd></React.Fragment>)}
          </dl>
        </InfoTip>
      </span>
      {identity.map(([key, value]) => (
        <span key={key} className="font-mono text-[11.5px] [overflow-wrap:anywhere]" title={key}>{identityText(key, value)}</span>
      ))}
      <span>{measured ? `recorded ${d.measuredAt?.slice(0, 10) ?? ""}`.trim() : "projected · no run"}</span>
    </span>
  );
}

/** One labelled group of key/value rows; long values clamp to two lines and keep the full text in a tooltip. */
function Group({ title, items, action }: { title: string; items: [string, React.ReactNode, string?][]; action?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
        <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{title}</h3>
        {action}
      </div>
      <dl className="px-4 pb-2 text-[13px]">
        {items.map(([label, value, full]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 border-b border-dashed py-1.5 last:border-0">
            <dt className="text-muted-foreground shrink-0">{label}</dt>
            <dd className="line-clamp-2 min-w-0 text-right font-medium [overflow-wrap:anywhere]" title={full}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const configValue = (value: unknown): string => typeof value === "string" ? value : JSON.stringify(value);

/** Engine, export and dataset identity for one configuration, the recorded run config, the run identity and the KServe command. */
function RunConfiguration({ deployment: d, dataset }: { deployment: Deployment; dataset: string }) {
  const state = useAppState();
  const model = modelOf(d);
  const exported = artifact(d.artifactId);
  const workload = workloadOf(dataset);
  const nominal = workload ? nominalTtftCeilingMs(workload, state.slo) : null;
  const measured = isMeasured(d);
  return (
    <div className="space-y-4" data-testid="run-configuration">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <CommandBlock
            className="shadow-panel"
            title={`Serve command · ${engineBuildDetail(d)}`}
            caption={<><span className="font-mono">{d.exportHfId}@{shortSha(d.artifactRevision)}</span> · KServe container command<RunIdentityCaption deployment={d} dataset={dataset} measured={measured} /></>}
            command={d.command}
          />
          {d.runConfig ? (
            <Panel title="Recorded runtime_config" actions={<Badge variant="good">From run {d.measuredAt?.slice(0, 10)}</Badge>} bodyClassName="p-0">
              <dl className="grid gap-px bg-border sm:grid-cols-2" data-testid="recorded-runtime-config">
                {Object.entries(d.runConfig).map(([key, value]) => (
                  <div key={key} className="bg-card flex items-baseline justify-between gap-3 px-4 py-1.5 text-[12.5px]">
                    <dt className="text-muted-foreground font-mono">{key}</dt>
                    <dd className="truncate font-mono font-medium" title={configValue(value)}>{configValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          ) : null}
          {d.recheck ? <Panel><RecheckDetails deployment={d} /></Panel> : null}
        </div>
        <section className="bg-card shadow-panel min-w-0 divide-y rounded-lg border" aria-label="Configuration">
          <Group title="Engine" items={[
            ["Configured build", engineBuildDetail(d)],
            ["Latest recheck", recheckNote(d) ?? "None"],
            ["Run runtime_version", d.runtimeTag ? mono(d.runtimeTag) : "No run"],
            ["Target", testedLabel(d.testedOnTarget)],
            ["Shape", `${shape(d)} · ${hardwareShape(d)}`],
            ["GPUs", gpuTotals(d)],
            ["Knob", d.knob ?? "Baseline"],
            ["Flags", <ConfigChips key="flags" deployment={d} max={6} className="justify-end" />],
            ["Speculative", d.draftHfId ? mono(d.draftHfId) : d.speculativeDecoding ? "In-model" : "Off"],
            ["Context cap", d.contextCap ? `${compactNum(d.contextCap)} tokens` : "Not capped"],
            ["Status", statusLabel(d)],
          ]} />
          <Group title="Weights" action={<a className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs" href={hfUrl(d.exportHfId, d.artifactRevision)} target="_blank" rel="noreferrer">Hugging Face<ExternalLink className="size-3" aria-hidden="true" /></a>} items={[
            ["Model", model ? model.name : d.modelId, model ? `${model.name} · ${model.architecture}` : undefined],
            ["Parameters", model ? paramsLabel({ totalParamsB: model.parametersB, activeParamsB: model.activeParamsB }) : "—"],
            ["Repository", mono(d.exportHfId)],
            ["Revision", mono(shortSha(d.artifactRevision))],
            ["Precision", d.precision],
            ["Quantization", <span key="q" className="font-normal">{d.quantMethod}</span>, d.quantMethod],
            ["Export status", <span key="s" className="text-ink-2 font-normal">{exported?.status ?? "—"}</span>, exported?.status],
          ]} />
          <Group title="Dataset" items={[
            ["Dataset", workload ? mono(workload.name) : dataset],
            ["Budget", workload ? workloadBudget(workload) : "—"],
            ["TTFT ceiling", nominal !== null ? `${num(nominal)} ms (nominal, computed)` : "Per level from measured prompt"],
          ]} />
        </section>
      </div>
    </div>
  );
}
