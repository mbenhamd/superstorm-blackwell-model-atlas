import * as React from "react";
import { ArrowUpRight, BookOpen, ChevronDown, Columns2, ListOrdered, SquareTerminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { configChips } from "../../../domain/config-chips.js";
import { groupVariants, variantKey, variantsOfConfiguration, type Variant } from "../../../domain/variants.js";
import type { BenchmarkRun, Deployment, RankedDeployment } from "../../../domain/types.js";
import { appState, routeUrl, updateView, useAppState } from "../../state.js";
import {
  engineBuildDetail, engineVersion, gpuDivisorUnconfirmed, gpuTotals, gpusOf, hardwareShape, isMeasured, modelOf, num, precisionIndex, shape, topology, workloadOf,
} from "../../lib/display.js";
import { shortSha } from "../../lib/atlas.js";
import { CommandBlock, RecordedOverridesNote } from "./command-block.js";
import { addToCompare } from "./overlays.js";
import { Combobox, type ComboOption } from "./pickers.js";
import { ErroredBadge, IncompleteBadge } from "./performance.js";
import { StatusBadge } from "./status-badge.js";
import { openWorkloads } from "./workloads.js";

/*
 * Throughput selector row: Base model → Runtime (engine · configured build) → Hardware (GPUs · shape) → Runtime config
 * (one option per measured variant: export × knob × recorded runtime_config on the dataset, fronted by its best run
 * across engine versions, "best of N runtimes"; one planning option per unmeasured setup) → Run (date · dataset);
 * Workloads and Add to compare are visible
 * buttons in the page header (ThroughputActions). Each picker lists only what exists under the pickers to its left; changing one keeps the other
 * choices where a setup with them exists, else takes the best-ranked setup that matches. Below: the identity line.
 */

const runtimeKey = (d: Deployment) => `${d.runtime}|${d.runtimeVersion}`;
const hardwareKey = (d: Deployment) => `${d.gpus}|${d.tensorParallel}|${d.dataParallel}|${d.hardwareId}`;
const runtimeLabel = (d: Deployment) => `${d.runtime} · ${engineVersion(d)}`;
const hardwareLabel = (d: Deployment) => `${topology(d)} · ${shape(d)}`;

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-muted-foreground text-[11px] font-medium" aria-hidden="true">{label}</span>
      {children}
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const runsLabel = (n: number) => n ? plural(n, "run") : "no runs";

interface ConfigChoice { configurationId: string; runId: string | null; variant: Variant | null }

export function ThroughputSelectors({ rows, base, shown, runs, onPickRun, onPickConfig }: {
  rows: readonly RankedDeployment[]; base: RankedDeployment; shown: Deployment; runs: readonly BenchmarkRun[]; onPickRun: (run: BenchmarkRun) => void;
  /** A runtime-config option: the configuration and, for a measured variant, its best run. */
  onPickConfig: (configurationId: string, runId: string | null) => void;
}) {
  const state = useAppState();
  const b = base.deployment;
  const models = state.snapshot.models;
  const allRuns = state.snapshot.runs ?? [];
  const runCount = (d: Deployment) => allRuns.filter((run) => run.configurationId === d.configurationId).length;
  const ofModel = rows.filter((row) => row.deployment.modelId === b.modelId);
  const ofRuntime = ofModel.filter((row) => runtimeKey(row.deployment) === runtimeKey(b));
  const ofHardware = ofRuntime.filter((row) => hardwareKey(row.deployment) === hardwareKey(b));
  const select = (candidates: readonly RankedDeployment[]) => {
    // Keep the current export, then the current knob, where possible; rows are ranked best first.
    const pick = candidates.find((row) => row.deployment.artifactId === b.artifactId && row.deployment.knob === b.knob)
      ?? candidates.find((row) => row.deployment.artifactId === b.artifactId)
      ?? candidates.find((row) => row.deployment.knob === b.knob)
      ?? candidates[0];
    if (pick) updateView((s) => { s.run = pick.deployment.configurationId; s.runPick = ""; });
  };
  const unique = <T,>(items: readonly RankedDeployment[], key: (d: Deployment) => string, make: (d: Deployment, group: RankedDeployment[]) => T): T[] => {
    const seen = new Map<string, RankedDeployment[]>();
    for (const row of items) seen.set(key(row.deployment), [...(seen.get(key(row.deployment)) ?? []), row]);
    return [...seen.values()].map((group) => make(group[0]!.deployment, group));
  };
  const measuredCount = (group: readonly RankedDeployment[]) => group.filter((row) => isMeasured(row.deployment)).length;
  const modelOptions: ComboOption[] = unique(rows, (d) => d.modelId, (d, group) => ({
    value: d.modelId, label: modelOf(d)?.name ?? d.modelId,
    detail: `${plural(group.length, "setup")} · ${measuredCount(group) ? `${measuredCount(group)} measured` : "not measured"}`,
    keywords: [d.modelId, modelOf(d)?.company ?? ""],
  })).sort((x, y) => models.findIndex((m) => m.id === x.value) - models.findIndex((m) => m.id === y.value));
  const runtimeOptions: ComboOption[] = unique(ofModel, runtimeKey, (d, group) => ({
    value: runtimeKey(d), label: runtimeLabel(d), detail: `${plural(group.length, "setup")} · ${engineBuildDetail(d)}`, keywords: [d.runtime, d.runtimeVersion],
  }));
  const hardwareOptions: ComboOption[] = unique(ofRuntime, hardwareKey, (d, group) => ({
    value: hardwareKey(d), label: hardwareLabel(d), detail: plural(group.length, "setup"), keywords: [shape(d), topology(d)],
  }));
  // Measured variants on the active dataset under the active SLO (domain/variants.ts): a configuration measured with
  // two recorded runtime_configs is two options; each states its best run across engine versions.
  const variants = groupVariants(state.snapshot, state.slo);
  const choices = new Map<string, ConfigChoice>();
  const shownRun = allRuns.find((run) => run.id === shown.runId);
  const shownKey = shownRun ? variantKey(shownRun) : null;
  let currentValue = b.id;
  const configOptions: ComboOption[] = [...ofHardware]
    .sort((x, y) => precisionIndex(x.deployment.precision) - precisionIndex(y.deployment.precision) || x.deployment.exportLabel.localeCompare(y.deployment.exportLabel) || (x.deployment.knob ?? "").localeCompare(y.deployment.knob ?? ""))
    .flatMap(({ deployment: d, model }) => {
      const group = `${model.name} · ${d.exportLabel}`, label = d.knob ?? "Baseline";
      const own = variantsOfConfiguration(variants, d.configurationId, state.workload);
      if (!own.length) {
        const chips = configChips(d);
        choices.set(d.id, { configurationId: d.configurationId, runId: null, variant: null });
        return [{
          value: d.id, label, group, detail: chips.length ? chips.join(" · ") : "default arguments",
          meta: [runCount(d) ? `${runsLabel(runCount(d))} · none on this dataset` : "no runs", "not measured"], keywords: [d.id, d.exportLabel, d.precision, ...chips],
        }];
      }
      // The variant holding the configuration's newest run on the dataset (what the page shows by default) keeps the
      // configuration id as its value; other variants of the same configuration get a suffixed value.
      const newest = allRuns.filter((run) => run.configurationId === d.configurationId && run.identity.dataset === state.workload).sort((x, y) => Date.parse(y.runDate) - Date.parse(x.runDate))[0];
      const defaultKey = newest ? variantKey(newest) : own[0]!.key;
      return own.map((variant, index) => {
        const value = variant.key === defaultKey ? d.id : `${d.id}#${index + 1}`;
        if (variant.key === shownKey) currentValue = value;
        choices.set(value, { configurationId: d.configurationId, runId: variant.best.run.id, variant });
        const best = variant.best.capacity.sustainableTpmPerGpu;
        return {
          value, label, group,
          detail: variant.chips.length ? variant.chips.join(" · ") : "no recorded runtime_config keys",
          meta: [
            `${plural(variant.runCount, "run")}${variant.runtimeCount > 1 ? ` · best of ${variant.runtimeCount} runtimes` : ""}`,
            best === null ? "measured · none inside SLO" : `${num(best)} tok/min/GPU`,
          ],
          keywords: [d.id, d.exportLabel, d.precision, ...variant.chips, ...variant.runtimeVersions],
        };
      });
    });
  const currentVariant = choices.get(currentValue)?.variant ?? null;
  const runOptions: ComboOption[] = runs.map((run) => ({
    value: run.id, label: `${run.runDate.slice(0, 10)} · ${run.identity.dataset}`, detail: run.identity.runtimeVersion, group: run.identity.dataset, keywords: [run.identity.runtimeVersion],
  }));
  const currentRun = runs.find((run) => run.id === shown.runId);
  const chipText = configChips(shown);
  return (
    <div className="flex flex-wrap items-end gap-2" data-testid="throughput-selectors">
      <Field label="Base model" className="max-sm:w-full sm:w-[176px]">
        <Combobox label="Base model" testId="throughput-model" value={b.modelId} options={modelOptions} searchPlaceholder="Search models…" className="w-full"
          onChange={(value) => select(rows.filter((row) => row.deployment.modelId === value))} />
      </Field>
      <Field label="Runtime" className="max-sm:w-full sm:w-[208px]">
        <Combobox label="Runtime" testId="throughput-runtime" value={runtimeKey(b)} options={runtimeOptions} searchPlaceholder="Search runtimes…" className="w-full"
          onChange={(value) => select(ofModel.filter((row) => runtimeKey(row.deployment) === value))} />
      </Field>
      <Field label="Hardware" className="max-sm:w-full sm:w-[148px]">
        <Combobox label="Hardware" testId="throughput-hardware" value={hardwareKey(b)} options={hardwareOptions} searchPlaceholder="Search shapes…" className="w-full"
          onChange={(value) => select(ofRuntime.filter((row) => hardwareKey(row.deployment) === value))} />
      </Field>
      <Field label="Runtime config" className="max-sm:w-full sm:w-[min(340px,100%)] sm:flex-1 sm:min-w-[240px]">
        <Combobox
          label="Runtime config" testId="run-picker" value={currentValue} options={configOptions} searchPlaceholder="Search export, knob, chip, version…" wrap className="w-full"
          contentClassName="w-[max(var(--radix-popover-trigger-width),min(500px,calc(100vw-32px)))]"
          onChange={(value) => {
            const choice = choices.get(value);
            if (choice) onPickConfig(choice.configurationId, choice.runId);
            else updateView((s) => { s.run = rows.find((row) => row.deployment.id === value)?.deployment.configurationId ?? value; s.runPick = ""; });
          }}
          triggerLabel={
            <span className="flex min-w-0 flex-col">
              <span className="truncate" data-testid="run-picker-summary">
                <span className="font-medium">{shown.exportLabel}</span> · {shown.knob ?? "Baseline"}{" "}
                <span className="text-muted-foreground text-xs" title={currentVariant ? "Runs and engine versions of this runtime config on the active dataset" : "Runs of this configuration (all datasets)"}>· {currentVariant ? `${plural(currentVariant.runCount, "run")}${currentVariant.runtimeCount > 1 ? ` · ${currentVariant.runtimeCount} runtimes` : ""}` : runsLabel(runCount(b))}</span>
              </span>
              <span className="text-muted-foreground font-mono text-[11px] [overflow-wrap:anywhere]" data-testid="run-picker-chips">{chipText.length ? chipText.join(" · ") : "default arguments"}</span>
            </span>
          }
        />
      </Field>
      {runs.length ? (
        <Field label="Run" className="max-sm:w-full sm:w-[222px]">
          <Combobox
            label="Run" testId="run-history" value={shown.runId ?? ""} options={runOptions} searchPlaceholder="Search runs…" align="end" className="w-full"
            onChange={(value) => { const run = runs.find((item) => item.id === value); if (run) onPickRun(run); }}
            triggerLabel={<span className="truncate tabular-nums">{currentRun ? `${currentRun.runDate.slice(0, 10)} · ${currentRun.identity.dataset}` : `${plural(runs.length, "run")} · none on this dataset`}</span>}
          />
        </Field>
      ) : null}
    </div>
  );
}

/**
 * Workloads and Add to compare: visible buttons (never in an overflow menu), placed in the page header so the
 * selector row stays one line at 1440 and the SLO evaluation table starts inside the first viewport.
 */
export function ThroughputActions({ shown }: { shown: Deployment }) {
  return (
    <>
      <Button variant="outline" onClick={openWorkloads} data-testid="throughput-workloads" className="max-sm:flex-1"><BookOpen aria-hidden="true" />Workloads</Button>
      <Button variant="outline" onClick={() => addToCompare(shown.id)} data-testid="throughput-add-compare" className="max-sm:flex-1"><Columns2 aria-hidden="true" />Add to compare</Button>
    </>
  );
}

/**
 * Identity line: evidence state and date, status, hardware label and GPU totals, the run's recorded runtime_version
 * (beside, never instead of, the configured build), latest run when an older one is shown, and the warnings that
 * change how a number reads (legacy dataset, incomplete requests, GPU count or divisor), grouped with the run tag.
 * The knob string is not repeated here: the Runtime config trigger above states it. Separators are flex gaps.
 * Serve command expands below; "All setups of this model" opens the TL;DR.
 */
export function IdentityLine({ row, latestRunDate }: { row: RankedDeployment; latestRunDate: string | null }) {
  const d = row.deployment;
  const measured = isMeasured(d);
  const [open, setOpen] = React.useState(false);
  const legacy = workloadOf(d.workloadId)?.tags.includes("legacy") ?? false;
  const latest = latestRunDate?.slice(0, 10) ?? null;
  return (
    <section className="space-y-2" aria-label="Configuration identity">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs" data-testid="throughput-identity">
        <Badge variant={measured ? "good" : "neutral"}>{measured ? `Measured · ${d.measuredAt?.slice(0, 10)}` : "Reference · no run"}</Badge>
        <StatusBadge deployment={d} />
        <Badge variant="mono" data-testid="identity-hardware" title="<replicas>x<GPUs per replica><GPU type>; read as GPUs per replica">{hardwareShape(d)}</Badge>
        <span className="text-ink-2 tabular-nums" data-testid="identity-gpus" title={d.replicas === null ? "Catalog shape at one KServe replica; a run records its replica count" : "GPUs per replica × recorded system replicas"}>{gpuTotals(d)}</span>
        {/* Run tag, latest-run note and warnings form one group, so a warning badge never wraps onto a line alone. */}
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1.5" data-testid="identity-run">
          {measured && d.runtimeTag ? <span className="text-muted-foreground" title="Run runtime_version (recorded); the configured build is in the Runtime picker">run <span className="text-foreground font-mono">{d.runtimeTag}</span></span> : null}
          {measured && latest && latest !== d.measuredAt?.slice(0, 10) ? <span className="text-muted-foreground" data-testid="identity-latest">latest run {latest}</span> : null}
          {legacy ? <Badge variant="warning" data-testid="legacy-badge" title="V1 profile, not prefix-immune: compare with care">legacy dataset</Badge> : null}
          {measured ? <IncompleteBadge count={row.capacity.incomplete} /> : null}
          {measured ? <ErroredBadge count={row.capacity.errored} /> : null}
          {d.topologyMismatch ? <Badge variant="warning" title={`Run used ${gpusOf(d)} GPUs; the catalog shape has ${d.gpus}.`}>GPU count differs</Badge> : null}
          {gpuDivisorUnconfirmed(d) ? <Badge variant="warning" data-testid="gpu-divisor-unconfirmed" title={`${d.replicas} system replicas: tok/min/GPU divides by num_gpus = ${gpusOf(d)}, read as GPUs per replica (unconfirmed). If throughput is aggregated over replicas, the per-GPU figure is overstated by ×${d.replicas}.`}>GPU divisor unconfirmed</Badge> : null}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <a href={routeUrl("tldr", { model: d.modelId })} data-testid="throughput-all-setups" aria-label={`All setups of ${modelOf(d)?.name ?? d.modelId} (TL;DR)`} title={`Every setup of ${modelOf(d)?.name ?? d.modelId} ranked by sustainable tok/min/GPU (TL;DR)`}>
              <ListOrdered aria-hidden="true" />All setups
            </a>
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" aria-expanded={open} aria-controls="throughput-serve" onClick={() => setOpen((value) => !value)} data-testid="serve-toggle" title="Configured command from the catalog">
            <SquareTerminal aria-hidden="true" />Serve command<ChevronDown className={cn("transition-transform", open && "rotate-180")} aria-hidden="true" />
          </Button>
        </span>
      </div>
      {open ? (
        <div id="throughput-serve" className="space-y-2">
          <CommandBlock className="shadow-panel" testId="throughput-serve-command" title={`Configured command (catalog) · ${engineBuildDetail(d)}`} caption={<><span className="font-mono">{d.exportHfId}@{shortSha(d.artifactRevision)}</span> · KServe container command · what the catalog configures, not a record of the run</>} command={d.command} />
          {measured ? (
            <RecordedOverridesNote deployment={d} testId="serve-run-overrides" action={
              <button type="button" className="text-link inline-flex items-center gap-0.5 font-medium hover:underline" onClick={() => updateView((s) => { s.runTab = "configuration"; })} data-testid="serve-open-configuration">
                Recorded runtime_config<ArrowUpRight className="size-3" aria-hidden="true" />
              </button>
            } />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** Runs of this configuration, newest first (all datasets and runtime versions). */
export const runsOf = (d: Deployment): BenchmarkRun[] =>
  (appState.snapshot.runs ?? []).filter((run) => run.configurationId === d.configurationId).sort((a, b) => Date.parse(b.runDate) - Date.parse(a.runDate));
