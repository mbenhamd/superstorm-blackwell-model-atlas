import { ArrowUpRight, ChartLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadCurve, totalPerGpuCurve } from "./glance.js";
import { capacity, relativeDelta, tieBand } from "../../../domain/metrics.js";
import { splitRuntime } from "../../../domain/catalog.js";
import { configKeyOf } from "../../../domain/variants.js";
import type { BenchmarkRun, Capacity, Deployment, SloPolicy } from "../../../domain/types.js";
import { routeUrl, updateView, useAppState } from "../../state.js";
import { engineBuildDetail, gpusOf, num, signedPct, workloadOf } from "../../lib/display.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { SweepChart } from "./charts.js";
import { ErroredBadge, IncompleteBadge } from "./performance.js";
import { InlineBar, Panel } from "./primitives.js";

/** The configuration as one run measured it: that run's metrics and recorded identity (configured build unchanged). */
export function deploymentForRun(base: Deployment, run: BenchmarkRun): Deployment {
  const { identity } = run;
  return {
    ...base, workloadId: identity.dataset, points: run.metrics, measuredAt: run.runDate, evidence: "measured", runId: run.id,
    runtimeTag: identity.runtimeVersion, gpuType: identity.gpuType, replicas: identity.maxSystemReplicas, runConfig: identity.runtimeConfig,
    runGpus: identity.numGpus, topologyMismatch: identity.numGpus !== base.gpus,
  };
}

/** Numeric engine version for ordering ("0.33.0" > "0.33.0rc2" > "0.32.1"); null when the tag carries none. */
function versionKey(runtimeVersion: string): number[] | null {
  const version = splitRuntime(runtimeVersion).version;
  const match = version ? /^(\d+)\.(\d+)\.(\d+)(?:rc(\d+))?$/.exec(version) : null;
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? Number.MAX_SAFE_INTEGER : Number(match[4])];
}
function compareVersions(a: BenchmarkRun, b: BenchmarkRun): number {
  const ka = versionKey(a.identity.runtimeVersion), kb = versionKey(b.identity.runtimeVersion);
  if (ka && kb) for (let index = 0; index < 4; index++) if (ka[index] !== kb[index]) return kb[index]! - ka[index]!;
  return Date.parse(b.runDate) - Date.parse(a.runDate);
}

interface VersionRow { run: BenchmarkRun; deployment: Deployment; capacity: Capacity; delta: number | null; tie: boolean; previous: string | null }

/**
 * One row per recorded runtime_version of this configuration on a dataset (its newest run), newest version first.
 * With `configKey` (canonical recorded runtime_config, domain/variants.ts) only runs of that runtime config count, so
 * a Δ between two versions never also mixes a knob change (e.g. prefix cache off vs on).
 */
export function versionRows(base: Deployment, runs: readonly BenchmarkRun[], dataset: string, slo: SloPolicy, configKey?: string): VersionRow[] {
  const newest = new Map<string, BenchmarkRun>();
  for (const run of runs) {
    if (run.configurationId !== base.configurationId || run.identity.dataset !== dataset) continue;
    if (configKey !== undefined && configKeyOf(run.identity.runtimeConfig) !== configKey) continue;
    const current = newest.get(run.identity.runtimeVersion);
    if (!current || Date.parse(run.runDate) > Date.parse(current.runDate)) newest.set(run.identity.runtimeVersion, run);
  }
  const ordered = [...newest.values()].sort(compareVersions);
  const measured = ordered.map((run) => { const deployment = deploymentForRun(base, run); return { run, deployment, capacity: capacity(deployment, slo) }; });
  return measured.map((item, index) => {
    const older = measured[index + 1];
    const a = item.capacity.sustainableTpmPerGpu, b = older?.capacity.sustainableTpmPerGpu ?? null;
    return { ...item, delta: older ? relativeDelta(a, b) : null, tie: older ? tieBand(a, b) === "tie" : false, previous: older?.run.identity.runtimeVersion ?? null };
  });
}

/** Matched engine pair key ("<export>@<gpus>") when both engines have a baseline of this export and shape; else null. */
function pairKey(d: Deployment, deployments: readonly Deployment[]): string | null {
  const same = (x: Deployment) => x.id === x.configurationId && x.knob === null && x.artifactId === d.artifactId && x.gpus === d.gpus && x.tensorParallel === d.tensorParallel && x.dataParallel === d.dataParallel;
  return deployments.some((x) => same(x) && x.runtime === "vLLM") && deployments.some((x) => same(x) && x.runtime === "SGLang") ? `${d.artifactId}@${d.gpus}` : null;
}

/** Δ vs the next older version: signed %, "· tie" within ±3%, "—" without an older version or a passing level. */
function VersionDelta({ row, card = false }: { row: VersionRow; card?: boolean }) {
  const title = row.previous ? `vs ${row.previous}` : "No older version on this dataset";
  if (row.delta === null) return <span className="text-muted-foreground" data-delta="none" title={title}>—</span>;
  return (
    <span className="inline-flex items-center gap-1.5" data-delta={row.tie ? "tie" : row.delta.toFixed(4)} title={title}>
      <span className={cn("font-medium", "text-ink-2")}>{signedPct(row.delta)}{row.tie ? " · tie" : ""}</span>
      {card && row.previous ? <span className="text-muted-foreground font-mono text-[11px]">vs older version {row.previous}</span> : null}
    </span>
  );
}

function VersionQuality({ row }: { row: VersionRow }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <IncompleteBadge count={row.capacity.incomplete} />
      <ErroredBadge count={row.capacity.errored} />
      {!row.capacity.incomplete && !row.capacity.errored ? <span className="text-muted-foreground">all complete</span> : null}
    </span>
  );
}

/**
 * Runtime versions of the selected configuration on the active dataset: each recorded runtime_version (its newest
 * run), sustainable tok/min/GPU with a bar, C_max, request quality and Δ vs the next older version (same
 * configuration, so the same engine). Selecting a row shows that run. "Compare top 2 versions" overlays the two
 * newest versions' throughput sweeps here (state in the URL, `overlay=versions`, so the view can be shared); the
 * Compare page holds one run per configuration, so two versions of one configuration cannot both be added there.
 * Below 768px each version is a stacked card (version, value, Δ, C_max, quality, run date), as on the Engine page.
 */
export function RuntimeVersionsPanel({ base, shownRunId, onPick }: { base: Deployment; shownRunId: string | null; onPick: (run: BenchmarkRun) => void }) {
  const state = useAppState();
  const narrow = useMediaQuery(NARROW_MD);
  const shownRun = (state.snapshot.runs ?? []).find((run) => run.id === shownRunId);
  const configKey = shownRun ? configKeyOf(shownRun.identity.runtimeConfig) : undefined;
  const rows = versionRows(base, state.snapshot.runs ?? [], state.workload, state.slo, configKey);
  // Other runtime configs of this configuration on the dataset (listed in the Runtime config picker).
  const otherConfigs = new Set((state.snapshot.runs ?? []).filter((run) => run.configurationId === base.configurationId && run.identity.dataset === state.workload).map((run) => configKeyOf(run.identity.runtimeConfig))).size - (configKey === undefined ? 0 : 1);
  if (!rows.length) return null;
  const max = Math.max(0, ...rows.map((row) => row.capacity.sustainableTpmPerGpu ?? 0));
  const top = rows.slice(0, 2);
  const canCompare = top.length === 2;
  const open = state.versionOverlay && canCompare;
  const pair = pairKey(base, state.snapshot.deployments);
  const dataset = workloadOf(state.workload)?.name ?? state.workload;
  // Overlay labels name the version: two runs of one configuration would otherwise share a label.
  const overlay = top.map((row) => ({ ...row.deployment, id: `${row.deployment.id}#${row.run.id}`, knob: [row.run.identity.runtimeVersion, base.knob].filter(Boolean).join(" · ") }));
  // Both versions belong to one engine, so the overlay is sequential, not categorical: one hue (chart-1), the newer
  // version solid and full strength, the older lighter and dashed (as on the Engine page). No second engine hue.
  const overlayStyle = (_: Deployment, index: number) => index === 0
    ? { color: "var(--chart-1)", label: `${top[0]!.run.identity.runtimeVersion} (newer)` }
    : { color: "color-mix(in oklab, var(--chart-1) 50%, var(--card))", dash: "6 3", label: `${top[index]!.run.identity.runtimeVersion} (older)` };
  const versionButton = (row: VersionRow, shown: boolean) => (
    <button type="button" className="inline-flex items-center gap-2 rounded-sm font-mono text-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => { event.stopPropagation(); onPick(row.run); }} aria-current={shown || undefined} title="Show this run">
      {row.run.identity.runtimeVersion}
    </button>
  );
  return (
    <Panel
      title="Runtime versions"
      description={<>Each recorded runtime_version of this configuration and recorded runtime config on <span className="font-mono">{dataset}</span> · catalog build: {engineBuildDetail(base)}{otherConfigs > 0 ? <span data-testid="versions-other-configs"> · {otherConfigs} other runtime config{otherConfigs === 1 ? "" : "s"} in the Runtime config picker</span> : null}</>}
      actions={
        <span className="flex flex-col items-end gap-1">
          <Button variant="outline" size="sm" disabled={!canCompare} aria-expanded={canCompare ? open : undefined} aria-controls="version-overlay" aria-describedby={canCompare ? undefined : "versions-compare-reason"} onClick={() => updateView((s) => { s.versionOverlay = !open; })} data-testid="compare-top-versions">
            <ChartLine aria-hidden="true" />{open ? "Hide version overlay" : "Compare top 2 versions"}
          </Button>
          {canCompare ? null : <span id="versions-compare-reason" className="text-muted-foreground text-[11px]">Needs two measured versions on this dataset</span>}
        </span>
      }
      bodyClassName="space-y-3 p-0"
    >
      {narrow ? (
        <ul className="divide-y" data-testid="runtime-version-rows">
          {rows.map((row) => {
            const shown = row.run.id === shownRunId;
            return (
              <li key={row.run.id} data-version={row.run.identity.runtimeVersion} data-shown={shown || undefined} className={cn("flex min-w-0 flex-col gap-1.5 px-4 py-3", shown && "bg-selection")}>
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-2">{versionButton(row, shown)}{shown ? <Badge variant="info">shown</Badge> : null}</span>
                  <span className="shrink-0 text-right text-[13px] tabular-nums"><span className="font-semibold">{num(row.capacity.sustainableTpmPerGpu)}</span> <span className="text-muted-foreground text-[11px]">tok/min/GPU</span></span>
                </span>
                <span className="text-xs tabular-nums"><VersionDelta row={row} card /></span>
                <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
                  <span>C_max {num(row.capacity.highestPassingConcurrency)}</span>
                  <LoadCurve points={totalPerGpuCurve(row.capacity, gpusOf(row.deployment))} unit="Total tok/s per GPU" cmax={row.capacity.highestPassingConcurrency} highlight={shown} className="h-5 w-16" />
                  <span>Run {row.run.runDate.slice(0, 10)}</span>
                  <VersionQuality row={row} />
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <Table data-testid="runtime-version-rows" className="text-[12.5px]">
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Sustainable tok/min/GPU</TableHead>
                <TableHead className="text-right">Δ prev</TableHead>
                <TableHead className="text-right">C_max</TableHead>
                <TableHead title="Total tok/s per GPU at each tested concurrency level, lowest to highest">Load curve</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Latest run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const shown = row.run.id === shownRunId;
                return (
                  <TableRow key={row.run.id} data-version={row.run.identity.runtimeVersion} data-shown={shown || undefined} className={cn("cursor-pointer", shown && "bg-selection hover:bg-selection")} onClick={() => onPick(row.run)}>
                    <TableCell>
                      {versionButton(row, shown)}
                      {shown ? <Badge variant="info" className="ml-2">shown</Badge> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums"><InlineBar value={row.capacity.sustainableTpmPerGpu} max={max}>{num(row.capacity.sustainableTpmPerGpu)}</InlineBar></TableCell>
                    <TableCell className="text-right tabular-nums"><VersionDelta row={row} /></TableCell>
                    <TableCell className="text-right tabular-nums">{num(row.capacity.highestPassingConcurrency)}</TableCell>
                    <TableCell><LoadCurve points={totalPerGpuCurve(row.capacity, gpusOf(row.deployment))} unit="Total tok/s per GPU" cmax={row.capacity.highestPassingConcurrency} highlight={shown} /></TableCell>
                    <TableCell><VersionQuality row={row} /></TableCell>
                    <TableCell className="tabular-nums">{row.run.runDate.slice(0, 10)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {open ? (
        <div id="version-overlay" className="border-t px-4 pt-3" data-testid="version-overlay">
          <SweepChart title="Throughput by runtime version" deployments={overlay} metric="totalTpsPerGpu" yAxisTitle="Total tok/s per GPU" unit="tok/s/GPU" markCapacity seriesStyle={overlayStyle} />
        </div>
      ) : null}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2.5 text-xs">
        <span className="text-pretty">Newest first; Δ compares each version with the next older one of this configuration and runtime config (same engine) under the active SLO; within ±3% reads as a tie (assumed single-run noise). The overlay is part of the page URL. Compare holds one run per configuration, so two versions are compared here, not on the Compare page.</span>
        <a className="text-link inline-flex items-center gap-0.5 hover:underline" href={routeUrl("tldr", { model: base.modelId })} data-testid="versions-quant-ladder">Open the quantization ladder<ArrowUpRight className="size-3" aria-hidden="true" /></a>
        <a className="text-link inline-flex items-center gap-0.5 hover:underline" href={routeUrl("engine", pair ? { pair } : { model: base.modelId })} data-testid="versions-engine">Open the engine head-to-head<ArrowUpRight className="size-3" aria-hidden="true" /></a>
      </div>
    </Panel>
  );
}
