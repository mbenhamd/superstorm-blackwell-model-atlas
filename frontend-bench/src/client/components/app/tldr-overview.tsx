import * as React from "react";
import { HeatmapChart, type HeatmapCell, type HeatmapDatum, type HeatmapRow } from "@/components/ui/heatmap-chart";
import { MetricList, type MetricListItem } from "@/components/ui/metric-list";
import type { SetupEntry } from "../../../domain/setups.js";
import type { VariantRow } from "../../../domain/variants.js";
import { num } from "../../lib/display.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { Panel } from "./primitives.js";
import { distinctChips, enginesOf, precisionOf, setupName, specDecodeOf, variantName, type LadderFilter } from "./tldr-data.js";
import { Bar, jumpToVariant, signedPercent, StandingCell, TIE_NOTE, tpm } from "./tldr-parts.js";

/*
 * TL;DR overview row (shown once at least two setups have a sustainable value on the dataset):
 *  - "Winner and gaps": which setup sustains the most, and how far behind are the next ones? A ranked bar list of the
 *    top TOP setups across weights exports (the ladder below groups by export, so its order alone does not show the
 *    overall ranking), each row with its Δ vs best; the full ranking is the ladder ("See all N in the ladder").
 *    Selecting a row scrolls to it in the ladder.
 *  - "Best by export × engine": where does throughput come from? A matrix of weights export × engine (× speculative
 *    decoding) coloured by the best sustainable value in each cell relative to the model's best; hatched cells are
 *    unmeasured or absent. Best-of cells, not matched pairs. Selecting a cell filters the ladder to it.
 * Inputs are measured variant rows only (domain/variants.ts); nothing here computes a metric.
 */

/** Summary length: the winner and the closest gaps; the ladder carries every setup. */
export const TOP = 5;
const deltaText = (entry: SetupEntry<VariantRow>): string =>
  entry.standing.kind === "best" ? "best" : entry.standing.kind === "tie" ? `tie ${signedPercent(entry.standing.fraction)} vs best` : entry.standing.kind === "behind" ? `${signedPercent(entry.standing.fraction)} vs best` : "";

/** Scroll to the setups ladder and move focus to its heading (reduced motion: no smooth scroll). */
function toLadder(): void {
  const target = document.getElementById("setups");
  if (!target) return;
  target.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  const heading = document.getElementById("setups-title");
  heading?.setAttribute("tabindex", "-1");
  heading?.focus({ preventScroll: true });
}

export function WinnerAndGaps({ entries, rows }: { entries: SetupEntry<VariantRow>[]; rows: VariantRow[] }) {
  const narrow = useMediaQuery(NARROW_MD);
  const ranked = entries.filter((entry) => entry.position !== null);
  const leader = ranked[0]?.row ?? null;
  const best = leader ? tpm(leader) : null;
  const shown = ranked.slice(0, TOP);
  const measured = entries.filter((entry) => entry.standing.kind !== "unmeasured").length;
  const items: MetricListItem[] = shown.map((entry) => {
    const { row } = entry, value = tpm(row);
    const name = variantName(row, rows);
    // The knobs that tell sibling variants apart are never truncated: on phones they lead (primary line) and the
    // setup name follows; labels wrap instead of cutting to identical prefixes.
    const knobs = distinctChips(row, rows);
    const setup = setupName(row.deployment);
    return {
      key: row.key,
      wrap: true,
      label: (
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="text-muted-foreground w-4 shrink-0 text-right text-xs tabular-nums">{entry.position}</span>
          {narrow && knobs.length ? (
            <span className="flex min-w-0 flex-col text-[13px] leading-snug" data-rank-name={name}>
              <span className="font-medium" data-rank-knobs>{knobs.join(" · ")}</span>
              <span className="text-muted-foreground text-xs">{setup}</span>
            </span>
          ) : <span className="min-w-0 text-[13px] leading-snug" data-rank-name={name}>{name}</span>}
        </span>
      ),
      detail: (
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 pl-6">
          <Bar value={value} max={best} best={entry.standing.kind === "best"} className="w-20 shrink-0 sm:w-44" />
          <span className="min-w-0 font-mono text-[11px] break-words">{row.deployment.runtimeTag ?? row.deployment.runtime}{row.variant && row.variant.runtimeCount > 1 ? ` · best of ${row.variant.runtimeCount}` : ""}</span>
        </span>
      ),
      value: num(value),
      // Phones: the unit moves to the panel description so the setup name keeps its width.
      unit: narrow ? undefined : "tok/min/GPU",
      adornment: <span className={narrow ? "flex justify-end" : "flex w-[86px] justify-end"}><StandingCell standing={entry.standing} leader={leader} compact plain /></span>,
      onClick: () => jumpToVariant(row.key),
      attrs: { "data-rank-row": row.key, "data-standing": entry.standing.kind, "aria-label": `${entry.position}. ${name}: ${num(value)} tok/min/GPU, ${deltaText(entry)} — show in the ladder` },
    };
  });
  return (
    <Panel
      id="winner"
      title={<>Winner and gaps <span className="text-muted-foreground font-normal">all exports, ranked</span></>}
      description={<span className="tabular-nums">Sustainable tok/min/GPU · top {shown.length} of {ranked.length} setups with a value{measured > ranked.length ? ` · ${measured - ranked.length} measured without a passing level` : ""}</span>}
      bodyClassName="px-4 py-3"
    >
      <div data-testid="winner-gaps">
        <MetricList items={items} />
      </div>
      <p className="text-muted-foreground mt-3 text-xs text-pretty">
        Bars scale to the best; Δ = (setup − best) ÷ best. {TIE_NOTE} Select a row to find it in the ladder.
        {ranked.length > shown.length || entries.length > shown.length ? <>{" "}<a href="#setups" className="text-link hover:underline" data-testid="winner-see-all" onClick={(event) => { event.preventDefault(); toLadder(); }}>See all {entries.length} in the ladder</a></> : null}
      </p>
    </Panel>
  );
}

interface MatrixColumn { key: string; label: string; engine: string; spec: boolean }
interface MatrixCellInfo { rows: VariantRow[]; best: VariantRow | null; entry: SetupEntry<VariantRow> | null }

export function ExportEngineMatrix({ entries, rows, onFilter }: { entries: SetupEntry<VariantRow>[]; rows: VariantRow[]; onFilter: (filter: LadderFilter) => void }) {
  const narrow = useMediaQuery(NARROW_MD);
  const [active, setActive] = React.useState<HeatmapCell | null>(null);
  const standing = new Map(entries.map((entry) => [entry.row.key, entry]));
  const leader = entries.find((entry) => entry.standing.kind === "best")?.row ?? null;
  const bestValue = leader ? tpm(leader) : null;
  const columns: MatrixColumn[] = enginesOf(rows).flatMap((engine) => [false, true]
    .filter((spec) => rows.some((row) => row.deployment.runtime === engine && specDecodeOf(row.deployment) === spec))
    .map((spec) => ({ key: `${engine}|${spec}`, engine, spec, label: spec ? `${engine} · spec` : engine })));
  const exports = [...new Map(rows.map((row) => [row.deployment.artifactId, row])).values()];
  const cells: MatrixCellInfo[][] = exports.map((first) => columns.map((column) => {
    const members = rows.filter((row) => row.deployment.artifactId === first.deployment.artifactId && row.deployment.runtime === column.engine && specDecodeOf(row.deployment) === column.spec);
    const scored = members.filter((row) => tpm(row) !== null).sort((a, b) => (tpm(b) ?? 0) - (tpm(a) ?? 0));
    const best = scored[0] ?? null;
    return { rows: members, best, entry: best ? standing.get(best.key) ?? null : null };
  }));
  const heatRows: HeatmapRow[] = exports.map((first, r) => ({
    label: first.deployment.exportLabel,
    values: cells[r]!.map((cell) => (cell.best ? tpm(cell.best) ?? 0 : 0)),
    missing: cells[r]!.map((cell) => cell.best === null),
  }));
  const describe = (r: number, c: number): string => {
    const cell = cells[r]?.[c], column = columns[c], first = exports[r];
    if (!cell || !column || !first) return "";
    const where = `${first.deployment.exportLabel} × ${column.label}`;
    if (!cell.rows.length) return `${where}: no setup in the catalog`;
    if (!cell.best) {
      const measured = cell.rows.filter((row) => row.variant).length;
      return measured ? `${where}: ${measured} measured, no passing level` : `${where}: not measured (${cell.rows.length} setup${cell.rows.length === 1 ? "" : "s"})`;
    }
    const kind = cell.entry?.standing;
    const delta = kind?.kind === "best" ? "best" : kind && (kind.kind === "tie" || kind.kind === "behind") ? `${kind.kind === "tie" ? "tie " : ""}${signedPercent(kind.fraction)} vs best` : "";
    return `${where}: ${num(tpm(cell.best))} tok/min/GPU (${delta}) · ${variantName(cell.best, rows)} · ${cell.rows.length} setup${cell.rows.length === 1 ? "" : "s"} in cell`;
  };
  const leaderCell = (() => {
    for (let r = 0; r < cells.length; r++) for (let c = 0; c < columns.length; c++) if (leader && cells[r]![c]!.best?.key === leader.key) return { row: r, column: c };
    return null;
  })();
  const readout = active ?? leaderCell;
  const select = (datum: HeatmapDatum) => {
    const column = columns[datum.column], first = exports[datum.row];
    if (!column || !first) return;
    onFilter({ engines: [column.engine], precisions: [precisionOf(first.deployment)], spec: column.spec ? "on" : "off" });
    document.getElementById("setups")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <Panel
      id="export-engine"
      title={<>Best by export × engine <span className="text-muted-foreground font-normal">sustainable tok/min/GPU</span></>}
      description="Each cell is its best setup, not a matched pair; hatched = not measured or no setup"
      bodyClassName="px-4 py-3"
    >
      <div data-testid="export-engine-matrix" data-columns={columns.length} data-rows={exports.length}>
        <HeatmapChart
          rows={heatRows}
          columns={columns.map((column) => column.label)}
          columnTitles={columns.map((column) => `${column.engine}${column.spec ? " with speculative decoding" : " without speculative decoding"}`)}
          max={bestValue ?? undefined}
          cellHeight={30}
          rowLabelsAbove={narrow}
          valueFormatter={(value) => num(value)}
          unit="tok/min/GPU"
          legendLabels={["Lower", "Best"]}
          cellLabel={(datum) => describe(datum.row, datum.column)}
          renderTooltip={(datum) => <span className="block max-w-72 text-pretty">{describe(datum.row, datum.column)}</span>}
          onActiveCellChange={setActive}
          onCellClick={select}
        />
        <p className="mt-2 min-h-8 text-xs text-pretty tabular-nums" data-testid="matrix-readout" aria-live="polite">
          {readout ? describe(readout.row, readout.column) : "—"}
        </p>
      </div>
      <p className="text-muted-foreground text-xs text-pretty">Colour = cell best ÷ model best. Cells compare across engine versions and knobs; for matched engine comparisons open the Engine page. Select a cell to filter the ladder to it.</p>
    </Panel>
  );
}
