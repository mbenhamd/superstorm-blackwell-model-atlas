/**
 * Published explorer view helpers (src/client/components/app/published-data.ts) over the committed external dataset:
 * URL round trip, facet counts under the other filters, weak records hidden by default, the headline value and the
 * default ladder metric. These are external records (evidence class "external"); nothing here ranks them.
 */
import { describe, expect, test } from "bun:test";
import { externalDataset } from "../src/client/lib/external.ts";
import { ATLAS } from "../src/domain/catalog.ts";
import { derivationText, displayUnit, hardwareClass, isWeak, metricIndexes, metricName, sourceLinkText } from "../src/domain/external.ts";
import { curveWorkloads, recordWorkload, sameWorkload } from "../src/client/components/app/throughput-external-data.ts";
import {
  EMPTY_FILTERS, applyFilters, concurrencySpan, defaultLadderMetric, facetCounts, filterParams, formatValue, headline, hiddenWeak,
  isFiltered, ladderMetrics, metricTitle as publishedMetricTitle, parseFilters, type PublishedFilters,
} from "../src/client/components/app/published-data.ts";

const data = externalDataset();
const modelIds = new Set(ATLAS.models.map((model) => model.id));
const roundTrip = (filters: PublishedFilters) => {
  const search = new URLSearchParams();
  for (const [key, value] of filterParams(filters)) search.append(key, value);
  return parseFilters(new URLSearchParams(search.toString()), data.records, modelIds);
};

describe("published explorer view helpers", () => {
  test("filters survive a URL round trip, including evidence classes with commas", () => {
    const evidence = data.records.map((record) => record.evidenceClass).find((value) => value.includes(","))!;
    expect(evidence).toBeDefined();
    const filters: PublishedFilters = { ...EMPTY_FILTERS, model: "kimi-k3", hardware: ["B300", "GB300"], engines: ["vllm"], versions: ["stable"], evidence: [evidence], flags: ["spec-decode"], without: ["synthetic-acceptance"], kind: "ladder", weak: true };
    expect(roundTrip(filters)).toEqual(filters);
    expect(roundTrip(EMPTY_FILTERS)).toEqual(EMPTY_FILTERS);
    expect(filterParams(EMPTY_FILTERS)).toEqual([]);
  });

  test("unknown URL values are dropped", () => {
    const parsed = parseFilters(new URLSearchParams("model=nope&hw=A100&engine=foo&version=bogus&flag=x&kind=line&weak=yes"), data.records, modelIds);
    expect(parsed).toEqual(EMPTY_FILTERS);
    expect(isFiltered(parsed)).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTERS, weak: true })).toBe(false);
  });

  test("weak records (invalid version, unverified extraction, superseded run) are hidden unless shown", () => {
    const weak = data.records.filter(isWeak);
    expect(weak.length).toBeGreaterThan(0);
    expect(weak.some((record) => record.audit.class === "invalid")).toBe(true);
    const shown = applyFilters(data.records, EMPTY_FILTERS);
    expect(shown.some(isWeak)).toBe(false);
    expect(shown.some((record) => record.audit.class === "invalid")).toBe(false);
    expect(shown.length + weak.length).toBe(data.records.length);
    expect(hiddenWeak(data.records, EMPTY_FILTERS)).toBe(weak.length);
    expect(applyFilters(data.records, { ...EMPTY_FILTERS, weak: true }).length).toBe(data.records.length);
    expect(hiddenWeak(data.records, { ...EMPTY_FILTERS, weak: true })).toBe(0);
  });

  test("facet counts ignore their own selection and respect the others", () => {
    const filters: PublishedFilters = { ...EMPTY_FILTERS, model: "kimi-k3", hardware: ["B300"] };
    const hardware = facetCounts(data.records, filters, "hardware");
    const kimi = applyFilters(data.records, { ...EMPTY_FILTERS, model: "kimi-k3" });
    expect(hardware.get("B300")).toBe(kimi.filter((record) => hardwareClass(record.gpuType) === "B300").length);
    expect([...hardware.values()].reduce((sum, count) => sum + count, 0)).toBe(kimi.length);
    const models = facetCounts(data.records, filters, "model");
    expect(models.get("kimi-k3")).toBe(applyFilters(data.records, filters).length);
    expect(models.size).toBeGreaterThan(1);
  });

  test("headline is the highest published output tok/s/GPU of one level, null without that metric", () => {
    for (const record of data.records) {
      const value = headline(record);
      const indexes = metricIndexes(record, "output-per-gpu");
      if (!indexes.length) { expect(value).toBeNull(); continue; }
      if (!value) continue;
      expect(value.metric.kind).toBe("output-per-gpu");
      for (const index of indexes) for (const level of record.levels) {
        const cell = level.values[index];
        if (cell !== null && cell !== undefined && !level.details[index]?.qualifier) expect(cell).toBeLessThanOrEqual(value.value);
      }
    }
  });

  test("ladder metrics need two concurrency levels; the default prefers per-GPU throughput", () => {
    const ladder = data.records.find((record) => record.kind === "ladder" && metricIndexes(record, "output-per-gpu").length > 0 && ladderMetrics(record).length > 1)!;
    expect(ladder).toBeDefined();
    const chosen = defaultLadderMetric(ladder)!;
    expect(ladder.metrics[chosen]!.kind).toBe("output-per-gpu");
    const point = data.records.find((record) => record.kind === "point" && record.levels.length === 1)!;
    expect(ladderMetrics(point)).toEqual([]);
    expect(defaultLadderMetric(point)).toBeNull();
    expect(concurrencySpan(ladder)).toMatch(/^c\d+(–c\d+)?$/);
  });

  test("values keep '—' for missing and readable precision", () => {
    expect(formatValue(null)).toBe("—");
    expect(formatValue(0)).toBe("0");
    expect(formatValue(12345.6)).toBe("12,346");
    expect(formatValue(0.01234)).toBe("0.012");
    expect(formatValue(2.5353)).toBe("2.54");
  });
});

describe("display helpers: units, derivation, source link text, workloads", () => {
  test("every per-user rate displays as tok/s/user; other units stay as published", () => {
    const perUser = data.records.flatMap((record) => record.metrics).filter((metric) => metric.kind === "per-user");
    expect(perUser.some((metric) => metric.unit === "tok/s")).toBe(true);
    for (const metric of perUser) expect(displayUnit(metric)).toBe("tok/s/user");
    expect(displayUnit({ kind: "output-per-gpu", unit: "tok/s/GPU" })).toBe("tok/s/GPU");
    expect(displayUnit({ kind: "other", unit: null })).toBeNull();
  });

  test("a derived metric states its derivation once; the name loses its '(derived)' suffix", () => {
    expect(derivationText({ derived: true, note: "derived: ÷ 8 GPUs" }, 8)).toBe("derived: aggregate ÷ 8 GPUs");
    expect(derivationText({ derived: true, note: null }, 1)).toBe("derived: aggregate ÷ 1 GPU");
    expect(derivationText({ derived: true, note: null }, null)).toBe("derived: aggregate ÷ GPU count");
    expect(derivationText({ derived: false, note: null }, 8)).toBeNull();
    expect(metricName({ name: "output throughput per GPU (derived)" })).toBe("output throughput per GPU");
    const derived = data.records.flatMap((record) => record.metrics).find((metric) => metric.derived && metric.kind === "output-per-gpu")!;
    expect(publishedMetricTitle(derived).match(/derived/g)).toBeNull();
  });

  test("a title that only repeats an id slug reads as its lead and the date; real titles are kept", () => {
    expect(sourceLinkText({ title: "Fixstars: fixstars-deploying-kimi-k3-on-day-0", publisher: "Fixstars", publishedOn: "2026-07-28" })).toBe("Fixstars · 2026-07-28");
    expect(sourceLinkText({ title: "SGLang cookbook benchmark data: glm-5-3-benchmarks", publisher: "SGLang", publishedOn: "not stated" })).toBe("SGLang cookbook benchmark data");
    expect(sourceLinkText({ title: "audn.ai benchmark", publisher: "audn.ai", publishedOn: null })).toBe("audn.ai benchmark");
    expect(sourceLinkText({ title: "Kimi K3 on B300: throughput and latency", publisher: "X", publishedOn: null })).toBe("Kimi K3 on B300: throughput and latency");
  });

  test("workload match is exact ISL/OSL; unstated or variable lengths count as different", () => {
    const record = (isl: number | null, osl: number | null) => ({ workload: { name: "w", isl, osl } });
    expect(recordWorkload(record(1024, 256))).toBe("ISL 1,024 / OSL 256");
    expect(recordWorkload(record(null, 256))).toBe("workload not stated");
    expect(sameWorkload(record(8000, 500), { inputTokens: 8000, outputTokens: 500 })).toBe(true);
    expect(sameWorkload(record(8192, 1024), { inputTokens: 8000, outputTokens: 500 })).toBe(false);
    expect(sameWorkload(record(null, null), { inputTokens: 8000, outputTokens: 500 })).toBe(false);
    expect(sameWorkload(record(256, 256), { inputTokens: null, outputTokens: 256 })).toBe(false);
    const curves = [{ tag: "V1", record: record(61, 1152) }, { tag: "S1", record: record(1024, 256) }, { tag: "V2", record: record(61, 1152) }] as unknown as Parameters<typeof curveWorkloads>[0];
    expect(curveWorkloads(curves)).toEqual([{ label: "ISL 61 / OSL 1,152", tags: ["V1", "V2"] }, { label: "ISL 1,024 / OSL 256", tags: ["S1"] }]);
  });
});
