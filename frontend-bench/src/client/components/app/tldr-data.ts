import * as React from "react";
import { rank } from "../../../domain/metrics.js";
import { variantRows, type VariantRow } from "../../../domain/variants.js";
import { configChips } from "../../../domain/config-chips.js";
import type { Deployment, RankedDeployment, Snapshot } from "../../../domain/types.js";
import { useAppState } from "../../state.js";
import { gpusOf, isMeasured, publisherQuality } from "../../lib/display.js";
import { artifact } from "../../lib/atlas.js";

/*
 * TL;DR data: ranked rows per dataset under the active SLO, the selected model and GPU shape, and the labels the
 * setups table and sheet share. Ranking and Δ live in domain/setups.ts, variants in domain/variants.ts; this
 * file only selects rows. It never reads the external published layer (tests/external.test.ts walks its imports).
 */

/** Ranked rows (newest run per configuration) for every dataset under the active SLO. Model detail's ladder uses these. */
export function useRowsByWorkload(): Map<string, RankedDeployment[]> {
  const state = useAppState();
  return React.useMemo(
    () => new Map(state.snapshot.workloads.map((workload) => [workload.id, rank(state.snapshot, workload.id, state.slo, publisherQuality)])),
    [state.snapshot, state.snapshot.deployments.length, state.slo, state.slo.prefillTps, state.slo.itlP95Ms, state.slo.margin, state.slo.minSuccessRate],
  );
}

/**
 * Variant rows for every dataset under the active SLO: one row per measured variant (configuration × shape × recorded
 * runtime_config, fronted by its best run across engine versions) plus one planning row per configuration without a
 * run on that dataset. Each dataset groups only its own runs, so datasets are never mixed.
 */
export function useVariantRowsByWorkload(): Map<string, VariantRow[]> {
  const state = useAppState();
  return React.useMemo(() => {
    const runs = state.snapshot.runs ?? [];
    return new Map(state.snapshot.workloads.map((workload) => [workload.id, variantRows(state.snapshot, workload.id, state.slo, {
      qualityOf: publisherQuality, runs: runs.filter((run) => run.identity.dataset === workload.id),
    })]));
  }, [state.snapshot, state.snapshot.deployments.length, state.snapshot.runs?.length, state.slo, state.slo.prefillTps, state.slo.itlP95Ms, state.slo.margin, state.slo.minSuccessRate]);
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
export const rowsFor = <T extends RankedDeployment>(rows: readonly T[] | undefined, modelId: string, shape: string): T[] =>
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

/* ── variant facets (filters, matrix) ─────────────────────────────────────────────────────────── */

/** Knob chips of a row: the variant's recorded runtime_config, else the catalog's configured engine arguments. */
export const chipsOf = (row: RankedDeployment): string[] => configChips(row.deployment);
/** Full knob string ("kv fp8 · eagle ×3 · seqs 256 · …"), every recorded key kept; "" when nothing is recorded. */
export const knobString = (row: RankedDeployment): string => chipsOf(row).join(" · ");
/** Weights precision class of the export (catalog artifact), else the configuration's precision. */
export const precisionOf = (deployment: Deployment): string => artifact(deployment.artifactId)?.precision ?? deployment.precision;

/**
 * Speculative decoding enabled: read from the recorded runtime_config when the row is measured (what ran), else from
 * the configured engine arguments. Never inferred from the knob name.
 */
export function specDecodeOf(deployment: Deployment): boolean {
  const config = deployment.runConfig;
  if (config) return Boolean(config.speculative_config || config.speculative_algorithm);
  return deployment.engineArgs.some((arg) => /^--speculative-(config|algorithm)\b/.test(arg));
}

/**
 * Chips that tell a variant apart from the other variants of the same configuration in `rows` (recorded knobs not
 * shared by all of them), at most `max`; [] when the configuration has a single row.
 */
export function distinctChips(row: VariantRow, rows: readonly VariantRow[], max = 2): string[] {
  const siblings = rows.filter((other) => other.deployment.id === row.deployment.id && other.key !== row.key);
  if (!siblings.length) return [];
  const own = chipsOf(row);
  const shared = (chip: string) => siblings.every((other) => chipsOf(other).includes(chip));
  return own.filter((chip) => !shared(chip)).slice(0, max);
}

/** Setup name plus the chips that distinguish it from sibling variants: "FP8 · Baseline · vLLM · seqs 512 · prefix cache on". */
export const variantName = (row: VariantRow, rows: readonly VariantRow[]): string =>
  [setupName(row.deployment), ...distinctChips(row, rows)].join(" · ");

/** Engine families on a row set, vLLM first. */
export const enginesOf = (rows: readonly RankedDeployment[]): string[] =>
  [...new Set(rows.map((row) => row.deployment.runtime))].sort((a, b) => (a === "vLLM" ? -1 : b === "vLLM" ? 1 : a.localeCompare(b)));
