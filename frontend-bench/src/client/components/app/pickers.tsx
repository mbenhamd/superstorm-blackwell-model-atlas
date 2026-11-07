import * as React from "react";
import { Check, ChevronsUpDown, CirclePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import type { Deployment, RankedDeployment } from "../../../domain/types.js";
import { appState } from "../../state.js";
import { configDetail, configName, engineVersion, isMeasured, num, precisionIndex, shape, topology, workloadOf } from "../../lib/display.js";
import { substringFilter } from "../../lib/search.js";

/**
 * `keywords` are searched after the label and value (contiguous substrings, see lib/search.ts); `detail`, `meta`
 * and `group` are display only. `meta` lines render in a right-aligned column that never truncates (counts, values).
 */
export interface ComboOption { value: string; label: string; detail?: string; meta?: string[]; group?: string; disabled?: boolean; keywords?: string[] }

/** Keep the open list's selected item in view: scroll the list (not the page) so the item sits in its middle. */
function centerSelected(list: HTMLElement | null, value: string): void {
  const item = list?.querySelector<HTMLElement>(`[cmdk-item][data-value="${CSS.escape(value)}"]`);
  if (!list || !item) return;
  const listBox = list.getBoundingClientRect(), itemBox = item.getBoundingClientRect();
  list.scrollTop += itemBox.top - listBox.top - (listBox.height - itemBox.height) / 2;
}

/**
 * Searchable single-select: Popover + Command, grouped, type-ahead, check on the selected item. Search is a
 * contiguous substring match on label, value and keywords (label prefix ranks first), not cmdk's fuzzy score.
 * On open the current option is the highlighted item and is scrolled to the middle of the list.
 */
export function Combobox({ label, value, options, onChange, placeholder = "Select…", searchPlaceholder = "Search…", emptyLabel = "No results", className, triggerLabel, testId, align = "start", variant = "outline", wrap = false, contentClassName }: {
  label: string; value: string; options: ComboOption[]; onChange: (value: string) => void; placeholder?: string; searchPlaceholder?: string;
  emptyLabel?: string; className?: string; triggerLabel?: React.ReactNode; testId?: string; align?: "start" | "end";
  /**
   * Local additions: a ghost trigger (breadcrumb switchers); `wrap` lets the trigger label and each option's detail
   * wrap instead of truncating; `contentClassName` sizes the popover (e.g. a wider list for long knob strings).
   */
  variant?: "outline" | "ghost"; wrap?: boolean; contentClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);
  const groups = [...new Set(options.map((option) => option.group ?? ""))];
  const listRef = React.useRef<HTMLDivElement>(null);
  const selectedValue = selected?.value;
  React.useEffect(() => {
    if (!open || !selectedValue) return;
    const frame = requestAnimationFrame(() => centerSelected(listRef.current, selectedValue));
    return () => cancelAnimationFrame(frame);
  }, [open, selectedValue]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} role="combobox" aria-expanded={open} aria-label={label} data-testid={testId} className={cn("min-w-0 justify-between gap-2 px-2.5 font-normal", wrap && "h-auto min-h-8 py-1", className)}>
          <span className={cn(wrap ? "min-w-0 text-left whitespace-normal" : "truncate", !selected && !triggerLabel && "text-muted-foreground")}>
            {triggerLabel ?? (selected ? selected.label : placeholder)}
          </span>
          <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className={cn("w-[max(var(--radix-popover-trigger-width),240px)] p-0", contentClassName)}>
        <Command loop filter={substringFilter} defaultValue={selected?.value}>
          <CommandInput placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
          <CommandList ref={listRef} className="max-h-72">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {groups.map((group, index) => (
              <React.Fragment key={group || "default"}>
                {index > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={group || undefined}>
                  {options.filter((option) => (option.group ?? "") === group).map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label, option.value, ...(option.keywords ?? [])]}
                      disabled={option.disabled}
                      onSelect={() => { onChange(option.value); setOpen(false); }}
                      className="items-start gap-2 py-1.5"
                    >
                      <Check className={cn("mt-0.5 size-3.5 shrink-0", option.value === value ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                      <span className="grid min-w-0 flex-1">
                        <span className="truncate">{option.label}</span>
                        {option.detail ? <span className={cn("text-muted-foreground text-xs", wrap ? "[overflow-wrap:anywhere] whitespace-normal" : "truncate")} data-option-detail="">{option.detail}</span> : null}
                      </span>
                      {option.meta?.length ? (
                        <span className="text-muted-foreground ml-2 flex shrink-0 flex-col items-end text-right text-xs whitespace-nowrap tabular-nums" data-option-meta="">
                          {option.meta.map((line) => <span key={line}>{line}</span>)}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Configuration options grouped by model, with engine and topology as the secondary line. */
export function configOptions(deployments: Deployment[], showWorkload = false): ComboOption[] {
  const models = appState.snapshot.models;
  return [...deployments]
    .sort((a, b) => models.findIndex((m) => m.id === a.modelId) - models.findIndex((m) => m.id === b.modelId) || a.precision.localeCompare(b.precision))
    .map((deployment) => ({
      value: deployment.id,
      label: configName(deployment),
      detail: `${configDetail(deployment)}${showWorkload ? ` · ${workloadOf(deployment.workloadId)?.name ?? deployment.workloadId}` : ""}`,
      group: models.find((m) => m.id === deployment.modelId)?.name ?? deployment.modelId,
      keywords: [deployment.id, deployment.runtime, deployment.hardwareId, deployment.precision, deployment.exportLabel, configDetail(deployment)],
    }));
}

/**
 * Setup options grouped model → weights export ("Qwen 3.8 27B · FP8"), so a quantization is one picker interaction
 * away. Label: knob · engine; detail: configured build, shape, GPUs and, when measured on the active dataset, the
 * sustainable tok/min/GPU ("not measured" otherwise; never 0). Searchable by model, export, precision, engine and id.
 */
export function setupOptions(rows: readonly RankedDeployment[]): ComboOption[] {
  const models = appState.snapshot.models;
  const modelIndex = (id: string) => models.findIndex((m) => m.id === id);
  return [...rows]
    .sort((a, b) => modelIndex(a.deployment.modelId) - modelIndex(b.deployment.modelId)
      || precisionIndex(a.deployment.precision) - precisionIndex(b.deployment.precision)
      || a.deployment.exportLabel.localeCompare(b.deployment.exportLabel)
      || a.deployment.runtime.localeCompare(b.deployment.runtime)
      || a.deployment.gpus - b.deployment.gpus
      || (a.deployment.knob ?? "").localeCompare(b.deployment.knob ?? ""))
    .map(({ deployment: d, model, capacity }) => {
      const value = isMeasured(d) ? capacity.sustainableTpmPerGpu : null;
      const metric = !isMeasured(d) ? "not measured" : value === null ? "measured · none inside SLO" : `${num(value)} tok/min/GPU`;
      return {
        value: d.id,
        label: `${d.knob ?? "Baseline"} · ${d.runtime}`,
        detail: [engineVersion(d), shape(d), topology(d), metric].join(" · "),
        group: `${model.name} · ${d.exportLabel}`,
        keywords: [d.id, model.name, d.exportLabel, d.precision, d.runtime, d.hardwareId, engineVersion(d), shape(d)],
      };
    });
}

/**
 * The data-table faceted-filter pattern: checkbox list with counts. An empty filter has a dashed
 * outline ("add a filter"); once a value is chosen the outline turns solid and the selection
 * shows as badges in the trigger.
 */
export function FacetedFilter({ title, options, selected, onChange }: {
  title: string; options: { value: string; label: string; count: number }[]; selected: string[]; onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("px-2.5", selected.length ? "border-solid" : "border-border-strong border-dashed")} data-filter-state={selected.length ? "active" : "empty"} aria-label={`${title} filter${selected.length ? `, ${selected.length} selected` : ""}`} data-facet={title.toLowerCase()}>
          <CirclePlus className="text-muted-foreground size-3.5" aria-hidden="true" />
          {title}
          {selected.length ? (
            <>
              <Separator orientation="vertical" className="mx-0.5 !h-4" />
              <span className="flex gap-1">
                {selected.length > 2
                  ? <Badge variant="neutral">{selected.length} selected</Badge>
                  : selected.map((value) => <Badge key={value} variant="neutral">{options.find((option) => option.value === value)?.label ?? value}</Badge>)}
              </span>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command loop>
          <CommandInput placeholder={title} aria-label={`Search ${title.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>No results</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem key={option.value} value={option.label} onSelect={() => toggle(option.value)} data-facet-option={option.value} aria-checked={isSelected} role="menuitemcheckbox">
                    <span className={cn("grid size-4 place-items-center rounded-[4px] border", isSelected ? "border-ring bg-ring text-white" : "border-border-strong")} aria-hidden="true">
                      {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="flex-1">{option.label}</span>
                    <span className="text-muted-foreground font-mono text-xs tabular-nums">{option.count}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-center">
                    <X className="size-3.5" aria-hidden="true" /> Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
