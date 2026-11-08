"use client"

import * as React from "react"
import { TrendingDown, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { type NumberFormat } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { RadialGauge } from "@/components/ui/radial-gauge"
import { MetricValue } from "@/components/ui/metric-value"

export interface RingKpiMetric {
  label: string
  value: number
  /** Previous value, shown as "up from" or "down from". */
  previous?: number
  /** Ring fill from 0 to 100. Defaults to value as a share of max. */
  progress?: number
  /** Upper bound used to fill the ring when progress is not given. */
  max?: number
  format?: NumberFormat
  currency?: string
  /** Suffix after the number, e.g. "ms" or "req/s". */
  unit?: string
  /** Treat a decrease as good (latency, errors). */
  invertDelta?: boolean
  /** Slot in the top-right corner, e.g. a menu button. */
  action?: React.ReactNode
  /** Ring color (any CSS color). Defaults to good/critical by direction, else the brand color. */
  color?: string
  /** Line under the value, e.g. what the ring measures ("7 of 8 levels pass"). */
  caption?: React.ReactNode
  /** Text shown instead of the number, e.g. "—" when the value is unavailable. */
  display?: string
  /** Accessible name of the ring, e.g. "86% of the best setup". */
  ringLabel?: string
  testId?: string
}

export interface RingKpiCardProps extends React.ComponentProps<typeof Card> {
  metrics: RingKpiMetric[]
  /** Tile sizing override, e.g. a wider basis so a narrow container lays the tiles out 2 × 2. */
  tileClassName?: string
}

function RingKpiValue({
  metric,
  value,
  className,
}: {
  metric: RingKpiMetric
  value: number
  className?: string
}) {
  return (
    <MetricValue
      value={value}
      format={metric.format}
      currency={metric.currency}
      maximumFractionDigits={metric.format ? undefined : 0}
      // Console rule: full numbers in KPIs (2,882,918, not 2.9M).
      compactFrom={Infinity}
      suffix={metric.unit ? ` ${metric.unit}` : undefined}
      className={className}
    />
  )
}

/** A card with a row of KPI tiles, each with a segmented ring next to the value and a comparison to the previous value. */
function RingKpiCard({ metrics, className, tileClassName, ...props }: RingKpiCardProps) {
  return (
    <Card
      data-slot="ring-kpi-card"
      className={cn("overflow-hidden py-0", className)}
      {...props}
    >
      <CardContent className="px-0">
        {/* Tiles wrap to fit and stretch to fill their row; the gap shows the border color as hairline dividers. */}
        <div className="bg-border flex flex-wrap gap-px">
          {metrics.map((metric) => {
            const direction =
              metric.previous === undefined || metric.previous === metric.value
                ? "flat"
                : metric.value > metric.previous
                  ? "up"
                  : "down"
            const positive =
              direction === "flat" ? null : (direction === "up") !== Boolean(metric.invertDelta)
            const color =
              metric.color ?? (positive === false ? "var(--critical)" : positive === true ? "var(--good)" : "var(--brand)")
            const progress =
              metric.progress ??
              (metric.max ? Math.min(100, Math.max(0, (metric.value / metric.max) * 100)) : 0)
            const Icon = direction === "down" ? TrendingDown : TrendingUp
            return (
              <div
                key={metric.label}
                data-slot="ring-kpi-metric"
                data-testid={metric.testId}
                className={cn("bg-card flex min-w-0 flex-[1_1_9.5rem] flex-col gap-3 p-4", tileClassName)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-2 truncate text-xs font-medium">{metric.label}</span>
                  {metric.action ? <span className="shrink-0">{metric.action}</span> : null}
                </div>
                <div className="flex items-center gap-3">
                  <RadialGauge
                    role="img"
                    aria-label={metric.ringLabel ?? `${Math.round(progress)}%`}
                    value={progress}
                    sweep={360}
                    size={40}
                    thickness={4}
                    color={color}
                  />
                  {metric.display !== undefined ? (
                    <span className="truncate text-xl font-semibold tracking-tight tabular-nums">{metric.display}</span>
                  ) : (
                    <RingKpiValue
                      metric={metric}
                      value={metric.value}
                      className="truncate text-xl font-semibold tracking-tight tabular-nums"
                    />
                  )}
                </div>
                {metric.caption ? <span className="text-muted-foreground -mt-1 text-xs text-pretty">{metric.caption}</span> : null}
                {metric.previous !== undefined ? (
                  <span
                    data-direction={direction}
                    data-positive={positive}
                    className={cn(
                      "text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs",
                      positive === true && "[&_[data-accent]]:text-emerald-600 dark:[&_[data-accent]]:text-emerald-400",
                      positive === false && "[&_[data-accent]]:text-red-600 dark:[&_[data-accent]]:text-red-400"
                    )}
                  >
                    {direction !== "flat" ? (
                      <Icon data-accent="" className="size-3.5" aria-hidden="true" />
                    ) : null}
                    {direction === "flat" ? "unchanged from" : direction === "up" ? "up from" : "down from"}{" "}
                    <RingKpiValue
                      metric={metric}
                      value={metric.previous}
                      data-accent=""
                      className="font-medium"
                    />
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export { RingKpiCard }
