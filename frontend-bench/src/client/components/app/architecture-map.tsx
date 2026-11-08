import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { paramsCompact } from "../../../domain/architecture.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { FAMILY_LABEL } from "../../../domain/architecture.js";
import { archGroups, layerColor, layerDetails, layerTitle, legendItems, ORDER_LABEL, stripLabel, type ArchEntry, type LegendItem } from "./architecture-data.js";

/**
 * Layer map: one row per model. Left of the centre line, the token-mixing layers as thin cells, layer 1 at the line
 * and deeper layers outward, on one shared cell pitch (the deepest model fills the track). Right of the line, total
 * parameters with active parameters as the inner bar, on one shared linear scale. Hue = mixer kind; the recessive step
 * = a recorded reuse of an earlier index selection; a dot = no RoPE; a hollow cell = KV read from an earlier layer;
 * hatching = position not recorded. Custom SVG: no dashboardcn primitive draws per-layer cells.
 */

/**
 * Width of an element, kept current with a ResizeObserver. A callback ref, so the observer follows the element when
 * the layout swaps it (the axis track moves between the wide and the stacked layout at the md breakpoint).
 */
function useWidth<T extends HTMLElement>(): [(element: T | null) => void, number] {
  const [element, setElement] = React.useState<T | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width];
}

/** Gap between cells: 1px when cells are at least 3px apart, else half a pixel. */
const gapOf = (pitch: number) => (pitch >= 3 ? 1 : 0.5);

/* -------------------------------------------------- strip -------------------------------------------------- */

export function LayerStrip({ entry, pitch, height, active, onActive, className, testId = "arch-strip" }: {
  entry: ArchEntry; pitch: number; height: number; active: number | null; onActive: (index: number | null) => void; className?: string; testId?: string;
}) {
  const { arch } = entry;
  const width = arch.layers.length * pitch;
  const gap = gapOf(pitch);
  const cell = Math.max(0.5, pitch - gap);
  const hatchId = React.useId();
  const x = (index: number) => width - (index + 1) * pitch + gap / 2;
  const fromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((box.right - event.clientX) / pitch);
    onActive(index >= 0 && index < arch.layers.length ? index : null);
  };
  const layer = active !== null ? arch.layers[active] : undefined;
  return (
    <div
      className={cn("relative ml-auto touch-pan-y py-1.5", className)} style={{ width }}
      onPointerMove={fromPointer} onPointerDown={fromPointer} onPointerLeave={() => onActive(null)}
    >
      <svg
        role="img" aria-label={stripLabel(entry)} width={width} height={height} className="block overflow-visible"
        data-testid={testId} data-model-id={entry.model.id} data-order={arch.order} data-layers={arch.layers.length}
      >
        {arch.layers.some((item) => item.positionUnknown) ? (
          <defs>
            <pattern id={hatchId} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="var(--card)" strokeWidth="1.4" />
            </pattern>
          </defs>
        ) : null}
        {arch.layers.map((item) => {
          const color = layerColor(item);
          const left = x(item.index);
          const hollow = item.kvBorrowedFrom !== undefined;
          const r = Math.max(0.8, Math.min(1.7, cell * 0.34));
          return (
            <g key={item.index} data-cell="" data-kind={item.kind} data-layer={item.index + 1} data-nope={item.noRope ? "" : undefined} data-kv-borrowed={hollow ? "" : undefined} data-index-reused={item.indexBorrowed ? "" : undefined}>
              {hollow ? (
                <>
                  <rect x={left} y={0} width={cell} height={height} rx={0.75} fill={color} fillOpacity={0.24} />
                  {cell >= 3.5
                    ? <rect x={left + 0.5} y={0.5} width={cell - 1} height={height - 1} rx={0.5} fill="none" stroke={color} strokeWidth={1} />
                    : <><rect x={left} y={0} width={cell} height={1.5} fill={color} /><rect x={left} y={height - 1.5} width={cell} height={1.5} fill={color} /></>}
                </>
              ) : <rect x={left} y={0} width={cell} height={height} rx={0.75} fill={color} />}
              {item.noRope ? <circle cx={left + cell / 2} cy={height / 2} r={r} fill={hollow ? color : "var(--card)"} /> : null}
              {item.positionUnknown ? <rect x={left} y={0} width={cell} height={height} fill={`url(#${hatchId})`} /> : null}
            </g>
          );
        })}
        {layer ? <rect x={x(layer.index) - 1} y={-1.5} width={cell + 2} height={height + 3} rx={1.5} fill="none" stroke="var(--foreground)" strokeWidth={1.25} pointerEvents="none" /> : null}
      </svg>
      <Tooltip open={Boolean(layer)}>
        <TooltipTrigger asChild>
          <span aria-hidden="true" className="pointer-events-none absolute" style={{ left: layer ? x(layer.index) : 0, width: cell, top: 6, height }} />
        </TooltipTrigger>
        {layer ? (
          <TooltipContent side="top" sideOffset={8} collisionPadding={8} updatePositionStrategy="always" className="max-w-[300px] text-left" data-testid="arch-tooltip">
            <span className="block font-medium">{layerTitle(layer)}</span>
            {layerDetails(layer, arch).map((line) => <span key={line} className="block opacity-80">{line}</span>)}
          </TooltipContent>
        ) : null}
      </Tooltip>
    </div>
  );
}

/* ---------------------------------------------- parameter bar ---------------------------------------------- */

/** Shared linear parameter scale, billions: 0 to the next 500B step above the largest recorded total. */
export function paramDomain(entries: readonly ArchEntry[]): { max: number; ticks: number[] } {
  const largest = Math.max(0, ...entries.map((entry) => entry.model.totalParamsB ?? 0));
  const max = Math.max(500, Math.ceil(largest / 500) * 500);
  return { max, ticks: Array.from({ length: max / 500 + 1 }, (_, i) => i * 500) };
}
const tickLabel = (billions: number) => (billions === 0 ? "0" : paramsCompact(billions));

export function paramsText(entry: ArchEntry): string {
  const { totalParamsB: total, activeParamsB: active } = entry.model;
  if (total === null) return "Parameters not recorded";
  return `${active !== null ? `${paramsCompact(active)} active` : "active not recorded"} · ${paramsCompact(total)} total`;
}

export function ParamBar({ entry, max }: { entry: ArchEntry; max: number }) {
  const { totalParamsB: total, activeParamsB: active } = entry.model;
  if (total === null) {
    return (
      <div className="flex h-full min-w-0 flex-col justify-center gap-1 text-[12px]" data-testid="arch-params" data-model-id={entry.model.id}>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground" data-missing="true">—</span><span className="text-muted-foreground">not recorded</span></span>
      </div>
    );
  }
  const label = paramsText(entry);
  return (
    <div className="flex min-w-0 flex-col justify-center gap-1" data-testid="arch-params" data-model-id={entry.model.id}>
      <div role="img" aria-label={`${entry.model.name}: ${label}`} className="relative h-3 w-full">
        <span className="absolute inset-y-0 left-0 rounded-r-[3px]" style={{ width: `${(total / max) * 100}%`, minWidth: 2, background: "var(--arch-total)" }} />
        {active !== null ? <span className="absolute inset-y-[3px] left-0 rounded-r-[2px]" style={{ width: `${(active / max) * 100}%`, minWidth: 2, background: "var(--arch-active)" }} /> : null}
      </div>
      <span className="text-muted-foreground truncate text-[12px] tabular-nums">{label}</span>
    </div>
  );
}

/* ------------------------------------------------- legend ------------------------------------------------- */

function Swatch({ swatch }: { swatch: LegendItem["swatch"] }) {
  const id = React.useId();
  return (
    <svg width="9" height="16" aria-hidden="true" className="shrink-0">
      {swatch.hatch ? <defs><pattern id={id} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="var(--card)" strokeWidth="1.4" /></pattern></defs> : null}
      {swatch.hollow
        ? <><rect x="0" y="0" width="9" height="16" rx="1" fill={swatch.color} fillOpacity="0.24" /><rect x="0.5" y="0.5" width="8" height="15" rx="0.75" fill="none" stroke={swatch.color} /></>
        : <rect x="0" y="0" width="9" height="16" rx="1" fill={swatch.color} />}
      {swatch.dot ? <circle cx="4.5" cy="8" r="1.7" fill="var(--card)" /> : null}
      {swatch.hatch ? <rect x="0" y="0" width="9" height="16" fill={`url(#${id})`} /> : null}
    </svg>
  );
}

export function ArchLegend({ entries }: { entries: readonly ArchEntry[] }) {
  const items = legendItems(entries);
  const groups = (["attention", "linear", "marks"] as const).map((family) => ({ family, items: items.filter((item) => item.family === family) })).filter((group) => group.items.length);
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3" data-testid="arch-legend">
      {groups.map((group) => (
        <div key={group.family} className="min-w-0 space-y-1.5">
          <p className="text-muted-foreground text-[11px] font-medium">{group.family === "marks" ? "Marks" : FAMILY_LABEL[group.family]}</p>
          <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12px]">
            {group.items.map((item) => (
              <li key={item.key} className="flex items-center gap-1.5">
                <Swatch swatch={item.swatch} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------- map --------------------------------------------------- */

const LAYER_TICKS = [0, 20, 40, 60, 80];

function LayerAxis({ trackRef, pitch, width }: { trackRef: (element: HTMLDivElement | null) => void; pitch: number; width: number }) {
  return (
    <div ref={trackRef} className="relative h-4 min-w-0" aria-hidden="true">
      {width > 0 ? LAYER_TICKS.filter((tick) => tick * pitch <= width).map((tick) => (
        <span key={tick} className={cn("text-muted-foreground absolute top-0 text-[11px] tabular-nums", tick === 0 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: Math.max(6, width - tick * pitch) }}>
          <span className={cn("bg-chart-axis absolute top-4 h-1.5 w-px", tick === 0 ? "right-0" : "left-1/2")} />{tick}
        </span>
      )) : null}
    </div>
  );
}

function ParamAxis({ max, ticks }: { max: number; ticks: number[] }) {
  return (
    <div className="relative h-4 min-w-0" aria-hidden="true">
      {ticks.map((tick, i) => (
        <span key={tick} className={cn("text-muted-foreground absolute top-0 text-[11px] whitespace-nowrap tabular-nums", i === 0 ? "translate-x-0" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `${(tick / max) * 100}%` }}>
          <span className={cn("bg-chart-axis absolute top-4 h-1.5 w-px", i === 0 ? "left-0" : i === ticks.length - 1 ? "right-0" : "left-1/2")} />{tickLabel(tick)}
        </span>
      ))}
    </div>
  );
}

function MapRow({ entry, pitch, max, narrow, onOpen }: { entry: ArchEntry; pitch: number; max: number; narrow: boolean; onOpen: (id: string) => void }) {
  const [active, setActive] = React.useState<number | null>(null);
  const summaryId = React.useId();
  const layers = entry.arch.layers.length;
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step: Record<string, (index: number | null) => number | null> = {
      ArrowLeft: (index) => (index === null ? 0 : Math.min(layers - 1, index + 1)),
      ArrowRight: (index) => (index === null ? 0 : Math.max(0, index - 1)),
      Home: () => 0,
      End: () => layers - 1,
    };
    const move = step[event.key];
    if (move) { event.preventDefault(); setActive(move(active)); }
    else if (event.key === "Escape" && active !== null) { event.preventDefault(); event.stopPropagation(); setActive(null); }
  };
  const layer = active !== null ? entry.arch.layers[active] : undefined;
  const name = (
    <div className="min-w-0">
      <button
        type="button" className="hover:text-link focus-visible:text-link max-w-full truncate text-left text-[13px] font-medium outline-none"
        aria-describedby={`${summaryId} arch-keys`} data-testid="arch-open" onKeyDown={onKeyDown} onBlur={() => setActive(null)}
        onClick={(event) => { event.stopPropagation(); setActive(null); onOpen(entry.model.id); }}
      >
        {entry.model.name}
      </button>
      <p id={summaryId} className="text-muted-foreground text-[12px] leading-4 text-pretty">
        {entry.arch.summary}<span className="text-muted-foreground/80"> · {ORDER_LABEL[entry.arch.order]}</span>
      </p>
    </div>
  );
  return (
    <div
      className={cn("group/row hover:bg-accent/70 focus-within:bg-accent/70 cursor-pointer rounded-md transition-colors", narrow ? "space-y-1.5 px-2 py-2.5" : "grid grid-cols-[minmax(11rem,15rem)_minmax(0,1.75fr)_minmax(0,1fr)] items-center")}
      data-testid="arch-row" data-model-id={entry.model.id} onClick={() => { setActive(null); onOpen(entry.model.id); }}
    >
      {narrow ? name : <div className="min-w-0 py-2 pr-4 pl-2">{name}</div>}
      <div className={cn("min-w-0", narrow ? "" : "pr-1.5")}>
        <LayerStrip entry={entry} pitch={pitch} height={narrow ? 16 : 18} active={active} onActive={setActive} />
      </div>
      <div className={cn("min-w-0", narrow ? "" : "border-border-strong self-stretch border-l py-2 pr-2 pl-1.5")}>
        <ParamBar entry={entry} max={max} />
      </div>
      <span className="sr-only" aria-live="polite">{layer ? `${layerTitle(layer)}. ${layerDetails(layer, entry.arch).join(". ")}` : ""}</span>
    </div>
  );
}

export function LayerMap({ entries, onOpen }: { entries: readonly ArchEntry[]; onOpen: (id: string) => void }) {
  const narrow = useMediaQuery(NARROW_MD);
  const [trackRef, width] = useWidth<HTMLDivElement>();
  const deepest = Math.max(1, ...entries.map((entry) => entry.arch.layers.length));
  const pitch = width > 0 ? width / deepest : 0;
  const { max, ticks } = paramDomain(entries);
  const groups = archGroups([...entries]);
  return (
    <div className="space-y-4" data-testid="arch-map">
      <ArchLegend entries={entries} />
      <div className="min-w-0">
        <p id="arch-keys" className="sr-only">Arrow keys step through the layers of this model; Enter opens its details.</p>
        {narrow ? (
          <div className="space-y-1 px-2 pb-1">
            <p className="text-muted-foreground text-[11px]">Token-mixing layers · layer 1 at the right edge</p>
            <LayerAxis trackRef={trackRef} pitch={pitch} width={width} />
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(11rem,15rem)_minmax(0,1.75fr)_minmax(0,1fr)] items-end pb-1">
            <span className="text-muted-foreground pl-2 text-[11px] font-medium">Model</span>
            <div className="min-w-0 space-y-1 pr-1.5">
              <p className="text-muted-foreground text-right text-[11px]">Token-mixing layers · layer 1 at the centre line</p>
              <LayerAxis trackRef={trackRef} pitch={pitch} width={width} />
            </div>
            <div className="border-border-strong min-w-0 space-y-1 border-l pr-2 pl-1.5">
              <p className="text-muted-foreground text-[11px]">Parameters · active inside total</p>
              <ParamAxis max={max} ticks={ticks} />
            </div>
          </div>
        )}
        {pitch > 0 ? groups.map((group) => (
          <section key={group.publisher} aria-label={group.publisher} className="border-t pt-1.5 pb-1" data-testid="arch-group">
            <h3 className="text-muted-foreground px-2 pt-1 pb-0.5 text-[11px] font-semibold">{group.publisher}</h3>
            {group.entries.map((entry) => <MapRow key={entry.model.id} entry={entry} pitch={pitch} max={max} narrow={narrow} onOpen={onOpen} />)}
          </section>
        )) : null}
        {narrow ? <p className="text-muted-foreground px-2 pt-2 text-[11px]">Parameter bars share one linear scale, 0 to {tickLabel(max)}; the inner bar is active parameters.</p> : null}
      </div>
    </div>
  );
}
