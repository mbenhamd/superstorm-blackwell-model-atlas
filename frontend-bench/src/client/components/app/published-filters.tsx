import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VERSION_CLASSES, VERSION_CLASS_LABELS, type ExternalRecord, type HardwareClass, type VersionClass } from "../../../domain/external.js";
import { useAppState } from "../../state.js";
import { Combobox, FacetedFilter } from "./pickers.js";
import { ENGINE_LABELS, EMPTY_FILTERS, engineLabel, facetCounts, flagLabel, flagOptions, hiddenWeak, isFiltered, type PublishedFilters } from "./published-data.js";

const ALL = "__all";
const ENGINE_ORDER = Object.keys(ENGINE_LABELS);

/**
 * Filters of the Published explorer: model picker, GPU-class chips, faceted selects (engine, version audit, evidence
 * class, flags required / excluded), record kind and the "Show weak records" switch. Counts are per value under the
 * other active filters. No free-text search (the console has none). Below 640px the GPU chips and the facet buttons
 * each sit on one horizontally scrolling row instead of wrapping into four or five rows above the results.
 */
const SCROLL_ROW = "max-sm:w-full max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-1 max-sm:[scrollbar-width:thin] max-sm:[&>*]:shrink-0";
export function PublishedFilterBar({ records, filters, onChange, columns }: {
  records: readonly ExternalRecord[]; filters: PublishedFilters; onChange: (next: PublishedFilters) => void; columns: readonly HardwareClass[];
}) {
  const state = useAppState();
  const set = (patch: Partial<PublishedFilters>) => onChange({ ...filters, ...patch });
  const models = facetCounts(records, filters, "model");
  const hardware = facetCounts(records, filters, "hardware");
  const engines = facetCounts(records, filters, "engines");
  const versions = facetCounts(records, filters, "versions");
  const evidence = facetCounts(records, filters, "evidence");
  const flags = facetCounts(records, filters, "flags");
  const without = facetCounts(records, filters, "without");
  const kinds = facetCounts(records, filters, "kind");
  const weak = hiddenWeak(records, filters);
  const allFlags = flagOptions(records);
  // Two flags can share a short label ("cached input counted in total"); keep option labels unique for the list.
  const flagText = (flag: string) => (allFlags.filter((other) => flagLabel(other) === flagLabel(flag)).length > 1 ? `${flagLabel(flag)} (${flag})` : flagLabel(flag));
  const modelOptions = [
    { value: ALL, label: "All models", meta: [`${[...models.values()].reduce((sum, count) => sum + count, 0)}`] },
    ...state.snapshot.models
      .filter((model) => records.some((record) => record.modelId === model.id))
      .map((model) => ({ value: model.id, label: model.name, group: model.company, meta: [`${models.get(model.id) ?? 0}`], keywords: [model.family, model.company] })),
  ];
  const selectedModel = state.snapshot.models.find((model) => model.id === filters.model);
  const engineValues = [...new Set(records.map((record) => record.audit.engineFamily ?? "not-stated"))].sort((a, b) => (ENGINE_ORDER.indexOf(a) + 1 || 99) - (ENGINE_ORDER.indexOf(b) + 1 || 99));
  const evidenceValues = [...new Set(records.map((record) => record.evidenceClass))].sort((a, b) => (evidence.get(b) ?? 0) - (evidence.get(a) ?? 0) || a.localeCompare(b));
  return (
    <div className="flex flex-col gap-2" role="toolbar" aria-label="Published result filters" data-testid="published-filters">
      <div className="flex flex-wrap items-center gap-2">
        <Combobox
          label="Model"
          testId="published-model"
          value={filters.model || ALL}
          options={modelOptions}
          onChange={(value) => set({ model: value === ALL ? "" : value })}
          searchPlaceholder="Search models…"
          emptyLabel="No model matches"
          className="h-8 w-full sm:w-[260px]"
          triggerLabel={<><span className="text-muted-foreground">Model</span> <span className="font-medium">{selectedModel?.name ?? "All models"}</span></>}
        />
        <ToggleGroup
          type="multiple" variant="outline" size="sm" spacing={1} value={filters.hardware} aria-label="GPU" data-testid="published-hardware"
          className={cn("flex-wrap", SCROLL_ROW)}
          onValueChange={(value: string[]) => set({ hardware: value as HardwareClass[] })}
        >
          {columns.map((value) => (
            <ToggleGroupItem key={value} value={value} className="gap-1 px-2.5" data-hardware-chip={value} aria-label={`${value === "other" ? "Other or unstated GPU" : value}, ${hardware.get(value) ?? 0} records`}>
              {value === "other" ? "Other" : value}<span className="text-muted-foreground tabular-nums">{hardware.get(value) ?? 0}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single" variant="outline" size="sm" value={filters.kind || "all"} aria-label="Record kind" data-testid="published-kind"
          onValueChange={(value: string) => { if (value) set({ kind: value === "all" ? "" : (value as "ladder" | "point") }); }}
        >
          <ToggleGroupItem value="all" className="px-2.5">All</ToggleGroupItem>
          <ToggleGroupItem value="ladder" className="gap-1 px-2.5" data-kind="ladder">Ladders<span className="text-muted-foreground tabular-nums">{kinds.get("ladder") ?? 0}</span></ToggleGroupItem>
          <ToggleGroupItem value="point" className="gap-1 px-2.5" data-kind="point">Points<span className="text-muted-foreground tabular-nums">{kinds.get("point") ?? 0}</span></ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className={cn("flex flex-wrap items-center gap-2", SCROLL_ROW)} data-testid="published-facets">
        <FacetedFilter title="Engine" selected={filters.engines} onChange={(values) => set({ engines: values })}
          options={engineValues.map((value) => ({ value, label: engineLabel(value), count: engines.get(value) ?? 0 }))} />
        <FacetedFilter title="Version audit" selected={filters.versions} onChange={(values) => set({ versions: values as VersionClass[] })}
          options={VERSION_CLASSES.map((value) => ({ value, label: VERSION_CLASS_LABELS[value], count: versions.get(value) ?? 0 }))} />
        <FacetedFilter title="Evidence class" selected={filters.evidence} onChange={(values) => set({ evidence: values })}
          options={evidenceValues.map((value) => ({ value, label: value, count: evidence.get(value) ?? 0 }))} />
        <FacetedFilter title="Has flag" selected={filters.flags} onChange={(values) => set({ flags: values })}
          options={allFlags.map((value) => ({ value, label: flagText(value), count: flags.get(value) ?? 0 }))} />
        <FacetedFilter title="Exclude flag" selected={filters.without} onChange={(values) => set({ without: values })}
          options={allFlags.map((value) => ({ value, label: flagText(value), count: without.get(value) ?? 0 }))} />
        </div>
        <span className="flex items-center gap-2 px-1">
          <Switch id="published-weak" checked={filters.weak} onCheckedChange={(checked) => set({ weak: checked })} data-testid="published-weak" />
          <Label htmlFor="published-weak" className="text-[13px] font-normal">
            Show weak records{filters.weak ? null : <span className="text-muted-foreground tabular-nums" data-testid="published-weak-hidden"> · {weak} hidden</span>}
          </Label>
        </span>
        {isFiltered(filters) ? (
          <Button variant="ghost" size="sm" onClick={() => onChange({ ...EMPTY_FILTERS, weak: filters.weak })} data-testid="published-reset"><X aria-hidden="true" />Reset</Button>
        ) : null}
      </div>
    </div>
  );
}
