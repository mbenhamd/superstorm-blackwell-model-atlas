import type { LabelProps } from "recharts"

/** Width for a left Y axis sized to its widest formatted tick (11.5–12px tabular digits ≈ 7px each). */
export function yAxisWidth(ticks: number[] | undefined, format: ((value: number) => string) | undefined, fallback = 44): number {
  if (!ticks?.length) return fallback
  const longest = Math.max(...ticks.map((tick) => (format ? format(tick) : String(tick)).length))
  return Math.max(30, Math.ceil(longest * 7.5 + 16))
}

/** Y-axis title rendered left-aligned above the plot, starting at the axis' left edge. */
export function yAxisTitleLabel(title: string | undefined) {
  if (!title) return undefined
  return {
    content: (props: LabelProps) => {
      const box = (props.viewBox ?? {}) as { x?: number; y?: number }
      const x = box.x ?? 0
      const y = box.y ?? 0
      return (
        <text x={x} y={y - 14} textAnchor="start" className="fill-muted-foreground text-[11.5px]">
          {title}
        </text>
      )
    },
  }
}
