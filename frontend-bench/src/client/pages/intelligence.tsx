import * as React from "react";
import { ScatterChart } from "@/components/ui/scatter-chart";
import { HeatmapChart } from "@/components/ui/heatmap-chart";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { MetricList } from "@/components/ui/metric-list";
import { logTicks, niceDomain } from "@/scale";
import { NARROW_SM, useMediaQuery } from "../lib/use-media.js";
import type { Model, RankedDeployment } from "../../domain/types.js";
import { FrontierChart, frontierPoints } from "../components/app/charts.js";
import { ChartPanel } from "../components/app/chart-panel.js";
import { PublishedIntelligencePanel } from "../components/app/published-intelligence.js";
import { EngineIntelDisclosure } from "../components/app/engine-intel-disclosure.js";
import { Panel, Term } from "../components/app/primitives.js";
import { navigate, routeUrl, update, updateView, useAppState } from "../state.js";
import { hardwareShape, num, rankedRows, safeFrontier, workloadOf } from "../lib/display.js";
import { aaHeadline, aaRelease, componentScore, contextLabel, effortLabel, intelligence, paramsLabel } from "../lib/atlas.js";

/** Short labels for the benchmark key; the heatmap uses the shorter column codes below. */
const shortComponent = (name: string) => /briefcase/i.test(name) ? "Briefcase" : /automation/i.test(name) ? "Automation" : /gdp/i.test(name) ? "GDP.pdf"
  : /non-halluc/i.test(name) ? "Omni non-hall." : /omniscience/i.test(name) ? "Omni acc." : /frontiercode/i.test(name) ? "FrontierCode"
  : /terminal-bench-science/i.test(name) ? "TB-Science" : /terminal/i.test(name) ? "Terminal-B." : /critpt/i.test(name) ? "CritPt" : /hle/i.test(name) ? "HLE-Diamond" : name;
/** Heatmap column codes (≤ 6 characters so ten columns never run together); the full name is the column title. */
const columnCode = (name: string) => /briefcase/i.test(name) ? "Brief" : /automation/i.test(name) ? "Auto" : /gdp/i.test(name) ? "GDP" : /non-halluc/i.test(name) ? "OmniNH"
  : /omniscience/i.test(name) ? "OmniA" : /frontiercode/i.test(name) ? "FCode" : /terminal-bench-science/i.test(name) ? "TB-Sci" : /terminal/i.test(name) ? "TBench"
  : /critpt/i.test(name) ? "CritPt" : /hle/i.test(name) ? "HLE" : name.slice(0, 6);
/** Phone column codes (≤ 4 characters for ~30px columns). */
const columnCodeNarrow = (name: string) => /briefcase/i.test(name) ? "Brf" : /automation/i.test(name) ? "Auto" : /gdp/i.test(name) ? "GDP" : /non-halluc/i.test(name) ? "OmN"
  : /omniscience/i.test(name) ? "OmA" : /frontiercode/i.test(name) ? "FC" : /terminal-bench-science/i.test(name) ? "TBS" : /terminal/i.test(name) ? "TB"
  : /critpt/i.test(name) ? "CPt" : /hle/i.test(name) ? "HLE" : name.slice(0, 4);

/**
 * One row per catalog model with any published component: the highest composite variant, or, for a model AA has not
 * scored (no composite), its variant with the most published components. Unpublished cells are hatched, never 0.
 */
function componentRows(models: Model[]) {
  return models.map((model) => {
    const headline = aaHeadline(model.id);
    if (headline) return { model, variant: headline.variant, index: headline.index as number | null };
    const release = aaRelease(model.id);
    const count = (variant: { components: Record<string, number | null> }) => Object.values(variant.components).filter((value) => value !== null).length;
    const variant = release ? [...release.variants].sort((a, b) => count(b) - count(a))[0] : undefined;
    return variant && count(variant) > 0 ? { model, variant, index: null } : null;
  }).filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => (b.index ?? -1) - (a.index ?? -1));
}
type ComponentRow = ReturnType<typeof componentRows>[number];
const rawValue = (row: ComponentRow, name: string) => (row.variant.components as Record<string, number | null>)[name] ?? null;

/** Coverage counts as one meta line: published composites, top published index, published component cells. No trends. */
function IntelligenceMeta() {
  const state = useAppState();
  const models = state.snapshot.models;
  const rows = componentRows(models);
  const names = intelligence.components.map((component) => component.evaluation);
  const scored = models.filter((model) => aaHeadline(model.id)).length;
  const indexes = models.map((model) => aaHeadline(model.id)?.index).filter((value): value is number => typeof value === "number");
  const cells = rows.reduce((sum, row) => sum + names.filter((name) => rawValue(row, name) !== null).length, 0);
  return (
    <p data-testid="intelligence-kpis" className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <Badge variant="neutral">AA v5.0.1 · model level</Badge>
      <span><span className="text-foreground font-medium tabular-nums">{scored}</span> of {models.length} models with an AA composite</span>
      <span aria-hidden="true">·</span>
      <span>top <span className="text-foreground font-medium tabular-nums">{indexes.length ? num(Math.max(...indexes), 1) : "—"}</span></span>
      <span aria-hidden="true">·</span>
      <span><span className="text-foreground font-medium tabular-nums">{cells}</span>/{models.length * names.length} components published</span>
    </p>
  );
}

/** Frontier configurations ranked by AA index (model): what to shortlist on the active workload. Never padded. */
function FrontierShortlist({ edge, measured, total, workload }: { edge: RankedDeployment[]; measured: number; total: number; workload: string }) {
  if (!edge.length) {
    return (
      <div data-testid="frontier-shortlist" data-empty="" className="text-muted-foreground rounded-md border border-dashed px-3 py-2.5 text-xs">
        Frontier needs measured SLO capacity — {measured} of {total} configurations measured on <span className="font-mono">{workload}</span>.
      </div>
    );
  }
  const ranked = [...edge].sort((a, b) => (b.quality ?? -1) - (a.quality ?? -1)).slice(0, 5);
  return (
    <MetricList
      data-testid="frontier-shortlist"
      items={ranked.map((row, index) => ({
        key: row.deployment.id,
        label: `${row.model.name} · ${row.deployment.runtime} · ${row.deployment.exportLabel}`,
        // A configuration without a published AA composite reads "—", never 0.0.
        detail: `AA ${num(row.quality, 1)} (model) · TP${row.deployment.tensorParallel} · ${hardwareShape(row.deployment)}`,
        icon: <span className="bg-muted text-ink-2 grid size-5 place-items-center rounded-full text-[11px] font-medium tabular-nums">{index + 1}</span>,
        value: row.capacity.sustainableTpmPerGpu === null ? null : Math.round(row.capacity.sustainableTpmPerGpu),
        unit: "tok/min/GPU",
      }))}
    />
  );
}

/**
 * Empty serving frontier: no 2D plot with an empty throughput axis. One compact block says what unlocks the frontier,
 * and every model with a published AA composite is listed once in a "Not benched" strip, ranked by its AA index (model)
 * and each one labelled. Nothing is placed on a throughput axis until a configuration is measured.
 */
function EmptyFrontier({ workload, measured, total }: { workload: string; measured: number; total: number }) {
  const state = useAppState();
  const models = state.snapshot.models.map((model) => ({ model, aa: aaHeadline(model.id) }))
    .filter((item): item is { model: Model; aa: NonNullable<typeof item.aa> } => item.aa !== null)
    .sort((a, b) => b.aa.index - a.aa.index);
  return (
    <div className="space-y-3" data-testid="frontier-empty">
      <div data-testid="frontier-shortlist" data-empty="" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <Badge variant="neutral" data-testid="not-measured-badge" className="border-dashed">Not measured</Badge>
        <span className="text-muted-foreground">Measure to unlock the frontier: it needs sustainable throughput · <span className="text-foreground font-medium tabular-nums">{measured}</span> of {total} configurations measured on <span className="font-mono">{workload}</span>.</span>
      </div>
      <div>
        <h3 className="text-muted-foreground mb-1.5 text-xs font-medium">Not benched · AA index (model), ranked</h3>
        <ol className="flex flex-wrap gap-1.5" aria-label="Not benched: models ranked by their published AA index">
          {models.map(({ model, aa }) => (
            <li key={model.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={routeUrl("models", { model: model.id, tab: "overview" })} data-lane-model={model.id} aria-label={`${model.name}: AA ${num(aa.index, 1)} (model), not benched`}
                    className="bg-subtle hover:bg-muted inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="border-chart-1 bg-card size-2 shrink-0 rounded-full border-[1.5px]" aria-hidden="true" />
                    <span className="text-ink-2">{model.name}</span>
                    <span className="font-medium tabular-nums">{num(aa.index, 1)}</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent>{model.name} · AA {num(aa.index, 1)} (model) · {effortLabel(aa.variant)} · not benched</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ParametersChart() {
  const state = useAppState();
  const [hover, setHover] = React.useState<string | null>(null);
  const points = state.snapshot.models.map((model) => ({ model, aa: aaHeadline(model.id) }))
    .filter((item) => item.aa !== null && item.model.activeParamsB !== null)
    .map(({ model, aa }) => ({ id: model.id, name: model.name, detail: `${paramsLabel({ totalParamsB: model.parametersB, activeParamsB: model.activeParamsB })} · ${contextLabel(model.contextTokens)} · ${effortLabel(aa!.variant)}`, label: model.name, active: model.activeParamsB!, index: aa!.index }));
  const missing = state.snapshot.models.filter((model) => !points.some((point) => point.id === model.id));
  if (!points.length) return null;
  const xTicks = logTicks(Math.min(...points.map((p) => p.active)), Math.max(...points.map((p) => p.active)));
  const y = niceDomain(0, Math.max(...points.map((p) => p.index)) + 2, 5);
  return (
    <ChartPanel
      id="aa-params"
      title="AA index versus active parameters"
      description={missing.length ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="decoration-muted-foreground/60 cursor-help underline decoration-dotted underline-offset-[3px]">{missing.length} not plotted</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 text-pretty">No AA composite or no established active-parameter count: {missing.map((model) => model.name).join(", ")}.</TooltipContent>
        </Tooltip>
      ) : undefined}
      chart={(expanded) => (
        <ScatterChart
          className={expanded ? "h-[min(68vh,640px)]" : "h-[300px] max-sm:h-[260px] xl:h-[520px]"}
          series={[{ key: "models", label: "Catalog model", data: points as unknown as Record<string, unknown>[], color: "var(--chart-1)", labels: true }]}
          xKey="active" yKey="index" idKey="id" nameKey="name" detailKey="detail" labelKey="label"
          xLabel="Active parameters (B)" yLabel="AA index"
          xAxisTitle="Active parameters, billions (log)" yAxisTitle="AA index (published)"
          xFormatter={(value) => num(value)} yFormatter={(value) => num(value)}
          xTicks={xTicks} xDomain={[xTicks[0] ?? 1, xTicks.at(-1) ?? 100]} xScale="log"
          yTicks={y.ticks} yDomain={[y.min, y.max]}
          highlightId={hover ?? undefined}
          onPointHover={(row) => setHover(row ? String(row.id) : null)}
          onPointSelect={(row) => navigate("models", { model: String(row.id), tab: "overview" })}
          animate={false}
          role="group"
          aria-label={`AA index versus active parameters for ${points.length} catalog models. Use Tab to move between points and Enter to open a model.`}
        />
      )}
    />
  );
}

/** What each index component measures, from AA's methodology page (AA-II-METHOD, retrieved 2026-11-07). */
const componentGuide: Record<string, string> = {
  "AA-Briefcase": "Expert-built multi-week knowledge-work projects over thousands of source files.",
  "AutomationBench-AA": "SaaS workflows across simulated business apps via REST API tools (Zapier).",
  "GDP.pdf": "Reasoning over long real-world professional PDFs (Surge AI).",
  "FrontierCode": "Changes to real open-source repos, scored on whether a maintainer would merge (Cognition).",
  "Terminal-Bench-Science": "Scientific research workflows in a terminal, verified by tests.",
  "Terminal-Bench": "Agentic terminal tasks: SWE, sysadmin, data, training, security.",
  "CritPt": "Research-level physics problems, hard 40-problem subset.",
  "AA-Omniscience v1.1 accuracy": "Factual recall: share of 3,000 open questions answered correctly.",
  "AA-Omniscience v1.1 non-hallucination": "Same questions as 1 − hallucination rate; abstaining beats guessing.",
  "HLE-Diamond": "Cleaned 1,000-question Humanity's Last Exam: reasoning and knowledge.",
};
const guideFor = (evaluation: string) => componentGuide[Object.keys(componentGuide).filter((key) => evaluation.startsWith(key)).sort((a, b) => b.length - a.length)[0] ?? ""] ?? "";

/**
 * The ten components grouped by AA category, collapsed under the heatmap; the summary carries the category weights.
 * Native disclosure, so every chip (and its tooltip trigger) stays mounted while collapsed.
 */
function BenchmarkKey() {
  const categories = [...new Set(intelligence.components.map((component) => component.category))].map((category) => {
    const members = intelligence.components.filter((component) => component.category === category);
    return { category, members, weight: members.reduce((sum, component) => sum + component.weight, 0) };
  });
  return (
    <EngineIntelDisclosure
      data-testid="aa-guide"
      className="-mx-4 -mb-4"
      summary="Components"
      meta={<>{intelligence.components.length}<span className="max-sm:hidden"> · {categories.map(({ category, weight }) => `${category} ${num(weight * 100)}%`).join(" · ")}</span></>}
      contentClassName="grid gap-x-6 gap-y-3 px-4 pt-1 pb-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {categories.map(({ category, members, weight }) => (
        <div key={category} className="min-w-0" data-guide-category={category}>
          <div className="text-muted-foreground mb-1.5 flex items-baseline justify-between text-xs">
            <span className="font-medium">{category}</span>
            <span className="tabular-nums">{num(weight * 100)}%</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {members.map((component) => (
              <Tooltip key={component.evaluation}>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    data-guide-row={shortComponent(component.evaluation)}
                    className="bg-subtle hover:bg-muted inline-flex cursor-help items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {shortComponent(component.evaluation)}
                    <span className="text-muted-foreground tabular-nums">{num(component.weight * 100)}%</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-80 text-left text-pretty">
                  <span className="block font-medium">{component.evaluation}</span>
                  {guideFor(component.evaluation) ? <span className="block">{guideFor(component.evaluation)}</span> : null}
                  <span className="text-background/70 block">{component.scoring}</span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      ))}
    </EngineIntelDisclosure>
  );
}

/** Each model's AA components on a 0–100 scale, as a heatmap; models without a composite keep their published cells. */
function ComponentHeatmap() {
  const state = useAppState();
  const rows = componentRows(state.snapshot.models);
  const names = intelligence.components.map((component) => component.evaluation);
  if (!rows.length) return null;
  const published = (row: ComponentRow) => names.filter((name) => rawValue(row, name) !== null).length;
  // Phones: each model's label sits on its own line above a full-width 10-cell strip instead of a 70%-wide label column.
  const narrow = useMediaQuery(NARROW_SM);
  return (
    <Panel
      id="aa-components"
      title="Index components"
      description={<>0–100 scale · <span className="inline-block size-2.5 rounded-[2px] border align-[-1px]" style={{ backgroundImage: "repeating-linear-gradient(135deg, var(--muted-foreground) 0 1px, transparent 1px 3.5px)" }} aria-hidden="true" /> not published · hover a column code for its name</>}
    >
      <div className="space-y-4">
        <div className="-mx-4 overflow-x-auto px-4" data-testid="aa-heatmap">
          <div className={narrow ? undefined : "min-w-[640px]"}>
            <HeatmapChart
              rows={rows.map((row) => ({
                label: `${row.model.name} · ${row.index === null ? `no composite (${published(row)}/${names.length})` : num(row.index, 1)}`,
                values: names.map((name) => { const value = rawValue(row, name); return value === null ? 0 : componentScore(name, value); }),
                missing: names.map((name) => rawValue(row, name) === null),
              }))}
              columns={names.map(narrow ? columnCodeNarrow : columnCode)}
              columnTitles={names}
              rowLabelsAbove={narrow}
              scale="sqrt"
              max={100}
              cellHeight={22}
              gap={3}
              legendLabels={["0", "100"]}
              cellLabel={(datum) => { const value = rawValue(rows[datum.row]!, names[datum.column]!); return `${rows[datum.row]!.model.name}, ${names[datum.column]}: ${value === null ? "not published" : num(value, 4)}`; }}
              renderTooltip={(datum) => {
                const row = rows[datum.row]!, name = names[datum.column]!, value = rawValue(row, name);
                const component = intelligence.components[datum.column]!;
                if (value === null) return (<><span className="font-medium">{name}: not published</span><span className="text-background/70 block">{row.model.name} · {effortLabel(row.variant)}</span></>);
                return (<><span className="font-medium tabular-nums">{name}: {num(value, /briefcase/i.test(name) ? 0 : 4)}</span><span className="text-background/70 block">{row.model.name} · {effortLabel(row.variant)} · {num(datum.value, 1)} on 0–100 · {num(component.weight * 100)}% of index</span></>);
              }}
            />
          </div>
        </div>
        <BenchmarkKey />
      </div>
    </Panel>
  );
}

export function IntelligenceView() {
  const state = useAppState();
  const rows = rankedRows();
  const points = frontierPoints(rows);
  const edge = safeFrontier(rows);
  const frontierIds = new Set(edge.map((row) => row.deployment.id));
  const selectedId = rows.some((row) => row.deployment.id === state.focusId) ? state.focusId : "";
  const measured = rows.filter((row) => row.capacity.sustainableTpmPerGpu !== null).length;
  const workload = workloadOf(state.workload)?.name ?? state.workload;
  return (
    <div className="space-y-4">
      <IntelligenceMeta />
      {points.length ? (
        <ChartPanel
          id="frontier"
          title="AA index versus sustainable throughput"
          description={<>{edge.length} of {points.length} on the <Term name="Frontier">frontier</Term> · {workload}</>}
          actions={
            <>
              <ToggleGroup type="single" variant="outline" size="sm" value={state.logScale ? "log" : "linear"} aria-label="X-axis scale" onValueChange={(value: string) => { if (value) updateView((s) => { s.logScale = value === "log"; }); }}>
                <ToggleGroupItem value="linear" className="px-2.5">Linear</ToggleGroupItem>
                <ToggleGroupItem value="log" className="px-2.5">Log</ToggleGroupItem>
              </ToggleGroup>
              <div className="flex items-center gap-2">
                <Switch id="frontier-only" checked={state.frontierOnly} onCheckedChange={(checked) => updateView((s) => { s.frontierOnly = checked; })} />
                <Label htmlFor="frontier-only" className="text-ink-2 text-[13px] font-normal">Frontier only</Label>
              </div>
            </>
          }
          chart={(expanded) => (
            <div className="space-y-4">
              {expanded ? null : <FrontierShortlist edge={edge} measured={measured} total={rows.length} workload={workload} />}
              <FrontierChart expanded={expanded} points={points} frontierIds={frontierIds} frontierOnly={state.frontierOnly} log={state.logScale} selectedId={selectedId}
                onSelect={(id) => update((s) => { s.focusId = s.focusId === id ? "" : id; })} onHover={() => undefined} />
            </div>
          )}
        />
      ) : (
        <Panel id="frontier" title="AA index versus sustainable throughput" description={<>Serving <Term name="Frontier">frontier</Term> · {workload}</>}>
          <EmptyFrontier workload={workload} measured={measured} total={rows.length} />
        </Panel>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <PublishedIntelligencePanel />
        <ParametersChart />
      </div>
      <ComponentHeatmap />
    </div>
  );
}
