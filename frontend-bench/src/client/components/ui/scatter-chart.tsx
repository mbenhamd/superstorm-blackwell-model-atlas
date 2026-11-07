"use client"

/*
 * dashboardcn scatter-chart, edited for Bench Console (see ADR 0005):
 * explicit ticks and log x-scale, axis titles, a dashed connecting line per series,
 * selectable / keyboard-focusable points with 24px hit targets, linked highlight,
 * and collision-avoided direct labels for chosen series.
 *
 * Point DOM identity: Recharts keys each scatter symbol layer by an animation id that changes
 * whenever the Scatter re-renders with new props, and that remounts every point. A focused point
 * would then be replaced and focus would fall to <body>. So every prop handed to Recharts is kept
 * referentially stable across hover / selection renders (value-compared data, ticks and domains,
 * cached shape renderers), and per-point state (selection, highlight, handlers) reaches a
 * stable `ScatterPoint` component through context instead of through Scatter props. If Recharts
 * still re-creates a node (resize, new data), the point restores focus by id on mount.
 */
import * as React from "react"
import {
  CartesianGrid,
  Scatter,
  ScatterChart as RechartsScatterChart,
  XAxis,
  YAxis,
  ZAxis,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
} from "recharts"

import { cn } from "@/lib/utils"
import { yAxisTitleLabel, yAxisWidth } from "@/lib/chart-axis"
import { formatNumber } from "@/lib/format"
import { placeLabels } from "@/scale"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"

export interface ScatterSeries {
  /** Stable identifier. Defaults to a slug of the label. */
  key?: string
  label: string
  /** Rows for this series. Each needs the x and y keys, plus the size and name keys when set. */
  data: Record<string, unknown>[]
  /** Any CSS color. Defaults to chart-1 through chart-5 in order. */
  color?: string
  /** Join the points, in data order, with a thin dashed line. */
  line?: boolean
  /** Direct-label this series' points with `labelKey`, avoiding collisions. */
  labels?: boolean
}

export interface ScatterChartProps
  extends Omit<React.ComponentProps<typeof ChartContainer>, "config" | "children"> {
  series: ScatterSeries[]
  /** Key of the x value in each row. */
  xKey: string
  /** Key of the y value in each row. */
  yKey: string
  /** Key of a value that scales each point into a bubble. */
  sizeKey?: string
  /** Key of a per-point label shown as the tooltip title. */
  nameKey?: string
  /** Key of a secondary per-point line in the tooltip and accessible name. */
  detailKey?: string
  /** Key of a stable per-point id, used for selection and linked highlight. */
  idKey?: string
  /** Key of the direct label text for series with `labels`. */
  labelKey?: string
  /** Names for the tooltip rows. Default to the keys. */
  xLabel?: string
  yLabel?: string
  sizeLabel?: string
  /** Axis titles, drawn in sentence case with units. */
  xAxisTitle?: string
  yAxisTitle?: string
  showGrid?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  xFormatter?: (value: number) => string
  yFormatter?: (value: number) => string
  sizeFormatter?: (value: number) => string
  /** Radius of each point in px when sizeKey is not set. */
  dotRadius?: number
  /** Bubble area range in px² when sizeKey is set, smallest to largest. */
  sizeRange?: [number, number]
  /** Recharts domain for the x-axis, e.g. ["auto", "auto"]. Defaults to [0, "auto"]. */
  xDomain?: React.ComponentProps<typeof XAxis>["domain"]
  /** Recharts domain for the y-axis, e.g. ["auto", "auto"]. Defaults to [0, "auto"]. */
  yDomain?: React.ComponentProps<typeof YAxis>["domain"]
  xTicks?: number[]
  yTicks?: number[]
  xScale?: "linear" | "log"
  /** Point id drawn with the selection ring. */
  selectedId?: string
  /** Point id drawn emphasized because something linked to it is hovered. */
  highlightId?: string
  onPointSelect?: (row: Record<string, unknown>) => void
  onPointHover?: (row: Record<string, unknown> | null) => void
  /** Animate points after hydration and when data changes. Respects reduced motion. */
  animate?: boolean
  animationDuration?: number
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

function getReducedMotionServerSnapshot() {
  return true
}

/** Hidden key stamped onto each row so the tooltip can find the point's series. */
const SERIES_KEY = "__scatterSeries"

function slug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

function shallowEqualRecord(a: Record<string, unknown>, b: Record<string, unknown>) {
  if (a === b) return true
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && Object.is(a[key], b[key]))
}

function rowsEqual(a: Record<string, unknown>[], b: Record<string, unknown>[]) {
  return a === b || (a.length === b.length && a.every((row, index) => shallowEqualRecord(row, b[index]!)))
}

function valuesEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
}

function seriesEqual(a: ScatterSeries[], b: ScatterSeries[]) {
  return (
    a === b ||
    (a.length === b.length &&
      a.every((s, index) => {
        const t = b[index]!
        return s.key === t.key && s.label === t.label && s.color === t.color && s.line === t.line && s.labels === t.labels && rowsEqual(s.data, t.data)
      }))
  )
}

/** Returns the previous reference while the new value is equal to it, so memoized Recharts children bail out. */
function useStableValue<T>(value: T, equal: (a: T, b: T) => boolean): T {
  const ref = React.useRef(value)
  if (ref.current !== value && !equal(ref.current, value)) ref.current = value
  return ref.current
}

/** Per-point state shared with every `ScatterPoint` without passing it through Recharts props. */
interface PointContextValue {
  idKey?: string
  nameKey?: string
  detailKey?: string
  xKey: string
  yKey: string
  xLabel?: string
  yLabel?: string
  xFormatter: (value: number) => string
  yFormatter: (value: number) => string
  dotRadius: number
  selectedId?: string
  highlightId?: string
  interactive: boolean
  select: (row: Record<string, unknown>) => void
  hover: (row: Record<string, unknown> | null) => void
  /** Id of the point that holds keyboard focus, kept across node re-creation. */
  focusedId: React.RefObject<string | null>
  /** True while a point is re-focused after its node was re-created. */
  restoring: React.RefObject<boolean>
}

const PointContext = React.createContext<PointContextValue | null>(null)

interface ScatterPointProps {
  cx?: number
  cy?: number
  payload?: Record<string, unknown>
  seriesKey: string
}

/** One selectable, keyboard-focusable point with a 24px hit target. */
function ScatterPoint({ cx, cy, payload, seriesKey }: ScatterPointProps) {
  const ctx = React.useContext(PointContext)
  const ref = React.useRef<SVGGElement>(null)
  const id = ctx?.idKey && payload ? String(payload[ctx.idKey]) : ""

  // If Recharts re-created this node while its predecessor had focus, take focus back.
  React.useLayoutEffect(() => {
    const node = ref.current
    if (!ctx || !node || !id || ctx.focusedId.current !== id) return
    const active = document.activeElement
    if (active && active !== document.body && active.isConnected) return
    ctx.restoring.current = true
    try {
      node.focus({ preventScroll: true })
    } finally {
      ctx.restoring.current = false
    }
    // Mount only: a re-created node is a new mount.
  }, [])

  if (!ctx || cx === undefined || cy === undefined || !payload) return <g />
  const { nameKey, detailKey, xKey, yKey, xLabel, yLabel, xFormatter, yFormatter, dotRadius, interactive } = ctx
  const selected = Boolean(id) && id === ctx.selectedId
  const linked = Boolean(id) && id === ctx.highlightId
  const name = nameKey ? String(payload[nameKey] ?? "") : ""
  const detail = detailKey ? String(payload[detailKey] ?? "") : ""
  const label = `${name}${detail ? `, ${detail}` : ""}. ${yLabel ?? yKey} ${yFormatter(Number(payload[yKey]))}, ${xLabel ?? xKey} ${xFormatter(Number(payload[xKey]))}.`
  const color = `var(--color-${seriesKey})`
  return (
    <g
      ref={ref}
      role={interactive ? "button" : "img"}
      tabIndex={interactive ? 0 : -1}
      aria-label={label}
      aria-pressed={interactive ? selected : undefined}
      data-point-id={id || undefined}
      className="group/point cursor-pointer outline-none"
      onClick={() => ctx.select(payload)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          ctx.select(payload)
        }
      }}
      onFocus={() => {
        ctx.focusedId.current = id || null
        if (!ctx.restoring.current) ctx.hover(payload)
      }}
      onBlur={(event) => {
        const node = event.currentTarget
        // Decide after the commit: a detached node was re-created (focus is restored on the new
        // one), a connected node really lost focus.
        queueMicrotask(() => {
          if (!node.isConnected) return
          if (ctx.focusedId.current === (id || null)) {
            ctx.focusedId.current = null
            ctx.hover(null)
          }
        })
      }}
      onMouseEnter={() => ctx.hover(payload)}
      onMouseLeave={() => ctx.hover(null)}
    >
      {/* 24px hit target, larger than the mark. */}
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      {selected || linked ? (
        <circle cx={cx} cy={cy} r={dotRadius + 6} fill={color} fillOpacity={0.16} />
      ) : null}
      <circle
        cx={cx}
        cy={cy}
        r={selected ? dotRadius + 1.5 : dotRadius}
        fill={color}
        stroke="var(--card)"
        strokeWidth={2}
        className="transition-[r] duration-150 group-hover/point:[r:6px]"
      />
      <circle
        cx={cx}
        cy={cy}
        r={dotRadius + 4}
        fill="none"
        stroke="var(--ring)"
        strokeWidth={2}
        className="opacity-0 group-focus-visible/point:opacity-100"
      />
    </g>
  )
}

interface ScatterTooltipContentProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  config: ChartConfig
  rows: { key: string; label: string; format: (value: number) => string }[]
  nameKey?: string
  detailKey?: string
}

function ScatterTooltipContent({
  active,
  payload,
  config,
  rows,
  nameKey,
  detailKey,
}: ScatterTooltipContentProps) {
  const point = payload?.[0]?.payload as Record<string, unknown> | undefined
  if (!active || !point) return null
  const seriesKey = String(point[SERIES_KEY] ?? "")
  const seriesLabel = config[seriesKey]?.label ?? seriesKey
  const name = nameKey ? point[nameKey] : undefined
  const detail = detailKey ? point[detailKey] : undefined
  const title = name != null ? String(name) : seriesLabel

  return (
    <div className="bg-popover text-popover-foreground shadow-float grid min-w-[12rem] gap-2 rounded-lg border px-3 py-2.5 text-xs">
      <div className="grid gap-0.5">
        <span className="flex items-center gap-2 font-medium">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: `var(--color-${seriesKey})` }}
          />
          {title}
        </span>
        <span className="text-muted-foreground pl-4">
          {detail != null ? String(detail) : null}
          {detail != null && name != null ? " · " : null}
          {name != null ? seriesLabel : null}
        </span>
      </div>
      <div className="grid gap-1 border-t pt-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-6">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold tabular-nums">
              {row.format(Number(point[row.key]))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Shared canvas for measuring label text in the chart's own font. */
let measureContext: CanvasRenderingContext2D | null | undefined
function measureText(text: string, font: string) {
  if (measureContext === undefined) {
    measureContext = document.createElement("canvas").getContext("2d")
  }
  if (!measureContext) return text.length * 6.6
  measureContext.font = font
  return measureContext.measureText(text).width
}

interface LabelLayerProps {
  points: { id: string; x: number; y: number; text: string; priority: number }[]
  obstacles: { x: number; y: number }[]
  xKeyScale: "linear" | "log"
  radius: number
}

/** Direct labels placed in pixel space with collision avoidance; labels that fit nowhere are omitted. */
function LabelLayer({ points, obstacles, radius }: LabelLayerProps) {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  const plot = usePlotArea()
  if (!xScale || !yScale || !plot) return null
  const font = "500 11.5px system-ui, -apple-system, 'Segoe UI', Inter, sans-serif"
  const project = (x: number, y: number) => ({ px: Number(xScale(x)), py: Number(yScale(y)) })
  const markers = obstacles
    .map((o) => project(o.x, o.y))
    .filter((m) => Number.isFinite(m.px) && Number.isFinite(m.py))
    .map((m) => ({ x: m.px, y: m.py, r: radius + 2 }))
  const requests = points
    .map((p) => {
      const { px, py } = project(p.x, p.y)
      return { id: p.id, x: px, y: py, r: radius + 2, width: measureText(p.text, font) + 2, height: 14, priority: p.priority, text: p.text }
    })
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  // The labelled series is drawn as a polyline in x order; labels should not sit on it.
  const line = [...requests].sort((a, b) => a.x - b.x)
  const segments = line.slice(1).map((point, index) => ({ x0: line[index]!.x, y0: line[index]!.y, x1: point.x, y1: point.y }))
  const placed = placeLabels(
    requests,
    markers,
    { x0: plot.x + 2, y0: plot.y + 2, x1: plot.x + plot.width - 2, y1: plot.y + plot.height - 2 },
    5,
    segments,
    // Beyond 24px a label is tied to its marker by a leader; beyond 48px it is omitted.
    { maxOffset: 24, leaderMaxOffset: 48 }
  )
  return (
    <g className="pointer-events-none" aria-hidden="true">
      {placed.map((label) =>
        label.leader ? (
          <line
            key={`leader-${label.id}`}
            x1={label.leader.x0}
            y1={label.leader.y0}
            x2={label.leader.x1}
            y2={label.leader.y1}
            stroke="var(--muted-foreground)"
            strokeOpacity={0.7}
            strokeWidth={1}
            strokeLinecap="round"
          />
        ) : null
      )}
      {placed.map((label) => {
        const text = requests.find((r) => r.id === label.id)?.text ?? ""
        return (
          <text
            key={label.id}
            x={label.anchor === "start" ? label.box.x0 + 1 : label.anchor === "end" ? label.box.x1 - 1 : (label.box.x0 + label.box.x1) / 2}
            y={label.y}
            dominantBaseline="central"
            textAnchor={label.anchor}
            className="fill-foreground"
            style={{ font, paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3, strokeLinejoin: "round" }}
          >
            {text}
          </text>
        )
      })}
    </g>
  )
}

/** A scatter chart on shadcn's chart primitives: correlation dots per series, or bubbles when a size key is set. */
function ScatterChart({
  series,
  xKey,
  yKey,
  sizeKey,
  nameKey,
  detailKey,
  idKey,
  labelKey,
  xLabel,
  yLabel,
  sizeLabel,
  xAxisTitle,
  yAxisTitle,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  showLegend = false,
  showTooltip = true,
  xFormatter = (value) => formatNumber(value, { format: "compact" }),
  yFormatter = (value) => formatNumber(value, { format: "compact" }),
  sizeFormatter = (value) => formatNumber(value, { format: "compact" }),
  dotRadius = 4.5,
  sizeRange = [40, 400],
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  xScale = "linear",
  selectedId,
  highlightId,
  onPointSelect,
  onPointHover,
  animate = true,
  animationDuration = 400,
  className,
  ...props
}: ScatterChartProps) {
  const reducedMotion = React.useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  )
  // Parents usually rebuild series, ticks and formatters on every render; keep the references
  // Recharts sees stable while their values are unchanged (see the header comment).
  const stableSeries = useStableValue(series, seriesEqual)
  const stableXTicks = useStableValue(xTicks, valuesEqual)
  const stableYTicks = useStableValue(yTicks, valuesEqual)
  const stableXDomain = useStableValue(xDomain, valuesEqual)
  const stableYDomain = useStableValue(yDomain, valuesEqual)
  const resolved = React.useMemo(
    () =>
      stableSeries.map((s, index) => {
        const key = s.key ?? slug(s.label)
        return {
          key,
          label: s.label,
          line: s.line ?? false,
          labels: s.labels ?? false,
          color: s.color ?? `var(--chart-${(index % 5) + 1})`,
          data: s.data.map((row) => ({ ...row, [SERIES_KEY]: key }) as Record<string, unknown>),
        }
      }),
    [stableSeries]
  )

  // Latest callbacks, read through stable wrappers.
  const latest = React.useRef({ xFormatter, yFormatter, onPointSelect, onPointHover })
  latest.current = { xFormatter, yFormatter, onPointSelect, onPointHover }
  // A tick formatter only changes identity when its output on the ticks changes.
  const xFormatSignature = (stableXTicks ?? []).map((tick) => xFormatter(tick)).join("|")
  const yFormatSignature = (stableYTicks ?? []).map((tick) => yFormatter(tick)).join("|")
  const xTickFormatter = React.useCallback(
    (value: number) => latest.current.xFormatter(value),
    [xFormatSignature]
  )
  const yTickFormatter = React.useCallback(
    (value: number) => latest.current.yFormatter(value),
    [yFormatSignature]
  )
  const yTitleLabel = React.useMemo(() => yAxisTitleLabel(yAxisTitle), [yAxisTitle])
  const margin = React.useMemo(
    () => ({ top: yAxisTitle ? 26 : 12, right: 16, bottom: xAxisTitle ? 18 : 0, left: showYAxis ? 0 : 8 }),
    [yAxisTitle, xAxisTitle, showYAxis]
  )

  const pointIdOf = React.useCallback(
    (row: Record<string, unknown>) => (idKey ? String(row[idKey]) : `${String(row[xKey])}:${String(row[yKey])}`),
    [idKey, xKey, yKey]
  )
  // Hover and focus both report the hovered point; skip repeats so a re-focus does not re-render the parent.
  const lastHover = React.useRef<string | null>(null)
  const hover = React.useCallback(
    (row: Record<string, unknown> | null) => {
      const next = row ? pointIdOf(row) : null
      if (next === lastHover.current) return
      lastHover.current = next
      latest.current.onPointHover?.(row)
    },
    [pointIdOf]
  )
  const select = React.useCallback((row: Record<string, unknown>) => latest.current.onPointSelect?.(row), [])
  const focusedId = React.useRef<string | null>(null)
  const restoring = React.useRef(false)
  const pointContext: PointContextValue = {
    idKey,
    nameKey,
    detailKey,
    xKey,
    yKey,
    xLabel,
    yLabel,
    xFormatter,
    yFormatter,
    dotRadius,
    selectedId,
    highlightId,
    interactive: Boolean(onPointSelect),
    select,
    hover,
    focusedId,
    restoring,
  }

  // One cached renderer per series: Scatter compares `shape` by identity, and a new function would
  // remount every point. Recharts calls it as a plain function, so the element type stays ScatterPoint.
  const shapes = React.useRef(new Map<string, (shapeProps: unknown) => React.ReactElement>())
  const shapeFor = (seriesKey: string) => {
    let shape = shapes.current.get(seriesKey)
    if (!shape) {
      shape = (shapeProps: unknown) => {
        const { cx, cy, payload } = shapeProps as { cx?: number; cy?: number; payload?: Record<string, unknown> }
        return <ScatterPoint cx={cx} cy={cy} payload={payload} seriesKey={seriesKey} />
      }
      shapes.current.set(seriesKey, shape)
    }
    return shape
  }

  const config = Object.fromEntries(
    resolved.map((s) => [s.key, { label: s.label, color: s.color }])
  ) satisfies ChartConfig
  const rows = [
    { key: yKey, label: yLabel ?? yKey, format: yFormatter },
    { key: xKey, label: xLabel ?? xKey, format: xFormatter },
    ...(sizeKey ? [{ key: sizeKey, label: sizeLabel ?? sizeKey, format: sizeFormatter }] : []),
  ]
  // Recharts sizes symbols by area, so a fixed radius becomes a fixed area.
  const dotArea = Math.round(Math.PI * dotRadius * dotRadius)
  const zRange = React.useMemo<[number, number]>(
    () => (sizeKey ? [sizeRange[0], sizeRange[1]] : [dotArea, dotArea]),
    [sizeKey, sizeRange[0], sizeRange[1], dotArea]
  )
  const all = resolved.flatMap((s) => s.data)
  const labelPoints = labelKey
    ? resolved
        .filter((s) => s.labels)
        .flatMap((s) => s.data)
        .map((row, index) => ({
          id: String(idKey ? row[idKey] : index),
          x: Number(row[xKey]),
          y: Number(row[yKey]),
          text: String(row[labelKey] ?? ""),
          // Extremes first: highest quality and highest capacity get the first pick of positions.
          priority: Number(row[yKey]) + Number(row[xKey]) / 1e6,
        }))
    : []

  return (
    <PointContext.Provider value={pointContext}>
    <ChartContainer
      data-slot="scatter-chart"
      config={config}
      className={cn("aspect-auto h-64 w-full", className)}
      {...props}
    >
      <RechartsScatterChart
        accessibilityLayer={false}
        margin={margin}
      >
        {showGrid ? <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="" vertical={false} /> : null}
        <XAxis
          type="number"
          dataKey={xKey}
          hide={!showXAxis}
          domain={stableXDomain}
          ticks={stableXTicks}
          scale={xScale === "log" ? "log" : "auto"}
          allowDataOverflow={xScale === "log"}
          tickLine={false}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickMargin={8}
          tickFormatter={xTickFormatter}
          label={
            xAxisTitle
              ? { value: xAxisTitle, position: "insideBottomRight", offset: -14, className: "fill-muted-foreground text-[11.5px]" }
              : undefined
          }
        />
        <YAxis
          type="number"
          dataKey={yKey}
          hide={!showYAxis}
          domain={stableYDomain}
          ticks={stableYTicks}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={yAxisWidth(stableYTicks, yFormatter)}
          tickFormatter={yTickFormatter}
          label={yTitleLabel}
        />
        {sizeKey ? (
          <ZAxis type="number" dataKey={sizeKey} range={zRange} />
        ) : (
          <ZAxis type="number" range={zRange} />
        )}
        {showTooltip ? (
          <ChartTooltip
            cursor={false}
            isAnimationActive={false}
            content={<ScatterTooltipContent config={config} rows={rows} nameKey={nameKey} detailKey={detailKey} />}
          />
        ) : null}
        {showLegend ? <ChartLegend content={<ChartLegendContent />} /> : null}
        {resolved.map((s) => {
          const color = `var(--color-${s.key})`
          return (
            <Scatter
              key={s.key}
              name={s.key}
              data={s.data}
              fill={color}
              line={s.line ? { stroke: color, strokeWidth: 2, strokeOpacity: 0.45, strokeLinejoin: "round" } : false}
              lineType="joint"
              shape={shapeFor(s.key)}
              isAnimationActive={animate && !reducedMotion}
              animationDuration={animationDuration}
              animationEasing="ease-out"
            />
          )
        })}
        {labelPoints.length ? (
          <LabelLayer
            points={labelPoints}
            obstacles={all.map((row) => ({ x: Number(row[xKey]), y: Number(row[yKey]) }))}
            xKeyScale={xScale}
            radius={dotRadius}
          />
        ) : null}
      </RechartsScatterChart>
    </ChartContainer>
    </PointContext.Provider>
  )
}

export { ScatterChart }
