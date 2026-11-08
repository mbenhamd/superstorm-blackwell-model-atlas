import { ATLAS } from "../../../domain/catalog.js";
import { deriveArchitecture, KIND_ORDER, MIXER_KINDS, type ArchLayer, type MixerFamily, type MixerKind, type ModelArchitecture, type OrderProvenance } from "../../../domain/architecture.js";
import { publisherLabel } from "./tldr-data.js";

/**
 * Architecture page data: every atlas model with its derived layer map (src/domain/architecture.ts), grouped by
 * publisher in catalog order. Within a publisher the catalog order is kept, which lists a base release before its
 * update (K3 → K3.1, V4 → V4.1). Configuration facts only; nothing on the page is measured.
 */

export type ArchModel = (typeof ATLAS.models)[number];
export interface ArchEntry { model: ArchModel; arch: ModelArchitecture; publisher: string }

let cache: ArchEntry[] | null = null;
export function archEntries(): ArchEntry[] {
  cache ??= ATLAS.models.map((model) => ({ model, arch: deriveArchitecture(model), publisher: publisherLabel(model.company) }));
  return cache;
}
export const archEntry = (id: string): ArchEntry | undefined => archEntries().find((entry) => entry.model.id === id);

export function archGroups(entries: readonly ArchEntry[] = archEntries()): { publisher: string; entries: ArchEntry[] }[] {
  const groups: { publisher: string; entries: ArchEntry[] }[] = [];
  for (const entry of entries) {
    const group = groups.find((item) => item.publisher === entry.publisher);
    if (group) group.entries.push(entry); else groups.push({ publisher: entry.publisher, entries: [entry] });
  }
  return groups;
}

/** Cell colour token: hue by mixer kind; the recessive step marks a recorded reuse of an earlier index selection. */
export const kindColor = (kind: MixerKind, reused = false): string =>
  reused && (kind === "sparse" || kind === "compressed") ? `var(--mixer-${kind}-reused)` : `var(--mixer-${kind})`;
export const layerColor = (layer: ArchLayer): string => kindColor(layer.kind, layer.indexBorrowed === true);

/** Short order-provenance label shown beside each summary. */
export const ORDER_LABEL: Record<OrderProvenance, string> = {
  recorded: "recorded order", interval: "order from interval", "ratio-derived": "order from ratio", uniform: "one mixer", "counts-only": "order not recorded",
};

/** Tooltip title: "Layer 12 · Kimi Delta Attention" (one-based layer number). */
export const layerTitle = (layer: ArchLayer): string =>
  layer.positionUnknown ? `${MIXER_KINDS[layer.kind].label} · position not recorded` : `Layer ${layer.index + 1} · ${MIXER_KINDS[layer.kind].label}`;

/** Tooltip detail lines: implementation, then each flag in words. Layer numbers are one-based, as on the page. */
export function layerDetails(layer: ArchLayer, arch: ModelArchitecture): string[] {
  const lines = [layer.variant];
  if (layer.noRope) lines.push("No RoPE");
  if (layer.kvBorrowedFrom !== undefined) lines.push(`KV read from layer ${layer.kvBorrowedFrom + 1}`);
  if (layer.kind === "sparse" || layer.kind === "compressed") {
    if (layer.indexBorrowed === true) lines.push(layer.indexFrom !== undefined ? `Reuses layer ${layer.indexFrom + 1}'s index selection` : "Reuses an earlier layer's index selection");
    else if (layer.indexBorrowed === false) lines.push("Runs its own indexer");
    else if (arch.index?.provenance === "not-recorded") lines.push("Index reuse not recorded");
  }
  if (layer.positionUnknown) {
    const count = arch.counts.find((item) => item.kind === layer.kind)?.count ?? 0;
    lines.push(`${count} of ${arch.layerCount} layers; positions not recorded`);
  }
  if (arch.order === "ratio-derived") lines.push("Position derived from the recorded ratio");
  if (arch.order === "interval") lines.push("Position from the recorded interval");
  return lines;
}

/** Plain-language accessible summary of one strip. */
export const stripLabel = (entry: ArchEntry): string =>
  `${entry.model.name}: ${entry.arch.layerCount} layers, ${entry.arch.summary}; ${ORDER_LABEL[entry.arch.order]}.${entry.arch.noRope ? ` ${entry.arch.noRope.count} without RoPE.` : ""}${entry.arch.kvSharing ? ` ${entry.arch.kvSharing.borrowed} read another layer's KV.` : ""}${entry.arch.index && entry.arch.index.reused ? ` ${entry.arch.index.reused} reuse an earlier index selection.` : ""}`;

export interface LegendItem { key: string; label: string; family: MixerFamily | "marks"; swatch: { color: string; hollow?: boolean; dot?: boolean; hatch?: boolean } }

/** Legend entries for what the shown maps contain, grouped attention → linear mixers → marks. */
export function legendItems(entries: readonly ArchEntry[]): LegendItem[] {
  const layers = entries.flatMap((entry) => entry.arch.layers);
  const items: LegendItem[] = [];
  for (const kind of KIND_ORDER) {
    if (!layers.some((layer) => layer.kind === kind)) continue;
    items.push({ key: kind, label: MIXER_KINDS[kind].label, family: MIXER_KINDS[kind].family, swatch: { color: kindColor(kind) } });
    if (layers.some((layer) => layer.kind === kind && layer.indexBorrowed === true)) items.push({ key: `${kind}-reused`, label: `${MIXER_KINDS[kind].label}, reused selection`, family: "attention", swatch: { color: kindColor(kind, true) } });
  }
  if (layers.some((layer) => layer.noRope)) items.push({ key: "nope", label: "No RoPE", family: "marks", swatch: { color: "var(--chart-neutral)", dot: true } });
  if (layers.some((layer) => layer.kvBorrowedFrom !== undefined)) items.push({ key: "kv", label: "KV read from an earlier layer", family: "marks", swatch: { color: "var(--chart-neutral)", hollow: true } });
  if (layers.some((layer) => layer.positionUnknown)) items.push({ key: "unknown", label: "Order not recorded", family: "marks", swatch: { color: "var(--chart-neutral)", hatch: true } });
  return items;
}

/* --------------------------------------------- attention fields --------------------------------------------- */

type Projection = Record<string, unknown>;
const field = (p: Projection, ...keys: string[]): number | null => {
  for (const key of keys) { const value = p[key]; if (typeof value === "number" && Number.isFinite(value)) return value; }
  return null;
};

/** Attention-related configuration fields shown in the Attention & KV tab and the sheet, as recorded. */
export interface AttentionFacts {
  heads: number | null;
  /** GQA KV heads, or the MLA latent rank, or Gemma's local / global split. */
  kv: { text: string; kind: "gqa" | "mla" | "split" } | null;
  headDim: string | null;
  window: number | null;
  /** True when the configuration records sliding_window = null. */
  windowNull: boolean;
  topk: number | null;
  topkField: string | null;
}
export function attentionFacts(model: ArchModel): AttentionFacts {
  const p = model.configProjection as Projection;
  const rank = field(p, "kv_lora_rank");
  const kvHeads = field(p, "num_key_value_heads", "full_kv_heads", "kv_heads");
  const local = field(p, "local_kv_heads"), global = field(p, "global_kv_heads");
  const kv = rank !== null ? { text: `latent ${rank}`, kind: "mla" as const }
    : local !== null && global !== null ? { text: `${local} local · ${global} global`, kind: "split" as const }
    : kvHeads !== null ? { text: String(kvHeads), kind: "gqa" as const } : null;
  const nope = field(p, "qk_nope_head_dim"), rope = field(p, "qk_rope_head_dim");
  const localDim = field(p, "local_head_dim"), globalDim = field(p, "global_head_dim");
  const headDim = rank !== null && nope !== null && rope !== null ? `${nope} + ${rope} RoPE`
    : localDim !== null && globalDim !== null ? `${localDim} local · ${globalDim} global`
    : field(p, "full_head_dim", "head_dim") !== null ? String(field(p, "full_head_dim", "head_dim")) : null;
  const topkKey = ["index_topk", "dsa_index_topk", "indexer_budget"].find((key) => field(p, key) !== null) ?? null;
  return {
    heads: field(p, "attention_heads", "full_attention_heads"),
    kv, headDim,
    window: field(p, "sliding_window"),
    windowNull: Object.hasOwn(p, "sliding_window") && p.sliding_window === null,
    topk: topkKey ? field(p, topkKey) : null,
    topkField: topkKey,
  };
}
