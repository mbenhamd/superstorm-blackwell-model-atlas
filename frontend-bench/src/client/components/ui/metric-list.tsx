"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { type NumberFormat } from "@/lib/format"
import { DeltaBadge, getDeltaDirection } from "@/components/ui/delta-badge"
import { Sparkline } from "@/components/ui/sparkline"
import { MetricValue } from "@/components/ui/metric-value"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Local addition: attributes passed through to a row (or group) element — any `data-*` hook plus a few
 * plain HTML attributes. Event handlers and class names are not accepted here; use `onClick` / `className`.
 */
export type RowAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined
  title?: string
  id?: string
  "aria-label"?: string
}

export interface MetricListItem {
  label: React.ReactNode
  /** null renders "—" (missing is never zero). Local addition. */
  value: number | string | null
  /** Local additions: unit after the value, a secondary line under the label, a slot after the value. */
  unit?: React.ReactNode
  detail?: React.ReactNode
  adornment?: React.ReactNode
  maximumFractionDigits?: number
  delta?: number
  trend?: number[]
  format?: NumberFormat
  currency?: string
  invertDelta?: boolean
  icon?: React.ReactNode
  /** React key; required when `label` is not a string. */
  key?: string
  /** Local addition: makes the row a focusable button-like element (Enter/Space activate it). */
  onClick?: (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void
  /** Local addition: selected row; sets aria-current="true" and data-active, and uses the selection surface. */
  active?: boolean
  /** Local addition: tooltip content for the whole row (the row becomes focusable so keyboard users reach it). */
  tooltip?: React.ReactNode
  /** Local addition: `data-*`, title, id and aria-label on the row element. */
  attrs?: RowAttributes
  /** Local addition: extra classes on the row element. */
  className?: string
  /** Local addition: label and detail wrap instead of truncating (labels whose tail tells rows apart). */
  wrap?: boolean
}

/** Local addition: a labelled run of rows. */
export interface MetricListGroup {
  key: string
  heading: React.ReactNode
  /** Muted text after the heading, e.g. a size or count. */
  detail?: React.ReactNode
  /** Right-aligned slot in the heading row. */
  action?: React.ReactNode
  items: MetricListItem[]
  attrs?: RowAttributes
}

export interface MetricListProps extends React.ComponentProps<"div"> {
  /** Flat rows. Ignored when `groups` is given. */
  items?: MetricListItem[]
  /** Local addition: grouped rows, each group under a heading. */
  groups?: MetricListGroup[]
  /** Sparkline variant. */
  variant?: "area" | "line"
  /** Sparkline area fill. */
  fill?: "gradient" | "dots"
  showDivider?: boolean
}

const itemKey = (item: MetricListItem, index: number): string =>
  item.key ?? (typeof item.label === "string" ? item.label : String(index))

function MetricListRow({
  item,
  variant,
  fill,
}: {
  item: MetricListItem
  variant: "area" | "line"
  fill?: "gradient" | "dots"
}) {
  const direction = getDeltaDirection(item.delta)
  const positive =
    direction === "flat" ? null : (direction === "up") !== Boolean(item.invertDelta)
  const color =
    positive === true
      ? "var(--good-text)"
      : positive === false
        ? "var(--critical-text)"
        : "var(--muted-foreground)"
  const interactive = Boolean(item.onClick)
  const row = (
    <div
      {...item.attrs}
      data-slot="metric-list-row"
      data-active={item.active || undefined}
      aria-current={item.active ? "true" : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive || item.tooltip ? 0 : undefined}
      onClick={item.onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.target !== event.currentTarget) return
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                item.onClick?.(event)
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-4 py-2.5 text-sm first:pt-0 last:pb-0",
        (interactive || item.tooltip) && "rounded-md",
        interactive && "hover:bg-muted/60 -mx-2 cursor-pointer px-2 transition-colors duration-150 first:pt-2.5 last:pb-2.5",
        item.active && "bg-selection hover:bg-selection",
        item.className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {item.icon ? (
          <span className="text-muted-foreground shrink-0 [&>svg]:size-4">
            {item.icon}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-col">
          <span className={item.wrap ? "min-w-0 [overflow-wrap:anywhere]" : "truncate"}>{item.label}</span>
          {item.detail ? <span className={cn("text-muted-foreground text-xs", item.wrap ? "min-w-0 [overflow-wrap:anywhere]" : "truncate")}>{item.detail}</span> : null}
        </span>
      </div>
      {item.trend && item.trend.length > 1 ? (
        <Sparkline
          data={item.trend}
          variant={variant}
          fill={fill}
          color={color}
          className="h-6 w-20 shrink-0"
        />
      ) : null}
      <div className="flex min-w-28 shrink-0 items-center justify-end gap-2 tabular-nums">
        <MetricValue
          value={item.value ?? "—"}
          format={item.format}
          currency={item.currency}
          maximumFractionDigits={item.maximumFractionDigits}
          data-missing={item.value === null || undefined}
          className={cn("font-medium", item.value === null && "text-muted-foreground")}
          suffix={item.unit && item.value !== null ? <span className="text-muted-foreground ml-1 text-xs font-normal">{item.unit}</span> : undefined}
        />
        {item.adornment}
        {item.delta !== undefined ? (
          <DeltaBadge
            delta={item.delta}
            invert={item.invertDelta}
            variant="text"
            showIcon={false}
          />
        ) : null}
      </div>
    </div>
  )
  if (!item.tooltip) return row
  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent className="max-w-80 text-left text-pretty">{item.tooltip}</TooltipContent>
    </Tooltip>
  )
}

/** Compact rows of label, sparkline, value, and delta. */
function MetricList({
  items = [],
  groups,
  variant = "line",
  fill,
  showDivider = true,
  className,
  ...props
}: MetricListProps) {
  const rows = (list: MetricListItem[]) =>
    list.map((item, index) => (
      <MetricListRow key={itemKey(item, index)} item={item} variant={variant} fill={fill} />
    ))
  if (groups) {
    return (
      <div data-slot="metric-list" className={cn("flex flex-col gap-4", className)} {...props}>
        {groups.map((group) => (
          <div
            key={group.key}
            {...group.attrs}
            data-slot="metric-list-group"
            role="group"
            aria-label={group.attrs?.["aria-label"] ?? (typeof group.heading === "string" ? group.heading : undefined)}
            className="flex flex-col gap-1.5"
          >
            <div
              data-slot="metric-list-group-heading"
              className="flex items-baseline gap-2 border-b pb-1.5 text-xs"
            >
              <span className="text-foreground font-medium">{group.heading}</span>
              {group.detail ? <span className="text-muted-foreground tabular-nums">{group.detail}</span> : null}
              {group.action ? <span className="ml-auto">{group.action}</span> : null}
            </div>
            <div className={cn("flex flex-col", showDivider && "divide-y")}>{rows(group.items)}</div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div
      data-slot="metric-list"
      className={cn("flex flex-col", showDivider && "divide-y", className)}
      {...props}
    >
      {rows(items)}
    </div>
  )
}

export { MetricList }
