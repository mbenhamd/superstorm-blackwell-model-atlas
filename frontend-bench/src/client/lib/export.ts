import { atlasMeta } from "./atlas.js";
import { safeCsv } from "../../domain/metrics.js";
import type { RankedDeployment } from "../../domain/types.js";
import { appState } from "../state.js";
import { toast } from "./toast.js";
import { modelQuality, rankedRows } from "./display.js";
import { gpuFootprint } from "../../domain/validation.js";
import { runIdentity } from "../components/app/throughput-identity.js";

function download(filename: string, content: string, mime = "application/json"): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
/** Every exported row states its evidence class (reference or measured), the exact export and the active policy. */
export function exportRows(rows: RankedDeployment[], name = "configurations"): void {
  const policy = appState.slo;
  const test = Boolean(appState.snapshot.testData);
  const round = (value: number | null, digits = 1) => value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits;
  download(`bench-${name}${test ? "-TEST-DATA" : ""}.csv`, safeCsv([
    ["Evidence", "Configuration ID", "Configuration", "Model", "Export", "Export revision", "Precision", "Status", "Engine", "Configured build", "Latest recheck release", "Tested on B300", "Run runtime_version", "Hardware", "GPUs", "System replicas (run)", "Workload", "AA Intelligence Index v5.0.1 (base model, published)",
      "Sustainable total tok/min/GPU (computed from measured, ×margin)", "Sustainable output tok/min/GPU (computed from measured, ×margin)", "Observed total tok/s/GPU at C_max (measured, no margin)", "C_max (concurrency)", "TTFT p95 at C_max (ms)", "ITL p95 at C_max (ms)", "Incomplete requests (all levels)",
      "SLO preset", "Policy prefill speed (tok/s)", "Policy ITL p95 ceiling (ms)", "Policy min success rate", "Policy margin", "Catalog as of"],
    ...rows.map((row) => {
      const d = row.deployment, c = row.capacity;
      return [test && d.evidence === "measured" ? "TEST DATA (invented fixture)" : d.evidence, d.id, [row.model.name, d.exportLabel, d.runtime, `TP${d.tensorParallel}`, d.knob].filter(Boolean).join(" · "), row.model.name, d.exportHfId, d.artifactRevision, d.precision, d.status, d.runtime, d.runtimeVersion, d.recheck?.engineRelease ?? null, d.testedOnTarget ? "yes" : "no", d.runtimeTag,
        row.hardware.name, d.runGpus ?? d.gpus, d.replicas, d.workloadId, row.quality ?? modelQuality(row.model.id),
        round(c.sustainableTpmPerGpu, 0), round(c.sustainableOutputTpmPerGpu, 0), round(c.observedTotalTpsPerGpu), c.highestPassingConcurrency, c.selectedPoint?.ttftP95Ms ?? null, c.selectedPoint?.itlP95Ms ?? null, c.incomplete,
        policy.preset, policy.prefillTps, policy.itlP95Ms, policy.minSuccessRate, policy.margin, atlasMeta.asOf];
    }),
  ]), "text/csv;charset=utf-8");
  toast("CSV downloaded", test ? "TEST DATA: the measured columns are invented fixture values." : "Rows carry their evidence class and the active SLO policy. Unmeasured rows have empty result columns.");
}
export function exportCompared(): void {
  // Exactly the rows on screen: active dataset and SLO, publisher-only AA quality, matched on the base configuration id
  // (a measured row's id is `<cfg>@<dataset>`).
  exportRows(rankedRows().filter((row) => appState.compare.includes(row.deployment.configurationId)), "comparison");
}
export function exportRun(id: string): void {
  const deployment = appState.snapshot.deployments.find((item) => item.id === id);
  if (!deployment) return;
  download(`bench-${deployment.id}.json`, JSON.stringify({ evidence: deployment.evidence, ...(appState.snapshot.testData ? { testData: "TEST DATA: invented fixture values, not a measurement" } : {}), catalogAsOf: atlasMeta.asOf, policy: appState.slo, deployment }, null, 2));
  toast("Configuration JSON downloaded", deployment.evidence === "measured" ? "Measured run with the active SLO policy." : "Reference configuration; no measured run is attached.");
}
export function exportExperiments(): void {
  // Planning columns of the scheduler row plus the run identities each card would produce (one per dataset).
  // Execution columns (execution_state, timestamps, scheduler_run_id, code_commit, error_note) belong to the scheduler.
  const experiments = appState.snapshot.experiments.map((item) => {
    const deployment = appState.snapshot.deployments.find((d) => d.id === item.deploymentId);
    return {
      ...item,
      configuration_id: deployment?.configurationId ?? item.deploymentId,
      gpu_footprint: deployment ? gpuFootprint(deployment) : null,
      blocked: Boolean(item.blockedReason),
      run_identities: deployment ? item.datasets.map((dataset) => Object.fromEntries(runIdentity(deployment, dataset))) : [],
    };
  });
  download("bench-experiment-plan.json", JSON.stringify({ catalogAsOf: atlasMeta.asOf, kind: "planning records (no runs executed)", experiments }, null, 2));
  toast("Plan downloaded", "Experiment records only. No jobs were launched.");
}
