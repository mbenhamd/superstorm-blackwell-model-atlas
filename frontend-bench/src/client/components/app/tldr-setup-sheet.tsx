import * as React from "react";
import { Activity, Columns2, ExternalLink, FileSearch, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { hasMeasuredLevels, type SetupEntry } from "../../../domain/setups.js";
import type { VariantRow } from "../../../domain/variants.js";
import type { ExternalRecord } from "../../../domain/external.js";
import { appState, routeUrl, useAppState } from "../../state.js";
import { restoreOpener } from "../../lib/focus-return.js";
import { engineBuildDetail, hardwareShape, num, shape } from "../../lib/display.js";
import { hfUrl, shortSha } from "../../lib/atlas.js";
import { addToCompare, openRun } from "./overlays.js";
import { CommandBlock } from "./command-block.js";
import { RunQualityBadge } from "./performance.js";
import { StatusBadge } from "./status-badge.js";
import { chipsOf, enginesOf, shapeKey, shapeLabel } from "./tldr-data.js";
import { cmax, dateOf, Missing, StandingCell, tpm } from "./tldr-parts.js";
import { PublishedCard } from "./tldr-published.js";
import { engineOf, setupTitle } from "./tldr-setups.js";

/*
 * TL;DR setup sheet (right side): everything about one setup of the table, so the table itself stays one ranked list.
 * Order: decision numbers (sustainable, Δ vs best, C_max, p95 latencies at C_max) → runtime and hardware → full knobs →
 * every run of the variant (engine versions) → published (external) results for this setup, outside the ranking →
 * serve command. Footer: Throughput (this variant's best run), Compare, full evidence, engine head-to-head.
 */

function Kpi({ label, value, unit, children, testId }: { label: string; value: React.ReactNode; unit: string; children?: React.ReactNode; testId?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-3.5 py-3 shadow-[-1px_-1px_0_var(--border)]" data-testid={testId}>
      <dt className="text-ink-2 text-xs font-medium">{label}</dt>
      <dd className="text-lg font-semibold tracking-[-0.01em] tabular-nums">{value}</dd>
      <dd className="text-muted-foreground text-xs">{unit}</dd>
      {children}
    </div>
  );
}

function Section({ title, aside, children, testId }: { title: string; aside?: React.ReactNode; children: React.ReactNode; testId?: string }) {
  return (
    <section className="space-y-2" data-testid={testId}>
      <h3 className="flex items-baseline justify-between gap-3 text-xs font-semibold">{title}{aside ? <span className="text-muted-foreground font-normal">{aside}</span> : null}</h3>
      {children}
    </section>
  );
}

export function SetupSheet({ entry, entries, rows, published, onClose }: {
  entry: SetupEntry<VariantRow> | null; entries: SetupEntry<VariantRow>[]; rows: VariantRow[]; published: ExternalRecord[]; onClose: () => void;
}) {
  const state = useAppState();
  const row = entry?.row ?? null;
  const d = row?.deployment;
  const leader = entries.find((item) => item.standing.kind === "best")?.row ?? null;
  const ranked = entries.filter((item) => item.position !== null).length;
  const measured = row ? hasMeasuredLevels(row) : false;
  const point = row?.capacity.selectedPoint ?? null;
  const variant = row?.variant ?? null;
  const chips = row ? chipsOf(row) : [];
  const engines = enginesOf(rows.filter(hasMeasuredLevels));
  const bestRun = variant?.best.run.id;
  return (
    <Sheet open={Boolean(entry)} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="right" className="w-full gap-0 p-0 sm:max-w-[540px]" data-testid="setup-sheet" tabIndex={-1}
        // Focus the sheet itself, not its first control: a tooltip trigger would open its tooltip on open.
        onOpenAutoFocus={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement).focus(); }}
        // Back to the row that opened it; not when the evidence sheet takes over (it restores the same opener later).
        onCloseAutoFocus={(event) => restoreOpener(event, appState.drawerId !== "")}
      >
        {entry && row && d ? (
          <>
            <SheetHeader className="gap-1 border-b px-5 pt-4 pb-3.5">
              <SheetTitle className="pr-8 text-base font-semibold">{setupTitle(row, rows)}</SheetTitle>
              <SheetDescription className="text-[13px]">{d.exportLabel} · {engineOf(row)} · {shapeLabel(shapeKey(d))} · {state.workload}</SheetDescription>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {entry.position !== null ? <Badge variant="outline" data-testid="setup-rank">#{entry.position} of {ranked}</Badge> : null}
                <Badge variant="mono">{d.precision}</Badge>
                {d.status === "candidate" ? null : <StatusBadge deployment={d} />}
                <Badge variant={measured ? "good" : "neutral"}>{measured ? `Measured · ${dateOf(variant?.latestRunDate ?? d.measuredAt)}` : `Not measured on ${state.workload}`}</Badge>
              </div>
            </SheetHeader>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {measured ? <dl className="grid grid-cols-2 overflow-hidden rounded-lg border" data-testid="setup-kpis">
                <Kpi label="Sustainable" value={tpm(row) === null ? "—" : num(tpm(row))} unit="tok/min/GPU" testId="setup-sustainable" />
                <Kpi label="Δ vs best" value={entry.standing.kind === "unmeasured" ? "—" : <StandingCell standing={entry.standing} leader={leader} />} unit={leader && entry.standing.kind !== "best" ? `best: ${num(tpm(leader))} tok/min/GPU` : "of this model's setups"} />
                <Kpi label="C_max" value={cmax(row) === null ? "—" : num(cmax(row))} unit={measured ? `concurrent · ${row.capacity.passingLevels}/${row.capacity.totalLevels} levels pass` : "concurrent"} />
                <Kpi label="TTFT / ITL p95" value={point ? `${num(point.ttftP95Ms)} / ${num(point.itlP95Ms, 1)}` : "—"} unit="ms at C_max" />
              </dl> : <p className="bg-subtle text-ink-2 rounded-lg border px-3.5 py-3 text-[13px] text-pretty" data-testid="setup-not-measured">Not measured on {state.workload}: a planning row from the catalog, so no sustainable value, C_max or latency yet. The serve command below is the configured one.</p>}

              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]" data-testid="setup-facts">
                <dt className="text-muted-foreground">Configured build</dt>
                <dd>{engineBuildDetail(d)}</dd>
                {variant && d.runtimeTag ? (
                  <>
                    <dt className="text-muted-foreground">Ran</dt>
                    <dd className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-[12px] break-all">{d.runtimeTag}</span>{variant.runtimeCount > 1 ? <span className="text-muted-foreground">best of {variant.runtimeCount} runtimes</span> : null}</dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">GPUs</dt>
                <dd>{hardwareShape(d)} · {shape(d)}</dd>
                <dt className="text-muted-foreground">Weights</dt>
                <dd className="min-w-0"><a className="hover:text-link inline-flex items-center gap-1 font-mono text-[12px] break-all underline-offset-2 hover:underline" href={hfUrl(d.exportHfId, d.artifactRevision)} target="_blank" rel="noreferrer">{d.exportHfId}@{shortSha(d.artifactRevision)}<ExternalLink className="size-3 shrink-0" aria-hidden="true" /></a></dd>
                <dt className="text-muted-foreground">Speculative</dt>
                <dd>{d.draftHfId ? <span className="font-mono text-[12px]">{d.draftHfId}</span> : d.speculativeDecoding ? "In-model" : "Off"}</dd>
                {measured ? (
                  <>
                    <dt className="text-muted-foreground">Requests</dt>
                    <dd className="flex flex-wrap items-center gap-1.5">{row.capacity.incomplete || row.capacity.errored ? <RunQualityBadge incomplete={row.capacity.incomplete} errored={row.capacity.errored} /> : "No incomplete or errored request at C_max"}</dd>
                  </>
                ) : null}
              </dl>

              <Section title={variant ? "Recorded runtime config" : "Configured engine arguments"} aside={chips.length ? `${chips.length} keys` : undefined} testId="setup-knobs">
                {chips.length
                  ? <span className="flex flex-wrap gap-1">{chips.map((chip, index) => <Badge key={`${chip}-${index}`} variant="mono" className="h-auto max-w-full py-0.5 whitespace-normal break-all">{chip}</Badge>)}</span>
                  : <span className="text-muted-foreground text-[13px]">Engine defaults</span>}
              </Section>

              {variant ? (
                <Section title="Runs of this setup" aside={`${variant.runCount} run${variant.runCount === 1 ? "" : "s"} · ${variant.runtimeCount} engine version${variant.runtimeCount === 1 ? "" : "s"} · newest first`} testId="setup-runs">
                  <table className="w-full text-[13px] tabular-nums">
                    <thead className="text-muted-foreground text-xs">
                      <tr className="border-b"><th className="py-1 text-left font-medium">Runtime version</th><th className="py-1 text-left font-medium">Date</th><th className="py-1 text-right font-medium">tok/min/GPU</th><th className="py-1 text-right font-medium">C_max</th></tr>
                    </thead>
                    <tbody>
                      {variant.runs.map((item) => {
                        const fronts = item.run.id === variant.best.run.id;
                        return (
                          <tr key={item.run.id} className="border-b last:border-b-0" data-variant-run={item.run.id} data-fronts={fronts || undefined}>
                            <td className="py-1.5 pr-2 font-mono text-[11px] break-all">{item.run.identity.runtimeVersion}{fronts ? <Badge variant="outline" className="ml-1.5 font-sans">best</Badge> : null}</td>
                            <td className="py-1.5 pr-2 whitespace-nowrap">{dateOf(item.run.runDate)}</td>
                            <td className="py-1.5 text-right">{item.capacity.sustainableTpmPerGpu === null ? <Missing /> : num(item.capacity.sustainableTpmPerGpu)}</td>
                            <td className="py-1.5 text-right">{item.capacity.highestPassingConcurrency === null ? <Missing /> : num(item.capacity.highestPassingConcurrency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Section>
              ) : null}

              {published.length ? (
                <Section title="Published elsewhere" aside="external · not measured here · never ranked" testId="setup-published">
                  <ul className="divide-y rounded-lg border">{published.map((record) => <PublishedCard key={record.id} record={record} />)}</ul>
                  <a href={routeUrl("published", { model: d.modelId })} className="text-link text-xs hover:underline">All published results for this model</a>
                </Section>
              ) : null}

              <CommandBlock title={`Serve command · ${engineBuildDetail(d)}`} command={d.command} testId="setup-command" />
            </div>
            <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t px-5 py-3">
              {engines.length > 1 ? <Button variant="ghost" asChild><a href={routeUrl("engine", { model: d.modelId })} data-testid="setup-engine" title="Engine head-to-head for this model"><Swords aria-hidden="true" />Engine</a></Button> : null}
              <Button variant="outline" onClick={() => { onClose(); openRun(d.id); }} data-testid="setup-evidence"><FileSearch aria-hidden="true" />Evidence</Button>
              <Button variant="outline" onClick={() => addToCompare(d.id)} data-testid="setup-compare"><Columns2 aria-hidden="true" />Compare</Button>
              <Button asChild><a href={routeUrl("throughput", bestRun ? { run: d.id, rid: bestRun } : { run: d.id })} data-testid="setup-throughput" data-run-id={bestRun}><Activity aria-hidden="true" />Throughput</a></Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
