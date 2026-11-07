import * as React from "react";
import { Check, ChevronRight, Columns2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricList, type MetricListItem } from "@/components/ui/metric-list";
import { TickBar } from "@/components/ui/tick-bar";
import { KpiRowCard, type KpiRowMetric } from "@/components/blocks/kpi-row-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { rank, tieBand } from "../../../domain/metrics.js";
import type { Deployment, RankedDeployment } from "../../../domain/types.js";
import { appState, MAX_COMPARE, navigate, routeUrl, update, updateView, useAppState } from "../../state.js";
import { compactNum, configLabel, hardwareShape, isMeasured, num, publisherQuality, runtimeTag, shape, workloadBudget } from "../../lib/display.js";
import { aaHeadline, aaRelease, artifact, artifactsOf, atlasModel, cardBenchmarks, cardRetention, categoryScores, effortLabel, paramsLabel } from "../../lib/atlas.js";
import { openRun } from "./overlays.js";
import { EngineBuild } from "./engine-build.js";
import { InlineBar, LevelsBadge, Panel, Term } from "./primitives.js";
import { ConfigChips, IncompleteBadge, SloVerdictBadge } from "./performance.js";
import { StatusBadge } from "./status-badge.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";

/*
 * TL;DR decision views, scoped to one model family on the active SLO.
 * Unmeasured values read "—" (never 0, never an empty bar) and each panel carries one "Not measured" badge.
 * The ladder is one summary block per export until at least one configuration is measured; then a per-row table (md and up).
 * Ranking key: sustainable total tok/min/GPU (domain/metrics capacity).
 */

export type TldrSort = "sustainable" | "cmax" | "aa" | "name";

const precisionOrder = ["BF16", "FP8", "FP4/FP8", "MXFP4", "NVFP4"];
const gb = (bytes: number | null | undefined) => (bytes ? `${num(bytes / 1e9, bytes >= 1e11 ? 0 : 1)} GB` : "—");
const signed = (value: number) => (Math.abs(value) < 0.005 ? "±0.00" : `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}`);
/** Sign colour only for a change that survives rounding to two decimals. */
const deltaTone = (value: number) => (Math.abs(value) < 0.005 ? "text-ink-2" : value < 0 ? "text-critical-text" : "text-good-text");
const tpm = (row: RankedDeployment | undefined) => row?.capacity.sustainableTpmPerGpu ?? null;
const cmax = (row: RankedDeployment | undefined) => row?.capacity.highestPassingConcurrency ?? null;
const desc = (a: number | null, b: number | null) => (b ?? -Infinity) - (a ?? -Infinity);
const dateOf = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

/** Ranked rows for every dataset under the active SLO, computed once per snapshot/SLO change. */
export function useRowsByWorkload(): Map<string, RankedDeployment[]> {
  const state = useAppState();
  return React.useMemo(
    () => new Map(state.snapshot.workloads.map((workload) => [workload.id, rank(state.snapshot, workload.id, state.slo, publisherQuality)])),
    [state.snapshot, state.snapshot.deployments.length, state.slo, state.slo.prefillTps, state.slo.itlP95Ms, state.slo.margin, state.slo.minSuccessRate],
  );
}

/** Card-reported mean change (export − baseline) for an export's own HF card; null without a baseline column. */
function cardDeltaOf(hfId: string | null | undefined) {
  const card = (cardBenchmarks?.cards ?? []).find((item) => item.hf_id === hfId && item.role !== "base");
  return card ? cardRetention(card) : null;
}

function NotMeasured() {
  return <Badge variant="neutral" data-testid="not-measured-badge" className="border-dashed">Not measured</Badge>;
}

/** Δ of a challenger vs the champion, as a signed % or a ±3% tie (assumed single-run noise). Plain text: it renders in an inverted tooltip. */
function challengerDelta(value: number | null, champion: number | null): string {
  const verdict = tieBand(value, champion);
  if (verdict === null || champion === null || value === null) return "—";
  if (verdict === "tie") return "tie";
  const delta = (value - champion) / champion;
  return `${delta >= 0 ? "+" : "−"}${num(Math.abs(delta) * 100)}%`;
}

/**
 * Champions by workload: one KPI tile per dataset (3×2) for one model family — the best configuration by
 * sustainable tok/min/GPU, its SLO verdict, C_max and per-user speed; up to two challengers and their Δ sit in the
 * tile tooltip. Leaders are never pooled across datasets. Clicking a tile makes that dataset active.
 */
export function ChampionsByWorkload({ modelId }: { modelId: string }) {
  const state = useAppState();
  const byWorkload = useRowsByWorkload();
  const rowsOf = (workloadId: string) => (byWorkload.get(workloadId) ?? []).filter((row) => row.model.id === modelId);
  const anyMeasured = state.snapshot.workloads.some((workload) => rowsOf(workload.id).some((row) => isMeasured(row.deployment)));
  const tiles = state.snapshot.workloads.map((workload) => {
    const measured = rowsOf(workload.id).filter((row) => isMeasured(row.deployment));
    const ranked = measured.filter((row) => tpm(row) !== null);
    const champion = ranked[0];
    const challengers = ranked.slice(1, 3);
    const failing = !champion && measured.length ? measured[0]!.capacity.points.at(-1) : null;
    const verdict = champion?.capacity.selectedPoint ?? failing;
    return {
      key: workload.id,
      label: workload.name,
      value: champion ? num(tpm(champion)) : null,
      unit: "tok/min/GPU",
      adornment: verdict ? <SloVerdictBadge point={verdict} /> : undefined,
      detail: champion ? <ChampionDetail row={champion} /> : <span className="tabular-nums">{measured.length ? `${measured.length} measured · none inside SLO` : workloadBudget(workload)}</span>,
      tooltip: challengers.length ? <Challengers rows={challengers} champion={tpm(champion)} /> : undefined,
      active: workload.id === state.workload,
      onClick: () => updateView((s) => { s.workload = workload.id; s.selected = []; }),
      attrs: { "data-workload-row": workload.id },
      className: tileClass,
    } satisfies KpiRowMetric;
  });
  return (
    <KpiRowCard
      id="champions"
      data-testid="workload-comparison"
      aria-labelledby="champions-title"
      role="region"
      columns={3}
      title={<h2 id="champions-title" className="text-[13px] leading-5 font-semibold">Champions by workload</h2>}
      headerAction={
        <span className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild><Badge variant="outline" tabIndex={0} className="cursor-default">±3% = tie</Badge></TooltipTrigger>
            <TooltipContent className="max-w-64 text-pretty">Challengers within ±3% of the champion read as ties: assumed single-run noise (unverified policy), not a measured interval.</TooltipContent>
          </Tooltip>
          {anyMeasured ? null : <NotMeasured />}
        </span>
      }
      metrics={tiles}
      className={cn(cardClass, !anyMeasured && "border-dashed shadow-none")}
    />
  );
}

/**
 * Tile padding so the hover/selection surface has room (the card content offsets it so text aligns with the header);
 * min-w-0 + wrapping unit so a full 7-digit value fits a phone-width tile.
 */
const tileClass = "min-w-0 [&>div:nth-child(2)>div]:min-w-0 [&>div:nth-child(2)>div>span:first-child]:flex-wrap p-2.5 @3xl:px-2.5 @3xl:[&:nth-child(3n+1)]:pl-2.5 @3xl:[&:nth-child(3n)]:pr-2.5 [&>div:first-child]:font-mono [&>div:first-child]:text-[12.5px] [&>div:first-child>span]:font-sans";
/** Matches the sibling Panels: 16px header with a hairline under it. */
const cardClass = "shadow-panel gap-3 rounded-lg pt-0 pb-3 [&_[data-slot=card-header]]:items-center [&_[data-slot=card-header]]:border-b [&_[data-slot=card-header]]:px-4 [&_[data-slot=card-header]]:py-3 [&_[data-slot=card-content]]:px-1.5";

/** Champion identity (opens its evidence) plus C_max and per-user speed at C_max. */
function ChampionDetail({ row }: { row: RankedDeployment }) {
  const d = row.deployment;
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <button type="button" className="text-foreground block max-w-full truncate text-left text-[13px] hover:underline" title={configLabel(d)} onClick={(event) => { event.stopPropagation(); openRun(d.id); }}>
        {d.exportLabel} · {d.knob ?? "Baseline"} <span className="text-muted-foreground font-mono text-[11px]">{runtimeTag(d)}</span>
      </button>
      <span className="tabular-nums">C_max {num(cmax(row))} · {num(row.capacity.selectedPoint?.outputTpsPerUser, 1)} tok/s/user</span>
    </span>
  );
}

/** Up to two challengers with their Δ vs the champion (tile tooltip). */
function Challengers({ rows, champion }: { rows: RankedDeployment[]; champion: number | null }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="font-medium">Challengers</span>
      {rows.map((row) => (
        <span key={row.deployment.id} className="flex items-center justify-between gap-4">
          <span className="truncate">{row.deployment.runtime} · {row.deployment.exportLabel}{row.deployment.knob ? ` · ${row.deployment.knob}` : ""}</span>
          <span className="tabular-nums">{challengerDelta(tpm(row), champion)}</span>
        </span>
      ))}
    </span>
  );
}

/** Sort comparator for configurations of one family; nulls last, then catalog order (stable sort). */
function ladderCompare(sort: TldrSort) {
  return (a: RankedDeployment, b: RankedDeployment) =>
    sort === "sustainable" ? desc(tpm(a), tpm(b))
      : sort === "cmax" ? desc(cmax(a), cmax(b))
        : sort === "name" ? `${a.deployment.runtime} ${a.deployment.knob ?? ""}`.localeCompare(`${b.deployment.runtime} ${b.deployment.knob ?? ""}`)
          : 0; // AA is model level: identical for every configuration of one family.
}

type LadderGroup = { artifactId: string; rows: RankedDeployment[] };

/**
 * Variant ladder: every configuration of one model family on the active dataset, grouped by weights export (precision,
 * repository, weights, card-reported Δ). Bars scale to the family's best sustainable tok/min/GPU.
 *
 * Density rule: the per-row table appears only when at least one configuration of the family is measured and the
 * viewport is at least md wide. Otherwise each export is one summary block (export, weights, card Δ, "n configs ·
 * engines") whose rows sit in a native <details> as stacked cards — rows stay mounted for tests and find-in-page.
 */
export function VariantLadder({ modelId, sort, title = "Variant ladder" }: { modelId: string; sort: TldrSort; title?: string }) {
  const state = useAppState();
  const byWorkload = useRowsByWorkload();
  const narrow = useMediaQuery(NARROW_MD);
  const model = state.snapshot.models.find((item) => item.id === modelId);
  if (!model) return null;
  const exportIndex = (id: string) => precisionOrder.indexOf(artifact(id)?.precision ?? "");
  const catalogOrder = (a: RankedDeployment, b: RankedDeployment) =>
    exportIndex(a.deployment.artifactId) - exportIndex(b.deployment.artifactId)
    || a.deployment.artifactId.localeCompare(b.deployment.artifactId)
    || a.deployment.runtime.localeCompare(b.deployment.runtime)
    || a.deployment.gpus - b.deployment.gpus
    || (a.deployment.knob ?? "").localeCompare(b.deployment.knob ?? "");
  const rows = (byWorkload.get(state.workload) ?? []).filter((row) => row.model.id === model.id).sort(catalogOrder);
  const groups = rows.reduce<LadderGroup[]>((acc, row) => {
    const group = acc.find((item) => item.artifactId === row.deployment.artifactId);
    if (group) group.rows.push(row); else acc.push({ artifactId: row.deployment.artifactId, rows: [row] });
    return acc;
  }, []);
  const compareRows = ladderCompare(sort);
  for (const group of groups) group.rows.sort(compareRows);
  if (sort === "sustainable" || sort === "cmax") groups.sort((a, b) => compareRows(a.rows[0]!, b.rows[0]!));
  const best = Math.max(0, ...rows.map((row) => tpm(row) ?? 0));
  const anyMeasured = rows.some((row) => isMeasured(row.deployment));
  const runtimes = runtimesOf(rows);
  const aa = aaHeadline(model.id);
  const selected = new Set(state.selected);
  const toggle = (id: string) => update((s) => { s.selected = s.selected.includes(id) ? s.selected.filter((item) => item !== id) : s.selected.length >= MAX_COMPARE ? s.selected : [...s.selected, id]; });
  const compareTop = () => {
    // Top three by sustainable throughput; without measurements, one per export × runtime so the set spans variants.
    const pick = [...rows].sort((a, b) => desc(tpm(a), tpm(b)) || Number(b.deployment.status === "candidate") - Number(a.deployment.status === "candidate"));
    const seen = new Set<string>(), ids: string[] = [];
    const limit = anyMeasured ? 3 : MAX_COMPARE;
    for (const row of pick) { const key = `${row.deployment.artifactId}|${row.deployment.runtime}`; if (anyMeasured || !seen.has(key)) { if (ids.length < limit) { seen.add(key); ids.push(row.deployment.id); } } }
    for (const row of pick) if (ids.length < limit && !ids.includes(row.deployment.id)) ids.push(row.deployment.id);
    appState.selected = [...ids]; appState.compare = [...ids];
    navigate("compare", { runs: ids.join(",") });
  };
  const compareButton = (d: Deployment) => {
    const inCompare = selected.has(d.id);
    return (
      <Button
        size="icon"
        variant="ghost"
        className="size-7 shrink-0"
        aria-label={inCompare ? `Remove ${configLabel(d)} from compare` : `Add ${configLabel(d)} to compare`}
        aria-pressed={inCompare}
        disabled={!inCompare && selected.size >= MAX_COMPARE}
        onClick={(event) => { event.stopPropagation(); toggle(d.id); }}
      >
        {inCompare ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
      </Button>
    );
  };
  const table = anyMeasured && !narrow;
  return (
    <Panel
      id="variant-ladder"
      title={title}
      actions={
        <span className="flex items-center gap-2">
          {anyMeasured ? null : <NotMeasured />}
          <Button size="sm" variant="outline" onClick={compareTop} disabled={rows.length < 2} data-testid="variant-compare"><Columns2 aria-hidden="true" />{anyMeasured ? "Compare top 3" : "Compare variants"}</Button>
        </span>
      }
      bodyClassName="p-0"
    >
      <p className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 border-b px-4 py-2 text-xs" data-testid="variant-summary">
        <span><span className="text-foreground font-medium tabular-nums">{groups.length}</span> exports</span>
        <span><span className="text-foreground font-medium tabular-nums">{rows.length}</span> configs</span>
        <span className="text-foreground font-medium">{runtimes.join(" · ") || "—"}</span>
        <span className="font-mono">{state.workload}</span>
        <span><Term name="Intelligence">AA (model)</Term> <span className="text-foreground font-medium tabular-nums">{aa ? `${num(aa.index, 1)} · ${effortLabel(aa.variant)}` : "no composite"}</span></span>
      </p>
      {table ? (
        <div className="overflow-x-auto" data-testid="variant-ladder">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Variant</TableHead>
                <TableHead>Runtime</TableHead>
                <TableHead>Config</TableHead>
                <TableHead className="text-right">Sustainable <span className="text-muted-foreground font-normal">tok/min/GPU</span></TableHead>
                <TableHead className="text-right">C_max</TableHead>
                <TableHead>SLO levels</TableHead>
                <TableHead>Latest run</TableHead>
                <TableHead className="w-10"><span className="sr-only">Compare</span></TableHead>
              </TableRow>
            </TableHeader>
            {groups.map((group) => (
              <TableBody key={group.artifactId} data-export-group={group.artifactId}>
                <TableRow className="bg-subtle hover:bg-subtle">
                  <TableCell colSpan={8} className="py-1.5"><ExportSummary group={group} /></TableCell>
                </TableRow>
                {group.rows.map((row) => {
                  const d = row.deployment;
                  const measured = isMeasured(d);
                  return (
                    <TableRow key={d.id} data-variant-row={d.id} className="cursor-pointer" onClick={() => openRun(d.id)}>
                      <TableCell>
                        <span className="flex items-center gap-2 text-[13px] whitespace-nowrap"><OpenRunButton deployment={d} />{d.status === "candidate" ? null : <StatusBadge deployment={d} />}</span>
                        <span className="text-muted-foreground block text-xs tabular-nums">{shape(d)} · {hardwareShape(d)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap"><EngineBuild deployment={d} /></TableCell>
                      <TableCell className="max-w-[230px]"><ConfigChips deployment={d} max={2} /></TableCell>
                      <TableCell className="text-right tabular-nums">
                        {measured && tpm(row) !== null ? <InlineBar value={tpm(row)} max={best}>{num(tpm(row))}</InlineBar> : <Missing />}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{measured && cmax(row) !== null ? num(cmax(row)) : <Missing />}</TableCell>
                      <TableCell>{measured ? <LevelsBadge capacity={row.capacity} /> : <Missing />}</TableCell>
                      <TableCell className="text-[13px] whitespace-nowrap tabular-nums">{d.measuredAt ? dateOf(d.measuredAt) : <Missing />}<IncompleteBadge count={row.capacity.incomplete} className="mt-0.5 flex w-fit" /></TableCell>
                      <TableCell>{compareButton(d)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            ))}
          </Table>
        </div>
      ) : (
        <div className="divide-y" data-testid="variant-ladder" data-collapsed={anyMeasured ? undefined : "true"}>
          {groups.map((group) => {
            const measuredRows = group.rows.filter((row) => isMeasured(row.deployment)).length;
            return (
              <details key={group.artifactId} className="group/export" data-export-group={group.artifactId} open={measuredRows > 0 || undefined}>
                <summary className="hover:bg-subtle flex cursor-pointer list-none items-start gap-2 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden" data-export-toggle={group.artifactId}>
                  <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform group-open/export:rotate-90" aria-hidden="true" />
                  <ExportSummary group={group} stacked />
                </summary>
                <ul className="grid gap-2 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.rows.map((row) => <VariantCard key={row.deployment.id} row={row} action={compareButton(row.deployment)} />)}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

const runtimesOf = (rows: RankedDeployment[]) => [...new Set(rows.map((row) => row.deployment.runtime))].sort((a, b) => (a === "vLLM" ? -1 : b === "vLLM" ? 1 : 0));
const Missing = () => <span className="text-muted-foreground" data-missing="true">—</span>;

function OpenRunButton({ deployment: d }: { deployment: Deployment }) {
  return (
    <button type="button" className="hover:text-link min-w-0 truncate text-left font-medium outline-none focus-visible:underline" data-action="open-run" aria-label={`Open evidence: ${d.knob ?? "Baseline"} · ${d.runtime}`} onClick={(event) => { event.stopPropagation(); openRun(d.id); }}>
      {d.knob ?? "Baseline"}
    </button>
  );
}

/** Export identity for a ladder group: label, repository, ideal weight bytes, card-reported Δ and configuration count. */
function ExportSummary({ group, stacked = false }: { group: LadderGroup; stacked?: boolean }) {
  const exported = artifact(group.artifactId);
  const first = group.rows[0]!.deployment;
  const delta = cardDeltaOf(exported?.hfId);
  const measured = group.rows.filter((row) => isMeasured(row.deployment)).length;
  const count = (
    <span className="tabular-nums">
      {group.rows.length} config{group.rows.length === 1 ? "" : "s"} · {runtimesOf(group.rows).join("/")}{measured ? ` · ${measured} measured` : ""}
    </span>
  );
  const facts = (
    <>
      <span className="tabular-nums" title="Ideal weight bytes (safetensors index)">{gb(exported?.weightBytes)}</span>
      <span title={delta ? `Card Δ vs baseline: ${delta.rows} benchmarks · ${delta.heading} (exporter claim)` : "No card baseline"}>
        {delta ? <span className={cn("font-medium tabular-nums", deltaTone(delta.mean))}>Card Δ {signed(delta.mean)} pts</span> : <span className="text-muted-foreground">No card Δ</span>}
      </span>
    </>
  );
  if (!stacked) {
    return (
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="text-foreground text-[13px] font-medium">{first.exportLabel}</span>
        <span className="text-muted-foreground font-mono text-[11px]">{first.exportHfId}</span>
        {facts}
        <span className="text-muted-foreground ml-auto">{count}</span>
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[13px] font-semibold" title={exported?.precisionDetail}>{first.exportLabel}</span>
        <span className="text-muted-foreground min-w-0 font-mono text-[11px] break-all">{first.exportHfId}</span>
      </span>
      <span className="text-ink-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">{facts}<span className="text-muted-foreground">{count}</span></span>
    </span>
  );
}

/**
 * One configuration as a stacked card (phones, and every family without a measurement): name and status; engine build
 * and shape; the sustainable value or "—"; knob chips on their own wrapping line. Opens the evidence sheet.
 */
function VariantCard({ row, action }: { row: RankedDeployment; action: React.ReactNode }) {
  const d = row.deployment;
  const measured = isMeasured(d);
  const value = measured ? tpm(row) : null;
  return (
    <li data-variant-row={d.id} className="bg-card hover:border-border-strong flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-md border px-3 py-2.5 transition-colors" onClick={() => openRun(d.id)}>
      <span className="flex min-w-0 items-center gap-2 text-[13px]">
        <OpenRunButton deployment={d} />
        <StatusBadge deployment={d} />
        <span className="ml-auto shrink-0 text-right tabular-nums" title={value === null ? (measured ? "No tested level meets the SLO" : "Not measured") : "Sustainable tok/min/GPU"}>
          {value === null ? <Missing /> : <><span className="font-semibold">{num(value)}</span> <span className="text-muted-foreground text-[11px]">tok/min/GPU</span></>}
        </span>
      </span>
      <span className="text-muted-foreground flex min-w-0 items-start justify-between gap-2 text-xs">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <EngineBuild deployment={d} />
          <span className="tabular-nums">{shape(d)} · {hardwareShape(d)}</span>
          {measured ? <LevelsBadge capacity={row.capacity} /> : null}
          <IncompleteBadge count={row.capacity.incomplete} />
        </span>
        {action}
      </span>
      <ConfigChips deployment={d} max={4} />
    </li>
  );
}

const categoryShort: Record<string, string> = { "Knowledge Work": "Work", Coding: "Code", Science: "Sci", General: "Gen" };

/** Model-level AA index as a 0–100 tick bar; without a composite, text (never an empty bar). */
function AaAdornment({ aa, published }: { aa: ReturnType<typeof aaHeadline>; published: number | null }) {
  if (!aa) {
    return (
      <span className="text-muted-foreground text-xs whitespace-nowrap sm:w-36" data-missing="true">
        No composite<span className="max-sm:hidden">{published !== null ? ` · ${published}/10` : ""}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 sm:w-36">
      <span className="text-xs tabular-nums whitespace-nowrap"><span className="text-muted-foreground">AA</span> <span className="font-medium">{num(aa.index, 1)}</span></span>
      <TickBar value={aa.index} max={100} segments={20} className="h-3 w-20 max-sm:hidden" aria-label={`AA index ${num(aa.index, 1)} of 100`} />
    </span>
  );
}

/** Row tooltip: the secondary facts the former table carried in its own columns. */
function GlanceDetail({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <span className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
      {rows.map(([term, value]) => (
        <React.Fragment key={term}>
          <span className="opacity-70">{term}</span>
          <span className="tabular-nums">{value}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * One row per model: best sustainable tok/min/GPU on the active dataset and the published AA index (model level).
 * Try-first configuration, card-reported quantization Δ and the AA category profile sit in the row tooltip.
 * Clicking a row scopes the champions and ladder above to that family.
 */
export function ModelsGlance({ sort, active, onSelect }: { sort: TldrSort; active: string; onSelect: (modelId: string) => void }) {
  const state = useAppState();
  const byWorkload = useRowsByWorkload();
  const ranked = byWorkload.get(state.workload) ?? [];
  const anyMeasured = ranked.some((row) => isMeasured(row.deployment));
  const rows = state.snapshot.models.map((model) => {
    const aa = aaHeadline(model.id);
    const release = aaRelease(model.id);
    const partial = !aa && release ? [...release.variants].sort((a, b) => Object.values(b.components).filter((v) => v !== null).length - Object.values(a.components).filter((v) => v !== null).length)[0] : undefined;
    const published = partial ? Object.values(partial.components).filter((v) => v !== null).length : null;
    const configs = state.snapshot.deployments.filter((d) => d.modelId === model.id && d.id === d.configurationId);
    const baselineTp = atlasModel(model.id)?.baselineTp;
    const first = configs.find((d) => d.status === "candidate" && d.knob === null && d.tensorParallel === baselineTp) ?? configs.find((d) => d.status === "candidate");
    const deltas = artifactsOf(model.id).map((item) => {
      const r = cardDeltaOf(item.hfId);
      return r ? { label: item.label, mean: r.mean, rows: r.rows } : null;
    }).filter((item): item is { label: string; mean: number; rows: number } => item !== null).sort((a, b) => b.mean - a.mean);
    const best = ranked.find((row) => row.model.id === model.id && tpm(row) !== null);
    const precisions = [...new Set(artifactsOf(model.id).map((item) => item.precision))];
    return { model, aa, published, configs, first, delta: deltas[0], best, precisions };
  }).sort((a, b) =>
    sort === "name" ? a.model.name.localeCompare(b.model.name)
      : (sort === "sustainable" ? desc(tpm(a.best), tpm(b.best)) : sort === "cmax" ? desc(cmax(a.best), cmax(b.best)) : 0)
        || (b.aa?.index ?? -1) - (a.aa?.index ?? -1));
  const items = rows.map(({ model, aa, published, configs, first, delta, best, precisions }): MetricListItem => {
    const scores = aa ? categoryScores(aa.variant as { components: Record<string, number | null> }) : [];
    const candidates = configs.filter((d) => d.status === "candidate").length;
    const facts: [string, React.ReactNode][] = [
      ["Try first", first ? `${first.runtime} · ${first.exportLabel} · ${shape(first)}` : "No candidate"],
      ["Candidates", `${candidates} of ${configs.length}`],
      ["Card Δ", delta ? `${signed(delta.mean)} pts · ${delta.label} · ${delta.rows} benchmarks (exporter claim)` : "—"],
      ["Best", best ? `${num(tpm(best))} tok/min/GPU · ${best.deployment.runtime} · ${best.deployment.exportLabel}` : "—"],
      ["AA (model)", aa ? `${num(aa.index, 1)} of 100 · ${effortLabel(aa.variant)}` : published !== null ? `No composite · ${published} of 10 components` : "No composite"],
      ...(scores.length ? [["Profile", scores.map((item) => `${categoryShort[item.category] ?? item.category} ${item.score === null ? "—" : num(item.score, 0)}`).join(" · ")] as [string, React.ReactNode]] : []),
    ];
    return {
      key: model.id,
      label: <a href={routeUrl("models", { model: model.id, tab: "overview" })} className="font-medium outline-none hover:underline focus-visible:underline" onClick={(event) => event.stopPropagation()}>{model.name}</a>,
      detail: `${paramsLabel({ totalParamsB: model.parametersB, activeParamsB: model.activeParamsB })} · ${precisions.join(" · ")}`,
      value: best ? compactNum(tpm(best)) : null,
      unit: "tok/min/GPU",
      adornment: <AaAdornment aa={aa} published={published} />,
      tooltip: <GlanceDetail rows={facts} />,
      active: model.id === active,
      onClick: () => { onSelect(model.id); document.getElementById("champions")?.scrollIntoView({ block: "start", behavior: "smooth" }); },
      attrs: { "data-glance-row": model.id },
    };
  });
  const half = Math.ceil(items.length / 2);
  return (
    <Panel
      id="models-glance"
      title="Models"
      description={<>Best sustainable tok/min/GPU on <span className="font-mono">{state.workload}</span> · <Term name="Intelligence">AA (model)</Term> of 100</>}
      actions={anyMeasured ? null : <NotMeasured />}
    >
      <div className="@container" data-testid="models-glance">
        <div className="grid grid-cols-1 gap-x-10 @4xl:grid-cols-2">
          <MetricList items={items.slice(0, half)} className="min-w-0" />
          <MetricList items={items.slice(half)} className="min-w-0 @max-4xl:border-t" />
        </div>
      </div>
    </Panel>
  );
}
