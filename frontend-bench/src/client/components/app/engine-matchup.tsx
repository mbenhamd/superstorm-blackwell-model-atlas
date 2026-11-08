import type * as React from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { relativeDelta } from "../../../domain/metrics.js";
import { controlText } from "../../../domain/run-config.js";
import type { Capacity, Deployment } from "../../../domain/types.js";
import { toast } from "../../lib/toast.js";
import { appState, MAX_COMPARE, navigate, update, useAppState } from "../../state.js";
import { gpusOf, num, shape } from "../../lib/display.js";
import { bestPerEngine, ENGINE_TIE_BAND, ENGINES, engineVerdict, type Engine, type EngineScope, type EngineVerdict } from "./engine-data.js";
import { EngineBuild } from "./engine-build.js";
import { openRun } from "./overlays.js";
import { ConfigChips, ErroredBadge, IncompleteBadge } from "./performance.js";
import { Panel, SeriesSwatch } from "./primitives.js";

/*
 * Engine matchup: the best measured configuration of each engine for one model × GPU count on the active dataset
 * and SLO, side by side, with the verdict only when the two form a matched pair. Unmeasured engines show the
 * selected pair's configuration with "—" (never zero) and a dashed frame.
 */

const BAND = num(ENGINE_TIE_BAND * 100);
export const signedFraction = (fraction: number) => `${fraction < 0 ? "−" : "+"}${num(Math.abs(fraction) * 100, 1)}%`;

/** Short verdict text shared by the matchup and the per-workload rows. */
export function verdictText(verdict: EngineVerdict, measuredLabel = "measured"): string {
  switch (verdict.kind) {
    case "none": return "no engine pair on this workload";
    case "one-sided": return `only ${verdict.engine} ${measuredLabel} · no engine pair`;
    case "different": return "different configs — no verdict";
    case "no-passing": return verdict.passing ? `only ${verdict.passing} inside the SLO · matched pair` : "neither engine inside the SLO · matched pair";
    case "tie": return "engines tied · matched pair";
    case "lead": return `${signedFraction(verdict.fraction)} ${verdict.engine} · matched pair`;
  }
}

/**
 * What differs in a "different" verdict, one item per variable: runtime controls carry both values and their
 * source ("Max sequences: vLLM 256 (recorded) vs SGLang 128 (recorded)"); other variables are named.
 */
export function differenceItems(verdict: Extract<EngineVerdict, { kind: "different" }>): string[] {
  const controls = new Map(verdict.controls.map((control) => [control.label, control]));
  return verdict.differences.map((label) => {
    const control = controls.get(label);
    return control ? `${label}: vLLM ${controlText(control.a)} vs SGLang ${controlText(control.b)}` : label;
  });
}

/** Controls a matched pair holds equal, stated wherever a verdict is shown. */
export const MATCHED_CONTROLS = "same export, revision, shape, knob, decoding policy and run GPUs, and the same KV dtype, max sequences, memory fraction, prefix cache and context length (recorded runtime_config, else the configured command)";

/** Add configurations to the selection tray (the "Compare" action there opens the Compare page). */
export function addAllToCompare(ids: string[]): void {
  const fresh = [...new Set(ids)].filter((id) => !appState.selected.includes(id));
  if (!fresh.length) { toast("Already selected", "Both configurations are already in the comparison set."); return; }
  if (appState.selected.length + fresh.length > MAX_COMPARE) { toast("Comparison is full", `Compare up to ${MAX_COMPARE} configurations at a time; ${appState.selected.length} selected.`, true); return; }
  update((s) => { s.selected = [...s.selected, ...fresh]; });
  toast("Added to comparison", `${appState.selected.length} of ${MAX_COMPARE} selected.`);
}

/** TL;DR (every setup ranked) for the model on this GPU count. */
export function openTldr(modelId: string, shapeKey: string): void {
  navigate("tldr", { model: modelId, shape: shapeKey });
}

function MatchupCard({ engine, index, deployment: d, capacity: c, measured, max, delta, tied }: {
  engine: Engine; index: number; deployment: Deployment; capacity: Capacity | null; measured: boolean; max: number; delta: number | null; tied: boolean;
}) {
  const value = c?.sustainableTpmPerGpu ?? null;
  const width = value === null || !max ? 0 : Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <section className={cn("flex min-w-0 flex-col gap-2.5 rounded-md border p-4", !measured && "border-dashed")} data-matchup-engine={engine} data-measured={measured}>
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex min-w-0 items-start gap-1.5"><SeriesSwatch index={index} className="mt-1.5" /><EngineBuild deployment={d} size="title" /></span>
        {measured && d.runtimeTag
          ? <Badge variant="mono" title={`Run ${d.measuredAt?.slice(0, 10) ?? ""}`} data-run-tag={d.runtimeTag}>{d.runtimeTag}</Badge>
          : <Badge variant="neutral" className="border-dashed">Not measured</Badge>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <button type="button" className="text-ink-2 hover:text-link mr-1 min-w-0 truncate text-left text-xs hover:underline" title="Open the configuration evidence" onClick={() => openRun(d.id)} data-matchup-config={d.configurationId}>
          {d.exportLabel} · {d.knob ?? "Baseline"} · {shape(d)} · {gpusOf(d)}× {d.gpuType}
        </button>
        <ConfigChips deployment={d} max={3} />
        {measured ? <IncompleteBadge count={c?.incomplete} /> : null}
        {measured ? <ErroredBadge count={c?.errored} /> : null}
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
          <span className="text-[22px] leading-7 font-semibold tracking-[-0.5px] tabular-nums" data-testid="matchup-value" data-missing={value === null || undefined}>{num(value)}</span>
          <span className="text-muted-foreground text-xs">sustainable tok/min/GPU</span>
          {tied ? <Badge variant="neutral" data-matchup-delta="tie">tied</Badge> : delta !== null ? <DeltaBadge delta={delta} variant="soft" data-matchup-delta={signedFraction(delta)} /> : null}
        </div>
        <div className={cn("h-1.5 overflow-hidden rounded-full", measured ? "bg-muted" : "border border-dashed")} aria-hidden="true">
          <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: `var(--chart-${index + 1})` }} />
        </div>
        <p className="text-muted-foreground text-xs tabular-nums" data-testid="matchup-cmax">
          C_max {num(c?.highestPassingConcurrency)}{c && c.totalLevels ? ` · ${c.passingLevels} of ${c.totalLevels} levels in SLO` : measured ? "" : " · no run on this dataset"}
        </p>
      </div>
    </section>
  );
}

export function EngineMatchup({ scope, fallback, shapeKey, modelName, details }: { scope: EngineScope; fallback: Record<Engine, Deployment>; shapeKey: string; modelName: string; details?: React.ReactNode }) {
  const state = useAppState();
  const best = bestPerEngine(state.snapshot.deployments, scope, state.workload, state.slo);
  const verdict = engineVerdict(best);
  const values = ENGINES.map((engine) => best[engine].capacity?.sustainableTpmPerGpu ?? null);
  const max = Math.max(0, ...values.map((value) => value ?? 0));
  const comparable = verdict.kind === "lead" || verdict.kind === "tie";
  const shown = ENGINES.map((engine) => best[engine].deployment ?? fallback[engine]);
  const badge = verdict.kind === "different"
    ? (
      <Tooltip>
        <TooltipTrigger asChild><Badge variant="warning" tabIndex={0} className="cursor-help" data-testid="matchup-verdict" data-verdict-kind={verdict.kind}>Different configs — no verdict</Badge></TooltipTrigger>
        <TooltipContent className="max-w-80 text-pretty">
          <span className="block font-medium">Differs in</span>
          <ul className="my-1 list-disc pl-4">{differenceItems(verdict).map((item) => <li key={item}>{item}</li>)}</ul>
          An engine verdict needs a matched pair: {MATCHED_CONTROLS}.
        </TooltipContent>
      </Tooltip>
    )
    : <Badge variant={comparable ? "info" : "neutral"} className={cn(verdict.kind === "none" && "border-dashed")} data-testid="matchup-verdict" data-verdict-kind={verdict.kind}>{verdict.kind === "none" ? "Not measured · no verdict" : verdictText(verdict)}</Badge>;
  return (
    <Panel
      id="engine-matchup"
      title="Engine matchup"
      description={<span data-testid="matchup-scope">{modelName} · {shapeKey.replace(/^(\d+)x/, "$1× ")} · {state.workload} · best measured configuration per engine</span>}
      actions={<>
        {badge}
        <Button variant="outline" size="sm" onClick={() => addAllToCompare(shown.map((d) => d.id))} data-testid="matchup-add-compare"><Plus aria-hidden="true" />Add both to compare</Button>
      </>}
      bodyClassName="space-y-3"
    >
      <div className="grid gap-3 md:grid-cols-2" data-testid="engine-matchup">
        {ENGINES.map((engine, index) => {
          const entry = best[engine], other = best[ENGINES[1 - index]!];
          const delta = comparable && verdict.kind === "lead" ? relativeDelta(entry.capacity?.sustainableTpmPerGpu ?? null, other.capacity?.sustainableTpmPerGpu ?? null) : null;
          return <MatchupCard key={engine} engine={engine} index={index} deployment={shown[index]!} capacity={entry.capacity} measured={entry.deployment !== null} max={max} delta={delta} tied={verdict.kind === "tie"} />;
        })}
      </div>
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-pretty" data-testid="matchup-note">
        <span>
          {verdict.kind === "different" ? <span data-testid="matchup-differences">Different configs, no verdict. Differs in {differenceItems(verdict).join("; ")}. Read each side on its own. </span>
            : comparable || verdict.kind === "no-passing" ? `Matched pair: ${MATCHED_CONTROLS}. Other engine-only flags may still differ (Argument differences below). `
            : "A verdict needs both engines measured on this dataset with matched configurations. "}
          |Δ| ≤ {BAND}% reads as a tie (assumed single-run noise).
        </span>
        <button type="button" className="text-link inline-flex items-center gap-0.5 hover:underline" onClick={() => openTldr(scope.modelId, shapeKey)} data-testid="matchup-ladder">Quantization ladder<ArrowUpRight className="size-3" aria-hidden="true" /></button>
      </p>
      {details}
    </Panel>
  );
}
