import type { Deployment } from "../../../domain/types.js";
import { artifact } from "../../lib/atlas.js";
import { gpusOf, runtimeTag } from "../../lib/display.js";

/**
 * Run identity (seven-column upsert key of the experiments table) as it would be written for this configuration.
 * max_system_replicas is the KServe replica count recorded by a run; the catalog does not know it (never in-engine DP).
 */
export function runIdentity(d: Deployment, dataset: string): [string, string][] {
  return [
    ["model_name", artifact(d.artifactId)?.slug ?? d.artifactId],
    ["gpu_type", d.gpuType],
    ["num_gpus", String(gpusOf(d))],
    ["max_system_replicas", d.replicas === null ? "—" : String(d.replicas)],
    ["runtime_version", runtimeTag(d)],
    ["dataset", dataset],
    ["runtime_config", d.runConfig ? `${Object.keys(d.runConfig).length} recorded keys` : d.knob ? `${d.knob} · ${d.engineArgs.length} args` : `baseline · ${d.engineArgs.length} args`],
  ];
}
