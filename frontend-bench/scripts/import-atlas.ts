/**
 * Pins the console's catalog from the parent research atlas. No values are invented here: every field is
 * copied from the atlas or derived by a rule stated next to it.
 *
 * Reads (read-only): ../catalog/models.json, ../catalog/configurations.json,
 * ../catalog/aa-intelligence-index.json, ../evidence/sources.json and, when present,
 * data/hf-card-benchmarks.json (publisher benchmark tables transcribed from the pinned Hugging Face cards).
 *
 * Writes: src/data/atlas.json, committed so the console and the offline preview build without the atlas.
 *   bun run import:atlas          regenerate
 *   bun run import:atlas --check  fail when the committed snapshot is stale
 */
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const atlas = join(root, "..");
const out = join(root, "src/data/atlas.json");
type Json = Record<string, any>;
const read = async (path: string): Promise<Json> => JSON.parse(await Bun.file(path).text());

const catalog = await read(join(atlas, "catalog/models.json"));
const configurations = (await read(join(atlas, "catalog/configurations.json"))) as unknown as Json[];
const aa = await read(join(atlas, "catalog/aa-intelligence-index.json"));
const registry = (await read(join(atlas, "evidence/sources.json"))).sources as Record<string, Json>;
const cardFile = Bun.file(join(root, "data/hf-card-benchmarks.json"));
const cards = (await cardFile.exists()) ? ((await cardFile.json()) as Json) : null;
/**
 * Pinned atlas commit: the last commit that changed one of the four inputs above, not HEAD. Pinning HEAD made the
 * committed snapshot stale on every unrelated commit (this folder lives in the same repository), so `--check`
 * failed although the catalog content was identical. Content drift is still caught by the byte comparison below.
 */
const ATLAS_INPUTS = ["catalog/models.json", "catalog/configurations.json", "catalog/aa-intelligence-index.json", "evidence/sources.json"];
const atlasCommit = (await new Response(Bun.spawn(["git", "log", "-1", "--format=%H", "--", ...ATLAS_INPUTS], { cwd: atlas, stdout: "pipe" }).stdout).text()).trim();

/**
 * Display rule for catalog prose rendered verbatim in the UI (configuration notes/reason, recheck text, engine
 * reviews): the UI never names the source repository, so the word "atlas" reads "catalog" and "the separate
 * execution repository" reads "the execution environment". Benchmark proper names ("MCP Atlas", "MCP-Atlas")
 * are not in these fields and card tables are never rewritten.
 */
function neutral(text: string): string;
function neutral(text: string | null): string | null;
function neutral(text: string | null): string | null {
  if (text === null) return null;
  return text
    .replace(/\b(?<!MCP[- ])an atlas\b/g, "a catalog").replace(/\b(?<!MCP[- ])An atlas\b/g, "A catalog")
    .replace(/\b(?<!MCP[- ])atlas\b/g, "catalog").replace(/\b(?<!MCP[- ])Atlas\b/g, "Catalog")
    .replace(/\bseparate execution repository\b/g, "execution environment");
}

const source = (id: string | null | undefined) => {
  if (!id) return null;
  const entry = registry[id];
  if (!entry) throw new Error(`Source ID ${id} is not in evidence/sources.json`);
  return { id, url: entry.url as string, title: (entry.title ?? null) as string | null, retrievedAt: (entry.retrieved_at ?? entry.accessed_on ?? null) as string | null };
};

/** Precision class from the atlas variant key and its precision text (the text wins when it names a format). */
function precisionClass(key: string, text: string): "BF16" | "FP8" | "NVFP4" | "MXFP4" | "FP4/FP8" {
  const t = text.toLowerCase();
  if (key.includes("nvfp4") || t.startsWith("nvfp4") || /\bnvfp4\b.*w4a4|modelopt.*nvfp4|nvfp4 experts/.test(t)) return "NVFP4";
  if (t.includes("mxfp4")) return "MXFP4";
  if (key === "native" && t.includes("fp4") && t.includes("fp8")) return "FP4/FP8";
  if (key.includes("fp8") || t.includes("fp8")) return "FP8";
  return "BF16";
}
/** Publisher shown in names: the Hugging Face organisation when the export is not the model publisher's own repository. */
const org = (hfId: string) => hfId.split("/")[0] ?? hfId;
const orgLabel: Record<string, string> = { nvidia: "NVIDIA", unsloth: "Unsloth" };

const releaseByCatalog = new Map<string, Json>((aa.releases as Json[]).filter((r) => r.catalog_key).map((r) => [r.catalog_key, r]));

const models = (catalog.models as Json[]).map((m) => {
  const engines = m.latest_stable_review?.engines ?? {};
  return {
    id: m.key as string,
    name: m.name as string,
    company: m.company as string,
    hfId: m.hf_id as string,
    revision: m.revision as string,
    totalParamsB: (m.total_b ?? null) as number | null,
    activeParamsB: (m.active_b ?? null) as number | null,
    parameterNote: (m.parameter_count_note ?? null) as string | null,
    contextTokens: m.context as number,
    layout: m.layout as string,
    // Rule: "moe" in the atlas layout string, else dense.
    architecture: String(m.layout).includes("moe") ? "MoE" : "Dense",
    headline: m.headline as string,
    license: m.license as string,
    recommended: m.recommended as string,
    baselineTp: m.baseline_tp as number,
    evidenceStatus: m.evidence_status as string,
    configProjection: m.config_projection as Record<string, unknown>,
    reviews: {
      checkedOn: (m.latest_stable_review?.checked_on ?? null) as string | null,
      scope: (m.latest_stable_review?.scope ?? null) as string | null,
      deploymentLayer: (m.latest_stable_review?.deployment_layer ?? null) as string | null,
      engines: Object.entries(engines).map(([engine, review]: [string, any]) => ({
        engine: engine === "vllm" ? "vLLM" : "SGLang",
        release: review.engine_release as string,
        commit: review.source_commit as string,
        assessment: neutral(review.assessment as string),
        nvfp4Assessment: neutral((review.nvfp4_assessment ?? null) as string | null),
        sourceIds: review.source_ids as string[],
      })),
    },
    card: m.huggingface_readme ? { sourceId: m.huggingface_readme.source_id as string, path: m.huggingface_readme.path as string, retrievedAt: m.huggingface_readme.retrieved_at as string } : null,
    aaReleaseKey: releaseByCatalog.get(m.key)?.key ?? null,
    atlasPath: m.path as string,
    sourceIds: m.source_ids as string[],
  };
});

// Variants without their own hf_id are requested names with no artifact (e.g. a hypothetical all-FP8 target). They are
// kept as unavailable records and never mapped to the base repository.
const unavailableExports = (catalog.models as Json[]).flatMap((m) => (m.variants as Json[]).filter((v) => !v.hf_id).map((v) => ({
  modelId: m.key as string, variantKey: v.key as string, precision: String(v.precision ?? ""), status: (v.status ?? null) as string | null,
})));
const artifacts = (catalog.models as Json[]).flatMap((m) => { let baseSlugTaken = false; return (m.variants as Json[]).filter((v) => Boolean(v.hf_id)).map((v) => {
  const hfId = v.hf_id as string;
  // Slugs are unique: when several catalog variants name the base repository (e.g. a requested FP8 that has no
  // separate artifact), only the first keeps the bare model key.
  const baseSlug = hfId === m.hf_id && !baseSlugTaken;
  if (baseSlug) baseSlugTaken = true;
  const precision = precisionClass(v.key, String(v.precision ?? ""));
  const publisher = org(hfId) === org(m.hf_id) ? null : org(hfId);
  return {
    id: `${m.key}.${v.key}`,
    // Run-identity model_name: canonical slug of the weights artifact; the publisher's base repository keeps the model key,
    // every other export appends its variant key (which carries the quantization suffix, e.g. "nvfp4", "nvfp4-inferact").
    slug: baseSlug ? (m.key as string) : `${m.key}-${v.key}`,
    modelId: m.key as string,
    variantKey: v.key as string,
    hfId,
    revision: (v.revision ?? null) as string | null,
    precision,
    precisionDetail: String(v.precision ?? ""),
    // Naming rule: "Native <format>" for the publisher's own quantized release, otherwise the format, plus the export publisher when it is a third party.
    label: `${v.key === "native" ? `Native ${precision}` : precision}${publisher ? ` · ${orgLabel[publisher] ?? publisher}` : ""}`,
    publisher,
    status: (v.status ?? null) as string | null,
    weightBytes: (v.listed_weight_file_bytes ?? null) as number | null,
    card: v.huggingface_readme ? { sourceId: v.huggingface_readme.source_id as string, path: v.huggingface_readme.path as string, retrievedAt: v.huggingface_readme.retrieved_at as string } : null,
  };
}); });
const artifactIds = new Set(artifacts.map((a) => a.id));

/** Knob: the configuration id after <model>.<variant>.<engine>, with "baseline" meaning none. */
function knob(id: string, model: string, variant: string, engine: string): string | null {
  const rest = id.slice(`${model}.${variant}.${engine}.`.length);
  if (!rest || rest === "baseline") return null;
  // Tensor-parallel width is already part of the shape (TPn · DPm), so a bare "tpN" segment is not a knob.
  const parts = rest.split(".").map((part) => part
    .replace(/^tp\d+-probe$/, "Probe").replace(/^tp\d+$/, "").replace(/^tp\d+ep(\d+)$/, "EP$1").replace(/^ep(\d+)$/, "EP$1")
    .replace(/^mtp$/, "MTP").replace(/^dspark$/, "DSpark").replace(/^v0(\d\d)$/, (_m, v: string) => `v0.${v}`)
    .replace(/^fi-(bf16|fp8)-kv$/, (_m, d: string) => `FlashInfer · ${d.toUpperCase()} KV`).replace(/^fa4-(bf16|fp8)-kv$/, (_m, d: string) => `FA4 · ${d.toUpperCase()} KV`)).filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

const configs = configurations.map((c) => {
  const artifactId = `${c.model_key}.${c.variant}`;
  if (!artifactIds.has(artifactId)) throw new Error(`Configuration ${c.id} references unknown export ${artifactId}`);
  const recheck = c.latest_release_recheck ?? null;
  return {
    id: c.id as string,
    modelId: c.model_key as string,
    artifactId,
    engine: c.engine === "vllm" ? "vLLM" : "SGLang",
    engineArgs: c.engine_args as string[],
    gpus: c.gpu_count as number,
    tensorParallel: c.tensor_parallel_size as number,
    dataParallel: c.data_parallel_size as number,
    contextCap: (c.context_cap ?? null) as number | null,
    status: c.status as string,
    reason: neutral(c.reason as string),
    notes: neutral(c.notes as string),
    knob: knob(c.id, c.model_key, c.variant, c.engine),
    modelRevision: c.model_revision as string,
    draftHfId: (c.draft_hf_id ?? null) as string | null,
    draftRevision: (c.draft_revision ?? null) as string | null,
    testedOnTarget: Boolean(c.tested_on_target),
    // The release the argument array was authored/reviewed for. Missing (null) when the atlas records only a
    // source snapshot; never filled from the latest recheck.
    engineRelease: (c.engine_release ?? null) as string | null,
    sourceCommit: (c.reviewed_source_commit ?? null) as string | null,
    reviewedOn: (c.reviewed_on ?? null) as string | null,
    referenceScope: (c.reference_scope ?? null) as string | null,
    // Latest release applicability recheck: a release-note/source review, not a CLI or runtime validation.
    recheck: recheck ? {
      checkedOn: recheck.checked_on as string,
      engineRelease: recheck.engine_release as string,
      engineCommit: (recheck.engine_commit ?? null) as string | null,
      argumentStatus: neutral((recheck.argument_array_status ?? null) as string | null),
      reconciliation: ((recheck.required_reconciliation ?? []) as string[]).map((item) => neutral(item)),
      sourceIds: (recheck.source_ids ?? []) as string[],
      testedOnTarget: Boolean(recheck.tested_on_target),
    } : null,
    priorRechecks: ((c.prior_release_rechecks ?? []) as Json[]).map((item) => ({ checkedOn: item.checked_on as string, engineRelease: item.engine_release as string })),
    sourceIds: c.source_ids as string[],
  };
});

const releases = (aa.releases as Json[]).map((r) => ({
  key: r.key as string,
  role: r.role as "catalog" | "frontier_reference",
  catalogKey: (r.catalog_key ?? null) as string | null,
  name: r.aa_release_name as string,
  creator: r.creator as string,
  releaseDate: r.aa_release_date as string,
  openWeights: Boolean(r.open_weights),
  deprecatedTo: (r.aa_deprecated_to ?? null) as string | null,
  highest: r.highest_published_variant?.v5_0_1 ? { slug: r.highest_published_variant.v5_0_1.aa_slug as string, index: r.highest_published_variant.v5_0_1.index as number } : null,
  variants: (r.variants as Json[]).map((v) => ({
    slug: v.aa_slug as string,
    name: v.aa_name as string,
    effort: v.effort as string,
    reasoning: Boolean(v.is_reasoning),
    index: (v.v5_0_1?.index ?? null) as number | null,
    status: v.v5_0_1?.status as string,
    missing: (v.v5_0_1?.missing_components ?? []) as string[],
    components: (v.v5_0_1?.components ?? {}) as Record<string, number | null>,
    source: source(v.v5_0_1?.source_id),
  })),
}));

const snapshot = {
  atlas: { commit: atlasCommit, asOf: catalog.as_of as string, importedFrom: "catalog/models.json, catalog/configurations.json, catalog/aa-intelligence-index.json, evidence/sources.json" },
  hardware: [{ id: "b300", name: "NVIDIA B300", memoryGb: 288, interconnect: "8-GPU node · OEM inventory pending", sourceIds: ["HW", "CC"], note: "288 GB HBM3e per GPU is NVIDIA's published reference; driver-visible memory on the actual host is not inventoried." }],
  // Benchmark datasets. Token budgets are per turn: input → output. No immutable dataset revision or sampling
  // record is pinned yet, so both stay null (rendered "—") rather than naming an unpinned file.
  workloads: [
    { id: "single-turn-8k", name: "single-turn-8k", inputTokens: 8000, outputTokens: 500, turns: 1, multiplier: 1, sharedPrefixes: null, conversations: 4000, tags: ["prefix-immune", "balanced profile"], cache: "cold", sampling: null, datasetRevision: null, description: "Every conversation has a different prefix — immune to prefix-cache inflation, the fair throughput test." },
    { id: "single-turn-smoke", name: "single-turn-smoke", inputTokens: 1024, outputTokens: 256, turns: 1, multiplier: 1, sharedPrefixes: null, conversations: 200, tags: ["prefix-immune", "default run", "costly · +2h/run"], cache: "cold", sampling: null, datasetRevision: null, description: "Small prefix-immune smoke run." },
    { id: "chat-8-turn", name: "chat-8-turn", inputTokens: 256, outputTokens: 256, turns: 8, multiplier: 8, sharedPrefixes: "128 × 2k shared prefixes", conversations: 4000, tags: ["multi-turn"], cache: "warm", sampling: null, datasetRevision: null, description: "Realistic multi-turn chat with shared history prefixes — stresses KV cache growth." },
    { id: "coding-agent-48-turn", name: "coding-agent-48-turn", inputTokens: 2048, outputTokens: 512, turns: 48, multiplier: 48, sharedPrefixes: "64 × 4k shared prefixes", conversations: 2000, tags: ["multi-turn"], cache: "warm", sampling: null, datasetRevision: null, description: "48-turn coding-agent conversations — long context, deep KV." },
    { id: "coding-agent-long-context", name: "coding-agent-long-context", inputTokens: 10240, outputTokens: 512, turns: 19, multiplier: 19, sharedPrefixes: "16 × 33k shared prefixes", conversations: 300, tags: ["multi-turn", "KV-saturation", "costly · +2h/run"], cache: "warm", sampling: null, datasetRevision: null, description: "KV-saturation stress: ~250k-token conversations — point measurements only, +2h per run." },
    { id: "balanced-8k-legacy", name: "balanced-8k-legacy", inputTokens: 8000, outputTokens: 500, turns: 1, multiplier: 1, sharedPrefixes: null, conversations: null, tags: ["balanced profile", "legacy"], cache: "cold", sampling: null, datasetRevision: null, description: "V1 balanced profile — NOT prefix-immune, measured with guidellm-0.5.4 — treat cross-comparisons with care." },
  ],
  models,
  artifacts,
  unavailableExports,
  configurations: configs,
  intelligence: {
    name: aa.index.name as string,
    publisher: aa.index.publisher as string,
    version: "v5.0.1",
    asOf: aa.as_of as string,
    scale: aa.index.scale as string,
    compositeRule: aa.index.composite_rule as string,
    components: (aa.index.components as Json[]).map((c) => ({ category: c.category as string, evaluation: c.evaluation as string, weight: c.weight as number, scoring: c.scoring as string })),
    method: source("AA-II-METHOD"),
    evidenceLabel: aa.evidence_label as string,
    applicability: aa.applicability as string[],
    releases,
  },
  cardBenchmarks: cards ? { extractedOn: cards.extracted_on as string, method: cards.method as string, cards: cards.cards as Json[] } : null,
};

const text = `${JSON.stringify(snapshot, null, 1)}\n`;
if (process.argv.includes("--check")) {
  const current = await Bun.file(out).text().catch(() => "");
  if (current !== text) { console.error("src/data/atlas.json is stale; run bun run import:atlas"); process.exit(1); }
  console.log("src/data/atlas.json matches the atlas");
} else {
  await Bun.write(out, text);
  console.log(`Pinned atlas ${atlasCommit.slice(0, 7)}: ${models.length} models, ${artifacts.length} exports, ${configs.length} configurations, ${releases.length} AA releases${cards ? `, ${(cards.cards as Json[]).length} HF cards` : ", no HF card benchmarks yet"}`);
}
