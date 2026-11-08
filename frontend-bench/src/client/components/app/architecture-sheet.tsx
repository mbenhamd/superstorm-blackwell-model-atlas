import * as React from "react";
import { ExternalLink, Gauge, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DistributionBar } from "@/components/ui/distribution-bar";
import { MetricValue } from "@/components/ui/metric-value";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { activeFraction, expertFacts, MIXER_KINDS } from "../../../domain/architecture.js";
import { routeUrl } from "../../state.js";
import { hfUrl, shortSha } from "../../lib/atlas.js";
import { num, pct } from "../../lib/display.js";
import { restoreOpener } from "../../lib/focus-return.js";
import { attentionFacts, kindColor, ORDER_LABEL, type ArchEntry } from "./architecture-data.js";
import { LayerStrip, paramsText } from "./architecture-map.js";
import { KvCell } from "./architecture-tables.js";

/**
 * Architecture sheet for one model: identity at the pinned revision, the layer strip at sheet width, where its order
 * comes from, counts per kind with the recorded counts they were checked against, attention, KV and MoE fields, the
 * atlas parameter note and evidence status. Same anatomy as the TL;DR setup sheet.
 */

function Section({ title, aside, children, testId }: { title: string; aside?: React.ReactNode; children: React.ReactNode; testId?: string }) {
  return (
    <section className="space-y-2" data-testid={testId}>
      <h3 className="flex items-baseline justify-between gap-3 text-xs font-semibold">{title}{aside ? <span className="text-muted-foreground font-normal">{aside}</span> : null}</h3>
      {children}
    </section>
  );
}

const dl = "grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]";
const dash = <span className="text-muted-foreground" data-missing="true">—</span>;

function SheetStrip({ entry }: { entry: ArchEntry }) {
  const [frame, setFrame] = React.useState<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);
  const [active, setActive] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    if (!frame) return;
    const measure = () => setWidth(frame.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame]);
  const layers = entry.arch.layers.length;
  return (
    <div ref={setFrame} className="min-w-0">
      {width > 0 ? <LayerStrip entry={entry} pitch={width / layers} height={30} active={active} onActive={setActive} testId="arch-sheet-strip" /> : null}
      <div className="text-muted-foreground flex justify-between text-[11px] tabular-nums" aria-hidden="true"><span>Layer {layers}</span><span>Layer 1</span></div>
    </div>
  );
}

export function ArchitectureSheet({ entry, onClose, enginePair }: { entry: ArchEntry | null; onClose: () => void; enginePair: boolean }) {
  const model = entry?.model;
  const arch = entry?.arch;
  const facts = model ? attentionFacts(model) : null;
  const experts = model ? expertFacts(model) : null;
  const fraction = model ? activeFraction(model.totalParamsB, model.activeParamsB) : null;
  return (
    <Sheet open={Boolean(entry)} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="right" className="w-full gap-0 p-0 sm:max-w-[560px]" data-testid="arch-sheet" tabIndex={-1}
        onOpenAutoFocus={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement).focus(); }}
        onCloseAutoFocus={(event) => restoreOpener(event)}
      >
        {entry && model && arch && facts && experts ? (
          <>
            <SheetHeader className="gap-1 border-b px-5 pt-4 pb-3.5">
              <SheetTitle className="pr-8 text-base font-semibold">{model.name}</SheetTitle>
              <SheetDescription className="text-[13px] text-pretty">{model.headline}</SheetDescription>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge variant="neutral">{entry.publisher}</Badge>
                <Badge variant="neutral">{model.architecture}</Badge>
                <Badge variant="outline" data-testid="arch-sheet-order">{arch.layerCount} layers · {ORDER_LABEL[arch.order]}</Badge>
              </div>
            </SheetHeader>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <dl className={dl}>
                <dt className="text-muted-foreground">Weights</dt>
                <dd className="min-w-0"><a className="hover:text-link font-mono text-[12px] [overflow-wrap:anywhere] underline-offset-2 hover:underline" href={hfUrl(model.hfId, model.revision)} target="_blank" rel="noreferrer" data-testid="arch-sheet-weights">{model.hfId}<span className="whitespace-nowrap">@{shortSha(model.revision)}<ExternalLink className="ml-1 inline size-3 align-[-1px]" aria-hidden="true" /></span></a></dd>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="text-pretty" data-testid="arch-sheet-provenance">From the publisher config at revision {shortSha(model.revision)}; not measured.</dd>
              </dl>

              <Section title="Token-mixing layers" aside={arch.summary} testId="arch-sheet-layers">
                <SheetStrip entry={entry} />
                <p className="text-ink-2 text-[13px] text-pretty">{arch.orderNote}</p>
                <ul className="text-ink-2 list-disc space-y-1 pl-4 text-[13px] text-pretty marker:text-muted-foreground">
                  {arch.index ? <li>{arch.index.note}</li> : null}
                  {arch.kvSharing ? <li>{arch.kvSharing.note}</li> : null}
                  {arch.noRope ? <li>{arch.noRope.note}</li> : null}
                  {arch.notes.map((note) => <li key={note}>{note}</li>)}
                  <li>Layer numbers on this page are one-based; configuration fields count from zero (layer 36 here is index 35).</li>
                </ul>
              </Section>

              <Section title="Counts per kind" aside="derived · checked against recorded counts" testId="arch-sheet-counts">
                <DistributionBar showValues valueFormatter={(value) => `${num(value)} layers`} segments={arch.counts.map(({ kind, count }) => ({ name: MIXER_KINDS[kind].label, value: count, color: kindColor(kind) }))} />
                <ul className="text-muted-foreground space-y-0.5 text-[12px] tabular-nums">
                  {arch.checks.map((check) => (
                    <li key={check.field}><span className="font-mono text-[11.5px]">{check.field}</span> = {num(check.recorded)} recorded · {num(check.derived)} derived{check.recorded === check.derived ? "" : " · mismatch"}</li>
                  ))}
                  {arch.index && arch.index.provenance !== "not-recorded" ? <li>Index: {num(arch.index.own)} own · {num(arch.index.reused)} reuse an earlier selection</li> : null}
                </ul>
              </Section>

              <Section title="Attention and KV" aside="configuration fields · KV is a calculation" testId="arch-sheet-attention">
                <dl className={dl}>
                  <dt className="text-muted-foreground">Attention heads</dt><dd className="tabular-nums">{facts.heads ?? dash}</dd>
                  <dt className="text-muted-foreground">{facts.kv?.kind === "mla" ? "KV latent rank" : "KV heads"}</dt><dd className="tabular-nums">{facts.kv?.text ?? dash}</dd>
                  <dt className="text-muted-foreground">Head dim</dt><dd className="tabular-nums">{facts.headDim ?? dash}</dd>
                  <dt className="text-muted-foreground">Sliding window</dt><dd className="tabular-nums">{facts.window !== null ? `${num(facts.window)} tokens` : facts.windowNull ? "none (sliding_window = null)" : "none"}</dd>
                  <dt className="text-muted-foreground">Index top-k</dt><dd className="tabular-nums">{facts.topk !== null ? <>{num(facts.topk)} <span className="text-muted-foreground font-mono text-[11.5px]">{facts.topkField}</span></> : "none"}</dd>
                  <dt className="text-muted-foreground">Context</dt><dd className="tabular-nums">{num(model.contextTokens)} tokens</dd>
                  <dt className="text-muted-foreground">KV / token</dt>
                  <dd className="min-w-0 space-y-1">
                    <KvCell entry={entry} align="left" />
                    <p className="text-muted-foreground text-[12px] text-pretty">{arch.kv.bytesPerToken !== null ? `BF16: ${arch.kv.formula}.` : arch.kv.reason}{arch.kv.windowed ? ` Sliding layers add ${num(arch.kv.windowed.bytesPerToken)} B per token for at most ${num(arch.kv.windowed.window)} tokens (${num(arch.kv.windowed.layers)} layers).` : ""}{arch.kv.excludes.length ? ` Excludes ${arch.kv.excludes.join("; ")}.` : ""}</p>
                  </dd>
                </dl>
              </Section>

              <Section title="Parameters and experts" aside={paramsText(entry)} testId="arch-sheet-experts">
                <dl className={dl}>
                  <dt className="text-muted-foreground">Total (B)</dt><dd className="tabular-nums">{model.totalParamsB !== null ? <MetricValue value={model.totalParamsB} compactFrom={Infinity} maximumFractionDigits={2} /> : dash}</dd>
                  <dt className="text-muted-foreground">Active (B)</dt><dd className="tabular-nums">{model.activeParamsB !== null ? <MetricValue value={model.activeParamsB} compactFrom={Infinity} maximumFractionDigits={2} /> : dash}</dd>
                  <dt className="text-muted-foreground">Active share</dt><dd className="tabular-nums">{fraction !== null ? `${pct(fraction)} (calculation)` : dash}</dd>
                  <dt className="text-muted-foreground">Routed experts</dt><dd className="tabular-nums">{experts.dense ? "dense" : experts.routed !== null ? `${num(experts.routed)} · ${experts.perToken !== null ? num(experts.perToken) : "—"} per token` : dash}</dd>
                  <dt className="text-muted-foreground">Shared experts</dt><dd className="tabular-nums">{experts.dense ? "—" : experts.shared !== null ? num(experts.shared) : dash}</dd>
                  <dt className="text-muted-foreground">Dense prefix layers</dt><dd className="tabular-nums">{experts.densePrefix !== null ? num(experts.densePrefix) : dash}</dd>
                  <dt className="text-muted-foreground">MTP / draft layers</dt><dd className="tabular-nums">{experts.draft ? <>{num(experts.draft.value)} <span className="text-muted-foreground font-mono text-[11.5px]">{experts.draft.field}</span></> : dash}{experts.draftNote ? <p className="text-muted-foreground text-[12px]">{experts.draftNote}</p> : null}</dd>
                </dl>
                {model.parameterNote ? <p className="bg-subtle text-ink-2 rounded-lg border px-3.5 py-2.5 text-[12px] text-pretty" data-testid="arch-sheet-parameter-note">{model.parameterNote}</p> : null}
              </Section>

              <Section title="Evidence" testId="arch-sheet-evidence">
                <p className="text-ink-2 text-[13px] text-pretty">{model.evidenceStatus}</p>
              </Section>
            </div>
            <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t px-5 py-3">
              {enginePair ? <Button variant="ghost" asChild><a href={routeUrl("engine", { model: model.id })} data-testid="arch-sheet-engine"><Server aria-hidden="true" />Engine</a></Button> : null}
              <Button variant="outline" asChild><a href={routeUrl("tldr", { model: model.id })} data-testid="arch-sheet-tldr"><Gauge aria-hidden="true" />TL;DR</a></Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
