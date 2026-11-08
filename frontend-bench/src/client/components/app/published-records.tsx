import * as React from "react";
import { ChevronRight, RotateCcw, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableCard } from "@/components/blocks/data-table-card";
import { DataTableColumnHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { displayFlags, hardwareClass, recordDate, type ExternalRecord, type ExternalSource } from "../../../domain/external.js";
import { externalDataset } from "../../lib/external.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { useAppState } from "../../state.js";
import { EmptyState } from "./primitives.js";
import { EngineVersion, ExternalEvidenceBadge, FlagChips, HardwareMark, SourceLink, WeakBadge } from "./published-badges.js";
import { concurrencySpan, engineKey, formatValue, headline, type Headline } from "./published-data.js";
import { PublishedRecordDetail } from "./published-ladder.js";

/*
 * The record list (dashboardcn data-table-card): one row per external record with model, hardware, engine and
 * version audit, the highest published output tok/s/GPU (a source's number at one level, never a sustainable rate;
 * "derived" when the extraction divided by the GPU count), source, date and caveat flags. A row expands in place
 * into its concurrency ladder chart, levels table and facts. Below 768px each row is a stacked card.
 *
 * Layout: `table-layout: fixed` with explicit column widths, so long model/precision text, image tags and load-point
 * annotations wrap inside their column and never widen the table past its card. The expanded detail is sized to the
 * scroll container's visible width (sticky at the left edge), never to the table's scroll width, so its chart, facts
 * and levels table stay in view when the table itself scrolls (below its minimum width).
 */

interface Row { record: ExternalRecord; source: ExternalSource | undefined; model: string; date: string | null; headline: Headline | null }

const dash = <span className="text-muted-foreground" data-missing="true">—</span>;
const right = "flex items-baseline justify-end";
/** Below this width the wide table scrolls inside its card (columns keep readable widths). */
const MIN_TABLE_WIDTH = 1060;

function ExpandButton({ id, expanded, onToggle, label }: { id: string; expanded: boolean; onToggle: () => void; label: string }) {
  return (
    <Button variant="ghost" size="icon-sm" aria-expanded={expanded} aria-controls={`published-detail-${id}`} aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`} data-expand={id}
      onClick={(event) => { event.stopPropagation(); onToggle(); }}>
      <ChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} aria-hidden="true" />
    </Button>
  );
}

function HeadlineCell({ value }: { value: Headline | null }) {
  if (!value) {
    return (
      <Tooltip>
        <TooltipTrigger asChild><span tabIndex={0} className={cn(right, "cursor-help outline-none")} aria-label="No output tok/s/GPU published; expand the row for its metrics">{dash}</span></TooltipTrigger>
        <TooltipContent className="max-w-64 text-pretty">No output tok/s/GPU published; expand the row for the metrics it does publish.</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <span className="flex min-w-0 flex-col items-end gap-0.5 text-right" data-headline={value.value}>
      <span className="font-medium whitespace-nowrap tabular-nums">{formatValue(value.value)}</span>
      <span className="text-muted-foreground flex min-w-0 flex-wrap items-center justify-end gap-1 text-[11px] leading-snug text-pretty tabular-nums [overflow-wrap:anywhere]" data-headline-level>
        {value.level.concurrency !== null ? `@ c${value.level.concurrency}` : value.level.label ?? "one level"}
        {value.metric.derived ? <Badge variant="neutral" className="h-4 px-1 text-[10px]" data-derived="true">derived</Badge> : null}
      </span>
    </span>
  );
}

function RecordName({ row }: { row: Row }) {
  const { record } = row;
  const span = concurrencySpan(record);
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="font-medium">{row.model}</span>
        <Badge variant="neutral" className="shrink-0" data-kind={record.kind}>{record.kind === "ladder" ? `Ladder · ${record.levels.length}` : "Point"}</Badge>
        <WeakBadge record={record} />
      </span>
      <span className="text-muted-foreground text-[11.5px] leading-snug [overflow-wrap:anywhere]">{record.precision}{span ? ` · ${span}` : ""}</span>
    </span>
  );
}

const columnsWide = (toggle: (id: string) => void, expanded: ReadonlySet<string>): DataTableColumnDef<Row>[] => [
  {
    id: "expand", size: 40, enableSorting: false, enableHiding: false,
    header: () => <span className="sr-only">Expand</span>,
    cell: ({ row }) => <ExpandButton id={row.original.record.id} expanded={expanded.has(row.original.record.id)} onToggle={() => toggle(row.original.record.id)} label={`${row.original.model} record`} />,
  },
  {
    // No size: the model column takes the width the fixed columns leave.
    id: "model", accessorFn: (row) => row.model, enableHiding: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Model" />,
    cell: ({ row }) => <RecordName row={row.original} />,
  },
  {
    id: "hardware", size: 100, accessorFn: (row) => `${hardwareClass(row.record.gpuType)} ${String(row.record.gpuCount ?? 0).padStart(3, "0")}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="GPUs" />,
    cell: ({ row }) => <HardwareMark record={row.original.record} />,
  },
  {
    id: "engine", size: 184, accessorFn: (row) => `${engineKey(row.record)} ${row.record.audit.canonical ?? ""}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Engine version" />,
    cell: ({ row }) => <EngineVersion record={row.original.record} />,
  },
  {
    id: "output", size: 140, accessorFn: (row) => row.headline?.value ?? undefined, sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Output tok/s/GPU" align="right" />,
    cell: ({ row }) => <HeadlineCell value={row.original.headline} />,
  },
  {
    id: "source", size: 150, accessorFn: (row) => row.source?.publisher ?? "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <SourceLink source={row.original.source} className="max-w-full" />
        <span className="text-muted-foreground text-[11px] leading-snug text-pretty">{row.original.record.evidenceClass}</span>
      </span>
    ),
  },
  {
    // Sort key: the date, then (same date) records that publish output tok/s/GPU before those that do not.
    id: "date", size: 96, accessorFn: (row) => row.date ? `${row.date}~${row.headline ? 1 : 0}` : undefined, sortUndefined: "last",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Published" />,
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{row.original.date ?? dash}</span>,
  },
  {
    id: "flags", size: 172, accessorFn: (row) => row.record.flags.length, enableSorting: false,
    header: () => <span>Caveats</span>,
    cell: ({ row }) => <FlagChips flags={displayFlags(row.original.record)} max={2} />,
  },
];

const columnsNarrow = (toggle: (id: string) => void, expanded: ReadonlySet<string>): DataTableColumnDef<Row>[] => [
  {
    id: "stacked", accessorFn: (row) => row.headline?.value ?? undefined, sortUndefined: "last", enableHiding: false,
    header: () => <span>Record</span>,
    cell: ({ row }) => {
      const r = row.original;
      return (
        <div className="flex min-w-0 flex-col gap-1.5 py-0.5 whitespace-normal" data-stacked-record={r.record.id}>
          <span className="flex min-w-0 items-start justify-between gap-2">
            <RecordName row={r} />
            <ExpandButton id={r.record.id} expanded={expanded.has(r.record.id)} onToggle={() => toggle(r.record.id)} label={`${r.model} record`} />
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs"><HardwareMark record={r.record} /><EngineVersion record={r.record} /></span>
          <span className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Output tok/s/GPU</span>
            <HeadlineCell value={r.headline} />
          </span>
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-xs"><SourceLink source={r.source} className="max-w-[60%]" /><span className="text-muted-foreground tabular-nums">{r.date ?? "date not stated"}</span></span>
          <FlagChips flags={displayFlags(r.record)} max={3} />
        </div>
      );
    },
  },
];

/**
 * Visible width of the records table's scroll container as `--records-view` on the card, kept current with a
 * ResizeObserver (viewport, sidebar or filter changes); the expanded detail is sized from it.
 */
function useScrollViewWidth(): { ref: (node: HTMLDivElement | null) => void; style: React.CSSProperties } {
  const [width, setWidth] = React.useState<number | null>(null);
  const observer = React.useRef<ResizeObserver | null>(null);
  const ref = React.useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const measure = () => {
      const container = node.querySelector<HTMLElement>("[data-slot=table-container]");
      if (container) setWidth(container.clientWidth);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    const container = node.querySelector<HTMLElement>("[data-slot=table-container]");
    if (container) resize.observe(container);
    observer.current = resize;
    measure();
  }, []);
  return { ref, style: (width === null ? {} : { "--records-view": `${width}px` }) as React.CSSProperties };
}

/** The filtered record list with in-place row expansion. */
export function PublishedRecords({ records, total, onReset, filtered }: { records: readonly ExternalRecord[]; total: number; onReset: () => void; filtered: boolean }) {
  const state = useAppState();
  const data = externalDataset();
  const narrow = useMediaQuery(NARROW_MD);
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(() => new Set());
  const toggle = React.useCallback((id: string) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }), []);
  const name = (id: string) => state.snapshot.models.find((model) => model.id === id)?.name ?? id;
  // Pre-ordered newest first: the default sort (output tok/s/GPU, highest first, records without one last) keeps this
  // order among equal values, so records without the metric follow newest first instead of filling the first page.
  const rows: Row[] = React.useMemo(() => records
    .map((record) => ({ record, source: data.sources[record.sourceId], model: name(record.modelId), date: recordDate(record, data.sources), headline: headline(record) }))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")), [records, data]);
  const columns = React.useMemo(() => (narrow ? columnsNarrow : columnsWide)(toggle, expanded), [narrow, toggle, expanded]);
  const view = useScrollViewWidth();
  return (
    <DataTableCard
      ref={view.ref}
      style={view.style}
      layout="fixed"
      minTableWidth={narrow ? undefined : MIN_TABLE_WIDTH}
      title="Published records"
      description={<>Each row is one published ladder or point as the source states it. Output tok/s/GPU is the highest published level, not a sustainable rate; no SLO is applied. Sorted by it (highest first; records without it last, newest first).</>}
      className="gap-3 rounded-lg py-4 [&_[data-slot=card-header]]:px-4 [&_[data-slot=card-content]]:px-4 [&_[data-slot=card-footer]]:px-4"
      data-testid="published-records"
      columns={columns}
      data={rows}
      key={narrow ? "stacked" : "table"}
      getRowId={(row) => row.record.id}
      initialSorting={[{ id: narrow ? "stacked" : "output", desc: true }]}
      pageSize={20}
      pageSizeOptions={[20, 50, 100]}
      showViewOptions={!narrow}
      density="compact"
      onRowClick={(row) => toggle(row.original.record.id)}
      rowProps={(row) => ({ "data-record-id": row.original.record.id, "data-expanded": expanded.has(row.original.record.id) || undefined } as React.ComponentProps<"tr">)}
      renderRow={(row, element) => (
        <>
          {element}
          {expanded.has(row.original.record.id) ? (
            <tr className="bg-subtle/60 border-b" id={`published-detail-${row.original.record.id}`}>
              <td colSpan={row.getVisibleCells().length} className="px-3 py-2 align-top">
                {/* Sized to the scroll container's visible width and pinned to its left edge: the detail never follows
                    the table's scroll width, so its values stay in view; wide content scrolls inside the detail. */}
                <div className="sticky left-3 min-w-0" style={{ width: "calc(var(--records-view, 100%) - 1.5rem)", maxWidth: "100%" }} data-testid="published-detail-frame">
                  <PublishedRecordDetail record={row.original.record} />
                </div>
              </td>
            </tr>
          ) : null}
        </>
      )}
      emptyMessage={<EmptyState icon={SearchX} title="No published record matches" description="Remove a filter, or turn on “Show weak records”." action={filtered ? <Button variant="outline" onClick={onReset}><RotateCcw aria-hidden="true" />Reset filters</Button> : undefined} className="py-6" />}
      action={
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums" data-testid="published-count" aria-live="polite">{records.length} of {total}</span>
          <ExternalEvidenceBadge />
        </span>
      }
    />
  );
}
