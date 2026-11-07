import type { Deployment } from "./types.js";

/**
 * Engine-equivalent runtime controls, normalised across vLLM and SGLang so two configurations (or a run and its
 * configured command) can be compared key by key. Source per control: the run's recorded runtime_config when it
 * records the control (what ran), otherwise the catalog's configured engine arguments (what is configured), else
 * unset (engine default). Names map; semantics can differ and are not asserted equal beyond the value mapping below.
 *
 * Value normalisation (explicit, not inferred): KV dtype lower-cased with "fp8_e4m3" read as "fp8" (vLLM's "fp8"
 * selects E4M3); numbers in canonical decimal form; prefix caching as "on" / "off" (SGLang's disable_radix_cache
 * inverted). Nothing else is translated.
 */
export type ControlKey = "kv_cache_dtype" | "max_num_seqs" | "memory_fraction" | "prefix_caching" | "max_model_len";

interface ControlSpec {
  key: ControlKey;
  label: string;
  /** Recorded runtime_config keys (vLLM name first). */
  recorded: string[];
  /** Engine flags (vLLM and SGLang spellings). */
  flags: string[];
  normalise: (value: unknown, source: string) => string | null;
}

const text = (value: unknown): string | null => typeof value === "string" ? value.trim() || null : typeof value === "number" && Number.isFinite(value) ? String(value) : null;
const numeric = (value: unknown): string | null => {
  const raw = text(value);
  if (raw === null || !/^-?\d+(\.\d+)?$/.test(raw)) return raw;
  return String(Number(raw));
};
const kv = (value: unknown): string | null => {
  const raw = text(value)?.toLowerCase() ?? null;
  return raw === "fp8_e4m3" ? "fp8" : raw;
};
const bool = (value: unknown): boolean | null => value === true || value === "true" || value === "on" ? true : value === false || value === "false" || value === "off" ? false : null;
const prefix = (value: unknown, source: string): string | null => {
  if (source === "--no-enable-prefix-caching" || source === "--disable-radix-cache") return "off";
  if (source === "--enable-prefix-caching") return bool(value) === false ? "off" : "on";
  const flag = bool(value);
  if (flag === null) return null;
  const on = source === "disable_radix_cache" ? !flag : flag;
  return on ? "on" : "off";
};

export const CONTROLS: readonly ControlSpec[] = [
  { key: "kv_cache_dtype", label: "KV dtype", recorded: ["kv_cache_dtype"], flags: ["--kv-cache-dtype"], normalise: kv },
  { key: "max_num_seqs", label: "Max sequences", recorded: ["max_num_seqs", "max_running_requests"], flags: ["--max-num-seqs", "--max-running-requests"], normalise: numeric },
  { key: "memory_fraction", label: "Memory fraction", recorded: ["gpu_memory_utilization", "mem_fraction_static"], flags: ["--gpu-memory-utilization", "--mem-fraction-static"], normalise: numeric },
  { key: "prefix_caching", label: "Prefix cache", recorded: ["enable_prefix_caching", "disable_radix_cache"], flags: ["--enable-prefix-caching", "--no-enable-prefix-caching", "--disable-radix-cache"], normalise: prefix },
  { key: "max_model_len", label: "Context length", recorded: ["max_model_len", "context_length"], flags: ["--max-model-len", "--context-length"], normalise: numeric },
];

export interface ControlValue {
  key: ControlKey;
  label: string;
  /** Normalised value; null when neither the run nor the command sets it (engine default). */
  value: string | null;
  source: "recorded" | "configured" | "default";
  /** The recorded key or the flag that carried the value, and its verbatim value. */
  field: string | null;
  raw: string | null;
}

/** flag → value ("" for a boolean flag), last occurrence wins. */
function flagValues(args: readonly string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (!arg.startsWith("--")) continue;
    const [name, inline] = arg.split("=", 2) as [string, string | undefined];
    const next = args[index + 1];
    const value = inline ?? (next !== undefined && !next.startsWith("--") ? next : "");
    if (inline === undefined && value) index += 1;
    map.set(name, value);
  }
  return map;
}

const verbatim = (value: unknown): string => typeof value === "string" ? value : JSON.stringify(value);

/** The control as configured by the catalog command only (ignores any recorded run). */
export function configuredControl(d: Pick<Deployment, "engineArgs">, spec: ControlSpec): ControlValue {
  const flags = flagValues(d.engineArgs);
  for (const flag of spec.flags) {
    if (!flags.has(flag)) continue;
    const raw = flags.get(flag)!;
    return { key: spec.key, label: spec.label, value: spec.normalise(raw, flag), source: "configured", field: flag, raw: raw || "on" };
  }
  return { key: spec.key, label: spec.label, value: null, source: "default", field: null, raw: null };
}

/** The control as the run recorded it; null when the run recorded no runtime_config or not this control. */
export function recordedControl(d: Pick<Deployment, "runConfig">, spec: ControlSpec): ControlValue | null {
  if (!d.runConfig) return null;
  for (const field of spec.recorded) {
    if (!(field in d.runConfig)) continue;
    const raw = d.runConfig[field];
    return { key: spec.key, label: spec.label, value: spec.normalise(raw, field), source: "recorded", field, raw: verbatim(raw) };
  }
  return null;
}

/** Every control of a configuration: recorded when the run records it, else configured, else default. */
export function effectiveControls(d: Pick<Deployment, "runConfig" | "engineArgs">): ControlValue[] {
  return CONTROLS.map((spec) => recordedControl(d, spec) ?? configuredControl(d, spec));
}

export interface ControlDifference { key: ControlKey; label: string; a: ControlValue; b: ControlValue }

/** Controls whose normalised values differ between two configurations (unset on one side counts as a difference). */
export function controlDifferences(a: Pick<Deployment, "runConfig" | "engineArgs">, b: Pick<Deployment, "runConfig" | "engineArgs">): ControlDifference[] {
  const left = effectiveControls(a), right = effectiveControls(b);
  return left.flatMap((x, index) => {
    const y = right[index]!;
    return x.value === y.value ? [] : [{ key: x.key, label: x.label, a: x, b: y }];
  });
}

/** "256 (recorded)" / "32 (configured)" / "default". */
export const controlText = (value: ControlValue): string => value.value === null ? "default" : `${value.raw ?? value.value} (${value.source})`;

/**
 * Recorded values that differ from an explicit value in the configured command of the same configuration, e.g.
 * the run recorded kv_cache_dtype fp8 while the catalog command passes --kv-cache-dtype auto. Controls the command
 * does not set are not listed (the command does not state a value to contradict).
 */
export function recordedOverrides(d: Pick<Deployment, "runConfig" | "engineArgs">): { recorded: ControlValue; configured: ControlValue }[] {
  return CONTROLS.flatMap((spec) => {
    const recorded = recordedControl(d, spec);
    const configured = configuredControl(d, spec);
    return recorded && configured.source === "configured" && recorded.value !== configured.value ? [{ recorded, configured }] : [];
  });
}
