import * as React from "react";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DEFAULT_SLO, nominalTtftCeilingMs, SLO_PRESETS } from "../../../domain/metrics.js";
import type { SloPolicy } from "../../../domain/types.js";
import { appState, update, useAppState } from "../../state.js";
import { compactNum, num, workloadOf } from "../../lib/display.js";
import { toast } from "../../lib/toast.js";
import { Term } from "./primitives.js";

type Preset = SloPolicy["preset"];
const presetLabels: Record<Exclude<Preset, "custom">, string> = { classic: "Classic", "low-latency": "Low-latency", frontier: "Frontier" };
function CeilingInput({ id, label, value, max, unit, onCommit }: { id: string; label: React.ReactNode; value: number; max: number; unit: string; onCommit: (value: number) => void }) {
  const [draft, setDraft] = React.useState(String(value));
  const [error, setError] = React.useState("");
  React.useEffect(() => { setDraft(String(value)); setError(""); }, [value]);
  const commit = () => {
    const numeric = Number(draft);
    if (!Number.isFinite(numeric) || numeric < 1 || numeric > max) { setError(`Enter 1–${num(max)} ${unit}`); return; }
    setError("");
    if (numeric !== value) onCommit(numeric);
  };
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-ink-2 text-xs font-medium">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          data-slo={id}
          inputMode="numeric"
          type="number"
          min={1}
          max={max}
          value={draft}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === "Enter") commit(); }}
          className="h-8 pr-12 tabular-nums"
        />
        <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs">{unit}</span>
      </div>
      {error ? <p id={`${id}-error`} className="text-critical-text text-xs">{error}</p> : draft !== String(value) ? <p className="text-muted-foreground text-xs">Press Enter to apply</p> : null}
    </div>
  );
}

/** The SLO policy affects every capacity number, so it lives in the top bar and applies to every page. */
/** Compact latency label with its unit: 2000 → "2s", 1500 → "1.5s", 80 → "80ms". */
export const compactMs = (ms: number): string => (ms >= 1000 ? `${Number((ms / 1000).toFixed(2))}s` : `${num(ms)}ms`);

export function SloPopover() {
  const state = useAppState();
  const slo = state.slo;
  const workload = workloadOf(state.workload);
  // Multi-turn and shared-prefix datasets have no nominal ceiling: prompts grow per turn, so it is derived per level.
  const ceiling = nominalTtftCeilingMs(workload, slo);
  const setPolicy = (patch: Partial<SloPolicy>) => update((s) => { s.slo = { ...s.slo, ...patch, preset: patch.preset ?? "custom" }; });
  const presetName = slo.preset === "custom" ? "Custom" : presetLabels[slo.preset];
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Phones: a separate outlined pill with the preset name only (thresholds in the popover and the accessible name);
            sm–md: labelled compact values; md and up: the full thresholds. */}
        <Button variant="ghost" className="text-foreground max-sm:border-border-strong ml-1 min-w-0 shrink-0 gap-2 px-2.5 font-normal max-sm:h-8 max-sm:border max-sm:px-2" aria-label={`Service-level objective ${presetName}: prefill speed at least ${slo.prefillTps} tokens per second, ITL p95 at most ${slo.itlP95Ms} ms, safety margin ×${slo.margin}. Edit`} data-testid="slo-trigger">
          <Gauge className="text-muted-foreground size-3.5" aria-hidden="true" />
          <span className="text-ink-2 font-medium" data-testid="slo-compact">{presetName}<span className="max-sm:hidden"> SLO</span></span>
          <span className="hidden truncate tabular-nums sm:inline md:hidden">
            Prefill {compactNum(slo.prefillTps)}<span className="text-muted-foreground"> · </span>ITL {compactMs(slo.itlP95Ms)}
          </span>
          <span className="hidden truncate tabular-nums md:inline">
            Prefill ≥ {num(slo.prefillTps)} tok/s<span className="text-muted-foreground"> · </span>ITL p95 ≤ {num(slo.itlP95Ms)} ms<span className="text-muted-foreground"> · </span>×{slo.margin}<span className="hidden xl:inline"> margin</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(360px,calc(100vw-32px))] p-0" data-testid="slo-popover">
        <div className="border-b px-4 pt-3.5 pb-3">
          <h2 className="text-sm font-semibold">SLO expectancy</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">A concurrency level passes when TTFT p95 ≤ prompt tokens ÷ prefill speed, ITL p95 is under its ceiling and the success floor holds. C_max is the last passing level.</p>
        </div>
        <div className="grid gap-4 p-4">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={slo.preset}
            aria-label="SLO preset"
            className="w-full"
            onValueChange={(value: string) => {
              if (value in SLO_PRESETS) update((s) => { s.slo = { ...SLO_PRESETS[value as keyof typeof SLO_PRESETS] }; });
              else if (value === "custom") document.getElementById("prefill")?.focus();
            }}
          >
            {(Object.keys(presetLabels) as (keyof typeof presetLabels)[]).map((key) => <ToggleGroupItem key={key} value={key} className="flex-1" data-slo-preset={key}>{presetLabels[key]}</ToggleGroupItem>)}
            <ToggleGroupItem value="custom" className="flex-1" data-slo-preset="custom">Custom</ToggleGroupItem>
          </ToggleGroup>
          <div className="grid grid-cols-2 gap-3">
            <CeilingInput id="prefill" label={<><Term name="Prefill speed" /> ≥</>} unit="tok/s" value={slo.prefillTps} max={100000} onCommit={(value) => setPolicy({ prefillTps: value })} />
            <CeilingInput id="itl" label={<><Term name="ITL" /> p95 ≤</>} unit="ms" value={slo.itlP95Ms} max={1000} onCommit={(value) => setPolicy({ itlP95Ms: value })} />
          </div>
          <div className="bg-subtle rounded-md border px-3 py-2 text-xs" data-testid="ttft-ceiling">
            <span className="text-ink-2 font-medium">TTFT p95 ceiling on {workload?.name ?? state.workload}: </span>
            <span className="tabular-nums">{ceiling === null ? "derived per level from measured prompt tokens" : `${num(ceiling)} ms nominal`}</span>
            {ceiling !== null ? <span className="text-muted-foreground"> ({num(workload?.inputTokens)} tok ÷ {num(slo.prefillTps)} tok/s)</span> : null}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-2 font-medium">Success rate ≥</span>
            <span className="tabular-nums">{num(slo.minSuccessRate * 100)}% <span className="text-muted-foreground">(fixed)</span></span>
          </div>
          <div className="grid gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor="margin" className="text-ink-2 font-medium"><Term name="Safety margin" /></Label>
              <span className="font-medium tabular-nums" data-testid="margin-value">×{slo.margin}</span>
            </div>
            <Slider id="margin" aria-label="Safety margin multiplier" min={50} max={100} step={5} value={[Math.round(slo.margin * 100)]} onValueChange={(value: number[]) => setPolicy({ margin: (value[0] ?? 80) / 100 })} />
          </div>
        </div>
        <div className="bg-subtle flex items-center justify-between gap-2 rounded-b-md border-t px-4 py-2.5">
          <span className="text-muted-foreground text-xs">Sustainable = total (input + output) tok/s at C_max × margin × 60 ÷ GPUs (tok/min/GPU)</span>
          <Button variant="ghost" size="sm" onClick={() => { update((s) => { s.slo = { ...DEFAULT_SLO }; }); toast("SLO reset", "Classic: prefill ≥ 1,300 tok/s, ITL p95 ≤ 26 ms, ×0.8 margin."); }}>Reset</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
