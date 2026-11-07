import * as React from "react";
import { rank } from "../../../domain/metrics.js";
import type { Deployment, RankedDeployment, Snapshot } from "../../../domain/types.js";
import { useAppState } from "../../state.js";
import { gpusOf, isMeasured, publisherQuality } from "../../lib/display.js";

/*
 * TL;DR data: ranked rows per dataset under the active SLO, the selected model and GPU shape, and the labels the
 * setups table and champions share. Ranking and Δ live in domain/setups.ts; this file only selects rows.
 */

/** Ranked rows for every dataset under the active SLO, computed once per snapshot/SLO change. */
export function useRowsByWorkload(): Map<string, RankedDeployment[]> {
  const state = useAppState();
  return React.useMemo(
    () => new Map(state.snapshot.workloads.map((workload) => [workload.id, rank(state.snapshot, workload.id, state.slo, publisherQuality)])),
    [state.snapshot, state.snapshot.deployments.length, state.slo, state.slo.prefillTps, state.slo.itlP95Ms, state.slo.margin, state.slo.minSuccessRate],
  );
}

/** GPU shape key of the numbers: the run's num_gpus when measured, else the catalog count, × gpu_type ("8xB300"). */
export const shapeKey = (deployment: Deployment): string => `${gpusOf(deployment)}x${deployment.gpuType}`;
/** "8xB300" → "8× B300". */
export const shapeLabel = (key: string): string => key.replace(/^(\d+)x/, "$1× ");

/** Default TL;DR model: the first catalog model with any measured run (any dataset), else the first model. */
export function defaultModelId(snapshot: Snapshot): string {
  const measured = new Set(snapshot.deployments.filter(isMeasured).map((deployment) => deployment.modelId));
  return snapshot.models.find((model) => measured.has(model.id))?.id ?? snapshot.models[0]?.id ?? "";
}

/** The model the TL;DR shows: the URL's model when it exists, else the default. */
export function useTldrModelId(): string {
  const state = useAppState();
  return state.model !== "all" && state.snapshot.models.some((model) => model.id === state.model) ? state.model : defaultModelId(state.snapshot);
}

/** Rows of one model on one dataset, optionally restricted to one GPU shape ("" = all shapes). */
export const rowsFor = (rows: readonly RankedDeployment[] | undefined, modelId: string, shape: string): RankedDeployment[] =>
  (rows ?? []).filter((row) => row.model.id === modelId && (!shape || shapeKey(row.deployment) === shape));

/** Readable publisher for a catalog company slug; unknown slugs are title-cased. */
const PUBLISHERS: Record<string, string> = {
  "moonshot-ai": "Moonshot AI", "z-ai": "Z.ai", deepseek: "DeepSeek", "alibaba-qwen": "Alibaba Qwen", google: "Google",
  "mistral-ai": "Mistral AI", meta: "Meta",
};
export const publisherLabel = (company: string): string =>
  PUBLISHERS[company] ?? company.split("-").map((part) => (part === "ai" ? "AI" : part.charAt(0).toUpperCase() + part.slice(1))).join(" ");

/** Setup name inside one model: export · knob ("Baseline" when none) · engine. Used for Name sort and labels. */
export const setupName = (deployment: Deployment): string => `${deployment.exportLabel} · ${deployment.knob ?? "Baseline"} · ${deployment.runtime}`;
