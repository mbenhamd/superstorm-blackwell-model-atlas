import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ComposedChart } from "@/components/ui/composed-chart";
import { niceDomain } from "@/scale";
import { relativeDelta } from "../../../domain/metrics.js";
import type { Workload } from "../../../domain/types.js";
import { updateView, useAppState } from "../../state.js";
import { num, workloadBudget } from "../../lib/display.js";
import { bestPerEngine, ENGINE_TIE_BAND, ENGINES, engineVerdict, type Engine, type EngineBest, type EngineScope, type EngineVerdict } from "./engine-data.js";
import { differenceItems, MATCHED_CONTROLS, signedFraction, verdictText } from "./engine-matchup.js";
import { openRun } from "./overlays.js";
import { ErroredBadge, IncompleteBadge } from "./performance.js";
import { InfoTip, Panel, SeriesSwatch } from "./primitives.js";
import { PROFILE_HINT, workloadProfile } from "./throughput-profile.js";

/*
 * Per-workload verdicts: on every dataset, the best measured configuration of each engine (same model × GPU count,
 * active SLO) and the verdict between them. Datasets are never pooled; a Δ exists only for a matched pair.
 */

const BAND = num(ENGINE_TIE_BAND * 100);

function ProfileBadge({ workload }: { workload: Workload }) {
  const profile = workloadProfile(workload);
  if (!profile) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild><Badge variant="neutral" tabIndex={0} className="cursor-default" data-profile={profile}>{profile}</Badge></TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">{PROFILE_HINT}</TooltipContent>
    </Tooltip>
  );
}

function WorkloadCell({ workload, active }: { workload: Workload; active: boolean }) {
  const select = () => updateView((s) => { s.workload = workload.id; s.selected = []; });
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <button type="button" className="min-w-0 text-left outline-none focus-visible:underline" aria-pressed={active} aria-label={`Show workload ${workload.name}`} onClick={select}>
        <span className={cn("block truncate font-mono text-[12.5px]", active ? "text-foreground font-semibold" : "text-ink-2")}>{workload.name}</span>
        <span className="text-muted-foreground block text-xs tabular-nums">{workloadBudget(workload)}{workload.turns > 1 ? "" : " · 1 turn"}</span>
      </button>
      <ProfileBadge workload={workload} />
    </div>
  );
}

function VerdictCell({ verdict }: { verdict: EngineVerdict }) {
  const strong = verdict.kind === "lead" || verdict.kind === "tie";
  const text = verdictText(verdict);
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-[13px]" data-verdict-text={text}>
      <span className={cn(strong ? "text-foreground font-medium" : "text-muted-foreground")}>{text}</span>
      {verdict.kind === "different" ? (
        <ul className="text-muted-foreground space-y-0.5 text-xs" data-testid="verdict-differences">
          {differenceItems(verdict).map((item) => <li key={item} data-difference={item.split(":")[0]}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-[11.5px]">{label}</dt>
      <dd className="text-[13px] tabular-nums" data-missing={value === "—" || undefined}>{value}{unit && value !== "—" ? <span className="text-muted-foreground text-[11.5px]"> {unit}</span> : null}</dd>
    </div>
  );
}

function EngineCell({ engine, index, entry, other, verdict }: { engine: Engine; index: number; entry: EngineBest; other: EngineBest; verdict: EngineVerdict }) {
  const d = entry.deployment, c = entry.capacity;
  if (!d || !c) {
    return (
      <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs" data-workload-engine={engine} data-measured="false">
        <SeriesSwatch index={index} /><span className="font-medium">{engine}</span><span className="text-muted-foreground">· not measured</span>
      </div>
    );
  }
  const p = c.selectedPoint;
  const delta = verdict.kind === "lead" ? relativeDelta(c.sustainableTpmPerGpu, other.capacity?.sustainableTpmPerGpu ?? null) : null;
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border px-3 py-2.5" data-workload-engine={engine} data-measured="true">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <SeriesSwatch index={index} />
          <button type="button" className="hover:text-link min-w-0 truncate text-left text-xs font-medium hover:underline" title="Open the configuration evidence" onClick={() => openRun(d.id)}>
            {engine} · {d.exportLabel} · {d.knob ?? "Baseline"}
          </button>
        </span>
        {verdict.kind === "tie" ? <Badge variant="neutral" data-cell-delta="tie">tied</Badge> : delta !== null ? <DeltaBadge delta={delta} variant="text" showIcon={false} className="text-ink-2 font-medium" data-cell-delta={signedFraction(delta)} /> : null}
      </div>
      {d.runtimeTag ? <span className="text-muted-foreground truncate font-mono text-[11px]">{d.runtimeTag}</span> : null}
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-lg leading-6 font-semibold tracking-tight tabular-nums" data-missing={c.sustainableTpmPerGpu === null || undefined}>{num(c.sustainableTpmPerGpu)}</span>
        <span className="text-muted-foreground text-xs">tok/min/GPU</span>
      </div>
      <dl className="grid grid-cols-3 gap-x-3 gap-y-1">
        <Stat label="C_max" value={num(c.highestPassingConcurrency)} />
        <Stat label="ITL p95" value={num(p?.itlP95Ms, 1)} unit="ms" />
        <Stat label="TTFT p95" value={num(p?.ttftP95Ms)} unit="ms" />
      </dl>
      <p className="text-muted-foreground text-[11.5px] tabular-nums">{c.passingLevels} of {c.totalLevels} levels in SLO · per-user p50 {num(p?.outputTpsPerUser, 1)}{p?.outputTpsPerUser != null ? " tok/s" : ""}</p>
      {c.incomplete || c.errored ? <span className="flex flex-wrap gap-1"><IncompleteBadge count={c.incomplete} /><ErroredBadge count={c.errored} /></span> : null}
    </div>
  );
}

/**
 * Grouped bars, one group per dataset where the two engines form a matched pair with a verdict (lead or tie): each
 * engine's best sustainable tok/min/GPU there (engine hue fixed). One y-axis, one unit. "Different configs" and
 * one-sided datasets are left out, so a bar pair is never read as a verdict the rows withhold; datasets carry
 * different token budgets, so the height across groups is not a ranking of datasets. Rendered when at least two
 * datasets have a matched pair, so the chart adds what the rows cannot show.
 */
function VerdictBars({ rows }: { rows: { workload: Workload; best: Record<Engine, EngineBest>; verdict: EngineVerdict }[] }) {
  const measured = rows.filter((row) => row.verdict.kind === "lead" || row.verdict.kind === "tie");
  if (measured.length < 2) return null;
  const data = measured.map(({ workload, best }) => ({ workload: workload.name, ...Object.fromEntries(ENGINES.map((engine) => [engine, best[engine].capacity?.sustainableTpmPerGpu ?? null])) }));
  const y = niceDomain(0, Math.max(1, ...measured.flatMap(({ best }) => ENGINES.map((engine) => best[engine].capacity?.sustainableTpmPerGpu ?? 0))), 4);
  return (
    <figure className="m-0 border-b px-4 pt-3 pb-2" data-testid="verdict-bars" data-groups={measured.length}>
      <ComposedChart
        className="h-[180px]"
        data={data}
        xKey="workload"
        series={ENGINES.map((engine, index) => ({ key: engine, label: engine, type: "bar" as const, color: `var(--chart-${index + 1})` }))}
        showYAxis
        yDomain={[y.min, y.max]}
        yTicks={y.ticks}
        yFormatter={(value) => num(value)}
        yAxisTitle="Sustainable tok/min/GPU"
        tooltipLabelFormatter={(value) => String(value)}
        barRadius={3}
        animate={false}
        role="img"
        aria-label={`Best sustainable tok/min/GPU per engine on each dataset with a matched pair: ${measured.map(({ workload, best }) => `${workload.name}: ${ENGINES.map((engine) => `${engine} ${num(best[engine].capacity?.sustainableTpmPerGpu ?? null)}`).join(", ")}`).join("; ")}.`}
      />
      <figcaption className="text-ink-2 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {ENGINES.map((engine, index) => <span key={engine} className="inline-flex items-center gap-1.5"><SeriesSwatch index={index} />{engine}</span>)}
        <span className="text-muted-foreground sm:ml-auto">Matched pairs only; compare bars within a dataset, budgets differ between datasets.</span>
      </figcaption>
    </figure>
  );
}

export function EngineWorkloadVerdicts({ scope, modelName, shapeLabel }: { scope: EngineScope; modelName: string; shapeLabel: string }) {
  const state = useAppState();
  const rows = state.snapshot.workloads.map((workload) => {
    const best = bestPerEngine(state.snapshot.deployments, scope, workload.id, state.slo);
    return { workload, best, verdict: engineVerdict(best) };
  });
  const anyMeasured = rows.some((row) => row.verdict.kind !== "none");
  // Datasets neither engine ran collapse into one compact chip row; the active dataset always keeps its full row.
  const unmeasured = rows.filter((row) => row.verdict.kind === "none" && row.workload.id !== state.workload);
  return (
    <Panel
      id="engine-verdicts"
      title="Per-workload verdicts"
      description={<span data-testid="verdicts-scope">{modelName} · {shapeLabel} · best per engine on each dataset</span>}
      actions={
        <InfoTip label="How verdicts are read" testId="verdicts-info">
          Sustainable = observed total (input + output) tok/s at C_max × {num(state.slo.margin, 2)} margin × 60 ÷ GPUs. TTFT and ITL are the imported p95 at C_max; per-user speed is the p50 output tok/s per request. A verdict needs a matched pair: {MATCHED_CONTROLS}; otherwise the row reads "different configs — no verdict". |Δ| ≤ {BAND}% reads as a tie (assumed single-run noise, not a measured interval).
        </InfoTip>
      }
      bodyClassName="p-0"
    >
      {!anyMeasured ? (
        <div className="flex flex-col gap-3 px-4 py-4" data-testid="engine-verdicts" data-collapsed="true">
          <p className="text-muted-foreground text-[13px]">No run on {shapeLabel} yet. Pick a dataset:</p>
          <ul className="flex flex-wrap gap-2" aria-label="Workloads">
            {rows.map(({ workload }) => {
              const active = workload.id === state.workload;
              return (
                <li key={workload.id} data-verdict-workload={workload.id} data-verdict-kind="none" aria-current={active || undefined} className={cn("rounded-md border border-dashed px-2.5 py-1.5", active ? "bg-subtle border-border-strong shadow-[inset_2px_0_0_var(--brand)]" : "hover:bg-accent")}>
                  <WorkloadCell workload={workload} active={active} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <>
        <VerdictBars rows={rows} />
        <ul className="divide-y" data-testid="engine-verdicts">
          {rows.filter((row) => row.verdict.kind !== "none" || row.workload.id === state.workload).map(({ workload, best, verdict }) => {
            const active = workload.id === state.workload;
            return (
              <li
                key={workload.id}
                data-verdict-workload={workload.id}
                data-verdict-kind={verdict.kind}
                aria-current={active || undefined}
                className={cn("grid min-w-0 gap-3 px-4 py-3 lg:grid-cols-[minmax(0,12rem)_minmax(0,11rem)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start", active && "bg-subtle shadow-[inset_2px_0_0_var(--brand)]")}
              >
                <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 lg:contents">
                  <WorkloadCell workload={workload} active={active} />
                  <VerdictCell verdict={verdict} />
                </div>
                {verdict.kind === "none" ? (
                  <p className="text-muted-foreground text-xs lg:col-span-2 lg:self-center">Neither engine measured on this dataset.</p>
                ) : (
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:col-span-2">
                    {ENGINES.map((engine, index) => <EngineCell key={engine} engine={engine} index={index} entry={best[engine]} other={best[ENGINES[1 - index]!]} verdict={verdict} />)}
                  </div>
                )}
              </li>
            );
          })}
          {unmeasured.length ? (
            <li className="flex flex-col gap-2 px-4 py-3" data-testid="verdicts-unmeasured">
              <span className="text-muted-foreground text-xs">No engine pair on {unmeasured.length === 1 ? "this workload" : `these ${unmeasured.length} workloads`}: neither engine has a run of this model and shape. Select one to make it the active dataset.</span>
              <ul className="flex flex-wrap gap-2" aria-label="Workloads without runs">
                {unmeasured.map(({ workload }) => (
                  <li key={workload.id} data-verdict-workload={workload.id} data-verdict-kind="none" className="hover:bg-accent rounded-md border border-dashed px-2.5 py-1.5">
                    <WorkloadCell workload={workload} active={false} />
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
        </ul>
        </>
      )}
    </Panel>
  );
}
