import * as React from "react";
import { ChevronDown, ChevronRight, Columns2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { hasMeasuredLevels, type SetupEntry } from "../../../domain/setups.js";
import type { VariantRow } from "../../../domain/variants.js";
import { appState, navigate, useAppState } from "../../state.js";
import { configLabel, engineVersion, gpusOf, num } from "../../lib/display.js";
import { exportRows } from "../../lib/export.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { Panel } from "./primitives.js";
import { LoadCurve, totalPerGpuCurve } from "./glance.js";
import { StatusBadge } from "./status-badge.js";
import { distinctChips, shapeKey, shapeLabel } from "./tldr-data.js";
import { Bar, cmax, Missing, StandingCell, TIE_NOTE, tpm } from "./tldr-parts.js";

/*
 * TL;DR setups table: one row per setup of one model × GPU shape on the active dataset and SLO, ranked by sustainable
 * tok/min/GPU (highest first), Δ vs best beside it. A measured setup is a variant (configuration × shape × recorded
 * runtime_config, fronted by its best run across engine versions); a catalog configuration without a run there is a
 * planning row listed last. Nothing else sits in a row: selecting one opens the setup sheet (tldr-setup-sheet.tsx)
 * with knobs, runs, latencies, published results, serve command and links. Ranking and Δ: domain/setups.ts.
 */

/** Row title: the knob ("Baseline" when none) plus the chips that tell sibling variants apart. */
export const setupTitle = (row: VariantRow, rows: readonly VariantRow[]): string =>
  [row.deployment.knob ?? "Baseline", ...distinctChips(row, rows)].join(" · ");

/** Engine family and version of the row: the run that fronts it when measured, else the configured build. */
export const versionOf = (row: VariantRow): string => (row.variant && row.deployment.runtimeTag ? row.deployment.runtimeTag : engineVersion(row.deployment));
/**
 * Short version for the table: the release that ran ("v0.33.0" from the run tag "vllm-v0.33.0"; the engine name sits
 * beside it), else the configured build marked as configured.
 */
export function shortVersionOf(row: VariantRow): { text: string; ran: boolean } {
  if (row.variant && row.deployment.runtimeTag) {
    const match = /v\d[\w.]*(?:-[\w.]+)?$/.exec(row.deployment.runtimeTag);
    return { text: match ? match[0] : row.deployment.runtimeTag, ran: true };
  }
  return { text: engineVersion(row.deployment), ran: false };
}
export const engineOf = (row: VariantRow): string => `${row.deployment.runtime} ${versionOf(row)}`;
/** The precision chip is dropped when the export label already starts with it ("FP8", "NVFP4 · NVIDIA"). */
const labelHasPrecision = (row: VariantRow): boolean => row.deployment.exportLabel.split(/[\s·]+/)[0]?.toLowerCase() === row.deployment.precision.toLowerCase();

export function SetupsTable({ entries, rows, modelName, modelId, scope, publishedCount, onOpen }: {
  entries: SetupEntry<VariantRow>[]; rows: VariantRow[]; modelName: string; modelId: string; scope: string;
  publishedCount: (row: VariantRow) => number; onOpen: (key: string) => void;
}) {
  const state = useAppState();
  // Phones: Δ vs best moves under the value (one Δ per row, never two copies in the DOM).
  const narrow = useMediaQuery(NARROW_MD);
  const leader = entries.find((entry) => entry.standing.kind === "best")?.row ?? null;
  const best = leader ? tpm(leader) : null;
  const leaderName = leader ? `${leader.deployment.exportLabel} · ${setupTitle(leader, rows)} · ${leader.deployment.runtime}` : undefined;
  const ranked = entries.filter((entry) => entry.position !== null);
  const measured = entries.filter((entry) => hasMeasuredLevels(entry.row)).length;
  const shapes = new Set(entries.map((entry) => shapeKey(entry.row.deployment)));
  const showShape = shapes.size > 1;
  // Nothing measured on this dataset: the metric columns would be "—" in every row, so they collapse into one column.
  const collapsed = measured === 0;
  // With something measured, setups never run on this dataset fold into one row (shown on demand), so the table
  // leads with what was measured. Nothing measured: every row is a planning row and all stay visible.
  const [showUnmeasured, setShowUnmeasured] = React.useState(false);
  const unmeasured = entries.filter((entry) => entry.standing.kind === "unmeasured");
  const folded = !collapsed && unmeasured.length > 0 && !showUnmeasured;
  const visible = folded ? entries.filter((entry) => entry.standing.kind !== "unmeasured") : entries;
  const columns = collapsed ? 5 : 8;
  // Compare holds configurations: the top three distinct configurations (two variants of one configuration count once).
  const topIds = [...new Set(ranked.map((entry) => entry.row.deployment.id))].slice(0, 3);
  const compareTop = () => {
    appState.selected = [...topIds]; appState.compare = [...topIds];
    navigate("compare", { runs: topIds.join(",") });
  };
  const compareDisabled = topIds.length < 2;
  const compareNote = compareDisabled
    ? `Needs ≥2 measured setups with a sustainable value on ${state.workload}; ${topIds.length} now.`
    : `Top ${topIds.length} configurations by sustainable tok/min/GPU; variants of one configuration count once.`;
  const compareButton = <Button size="sm" variant="outline" onClick={compareTop} disabled={compareDisabled} data-testid="compare-top" aria-describedby="compare-top-note"><Columns2 aria-hidden="true" />Compare top {topIds.length === 2 ? 2 : 3}</Button>;
  return (
    <Panel
      id="setups"
      title={<>Setups <span className="text-muted-foreground font-normal">by sustainable tok/min/GPU, highest first</span></>}
      description={<span className="tabular-nums" data-testid="setups-scope">{scope} · {entries.length} setups · {measured} measured{ranked.length !== measured && measured ? ` (${ranked.length} inside the SLO)` : ""}</span>}
      actions={
        <>
          <Tooltip>
            <TooltipTrigger asChild>{compareDisabled ? <span tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">{compareButton}</span> : compareButton}</TooltipTrigger>
            <TooltipContent className="max-w-64 text-pretty" data-testid="compare-top-tooltip">{compareNote}</TooltipContent>
          </Tooltip>
          <span id="compare-top-note" className="sr-only">{compareNote}</span>
          <Button size="sm" variant="outline" onClick={() => exportRows(entries.map((entry) => entry.row), `tldr-${modelId}`)}><Download aria-hidden="true" />Export</Button>
        </>
      }
      bodyClassName="p-0"
    >
      {entries.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-[13px]">No setup of {modelName} on this GPU shape.</p>
      ) : (
        <div data-testid="setups-table" data-collapsed={collapsed || undefined}>
          <table data-slot="table" className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-9" />
              <col />
              <col className="w-[180px] max-md:hidden" />
              {collapsed ? <col className="w-[132px] max-sm:w-[112px]" /> : (
                <>
                  <col className="w-[104px] max-lg:hidden" />
                  <col className="w-[132px] max-sm:w-[108px]" />
                  <col className="w-[104px] max-md:hidden" />
                  <col className="w-[72px] max-md:hidden" />
                </>
              )}
              <col className="w-8" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right" title="Rank by sustainable tok/min/GPU">#</TableHead>
                <TableHead>Setup</TableHead>
                <TableHead className="max-md:hidden">Engine</TableHead>
                {collapsed ? <TableHead data-testid="metrics-not-measured">Sustainable</TableHead> : (
                  <>
                    <TableHead className="h-auto py-1.5 leading-tight whitespace-normal max-lg:hidden" title="Total tok/s per GPU at each tested concurrency level, lowest to highest">Load curve<span className="text-muted-foreground block font-normal">tok/s/GPU by concurrency</span></TableHead>
                    <TableHead className="h-auto py-1.5 text-right leading-tight whitespace-normal">Sustainable<span className="text-muted-foreground block font-normal">tok/min/GPU</span></TableHead>
                    <TableHead className="max-md:hidden">Δ vs best</TableHead>
                    <TableHead className="text-right max-md:hidden" title="Highest concurrency level meeting the SLO">C_max</TableHead>
                  </>
                )}
                <TableHead><span className="sr-only">Details</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((entry) => {
                const { row } = entry, d = row.deployment;
                const value = tpm(row), c = cmax(row);
                const title = setupTitle(row, rows);
                const published = publishedCount(row);
                // A row click moves focus to the row's button first, so closing the sheet returns focus to this row.
                const open = (event: React.MouseEvent<HTMLElement>) => {
                  const button = event.currentTarget.closest("tr")?.querySelector<HTMLElement>('[data-action="open-setup"]');
                  button?.focus({ preventScroll: true });
                  onOpen(row.key);
                };
                return (
                  <TableRow
                    key={row.key}
                    className="cursor-pointer [&>td]:py-2"
                    onClick={open}
                    data-setup-row={d.configurationId} data-variant-key={row.key} data-standing={entry.standing.kind} data-position={entry.position ?? undefined}
                  >
                    <TableCell className="text-muted-foreground text-right align-top text-xs leading-5 tabular-nums">{entry.position ?? ""}</TableCell>
                    <TableCell className="align-top whitespace-normal">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <button
                          type="button"
                          className="hover:text-link min-w-0 text-left text-[13px] leading-5 font-medium outline-none hover:underline focus-visible:underline"
                          aria-haspopup="dialog"
                          aria-label={`Open setup details: ${configLabel(d)}${title !== (d.knob ?? "Baseline") ? ` (${title})` : ""}`}
                          data-action="open-setup"
                          onClick={(event) => { event.stopPropagation(); open(event); }}
                        >{title}</button>
                        {labelHasPrecision(row) ? null : <Badge variant="mono">{d.precision}</Badge>}
                        {d.status === "candidate" ? null : <StatusBadge deployment={d} />}
                        {published ? <Badge variant="outline" className="border-dashed" title={`${published} published (external) result${published === 1 ? "" : "s"} for this setup; open it to see them`} data-published-count={published}>{published} published</Badge> : null}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs leading-4" title={d.exportHfId}>
                        {d.exportLabel}{showShape ? ` · ${shapeLabel(shapeKey(d))}` : ""}<span className="md:hidden"> · {engineOf(row)}</span>
                      </span>
                    </TableCell>
                    <TableCell className="align-top text-[13px] leading-5 whitespace-normal max-md:hidden">
                      <span className="block truncate" title={shortVersionOf(row).ran ? `Ran ${versionOf(row)}` : `Configured build ${versionOf(row)}; not run on ${state.workload}`} data-engine-version={shortVersionOf(row).ran ? "ran" : "configured"}>
                        <span className="font-medium">{d.runtime}</span>{" "}
                        <span className={cn("font-mono text-[12px]", shortVersionOf(row).ran ? "text-ink-2" : "text-muted-foreground")}>{shortVersionOf(row).text}</span>
                      </span>
                      {row.variant && row.variant.runtimeCount > 1 ? <span className="text-muted-foreground block text-xs leading-4" data-runtime-count={row.variant.runtimeCount}>best of {row.variant.runtimeCount} runtimes</span> : null}
                    </TableCell>
                    {collapsed ? (
                      <TableCell className="align-top"><StandingCell standing={entry.standing} leader={leader} leaderName={leaderName} /></TableCell>
                    ) : (
                      <>
                        <TableCell className="align-top max-lg:hidden">{hasMeasuredLevels(row) ? <LoadCurve points={totalPerGpuCurve(row.capacity, gpusOf(d))} unit="Total tok/s per GPU" cmax={c} highlight={entry.standing.kind === "best"} /> : <Missing />}</TableCell>
                        <TableCell className="text-right align-top">
                          <span className="block text-[13px] leading-5 font-semibold tabular-nums">{value === null ? <Missing /> : num(value)}</span>
                          {hasMeasuredLevels(row) ? <Bar value={value} max={best} best={entry.standing.kind === "best"} className="mt-1 ml-auto w-full max-w-28" /> : null}
                          {narrow ? <span className="mt-1 flex justify-end"><StandingCell standing={entry.standing} leader={leader} leaderName={leaderName} compact /></span> : null}
                        </TableCell>
                        <TableCell className="align-top max-md:hidden">{narrow ? null : <StandingCell standing={entry.standing} leader={leader} leaderName={leaderName} />}</TableCell>
                        <TableCell className="text-right align-top text-[13px] leading-5 tabular-nums max-md:hidden">{c === null ? <Missing /> : num(c)}</TableCell>
                      </>
                    )}
                    <TableCell className="text-muted-foreground px-1 align-top"><ChevronRight className="mt-0.5 size-4" aria-hidden="true" /></TableCell>
                  </TableRow>
                );
              })}
              {!collapsed && unmeasured.length ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns} className="p-0">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground hover:bg-subtle flex w-full items-center gap-2 px-4 py-2 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-expanded={!folded}
                      onClick={() => setShowUnmeasured((value) => !value)}
                      data-testid="setups-unmeasured-toggle" data-count={unmeasured.length}
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", folded && "-rotate-90")} aria-hidden="true" />
                      {folded ? `${unmeasured.length} setup${unmeasured.length === 1 ? "" : "s"} not measured on ${state.workload}` : `Hide ${unmeasured.length} not measured`}
                    </button>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </table>
        </div>
      )}
      <p className={cn("text-muted-foreground border-t px-4 py-2 text-xs text-pretty")} data-testid="setups-caption" data-measured={measured}>
        {measured === 0
          ? <>No measured setup on {state.workload} yet; the ranking appears once runs are imported. </>
          : <>Sustainable = total tok/s at C_max × {num(state.slo.margin, 2)} margin × 60 ÷ GPUs, under the active SLO. Δ vs best = (setup − best) ÷ best. {TIE_NOTE} </>}
        Select a setup for its knobs, runs, latencies, published results and serve command.
      </p>
    </Panel>
  );
}
