import type { Deployment, Experiment, ExperimentInput, ExperimentStatus, Snapshot } from "./types.js";
export const STATUSES: ExperimentStatus[] = ["Backlog", "Scheduled", "Running", "Complete", "Failed"];
export class ValidationError extends Error { readonly _tag = "ValidationError"; }
export class ConflictError extends Error { readonly _tag = "ConflictError"; }
export const TRANSITIONS: Record<ExperimentStatus, ExperimentStatus[]> = {
  Backlog: ["Scheduled"], Scheduled: ["Backlog", "Running"], Running: ["Complete", "Failed"], Complete: [], Failed: ["Backlog"],
};
export const MAX_DATASETS = 6;
/** GPUs the scheduler reserves for one card: the configuration's GPU count (TP × in-engine DP), per dataset run. */
export const gpuFootprint = (deployment: Pick<Deployment, "gpus">): number => deployment.gpus;

/**
 * Datasets for a card: 1–6 unique names from the snapshot's workloads. When the field is absent (records
 * written before datasets existed, or API clients that omit it) the configuration's own dataset is used.
 */
export function parseDatasets(value: unknown, snapshot: Snapshot, fallback: string): string[] {
  if (value === undefined || value === null) return [fallback];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new ValidationError("Datasets must be a list of dataset names");
  const datasets = [...new Set(value as string[])];
  if (datasets.length !== value.length) throw new ValidationError("Each dataset may appear once");
  if (datasets.length < 1 || datasets.length > MAX_DATASETS) throw new ValidationError(`Choose 1–${MAX_DATASETS} datasets`);
  const unknown = datasets.find((id) => !snapshot.workloads.some((workload) => workload.id === id));
  if (unknown !== undefined) throw new ValidationError(`Unknown dataset: ${unknown}`);
  // Keep the catalog's dataset order so equal selections serialize identically.
  return snapshot.workloads.map((workload) => workload.id).filter((id) => datasets.includes(id));
}

export function parseExperiment(input: unknown, snapshot: Snapshot): ExperimentInput {
  if (!input || typeof input !== "object") throw new ValidationError("Expected an experiment object");
  const value = input as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const requested = typeof value.deploymentId === "string" ? value.deploymentId : "";
  const scheduledDate = typeof value.scheduledDate === "string" ? value.scheduledDate : "";
  const notes = typeof value.notes === "string" ? value.notes.trim() : "";
  const blocked = typeof value.blockedReason === "string" ? value.blockedReason.trim() : "";
  if (name.length < 3 || name.length > 100) throw new ValidationError("Name must contain 3–100 characters");
  const deployment = snapshot.deployments.find((item) => item.id === requested);
  if (!deployment) throw new ValidationError("Choose an existing configuration");
  // A card plans a base configuration; a measured "<configuration>@<dataset>" id resolves to its base.
  const deploymentId = deployment.configurationId;
  if (!snapshot.deployments.some((item) => item.id === deploymentId)) throw new ValidationError("Choose an existing configuration");
  const datasets = parseDatasets(value.datasets, snapshot, deployment.workloadId);
  if (value.blockedReason !== undefined && value.blockedReason !== null && typeof value.blockedReason !== "string") throw new ValidationError("Blocked reason must be text");
  if (blocked.length > 200) throw new ValidationError("Blocked reason must contain at most 200 characters");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || !Number.isFinite(Date.parse(scheduledDate)) || new Date(scheduledDate).toISOString().slice(0, 10) !== scheduledDate) throw new ValidationError("Choose a valid calendar date");
  if (notes.length > 1000) throw new ValidationError("Notes must contain at most 1,000 characters");
  if (value.priority !== "Normal" && value.priority !== "High") throw new ValidationError("Invalid priority");
  return { name, deploymentId, datasets, scheduledDate, notes, priority: value.priority, blockedReason: blocked || null };
}
/**
 * Upgrade a stored card (local storage or a scheduled_experiments document) to the current shape:
 * datasets default to the configuration's dataset, blockedReason to null, deploymentId to its base.
 * Returns null for records that no longer resolve against the catalog.
 */
export function migrateExperiment(raw: unknown, snapshot: Snapshot): Experiment | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<Experiment> & Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.name !== "string" || !STATUSES.includes(item.status as ExperimentStatus) || !Number.isInteger(item.version)) return null;
  const deployment = snapshot.deployments.find((d) => d.id === item.deploymentId);
  if (!deployment) return null;
  let datasets: string[];
  try { datasets = parseDatasets(item.datasets, snapshot, deployment.workloadId); } catch { datasets = [deployment.workloadId]; }
  return {
    id: item.id, name: item.name, deploymentId: deployment.configurationId, datasets,
    status: item.status as ExperimentStatus, priority: item.priority === "High" ? "High" : "Normal",
    scheduledDate: typeof item.scheduledDate === "string" ? item.scheduledDate : "", owner: typeof item.owner === "string" ? item.owner : "",
    notes: typeof item.notes === "string" ? item.notes : "", blockedReason: typeof item.blockedReason === "string" && item.blockedReason ? item.blockedReason : null,
    version: item.version as number, createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
  };
}
export function transitionExperiment(experiment: Experiment, status: ExperimentStatus, version: number): Experiment {
  if (version !== experiment.version) throw new ConflictError("This experiment changed. Refresh and try again.");
  if (!TRANSITIONS[experiment.status].includes(status)) throw new ValidationError(`Cannot move ${experiment.status} to ${status}`);
  return { ...experiment, status, version: experiment.version + 1 };
}
