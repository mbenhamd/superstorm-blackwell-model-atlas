/**
 * External published results (src/domain/external.ts, scripts/import-external.ts, data/external-benchmarks.json):
 * import validation and transform, selectors, and proof that the external layer never reaches the measured lenses
 * (rank, capacity, sustainable throughput, C_max, Δ vs best, champions, frontier, variants, Compare deltas, CSV).
 * The small datasets built below are hand-written validation inputs, not published results.
 */
import { describe, expect, test } from "bun:test";
import { dirname, join, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { Effect } from "effect";
import { ATLAS, createCatalogSnapshot } from "../src/domain/catalog.ts";
import { capacity, DEFAULT_SLO, frontier, rank } from "../src/domain/metrics.ts";
import { setupStandings } from "../src/domain/setups.ts";
import { groupVariants, variantRows } from "../src/domain/variants.ts";
import {
  bestPublished, displayFlags, externalCoverage, externalSeries, filterExternal, FLAG_LABELS, gpuTypeStated, hardwareClass, hardwareStatus, isWeak, latencyMs, metricIndexes, metricKind,
  parseExternalDataset, publishedForConfiguration, recordDate, sourcesOf, weakReasons, type ExternalDataset,
} from "../src/domain/external.ts";
import { catalogRefs, scrub, serialise, sourcesSection, transform, withSourcesSection } from "../scripts/import-external.ts";
import { ValidationError } from "../src/domain/validation.ts";
import { loadRunsFile, memoryStore } from "../src/server/repository.ts";

const root = join(import.meta.dir, "..");
const text = readFileSync(join(root, "data/external-benchmarks.json"), "utf8");
const file = JSON.parse(text) as Record<string, unknown>;
const data: ExternalDataset = parseExternalDataset(file, catalogRefs);
const records = data.records;

/** A minimal valid file-form dataset (hand-written validation input). */
function minimal(): Record<string, any> {
  return {
    schemaVersion: 1, retrievedOn: "2026-11-08",
    conventions: { flags: { "hardware-mismatch": "GPU type is not B300", "superseded-run": "superseded" }, derived: "derived", kserve: "not KServe", versionClasses: { stable: "release" } },
    releases: { vllm: [{ version: "v0.33.0", date: "2026-11-02", prerelease: false }] },
    sources: { "src-a": { url: "https://example.org/a", title: "A", publisher: "Example", publishedOn: "2026-10-01", evidenceClass: "third-party measurement", retrievedOn: "2026-11-07" } },
    records: [{
      id: "rec-a", kind: "ladder", modelId: "kimi-k3", publishedModel: "moonshotai/Kimi-K3", precision: "MXFP4", gpuType: "H200", gpuCount: 8,
      engine: "vLLM", engineVersion: "0.33.0", audit: { class: "stable", canonical: "v0.33.0", engineFamily: "vllm", flags: [] },
      config: "TP8", workload: { name: "random 8k/1k", isl: 8192, osl: 1024 }, sourceId: "src-a", catalogConfigurationId: null, flags: ["hardware-mismatch"],
      metrics: [["output throughput per GPU (derived)", "tok/s/GPU", true, null, null, "derived: ÷ 8 GPUs"], ["TTFT", "s", false, "p95"]],
      levels: [{ concurrency: 4, values: [100, 1.5] }, { concurrency: 1, values: [40, null] }],
    }],
  };
}
const rejects = (mutate: (input: Record<string, any>) => void, message: RegExp) => {
  const input = minimal();
  mutate(input);
  expect(() => parseExternalDataset(input, catalogRefs)).toThrow(message);
};

describe("committed external dataset", () => {
  test("validates: 596 records (490 ladders, 106 points) from 177 sources, every one evidence 'external'", () => {
    expect(records).toHaveLength(596);
    expect(records.filter((record) => record.kind === "ladder")).toHaveLength(490);
    expect(Object.keys(data.sources)).toHaveLength(177);
    expect(records.every((record) => record.evidence === "external")).toBe(true);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
    expect(records.every((record) => data.sources[record.sourceId] && ATLAS.models.some((model) => model.id === record.modelId))).toBe(true);
    expect(records.every((record) => record.levels.every((level) => level.values.length === record.metrics.length))).toBe(true);
  });
  test("is in canonical form, keeps docs/SOURCES.md in sync, and holds no local path or pipeline bookkeeping", () => {
    expect(serialise(file)).toBe(text);
    const doc = readFileSync(join(root, "docs/SOURCES.md"), "utf8");
    expect(withSourcesSection(doc, sourcesSection(file))).toBe(doc);
    expect(text).not.toMatch(/\/tmp\/|\/Users\/|\/var\/folders|file:\/\//);
    expect(text).not.toMatch(/"(origin|originFile|mergeNote|sourceIdOriginal|publishedOnVariants)"/);
    expect(text).not.toMatch(/external-(merged|ladders|benchmarks-h200)/);
  });
  test("every caveat flag has a short label and a description", () => {
    const flags = new Set(records.flatMap((record) => record.flags));
    for (const flag of flags) { expect(FLAG_LABELS[flag]).toBeTruthy(); expect(data.conventions.flags[flag]).toBeTruthy(); }
  });
});

describe("import validation", () => {
  test("the minimal dataset parses; absent optional fields read as null; evidence class falls back to the source", () => {
    const parsed = parseExternalDataset(minimal(), catalogRefs).records[0]!;
    expect(parsed.topology).toBeNull();
    expect(parsed.publishedOn).toBeNull();
    expect(parsed.evidenceClass).toBe("third-party measurement");
    expect(parsed.audit.raw).toBe("0.33.0");
    expect(parsed.metrics[0]).toMatchObject({ derived: true, kind: "output-per-gpu", note: "derived: ÷ 8 GPUs" });
    expect(parsed.levels[1]!.values).toEqual([40, null]);
  });
  test("rejects duplicate ids, unknown sources, models and configurations, unlabelled flags, local paths and ragged levels", () => {
    rejects((input) => input.records.push(structuredClone(input.records[0])), /duplicate id rec-a/);
    rejects((input) => { input.records[0].sourceId = "missing"; }, /sourceId missing is not in sources/);
    rejects((input) => { input.records[0].modelId = "not-a-model"; }, /not a catalog model/);
    rejects((input) => { input.records[0].catalogConfigurationId = "kimi-k3.nope"; }, /not a catalog configuration/);
    rejects((input) => { input.records[0].catalogConfigurationId = ATLAS.configurations.find((c) => c.modelId === "glm-5.3")!.id; }, /belongs to glm-5\.3/);
    rejects((input) => { input.records[0].flags = ["brand-new-flag"]; }, /brand-new-flag has no label/);
    rejects((input) => { input.records[0].notes = "rows in /tmp/out/rows.json"; }, /local path/);
    rejects((input) => { input.records[0].levels[0].shape = "see /Users/x/file"; }, /local path/);
    rejects((input) => { input.records[0].levels[0].values = [1]; }, /one entry per metric/);
    rejects((input) => { input.records[0].audit.class = "stable-ish"; }, /class must be one of/);
    rejects((input) => { input.sources["src-a"].url = "example.org"; }, /absolute http/);
    rejects((input) => { input.records[0].levels[0].concurrency = 0; }, /positive integer/);
    rejects((input) => { input.schemaVersion = 2; }, /schemaVersion/);
    expect(() => parseExternalDataset(null, catalogRefs)).toThrow(ValidationError);
  });
  test("transform: drops bookkeeping and unreferenced sources, scrubs local paths, keeps load points as published", () => {
    const merged = {
      retrievedOn: "2026-11-08", conventions: { flags: { "hardware-mismatch": "not B300", "nightly-build / engine-version-not-stated / custom-image-tag": "combined" }, derived: "d", kserve: "k", engineVersionAudit: { stable: "release" } },
      releases: { vllm: [{ version: "v0.32.0", date: "2026-10-18", prerelease: false, pypiFirstUpload: "2026-10-18" }, { version: "v0.33.0", date: "2026-11-02", prerelease: false }] },
      sources: {
        used: { url: "https://example.org/u", title: "U", publisher: "P", publishedOn: "2026-10-01", evidenceClass: "vendor claim", retrievedOn: "2026-11-07", origin: "working file" },
        unused: { url: "https://example.org/x", title: "X", publisher: "P", publishedOn: "not stated", evidenceClass: "vendor claim" },
      },
      ladders: [{
        id: "l1", modelId: "kimi-k3", publishedModel: "m", precision: "p", gpuType: "B300", gpuCount: 8, topology: "TP8", engine: "SGLang", engineVersion: "v0.5.23",
        engineVersionAudit: { raw: "v0.5.23", class: "stable", canonical: "v0.5.23", releaseDate: "2026-11-02", flags: [], engineFamily: "sglang", commits: [{ sha: "abc" }] },
        config: "c", workload: { name: "w", isl: 8192, osl: 1024 }, sourceId: "used", publishedOn: "2026-10-01", evidenceClass: "vendor claim", catalogConfigurationId: null,
        mismatch: null, flags: [], origin: "research pass", notes: "SUPERSEDED run (compact metrics; full metrics in /tmp/x/full.json); see /tmp/y.json",
        levels: [{ concurrency: 1, requestRate: null, metrics: [{ name: "output throughput", value: 10, unit: "tok/s", perGpu: false, percentile: null, publishedLabel: "out" }] }],
      }],
      points: [{
        id: "p1", modelId: "kimi-k3", publishedModel: "m", precision: "p", gpuType: "B300", gpuCount: 8, engine: "vLLM", engineVersion: "not stated",
        engineVersionAudit: { raw: "not stated", class: "not-stated", canonical: null, releaseDate: null, flags: [] }, config: "c", workload: { name: "w", isl: null, osl: null },
        loadPoint: "concurrency 16 sessions", metrics: [{ name: "peak throughput (lower bound)", value: 16000, unit: "tok/s/GPU", perGpu: true, percentile: null, qualifier: ">" }],
        sourceId: "used", catalogConfigurationId: null, mismatch: "m", notes: null, mergeNote: "x", originFile: "working.json",
      }],
    };
    const out = transform(merged) as Record<string, any>;
    const parsed = parseExternalDataset(out, catalogRefs);
    expect(Object.keys(out.sources)).toEqual(["used"]);
    expect(out.sources.used.origin).toBeUndefined();
    expect(out.releases.vllm.map((r: { version: string }) => r.version)).toEqual(["v0.33.0", "v0.32.0"]);
    expect(Object.keys(out.conventions.flags)).toEqual([]);
    const ladder = parsed.records.find((r) => r.id === "l1")!;
    expect(ladder.notes).toBe("SUPERSEDED run (compact metrics); see (local extraction file, not published)");
    expect(JSON.stringify(out)).not.toMatch(/origin|mergeNote|commits|\/tmp\//);
    // A textual load point stays a label: no concurrency is read out of the words.
    const point = parsed.records.find((r) => r.id === "p1")!;
    expect(point.levels[0]).toMatchObject({ concurrency: null, label: "concurrency 16 sessions" });
    expect(point.levels[0]!.details[0]!.qualifier).toBe(">");
    expect(scrub("plain text")).toBe("plain text");
  });
  test("an unstated GPU type is unknown, not a mismatch: no gpuType, gpu-type-unstated instead of hardware-mismatch / other-hardware", () => {
    const base = minimal();
    const record = base.records[0];
    const merged = {
      retrievedOn: "2026-11-08", conventions: { flags: { "hardware-mismatch": "not B300", "other-hardware": "other GPU", "spec-decode": "spec" }, derived: "d", kserve: "k" },
      releases: {}, sources: base.sources,
      ladders: [{ ...record, gpuType: "not stated", engineVersionAudit: record.audit, flags: ["hardware-mismatch", "other-hardware", "spec-decode"],
        levels: [{ concurrency: 1, metrics: [{ name: "output throughput", value: 10, unit: "tok/s", perGpu: false, percentile: null }] }] }],
      points: [],
    };
    const out = transform(merged) as Record<string, any>;
    expect(out.records[0].gpuType).toBeNull();
    expect(out.records[0].flags).toEqual(["gpu-type-unstated", "spec-decode"]);
    const parsed = parseExternalDataset(out, catalogRefs).records[0]!;
    expect(hardwareStatus(parsed)).toBe("unstated");
    expect(hardwareStatus({ gpuType: "H200" })).toBe("other");
    expect(hardwareStatus({ gpuType: "B300 SXM" })).toBe("target");
    // The committed file: every record flagged "not B300" / "other GPU" states a GPU type.
    expect(records.filter((r) => r.flags.includes("hardware-mismatch") || r.flags.includes("other-hardware")).every((r) => gpuTypeStated(r.gpuType))).toBe(true);
    rejects((input) => { input.records[0].gpuType = null; }, /hardware-mismatch needs a stated gpuType/);
  });
  test("display flags drop what a badge beside them already states", () => {
    const flags = ["engine-version-not-stated", "hardware-mismatch", "spec-decode"];
    const audit = (cls: string) => ({ class: cls }) as ExternalDataset["records"][number]["audit"];
    expect(displayFlags({ flags, gpuType: "H200", audit: audit("not-stated") })).toEqual(["hardware-mismatch", "spec-decode"]);
    expect(displayFlags({ flags, gpuType: null, audit: audit("custom-tag") })).toEqual(["engine-version-not-stated", "spec-decode"]);
  });
});

describe("selectors", () => {
  test("metric kinds follow exact published wording and units", () => {
    const kind = (name: string, unit: string | null, perGpu = false) => metricKind({ name, unit, perGpu });
    expect(kind("output throughput per GPU", "tok/s/GPU", true)).toBe("output-per-gpu");
    expect(kind("output throughput per GPU (derived)", "tok/s/GPU", true)).toBe("output-per-gpu");
    expect(kind("output throughput per GPU", "tok/s", true)).toBe("other");
    expect(kind("output throughput per decode GPU", "tok/s/GPU", true)).toBe("other");
    expect(kind("total throughput per GPU (incl. prefix-cache-hit input)", "tok/s/GPU", true)).toBe("total-per-gpu");
    expect(kind("output throughput", "tok/s")).toBe("output");
    expect(kind("per-user output throughput (interactivity)", "tok/s")).toBe("per-user");
    expect(kind("TTFT", "s")).toBe("ttft");
    expect(kind("TPOT", "ms")).toBe("tpot");
    expect(kind("best output throughput (8k input, >=40 tok/s/user)", "tok/s/GPU", true)).toBe("other");
    expect(latencyMs(1.5, "s")).toBe(1500);
    expect(latencyMs(3, "tokens")).toBeNull();
  });
  test("hardware classes take the leading GPU name; unknown is 'other'", () => {
    expect(hardwareClass("B300")).toBe("B300");
    expect(hardwareClass("H200 NVL")).toBe("H200");
    expect(hardwareClass("H100 (hardware mismatch: not a target GPU)")).toBe("H100");
    expect(hardwareClass("not stated")).toBe("other");
    expect(hardwareClass(null)).toBe("other");
  });
  test("weak records (invalid version, unverified extraction, superseded run) are hidden unless asked for", () => {
    const weak = records.filter(isWeak);
    expect(weak.length).toBeGreaterThan(0);
    expect(records.filter((r) => r.audit.class === "invalid").every(isWeak)).toBe(true);
    expect(records.filter((r) => r.flags.includes("superseded-run") || r.flags.includes("unverified-extraction")).every(isWeak)).toBe(true);
    expect(filterExternal(records)).toHaveLength(records.length - weak.length);
    expect(filterExternal(records, { showWeak: true })).toHaveLength(records.length);
    expect(filterExternal(records).some((r) => r.audit.class === "invalid")).toBe(false);
    expect(weakReasons(records.find((r) => r.audit.class === "invalid")!)).toContain("invalid engine version");
  });
  test("filters by model, hardware, engine, version class, evidence class and flags", () => {
    const kimiB300 = filterExternal(records, { modelId: "kimi-k3", hardware: ["B300"] });
    expect(kimiB300.length).toBeGreaterThan(0);
    expect(kimiB300.every((r) => r.modelId === "kimi-k3" && hardwareClass(r.gpuType) === "B300" && !isWeak(r))).toBe(true);
    expect(filterExternal(records, { engines: ["sglang"], versionClasses: ["stable"] }).every((r) => r.audit.engineFamily === "sglang" && r.audit.class === "stable")).toBe(true);
    expect(filterExternal(records, { flags: ["spec-decode", "synthetic-acceptance"], showWeak: true }).every((r) => r.flags.includes("spec-decode") && r.flags.includes("synthetic-acceptance"))).toBe(true);
    expect(filterExternal(records, { withoutFlags: ["hardware-mismatch"] }).some((r) => r.flags.includes("hardware-mismatch"))).toBe(false);
    const evidence = records[0]!.evidenceClass;
    expect(filterExternal(records, { evidenceClasses: [evidence], showWeak: true }).every((r) => r.evidenceClass === evidence)).toBe(true);
  });
  test("coverage, best published output tok/s/GPU per hardware × engine, series, exact configuration matches, dates and sources", () => {
    const cells = externalCoverage(records);
    expect(cells.reduce((total, cell) => total + cell.ladders + cell.points, 0)).toBe(records.length);
    const kimi = filterExternal(records, { modelId: "kimi-k3" });
    const best = bestPublished(kimi);
    expect(best.length).toBeGreaterThan(0);
    expect(new Set(best.map((b) => `${b.hardware}|${b.engine}`)).size).toBe(best.length);
    for (const entry of best) {
      expect(entry.metric.kind).toBe("output-per-gpu");
      const candidates = kimi.filter((r) => hardwareClass(r.gpuType) === entry.hardware && r.audit.engineFamily === entry.engine)
        .flatMap((r) => metricIndexes(r, "output-per-gpu").flatMap((i) => r.levels.flatMap((l) => (l.details[i]?.qualifier ? [] : [l.values[i]]))))
        .filter((v): v is number => typeof v === "number");
      expect(entry.value).toBe(Math.max(...candidates));
    }
    const ladder = kimi.find((r) => r.kind === "ladder" && r.levels.length > 2)!;
    const series = externalSeries(ladder, 0)!;
    expect(series.points.map((p) => p.concurrency)).toEqual([...series.points.map((p) => p.concurrency)].sort((a, b) => a - b));
    const matched = records.find((r) => r.catalogConfigurationId)!;
    expect(publishedForConfiguration(records, matched.catalogConfigurationId!).every((r) => r.catalogConfigurationId === matched.catalogConfigurationId)).toBe(true);
    const closestOnly = records.find((r) => r.closestCatalogConfigurationId && !r.catalogConfigurationId)!;
    expect(publishedForConfiguration(records, closestOnly.closestCatalogConfigurationId!)).not.toContain(closestOnly);
    const point = records.find((r) => r.kind === "point")!;
    expect(recordDate(point, data.sources)).toBe(data.sources[point.sourceId]!.publishedOn);
    expect(sourcesOf(kimi, data.sources).every((s) => kimi.some((r) => r.sourceId === s.id))).toBe(true);
  });
});

const measured = await Effect.runPromise(memoryStore(await loadRunsFile(join(root, "tests/fixtures/sample-runs.json"))).snapshot());
describe("external data never reaches the measured lenses", () => {
  const lenses = () => {
    const ranked = rank(measured, "single-turn-8k", DEFAULT_SLO, () => 50);
    return JSON.stringify({
      ranked, frontier: frontier(ranked), standings: setupStandings(ranked.filter((row) => row.model.id === "qwen3.8-27b")),
      variants: groupVariants(measured), rows: variantRows(measured, "single-turn-8k"), capacities: measured.deployments.map((d) => capacity(d)),
    });
  };
  test("the snapshot carries no external record, and parsing the dataset changes no ranking, capacity, standing or variant", () => {
    const before = lenses();
    const again = parseExternalDataset(JSON.parse(text), catalogRefs);
    expect(again.records).toHaveLength(records.length);
    expect(lenses()).toBe(before);
    const ids = new Set(records.map((r) => r.id));
    expect(JSON.stringify(createCatalogSnapshot())).not.toContain('"external"');
    expect(measured.deployments.some((d) => ids.has(d.id) || (d.evidence as string) === "external")).toBe(false);
    expect(measured.runs?.some((run) => ids.has(run.id))).toBe(false);
  });
  test("no ranking or export module imports the external layer (transitive import graph)", () => {
    // Pure computation and export modules: ranking, capacity, standings, variants, champions' inputs, engine verdicts,
    // Compare/CSV export and state. Pages and components may render external data beside these, never feed it in.
    const entries = [
      "src/domain/catalog.ts", "src/domain/metrics.ts", "src/domain/setups.ts", "src/domain/variants.ts", "src/domain/run-config.ts", "src/domain/config-chips.ts",
      "src/domain/validation.ts", "src/client/state.ts", "src/client/lib/display.ts", "src/client/lib/export.ts",
      "src/client/components/app/tldr-data.ts", "src/client/components/app/engine-data.ts", "src/client/components/app/throughput-profile.ts",
    ];
    const forbidden = [join(root, "src/domain/external.ts"), join(root, "src/client/lib/external.ts"), join(root, "data/external-benchmarks.json")];
    const seen = new Set<string>();
    const resolveImport = (from: string, spec: string): string | null => {
      const base = spec.startsWith("@/") ? join(root, "src/client", spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(from), spec) : null;
      if (!base) return null;
      for (const candidate of [base, base.replace(/\.js$/, ".ts"), base.replace(/\.js$/, ".tsx"), `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) if (existsSync(candidate) && !candidate.endsWith("/")) return candidate;
      return null;
    };
    const walk = (path: string): void => {
      if (seen.has(path)) return;
      seen.add(path);
      if (!/\.(ts|tsx)$/.test(path)) return;
      for (const match of readFileSync(path, "utf8").matchAll(/(?:import|export)\s[^"';]*?from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g)) {
        const target = resolveImport(path, match[1] ?? match[2]!);
        if (target) walk(target);
      }
    };
    for (const entry of entries) walk(join(root, entry));
    expect(seen.size).toBeGreaterThan(entries.length);
    expect([...seen].filter((path) => forbidden.includes(path))).toEqual([]);
  });
});
