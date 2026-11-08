"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface HeatmapRow {
  label: string
  /** One value per column, in column order. Missing entries read as 0. */
  values: number[]
  /** Optional per-column flags for cells with no value (drawn hatched, never as 0). */
  missing?: boolean[]
  /** Local addition: per-column flags for a secondary mark (a centred dot), e.g. "points only, no ladder". */
  marked?: boolean[]
}

/** A cell's position by row and column index. */
export interface HeatmapCell {
  row: number
  column: number
}

export interface HeatmapDatum extends HeatmapCell {
  rowLabel: string
  columnLabel: string
  value: number
}

export interface HeatmapChartProps extends React.ComponentProps<"div"> {
  /** One row per line of the matrix, top to bottom. */
  rows: HeatmapRow[]
  /** Column labels, left to right. Sets the number of columns. */
  columns: string[]
  /** Any CSS color. Cells mix this into `--muted` by value. Defaults to chart-1. */
  color?: string
  /** Value drawn fully saturated. Defaults to the largest value. */
  max?: number
  /** How values map to color. `sqrt` spreads out small values. */
  scale?: "linear" | "sqrt"
  /** Quantize the fill into this many steps instead of a continuous ramp. */
  levels?: number
  /** Cell shape: square cells, or a fixed row height (px) for wide matrices with few columns. */
  cellHeight?: number
  /** Gap between cells in px. Cells themselves stretch to fill the container. */
  gap?: number
  valueFormatter?: (value: number) => string
  /** Label for the value in the tooltip, e.g. "sessions". */
  unit?: string
  showLegend?: boolean
  showRowLabels?: boolean
  showColumnLabels?: boolean
  /** Show every nth column label. Defaults to whatever keeps about 12 labels. */
  columnLabelEvery?: number
  /** Accessible name for a cell. Defaults to the formatted value with its row and column. */
  cellLabel?: (datum: HeatmapDatum) => string
  /** Replace the tooltip body. Return `null` to hide it for that cell. */
  renderTooltip?: (datum: HeatmapDatum) => React.ReactNode
  onCellClick?: (datum: HeatmapDatum) => void
  /**
   * Local addition: full column names shown as each column label's title (labels truncate instead of overlapping;
   * a label containing "\n" wraps onto two lines instead).
   */
  columnTitles?: string[]
  /** Local addition: put each row label on its own line above its cells (narrow screens). */
  rowLabelsAbove?: boolean
  /** Local addition: legend end labels, e.g. ["0", "100"]. Defaults to Less / More. */
  legendLabels?: [string, string]
  /** Local addition: extra legend entries (e.g. the hatched and dot marks), rendered before the ramp. */
  legendExtra?: React.ReactNode
  /** The hovered cell, to control it from outside. */
  activeCell?: HeatmapCell | null
  /** Called when the hovered cell changes, with null when the pointer leaves. */
  onActiveCellChange?: (cell: HeatmapCell | null) => void
}

/** Where a value sits between the muted track (0) and the accent (1). */
function fractionFor(
  value: number,
  max: number,
  scale: "linear" | "sqrt",
  levels?: number
) {
  if (value <= 0 || max <= 0) return 0
  let t = Math.min(1, value / max)
  if (scale === "sqrt") t = Math.sqrt(t)
  if (levels && levels > 1) {
    t = Math.max(1, Math.ceil(t * (levels - 1))) / (levels - 1)
  }
  return t
}

function fillFor(color: string, fraction: number) {
  if (fraction <= 0) return "var(--muted)"
  // Floor the mix so the smallest non-zero values still read against the track. Bench Console: the floor is the
  // theme token --heatmap-floor (12% light, 30% dark, where 12% was indistinguishable from the empty track).
  const f = Math.round(fraction * 1000) / 1000
  return `color-mix(in oklab, ${color} calc(var(--heatmap-floor, 12%) + (100% - var(--heatmap-floor, 12%)) * ${f}), var(--muted))`
}

/**
 * A matrix heatmap with a row per line and a column per label, e.g. weekday by hour.
 * Cells stretch to the container width. Hovering a cell rings it, lights up its row
 * and column labels, and shows its value.
 */
function HeatmapChart({
  rows,
  columns,
  color = "var(--chart-1)",
  max,
  scale = "linear",
  levels,
  cellHeight,
  gap = 4,
  valueFormatter = (value) => formatNumber(value),
  unit,
  showLegend = true,
  showRowLabels = true,
  showColumnLabels = true,
  columnLabelEvery,
  cellLabel,
  renderTooltip,
  onCellClick,
  activeCell,
  onActiveCellChange,
  columnTitles,
  rowLabelsAbove = false,
  legendLabels = ["Less", "More"],
  legendExtra,
  className,
  ...props
}: HeatmapChartProps) {
  const [internal, setInternal] = React.useState<HeatmapCell | null>(null)
  const active = activeCell === undefined ? internal : activeCell
  const setActive = (cell: HeatmapCell | null) => {
    setInternal(cell)
    onActiveCellChange?.(cell)
  }

  const top = React.useMemo(
    () =>
      max ??
      rows.reduce(
        (acc, row) => row.values.reduce((m, v) => Math.max(m, v), acc),
        0
      ),
    [rows, max]
  )

  const every = columnLabelEvery ?? Math.max(1, Math.ceil(columns.length / 12))
  const steps = levels && levels > 1 ? levels : 5
  const swatches = Array.from({ length: steps }, (_, i) =>
    fillFor(color, i / (steps - 1))
  )

  const withUnit = (value: number) =>
    unit ? `${valueFormatter(value)} ${unit}` : valueFormatter(value)

  return (
    <div
      data-slot="heatmap-chart"
      className={cn("flex min-w-0 flex-col gap-2 text-xs", className)}
      {...props}
    >
      <TooltipProvider delayDuration={100} skipDelayDuration={0}>
        <div
          role="group"
          aria-label="Heatmap"
          className="grid min-w-0"
          style={{
            gap,
            gridTemplateColumns: `${showRowLabels && !rowLabelsAbove ? "auto " : ""}repeat(${columns.length}, minmax(0, 1fr))`,
          }}
          onPointerLeave={() => setActive(null)}
        >
          {rows.map((row, r) => (
            <React.Fragment key={r}>
              {showRowLabels ? (
                <div
                  data-slot="heatmap-chart-row-label"
                  data-active={active?.row === r}
                  onPointerEnter={() => setActive(null)}
                  style={rowLabelsAbove ? { gridColumn: "1 / -1" } : undefined}
                  className={cn(
                    "text-muted-foreground data-[active=true]:text-foreground flex items-center pr-1.5 leading-none whitespace-nowrap transition-colors",
                    rowLabelsAbove && "block truncate pt-1.5 pb-0.5 leading-tight"
                  )}
                >
                  {row.label}
                </div>
              ) : null}
              {columns.map((column, c) => {
                const value = row.values[c] ?? 0
                const datum: HeatmapDatum = {
                  row: r,
                  column: c,
                  rowLabel: row.label,
                  columnLabel: column,
                  value,
                }
                const isMissing = row.missing?.[c] === true
                const isMarked = !isMissing && row.marked?.[c] === true
                const isActive = active?.row === r && active?.column === c
                const body = renderTooltip ? (
                  renderTooltip(datum)
                ) : (
                  <>
                    <span className="font-medium tabular-nums">{withUnit(value)}</span>
                    <span className="text-background/70 block">
                      {row.label} · {column}
                    </span>
                  </>
                )

                const cell = (
                  <button
                    type="button"
                    aria-label={cellLabel ? cellLabel(datum) : isMissing ? `Not published, ${row.label} ${column}` : `${withUnit(value)}, ${row.label} ${column}`}
                    data-missing={isMissing || undefined}
                    data-marked={isMarked || undefined}
                    data-slot="heatmap-chart-cell"
                    data-row={r}
                    data-column={c}
                    data-active={isActive}
                    onPointerEnter={() => setActive({ row: r, column: c })}
                    onFocus={() => setActive({ row: r, column: c })}
                    onBlur={(event) => {
                      // Keep the highlight while focus moves between cells so the readout does not flash.
                      const next = event.relatedTarget
                      if (next instanceof HTMLElement && next.dataset.slot === "heatmap-chart-cell") return
                      setActive(null)
                    }}
                    onClick={onCellClick ? () => onCellClick(datum) : undefined}
                    className={cn(
                      "inset-ring-foreground/6 flex w-full items-center justify-center rounded-sm outline-none inset-ring transition-[box-shadow] duration-100",
                      cellHeight === undefined && "aspect-square",
                      "data-[active=true]:inset-ring-foreground/45 data-[active=true]:inset-ring-2",
                      "focus-visible:inset-ring-ring focus-visible:inset-ring-2",
                      onCellClick ? "cursor-pointer" : "cursor-default"
                    )}
                    style={{
                      height: cellHeight,
                      backgroundColor: isMissing ? "transparent" : fillFor(
                        color,
                        fractionFor(value, top, scale, levels)
                      ),
                      backgroundImage: isMissing
                        ? "repeating-linear-gradient(135deg, var(--border-strong) 0 1px, transparent 1px 5px)"
                        : undefined,
                    }}
                  >
                    {isMarked ? <span aria-hidden className="bg-foreground/55 size-1.5 rounded-full" data-slot="heatmap-chart-mark" /> : null}
                  </button>
                )

                if (body === null) {
                  return <React.Fragment key={c}>{cell}</React.Fragment>
                }

                return (
                  <Tooltip key={c}>
                    <TooltipTrigger asChild>{cell}</TooltipTrigger>
                    <TooltipContent sideOffset={4} className="text-left">
                      {body}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </React.Fragment>
          ))}

          {showColumnLabels ? (
            <>
              {showRowLabels && !rowLabelsAbove ? <div aria-hidden /> : null}
              {columns.map((column, c) => (
                <div
                  key={c}
                  data-slot="heatmap-chart-column-label"
                  data-active={active?.column === c}
                  title={columnTitles?.[c]}
                  onPointerEnter={() => setActive(null)}
                  className={cn(
                    "text-muted-foreground data-[active=true]:text-foreground min-w-0 pt-0.5 text-center transition-colors",
                    // Local addition: a label with a line break renders on two lines (narrow columns) instead of truncating.
                    column.includes("\n") ? "leading-tight whitespace-pre-line" : "truncate leading-none whitespace-nowrap"
                  )}
                >
                  {c % every === 0 ? column : ""}
                </div>
              ))}
            </>
          ) : null}
        </div>
      </TooltipProvider>

      {showLegend ? (
        <div className="text-muted-foreground flex flex-wrap items-center justify-end gap-1">
          {legendExtra ? <span className="mr-2 inline-flex flex-wrap items-center gap-x-3 gap-y-1">{legendExtra}</span> : null}
          <span className="mr-0.5 tabular-nums">{legendLabels[0]}</span>
          {swatches.map((fill, index) => (
            <span
              key={index}
              className="inset-ring-foreground/6 size-3 rounded-[3px] inset-ring"
              style={{ backgroundColor: fill }}
            />
          ))}
          <span className="ml-0.5 tabular-nums">{legendLabels[1]}</span>
        </div>
      ) : null}
    </div>
  )
}

export { HeatmapChart }
