import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadCurve, totalPerGpuCurve } from "./glance.js";
import { useAppState } from "../../state.js";
import { gpusOf, num } from "../../lib/display.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { everyMeasuredVersion, type EngineScope, type VersionRow } from "./engine-data.js";
import { signedFraction } from "./engine-matchup.js";
import { openRun } from "./overlays.js";
import { ConfigChips } from "./performance.js";
import { InfoTip, InlineBar, Panel, SeriesSwatch } from "./primitives.js";

/*
 * Every measured version: each imported run of the model × GPU count on the active dataset, newest run first, with
 * sustainable tok/min/GPU, C_max, request quality and Δ against the next older release of the same engine and
 * configuration. Values come from engine-data.ts (capacity()); "—" where a value or the older release is missing.
 */

const engineIndex = (row: VersionRow) => (row.engine === "vLLM" ? 0 : 1);
const dateOf = (iso: string) => iso.slice(0, 10);

function Quality({ row }: { row: VersionRow }) {
  const incomplete = row.capacity.incomplete, errored = row.capacity.errored;
  if (incomplete === null || errored === null) return <span className="text-muted-foreground">—</span>;
  if (!incomplete && !errored) return <span className="text-muted-foreground text-xs" data-quality="clean">all requests completed</span>;
  return (
    <span className="inline-flex flex-wrap gap-1" data-quality="issues">
      {incomplete ? <Badge variant="warning" title="Requests that did not finish; they count against the success rate">{num(incomplete)} incomplete</Badge> : null}
      {errored ? <Badge variant="critical" title="Requests that failed; they count against the success rate">{num(errored)} errored</Badge> : null}
    </span>
  );
}

function Delta({ row }: { row: VersionRow }) {
  if (row.delta === null) {
    return <span className="text-muted-foreground" data-delta="none" title={row.previous ? "The older release or this run has no level inside the SLO" : "No older release of this engine and configuration on this dataset"}>—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5" data-delta={signedFraction(row.delta)}>
      <DeltaBadge delta={row.delta} variant="soft" />
      <span className="text-muted-foreground font-mono text-[11px]">vs {row.previous?.run.identity.runtimeVersion}</span>
    </span>
  );
}

function VersionCell({ row }: { row: VersionRow }) {
  return (
    <button type="button" className="hover:text-link inline-flex min-w-0 items-center gap-1.5 text-left hover:underline" onClick={() => openRun(row.base.id)} title="Open the configuration evidence">
      <SeriesSwatch index={engineIndex(row)} />
      <span className="truncate font-mono text-xs">{row.run.identity.runtimeVersion}</span>
    </button>
  );
}

function ConfigCell({ row }: { row: VersionRow }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="text-ink-2 truncate text-xs">{row.base.exportLabel} · {row.base.knob ?? "Baseline"}</span>
      <ConfigChips deployment={row.deployment} max={2} />
    </span>
  );
}

export function EngineVersions({ scope, modelName, shapeLabel, children }: { scope: EngineScope; modelName: string; shapeLabel: string; children?: React.ReactNode }) {
  const state = useAppState();
  const narrow = useMediaQuery(NARROW_MD);
  const rows = everyMeasuredVersion(state.snapshot, scope, state.workload, state.slo);
  const max = Math.max(0, ...rows.map((row) => row.capacity.sustainableTpmPerGpu ?? 0));
  const footnote = "Newest run first; Δ prev compares each version with the next older release of the same engine and configuration on this dataset. Sustainable tok/min/GPU under the active SLO.";
  return (
    <Panel
      id="engine-versions"
      title="Every measured version"
      description={<span data-testid="versions-scope">{modelName} · {shapeLabel} · {state.workload} · {rows.length} run{rows.length === 1 ? "" : "s"}</span>}
      actions={rows.length ? <InfoTip label="How versions are compared">{footnote}</InfoTip> : undefined}
      bodyClassName="p-0"
    >
      {!rows.length ? (
        <p className="text-muted-foreground px-4 py-3 text-[13px]" data-testid="engine-versions-empty">No run on {state.workload} yet.</p>
      ) : narrow ? (
        <ul className="divide-y" data-testid="engine-versions">
          {rows.map((row) => (
            <li key={row.run.id} data-version-row={row.run.identity.runtimeVersion} data-version-config={row.base.configurationId} className="flex min-w-0 flex-col gap-1.5 px-4 py-3">
              <span className="flex min-w-0 items-start justify-between gap-3">
                <VersionCell row={row} />
                <span className="shrink-0 text-right text-[13px] tabular-nums"><span className="font-semibold">{num(row.capacity.sustainableTpmPerGpu)}</span> <span className="text-muted-foreground text-[11px]">tok/min/GPU</span></span>
              </span>
              <ConfigCell row={row} />
              <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
                <span>C_max {num(row.capacity.highestPassingConcurrency)}</span>
                <LoadCurve points={totalPerGpuCurve(row.capacity, gpusOf(row.deployment))} unit="Total tok/s per GPU" cmax={row.capacity.highestPassingConcurrency} className="h-5 w-16" />
                <span>Run {dateOf(row.run.runDate)}</span>
                <Quality row={row} />
              </span>
              <Delta row={row} />
            </li>
          ))}
        </ul>
      ) : (
        <Table data-testid="engine-versions">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Version</TableHead>
              <TableHead>Configuration</TableHead>
              <TableHead className="text-right">Sustainable <span className="text-muted-foreground font-normal">tok/min/GPU</span></TableHead>
              <TableHead className="text-right">C_max</TableHead>
              <TableHead title="Total tok/s per GPU at each tested concurrency level, lowest to highest">Load curve</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Run</TableHead>
              <TableHead>Δ prev</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.run.id} data-version-row={row.run.identity.runtimeVersion} data-version-config={row.base.configurationId}>
                <TableCell className="max-w-[220px]"><VersionCell row={row} /></TableCell>
                <TableCell className="max-w-[280px] whitespace-normal"><ConfigCell row={row} /></TableCell>
                <TableCell className="text-right tabular-nums"><InlineBar value={row.capacity.sustainableTpmPerGpu} max={max}>{num(row.capacity.sustainableTpmPerGpu)}</InlineBar></TableCell>
                <TableCell className="text-right tabular-nums">{num(row.capacity.highestPassingConcurrency)}</TableCell>
                <TableCell><LoadCurve points={totalPerGpuCurve(row.capacity, gpusOf(row.deployment))} unit="Total tok/s per GPU" cmax={row.capacity.highestPassingConcurrency} highlight={row.capacity.sustainableTpmPerGpu !== null && row.capacity.sustainableTpmPerGpu === max} /></TableCell>
                <TableCell className="whitespace-normal"><Quality row={row} /></TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{dateOf(row.run.runDate)}</TableCell>
                <TableCell><Delta row={row} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {children}
    </Panel>
  );
}
