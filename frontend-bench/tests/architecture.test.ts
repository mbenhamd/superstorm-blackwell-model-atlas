/**
 * Architecture layer maps derived from the pinned atlas snapshot (src/data/atlas.json). Every model's derived counts
 * are checked against the counts its configuration records; positions are checked where a field or the atlas report
 * states them. These are configuration facts and calculations, not measurements.
 */
import { describe, expect, test } from "bun:test";
import { ATLAS } from "../src/domain/catalog.ts";
import { activeFraction, countsOnlyLayers, deriveArchitecture, expertFacts, indexList, paramsCompact, summaryOf, type ArchitectureInput, type MixerKind, type ModelArchitecture } from "../src/domain/architecture.ts";

const model = (id: string) => {
  const found = ATLAS.models.find((item) => item.id === id);
  if (!found) throw new Error(`no atlas model ${id}`);
  return found;
};
const arch = (id: string): ModelArchitecture => deriveArchitecture(model(id));
const where = (a: ModelArchitecture, kind: MixerKind) => a.layers.filter((layer) => layer.kind === kind).map((layer) => layer.index);
const count = (a: ModelArchitecture, kind: MixerKind) => a.counts.find((item) => item.kind === kind)?.count ?? 0;
const every = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

describe("every atlas model", () => {
  test("12 models, each with one layer per recorded layer and no count that disagrees with its configuration", () => {
    expect(ATLAS.models).toHaveLength(12);
    for (const item of ATLAS.models) {
      const a = deriveArchitecture(item);
      expect(a.layers.length, item.id).toBe(item.configProjection.layers);
      expect(a.layers.map((layer) => layer.index), item.id).toEqual(every(0, a.layers.length - 1, 1));
      expect(a.counts.reduce((sum, entry) => sum + entry.count, 0), item.id).toBe(a.layerCount);
      expect(a.checks.length, item.id).toBeGreaterThan(0);
      for (const check of a.checks) expect(check.derived, `${item.id} ${check.field}`).toBe(check.recorded);
      // No model in the snapshot falls back to counts only; every order is stated in words.
      expect(a.order, item.id).not.toBe("counts-only");
      expect(a.orderNote.length, item.id).toBeGreaterThan(20);
    }
  });

  test("order provenance per model", () => {
    const orders = Object.fromEntries(ATLAS.models.map((item) => [item.id, deriveArchitecture(item).order]));
    expect(orders).toEqual({
      "kimi-k3": "recorded", "kimi-k3.1-pro": "recorded", "glm-5.3": "uniform", "glm-5.3-flash": "recorded",
      "deepseek-v4-flash-0731": "recorded", "deepseek-v4.1-flash-1017": "recorded", "qwen3.8-27b": "interval",
      "qwen3.8-flash-next": "interval", "gemma-4-31b-it": "ratio-derived", "mistral-medium-3.5": "uniform",
      "mistral-large-4": "uniform", "muse-glimmer-30b": "ratio-derived",
    });
  });
});

describe("hybrid linear-attention models", () => {
  test("Kimi K3: gated MLA at the 24 recorded one-based indices (4, 8, …, 92, 93), KDA in the other 69", () => {
    const a = arch("kimi-k3");
    expect(where(a, "full")).toEqual([...every(3, 91, 4), 92]);
    expect(count(a, "kda")).toBe(69);
    expect(a.summary).toBe("24 full attention and 69 KDA");
    expect(a.index).toBeNull();
  });

  test("Kimi K3.1 Pro: the same positions as gated DSA (sparse); index reuse is not recorded", () => {
    const a = arch("kimi-k3.1-pro");
    expect(where(a, "sparse")).toEqual(where(arch("kimi-k3"), "full"));
    expect(a.index).toMatchObject({ provenance: "not-recorded", unknown: 24, own: 0, reused: 0 });
    expect(a.layers.every((layer) => layer.indexBorrowed === undefined)).toBe(true);
  });

  test("GLM 5.3 Flash: NoPE sparse MLA at the recorded zero-based 3, 7, …, 43; KDA in the other 34", () => {
    const a = arch("glm-5.3-flash");
    expect(where(a, "sparse")).toEqual(every(3, 43, 4));
    expect(count(a, "kda")).toBe(34);
    expect(a.layers.filter((layer) => layer.noRope).map((layer) => layer.index)).toEqual(every(3, 43, 4));
    expect(a.index?.provenance).toBe("not-recorded");
  });

  test("Qwen 3.8 27B: full_attention_interval 4 places 16 gated full-attention layers at 3, 7, …, 63", () => {
    const a = arch("qwen3.8-27b");
    expect(a.layers).toHaveLength(64);
    expect(where(a, "full")).toEqual(every(3, 63, 4));
    expect(count(a, "gdn")).toBe(48);
    expect(a.summary).toBe("16 full attention and 48 Gated DeltaNet");
  });

  test("Qwen 3.8 Flash Next: three Gated DeltaNet layers then one sparse (QSA) layer, 12 times", () => {
    const a = arch("qwen3.8-flash-next");
    expect(where(a, "sparse")).toEqual(every(3, 47, 4));
    expect(count(a, "gdn")).toBe(36);
    expect(a.index?.provenance).toBe("not-recorded");
  });
});

describe("compressed attention (DeepSeek V4 family)", () => {
  test("V4 Flash 0731: 43 target entries of compress_ratios; window only at 0–1, ratio 4 and 128 alternating; DSpark entries excluded", () => {
    const a = arch("deepseek-v4-flash-0731");
    expect(where(a, "sliding")).toEqual([0, 1]);
    expect(a.layers.filter((layer) => layer.compressRatio === 4).map((layer) => layer.index)).toEqual(every(2, 42, 2));
    expect(a.layers.filter((layer) => layer.compressRatio === 128).map((layer) => layer.index)).toEqual(every(3, 41, 2));
    expect(a.kvSharing).toBeNull();
    expect(a.index?.provenance).toBe("not-recorded");
    expect(a.notes.join(" ")).toMatch(/46 entries; the last 3 are draft/);
    expect(a.kv.bytesPerToken).toBeNull();
  });

  test("V4.1 Flash 1017: KV sources 2, 8, 14, 20 and index sources 2, 8, …, 36; readers use the latest preceding source", () => {
    const a = arch("deepseek-v4.1-flash-1017");
    expect(where(a, "sliding")).toEqual([0, 1]);
    expect(a.layers.filter((layer) => layer.compressRatio === 2).map((layer) => layer.index)).toEqual(every(2, 19, 1));
    expect(a.layers.filter((layer) => layer.compressRatio === 1).map((layer) => layer.index)).toEqual(every(20, 39, 1));
    const at = (index: number) => a.layers[index]!;
    expect([2, 8, 14, 20].map((index) => at(index).kvBorrowedFrom)).toEqual([undefined, undefined, undefined, undefined]);
    expect([3, 7, 9, 13, 15, 19, 21, 39].map((index) => at(index).kvBorrowedFrom)).toEqual([2, 2, 8, 8, 14, 14, 20, 20]);
    expect(a.kvSharing).toMatchObject({ provenance: "recorded", borrowed: 34 });
    expect(a.layers.filter((layer) => layer.indexBorrowed === false).map((layer) => layer.index)).toEqual([2, 8, 14, 20, 24, 28, 32, 36]);
    expect([25, 31, 39].map((index) => at(index).indexFrom)).toEqual([24, 28, 36]);
    expect(a.index).toMatchObject({ provenance: "recorded", own: 8, reused: 30 });
  });

  test("parameters are not recorded for either DeepSeek release: no fraction, no bar", () => {
    for (const id of ["deepseek-v4-flash-0731", "deepseek-v4.1-flash-1017"]) {
      const item = model(id);
      expect(item.totalParamsB).toBeNull();
      expect(activeFraction(item.totalParamsB, item.activeParamsB)).toBeNull();
    }
  });
});

describe("one mixer everywhere, sliding / global ratios", () => {
  test("GLM 5.3: 78 DSA layers; own index selection at 0, 1, 2 and 6, 10, …, 74 (atlas report), 57 reuse", () => {
    const a = arch("glm-5.3");
    expect(count(a, "sparse")).toBe(78);
    expect(a.layers.filter((layer) => layer.indexBorrowed === false).map((layer) => layer.index)).toEqual([0, 1, 2, ...every(6, 74, 4)]);
    expect(a.index).toMatchObject({ provenance: "report", own: 21, reused: 57 });
  });

  test("Mistral Large 4: NoPE every fourth layer, nine NoPE layers read layer 35's KV, 44 own / 28 shared indexers", () => {
    const a = arch("mistral-large-4");
    expect(count(a, "sparse")).toBe(72);
    expect(a.layers.filter((layer) => layer.noRope).map((layer) => layer.index)).toEqual(every(3, 71, 4));
    const borrowed = a.layers.filter((layer) => layer.kvBorrowedFrom !== undefined);
    expect(borrowed.map((layer) => layer.index)).toEqual(every(39, 71, 4));
    expect(new Set(borrowed.map((layer) => layer.kvBorrowedFrom))).toEqual(new Set([35]));
    expect(borrowed.every((layer) => layer.noRope)).toBe(true);
    expect(a.layers.filter((layer) => layer.indexBorrowed).map((layer) => layer.index)).toEqual(every(17, 69, 4).flatMap((i) => [i, i + 1]));
    expect(a.index).toMatchObject({ provenance: "report", own: 44, reused: 28 });
  });

  test("Mistral Medium 3.5: 88 full-attention GQA layers", () => {
    const a = arch("mistral-medium-3.5");
    expect(a.summary).toBe("88 full attention");
    expect(a.index).toBeNull();
    expect(a.kvSharing).toBeNull();
  });

  test("Gemma 4 31B: 50 : 10 ratio-derived, a global layer closing every six (5, 11, …, 59)", () => {
    const a = arch("gemma-4-31b-it");
    expect(where(a, "full")).toEqual(every(5, 59, 6));
    expect(count(a, "sliding")).toBe(50);
    expect(a.orderNote).toMatch(/derived from the 50 : 10 ratio/);
  });

  test("Muse Glimmer 30B: 39 : 13 ratio-derived, NoPE global layers at 3, 7, …, 51", () => {
    const a = arch("muse-glimmer-30b");
    expect(where(a, "full")).toEqual(every(3, 51, 4));
    expect(a.layers.filter((layer) => layer.noRope).map((layer) => layer.index)).toEqual(every(3, 51, 4));
    expect(count(a, "sliding")).toBe(39);
    expect(model("muse-glimmer-30b").activeParamsB).toBeNull();
  });
});

describe("KV per token (calculation from configuration fields, BF16)", () => {
  const kv = (id: string) => arch(id).kv;
  test("GQA: 2 × KV heads × head dim × 2 B × attention layers", () => {
    expect(kv("qwen3.8-27b").bytesPerToken).toBe(2 * 4 * 256 * 2 * 16);
    expect(kv("qwen3.8-flash-next").bytesPerToken).toBe(2 * 2 * 256 * 2 * 12);
    expect(kv("mistral-medium-3.5").bytesPerToken).toBe(360_448);
    expect(kv("qwen3.8-27b").excludes.join(" ")).toMatch(/48 Gated DeltaNet layers/);
  });
  test("sliding layers are capped at the window: Muse Glimmer 13,312 B/token global + 39,936 B/token up to 2,048 tokens", () => {
    expect(kv("muse-glimmer-30b").bytesPerToken).toBe(13_312);
    expect(kv("muse-glimmer-30b").windowed).toEqual({ bytesPerToken: 39_936, window: 2048, layers: 39 });
  });
  test("MLA: (kv_lora_rank + qk_rope_head_dim) per KV-owning layer; NoPE layers store the latent only", () => {
    expect(kv("glm-5.3").bytesPerToken).toBe(78 * 576 * 2);
    expect(kv("glm-5.3-flash").bytesPerToken).toBe(11 * 512 * 2);
    // 54 RoPE layers × 576 + 9 NoPE source layers × 512, nine sharing layers add nothing (atlas report: 71,424 B).
    expect(kv("mistral-large-4").bytesPerToken).toBe(71_424);
  });
  test("no figure where the formula is ambiguous or a field is missing, each with its reason", () => {
    expect(kv("kimi-k3").bytesPerToken).toBeNull();
    expect(kv("kimi-k3").reason).toMatch(/qk_rope_head_dim/);
    expect(kv("gemma-4-31b-it").reason).toMatch(/attention_k_eq_v/);
    expect(kv("deepseek-v4.1-flash-1017").reason).toMatch(/Compressed KV/);
  });
});

describe("fallbacks and formatting", () => {
  test("counts without positions draw proportional segments, every cell marked position unknown", () => {
    const input: ArchitectureInput = { id: "synthetic", revision: "0".repeat(40), architecture: "Dense", configProjection: { layers: 40, sliding_attention_layers: 30, full_attention_layers: 10, kv_heads: 8, head_dim: 128, sliding_window: 4096 } };
    const a = deriveArchitecture(input);
    expect(a.order).toBe("counts-only");
    expect(a.layers.every((layer) => layer.positionUnknown)).toBe(true);
    expect(where(a, "full")).toEqual(every(0, 9, 1));
    expect(where(a, "sliding")).toEqual(every(10, 39, 1));
    expect(a.checks.every((check) => check.recorded === check.derived)).toBe(true);
    expect(countsOnlyLayers({ kda: 2, full: 1 }).map((layer) => layer.kind)).toEqual(["full", "kda", "kda"]);
  });

  test("a report transcription applies only at its pinned revision", () => {
    const base = model("glm-5.3");
    const a = deriveArchitecture({ ...base, revision: "f".repeat(40) });
    expect(a.index?.provenance).toBe("not-recorded");
    expect(a.notes.join(" ")).toMatch(/not applied/);
  });

  test("labels", () => {
    expect([2800, 104, 1050, 753.32994048, 29.78, 6].map(paramsCompact)).toEqual(["2.8T", "104B", "1.05T", "753B", "29.8B", "6B"]);
    expect(summaryOf([{ kind: "full", count: 2 }, { kind: "sliding", count: 3 }, { kind: "kda", count: 4 }])).toBe("2 full attention, 3 sliding window and 4 KDA");
    expect(indexList(every(3, 71, 4))).toBe("3, 7, 11, …, 71");
    expect(indexList([2, 8, 14, 20])).toBe("2, 8, 14, 20");
  });

  test("experts: dense models have none; draft layers are read under their recorded field names", () => {
    expect(expertFacts(model("qwen3.8-27b"))).toMatchObject({ dense: true, routed: null, draft: { value: 1, field: "nextn_layers" } });
    expect(expertFacts(model("gemma-4-31b-it"))).toMatchObject({ dense: true, draft: null });
    expect(expertFacts(model("kimi-k3"))).toMatchObject({ dense: false, routed: 896, perToken: 16, shared: 2, densePrefix: 1, draft: { value: 0 } });
    expect(expertFacts(model("mistral-large-4"))).toMatchObject({ routed: 128, perToken: 4, shared: 1, densePrefix: 1, draft: null });
    expect(expertFacts(model("deepseek-v4-flash-0731")).draftNote).toMatch(/3 DSpark stages/);
    expect(expertFacts(model("qwen3.8-flash-next")).draft).toEqual({ value: 1, field: "mtp_layers" });
  });
});
