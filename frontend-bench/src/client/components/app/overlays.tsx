import * as React from "react";
import { Activity, Boxes, BookOpen, ChartScatter, Columns2, Download, ExternalLink, FlaskConical, Gauge, Info, Layers, ListOrdered, Moon, Plus, Rows3, Server, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommandPalette, type CommandPaletteGroup } from "@/components/ui/command-palette";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TickBar } from "@/components/ui/tick-bar";
import { gpuFootprint } from "../../../domain/validation.js";
import { runIdentity } from "../../pages/throughput.js";
import { capacity } from "../../../domain/metrics.js";
import { appState, applyTheme, configurationIdOf, createExperiment, MAX_COMPARE, navigate, persistLocal, update, updateView, useAppState, type Route } from "../../state.js";
import { NOT_CONNECTED, compactNum, configDetail, configLabel, configName, engineBuildDetail, engineVersion, hardwareOf, hardwareShape, isMeasured, modelOf, num, recheckNote, shape, statusLabel, testedLabel, measuredHereLabel, workloadBudget, workloadLabel, workloadOf } from "../../lib/display.js";
import { aaHeadline, artifact, effortLabel, hfUrl, paramsLabel, shortSha } from "../../lib/atlas.js";
import { rememberOpener, restoreOpener } from "../../lib/focus-return.js";
import { exportRun } from "../../lib/export.js";
import { toast } from "../../lib/toast.js";
import { Combobox, configOptions } from "./pickers.js";
import { CommandBlock } from "./command-block.js";
import { RecheckDetails } from "./engine-build.js";
import { LevelsBadge, Term } from "./primitives.js";
import { ConfigChips, IncompleteBadge, SloVerdictBadge } from "./performance.js";
import { configChips } from "../../../domain/config-chips.js";

export function openRun(id: string): void { rememberOpener(); update((s) => { s.drawerId = id; }); }
export function openExperimentForm(deploymentId = ""): void { rememberOpener(); update((s) => { s.drawerId = ""; s.experimentFormFor = deploymentId; }); }
export function addToCompare(id: string): void {
  // On the Compare page the visible set is `compare` (base configuration ids); the tray is hidden there.
  if (appState.route === "compare") {
    const cfg = configurationIdOf(id);
    if (appState.compare.includes(cfg)) { toast("Already compared", "This configuration is already on the Compare page."); return; }
    if (appState.compare.length >= MAX_COMPARE) { toast("Comparison is full", `Compare up to ${MAX_COMPARE} configurations at a time.`, true); return; }
    updateView((s) => { s.compare = [...s.compare, cfg]; });
    toast("Added to comparison", `${appState.compare.length} of ${MAX_COMPARE} compared.`);
    return;
  }
  if (appState.selected.includes(id)) { toast("Already selected", "This configuration is already in the comparison set."); return; }
  if (appState.selected.length >= MAX_COMPARE) { toast("Comparison is full", `Compare up to ${MAX_COMPARE} configurations at a time.`, true); return; }
  update((s) => { s.selected = [...s.selected, id]; });
  toast("Added to comparison", `${appState.selected.length} of ${MAX_COMPARE} selected.`);
}

function Field({ label, value, mono = false }: { label: React.ReactNode; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3 py-1.5 text-[13px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-[12px] break-all" : "min-w-0"}>{value}</dd>
    </div>
  );
}
/** Collapsed-by-default detail group, so the drawer leads with the decision facts. */
function Details({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group/details px-3.5 py-2.5" data-drawer-details={title}>
      <summary className="text-ink-2 hover:text-foreground cursor-pointer list-none text-xs font-medium select-none marker:hidden"><span className="text-muted-foreground mr-1.5 inline-block transition-transform group-open/details:rotate-90" aria-hidden="true">›</span>{title}</summary>
      <div className="pt-2.5">{children}</div>
    </details>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold">{title}</h3>
      <dl className="divide-border divide-y">{children}</dl>
    </section>
  );
}

/** Evidence drawer: one atlas configuration traced to its export, engine review, hardware, sources and (if any) measured run. */
export function EvidenceSheet() {
  const state = useAppState();
  const deployment = state.snapshot.deployments.find((item) => item.id === state.drawerId);
  const open = Boolean(deployment);
  const model = deployment ? modelOf(deployment) : undefined;
  const hardware = deployment ? hardwareOf(deployment) : undefined;
  const workload = deployment ? workloadOf(deployment.workloadId) : undefined;
  const exported = deployment ? artifact(deployment.artifactId) : undefined;
  const aa = deployment ? aaHeadline(deployment.modelId) : null;
  const c = deployment ? capacity(deployment, state.slo) : null;
  const measured = deployment ? isMeasured(deployment) : false;
  // Opened from the TL;DR (a throughput ranking): lead with Sustainable and C_max; the model-level AA index moves into
  // a collapsed "Model quality" group below the decision facts. Other pages keep the AA-first order.
  const throughputFirst = state.route === "tldr";
  const point = c?.selectedPoint ?? null;
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) update((s) => { s.drawerId = ""; }); }}>
      <SheetContent
        side="right" className="w-full gap-0 p-0 sm:max-w-[500px]" data-testid="evidence-sheet" tabIndex={-1}
        onOpenAutoFocus={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement).focus(); }}
        onCloseAutoFocus={(event) => restoreOpener(event, appState.experimentFormFor !== null)}
      >
        {deployment && c ? (
          <>
            <SheetHeader className="gap-1 border-b px-5 pt-4 pb-3.5">
              <SheetTitle className="pr-8 text-base font-semibold">{configName(deployment)}</SheetTitle>
              <SheetDescription className="text-[13px]">{configDetail(deployment)}</SheetDescription>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge variant={deployment.status === "candidate" ? "info" : "warning"}>{statusLabel(deployment)}</Badge>
                <Badge variant={measured ? "good" : "neutral"} data-testid="evidence-class">{measured ? `Measured · ${deployment.measuredAt?.slice(0, 10)}` : "Reference"}</Badge>
                <Badge variant="mono">{deployment.configurationId}</Badge>
              </div>
            </SheetHeader>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <dl className="grid grid-cols-2 overflow-hidden rounded-lg border" data-testid="drawer-kpis" data-order={throughputFirst ? "throughput" : "default"}>
                {((): [string, React.ReactNode, string, string][] => {
                  const kpi: Record<string, [string, React.ReactNode, string, string]> = {
                    aa: ["aa", <Term key="q" name="Intelligence">AA index (model)</Term>, aa ? num(aa.index, 1) : "—", aa ? effortLabel(aa.variant) : "No composite"],
                    context: ["context", "Context cap", deployment.contextCap ? compactNum(deployment.contextCap) : "—", deployment.contextCap ? `of ${compactNum(model?.contextTokens)}` : "Not capped"],
                    capacity: ["capacity", <Term key="c" name="Sustainable throughput">Sustainable</Term>, measured ? num(c.sustainableTpmPerGpu) : "—", measured ? "tok/min/GPU" : "tok/min/GPU · not measured"],
                    cmax: ["cmax", <Term key="m" name="C_max" />, measured ? num(c.highestPassingConcurrency) : "—", measured ? `concurrent · ${c.passingLevels}/${c.totalLevels} levels` : "concurrent · not measured"],
                    latency: ["latency", "TTFT / ITL p95", measured && point ? `${num(point.ttftP95Ms)} / ${num(point.itlP95Ms, 1)}` : "—", measured && point ? "ms at C_max" : "ms · not measured"],
                  };
                  return (throughputFirst ? ["capacity", "cmax", "latency", "context"] : ["aa", "context", "capacity", "cmax"]).map((key) => kpi[key]!);
                })().map(([key, label, value, unit]) => (
                  <div key={key} className="flex flex-col gap-0.5 px-3.5 py-3 shadow-[-1px_-1px_0_var(--border)]">
                    <dt className="text-ink-2 text-xs font-medium">{label}</dt>
                    <dd className="text-lg font-semibold tracking-[-0.01em] tabular-nums">{value}</dd>
                    <dd className="text-muted-foreground text-xs">{unit}</dd>
                    {key === "context" && deployment.contextCap && model?.contextTokens ? <dd><TickBar value={deployment.contextCap} max={model.contextTokens} segments={24} className="mt-1 h-3" aria-label={`Context cap ${compactNum(deployment.contextCap)} of ${compactNum(model.contextTokens)} tokens`} /></dd> : null}
                  </div>
                ))}
              </dl>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]" data-testid="drawer-facts">
                <dt className="text-muted-foreground">Build</dt>
                <dd className="flex flex-wrap items-center gap-1.5"><span className="font-medium">{engineBuildDetail(deployment)}</span>{deployment.recheck ? <Badge variant="warning" className="h-auto max-w-full shrink py-0.5 text-left whitespace-normal" title={deployment.recheck.argumentStatus ?? undefined}>{recheckNote(deployment)}</Badge> : null}</dd>
                {deployment.runtimeTag ? <><dt className="text-muted-foreground">Run build</dt><dd className="font-mono text-[12px] break-all" data-testid="drawer-run-tag">{deployment.runtimeTag}</dd></> : null}
                <dt className="text-muted-foreground">Shape</dt>
                <dd>{shape(deployment)} · {hardwareShape(deployment)}{deployment.knob ? <> · <span className="font-medium">{deployment.knob}</span></> : null}</dd>
                <dt className="text-muted-foreground">Knobs</dt>
                <dd>{configChips(deployment).length ? <ConfigChips deployment={deployment} max={4} /> : <span className="text-muted-foreground">Engine defaults</span>}</dd>
                <dt className="text-muted-foreground">Weights</dt>
                <dd className="min-w-0"><a className="hover:text-link inline-flex items-center gap-1 font-mono text-[12px] break-all underline-offset-2 hover:underline" href={hfUrl(deployment.exportHfId, deployment.artifactRevision)} target="_blank" rel="noreferrer">{deployment.exportHfId}@{shortSha(deployment.artifactRevision)}<ExternalLink className="size-3 shrink-0" aria-hidden="true" /></a></dd>
                <dt className="text-muted-foreground">Speculative</dt>
                <dd>{deployment.draftHfId ? <span className="font-mono text-[12px]">{deployment.draftHfId}</span> : deployment.speculativeDecoding ? "In-model" : "Off"}</dd>
                <dt className="text-muted-foreground">B300 evidence</dt>
                <dd className="flex flex-wrap items-center gap-1.5">{measuredHereLabel(deployment) ? <Badge variant="good" data-testid="drawer-measured-here">{measuredHereLabel(deployment)}</Badge> : null}<Badge variant="neutral" title="Catalog flag (testedOnTarget), independent of imported runs">{testedLabel(deployment.testedOnTarget)}</Badge></dd>
                {measured ? <><dt className="text-muted-foreground">Run</dt><dd className="flex flex-wrap items-center gap-1.5">{workloadLabel(deployment.workloadId)} · {deployment.measuredAt?.slice(0, 10)} <SloVerdictBadge point={c.selectedPoint} /><LevelsBadge capacity={c} /><IncompleteBadge count={c.incomplete} /></dd></> : null}
              </dl>
              <p className="text-ink-2 line-clamp-2 text-[13px] text-pretty" title={deployment.reason}>{deployment.reason}</p>
              <CommandBlock title={`Serve command · ${engineBuildDetail(deployment)}`} command={deployment.command} />
              <div className="divide-y rounded-lg border text-[13px]">
                {deployment.recheck ? (
                  <Details title={`Release recheck notes${deployment.recheck.reconciliation.length ? ` (${deployment.recheck.reconciliation.length})` : ""}`}><RecheckDetails deployment={deployment} /></Details>
                ) : null}
                {throughputFirst ? (
                  <Details title="Model quality">
                    <dl className="divide-border divide-y" data-testid="drawer-model-quality">
                      <Field label={<Term name="Intelligence">AA index (model)</Term>} value={aa ? `${num(aa.index, 1)} · ${effortLabel(aa.variant)}` : "No composite"} />
                    </dl>
                  </Details>
                ) : null}
                <Details title="Configuration notes"><p className="text-ink-2 text-pretty">{deployment.notes}</p></Details>
                <Details title="Weights export">
                  <dl className="divide-border divide-y">
                    <Field label="Revision" value={deployment.artifactRevision} mono />
                    <Field label="Precision" value={`${deployment.precision} · ${deployment.quantMethod}`} />
                    <Field label="Export status" value={exported?.status ?? "—"} />
                    <Field label="Base model" value={model ? `${model.hfId}@${shortSha(model.revision)}` : deployment.modelId} mono />
                    <Field label="Deployment layer" value="KServe InferenceService (installed version not recorded)" />
                  </dl>
                </Details>
                <Details title={`Source IDs (${deployment.sourceIds.length})`}><div className="flex flex-wrap gap-1">{deployment.sourceIds.map((id) => <Badge key={id} variant="mono">{id}</Badge>)}</div></Details>
              </div>
            </div>
            <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t px-5 py-3">
              <Button variant="outline" onClick={() => exportRun(deployment.id)}><Download aria-hidden="true" />JSON</Button>
              <Button variant="outline" onClick={() => { update((s) => { s.drawerId = ""; s.run = deployment.id; }); navigate("throughput", { run: deployment.id }); }}><Activity aria-hidden="true" />Throughput</Button>
              <Button variant="outline" onClick={() => addToCompare(deployment.id)}><Columns2 aria-hidden="true" />Compare</Button>
              <Button onClick={() => openExperimentForm(deployment.id)}><Plus aria-hidden="true" />Plan run</Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/** Word-prefix matching: every query word must start a word of the label or keywords. Label hits rank first. */
export function commandFilter(_value: string, search: string, keywords: string[] = []): number {
  const query = search.trim().toLowerCase().split(/[\s·]+/).filter(Boolean);
  if (!query.length) return 1;
  const [label = "", ...rest] = keywords.map((keyword) => keyword.toLowerCase());
  const words = (text: string) => text.split(/[\s·/()\-_.,]+/).filter(Boolean);
  const labelWords = words(label);
  const allWords = [...labelWords, ...rest.flatMap(words), ...rest];
  if (!query.every((term) => allWords.some((word) => word.startsWith(term)))) return 0;
  if (label.startsWith(search.trim().toLowerCase())) return 1;
  return query.every((term) => labelWords.some((word) => word.startsWith(term))) ? 0.8 : 0.4;
}

/** ⌘K / Ctrl+K: keyboard-only power feature, no visible trigger. */
export function CommandMenu() {
  const state = useAppState();
  const go = (route: Route, params: Record<string, string> = {}) => () => { update((s) => { s.commandOpen = false; }); navigate(route, params); };
  const groups: CommandPaletteGroup[] = [
    { heading: "Pages", items: [
      { id: "tldr", label: "TL;DR", description: "Every setup of a model ranked by sustainable throughput", icon: <Gauge />, keywords: ["overview", "summary"], onSelect: go("tldr") },
      { id: "intelligence", label: "Intelligence", description: "AA index and SLO capacity", icon: <ChartScatter />, keywords: ["frontier", "quality", "aa"], onSelect: go("intelligence") },
      { id: "throughput", label: "Throughput", description: "Concurrency sweep under the SLO", icon: <Activity />, keywords: ["latency", "ttft", "itl", "sweep"], onSelect: go("throughput") },
      { id: "compare", label: "Compare", description: "Up to four configurations", icon: <Columns2 />, keywords: ["overlay"], onSelect: go("compare") },
      { id: "engine", label: "Engine", description: "vLLM versus SGLang on the same export", icon: <Server />, keywords: ["runtime", "vllm", "sglang"], onSelect: go("engine") },
      { id: "models", label: "Models", description: "Catalog models and exports", icon: <Boxes />, keywords: ["catalog"], onSelect: go("models") },
      { id: "precision", label: "Precision", description: "Qwen 3.8 27B · publisher card tables", icon: <Layers />, keywords: ["quantization", "fp8", "nvfp4", "bf16"], onSelect: go("models", { model: "qwen3.8-27b", tab: "precision" }) },
      { id: "deployments", label: "Deployments", description: "All configurations", icon: <Rows3 />, keywords: ["configurations", "table"], onSelect: go("deployments") },
      { id: "new-benchmark", label: "New benchmark", description: "Planning board", icon: <FlaskConical />, keywords: ["kanban", "experiments", "plan"], onSelect: go("new-benchmark") },
      { id: "methodology", label: "Methodology", description: "Definitions, sources and limits", icon: <BookOpen />, keywords: ["help", "definitions", "slo"], onSelect: go("methodology") },
    ] },
    { heading: "Models", items: state.snapshot.models.map((model) => ({ id: `model-${model.id}`, label: model.name, description: `${paramsLabel({ totalParamsB: model.parametersB, activeParamsB: model.activeParamsB })} · ${model.architecture}`, icon: <Boxes />, keywords: [model.company, model.hfId], onSelect: go("models", { model: model.id }) })) },
    // One entry per model: TL;DR for that model (every setup, quant, engine and knob ranked with Δ vs best).
    { heading: "Compare setups", items: state.snapshot.models.map((model) => {
      const setups = state.snapshot.deployments.filter((d) => d.modelId === model.id && d.id === d.configurationId).length;
      return { id: `setups-${model.id}`, label: `Compare setups: ${model.name}`, description: `${setups} setup${setups === 1 ? "" : "s"} · TL;DR`, icon: <ListOrdered />, keywords: [model.name, model.company, "setups", "variants", "quant", "tldr"], onSelect: go("tldr", { model: model.id }) };
    }) },
    { heading: "Configurations", items: state.snapshot.deployments.map((deployment) => ({ id: `run-${deployment.id}`, label: configName(deployment), description: configDetail(deployment), icon: <Rows3 />, keywords: [configLabel(deployment), deployment.id, deployment.precision], onSelect: () => update((s) => { s.commandOpen = false; s.drawerId = deployment.id; }) })) },
    { heading: "Actions", items: [
      { id: "workloads", label: "About workloads", icon: <Info />, keywords: ["dataset", "tokens", "workload"], onSelect: () => update((s) => { s.commandOpen = false; s.workloadsOpen = true; }) },
      { id: "new-experiment", label: "New experiment", icon: <Plus />, keywords: ["create", "plan"], onSelect: () => { update((s) => { s.commandOpen = false; }); openExperimentForm(); } },
      { id: "theme", label: `Switch to ${state.theme === "light" ? "dark" : "light"} theme`, icon: state.theme === "light" ? <Moon /> : <Sun />, keywords: ["dark", "light", "appearance"], onSelect: () => update((s) => { s.commandOpen = false; s.theme = s.theme === "light" ? "dark" : "light"; applyTheme(); persistLocal(); }) },
    ] },
  ];
  return (
    <CommandPalette
      groups={groups} open={state.commandOpen} filter={commandFilter}
      onOpenChange={(open) => update((s) => { s.commandOpen = open; })}
      onCloseAutoFocus={(event) => restoreOpener(event, Boolean(appState.drawerId) || appState.workloadsOpen || appState.experimentFormFor !== null)}
      placeholder="Search pages, models, configurations…" title="Command menu" description="Jump to a page, model or configuration"
    />
  );
}

/** Plan a new experiment. Creates a Backlog record; it never launches a job. */
export function ExperimentDialog() {
  const state = useAppState();
  const open = state.experimentFormFor !== null;
  const bases = React.useMemo(() => state.snapshot.deployments.filter((d) => d.id === d.configurationId), [state.snapshot.deployments]);
  const [deploymentId, setDeploymentId] = React.useState("");
  const [datasets, setDatasets] = React.useState<string[]>([]);
  const [priority, setPriority] = React.useState<"Normal" | "High">("Normal");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    // A measured "<configuration>@<dataset>" opener plans its base configuration on that dataset.
    const opener = state.snapshot.deployments.find((d) => d.id === state.experimentFormFor);
    setDeploymentId(opener?.configurationId ?? "");
    setDatasets([opener && opener.id !== opener.configurationId ? opener.workloadId : appState.workload]);
    setPriority("Normal"); setError(""); setSaving(false);
  }, [open, state.experimentFormFor]);
  const close = () => update((s) => { s.experimentFormFor = null; });
  const today = new Date().toISOString().slice(0, 10);
  const deployment = bases.find((d) => d.id === deploymentId);
  const ordered = state.snapshot.workloads.map((w) => w.id).filter((id) => datasets.includes(id));
  const suggestion = deployment ? `${configLabel(deployment)} · ${ordered.join(", ")}`.slice(0, 100) : "GLM 5.3 · NVFP4 · vLLM · TP8 · single-turn-8k";
  const toggle = (id: string, checked: boolean) => setDatasets((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try {
      const blocked = String(form.get("blockedReason") ?? "").trim();
      await createExperiment({ name: form.get("name"), deploymentId, datasets: ordered, scheduledDate: form.get("scheduledDate"), priority, notes: form.get("notes") ?? "", blockedReason: blocked || null });
      update((s) => { s.experimentFormFor = null; });
      if (appState.route !== "new-benchmark") navigate("new-benchmark");
      toast("Experiment added to Backlog", appState.mode === "local" && !appState.storageAvailable ? "Browser storage is unavailable; export the plan before closing this tab." : "Planning record only. No GPU job was launched.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save the experiment");
      setSaving(false);
    }
  };
  const identity = deployment ? runIdentity(deployment, ordered[0] ?? appState.workload).filter(([key]) => key !== "dataset") : [];
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[560px]" data-testid="experiment-dialog" onCloseAutoFocus={(event) => restoreOpener(event)}>
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>New experiment</DialogTitle>
            <DialogDescription>Adds a planning card to Backlog: one configuration, one run per dataset. It does not launch a GPU job; results arrive only from the bench.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label id="experiment-config-label">Configuration</Label>
              <Combobox label="Configuration" testId="experiment-config" value={deploymentId} onChange={setDeploymentId} options={configOptions(bases)} placeholder="Choose a configuration" searchPlaceholder="Search configurations…" className="w-full" />
            </div>
            <fieldset className="grid gap-1.5" data-testid="experiment-datasets">
              <legend className="mb-1.5 text-[13px] font-medium">Datasets <span className="text-muted-foreground font-normal">· one run identity each</span></legend>
              <div className="grid gap-1 sm:grid-cols-2">
                {state.snapshot.workloads.map((workload) => (
                  <label key={workload.id} className="hover:bg-subtle has-[[data-state=checked]]:bg-selection flex min-w-0 cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors">
                    <Checkbox checked={datasets.includes(workload.id)} onCheckedChange={(checked) => toggle(workload.id, checked === true)} data-dataset={workload.id} aria-label={workload.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[12px]">{workload.name}</span>
                      <span className="text-muted-foreground block text-[11px] tabular-nums">{workloadBudget(workload)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-1.5">
              <Label htmlFor="experiment-name">Name</Label>
              <Input id="experiment-name" name="name" required minLength={3} maxLength={100} placeholder={suggestion} onFocus={(event) => { if (!event.currentTarget.value && deployment) event.currentTarget.value = suggestion; }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="experiment-date">Target date</Label>
                <Input id="experiment-date" type="date" name="scheduledDate" required defaultValue={today} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="experiment-priority">Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as "Normal" | "High")}>
                  <SelectTrigger id="experiment-priority" className="h-8 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper"><SelectItem value="Normal">Normal</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="experiment-notes">Hypothesis <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea id="experiment-notes" name="notes" rows={2} maxLength={1000} placeholder="What decision should this experiment inform?" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="experiment-blocked">Blocked reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="experiment-blocked" name="blockedReason" maxLength={200} placeholder="e.g. GPU budget" />
            </div>
            {deployment ? (
              <section className="bg-subtle/60 rounded-md border" aria-label="Run identity preview" data-testid="experiment-identity">
                <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
                  <span className="text-[12px] font-medium">Run identity <span className="text-muted-foreground font-normal">· {ordered.length} {ordered.length === 1 ? "row" : "rows"} in experiments when benched</span></span>
                  <span className="text-muted-foreground font-mono text-[11px]">gpu_footprint {gpuFootprint(deployment)}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-3">
                  {identity.map(([key, value]) => (
                    <div key={key} className="min-w-0">
                      <dt className="text-muted-foreground font-mono text-[10.5px]">{key}</dt>
                      <dd className="truncate font-mono text-[11.5px]" title={value}>{value}</dd>
                    </div>
                  ))}
                  <div className="col-span-full min-w-0">
                    <dt className="text-muted-foreground font-mono text-[10.5px]">dataset</dt>
                    <dd className="font-mono text-[11.5px]">{ordered.length ? ordered.join(" · ") : "—"}</dd>
                  </div>
                </dl>
              </section>
            ) : null}
            <p role="alert" className="text-critical-text min-h-0 text-[13px] empty:hidden" data-testid="form-error">{error}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create experiment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
