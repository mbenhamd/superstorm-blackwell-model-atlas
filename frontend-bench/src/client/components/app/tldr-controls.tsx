import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasMeasuredLevels } from "../../../domain/setups.js";
import { updateView, useAppState } from "../../state.js";
import { Combobox, type ComboOption } from "./pickers.js";
import { publisherLabel, rowsFor, shapeKey, shapeLabel, useVariantRowsByWorkload } from "./tldr-data.js";

/*
 * TL;DR control row: model (searchable, grouped by publisher) and GPU shape ("All shapes" allowed). The table is always
 * ranked by sustainable tok/min/GPU. The workload is the top bar's (one source of truth). Controls write the URL
 * (#/tldr?model=…&shape=…).
 * Counts are setups = measured variants plus unmeasured catalog configurations on the active dataset.
 */

const ALL = "all";

export function TldrControls({ modelId }: { modelId: string }) {
  const state = useAppState();
  const byWorkload = useVariantRowsByWorkload();
  const current = byWorkload.get(state.workload) ?? [];
  const modelOptions: ComboOption[] = state.snapshot.models.map((model) => {
    const rows = rowsFor(current, model.id, "");
    const measured = rows.filter(hasMeasuredLevels).length;
    return {
      value: model.id, label: model.name, group: publisherLabel(model.company),
      detail: `${rows.length} setup${rows.length === 1 ? "" : "s"}${measured ? ` · ${measured} measured` : ""}`,
      keywords: [model.id, model.company, model.hfId],
    };
  });
  const modelRows = rowsFor(current, modelId, "");
  const shapes = [...new Set(modelRows.map((row) => shapeKey(row.deployment)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const shape = shapes.includes(state.tldrShape) ? state.tldrShape : "";
  const selectModel = (id: string) => updateView((s) => {
    s.model = id;
    // A shape the new model does not run on would empty the table: fall back to all shapes.
    if (s.tldrShape && !rowsFor(current, id, s.tldrShape).length) s.tldrShape = "";
  });
  const selected = state.snapshot.models.find((model) => model.id === modelId);
  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Setup selection" data-testid="tldr-controls">
      <Combobox
        label="Model"
        testId="tldr-model"
        value={modelId}
        options={modelOptions}
        onChange={selectModel}
        searchPlaceholder="Search models…"
        emptyLabel="No model matches"
        className="h-8 w-full sm:w-[280px]"
        triggerLabel={<><span className="text-muted-foreground">Model</span> <span className="font-medium">{selected?.name ?? "—"}</span></>}
      />
      <Select value={shape || ALL} onValueChange={(value) => updateView((s) => { s.tldrShape = value === ALL ? "" : value; })}>
        <SelectTrigger size="sm" className="h-8 min-w-0 flex-1 sm:w-[200px] sm:flex-none" aria-label="GPU shape" data-testid="tldr-shape">
          <span className="text-muted-foreground max-sm:hidden">GPUs</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value={ALL}>All shapes <span className="text-muted-foreground tabular-nums max-sm:hidden">· {modelRows.length}</span></SelectItem>
          {shapes.map((key) => (
            <SelectItem key={key} value={key}>{shapeLabel(key)} <span className="text-muted-foreground tabular-nums max-sm:hidden">· {modelRows.filter((row) => shapeKey(row.deployment) === key).length}</span></SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** The shape the page applies: the URL's shape when the model runs on it, else all shapes. */
export function useTldrShape(modelId: string): string {
  const state = useAppState();
  const byWorkload = useVariantRowsByWorkload();
  return state.tldrShape && rowsFor(byWorkload.get(state.workload), modelId, state.tldrShape).length ? state.tldrShape : "";
}
