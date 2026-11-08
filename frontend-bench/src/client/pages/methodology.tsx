import * as React from "react";
import { BookOpen, Boxes, ChartScatter, ChevronRight, DatabaseZap, FileCheck2, FlaskConical, Gauge, Rows3, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KpiCard } from "@/components/ui/kpi-card";
import { Timeline, TimelineConnector, TimelineContent, TimelineItem, TimelineMarker, TimelineRail } from "@/components/ui/timeline";
import { PageHeader, Panel, Term } from "../components/app/primitives.js";
import { WorkloadTags, workloadTagHint } from "../components/app/performance.js";
import { SLO_PRESETS, nominalTtftCeilingMs } from "../../domain/metrics.js";
import { openWorkloads } from "../components/app/workloads.js";
import { navigate, useAppState } from "../state.js";
import { isMeasured, num, workloadBudget } from "../lib/display.js";
import { atlasMeta, cardBenchmarks, intelligence } from "../lib/atlas.js";
import { ATLAS } from "../../domain/catalog.js";
import { VERSION_CLASSES, VERSION_CLASS_LABELS, isWeak } from "../../domain/external.js";
import { externalDataset } from "../lib/external.js";

/** Term → one-line definition. Long-form caveats live in the tooltips of the pages that use the term. */
function Glossary({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y">
      {items.map(([term, text]) => (
        <div key={term} className="grid gap-0.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[150px_1fr] sm:gap-4">
          <dt className="text-[13px] font-medium">{term}</dt>
          <dd className="text-ink-2 text-[13px]">{text}</dd>
        </div>
      ))}
    </dl>
  );
}

const mono = (text: string) => <code className="font-mono text-[12px]">{text}</code>;
const kbd = (text: string) => <kbd className="bg-subtle rounded border px-1.5 py-0.5 font-mono text-xs">{text}</kbd>;

const pipeline: { icon: React.ComponentType<{ className?: string }>; title: string; detail: React.ReactNode }[] = [
  { icon: Boxes, title: "Catalog", detail: "Models, exports and B300 configurations at pinned revisions" },
  { icon: FlaskConical, title: "Plan", detail: "One card per configuration, one run per dataset" },
  { icon: Gauge, title: "Run", detail: <>GuideLLM sweep on KServe + vLLM or SGLang</> },
  { icon: Upload, title: "Import", detail: <>{mono("bun run import:runs")}, one row per concurrency level</> },
  { icon: FileCheck2, title: "Evaluate", detail: "SLO verdicts computed here from raw values" },
];

const RUN_IDENTITY_KEYS = ["model_name", "gpu_type", "num_gpus", "max_system_replicas", "runtime_version", "dataset", "runtime_config"];

type DefinitionTab = "performance" | "intelligence" | "comparability" | "pipeline";
const DEFINITION_TABS: { value: DefinitionTab; label: string; description: string }[] = [
  { value: "performance", label: "Performance", description: "Computed here from raw GuideLLM rows" },
  { value: "intelligence", label: "Intelligence", description: "Model-level scores and publisher cards" },
  { value: "comparability", label: "Comparability", description: "Mismatched cohorts are never overlaid" },
  { value: "pipeline", label: "Pipeline", description: "From catalog to SLO verdict" },
];

/**
 * The four definition sets in one panel, one tab at a time (Performance first: it holds the sustainable definition).
 * Radix mounts only the active tab; nothing here is counted by tests outside the default tab.
 */
function Definitions() {
  const state = useAppState();
  const [tab, setTab] = React.useState<DefinitionTab>("performance");
  const active = DEFINITION_TABS.find((item) => item.value === tab) ?? DEFINITION_TABS[0]!;
  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as DefinitionTab)} className="gap-0" data-testid="methodology-definitions">
      <Panel
        title="Definitions"
        description={active.description}
        actions={
          <TabsList variant="pill" aria-label="Definition set" className="flex-wrap justify-start group-data-[orientation=horizontal]/tabs:h-auto">
            {DEFINITION_TABS.map((item) => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}
          </TabsList>
        }
      >
        <TabsContent value="performance">
          <Glossary items={[
            ["Sustainable throughput", <><span className="font-medium">Total (input + output) tok/s at C_max × {num(state.slo.margin, 2)} × 60 ÷ GPUs</span>, in tok/min/GPU. <Term name="Sustainable throughput"><span className="text-muted-foreground">Assumed definition, not confirmed at source</span></Term></>],
            ["Output tok/min/GPU", <>Output tok/s at C_max × {num(state.slo.margin, 2)} × 60 ÷ GPUs; secondary, always labelled “output”</>],
            ["C_max", "Last measured concurrency level inside the SLO; never interpolated"],
            ["Per-user speed", "Output tok/s of one request, p50, at C_max (tok/s/user)"],
            ["Deployment-wide", "Total tok/s at C_max × margin × 60 for one replica; input and output split from the same level"],
            ["TTFT ceiling", "Measured: prompt tokens per request at that level ÷ prefill speed. Nominal: budget ÷ prefill, single-turn datasets only"],
            ["Success floor", <>≥ {num(state.slo.minSuccessRate * 100)}% of requests; errored and incomplete count against it. Console rule; the SLO presets define only prefill speed and ITL</>],
            ["Ties", "Within ±3% of the best setup reads as a tie: assumed single-run noise, not a measured interval"],
          ]} />
        </TabsContent>
        <TabsContent value="intelligence">
          <Glossary items={[
            ["AA index (model)", "Highest published effort of the base model's AA endpoint"],
            ["Quantized exports", "AA composite does not transfer; excluded from the frontier"],
            ["Frontier", "Publisher exports not beaten on AA index and throughput"],
            ["Card tables", "Publisher or exporter claims; Δ only with a named baseline"],
            ["Display name", <>{mono("Model · Export · Engine · TPn · Knob")}</>],
          ]} />
        </TabsContent>
        <TabsContent value="comparability" className="space-y-4">
          <Glossary items={[
            ["Any comparison", "Same dataset"],
            ["Engine", "Same export, revision, GPUs, shape and knob"],
            ["Precision", "Same model, engine, shape and dataset"],
            ["Run identity", <span className="flex flex-wrap gap-1">{RUN_IDENTITY_KEYS.map((key) => <Badge key={key} variant="mono">{key}</Badge>)}</span>],
            ["runtime_version", <>{mono("<engine>[-<distribution>]-v<version>[-<flavor>]")}, e.g. {mono("vllm-openai-v0.33.0-cu130")}, kept verbatim</>],
            ["Stable ID", <>{mono("model.export.engine.knob")}, used in URLs and imports</>],
          ]} />
        </TabsContent>
        <TabsContent value="pipeline">
          <Timeline data-testid="methodology-pipeline">
            {pipeline.map(({ icon: Icon, title, detail }, index) => (
              <TimelineItem key={title} status={index === 0 ? "done" : "default"}>
                <TimelineRail><TimelineMarker><Icon /></TimelineMarker><TimelineConnector /></TimelineRail>
                <TimelineContent className="pb-3">
                  <span className="text-[13px] font-medium">{title}</span>
                  <span className="text-muted-foreground text-xs">{detail}</span>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </TabsContent>
      </Panel>
    </Tabs>
  );
}

/**
 * Datasets as chips (budget and nominal TTFT ceiling in each tooltip) with the full reference one click away;
 * the tag legend stays mounted inside a native <details> so its tags are in the DOM while collapsed.
 */
function DatasetsPanel() {
  const state = useAppState();
  const tags = [...new Set(state.snapshot.workloads.flatMap((workload) => workload.tags))];
  return (
    <Panel
      title="Datasets"
      description={`${state.snapshot.workloads.length} cohorts · never ranked together`}
      id="methodology-datasets"
      bodyClassName="p-0"
      actions={<Button variant="outline" size="sm" data-testid="methodology-workloads" onClick={openWorkloads}><BookOpen aria-hidden="true" />Dataset reference</Button>}
    >
      <ul className="flex flex-wrap gap-1.5 px-4 py-3" aria-label="Datasets">
        {state.snapshot.workloads.map((workload) => {
          const nominal = nominalTtftCeilingMs(workload, state.slo);
          return (
            <li key={workload.id} data-methodology-workload={workload.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="font-mono font-normal" onClick={openWorkloads}>{workload.id}</Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-pretty tabular-nums">
                  {workloadBudget(workload)} · TTFT ceiling {nominal === null ? "per level" : `${num(nominal)} ms nominal`}
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
      <details className="group border-t">
        <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 text-xs [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />Tag legend · {tags.length} tags
        </summary>
        <dl className="grid gap-x-4 gap-y-1.5 border-t px-4 py-3 text-xs sm:grid-cols-[auto_1fr]" data-testid="tag-legend">
          {tags.map((tag) => (
            <React.Fragment key={tag}>
              <dt><WorkloadTags tags={[tag]} /></dt>
              <dd className="text-ink-2 self-center">{workloadTagHint(tag)}</dd>
            </React.Fragment>
          ))}
        </dl>
      </details>
    </Panel>
  );
}

/**
 * External published results (evidence class "external", the Published page): what they are, the engine-version
 * audit classes and what they are excluded from. One short section; the per-flag descriptions sit in the tooltips.
 */
function ExternalDataPanel() {
  const data = externalDataset();
  const weak = data.records.filter(isWeak).length;
  return (
    <Panel
      title="External published results"
      id="methodology-external"
      description={`${data.records.length} records from ${Object.keys(data.sources).length} sources · retrieved ${data.retrievedOn}`}
      actions={<Button variant="outline" size="sm" onClick={() => navigate("published")} data-testid="methodology-published">Open Published</Button>}
    >
      <div data-testid="methodology-external">
        <Glossary items={[
          ["Evidence class", "External (published): ladders and points published by third parties, engine projects and vendors. Distinct from Measured (imported runs) and Catalog; never measured here"],
          ["Excluded from", "Rankings, sustainable throughput, C_max, Δ vs best, ties, frontier, Compare deltas and CSV measured columns. No SLO is applied"],
          ["Metrics", "The source's names and units (output or total tok/s/GPU, per-user tok/s, TTFT, TPOT/ITL); per-GPU values computed as aggregate ÷ GPUs are labelled derived"],
          ["Engine version", <span key="classes" className="flex flex-wrap gap-1">{VERSION_CLASSES.map((value) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild><Badge variant="neutral" tabIndex={0} className="cursor-help" data-version-class={value}>{VERSION_CLASS_LABELS[value]}</Badge></TooltipTrigger>
              <TooltipContent className="max-w-72 text-pretty">{data.conventions.versionClasses[value]}</TooltipContent>
            </Tooltip>
          ))}<span className="text-ink-2 basis-full text-[13px]">Each published version string is checked against the engine's release lists; a version is never inferred from a date</span></span>],
          ["Hidden by default", `Invalid engine version, unverified extraction and superseded runs (${weak} records); “Show weak records” reveals them`],
          ["Deployment", data.conventions.kserve],
        ]} />
      </div>
    </Panel>
  );
}

export function MethodologyPage() {
  const state = useAppState();
  const aa = intelligence;
  const runs = state.snapshot.deployments.filter(isMeasured).length;
  return (
    <div className="space-y-4">
      <PageHeader title="Methodology" description="Sources, definitions and limits." />
      <section aria-label="Data in this console" data-testid="data-statement" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard className="shadow-panel gap-2 rounded-lg py-4 [&_[data-slot=card-content]]:px-4 [&_[data-slot=card-header]]:px-4" icon={<Rows3 />} label="Catalog configurations" value={ATLAS.configurations.length}>
          {state.snapshot.models.length} models · {ATLAS.artifacts.length} exports · {atlasMeta.asOf}
        </KpiCard>
        <KpiCard className="shadow-panel gap-2 rounded-lg py-4 [&_[data-slot=card-content]]:px-4 [&_[data-slot=card-header]]:px-4" icon={<BookOpen />} label="Hugging Face cards" value={cardBenchmarks?.cards.length ?? 0}>
          Pinned revisions · tables verbatim
        </KpiCard>
        <KpiCard className="shadow-panel gap-2 rounded-lg py-4 [&_[data-slot=card-content]]:px-4 [&_[data-slot=card-header]]:px-4" icon={<ChartScatter />} label="AA releases" value={aa.releases.length}>
          {aa.version} · {aa.asOf} · model level
        </KpiCard>
        <KpiCard className="shadow-panel gap-2 rounded-lg py-4 [&_[data-slot=card-content]]:px-4 [&_[data-slot=card-header]]:px-4" icon={<DatabaseZap />} label="Imported runs" value={state.snapshot.runs?.length ?? runs}>
          {runs ? "Imported GuideLLM runs" : <Badge variant="neutral" className="max-w-full shrink truncate">Not connected</Badge>}
        </KpiCard>
      </section>
      <p className="text-muted-foreground text-xs">Missing values show “—”. Nothing is estimated, synthesized or borrowed from a neighbouring model.</p>
      <Definitions />
      <ExternalDataPanel />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="SLO presets" bodyClassName="p-0" id="slo-presets">
          <Table data-testid="slo-presets">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Preset</TableHead>
                <TableHead className="text-right">Prefill ≥</TableHead>
                <TableHead className="text-right">ITL p95 ≤</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {([["Classic", SLO_PRESETS.classic], ["Low-latency", SLO_PRESETS["low-latency"]], ["Frontier", SLO_PRESETS.frontier]] as const).map(([name, preset]) => (
                <TableRow key={name} data-active={state.slo.preset === preset.preset || undefined} className="data-[active]:bg-selection">
                  <TableCell className="font-medium">{name}{state.slo.preset === preset.preset ? <Badge variant="info" className="ml-2">Active</Badge> : null}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(preset.prefillTps)} tok/s</TableCell>
                  <TableCell className="text-right tabular-nums">{num(preset.itlP95Ms)} ms</TableCell>
                  <TableCell className="text-right tabular-nums">×{preset.margin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-muted-foreground border-t px-4 py-2.5 text-xs">TTFT p95 ≤ prompt tokens ÷ prefill · success ≥ {num(state.slo.minSuccessRate * 100)}% (console rule)</p>
        </Panel>
        <DatasetsPanel />
      </div>
      <Panel title="Open questions" description="Unconfirmed parts of the measurement definition">
        <ul className="text-ink-2 grid gap-x-6 gap-y-1.5 text-[13px] md:grid-cols-2" data-testid="open-evidence">
          <li><span className="font-medium">Sustainable definition</span> · total-token numerator, rate window and handling of incomplete requests are assumed, not confirmed at source</li>
          <li><span className="font-medium">TTFT ceiling</span> · which prompt-token statistic (mean, p50 or budget) sets the ceiling; the console uses input tok/s ÷ requests/s per level</li>
          <li><span className="font-medium">Concurrency ladder</span> · tested levels come only from imported runs; empty charts show no invented ticks</li>
          <li><span className="font-medium">Per-user speed</span> · the GuideLLM field behind it; p95 and rate p50/p95 not imported</li>
          <li><span className="font-medium">GPUs</span> · whether {mono("num_gpus")} is per replica or total; deployment-wide is per replica</li>
          <li><span className="font-medium">Tie band</span> · ±3% single-run noise is assumed, not measured</li>
          <li><span className="font-medium">Success floor</span> · 99% is a console rule; the SLO presets define none</li>
        </ul>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Boundaries">
          <ul className="text-ink-2 list-disc space-y-1 pl-4 text-[13px]">
            <li>KServe deploys; vLLM or SGLang executes. KServe version not recorded.</li>
            <li>Experiment cards are plans; they never launch a job.</li>
            <li>No authentication; the API binds to loopback.</li>
          </ul>
        </Panel>
        <Panel title="Keyboard">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            <dt>{kbd("⌘ K")}</dt><dd className="text-ink-2">Jump to a page, model or configuration</dd>
            <dt>{kbd("Tab")} {kbd("Enter")}</dt><dd className="text-ink-2">Move between chart points, select one</dd>
            <dt>{kbd("Esc")}</dt><dd className="text-ink-2">Close; focus returns to the opener</dd>
          </dl>
        </Panel>
      </div>
      <p className="text-muted-foreground text-xs">
        Built with <a className="text-link hover:underline" href="https://dashboardcn.com" target="_blank" rel="noreferrer">dashboardcn</a> and <a className="text-link hover:underline" href="https://ui.shadcn.com" target="_blank" rel="noreferrer">shadcn/ui</a> (MIT), Recharts and TanStack Table.
      </p>
    </div>
  );
}
