import type { Workload } from "../../../domain/types.js";

/**
 * Workload profile: a console classification of a dataset's per-turn token budget, not a dataset label.
 * Reference: the balanced-profile dataset budget (8,000 input ÷ 500 output = 16). A dataset tagged
 * "balanced profile" is Balanced; otherwise input ÷ output below 16 reads decode-intensive and above 16
 * prefill-intensive. A dataset without a fixed budget has no profile (null), never a guessed one.
 */
export type WorkloadProfile = "Balanced" | "Decode-intensive" | "Prefill-intensive";

export const BALANCED_RATIO = 8000 / 500;

export function workloadProfile(workload: Pick<Workload, "inputTokens" | "outputTokens" | "tags"> | null | undefined): WorkloadProfile | null {
  if (!workload) return null;
  if (workload.tags.includes("balanced profile")) return "Balanced";
  const { inputTokens: input, outputTokens: output } = workload;
  if (input === null || output === null || !(input > 0) || !(output > 0)) return null;
  const ratio = input / output;
  return ratio === BALANCED_RATIO ? "Balanced" : ratio < BALANCED_RATIO ? "Decode-intensive" : "Prefill-intensive";
}

export const PROFILE_HINT =
  "Console classification of the per-turn token budget: input ÷ output against the balanced profile (8,000 ÷ 500 = 16). Lower reads decode-intensive, higher prefill-intensive. Not a dataset label.";

/** "8,000 in / 500 out" (per turn, plus "· 8 turns"); null without a fixed budget. */
export function budgetLabel(workload: Pick<Workload, "inputTokens" | "outputTokens" | "turns"> | null | undefined, format: (value: number) => string): string | null {
  if (!workload || workload.inputTokens === null || workload.outputTokens === null) return null;
  return `${format(workload.inputTokens)} in / ${format(workload.outputTokens)} out${workload.turns > 1 ? ` · ${workload.turns} turns` : ""}`;
}
