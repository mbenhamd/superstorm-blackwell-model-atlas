/**
 * Token-mixer layer maps for the Architecture page, derived from the pinned atlas snapshot (src/data/atlas.json,
 * models[].configProjection). Pure: no React and no app state. Nothing here is measured; every value is a publisher
 * configuration field or a calculation on those fields, and each map says where its layer order comes from:
 *
 * - recorded: a per-layer field lists the positions (attention-layer index lists, `compress_ratios`);
 * - interval: a recorded interval places the attention layers (layer i is attention when (i + 1) % interval = 0);
 * - ratio-derived: only the counts are recorded; positions follow from their ratio with the minority layer closing
 *   each period, applied only where the atlas architecture report describes that same pattern;
 * - uniform: one mixer kind in every layer, so there is no order to record;
 * - counts-only: counts without positions; drawn as proportional segments marked "order not recorded".
 *
 * Index reuse and KV sharing come from recorded fields. Where the snapshot projection carries only counts, positions
 * are transcribed from the atlas architecture report for the pinned revision (`REPORT`), labelled "report", and the
 * transcription is checked against the recorded counts. A revision change drops the transcription.
 */

export type MixerKind = "full" | "sliding" | "sparse" | "compressed" | "kda" | "gdn";
export type MixerFamily = "attention" | "linear";
export type OrderProvenance = "recorded" | "interval" | "ratio-derived" | "uniform" | "counts-only";
/** Where a per-layer index or KV-sharing schedule comes from. */
export type ScheduleProvenance = "recorded" | "report" | "not-recorded";

export interface MixerKindInfo { label: string; short: string; family: MixerFamily; description: string }

/** Display order: attention kinds, then linear mixers. Legends and counts follow it. */
export const KIND_ORDER: readonly MixerKind[] = ["full", "sliding", "sparse", "compressed", "kda", "gdn"];
export const MIXER_KINDS: Record<MixerKind, MixerKindInfo> = {
  full: { label: "Full attention", short: "full attention", family: "attention", description: "Softmax attention over every cached token (global)." },
  sliding: { label: "Sliding window", short: "sliding window", family: "attention", description: "Softmax attention over a fixed window of recent tokens; the cache is capped at the window." },
  sparse: { label: "Sparse attention", short: "sparse attention", family: "attention", description: "An indexer scores the cached tokens and attention reads only the top-k selection." },
  compressed: { label: "Compressed attention", short: "compressed", family: "attention", description: "Attention over compressed KV entries (one per ratio tokens) plus a recent-token window." },
  kda: { label: "Kimi Delta Attention", short: "KDA", family: "linear", description: "Linear attention with a delta-rule update: a fixed-size recurrent state per sequence, no per-token cache." },
  gdn: { label: "Gated DeltaNet", short: "Gated DeltaNet", family: "linear", description: "Linear attention with a gated delta-rule update: a fixed-size recurrent state per sequence, no per-token cache." },
};
export const FAMILY_LABEL: Record<MixerFamily, string> = { attention: "Attention", linear: "Linear mixers" };

export interface ArchLayer {
  /** Zero-based layer index, as configuration fields count. The page shows one-based "Layer n" (n = index + 1). */
  index: number;
  kind: MixerKind;
  /** This model's implementation, e.g. "gated MLA" or "QSA, GQA 24 / 2". */
  variant: string;
  /** No rotary position embedding in this layer. */
  noRope?: true;
  /** Zero-based layer whose KV cache this layer reads instead of writing its own. */
  kvBorrowedFrom?: number;
  /** true: reuses an earlier layer's top-k selection; false: runs its own indexer; absent: not recorded or no indexer. */
  indexBorrowed?: boolean;
  /** Zero-based layer whose selection is reused, where the source states which one. */
  indexFrom?: number;
  /** Compression ratio of the compressed KV this layer reads (tokens per entry). */
  compressRatio?: number;
  /** Counts-only order: this cell's position is not recorded. */
  positionUnknown?: true;
}

export interface Schedule { provenance: ScheduleProvenance; note: string }
export interface CountCheck { field: string; recorded: number; derived: number }

/** KV cache per token of context (calculation from configuration fields, BF16 = 2 bytes per element). */
export interface KvEstimate {
  /** Bytes per token for layers whose cache grows with context; null when no single formula applies. */
  bytesPerToken: number | null;
  /** Sliding-window layers: bytes per token, held for at most `window` tokens per sequence. */
  windowed?: { bytesPerToken: number; window: number; layers: number };
  /** Formula in words with the field values substituted; empty when bytesPerToken is null. */
  formula: string;
  /** State that the figure leaves out (linear-mixer state, indexer keys). */
  excludes: string[];
  /** Why there is no figure. */
  reason?: string;
  /** The reason in a few words, for table cells. */
  short?: string;
}

export interface ModelArchitecture {
  modelId: string;
  revision: string;
  /** Recorded `layers`. */
  layerCount: number;
  layers: ArchLayer[];
  order: OrderProvenance;
  /** Where the order comes from, in words, naming the fields. */
  orderNote: string;
  /** Non-zero counts per kind, in KIND_ORDER. */
  counts: { kind: MixerKind; count: number }[];
  /** "16 full attention and 48 Gated DeltaNet". */
  summary: string;
  /** Index reuse schedule of sparse or compressed layers; null when the model has no indexer layers. */
  index: (Schedule & { own: number; reused: number; unknown: number }) | null;
  /** Cross-layer KV sharing; null when no layer reads another layer's KV. */
  kvSharing: (Schedule & { borrowed: number }) | null;
  /** NoPE layers; null when every attention layer uses RoPE or the configuration does not say otherwise. */
  noRope: { count: number; note: string } | null;
  /** Further statements about the map (excluded draft entries, ignored transcriptions). */
  notes: string[];
  /** Recorded count fields compared with the derived map (unit-tested, listed in the sheet). */
  checks: CountCheck[];
  kv: KvEstimate;
}

/* ------------------------------------------------------------------------------------------------------------------ */

type Projection = Record<string, unknown>;
export interface ArchitectureInput {
  id: string;
  revision: string;
  /** Atlas architecture class: "MoE" or "Dense". */
  architecture: string;
  configProjection: Projection;
}

const n = (p: Projection, key: string): number | null => { const value = p[key]; return typeof value === "number" && Number.isFinite(value) ? value : null; };
const ints = (p: Projection, key: string): number[] | null => {
  const value = p[key];
  return Array.isArray(value) && value.every((item) => Number.isInteger(item)) ? (value as number[]) : null;
};
const range = (from: number, to: number, step = 1): number[] => { const out: number[] = []; for (let i = from; i <= to; i += step) out.push(i); return out; };
const latestAtOrBefore = (sources: readonly number[], index: number): number | undefined => {
  let found: number | undefined;
  for (const source of sources) if (source <= index && (found === undefined || source > found)) found = source;
  return found;
};

/** "3, 7, 11, …, 71" for an arithmetic run, else the list (lists of up to six read in full). */
export function indexList(values: readonly number[]): string {
  if (values.length <= 6) return values.join(", ");
  const step = values[1]! - values[0]!;
  const arithmetic = values.every((value, i) => i === 0 || value - values[i - 1]! === step);
  return arithmetic ? `${values[0]}, ${values[1]}, ${values[2]}, …, ${values.at(-1)}` : `${values.slice(0, 3).join(", ")}, …, ${values.slice(-2).join(", ")}`;
}

/**
 * Facts the snapshot projection lacks, transcribed from the atlas architecture report for one pinned revision.
 * Each entry quotes the report's statement; the derived counts are checked against the recorded counts.
 */
interface ReportFacts {
  revision: string;
  /** Zero-based layers that reuse an earlier layer's index selection (all other indexer layers run their own). */
  indexReused?: readonly number[];
  indexNote?: string;
  /** The report states every compressed layer owns its KV cache. */
  kvOwnNote?: string;
  /** The report describes the ratio pattern used for "ratio-derived" positions. */
  ratioPattern?: string;
  /** The report confirms how a recorded interval places the attention layers. */
  intervalPattern?: string;
  /** The report states one mixer kind in every layer. */
  uniform?: string;
}
const REPORT: Record<string, ReportFacts> = {
  "glm-5.3": {
    revision: "ba32f8c19c8738e2c57c71798c601d477a7bf844",
    // Own selection at 0, 1, 2 and 6, 10, …, 74; every other layer reuses.
    indexReused: range(0, 77).filter((i) => !(i <= 2 || (i >= 6 && (i - 6) % 4 === 0))),
    indexNote: "Catalog report: the publisher's indexer_types array (not in the snapshot projection) gives full index selection at zero-based layers 0, 1, 2 and 6, 10, …, 74; the other 57 layers reuse selections. The snapshot records index_selection_frequency = 4.",
    uniform: "Every layer is DSA sparse MLA (model type glm_moe_dsa; the report's indexer schedule covers all 78 layers).",
  },
  "mistral-large-4": {
    revision: "af26e7869af601441d5cdf75a1272469ddc3d059",
    indexReused: range(17, 69, 4).flatMap((i) => [i, i + 1]),
    indexNote: "Catalog report: indexer_types marks layers shared at zero-based 17–18, 21–22, …, 69–70 (shared layers carry no indexer tensors and reuse an earlier selection); the snapshot records only the counts.",
  },
  "deepseek-v4-flash-0731": {
    revision: "7872f01b1d1fe23eabc4c98b48bffcef5a386062",
    kvOwnNote: "No kv_source_layer_ids in this configuration; the catalog report states every compressed layer owns its cache.",
  },
  "deepseek-v4.1-flash-1017": { revision: "1bae0e1088993b9b82de08f59de5be5a34e42170" },
  "qwen3.8-27b": { revision: "1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0", intervalPattern: "[GDN → GDN → GDN → gated full attention] × 16" },
  "qwen3.8-flash-next": { revision: "de4b8e4d43b917e7706784d8bb445c9af86a3540", intervalPattern: "12 groups of three GDN layers and one QSA layer" },
  "gemma-4-31b-it": { revision: "842da3794eaa0b77d5f08bae87a17459d91ff475", ratioPattern: "[five local sliding layers → one global layer] × 10" },
  "muse-glimmer-30b": { revision: "cec94fcfd6512f2cfe708138c32533b346ea4f69", ratioPattern: "[sliding, sliding, sliding, global] × 13" },
  "mistral-medium-3.5": { revision: "22b2b868a15677cfa6061277ed2f653d1349a9ab", uniform: "88 dense GQA layers; sliding_window is null." },
};

/* ------------------------------------------------------------------------------------------------------------------ */

const BF16 = 2;
const fmt = (value: number): string => new Intl.NumberFormat("en-GB").format(value);

function mlaKv(p: Projection, layers: readonly ArchLayer[], attention: readonly MixerKind[]): KvEstimate {
  const rank = n(p, "kv_lora_rank");
  const rope = n(p, "qk_rope_head_dim");
  const owners = layers.filter((layer) => attention.includes(layer.kind) && layer.kvBorrowedFrom === undefined);
  if (rank === null) return { bytesPerToken: null, formula: "", excludes: [], reason: "kv_lora_rank is not in the snapshot projection.", short: "rank not in snapshot" };
  if (rope === null) return { bytesPerToken: null, formula: "", excludes: [], reason: "qk_rope_head_dim is not in the snapshot projection, so the MLA latent width is incomplete.", short: "RoPE dim not in snapshot" };
  const ropeOwners = owners.filter((layer) => !layer.noRope).length;
  const nopeOwners = owners.length - ropeOwners;
  const elements = ropeOwners * (rank + rope) + nopeOwners * rank;
  const parts = [ropeOwners ? `${ropeOwners} layers × (${rank} latent + ${rope} RoPE key)` : "", nopeOwners ? `${nopeOwners} NoPE layers × ${rank} latent` : ""].filter(Boolean);
  const shared = layers.filter((layer) => layer.kvBorrowedFrom !== undefined).length;
  return {
    bytesPerToken: elements * BF16,
    formula: `(${parts.join(" + ")}) × 2 B${shared ? `; ${shared} layers read another layer's cache and add nothing` : ""}`,
    excludes: [],
  };
}

function gqaKv(heads: number | null, dim: number | null, count: number, what: string): { bytes: number; formula: string } | null {
  if (heads === null || dim === null || count === 0) return null;
  return { bytes: 2 * heads * dim * BF16 * count, formula: `2 (K, V) × ${heads} KV heads × ${dim} head dim × 2 B × ${count} ${what}` };
}

/* ------------------------------------------------------------------------------------------------------------------ */

function countsOf(layers: readonly ArchLayer[]): { kind: MixerKind; count: number }[] {
  return KIND_ORDER.map((kind) => ({ kind, count: layers.filter((layer) => layer.kind === kind).length })).filter((item) => item.count > 0);
}
export function summaryOf(counts: readonly { kind: MixerKind; count: number }[]): string {
  const parts = counts.map(({ kind, count }) => `${count} ${MIXER_KINDS[kind].short}`);
  return parts.length <= 2 ? parts.join(" and ") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** Counts-only fallback: proportional contiguous segments in KIND_ORDER, every cell flagged as position unknown. */
export function countsOnlyLayers(counts: Partial<Record<MixerKind, number>>, variants: Partial<Record<MixerKind, string>> = {}): ArchLayer[] {
  const layers: ArchLayer[] = [];
  for (const kind of KIND_ORDER) for (let i = 0; i < (counts[kind] ?? 0); i++) layers.push({ index: layers.length, kind, variant: variants[kind] ?? MIXER_KINDS[kind].label, positionUnknown: true });
  return layers;
}

interface Draft {
  layers: ArchLayer[];
  order: OrderProvenance;
  orderNote: string;
  index?: ModelArchitecture["index"];
  kvSharing?: ModelArchitecture["kvSharing"];
  noRope?: ModelArchitecture["noRope"];
  notes?: string[];
  checks: CountCheck[];
  kv: KvEstimate;
}

/** Apply a report's index-reuse transcription to the layers of `kind`; returns the schedule summary. */
function applyIndex(layers: ArchLayer[], kind: MixerKind, facts: ReportFacts | undefined, recorded?: { full: number; shared: number }): ModelArchitecture["index"] {
  const indexed = layers.filter((layer) => layer.kind === kind);
  if (!indexed.length) return null;
  if (facts?.indexReused && facts.indexNote) {
    for (const layer of indexed) layer.indexBorrowed = facts.indexReused.includes(layer.index);
    const reused = indexed.filter((layer) => layer.indexBorrowed).length;
    const note = recorded ? `${facts.indexNote} Recorded counts: ${recorded.full} full / ${recorded.shared} shared.` : facts.indexNote;
    return { provenance: "report", note, own: indexed.length - reused, reused, unknown: 0 };
  }
  return { provenance: "not-recorded", note: "Whether a layer runs its own indexer or reuses an earlier selection is not recorded.", own: 0, reused: 0, unknown: indexed.length };
}

function deriveDraft(model: ArchitectureInput, layerCount: number, facts: ReportFacts | undefined): Draft {
  const p = model.configProjection;
  const one = ints(p, "full_attention_layer_indices_1based");
  const zero = ints(p, "full_attention_layer_indices_0based");
  const ratios = ints(p, "compress_ratios");

  /* Explicit attention positions (Kimi K3, K3.1, GLM 5.3 Flash): attention at the listed layers, KDA elsewhere. */
  if ((one || zero) && n(p, "kda_layers") !== null) {
    const positions = one ? one.map((i) => i - 1) : zero!;
    const field = one ? "full_attention_layer_indices_1based" : "full_attention_layer_indices_0based";
    const sparseCount = n(p, "dsa_layers") ?? n(p, "sparse_mla_layers");
    const kind: MixerKind = sparseCount !== null ? "sparse" : "full";
    const topk = n(p, "dsa_index_topk") ?? n(p, "index_topk");
    const nope = n(p, "qk_rope_head_dim") === 0;
    const variant = kind === "full" ? "gated MLA" : n(p, "dsa_layers") !== null ? `gated DSA (sparse MLA), top-${topk ?? "?"} indexer` : `sparse MLA${nope ? ", NoPE" : ""}, top-${topk ?? "?"} indexer`;
    const layers: ArchLayer[] = range(0, layerCount - 1).map((index) => positions.includes(index)
      ? { index, kind, variant, ...(nope ? { noRope: true as const } : {}) }
      : { index, kind: "kda", variant: `KDA, head dim ${n(p, "kda_head_dim") ?? "?"}` });
    const attentionField = n(p, "dsa_layers") !== null ? "dsa_layers" : n(p, "sparse_mla_layers") !== null ? "sparse_mla_layers" : "mla_layers";
    return {
      layers, order: "recorded",
      orderNote: `Positions recorded in ${field} (${positions.length} ${one ? "one-based" : "zero-based"} indices: ${indexList(one ?? zero!)}); every other layer is KDA.`,
      index: kind === "sparse" ? applyIndex(layers, "sparse", facts) : null,
      noRope: nope ? { count: positions.length, note: "qk_rope_head_dim = 0: the sparse MLA layers carry no rotary key (NoPE)." } : null,
      checks: [
        { field: "kda_layers", recorded: n(p, "kda_layers")!, derived: layers.filter((layer) => layer.kind === "kda").length },
        { field: attentionField, recorded: n(p, attentionField) ?? Number.NaN, derived: positions.length },
      ],
      kv: { ...mlaKv(p, layers, ["full", "sparse"]), excludes: [`${layerCount - positions.length} KDA layers: fixed-size recurrent state per sequence`, ...(kind === "sparse" ? ["indexer keys"] : [])] },
    };
  }

  /* Per-layer compression schedule (DeepSeek V4 family): 0 = window only, r > 0 = compressed KV at ratio r. */
  if (ratios) {
    const target = ratios.slice(0, layerCount);
    const window = n(p, "sliding_window");
    const topk = n(p, "index_topk");
    const kvSources = ints(p, "kv_source_layer_ids");
    const indexSources = ints(p, "index_source_layer_ids");
    const layers: ArchLayer[] = target.map((ratio, index) => ratio === 0
      ? { index, kind: "sliding", variant: `window only, ${window ?? "?"} tokens` }
      : {
        index, kind: "compressed", compressRatio: ratio,
        // The per-layer top-k is stated only where the index schedule is recorded (V4.1: up to index_topk entries).
        variant: `compressed KV, ratio ${ratio}${indexSources ? `, up to ${topk ?? "?"} selected entries` : ""}, + ${window ?? "?"}-token window`,
        ...(kvSources && !kvSources.includes(index) ? { kvBorrowedFrom: latestAtOrBefore(kvSources, index) } : {}),
        ...(indexSources ? (indexSources.includes(index) ? { indexBorrowed: false } : { indexBorrowed: true, indexFrom: latestAtOrBefore(indexSources, index) }) : {}),
      });
    const compressed = layers.filter((layer) => layer.kind === "compressed");
    const borrowed = compressed.filter((layer) => layer.kvBorrowedFrom !== undefined).length;
    const extra = ratios.length - layerCount;
    const notes = extra > 0 ? [`compress_ratios has ${ratios.length} entries; the last ${extra} are draft (DSpark) stages and are not drawn.`] : [];
    const index: ModelArchitecture["index"] = indexSources
      ? { provenance: "recorded", note: `index_source_layer_ids (${indexSources.join(", ")}) run their own indexer; the other compressed layers reuse the last published top-k (catalog report).`, own: compressed.filter((layer) => layer.indexBorrowed === false).length, reused: compressed.filter((layer) => layer.indexBorrowed).length, unknown: 0 }
      : { provenance: "not-recorded", note: "No index_source_layer_ids: whether each compressed layer runs its own indexer is not recorded.", own: 0, reused: 0, unknown: compressed.length };
    const ratioSet = [...new Set(compressed.map((layer) => layer.compressRatio))].join(" and ");
    return {
      layers, order: "recorded",
      orderNote: `Recorded per layer in compress_ratios (first ${layerCount} entries: 0 = window only, otherwise compressed at ratio ${ratioSet}).`,
      index,
      kvSharing: kvSources
        ? { provenance: "recorded", note: `kv_source_layer_ids (${kvSources.join(", ")}) write compressed KV; every other compressed layer reads a source's cache (drawn from the latest preceding source, as the catalog report describes sources sharing forward).`, borrowed }
        : null,
      notes: [...notes, ...(kvSources ? [] : facts?.kvOwnNote ? [facts.kvOwnNote] : ["No kv_source_layer_ids: KV sharing is not recorded."])],
      checks: [
        { field: "layers", recorded: layerCount, derived: target.length },
        ...(kvSources ? [{ field: "kv_source_layer_ids", recorded: kvSources.length, derived: compressed.length - borrowed }] : []),
        ...(indexSources ? [{ field: "index_source_layer_ids", recorded: indexSources.length, derived: compressed.filter((layer) => layer.indexBorrowed === false).length }] : []),
      ],
      kv: { bytesPerToken: null, formula: "", excludes: [], reason: `Compressed KV at ratio ${ratioSet} plus a ${window ?? "?"}-token window and indexer keys, stored in engine-specific formats: no single per-token formula from the configuration.`, short: "compressed schedule" },
    };
  }

  /* Recorded interval (Qwen 3.8): attention when (i + 1) % interval = 0, Gated DeltaNet otherwise. */
  const interval = n(p, "full_attention_interval");
  const linear = n(p, "linear_attention_layers");
  if (interval !== null && linear !== null) {
    const sparse = n(p, "sparse_attention_layers");
    const kind: MixerKind = sparse !== null ? "sparse" : "full";
    const heads = n(p, "full_attention_heads") ?? n(p, "attention_heads");
    const kvHeads = n(p, "full_kv_heads") ?? n(p, "num_key_value_heads");
    const headDim = n(p, "full_head_dim") ?? n(p, "head_dim");
    const budget = n(p, "indexer_budget");
    const variant = kind === "sparse" ? `QSA sparse attention, GQA ${heads ?? "?"} / ${kvHeads ?? "?"}, budget ${budget ?? "?"} tokens` : `gated full attention, GQA ${heads ?? "?"} / ${kvHeads ?? "?"}`;
    const layers: ArchLayer[] = range(0, layerCount - 1).map((index) => (index + 1) % interval === 0
      ? { index, kind, variant }
      : { index, kind: "gdn", variant: `Gated DeltaNet, ${n(p, "linear_key_heads") ?? "?"} key / ${n(p, "linear_value_heads") ?? "?"} value heads` });
    const attention = layers.filter((layer) => layer.kind === kind).length;
    const kv = gqaKv(kvHeads, headDim, attention, kind === "sparse" ? "sparse-attention layers" : "full-attention layers");
    return {
      layers, order: "interval",
      orderNote: `Placed by full_attention_interval = ${interval}: layer i is ${kind === "sparse" ? "sparse" : "full"} attention when (i + 1) is a multiple of ${interval}.${facts?.intervalPattern ? ` The catalog report states the same pattern: ${facts.intervalPattern}.` : ""}`,
      index: kind === "sparse" ? applyIndex(layers, "sparse", facts) : null,
      checks: [
        { field: "linear_attention_layers", recorded: linear, derived: layers.filter((layer) => layer.kind === "gdn").length },
        { field: kind === "sparse" ? "sparse_attention_layers" : "full_attention_layers", recorded: (sparse ?? n(p, "full_attention_layers")) ?? Number.NaN, derived: attention },
      ],
      kv: kv
        ? { bytesPerToken: kv.bytes, formula: kv.formula, excludes: [`${layerCount - attention} Gated DeltaNet layers: fixed-size recurrent state per sequence`, ...(kind === "sparse" ? ["indexer keys"] : [])] }
        : { bytesPerToken: null, formula: "", excludes: [], reason: "KV heads or head dimension not in the snapshot projection.", short: "fields not in snapshot" },
    };
  }

  /* Sliding / global counts only (Gemma 4, Muse Glimmer): ratio-derived where the report states the pattern. */
  const local = n(p, "local_attention_layers") ?? n(p, "sliding_attention_layers");
  const global = n(p, "global_attention_layers") ?? (n(p, "sliding_attention_layers") !== null ? n(p, "full_attention_layers") : null);
  if (local !== null && global !== null) {
    const localField = n(p, "local_attention_layers") !== null ? "local_attention_layers" : "sliding_attention_layers";
    const globalField = n(p, "global_attention_layers") !== null ? "global_attention_layers" : "full_attention_layers";
    const window = n(p, "sliding_window");
    const nope = n(p, "full_layer_rope_theta") === 0;
    const period = global > 0 ? layerCount / global : 0;
    const globalVariant = `global attention${nope ? ", NoPE" : ""}`;
    const slidingVariant = `local sliding window, ${window ?? "?"} tokens`;
    const derivable = global > 0 && Number.isInteger(period) && local + global === layerCount && Boolean(facts?.ratioPattern);
    const layers: ArchLayer[] = derivable
      ? range(0, layerCount - 1).map((index) => (index + 1) % period === 0
        ? { index, kind: "full", variant: globalVariant, ...(nope ? { noRope: true as const } : {}) }
        : { index, kind: "sliding", variant: slidingVariant })
      : countsOnlyLayers({ full: global, sliding: local }, { full: globalVariant, sliding: slidingVariant });
    const kvHeads = n(p, "kv_heads") ?? n(p, "num_key_value_heads");
    const headDim = n(p, "head_dim");
    const full = gqaKv(kvHeads, headDim, global, "global layers");
    const slide = gqaKv(kvHeads, headDim, local, "sliding layers");
    const kEqV = p.attention_k_eq_v === true;
    const kv: KvEstimate = kEqV
      ? { bytesPerToken: null, formula: "", excludes: [], reason: "attention_k_eq_v = true (keys and values unified in the global layers): whether the cache stores one tensor or two is engine-specific.", short: "K = V, engine-specific" }
      : full && slide && window !== null
        ? { bytesPerToken: full.bytes, formula: full.formula, windowed: { bytesPerToken: slide.bytes, window, layers: local }, excludes: [] }
        : { bytesPerToken: null, formula: "", excludes: [], reason: "KV heads, head dimension or window not in the snapshot projection.", short: "fields not in snapshot" };
    return {
      layers, order: derivable ? "ratio-derived" : "counts-only",
      orderNote: derivable
        ? `Only the counts are recorded (${localField} = ${local}, ${globalField} = ${global}). Positions are derived from the ${local} : ${global} ratio, a global layer closing every ${period} layers; the catalog report describes the same pattern, ${facts!.ratioPattern}.`
        : `Only the counts are recorded (${localField} = ${local}, ${globalField} = ${global}); positions are not recorded and are drawn as proportional segments.`,
      noRope: nope ? { count: global, note: "full_layer_rope_theta = 0: the global layers use no rotary embedding (the catalog report and headline describe NoPE global layers)." } : null,
      checks: [
        { field: localField, recorded: local, derived: layers.filter((layer) => layer.kind === "sliding").length },
        { field: globalField, recorded: global, derived: layers.filter((layer) => layer.kind === "full").length },
      ],
      kv,
    };
  }

  /* One mixer kind in every layer (Mistral Large 4, GLM 5.3, Mistral Medium 3.5). */
  const unique = Array.isArray(p.layer_types_unique) ? (p.layer_types_unique as unknown[]) : null;
  const indexed = unique?.length === 1 && unique[0] === "indexed_attention";
  const dsa = typeof p.model_type === "string" && /dsa/.test(p.model_type);
  const noRopeList = ints(p, "no_rope_layer_indices_zero_based");
  const kvShared = p.kv_shared_layers_zero_based && typeof p.kv_shared_layers_zero_based === "object" ? (p.kv_shared_layers_zero_based as Record<string, unknown>) : null;
  if (indexed || dsa) {
    const topk = n(p, "index_topk");
    const variant = indexed ? `indexed attention (MLA + top-${topk ?? "?"} indexer)` : `DSA sparse MLA, top-${topk ?? "?"} indexer`;
    const layers: ArchLayer[] = range(0, layerCount - 1).map((index) => {
      const source = kvShared?.[String(index)];
      return {
        index, kind: "sparse", variant,
        ...(noRopeList?.includes(index) ? { noRope: true as const } : {}),
        ...(typeof source === "number" ? { kvBorrowedFrom: source } : {}),
      };
    });
    const borrowed = layers.filter((layer) => layer.kvBorrowedFrom !== undefined).length;
    const full = n(p, "indexer_types_full_count");
    const shared = n(p, "indexer_types_shared_count");
    const index = applyIndex(layers, "sparse", facts, full !== null && shared !== null ? { full, shared } : undefined);
    return {
      layers, order: "uniform",
      orderNote: indexed ? `One mixer in every layer: layer_types_unique = ["indexed_attention"] (MLA with a top-${topk ?? "?"} key indexer).` : `One mixer in every layer. ${facts?.uniform ?? "The configuration declares no second mixer."}`,
      index,
      kvSharing: kvShared ? { provenance: "recorded", note: `kv_shared_layers_zero_based maps ${indexList(Object.keys(kvShared).map(Number))} to layer ${[...new Set(Object.values(kvShared))].join(", ")}; those layers read that cache.`, borrowed } : null,
      noRope: noRopeList ? { count: noRopeList.length, note: `no_rope_layer_indices_zero_based: ${indexList(noRopeList)} (every ${n(p, "no_rope_layer_interval") ?? "?"}th layer).` } : null,
      checks: [
        ...(full !== null && shared !== null ? [{ field: "indexer_types_full_count", recorded: full, derived: index?.own ?? 0 }, { field: "indexer_types_shared_count", recorded: shared, derived: index?.reused ?? 0 }] : []),
        ...(kvShared ? [{ field: "kv_shared_layers_zero_based", recorded: Object.keys(kvShared).length, derived: borrowed }] : []),
      ],
      kv: { ...mlaKv(p, layers, ["sparse"]), excludes: ["indexer keys"] },
    };
  }
  if (facts?.uniform && n(p, "sliding_window") === null) {
    const kvHeads = n(p, "num_key_value_heads");
    const headDim = n(p, "head_dim");
    const layers: ArchLayer[] = range(0, layerCount - 1).map((index) => ({ index, kind: "full", variant: `full attention, GQA ${n(p, "attention_heads") ?? "?"} / ${kvHeads ?? "?"}` }));
    const kv = gqaKv(kvHeads, headDim, layerCount, "layers");
    return {
      layers, order: "uniform",
      orderNote: `One mixer in every layer: no per-layer attention types and sliding_window = null. Catalog report: ${facts.uniform}`,
      checks: [],
      kv: kv ? { bytesPerToken: kv.bytes, formula: kv.formula, excludes: [] } : { bytesPerToken: null, formula: "", excludes: [], reason: "KV heads or head dimension not in the snapshot projection.", short: "fields not in snapshot" },
    };
  }
  return {
    layers: [], order: "counts-only",
    orderNote: "No per-layer types, interval or mixer counts in the snapshot projection.",
    checks: [],
    kv: { bytesPerToken: null, formula: "", excludes: [], reason: "Layer map not derivable from the snapshot projection.", short: "no layer map" },
  };
}

/** Derive the layer map of one atlas model. */
export function deriveArchitecture(model: ArchitectureInput): ModelArchitecture {
  const p = model.configProjection;
  const layerCount = n(p, "layers") ?? 0;
  const pinned = REPORT[model.id];
  const facts = pinned && pinned.revision === model.revision ? pinned : undefined;
  const draft = deriveDraft(model, layerCount, facts);
  const counts = countsOf(draft.layers);
  const notes = [...(draft.notes ?? [])];
  if (pinned && !facts) notes.push(`Report transcription recorded for revision ${pinned.revision.slice(0, 7)}; this snapshot pins ${model.revision.slice(0, 7)}, so it is not applied.`);
  const kvSharing = draft.kvSharing ?? null;
  return {
    modelId: model.id, revision: model.revision, layerCount, layers: draft.layers, order: draft.order, orderNote: draft.orderNote,
    counts, summary: summaryOf(counts), index: draft.index ?? null, kvSharing: kvSharing && kvSharing.borrowed > 0 ? kvSharing : null,
    noRope: draft.noRope ?? null, notes, checks: [...draft.checks, { field: "layers", recorded: layerCount, derived: draft.layers.length }].filter((check, i, all) => all.findIndex((item) => item.field === check.field) === i),
    kv: draft.kv,
  };
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** Mixture-of-experts and draft-layer fields, read under their per-family names. */
export interface ExpertFacts {
  dense: boolean;
  routed: number | null;
  perToken: number | null;
  shared: number | null;
  densePrefix: number | null;
  /** Recorded MTP / next-n / draft layer count, with the field name. */
  draft: { value: number; field: string } | null;
  draftNote: string | null;
}
export function expertFacts(model: ArchitectureInput): ExpertFacts {
  const p = model.configProjection;
  const pick = (...keys: string[]) => { for (const key of keys) { const value = n(p, key); if (value !== null) return { value, field: key }; } return null; };
  const draft = pick("num_nextn_predict_layers", "nextn_layers", "mtp_layers");
  const stages = n(p, "dspark_stages_reference_inference");
  const dense = model.architecture === "Dense" || p.enable_moe_block === false;
  return {
    dense,
    routed: dense ? null : pick("routed_experts", "n_routed_experts")?.value ?? null,
    perToken: dense ? null : pick("experts_per_token", "num_experts_per_tok")?.value ?? null,
    shared: dense ? null : pick("shared_experts", "n_shared_experts")?.value ?? null,
    densePrefix: dense ? null : pick("dense_prefix_layers", "first_k_dense_replace")?.value ?? null,
    draft,
    draftNote: stages !== null && draft && stages !== draft.value ? `Root ${draft.field} = ${draft.value}; the reference inference builds ${stages} DSpark stages.` : null,
  };
}

/** Active share of total parameters, when both are recorded. */
export const activeFraction = (total: number | null, active: number | null): number | null =>
  total !== null && active !== null && total > 0 ? active / total : null;

/**
 * Parameter count in billions as a compact label: 2.8T, 1.05T, 753B, 29.8B (three significant digits). en-US short
 * scale for the B / T suffixes the parameter headlines use (en-GB compact writes "bn" / "tn").
 */
export const paramsCompact = (billions: number): string =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumSignificantDigits: 3 }).format(billions * 1e9);
