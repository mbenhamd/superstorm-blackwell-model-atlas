"use client"

/*
 * dashboardcn composed-chart, edited for Bench Console (see ADR 0005): numeric / log x-axis
 * with explicit ticks, axis titles, per-point pass state (hollow markers for failing levels),
 * ring markers, a hairline crosshair with an x-value tooltip header, and a softer single-series
 * area wash. Points here are not individually focusable; keyboard inspection goes through the
 * Recharts accessibility layer on the chart surface, whose node is stable across renders.
 */

import * as React from "react"
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart as RechartsComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import { yAxisTitleLabel, yAxisWidth } from "@/lib/chart-axis"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"

export interface ComposedSeries {
  /** Key in each data row. */
  key: string
  label: string
  type?: "area" | "line" | "bar"
  /** Any CSS color. Defaults to chart-1 through chart-5 in order. */
  color?: string
  /** Plot against the right axis. */
  axis?: "left" | "right"
  /** Series with the same stackId stack on top of each other. */
  stackId?: string
  /** Bars only: fill with a diagonal hatch instead of a solid color. */
  pattern?: "solid" | "hatched"
  /** Lines and areas only. */
  dashed?: boolean
  curve?: "monotone" | "linear" | "step"
  /** Lines only: draw a dot on every point. */
  dots?: boolean
  /** Mark the highest point of this series with a dot. */
  highlightMax?: boolean
  /** Row key holding a boolean; false draws a hollow marker and flags the tooltip row. */
  passKey?: string
}

export interface MarkerSpec {
  x: number | string
  y: number
  label?: string
  seriesKey?: string
}

export interface ReferenceLineSpec {
  /** Horizontal line at this y value. */
  y?: number
  /** Vertical line at this x value. */
  x?: string | number
  label?: string
  /** Any CSS color. Defaults to the muted foreground. */
  color?: string
  dashed?: boolean
  axis?: "left" | "right"
}

export interface ComposedChartProps
  extends Omit<React.ComponentProps<typeof ChartContainer>, "config" | "children"> {
  data: Record<string, unknown>[]
  /** Key of the x-axis value in each row. */
  xKey: string
  series: ComposedSeries[]
  referenceLines?: ReferenceLineSpec[]
  showGrid?: boolean
  showYAxis?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  xFormatter?: (value: unknown) => string
  yFormatter?: (value: number) => string
  rightYFormatter?: (value: number) => string
  barRadius?: number
  /** Animate series after hydration and when their data changes. Respects reduced motion. */
  animate?: boolean
  animationDuration?: number
  /** "zero" starts the y-axis at 0; "auto" fits it to the data. */
  yDomain?: "zero" | "auto" | [number, number]
  /** Numeric x-axis; "log" spaces powers evenly (e.g. concurrency 1, 2, 4 … 64). */
  xScale?: "category" | "linear" | "log"
  xTicks?: (number | string)[]
  yTicks?: number[]
  xAxisTitle?: string
  yAxisTitle?: string
  tooltipLabelFormatter?: (value: unknown) => string
  markers?: MarkerSpec[]
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches
}

/** The server snapshot disables motion so hydration starts from identical markup. */
function getReducedMotionServerSnapshot() {
  return true
}

function defaultXFormatter(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.split("-").map(Number)
    return new Date(y!, m! - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }
  return String(value)
}

interface ComposedTooltipContentProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  label?: unknown
  xKey: string
  series: ComposedSeries[]
  config: ChartConfig
  formatX: (value: unknown) => string
  formatY: (series: ComposedSeries, value: number) => string
}

/**
 * Crosshair tooltip: the x value as the header (e.g. "8 concurrent requests"), then every series
 * at that x. A series with no observation at that x shows "—", never zero.
 */
function ComposedTooltipContent({ active, payload, label, xKey, series, config, formatX, formatY }: ComposedTooltipContentProps) {
  const row = payload?.find((item) => item.payload)?.payload as Record<string, unknown> | undefined
  if (!active || !row) return null
  const x = row[xKey] ?? label
  return (
    <div className="bg-popover text-popover-foreground shadow-float grid min-w-[12rem] gap-2 rounded-lg border px-3 py-2.5 text-xs">
      <div className="font-medium tabular-nums">{formatX(x)}</div>
      <div className="grid gap-1.5 border-t pt-2">
        {series.map((s) => {
          const raw = row[s.key]
          const value = raw === null || raw === undefined || raw === "" ? Number.NaN : Number(raw)
          const missing = !Number.isFinite(value)
          const failing = !missing && s.passKey ? row[s.passKey] === false : false
          return (
            <div key={s.key} className="flex w-full items-center gap-2">
              <span
                className={s.type === "bar" ? "size-2 shrink-0 rounded-[2px]" : "h-0.5 w-3 shrink-0 rounded-full"}
                style={{ backgroundColor: `var(--color-${s.key})` }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground min-w-0 flex-1 truncate">
                {config[s.key]?.label ?? s.label}
                {failing ? <span className="text-warning-text"> · outside SLO</span> : null}
              </span>
              <span className={missing ? "text-muted-foreground tabular-nums" : "text-foreground font-semibold tabular-nums"}>
                {missing ? "—" : formatY(s, value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ComposedChart({
  data,
  xKey,
  series,
  referenceLines = [],
  showGrid = true,
  showYAxis = false,
  showLegend = false,
  showTooltip = true,
  xFormatter = defaultXFormatter,
  yFormatter,
  rightYFormatter,
  barRadius = 4,
  animate = true,
  animationDuration = 500,
  yDomain = "zero",
  xScale = "category",
  xTicks,
  yTicks,
  xAxisTitle,
  yAxisTitle,
  tooltipLabelFormatter,
  markers = [],
  className,
  ...props
}: ComposedChartProps) {
  const id = React.useId()
  const reducedMotion = React.useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  )
  const config = Object.fromEntries(
    series.map((s, index) => [
      s.key,
      { label: s.label, color: s.color ?? `var(--chart-${(index % 5) + 1})` },
    ])
  ) satisfies ChartConfig
  const hasRightAxis = series.some((s) => s.axis === "right")
  const domain =
    yDomain === "auto" ? (["auto", "auto"] as const) : yDomain === "zero" ? undefined : yDomain

  const maxPoints = series
    .filter((s) => s.highlightMax)
    .map((s) => {
      let best: { x: unknown; y: number } | null = null
      for (const row of data) {
        const y = Number(row[s.key])
        if (Number.isFinite(y) && (!best || y > best.y)) best = { x: row[xKey], y }
      }
      return best ? { ...best, key: s.key, axis: s.axis ?? "left" } : null
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)


  // Pass/fail dots; a marker (e.g. the capacity point) is drawn as a ring on the
  // matching data point so it shares the series' exact scale position.
  const renderPassDot = (s: ComposedSeries, color: string) =>
    (dotProps: { cx?: number; cy?: number; payload?: Record<string, unknown>; index?: number }) => {
      const pass = dotProps.payload?.[s.passKey!] !== false
      if (dotProps.cx === undefined || dotProps.cy === undefined) return <g key={dotProps.index} />
      const marker = markers.find((m) => (m.seriesKey ?? series[0]?.key) === s.key && dotProps.payload?.[xKey] === m.x)
      return (
        <g key={dotProps.index}>
          {marker ? <circle cx={dotProps.cx} cy={dotProps.cy} r={8} fill="none" stroke={color} strokeWidth={1.5} /> : null}
          {marker?.label ? (
            <text x={dotProps.cx} y={dotProps.cy - 14} textAnchor="middle" fill="var(--foreground)" fontSize={11.5} fontWeight={500}>
              {marker.label}
            </text>
          ) : null}
          <circle cx={dotProps.cx} cy={dotProps.cy} r={4} fill={pass ? color : "var(--card)"} stroke={pass ? "var(--card)" : color} strokeWidth={2} />
        </g>
      )
    }

  return (
    <ChartContainer
      data-slot="composed-chart"
      config={config}
      className={cn("aspect-auto h-64 w-full", className)}
      {...props}
    >
      <RechartsComposedChart
        data={data}
        accessibilityLayer
        margin={{ top: yAxisTitle ? 26 : 8, right: hasRightAxis ? 0 : 16, bottom: xAxisTitle ? 18 : 0, left: showYAxis ? 0 : 8 }}
      >
        <defs>
          {series.map((s) => (
            <React.Fragment key={s.key}>
              <linearGradient id={`${id}-fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--color-${s.key})`} stopOpacity={0.05} />
                <stop offset="100%" stopColor={`var(--color-${s.key})`} stopOpacity={0.05} />
              </linearGradient>
              <pattern
                id={`${id}-hatch-${s.key}`}
                patternUnits="userSpaceOnUse"
                width={6}
                height={6}
                patternTransform="rotate(45)"
              >
                <rect width={6} height={6} fill={`var(--color-${s.key})`} fillOpacity={0.15} />
                <rect width={2} height={6} fill={`var(--color-${s.key})`} />
              </pattern>
            </React.Fragment>
          ))}
        </defs>
        {showGrid ? <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="" /> : null}
        <XAxis
          dataKey={xKey}
          type={xScale === "category" ? "category" : "number"}
          scale={xScale === "log" ? "log" : "auto"}
          domain={xScale === "category" ? undefined : ["dataMin", "dataMax"]}
          ticks={xTicks}
          interval={xTicks ? 0 : undefined}
          tickLine={false}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickMargin={8}
          minTickGap={xTicks ? 4 : 32}
          padding={xScale === "category" ? undefined : { left: 10, right: 10 }}
          tickFormatter={xFormatter}
          label={
            xAxisTitle
              ? { value: xAxisTitle, position: "insideBottomRight", offset: -14, className: "fill-muted-foreground text-[11.5px]" }
              : undefined
          }
        />
        <YAxis
          yAxisId="left"
          domain={domain}
          ticks={yTicks}
          hide={!showYAxis}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={yAxisWidth(yTicks, yFormatter)}
          tickFormatter={yFormatter}
          label={yAxisTitleLabel(yAxisTitle)}
        />
        {hasRightAxis ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={domain}
            hide={!showYAxis}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={44}
            tickFormatter={rightYFormatter ?? yFormatter}
          />
        ) : null}
        {showTooltip ? (
          <ChartTooltip
            cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
            isAnimationActive={false}
            content={
              <ComposedTooltipContent
                xKey={xKey}
                series={series}
                config={config}
                formatX={(value) => (tooltipLabelFormatter ?? xFormatter)(value)}
                formatY={(s, value) => {
                  const fmt = s.axis === "right" ? (rightYFormatter ?? yFormatter) : yFormatter
                  return fmt ? fmt(value) : String(value)
                }}
              />
            }
          />
        ) : null}
        {showLegend ? <ChartLegend content={<ChartLegendContent />} /> : null}
        {series.map((s) => {
          const color = `var(--color-${s.key})`
          const common = {
            dataKey: s.key,
            yAxisId: s.axis ?? "left",
            stackId: s.stackId,
            isAnimationActive: animate && !reducedMotion,
            animationDuration,
            animationEasing: "ease-out" as const,
          }
          if (s.type === "bar") {
            return (
              <Bar
                key={s.key}
                {...common}
                fill={s.pattern === "hatched" ? `url(#${id}-hatch-${s.key})` : color}
                stroke={s.pattern === "hatched" ? color : undefined}
                strokeWidth={s.pattern === "hatched" ? 1 : 0}
                radius={s.stackId ? 0 : barRadius}
              />
            )
          }
          if (s.type === "line") {
            return (
              <Line
                key={s.key}
                {...common}
                type={s.curve ?? "monotone"}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "4 4" : undefined}
                dot={
                  s.passKey
                    ? renderPassDot(s, color)
                    : s.dots
                      ? { r: 4, fill: color, stroke: "var(--card)", strokeWidth: 2 }
                      : false
                }
                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
              />
            )
          }
          return (
            <Area
              key={s.key}
              {...common}
              type={s.curve ?? "monotone"}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "4 4" : undefined}
              fill={`url(#${id}-fill-${s.key})`}
              dot={
                s.passKey
                  ? renderPassDot(s, color)
                  : false
              }
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            />
          )
        })}
        {referenceLines.map((line, index) => (
          <ReferenceLine
            key={index}
            y={line.y}
            x={line.x}
            yAxisId={line.axis ?? "left"}
            stroke={line.color ?? "var(--secondary-ink)"}
            strokeWidth={1}
            strokeDasharray={line.dashed === false ? undefined : "4 3"}
            ifOverflow="extendDomain"
            label={
              line.label
                ? {
                    value: line.label,
                    position: line.y !== undefined ? "insideTopLeft" : "insideTopRight",
                    fill: "var(--secondary-ink)",
                    fontSize: 11.5,
                    fontWeight: 500,
                  }
                : undefined
            }
          />
        ))}
        {maxPoints.map((point) => (
          <ReferenceDot
            key={point.key}
            x={point.x as string | number}
            y={point.y}
            yAxisId={point.axis}
            r={4}
            fill={`var(--color-${point.key})`}
            stroke="var(--background)"
            strokeWidth={2}
          />
        ))}
      </RechartsComposedChart>
    </ChartContainer>
  )
}

export { ComposedChart }
