import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { hardwareStatus } from "../../../domain/external.js";
import { externalDataset } from "../../lib/external.js";
import { routeUrl } from "../../state.js";
import { ENGINE_FAMILIES as FAMILIES, PUBLISHED_PER_ENGINE as PER_ENGINE, publishedEngineCharts, type HardwareChart } from "./engine-published-data.js";
import { curveWorkloads, metricTitle } from "./throughput-external-data.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PublishedLadderChart, PublishedRecordLine, type LadderLine } from "./throughput-external.js";
import { Panel } from "./primitives.js";

/*
 * Published vLLM vs SGLang (external evidence) for the Engine page: per GPU class, one small chart with the published
 * concurrency ladders of the model on that GPU, vLLM in the vLLM hue (chart-1) and SGLang in the SGLang hue
 * (chart-2), dashed because they are published, not measured. One metric per chart (one y-axis): the metric family
 * both engines published most on that GPU (per-GPU throughput first). No verdict, Δ or tie is derived: workloads,
 * configurations, checkpoints and versions differ per source. Weak records are hidden unless "Show weak records".
 * The x-axis is numeric log₂ concurrency, so ladders with different level sets keep their true spacing. The plotted
 * metric and the "derived" note are the chart's subtitle; each legend line keeps source, hardware, engine/version
 * with its audit class, workload and its first two caveats ("+N" lists the rest; the explorer has everything).
 * When the plotted ladders do not share one ISL/OSL, the chart header carries a "workloads differ" chip and lists each
 * workload with its tags: a gap between the lines is then a workload difference as much as an engine difference.
 */

/** Line dash per ladder within one engine (both dashed: published, not measured). */
const DASHES = ["5 3", "2 3"] as const;

function Swatch({ color, dash }: { color: string; dash: string }) {
  return <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true" className="shrink-0"><line x1="1" y1="4" x2="21" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash} /></svg>;
}

export function EnginePublished({ modelId, modelName }: { modelId: string; modelName: string }) {
  const dataset = externalDataset();
  const [showWeak, setShowWeak] = React.useState(false);
  const charts = React.useMemo(() => publishedEngineCharts(dataset, modelId, showWeak), [dataset, modelId, showWeak]);
  const style = (curve: HardwareChart["curves"][number]) => {
    const family = FAMILIES.find((item) => item.family === curve.family)!;
    return { color: family.color, dash: DASHES[Number(curve.tag.slice(1)) - 1] ?? DASHES[0], label: family.label };
  };
  return (
    <Panel
      id="engine-published"
      title="Published vLLM vs SGLang (external)"
      description={<>{modelName} · published concurrency ladders per GPU class, one chart each · third-party, engine-project and vendor results, not measured here</>}
      actions={
        <label className="text-ink-2 inline-flex items-center gap-1.5 text-xs">
          <Switch size="sm" checked={showWeak} onCheckedChange={(value) => setShowWeak(value === true)} aria-label="Show weak records" data-testid="engine-published-weak" />Show weak records
        </label>
      }
      bodyClassName="space-y-4"
    >
      {!charts.length ? (
        <p className="text-muted-foreground text-[13px] text-pretty" data-testid="engine-published-empty">No published vLLM or SGLang concurrency ladder of {modelName}{showWeak ? "" : " (weak records hidden)"}.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2" data-testid="engine-published">
          {charts.map((chart) => {
            const metric = chart.curves[0]!.metric;
            const derived = chart.curves.filter((curve) => curve.metric.derived);
            // "other" collects stated non-B300 GPUs and GPU types the source does not state: never a mismatch for the latter.
            const statuses = new Set(chart.curves.map((curve) => hardwareStatus(curve.record)));
            const title = chart.hardware === "other" ? (statuses.has("other") ? (statuses.has("unstated") ? "Other GPU or not stated" : "Other GPU") : "Hardware not stated") : chart.hardware;
            const workloads = curveWorkloads(chart.curves);
            const lines: LadderLine[] = chart.curves.map((curve) => ({ key: curve.record.id, tag: curve.tag, label: `${style(curve).label} · ${dataset.sources[curve.record.sourceId]?.publisher ?? curve.record.sourceId}`, color: style(curve).color, dash: style(curve).dash, points: curve.points }));
            return (
              <figure key={chart.hardware} className="m-0 min-w-0 rounded-md border p-3" data-published-hardware={chart.hardware} data-published-kind={chart.kind}>
                <figcaption className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[13px] font-semibold">{title}</span>
                  <span className="text-ink-2 text-xs" data-chart-metric={metric.kind}>{metricTitle(metric)}{derived.length ? ` · derived ÷ GPUs for ${derived.map((curve) => curve.tag).join(", ")}` : ""}</span>
                  {chart.hardware === "B300" ? null : statuses.has("other") ? <Badge variant="warning">not B300</Badge> : <Badge variant="neutral" data-hardware-status="unstated">hardware not stated</Badge>}
                  {chart.engines.length < 2 ? <Badge variant="neutral" data-testid="published-one-engine">only {FAMILIES.find((item) => item.family === chart.engines[0])?.label} published</Badge> : null}
                  {workloads.length > 1 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="warning" tabIndex={0} className="cursor-default" data-testid="published-workloads-differ" data-workloads={workloads.length}>workloads differ</Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-80 text-pretty">The ladders on this chart ran different input/output lengths, so the gap between them is not an engine comparison.</TooltipContent>
                    </Tooltip>
                  ) : null}
                  {workloads.length > 1 ? (
                    <span className="text-muted-foreground basis-full text-xs tabular-nums" data-testid="published-workload-list">
                      {workloads.map((item) => `${item.tags.join(", ")}: ${item.label}`).join(" · ")}
                    </span>
                  ) : null}
                </figcaption>
                <PublishedLadderChart title={`${modelName} on ${title}: ${metricTitle(metric)}, published`} yTitle={metric.unit ?? metric.name} lines={lines} xScale="log" />
                <ul className="mt-2 space-y-2 border-t pt-2" data-testid="engine-published-legend">
                  {chart.curves.map((curve) => (
                    <li key={curve.record.id} data-published-engine={curve.family}>
                      <PublishedRecordLine curve={curve} dataset={dataset} compact swatch={<Swatch color={style(curve).color} dash={style(curve).dash} />} />
                    </li>
                  ))}
                </ul>
                {chart.hidden ? <p className="text-muted-foreground mt-2 text-xs">{chart.hidden} more ladder{chart.hidden === 1 ? "" : "s"} on {chart.hardware} (older, or another metric) in the published explorer.</p> : null}
              </figure>
            );
          })}
        </div>
      )}
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-pretty">
        <span>Values as published (the source's metric name and unit). Workloads, configurations, checkpoints and engine versions differ per source, so no verdict, Δ or tie is derived; the matchup and per-workload verdicts above use measured runs only. Up to {PER_ENGINE} newest ladders per engine and GPU.</span>
        <a className="text-link inline-flex items-center gap-0.5 hover:underline" href={routeUrl("published")} data-testid="engine-published-explorer">All published results<ArrowUpRight className="size-3" aria-hidden="true" /></a>
      </p>
    </Panel>
  );
}
