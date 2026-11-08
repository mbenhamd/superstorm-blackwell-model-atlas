import { engineFamily, filterExternal, hardwareClass, HARDWARE_CLASSES, recordDate, type ExternalDataset, type ExternalRecord, type HardwareClass, type MetricKind } from "../../../domain/external.js";
import { plottedMetric, type PublishedCurve } from "./throughput-external-data.js";

/*
 * Published vLLM vs SGLang charts for the Engine page (pure; see engine-published.tsx for the encoding). One chart
 * per GPU class with at least one vLLM or SGLang ladder of the model; one metric family per chart: the first of
 * CHART_KINDS (per-GPU throughput first, latency last) that both engines published there, else the first either did; the newest ladders per engine are drawn, the rest counted.
 */

export type EngineFamily = "vllm" | "sglang";
export const ENGINE_FAMILIES: readonly { family: EngineFamily; label: string; color: string; prefix: string }[] = [
  { family: "vllm", label: "vLLM", color: "var(--chart-1)", prefix: "V" },
  { family: "sglang", label: "SGLang", color: "var(--chart-2)", prefix: "S" },
];
/** Metric families a per-GPU chart may use, in preference order. */
const CHART_KINDS: readonly MetricKind[] = ["output-per-gpu", "total-per-gpu", "total", "output", "per-user", "tpot", "itl", "ttft"];
/** Newest ladders per engine on one chart (older ones are counted, not drawn). */
export const PUBLISHED_PER_ENGINE = 2;

export interface HardwareChart { hardware: HardwareClass; kind: MetricKind; curves: (PublishedCurve & { family: EngineFamily })[]; hidden: number; engines: EngineFamily[] }

const hasKind = (record: ExternalRecord, kind: MetricKind) => plottedMetric(record, kind)?.metric.kind === kind;

/** One chart per GPU class with at least one vLLM or SGLang ladder; the metric both engines share wins. */
export function publishedEngineCharts(dataset: ExternalDataset, modelId: string, showWeak: boolean): HardwareChart[] {
  const records = filterExternal(dataset.records, { modelId, kind: "ladder", showWeak, engines: ["vllm", "sglang"] })
    .sort((a, b) => (recordDate(b, dataset.sources) ?? "").localeCompare(recordDate(a, dataset.sources) ?? "") || a.id.localeCompare(b.id));
  const charts: HardwareChart[] = [];
  for (const hardware of HARDWARE_CLASSES) {
    const onHardware = records.filter((record) => hardwareClass(record.gpuType) === hardware);
    if (!onHardware.length) continue;
    // First family (CHART_KINDS order) that both engines published on this GPU, else the first that either did.
    const counts = (kind: MetricKind) => ENGINE_FAMILIES.map(({ family }) => onHardware.filter((record) => engineFamily(record) === family && hasKind(record, kind)).length);
    const kind = CHART_KINDS.find((item) => counts(item).every((count) => count > 0)) ?? CHART_KINDS.find((item) => counts(item).some((count) => count > 0));
    if (!kind) continue;
    const curves: HardwareChart["curves"] = [];
    let hidden = 0;
    for (const { family, prefix } of ENGINE_FAMILIES) {
      const own = onHardware.filter((record) => engineFamily(record) === family && hasKind(record, kind));
      hidden += Math.max(0, own.length - PUBLISHED_PER_ENGINE);
      own.slice(0, PUBLISHED_PER_ENGINE).forEach((record, index) => {
        const plotted = plottedMetric(record, kind)!;
        curves.push({ record, tag: `${prefix}${index + 1}`, ...plotted, overlay: false, family });
      });
    }
    hidden += onHardware.filter((record) => !hasKind(record, kind)).length;
    charts.push({ hardware, kind, curves, hidden, engines: ENGINE_FAMILIES.filter(({ family }) => curves.some((curve) => curve.family === family)).map(({ family }) => family) });
  }
  return charts;
}
