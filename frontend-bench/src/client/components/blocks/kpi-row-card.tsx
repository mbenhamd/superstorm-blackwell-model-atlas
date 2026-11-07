"use client"

import * as React from "react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { type NumberFormat } from "@/lib/format"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DeltaBadge, getDeltaDirection } from "@/components/ui/delta-badge"
import { PeriodTabs, type PeriodOption } from "@/components/ui/period-tabs"
import { Sparkline } from "@/components/ui/sparkline"
import { MetricValue } from "@/components/ui/metric-value"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { RowAttributes } from "@/components/ui/metric-list"

export interface KpiRowMetric {
  label: string
  /** null renders "—" (missing is never zero). Local addition. */
  value: number | string | null
  delta?: number
  /** Short word next to the delta, e.g. "Rising". */
  note?: string
  trend?: number[]
  format?: NumberFormat
  currency?: string
  invertDelta?: boolean
  icon?: React.ReactNode
  /** Local additions: unit after the value, a secondary line under it, and a slot beside the label (e.g. a badge). */
  unit?: React.ReactNode
  detail?: React.ReactNode
  adornment?: React.ReactNode
  maximumFractionDigits?: number
  /** React key; defaults to `label`. Local addition. */
  key?: string
  /** Local addition: makes the tile a focusable button-like element (Enter/Space activate it). */
  onClick?: (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void
  /** Local addition: selected tile; sets aria-current="true" and data-active, and uses the selection surface. */
  active?: boolean
  /** Local addition: tooltip content for the tile (the tile becomes focusable so keyboard users reach it). */
  tooltip?: React.ReactNode
  /** Local addition: `data-*`, title, id and aria-label on the tile element. */
  attrs?: RowAttributes
  /** Local addition: extra classes on the tile element. */
  className?: string
}

export interface KpiRowCardProps extends Omit<React.ComponentProps<typeof Card>, "title"> {
  /** Omit to render the tiles without a header (local addition). */
  title?: React.ReactNode
  description?: string
  metrics: KpiRowMetric[]
  /** Period options for the switcher. Omit to hide it. */
  periods?: PeriodOption[]
  period?: string
  defaultPeriod?: string
  onPeriodChange?: (period: string) => void
  /** Text in the footer, e.g. a summary sentence. */
  footer?: React.ReactNode
  /** Footer link. */
  action?: { label: string; href: string }
  /** Local addition: content in the header's action slot (top right), e.g. a column of policy chips. */
  headerAction?: React.ReactNode
  /** Local addition: tile columns from the @3xl container width (default 4). 3 gives a 3×2 grid for six tiles. */
  columns?: 2 | 3 | 4
}

/** Divider and edge padding resets so wrapped rows start flush and carry no trailing divider. */
const columnClass: Record<2 | 3 | 4, { grid: string; tile: string }> = {
  2: {
    grid: "@3xl:grid-cols-2 @3xl:[&>*:nth-child(2n)]:border-e-0",
    tile: "@3xl:px-6 @3xl:[&:nth-child(2n+1)]:pl-0 @3xl:[&:nth-child(2n)]:pr-0",
  },
  3: {
    grid: "@3xl:grid-cols-3 @3xl:[&>*:nth-child(3n)]:border-e-0",
    tile: "@3xl:px-6 @3xl:[&:nth-child(3n+1)]:pl-0 @3xl:[&:nth-child(3n)]:pr-0",
  },
  4: {
    grid: "@3xl:grid-cols-4",
    tile: "@3xl:px-6 @3xl:first:pl-0 @3xl:last:pr-0",
  },
}

/** A card with a row of KPI tiles, each with a sparkline and delta. */
function KpiRowCard({
  title,
  description,
  metrics,
  periods,
  period,
  defaultPeriod,
  onPeriodChange,
  footer,
  action,
  headerAction,
  columns = 4,
  className,
  ...props
}: KpiRowCardProps) {
  const layout = columnClass[columns]
  return (
    <Card data-slot="kpi-row-card" className={cn("@container/card gap-4", className)} {...props}>
      {title || description || periods || headerAction ? <CardHeader className="@max-sm/card:[grid-template-columns:minmax(0,1fr)]!">
        {title ? <CardTitle>{title}</CardTitle> : null}
        {description ? <CardDescription>{description}</CardDescription> : null}
        {periods ? (
          <CardAction className="@max-sm/card:[grid-area:auto]! @max-sm/card:justify-self-start!">
            <PeriodTabs
              options={periods}
              value={period}
              defaultValue={defaultPeriod ?? periods[0]?.value}
              onValueChange={onPeriodChange}
            />
          </CardAction>
        ) : headerAction ? (
          <CardAction className="@max-sm/card:[grid-area:auto]! @max-sm/card:justify-self-start!">{headerAction}</CardAction>
        ) : null}
      </CardHeader> : null}
      <CardContent>
        <div className="@container">
          <div className={cn("grid grid-cols-2 gap-x-4 gap-y-5 @3xl:gap-6 @3xl:divide-x", layout.grid)}>
            {metrics.map((metric) => {
              const direction = getDeltaDirection(metric.delta)
              const positive =
                direction === "flat"
                  ? null
                  : (direction === "up") !== Boolean(metric.invertDelta)
              const color =
                positive === true
                  ? "var(--good-text)"
                  : positive === false
                    ? "var(--critical-text)"
                    : "var(--muted-foreground)"
              const interactive = Boolean(metric.onClick)
              const tile = (
                <div
                  key={metric.key ?? metric.label}
                  {...metric.attrs}
                  data-slot="kpi-row-metric"
                  data-active={metric.active || undefined}
                  aria-current={metric.active ? "true" : undefined}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive || metric.tooltip ? 0 : undefined}
                  onClick={metric.onClick}
                  onKeyDown={
                    interactive
                      ? (event) => {
                          if (event.target !== event.currentTarget) return
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            metric.onClick?.(event)
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "flex flex-col gap-2",
                    layout.tile,
                    (interactive || metric.tooltip) && "rounded-md",
                    interactive && "hover:bg-muted/60 cursor-pointer transition-colors duration-150",
                    metric.active && "bg-selection hover:bg-selection",
                    metric.className
                  )}
                >
                  <div className="text-muted-foreground flex items-center gap-1.5 text-sm [&>svg]:size-4">
                    {metric.icon}
                    {metric.label}
                    {metric.adornment ? <span className="ml-auto">{metric.adornment}</span> : null}
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-baseline gap-1.5">
                        <MetricValue
                          value={metric.value ?? "—"}
                          format={metric.format}
                          currency={metric.currency}
                          maximumFractionDigits={metric.maximumFractionDigits}
                          data-missing={metric.value === null || undefined}
                          className={cn("text-xl font-semibold tracking-tight @lg:text-2xl", metric.value === null && "text-muted-foreground")}
                        />
                        {metric.unit && metric.value !== null ? <span className="text-muted-foreground text-xs">{metric.unit}</span> : null}
                      </span>
                      {metric.detail ? <span className="text-muted-foreground text-xs">{metric.detail}</span> : null}
                      <span className="flex items-center gap-1.5 text-xs">
                        {metric.delta !== undefined ? (
                          <DeltaBadge
                            delta={metric.delta}
                            invert={metric.invertDelta}
                            variant="soft"
                            showIcon={false}
                          />
                        ) : null}
                        {metric.note ? (
                          <span className="text-muted-foreground">{metric.note}</span>
                        ) : null}
                      </span>
                    </div>
                    {metric.trend && metric.trend.length > 1 ? (
                      <Sparkline
                        data={metric.trend}
                        variant="line"
                        color={color}
                        className="h-9 w-20 shrink-0"
                      />
                    ) : null}
                  </div>
                </div>
              )
              if (!metric.tooltip) return tile
              return (
                <Tooltip key={metric.key ?? metric.label}>
                  <TooltipTrigger asChild>{tile}</TooltipTrigger>
                  <TooltipContent className="max-w-80 text-left text-pretty">{metric.tooltip}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>
      </CardContent>
      {footer || action ? (
        <CardFooter className="text-muted-foreground justify-between gap-4 border-t pt-4 text-xs [.border-t]:pt-4">
          <div>{footer}</div>
          {action ? (
            <a
              href={action.href}
              className="text-foreground inline-flex shrink-0 items-center gap-1 font-medium hover:underline"
            >
              {action.label}
              <ArrowRight className="size-3.5" />
            </a>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  )
}

export { KpiRowCard }
