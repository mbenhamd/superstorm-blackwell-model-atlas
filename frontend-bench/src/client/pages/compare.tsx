import * as React from "react";
import { cn } from "@/lib/utils";
import { Columns2, Download, Link2, Plus, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadarChart } from "@/components/ui/radar-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { capacity, comparability, nominalTtftCeilingMs } from "../../domain/metrics.js";
import type { Deployment } from "../../domain/types.js";
import { InteractivityChart, SweepChart, SweepKey } from "../components/app/charts.js";
import { ChartPanel } from "../components/app/chart-panel.js";
import { openRun } from "../components/app/overlays.js";
import { Combobox, configOptions } from "../components/app/pickers.js";
import { EmptyState, Notice, PageHeader, Panel, SeriesSwatch, Term } from "../components/app/primitives.js";
import { HeadToHead } from "../components/app/head-to-head.js";
import { NotMeasuredBlock } from "../components/app/not-measured-block.js";
import { NARROW_SM, useMediaQuery } from "../lib/use-media.js";
import { CompareBuildSummary, CompareIdentityList, compareHeadToHeadMetrics, distinctLabels } from "../components/app/compare-identity.js";
import { MetricList } from "@/components/ui/metric-list";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { configurationIdOf, MAX_COMPARE, routeUrl, syncUrl, updateView, useAppState } from "../state.js";
import { configDetail, configName, isMeasured, modelOf, num, rankedRows, workloadOf } from "../lib/display.js";
import { aaHeadline, effortLabel, intelligence } from "../lib/atlas.js";
import { exportCompared } from "../lib/export.js";
import { toast } from "../lib/toast.js";

/** Below the sm breakpoint the radar shrinks so its spoke labels stay inside the panel. */
const useNarrow = () => useMediaQuery(NARROW_SM);

async function share(): Promise<void> {
  syncUrl();
  const url = location.href;
  try {
    if (location.protocol === "file:") throw new Error("file");
    await navigator.clipboard.writeText(url);
    toast("Link copied", "Anyone with the link sees this comparison and workload.");
  } catch {
    toast("Copy this route", location.hash);
  }
}

/** Component label without its version or subset suffix, keeping the qualifier that tells two Omniscience rows apart. */
const componentLabel = (name: string) => name.replace(/ v[\d.]+/, "").replace(/ \(.*\)$/, "");
/** Radar axis label: short enough not to clip at the chart edge; the table beside it carries the full name. */
const radarLabel = (name: string) => componentLabel(name)
  .replace(/^AA-Omniscience accuracy$/, "Omni. accuracy").replace(/^AA-Omniscience non-hallucination$/, "Omni. non-halluc.")
  .replace(/^Terminal-Bench-Science.*$/, "TB-Science").replace(/^Terminal-Bench .*$/, "Terminal-Bench").replace(/-AA$/, "");

/** AA component value on a 0–100 scale: Elo components use AA's own clamp((Elo − 500) / 2000); fractions × 100. */
const componentScore = (name: string, value: number | null | undefined): number | null =>
  value === null || value === undefined ? null : /briefcase/i.test(name) ? Math.max(0, Math.min(1, (value - 500) / 2000)) * 100 : value * 100;

/**
 * Model-level Artificial Analysis component profile for the models behind the compared configurations.
 * Deduplicated by model: the same base model on two exports has one published profile, never two.
 */
function QualityProfile({ deployments }: { deployments: Deployment[] }) {
  const narrow = useNarrow();
  // Radar first; "Values" swaps in the exact component table (one view at a time).
  const [view, setView] = React.useState<"radar" | "values">("radar");
  const models = [...new Map(deployments.map((d, index) => [d.modelId, { d, index }])).values()]
    .map((item) => ({ ...item, aa: aaHeadline(item.d.modelId) }))
    .filter((item): item is typeof item & { aa: NonNullable<typeof item.aa> } => item.aa !== null);
  const skipped = [...new Set(deployments.map((d) => d.modelId))].filter((id) => !models.some((item) => item.d.modelId === id));
  if (!models.length) return null;
  if (models.length === 1 && !skipped.length) {
    const only = models[0]!;
    return (
      <p className="text-ink-2 flex flex-wrap items-center gap-x-2 text-[13px]" data-testid="quality-profile" data-single-model="true">
        <Term name="Quality">AA (model)</Term>
        <span className="text-foreground font-semibold tabular-nums">{num(only.aa.index, 1)}</span>
        <span className="text-muted-foreground">{effortLabel(only.aa.variant)} · identical for all {deployments.length} configurations</span>
      </p>
    );
  }
  const names = Object.keys(models[0]!.aa.variant.components ?? {});
  const data = names.map((name) => Object.fromEntries([["dimension", radarLabel(name)], ...models.map((item) => [`s${item.index}`, componentScore(name, (item.aa.variant.components as Record<string, number | null>)[name]) ?? undefined])]));
  const values = data.flatMap((row) => models.map((item) => row[`s${item.index}`] as number | undefined)).filter((value): value is number => typeof value === "number");
  const ceil = Math.min(100, Math.max(10, Math.ceil((Math.max(...values) + 2) / 10) * 10));
  return (
    <Panel
      title={<Term name="Quality">Intelligence profile · model level</Term>}
      description={`AA ${intelligence.version} · same for every export`}
      actions={
        <>
          {skipped.length ? <Badge variant="neutral" title={`No published composite: ${skipped.join(", ")}`}>{skipped.length} without composite</Badge> : null}
          <ToggleGroup type="single" variant="outline" size="sm" value={view} aria-label="Profile view" data-testid="quality-view" onValueChange={(value: string) => { if (value) setView(value as "radar" | "values"); }}>
            <ToggleGroupItem value="radar" className="px-2.5">Radar</ToggleGroupItem>
            <ToggleGroupItem value="values" className="px-2.5">Values</ToggleGroupItem>
          </ToggleGroup>
        </>
      }
    >
      <div data-testid="quality-profile" data-view={view}>
        {view === "radar" ? (
          <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <figure className="m-0" aria-label={`Intelligence component radar for ${models.map((item) => modelOf(item.d)?.name).join(", ")}; exact values under Values`}>
              <RadarChart
                className="h-72"
                data={data}
                angleKey="dimension"
                variant="dots"
                domain={[0, ceil]}
                series={models.map((item) => ({ key: `s${item.index}`, label: modelOf(item.d)?.name ?? item.d.modelId, color: `var(--chart-${item.index + 1})` }))}
                valueFormatter={(value) => num(value, 1)}
                animate={false}
                {...(narrow ? { outerRadius: "52%", margin: { top: 16, right: 64, bottom: 16, left: 64 } } : {})}
              />
            </figure>
            <MetricList
              aria-label="AA index per model"
              items={models.map((item) => ({
                key: item.d.modelId,
                label: <span className="inline-flex items-center gap-2"><SeriesSwatch index={item.index} />{modelOf(item.d)?.name ?? item.d.modelId}</span>,
                detail: `AA index · ${effortLabel(item.aa.variant)}`,
                value: item.aa.index,
                maximumFractionDigits: 1,
              }))}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[420px] [&_td]:py-1.5">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  {models.map((item) => <TableHead key={item.d.modelId} className="text-right whitespace-normal"><span className="inline-flex items-center justify-end gap-1.5"><SeriesSwatch index={item.index} />{modelOf(item.d)?.name}</span></TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="font-medium">
                  <TableCell>AA index</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  {models.map((item) => <TableCell key={item.d.modelId} className="text-right">{num(item.aa.index, 1)} <span className="text-muted-foreground text-xs font-normal">{effortLabel(item.aa.variant)}</span></TableCell>)}
                </TableRow>
                {names.map((name) => {
                  const weight = intelligence.components.find((component) => name.startsWith(component.evaluation.replace(/ \(.*\)$/, "")))?.weight;
                  return (
                    <TableRow key={name}>
                      <TableCell className="text-ink-2" title={name}>{componentLabel(name)}</TableCell>
                      <TableCell className="text-muted-foreground text-right">{weight === undefined ? "—" : `${num(weight * 100)}%`}</TableCell>
                      {models.map((item) => <TableCell key={item.d.modelId} className="text-right">{num(componentScore(name, (item.aa.variant.components as Record<string, number | null>)[name]), 1)}</TableCell>)}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Panel>
  );
}

/** Configurations × measured concurrency levels: pass, out of SLO or — (level not measured for that configuration). */
function SloGrid({ deployments }: { deployments: Deployment[] }) {
  const state = useAppState();
  const caps = deployments.map((d) => capacity(d, state.slo));
  const levels = [...new Set(caps.flatMap((c) => c.points.map((point) => point.concurrency)))].sort((a, b) => a - b);
  return (
    <Panel title="SLO by load level" actions={<Badge variant="neutral">{state.slo.preset === "custom" ? "Custom" : state.slo.preset.replace(/^./, (c) => c.toUpperCase())} SLO</Badge>} id="slo-grid">
      {levels.length ? (
        <div className="overflow-x-auto" data-testid="slo-grid">
          <table className="w-full min-w-[420px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="text-muted-foreground text-left font-medium">Concurrent requests</th>
                {levels.map((level) => <th key={level} className="text-muted-foreground w-10 text-center font-medium tabular-nums">{level}</th>)}
              </tr>
            </thead>
            <tbody>
              {deployments.map((d, index) => (
                <tr key={d.id}>
                  <th scope="row" className="text-left font-medium whitespace-nowrap"><span className="inline-flex items-center gap-2"><SeriesSwatch index={index} />{configName(d)} · {d.runtime}</span></th>
                  {levels.map((level) => {
                    const point = caps[index]!.points.find((item) => item.concurrency === level);
                    const cmax = caps[index]!.highestPassingConcurrency === level;
                    const label = !point ? "Not measured" : point.passes ? "Meets SLO" : `Out of SLO: ${point.failures.join(", ")}`;
                    return (
                      <td key={level} title={`${configName(d)} · ${level} concurrent: ${label}${cmax ? " · C_max" : ""}`} aria-label={`${level} concurrent: ${label}`}
                        data-level-cell={point ? (point.passes ? "pass" : "fail") : "none"}
                        className={cn("h-6 rounded-[3px] text-center tabular-nums", !point ? "text-muted-foreground border border-dashed" : point.passes ? "bg-good/80 text-white" : "bg-warning-soft text-warning-text", cmax && "ring-foreground ring-2 ring-offset-1 ring-offset-[var(--card)]")}>
                        {!point ? "—" : point.passes ? "✓" : "✕"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-muted-foreground rounded-md border border-dashed py-6 text-center text-xs" data-testid="slo-grid-empty">Not measured on {state.workload}</p>}
    </Panel>
  );
}

export function ComparePage() {
  const state = useAppState();
  // Each compared configuration resolves to its measured run on the active dataset when one exists.
  const rows = rankedRows();
  const deployments = state.compare.map((id) => rows.find((row) => row.deployment.id === id || row.deployment.configurationId === id)?.deployment).filter((d): d is Deployment => Boolean(d));
  const measured = deployments.filter(isMeasured);
  const workload = workloadOf(state.workload);
  // Nominal ceiling only before measurement and only for single-turn datasets; measured runs carry per-level ceilings.
  const nominal = nominalTtftCeilingMs(workload, state.slo);
  const base = deployments[0];
  const differences = base ? [...new Set(deployments.slice(1).flatMap((d) => comparability(base, d)))] : [];
  // Compare stores base configuration ids; measured siblings (`<cfg>@<dataset>`) are never offered separately.
  const available = state.snapshot.deployments.filter((d) => d.id === d.configurationId && !state.compare.includes(d.configurationId));
  const caps = deployments.map((d) => capacity(d, state.slo));
  const labels = distinctLabels(deployments);
  const evidence = measured.length === 0 ? <Badge variant="neutral" data-testid="not-measured-badge">Not measured</Badge>
    : measured.length < deployments.length ? <Badge variant="warning">{measured.length} of {deployments.length} measured</Badge>
    : <Badge variant="good">Measured · {state.workload}</Badge>;
  // Charts use fixed colours per selected configuration, so unmeasured ones keep their slot (no series drawn).
  const charts: { title: string; node: (expanded: boolean) => React.ReactNode; description?: React.ReactNode }[] = [
    { title: "Total throughput per GPU", description: <Term name="SLO capacity">observed tok/min/GPU per level · ring: C_max</Term>,
      node: (expanded) => <SweepChart expanded={expanded} legend={false} title="Total throughput per GPU" deployments={deployments} metric="totalTpsPerGpu" perMinute markCapacity yAxisTitle="Total tok/min per GPU" unit="tok/min/GPU" /> },
    { title: "ITL", description: `p95 solid · p50 dashed · ceiling ${num(state.slo.itlP95Ms)} ms`,
      node: (expanded) => <SweepChart expanded={expanded} legend={false} title="ITL" deployments={deployments} metric="itlP95Ms" secondary={{ metric: "itlP50Ms", label: "ITL p50" }} yAxisTitle="ITL, ms" unit="ms" threshold={state.slo.itlP95Ms} thresholdLabel={`ITL p95 ≤ ${num(state.slo.itlP95Ms)} ms`} digits={0} /> },
    { title: "TTFT p95", description: measured.length ? "Dashed: ceiling per level (measured prompt ÷ prefill)" : nominal !== null ? "Ceiling nominal (budget ÷ prefill)" : "Ceiling set per level from measured prompts",
      node: (expanded) => <SweepChart expanded={expanded} legend={false} title="TTFT p95" deployments={deployments} metric="ttftP95Ms" secondary={{ metric: "ttftCeilingMs", label: "ceiling" }} yAxisTitle="TTFT p95, ms" unit="ms" threshold={measured.length ? undefined : nominal} thresholdLabel={nominal !== null ? `Nominal ${num(nominal)} ms` : undefined} /> },
    { title: "Success rate", description: <Tooltip><TooltipTrigger asChild><span tabIndex={0} className="cursor-help underline decoration-dotted underline-offset-[3px]">Floor {num(state.slo.minSuccessRate * 100)}% · console rule</span></TooltipTrigger><TooltipContent className="max-w-64 text-pretty">Successful ÷ (successful + errored + incomplete) per level. The success floor is a console rule; the SLO presets define only prefill speed and ITL.</TooltipContent></Tooltip>,
      node: (expanded) => <SweepChart expanded={expanded} legend={false} title="Success rate" deployments={deployments} metric="successRate" percent yAxisTitle="Success rate, %" unit="%" threshold={state.slo.minSuccessRate * 100} thresholdLabel={`Floor ${num(state.slo.minSuccessRate * 100)}%`} /> },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        title="Compare"
        description={<>Up to {MAX_COMPARE} configurations · <Term name="SLO" /> {state.slo.preset}.</>}
        actions={
          <>
            <Button variant="outline" onClick={() => void share()}><Link2 aria-hidden="true" />Share link</Button>
            <Button variant="outline" onClick={exportCompared} disabled={!deployments.length}><Download aria-hidden="true" />Export</Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2" aria-label="Compared configurations">
        {deployments.map((d, index) => (
          <span key={d.id} className="bg-card inline-flex h-8 max-w-full items-center gap-2 rounded-md border pr-1 pl-2.5 text-[13px]" data-compare-chip={d.id}>
            <SeriesSwatch index={index} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="min-w-0 truncate font-medium hover:underline" onClick={() => openRun(d.id)}>{configName(d)}</button>
              </TooltipTrigger>
              <TooltipContent className="max-w-80"><CompareBuildSummary deployment={d} /></TooltipContent>
            </Tooltip>
            <span className="text-muted-foreground hidden truncate text-xs sm:inline">{configDetail(d)}</span>
            <Button variant="ghost" size="icon-sm" className="size-6" aria-label={`Remove ${configName(d)} ${d.runtime}`} onClick={() => updateView((s) => { s.compare = s.compare.filter((id) => id !== d.id && id !== d.configurationId); })}><X aria-hidden="true" /></Button>
          </span>
        ))}
        {deployments.length < MAX_COMPARE ? (
          <Combobox
            label="Add configuration"
            testId="add-compare"
            value=""
            onChange={(value) => updateView((s) => { const id = configurationIdOf(value); if (!s.compare.includes(id) && s.compare.length < MAX_COMPARE) s.compare = [...s.compare, id]; })}
            options={configOptions(available, true)}
            triggerLabel={<span className="text-ink-2 inline-flex items-center gap-1.5"><Plus className="size-3.5" aria-hidden="true" />Add configuration</span>}
            searchPlaceholder="Search configurations…"
            className="border-dashed"
          />
        ) : <span className="text-muted-foreground text-xs">Maximum of {MAX_COMPARE} reached</span>}
      </div>
      {deployments.length === 0 ? (
        <div className="bg-card rounded-lg border">
          <EmptyState icon={Columns2} title="Nothing to compare yet" description="Add a configuration above, or select rows in Deployments." action={<Button variant="outline" asChild><a href={routeUrl("deployments")}>Open Deployments</a></Button>} />
        </div>
      ) : (
        <>
          {differences.length ? (
            <Notice tone="warning" icon={TriangleAlert}>
              <strong className="font-semibold">Not comparable: {differences.join(", ").toLowerCase()} differ.</strong> Charts withheld.
            </Notice>
          ) : null}
          <Panel title="Comparison" description={<><Term name="SLO capacity">Sustainable</Term> tok/min/GPU at C_max · open a row for evidence</>} actions={evidence} bodyClassName="py-2">
            <CompareIdentityList deployments={deployments} capacities={caps} />
          </Panel>
          {/* Head-to-head only once something is measured: before that the identity rows already carry "—" and the badge. */}
          {differences.length || measured.length === 0 ? null : (
            <HeadToHead deployments={deployments} capacities={caps} metrics={compareHeadToHeadMetrics()} label={(_, index) => labels[index]!} data-testid="compare-head-to-head" />
          )}
          {differences.length ? null : measured.length === 0 ? (
            // No series on this dataset: one compact block replaces the four empty chart frames and the empty SLO grid.
            <NotMeasuredBlock
              testId="compare-charts-empty"
              planFor={deployments[0]?.configurationId ?? ""}
              description={`Throughput, ITL, TTFT, success rate and the per-level SLO grid appear once one of the ${deployments.length} compared configuration${deployments.length === 1 ? "" : "s"} has an imported run.`}
            />
          ) : (
            <div className="space-y-2" data-testid="compare-charts" data-measured="true">
              <div className="flex flex-wrap items-center justify-end gap-2 text-xs" data-testid="compare-legend">
                <span className="inline-flex items-center gap-3"><SweepKey /><span className="text-muted-foreground inline-flex items-center gap-1.5"><span className="border-ink-2 size-3 rounded-full border-[1.5px]" aria-hidden="true" />C_max</span></span>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {charts.map((chart) => <ChartPanel key={chart.title} title={chart.title} description={chart.description} chart={chart.node} />)}
                <ChartPanel className="xl:col-span-2" title="Throughput vs interactivity" description="Output per GPU vs per-user speed · up and right is better" chart={(expanded) => <InteractivityChart expanded={expanded} title="Throughput vs interactivity" deployments={measured} />} />
              </div>
            </div>
          )}
          {differences.length || measured.length === 0 ? null : <SloGrid deployments={deployments} />}
          <QualityProfile deployments={deployments} />
        </>
      )}
    </div>
  );
}
