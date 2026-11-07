import * as React from "react";
import { Activity, ArrowRight, ChevronRight, ExternalLink, FileSearch, Info, Layers, ListOrdered, SearchX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DistributionBar } from "@/components/ui/distribution-bar";
import { MetricValue } from "@/components/ui/metric-value";
import { TickBar } from "@/components/ui/tick-bar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreGaugeCard } from "@/components/blocks/score-gauge-card";
import { VariantLadder } from "../components/app/tldr-comparisons.js";
import { ModelsEngineReviews } from "../components/app/models-engine-reviews.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Deployment, Model } from "../../domain/types.js";
import { openRun } from "../components/app/overlays.js";
import { Combobox } from "../components/app/pickers.js";
import { EmptyState, PageHeader, Panel, Term } from "../components/app/primitives.js";
import { routeUrl, updateView, useAppState } from "../state.js";
import { isMeasured, num, rankedRows, workloadOf } from "../lib/display.js";
import { FacetedFilter } from "../components/app/pickers.js";
import type { RankedDeployment } from "../../domain/types.js";
import { aaHeadline, aaRelease, artifactsOf, atlasModel, categoryScores, unavailableExportsOf, cardsOf, cardRetention, contextLabel, effortLabel, hfUrl, paramsLabel, shortSha, type CardRecord, type CardTable } from "../lib/atlas.js";

const precisionOrder = ["BF16", "FP8", "FP4/FP8", "MXFP4", "NVFP4"];
const gb = (bytes: number | null | undefined) => (bytes ? `${num(bytes / 1e9, bytes >= 1e11 ? 0 : 1)} GB` : "—");
const params = (model: Model) => paramsLabel({ totalParamsB: model.parametersB, activeParamsB: model.activeParamsB });

/** Statuses split into candidates and compatibility probes, from the configuration records. */
function statusSegments(configs: Deployment[]) {
  const candidates = configs.filter((item) => item.status === "candidate").length;
  return [
    { name: "Candidate", value: candidates, color: "var(--chart-1)" },
    { name: "Probe", value: configs.length - candidates, color: "var(--chart-4)" },
  ];
}

/** Best measured configuration of a model on the active workload: highest sustainable tok/min/GPU; "—" until measured. */
function bestRow(rows: RankedDeployment[]): RankedDeployment | null {
  return rows.filter((row) => row.capacity.sustainableTpmPerGpu !== null).sort((a, b) => b.capacity.sustainableTpmPerGpu! - a.capacity.sustainableTpmPerGpu!)[0] ?? null;
}

function BestOnWorkload({ modelId }: { modelId: string }) {
  const state = useAppState();
  const best = bestRow(rankedRows().filter((row) => row.model.id === modelId));
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs" data-testid="model-best" data-measured={best ? "true" : undefined} title={`Active workload: ${workloadOf(state.workload)?.name ?? state.workload}`}>
      <span className="text-muted-foreground">Best sustainable</span>
      {best ? (
        <span className="tabular-nums">
          <span className="font-semibold">{num(best.capacity.sustainableTpmPerGpu)}</span>
          <span className="text-muted-foreground"> tok/min/GPU · C_max </span>{best.capacity.highestPassingConcurrency}
        </span>
      ) : <span className="text-muted-foreground" data-missing="true">—</span>}
    </div>
  );
}

function ModelCard({ model }: { model: Model }) {
  const state = useAppState();
  const configs = state.snapshot.deployments.filter((item) => item.modelId === model.id && item.id === item.configurationId);
  const candidates = configs.filter((item) => item.status === "candidate").length;
  const exports = artifactsOf(model.id);
  const precisions = precisionOrder.filter((precision) => exports.some((item) => item.precision === precision));
  const aa = aaHeadline(model.id);
  return (
    <a
      href={routeUrl("models", { model: model.id, tab: "overview" })}
      className="group/card bg-card shadow-panel hover:border-border-strong flex min-w-0 flex-col gap-3 rounded-lg border p-4 transition-[border-color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-model-card={model.id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-semibold">{model.name}</h2>
          <p className="text-muted-foreground truncate text-xs">{params(model)} · {contextLabel(model.contextTokens)}</p>
        </div>
        <ArrowRight className="text-muted-foreground group-hover/card:text-foreground mt-0.5 size-4 shrink-0 transition-transform duration-150 group-hover/card:translate-x-0.5" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-muted-foreground">AA index (model)</span>
          {aa ? <span><MetricValue value={aa.index} maximumFractionDigits={1} className="text-[15px] font-semibold" /> <span className="text-muted-foreground">{effortLabel(aa.variant)}</span></span> : <span className="text-muted-foreground">No composite</span>}
        </div>
        {aa ? <TickBar value={aa.index} max={100} segments={40} className="h-3" aria-label={`AA index ${num(aa.index, 1)} of 100`} /> : <div className="h-3 rounded-full border border-dashed" role="img" aria-label="No published AA composite" data-missing="true" />}
      </div>
      <BestOnWorkload modelId={model.id} />
      <div className="flex flex-wrap items-center gap-1 border-t pt-3 text-xs">
        {precisions.map((precision) => <Badge key={precision} variant="neutral">{precision}</Badge>)}
        <span className="text-muted-foreground ml-auto tabular-nums" title={`${candidates} candidate and ${configs.length - candidates} probe configurations`}>{candidates}/{configs.length} candidates</span>
      </div>
    </a>
  );
}

/** Model-level AA index with the category scores this console calculates from AA's published components. */
function AaScoreCard({ model }: { model: Model }) {
  const aa = aaHeadline(model.id);
  const release = aaRelease(model.id);
  if (!aa) {
    const best = release ? [...release.variants].sort((a, b) => Object.values(b.components).filter((v) => v !== null).length - Object.values(a.components).filter((v) => v !== null).length)[0] : undefined;
    const published = best ? Object.values(best.components).filter((v) => v !== null).length : 0;
    return (
      <Card className="gap-3 rounded-lg py-4" data-testid="model-aa">
        <CardHeader className="px-4"><CardDescription><Term name="Intelligence">AA index (model)</Term></CardDescription><CardTitle className="text-muted-foreground text-2xl font-semibold tracking-tight" data-missing="true">—</CardTitle></CardHeader>
        <CardContent className="space-y-2 px-4">
          <TickBar value={published} max={10} segments={10} className="h-3" aria-label={`${published} of 10 components published`} />
          <p className="text-muted-foreground text-xs tabular-nums">{release ? `${published}/10 components published` : "Not listed by Artificial Analysis"}</p>
        </CardContent>
      </Card>
    );
  }
  const scores = categoryScores(aa.variant as { components: Record<string, number | null> });
  const missing = scores.filter((item) => item.score === null).map((item) => item.category);
  return (
    <ScoreGaugeCard
      data-testid="model-aa"
      className="gap-3 rounded-lg py-4 [&_[data-slot=card-content]]:px-4 [&_[data-slot=card-header]]:px-4"
      title="AA index (model)"
      status=""
      badge={<Badge variant="neutral" title={effortLabel(aa.variant) === "reasoning" ? "Reasoning model, no effort setting" : `Highest published effort: ${effortLabel(aa.variant)}`}>{effortLabel(aa.variant)}</Badge>}
      caption={missing.length ? `Not published: ${missing.join(", ")}` : undefined}
      score={aa.index}
      scoreFractionDigits={1}
      gaugeSize={112}
      thickness={9}
      items={scores.filter((item) => item.score !== null).map((item) => ({ label: item.category, value: Math.round(item.score as number), max: 100 }))}
      action={<Tooltip><TooltipTrigger asChild><Info className="text-muted-foreground size-3.5" aria-label="About this score" tabIndex={0} /></TooltipTrigger><TooltipContent className="max-w-72 text-pretty">Artificial Analysis index for the model at its highest published effort. Category bars are weight-averaged component scores calculated here. Model level: not measured on any export or engine.</TooltipContent></Tooltip>}
    />
  );
}

/** The first candidate the catalog recommends, and the reference configuration that implements it. */
function Recommended({ model }: { model: Model }) {
  const atlas = atlasModel(model.id);
  const configs = useAppState().snapshot.deployments.filter((item) => item.modelId === model.id && item.id === item.configurationId);
  const first = configs.find((item) => item.status === "candidate" && item.knob === null && item.tensorParallel === atlas?.baselineTp) ?? configs.find((item) => item.status === "candidate") ?? configs[0];
  // One-line title from catalog facts (baseline shape and the exports to compare); the catalog's planning prose is body text.
  const precisions = precisionOrder.filter((precision) => artifactsOf(model.id).some((item) => item.precision === precision));
  const headline = [atlas ? `KServe TP${atlas.baselineTp}` : "KServe", precisions.join(" vs ")].filter(Boolean).join(" · ");
  return (
    <Card className="gap-4 rounded-lg py-4" data-testid="model-recommended" aria-labelledby="model-recommended-title">
      <CardHeader className="px-4">
        <CardDescription id="model-recommended-title">First candidate</CardDescription>
        <CardTitle className="text-[15px] leading-snug font-semibold">{headline}</CardTitle>
        {atlas?.evidenceStatus ? <CardAction><Tooltip><TooltipTrigger asChild><Badge variant="neutral" tabIndex={0} className="cursor-help">Evidence status</Badge></TooltipTrigger><TooltipContent className="max-w-80 text-pretty">{atlas.evidenceStatus}</TooltipContent></Tooltip></CardAction> : null}
        {model.recommended ? <p className="text-ink-2 col-span-full text-[13px] leading-relaxed text-pretty" data-testid="model-recommended-note">{model.recommended}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        {first ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="bg-muted truncate rounded px-1.5 py-0.5 font-mono text-xs">{first.configurationId}</code>
            {isMeasured(first) ? <Badge variant="good">Measured</Badge> : null}
            <span className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => openRun(first.id)}><FileSearch aria-hidden="true" />Evidence</Button>
            <Button variant="outline" size="sm" asChild><a href={routeUrl("throughput", { run: first.id })}><Activity aria-hidden="true" />Throughput</a></Button>
          </div>
        ) : null}
        <div className="border-t pt-3">
          <div className="text-muted-foreground mb-2 flex justify-between text-xs"><span>{configs.length} B300 configurations</span></div>
          <DistributionBar segments={statusSegments(configs)} showValues valueFormatter={(value) => String(value)} />
        </div>
      </CardContent>
    </Card>
  );
}

const projectionLabel = (key: string) => key.replace(/_1based$/, " (1-based)").replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const projectionValue = (value: unknown): string =>
  Array.isArray(value) ? (value.length > 8 ? `${value.slice(0, 8).join(", ")} … (${value.length})` : value.join(", "))
    : typeof value === "number" ? num(value, Number.isInteger(value) ? 0 : 3)
    : value === null || value === undefined ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value);

const PROJECTION_VISIBLE = 8;

function ProjectionCells({ entries }: { entries: [string, unknown][] }) {
  return (
    <>
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0 px-4 py-2.5 shadow-[-1px_-1px_0_var(--border)]">
          <dt className="text-muted-foreground truncate text-xs" title={key}>{projectionLabel(key)}</dt>
          <dd className="truncate font-mono text-[12.5px] font-medium" title={projectionValue(value)}>{projectionValue(value)}</dd>
        </div>
      ))}
    </>
  );
}

/** Pinned config.json fields; the first eight show, the rest expand on demand. */
function ArchitectureProjection({ model }: { model: Model }) {
  const atlas = atlasModel(model.id);
  const projection = (atlas?.configProjection ?? {}) as Record<string, unknown>;
  const entries = Object.entries(projection);
  const rest = entries.slice(PROJECTION_VISIBLE);
  return (
    <Panel title="Architecture" description="Model facts · config.json" bodyClassName="px-0 pb-0">
      <dl className="grid grid-cols-1 sm:grid-cols-3" data-testid="model-facts">
        <div className="min-w-0 px-4 py-2.5 shadow-[-1px_-1px_0_var(--border)]"><dt className="text-muted-foreground text-xs">Publisher</dt><dd className="truncate text-[13px] font-medium">{model.company}</dd></div>
        <div className="min-w-0 px-4 py-2.5 shadow-[-1px_-1px_0_var(--border)]"><dt className="text-muted-foreground text-xs">Baseline</dt><dd className="text-[13px] font-medium tabular-nums">{atlas ? `TP${atlas.baselineTp}` : "—"}</dd></div>
        <div className="min-w-0 px-4 py-2.5 shadow-[-1px_-1px_0_var(--border)]">
          <dt className="text-muted-foreground text-xs">Weights</dt>
          <dd className="min-w-0 truncate"><a className="hover:text-link inline-flex max-w-full items-center gap-1 font-mono text-[12.5px] font-medium underline-offset-2 hover:underline" href={hfUrl(model.hfId, model.revision)} target="_blank" rel="noreferrer" title={`${model.hfId}@${model.revision}`}><span className="truncate">{model.hfId}</span><span className="text-muted-foreground">@{shortSha(model.revision)}</span><ExternalLink className="size-3 shrink-0" aria-hidden="true" /></a></dd>
        </div>
      </dl>
      <div data-testid="architecture-projection">
        <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"><ProjectionCells entries={entries.slice(0, PROJECTION_VISIBLE)} /></dl>
        {rest.length ? (
          <details className="group">
            <summary className="text-link cursor-pointer list-none border-t px-4 py-2 text-xs [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">Show all {entries.length} fields</span><span className="hidden group-open:inline">Show fewer</span></summary>
            <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"><ProjectionCells entries={rest} /></dl>
          </details>
        ) : null}
      </div>
    </Panel>
  );
}

/** Kept for importers of the old name; the rows live in models-engine-reviews.tsx. */
export const EngineReviews = ModelsEngineReviews;

const hatched = (color: string) => ({ backgroundColor: `color-mix(in oklab, ${color} 35%, transparent)`, backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 5px)` });

/**
 * Exports as a dashboardcn breakdown list: weights as a hatched bar on a shared scale, configuration count and, on the
 * Precision tab, the export card's mean Δ vs its baseline (calculated from the card's own table). Requested exports with no Hub artifact
 * stay listed as "No artifact" and link nowhere.
 */
function ExportLadder({ model, showCards = false }: { model: Model; showCards?: boolean }) {
  const deployments = useAppState().snapshot.deployments;
  const exports = artifactsOf(model.id).sort((a, b) => precisionOrder.indexOf(a.precision) - precisionOrder.indexOf(b.precision));
  const cards = cardsOf(model.id);
  const unavailable = unavailableExportsOf(model.id);
  const maxBytes = Math.max(1, ...exports.map((item) => item.weightBytes ?? 0));
  return (
    <Panel title="Exports" description="Weights · ideal bytes" bodyClassName="p-0" id="export-ladder">
      <ul className="divide-y">
        {exports.map((item) => {
          const configs = deployments.filter((config) => config.artifactId === item.id && config.id === config.configurationId).length;
          const card = cards.find((entry) => entry.hf_id === item.hfId);
          const comparison = card?.tables.some((table) => table.baseline_column);
          const retention = card && comparison ? cardRetention(card) : null;
          const color = "var(--chart-1)";
          return (
            <li key={item.id} className="grid gap-x-4 gap-y-1.5 px-4 py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] sm:items-center" data-precision-row={item.id} data-export={item.id}>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{item.label}</div>
                <a className="text-muted-foreground hover:text-link block truncate font-mono text-[11px] underline-offset-2 hover:underline" href={hfUrl(item.hfId, item.revision)} target="_blank" rel="noreferrer" title={item.status}>{item.hfId}</a>
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-ink-2 truncate" title={item.precisionDetail}>{item.precisionDetail}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{gb(item.weightBytes)}</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full" role="img" aria-label={item.weightBytes ? `${gb(item.weightBytes)} of weights` : "Weight bytes not recorded"}>
                  <div className="h-full rounded-full" style={{ width: `${((item.weightBytes ?? 0) / maxBytes) * 100}%`, ...hatched(color) }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:justify-end">
                <Badge variant="neutral" className="tabular-nums">{configs} config{configs === 1 ? "" : "s"}</Badge>
                {showCards ? (!card ? <Badge variant="neutral">No card table</Badge> : retention ? <Badge variant="neutral" className={cn("tabular-nums", deltaTone(retention.mean))} title={retentionTitle(retention)} data-card-delta={signedPts(retention.mean)}>Card Δ {signedPts(retention.mean)} pts</Badge> : comparison ? <Badge variant="neutral">Δ vs baseline</Badge> : card.tables.length ? <Badge variant="neutral">Scores only</Badge> : <Badge variant="neutral">No table</Badge>) : null}
              </div>
            </li>
          );
        })}
        {unavailable.map((item) => (
          <li key={item.variantKey} className="text-muted-foreground grid gap-x-4 gap-y-1.5 px-4 py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] sm:items-center" data-unavailable-export={item.variantKey}>
            <div className="min-w-0 text-[13px]">{item.variantKey.toUpperCase()}</div>
            <div className="min-w-0 space-y-1">
              <div className="truncate text-xs" title={item.status ?? undefined}>{item.precision}</div>
              <div className="h-2 rounded-full border border-dashed" aria-hidden="true" />
            </div>
            <div className="flex sm:justify-end">
              <Tooltip><TooltipTrigger asChild><Badge variant="neutral" tabIndex={0} className="cursor-help">No artifact</Badge></TooltipTrigger><TooltipContent className="max-w-80 text-pretty">{item.status}</TooltipContent></Tooltip>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ModelOverviewTab({ model }: { model: Model }) {
  return (
    <div className="space-y-4">
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AaScoreCard model={model} />
        <Recommended model={model} />
      </div>
      <VariantLadder modelId={model.id} sort="sustainable" title="Configurations" />
      <ModelsEngineReviews model={model} />
      <ArchitectureProjection model={model} />
    </div>
  );
}

/** Sign colour only for a change that survives rounding to two decimals (same rule as the TL;DR glance). */
const deltaTone = (value: number) => (Math.abs(value) < 0.005 ? "text-ink-2" : value < 0 ? "text-critical-text" : "text-good-text");
/** Signed points to two decimals; "±0.00" when the change rounds away. */
const signedPts = (value: number) => `${Math.abs(value) < 0.005 ? "±" : value < 0 ? "−" : "+"}${Math.abs(value).toFixed(2)}`;
const retentionTitle = (r: { rows: number; heading: string }) => `Mean of (export − baseline) over ${r.rows} benchmark${r.rows === 1 ? "" : "s"} in "${r.heading}"; calculated here from the card's own values, not measured`;

const numeric = (value: number | string | undefined): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;

/** Signed points as a bar from a centre line; the scale is the table's largest absolute Δ. */
function DeltaBar({ delta, max }: { delta: number; max: number }) {
  const width = max > 0 ? Math.min(50, (Math.abs(delta) / max) * 50) : 0;
  return (
    <span className="bg-muted relative hidden h-1.5 w-20 overflow-hidden rounded-full md:inline-block" aria-hidden="true">
      <span className="bg-border-strong absolute inset-y-0 left-1/2 w-px" />
      <span className={cn("absolute inset-y-0 rounded-full", delta < 0 ? "bg-critical" : "bg-good")} style={delta < 0 ? { right: "50%", width: `${width}%` } : { left: "50%", width: `${width}%` }} />
    </span>
  );
}

function CardTableView({ table }: { table: CardTable }) {
  const base = table.baseline_column;
  const deltaOf = (row: CardTable["rows"][number]) => {
    const baseline = base ? numeric(row.values[base]) : null;
    const others = table.columns.filter((column) => column !== base).map((column) => numeric(row.values[column]));
    const other = others.length === 1 ? others[0] ?? null : null;
    return baseline !== null && other !== null ? other - baseline : null;
  };
  const maxDelta = Math.max(0, ...table.rows.map((row) => Math.abs(deltaOf(row) ?? 0)));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[13px] font-semibold">{table.heading}</h4>
        <span className="flex items-center gap-2">
          {table.settings ? (
            <Tooltip>
              <TooltipTrigger asChild><Badge variant="neutral" tabIndex={0} className="cursor-help">Settings</Badge></TooltipTrigger>
              <TooltipContent className="max-w-96 text-pretty" data-card-settings>{table.settings}</TooltipContent>
            </Tooltip>
          ) : null}
          <span className="text-muted-foreground font-mono text-[11px]" title="README line range">L{table.line_start}–{table.line_end}</span>
        </span>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Benchmark</TableHead>
              {table.columns.map((column) => <TableHead key={column} className="text-right">{column}{column === base ? <Badge variant="neutral" className="ml-1.5">Baseline</Badge> : null}</TableHead>)}
              {base ? <TableHead className="text-right" title="Points, calculated here from the card's own values">Δ pts</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row, index) => {
              const delta = deltaOf(row);
              return (
                <TableRow key={`${row.benchmark}-${index}`}>
                  <TableCell className="text-ink-2">{row.benchmark}</TableCell>
                  {table.columns.map((column) => <TableCell key={column} className="text-right tabular-nums">{row.values[column] ?? "—"}</TableCell>)}
                  {base ? (
                    <TableCell className="text-right">
                      {delta === null ? <span className="text-muted-foreground">—</span> : (
                        <span className="inline-flex items-center justify-end gap-2.5">
                          <DeltaBar delta={delta} max={maxDelta} />
                          <span className={cn("w-12 tabular-nums", delta < 0 && "text-critical-text", delta > 0 && "text-good-text")}>{`${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${Math.abs(delta).toFixed(2)}`}</span>
                        </span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CardPanel({ card, scale }: { card: CardRecord; scale: number }) {
  // Every card starts collapsed; the header carries the card's mean Δ so the tables are needed only for detail.
  const comparison = card.tables.some((table) => table.baseline_column);
  const retention = comparison ? cardRetention(card) : null;
  const [open, setOpen] = React.useState(false);
  const rows = card.tables.reduce((sum, table) => sum + table.rows.length, 0);
  const toggle = card.tables.length ? (
    <Button variant={open ? "ghost" : "outline"} size="sm" aria-expanded={open} onClick={() => setOpen((value) => !value)} data-card-toggle={card.hf_id}>
      {open ? "Hide tables" : `Show ${card.tables.length} table${card.tables.length === 1 ? "" : "s"} · ${rows} rows`}
    </Button>
  ) : <span className="text-muted-foreground text-xs">No benchmark table</span>;
  return (
    <section className="bg-card shadow-panel min-w-0 rounded-lg border" data-card={card.hf_id} aria-label={card.hf_id}>
      {/* Line 1: the repository on its own line (breaks anywhere rather than truncating). Line 2: role, Card Δ, notes and the table toggle. */}
      <div className="space-y-2 px-4 py-3">
        <a className="hover:text-link inline-flex max-w-full items-start gap-1 font-mono text-[13px] font-medium break-all underline-offset-2 hover:underline" href={hfUrl(card.hf_id, card.revision)} target="_blank" rel="noreferrer">{card.hf_id}<ExternalLink className="mt-1 size-3 shrink-0" aria-hidden="true" /></a>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge variant="neutral">{card.role === "base" ? "Base card" : "Export card"}</Badge>
          {retention ? (
            <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap" title={retentionTitle(retention)} data-card-delta={signedPts(retention.mean)}>
              <DeltaBar delta={retention.mean} max={scale} />
              <span className={cn("font-medium tabular-nums", deltaTone(retention.mean))}>Card Δ {signedPts(retention.mean)} pts</span>
              <span className="text-muted-foreground tabular-nums">· {retention.rows} benchmark{retention.rows === 1 ? "" : "s"}</span>
            </span>
          ) : comparison ? <Badge variant="neutral">Δ vs baseline</Badge> : null}
          {card.notes ? (
            <Tooltip>
              <TooltipTrigger asChild><Badge variant="neutral" tabIndex={0} className="cursor-help" data-card-notes>Card notes</Badge></TooltipTrigger>
              <TooltipContent className="max-w-96 text-pretty">{card.notes}</TooltipContent>
            </Tooltip>
          ) : null}
          <span className="ml-auto">{toggle}</span>
        </div>
      </div>
      {open && card.tables.length ? <div className="space-y-4 border-t p-4">{card.tables.map((table, index) => <CardTableView key={`${table.heading}-${index}`} table={table} />)}</div> : null}
    </section>
  );
}

function PrecisionTab({ model }: { model: Model }) {
  const exports = artifactsOf(model.id).sort((a, b) => precisionOrder.indexOf(a.precision) - precisionOrder.indexOf(b.precision));
  // Cards that report a quantized-versus-baseline comparison first, then the base card, then the rest in export order.
  const rankCard = (card: CardRecord) => card.tables.some((table) => table.baseline_column) ? 0 : card.role === "base" ? 1 : 2;
  const exportIndex = (card: CardRecord) => { const index = exports.findIndex((item) => item.hfId === card.hf_id); return index < 0 ? exports.length : index; };
  const cards = cardsOf(model.id).sort((a, b) => rankCard(a) - rankCard(b) || exportIndex(a) - exportIndex(b));
  // Shared scale for the header Δ bars: the largest absolute card mean on this model.
  const scale = Math.max(0, ...cards.map((card) => Math.abs(cardRetention(card)?.mean ?? 0)));
  return (
    <div className="space-y-4">
      <ExportLadder model={model} showCards />
      <div className="flex items-center gap-2 pt-1">
        <h2 className="text-[13px] font-medium">HF card claims</h2>
        <Tooltip>
          <TooltipTrigger asChild><Info className="text-muted-foreground size-3.5" tabIndex={0} aria-label="About card claims" /></TooltipTrigger>
          <TooltipContent className="max-w-80 text-pretty">Verbatim publisher or exporter tables, not measured here. Δ is calculated only when a card names a baseline column.</TooltipContent>
        </Tooltip>
      </div>
      {cards.length ? <div className="space-y-3">{cards.map((card) => <CardPanel key={`${card.hf_id}-${card.revision}`} card={card} scale={scale} />)}</div> : <EmptyState icon={Layers} title="No card tables" description="No pinned HF card publishes a benchmark table." className="bg-card rounded-lg border" />}
    </div>
  );
}

/** Model index: cards sorted by AA index, filtered by search, export precision and configuration status. */
function ModelIndex() {
  const state = useAppState();
  const [precision, setPrecision] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<string[]>([]);
  const configsOf = (id: string) => state.snapshot.deployments.filter((item) => item.modelId === id && item.id === item.configurationId);
  const precisionsOf = (id: string) => artifactsOf(id).map((item) => item.precision as string);
  const statusesOf = (id: string): string[] => configsOf(id).map((item) => (item.status === "candidate" ? "Candidate" : "Probe"));
  // Text filter comes from the URL (`q=`, also set from the command menu); there is no visible search field.
  const search = state.query.trim().toLowerCase();
  const models = [...state.snapshot.models]
    .filter((item) => !search || `${item.name} ${item.company} ${item.hfId} ${item.id}`.toLowerCase().includes(search))
    .filter((item) => precision.length === 0 || precisionsOf(item.id).some((value) => precision.includes(value)))
    .filter((item) => status.length === 0 || statusesOf(item.id).some((value) => status.includes(value)))
    .sort((a, b) => (aaHeadline(b.id)?.index ?? -1) - (aaHeadline(a.id)?.index ?? -1));
  const count = (test: (id: string) => boolean) => state.snapshot.models.filter((item) => test(item.id)).length;
  const precisions = precisionOrder.filter((value) => state.snapshot.models.some((item) => precisionsOf(item.id).includes(value)));
  return (
    <div className="space-y-4">
      <PageHeader title="Models" description={<>{state.snapshot.models.length} models · exports · <Term name="Intelligence">AA index</Term></>} />
      <div className="flex flex-wrap items-center gap-2" data-testid="model-filters">
        {state.query ? (
          <Button variant="outline" size="sm" className="h-8 border-dashed" data-testid="query-chip" aria-label={`Clear text filter “${state.query}”`} onClick={() => updateView((s) => { s.query = ""; })}>
            <span className="text-muted-foreground">Matching</span><span className="max-w-40 truncate">{state.query}</span><X aria-hidden="true" />
          </Button>
        ) : null}
        <FacetedFilter title="Precision" selected={precision} onChange={setPrecision} options={precisions.map((value) => ({ value, label: value, count: count((id) => precisionsOf(id).includes(value)) }))} />
        <FacetedFilter title="Status" selected={status} onChange={setStatus} options={["Candidate", "Probe"].map((value) => ({ value, label: value, count: count((id) => statusesOf(id).includes(value)) }))} />
        <span className="text-muted-foreground ml-auto text-xs tabular-nums" data-testid="model-count">{models.length} of {state.snapshot.models.length}</span>
      </div>
      {models.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {models.map((item) => <ModelCard key={item.id} model={item} />)}
        </div>
      ) : (
        <EmptyState icon={SearchX} title="No models match" description="Clear the text filter or a facet." action={<Button variant="outline" onClick={() => { updateView((s) => { s.query = ""; }); setPrecision([]); setStatus([]); }}>Reset filters</Button>} />
      )}
    </div>
  );
}

export function ModelsPage() {
  const state = useAppState();
  const model = state.snapshot.models.find((item) => item.id === state.model);
  if (!model) return <ModelIndex />;
  const configurations = state.snapshot.deployments.filter((item) => item.modelId === model.id && item.id === item.configurationId);
  const atlas = atlasModel(model.id);
  // Four key facts as pills; publisher, baseline shape and the weights link sit in the Architecture panel.
  const chips: [string, React.ReactNode, string?][] = [
    ["Params", params(model), atlas?.parameterNote ?? undefined],
    ["Context", contextLabel(model.contextTokens)],
    ["Layout", model.layout],
    ["License", model.license, model.license],
  ];
  return (
    <div className="space-y-4">
      <div>
        <nav aria-label="Breadcrumb" className="text-muted-foreground mb-2 flex min-w-0 items-center gap-1 text-[13px]">
          <a href={routeUrl("models")} className="hover:text-foreground rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">Models</a>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
          <Combobox label="Switch model" testId="model-switcher" variant="ghost" value={model.id} onChange={(value) => updateView((s) => { s.model = value; })} className="text-foreground h-7 max-w-[calc(100vw-140px)] px-1.5" options={state.snapshot.models.map((item) => ({ value: item.id, label: item.name, detail: params(item) }))} searchPlaceholder="Search models…" />
        </nav>
        <PageHeader
          title={model.name}
          description={<span className="line-clamp-1" title={model.description}>{model.description}</span>}
          actions={
            <>
              <Button asChild><a href={routeUrl("tldr", { model: model.id })} data-testid="model-compare-setups" title="Every setup of this model ranked by sustainable tok/min/GPU, with its gap to the best (TL;DR)"><ListOrdered aria-hidden="true" />Compare all setups</a></Button>
              <Button variant="outline" asChild><a href={routeUrl("deployments", { model: model.id })}>{configurations.length} configurations<ArrowRight aria-hidden="true" /></a></Button>
            </>
          }
        />
        <dl className="mt-3 flex flex-wrap gap-1.5 text-xs" data-testid="model-chips">
          {chips.map(([label, value, title]) => {
            const pill = (
              <div className={cn("bg-card inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2.5", title && "cursor-help")} tabIndex={title ? 0 : undefined}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="max-w-[24ch] truncate font-medium">{value}</dd>
              </div>
            );
            return title ? (
              <Tooltip key={label}>
                <TooltipTrigger asChild>{pill}</TooltipTrigger>
                <TooltipContent className="max-w-80 text-pretty">{title}</TooltipContent>
              </Tooltip>
            ) : <React.Fragment key={label}>{pill}</React.Fragment>;
          })}
        </dl>
      </div>
      <Tabs value={state.modelTab} onValueChange={(value) => updateView((s) => { s.modelTab = value === "precision" ? "precision" : "overview"; })}>
        <TabsList variant="pill" className="mb-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="precision">Precision</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-3"><ModelOverviewTab model={model} /></TabsContent>
        <TabsContent value="precision" className="pt-3"><PrecisionTab model={model} /></TabsContent>
      </Tabs>
    </div>
  );
}
