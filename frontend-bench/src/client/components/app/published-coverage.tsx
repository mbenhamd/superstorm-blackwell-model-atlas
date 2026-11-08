import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeatmapChart } from "@/components/ui/heatmap-chart";
import { HARDWARE_CLASSES, externalCoverage, hardwareClass, type ExternalRecord, type HardwareClass } from "../../../domain/external.js";
import { NARROW_SM, useMediaQuery } from "../../lib/use-media.js";
import { useAppState } from "../../state.js";
import { Panel } from "./primitives.js";
import { hardwareLabel } from "./published-data.js";

/*
 * Coverage of the external layer: one row per catalog model, one column per GPU class, cell = number of published
 * concurrency ladders (points in the tooltip). Hatched = nothing published for that model × GPU under the other
 * filters; a dot = single points only, no ladder (the cell's fill is then the empty end of the ramp, so the dot keeps
 * it apart from hatched). Rows follow the ladder count. Clicking a cell filters the list to that model and GPU class.
 */

export function PublishedCoverage({ records, columns, selected, onSelect, onClear }: {
  /** Records under every filter except model and hardware. */
  records: readonly ExternalRecord[];
  /** GPU classes present in the whole dataset, in display order (stable columns while filtering). */
  columns: readonly HardwareClass[];
  selected: { model: string; hardware: readonly HardwareClass[] };
  onSelect: (modelId: string, hardware: HardwareClass) => void;
  onClear: () => void;
}) {
  const state = useAppState();
  const narrow = useMediaQuery(NARROW_SM);
  const cells = externalCoverage(records);
  const name = (id: string) => state.snapshot.models.find((model) => model.id === id)?.name ?? id;
  const totals = new Map<string, number>();
  for (const cell of cells) totals.set(cell.modelId, (totals.get(cell.modelId) ?? 0) + cell.ladders);
  const models = [...new Set(cells.map((cell) => cell.modelId))].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0) || name(a).localeCompare(name(b)));
  const cellOf = (modelId: string, hardware: HardwareClass) => cells.find((cell) => cell.modelId === modelId && cell.hardware === hardware);
  const max = Math.max(1, ...cells.map((cell) => cell.ladders));
  const ladders = cells.reduce((sum, cell) => sum + cell.ladders, 0), points = cells.reduce((sum, cell) => sum + cell.points, 0);
  const describe = (row: number, column: number) => {
    const modelId = models[row]!, hardware = columns[column]!, cell = cellOf(modelId, hardware);
    const where = `${name(modelId)} · ${hardwareLabel(hardware)}`;
    if (!cell) return { head: "Nothing published", detail: where };
    if (!cell.ladders) return { head: `Points only: ${cell.points} point${cell.points === 1 ? "" : "s"}, no ladder`, detail: `${where} · select to filter` };
    return { head: `${cell.ladders} ladder${cell.ladders === 1 ? "" : "s"} · ${cell.points} point${cell.points === 1 ? "" : "s"}`, detail: `${where} · select to filter` };
  };
  const active = selected.model && selected.hardware.length === 1 ? { model: selected.model, hardware: selected.hardware[0]! } : null;
  return (
    <Panel
      title="Coverage"
      id="published-coverage"
      description={`Published concurrency ladders per model × GPU · ${ladders} ladders and ${points} points under the other filters · hatched: nothing published · dot: points only, no ladder`}
      actions={active ? (
        <Button variant="outline" size="sm" onClick={onClear} data-testid="published-coverage-clear" aria-label={`Clear the ${name(active.model)} · ${hardwareLabel(active.hardware)} selection`}>
          {name(active.model)} · {hardwareLabel(active.hardware)}<X aria-hidden="true" />
        </Button>
      ) : null}
    >
      {models.length ? (
        <div data-testid="published-coverage" data-models={models.length}>
          <HeatmapChart
            rows={models.map((modelId) => ({
              label: name(modelId),
              values: columns.map((hardware) => cellOf(modelId, hardware)?.ladders ?? 0),
              missing: columns.map((hardware) => !cellOf(modelId, hardware)),
              marked: columns.map((hardware) => { const cell = cellOf(modelId, hardware); return !!cell && cell.ladders === 0 && cell.points > 0; }),
            }))}
            // Phones: two-line ticks ("GB" / "300") so GB300, GB200 and B300 stay distinguishable in narrow columns.
            columns={columns.map((hardware) => (hardware === "other" ? "Other" : narrow ? hardware.replace(/^([A-Z]+)(\d+)$/, "$1\n$2") : hardware))}
            columnTitles={columns.map(hardwareLabel)}
            max={max}
            scale="sqrt"
            cellHeight={narrow ? 20 : 22}
            gap={3}
            rowLabelsAbove={narrow}
            legendLabels={["0", `${max} ladders`]}
            legendExtra={
              <>
                <span className="inline-flex items-center gap-1" data-legend="none"><span aria-hidden className="size-3 rounded-[3px] inset-ring inset-ring-foreground/6" style={{ backgroundImage: "repeating-linear-gradient(135deg, var(--border-strong) 0 1px, transparent 1px 5px)" }} />nothing published</span>
                <span className="inline-flex items-center gap-1" data-legend="points-only"><span aria-hidden className="bg-muted inline-flex size-3 items-center justify-center rounded-[3px]"><span className="bg-foreground/55 size-1.5 rounded-full" /></span>points only</span>
              </>
            }
            cellLabel={(datum) => { const d = describe(datum.row, datum.column); return `${d.head}, ${d.detail}`; }}
            renderTooltip={(datum) => { const d = describe(datum.row, datum.column); return (<><span className="font-medium tabular-nums">{d.head}</span><span className="text-background/70 block">{d.detail}</span></>); }}
            onCellClick={(datum) => { const modelId = models[datum.row]!, hardware = columns[datum.column]!; if (cellOf(modelId, hardware)) onSelect(modelId, hardware); }}
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-[13px]" data-testid="published-coverage-empty">No published record matches the other filters.</p>
      )}
    </Panel>
  );
}

/** GPU classes present in the records, in HARDWARE_CLASSES order. */
export const coverageColumns = (records: readonly ExternalRecord[]): HardwareClass[] =>
  HARDWARE_CLASSES.filter((hardware) => records.some((record) => hardwareClass(record.gpuType) === hardware));

