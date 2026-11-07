import type { Deployment } from "./types.js";

/**
 * Short knob chips for a configuration, in the console's vocabulary ("kv fp8", "eagle ×3", "mtp ×5", "ctx 262144").
 * Source: the applied run's recorded runtime_config when present (what actually ran), otherwise the catalog's
 * engine arguments (what is configured). Primary chips come first (KV dtype, speculative decoding, context),
 * then secondary knobs; callers show the first few and fold the rest into "+N". Values are read, never inferred.
 */
export function configChips(deployment: Pick<Deployment, "runConfig" | "engineArgs">): string[] {
  return deployment.runConfig ? fromRunConfig(deployment.runConfig) : fromArgs(deployment.engineArgs);
}

const flagMap = (args: readonly string[]): Map<string, string> => {
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
};

const json = (text: string | undefined): Record<string, unknown> | null => {
  if (!text) return null;
  try { const value = JSON.parse(text) as unknown; return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; } catch { return null; }
};

const kvChip = (value: unknown): string | null => typeof value === "string" && value && value !== "auto" ? `kv ${value}` : null;
const ctxChip = (value: unknown): string | null => (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) ? `ctx ${value}` : null;

function speculativeChip(algorithm: unknown, steps: unknown): string | null {
  if (typeof algorithm !== "string" || !algorithm) return null;
  const name = algorithm.toLowerCase().replace(/_/g, "-");
  const n = typeof steps === "number" ? steps : typeof steps === "string" && /^\d+$/.test(steps) ? Number(steps) : null;
  return n ? `${name} ×${n}` : name;
}

function fromArgs(args: readonly string[]): string[] {
  const flags = flagMap(args);
  const config = json(flags.get("--speculative-config"));
  const primary = [
    kvChip(flags.get("--kv-cache-dtype")),
    config ? speculativeChip(config.method, config.num_speculative_tokens) : speculativeChip(flags.get("--speculative-algorithm"), flags.get("--speculative-num-steps") ?? flags.get("--speculative-dspark-block-size")),
    ctxChip(flags.get("--max-model-len") ?? flags.get("--context-length")),
  ];
  const attention = flags.get("--attention-backend") ?? (json(flags.get("--attention-config"))?.backend as string | undefined);
  const dp = flags.get("--data-parallel-size") ?? flags.get("--dp-size");
  const ep = flags.has("--enable-expert-parallel") || flags.has("--ep-size");
  const seqs = flags.get("--max-num-seqs") ?? flags.get("--max-running-requests");
  const moe = flags.get("--moe-backend") ?? flags.get("--moe-runner-backend");
  const secondary = [
    attention ? `attn ${String(attention).toLowerCase()}` : null,
    ep ? `ep${flags.get("--ep-size") ? ` ${flags.get("--ep-size")}` : ""}` : null,
    dp ? `dp ${dp}` : null,
    seqs ? `seqs ${seqs}` : null,
    moe ? `moe ${moe}` : null,
    flags.get("--quantization") ? `quant ${flags.get("--quantization")}` : null,
  ];
  return [...primary, ...secondary].filter((chip): chip is string => chip !== null);
}

const RUN_KEYS = new Set(["kv_cache_dtype", "speculative_algorithm", "speculative_config", "num_speculative_tokens", "speculative_num_steps", "max_model_len", "context_length", "attention_backend", "max_num_seqs", "max_running_requests", "enable_prefix_caching", "disable_radix_cache"]);
function fromRunConfig(config: Record<string, unknown>): string[] {
  const spec = config.speculative_config && typeof config.speculative_config === "object" ? config.speculative_config as Record<string, unknown> : null;
  const chips = [
    kvChip(config.kv_cache_dtype),
    spec ? speculativeChip(spec.method, spec.num_speculative_tokens) : speculativeChip(config.speculative_algorithm, config.num_speculative_tokens ?? config.speculative_num_steps),
    ctxChip(config.max_model_len ?? config.context_length),
    typeof config.attention_backend === "string" ? `attn ${config.attention_backend.toLowerCase()}` : null,
    config.max_num_seqs ?? config.max_running_requests ? `seqs ${String(config.max_num_seqs ?? config.max_running_requests)}` : null,
    config.enable_prefix_caching === false || config.disable_radix_cache === true ? "prefix cache off" : config.enable_prefix_caching === true ? "prefix cache on" : null,
  ];
  // Remaining recorded keys stay visible as key=value (the "+N" overflow), so nothing recorded is hidden.
  const rest = Object.keys(config).filter((key) => !RUN_KEYS.has(key)).sort().map((key) => `${key}=${typeof config[key] === "object" ? JSON.stringify(config[key]) : String(config[key])}`);
  return [...chips.filter((chip): chip is string => chip !== null), ...rest];
}
