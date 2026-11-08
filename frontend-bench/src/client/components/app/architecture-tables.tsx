import * as React from "react";
import { DataTableCard } from "@/components/blocks/data-table-card";
import { DataTableColumnHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { DistributionBar } from "@/components/ui/distribution-bar";
import { MetricValue } from "@/components/ui/metric-value";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { activeFraction, expertFacts, MIXER_KINDS, type ExpertFacts } from "../../../domain/architecture.js";
import { NARROW_MD, useMediaQuery } from "../../lib/use-media.js";
import { num, pct } from "../../lib/display.js";
import { InfoTip } from "./primitives.js";
import { attentionFacts, kindColor, type ArchEntry, type AttentionFacts } from "./architecture-data.js";

/**
 * Attention & KV and Experts & parameters tables (dashboardcn data-table-card, distribution-bar, radial-gauge,
 * metric-value). Rows keep the catalog order (grouped by publisher) until a column is sorted. Every value is a
 * recorded configuration field or a calculation on them; "—" marks a field the snapshot does not carry.
 */

const dash = <span className="text-muted-foreground" data-missing="true">—</span>;
const cardClass = "gap-3 rounded-lg py-4 [&_[data-slot=card-header]]:px-4 [&_[data-slot=card-content]]:px-4 [&_[data-slot=card-footer]]:px-4";
const ctxShort = (tokens: number) => (tokens >= 1_048_576 ? `${num(tokens / 1_048_576, tokens % 1_048_576 ? 1 : 0)}M` : `${num(tokens / 1024)}K`);

function ModelCell({ entry, onOpen }: { entry: ArchEntry; onOpen: (id: string) => void }) {
  return (
    <div className="min-w-0">
      <button type="button" className="hover:text-link focus-visible:text-link max-w-full text-left font-medium text-pretty" onClick={(event) => { event.stopPropagation(); onOpen(entry.model.id); }} data-testid="arch-table-open">
        {entry.model.name}
      </button>
      <p className="text-muted-foreground truncate text-[12px]">{entry.publisher} · {entry.model.architecture}</p>
    </div>
  );
}

function MixerMix({ entry }: { entry: ArchEntry }) {
  return (
    <div className="min-w-0 space-y-1">
      <DistributionBar showLegend={false} segments={entry.arch.counts.map(({ kind, count }) => ({ name: MIXER_KINDS[kind].label, value: count, color: kindColor(kind) }))} />
      <p className="text-muted-foreground text-[12px] leading-4 text-pretty">{entry.arch.summary}</p>
    </div>
  );
}

/** KV bytes per token (BF16 calculation) or "—" with its short reason. */
export function KvCell({ entry, align = "right" }: { entry: ArchEntry; align?: "left" | "right" }) {
  const { kv } = entry.arch;
  return (
    <div className={align === "right" ? "text-right" : undefined} data-testid="arch-kv" data-model-id={entry.model.id}>
      {kv.bytesPerToken !== null ? <span className="tabular-nums"><MetricValue value={kv.bytesPerToken} compactFrom={Infinity} /> B</span> : dash}
      <p className="text-muted-foreground text-[11px] leading-4 text-pretty">
        {kv.bytesPerToken === null ? kv.short : kv.windowed ? `+ ${num(kv.windowed.bytesPerToken)} B ≤ ${num(kv.windowed.window)} tokens` : kv.excludes.length ? "excl. fixed state" : "all layers"}
      </p>
    </div>
  );
}

interface AttentionRow { entry: ArchEntry; facts: AttentionFacts }
interface ExpertRow { entry: ArchEntry; experts: ExpertFacts; fraction: number | null }

const kvHeader = () => (
  <span className="inline-flex items-center justify-end gap-0.5">
    KV / token
    <InfoTip label="How KV per token is calculated">
      Calculation from configuration fields, BF16 (2 bytes per element), per token of context, before paging, scales or
      engine overhead. GQA: 2 (K, V) × KV heads × head dim × 2 B × attention layers. Sliding layers hold at most the
      window. MLA: (kv_lora_rank + qk_rope_head_dim) per KV-owning layer; NoPE layers store the latent only; layers
      that read another layer&apos;s cache add nothing. Linear-mixer state is per sequence and indexer keys are left
      out. Not measured.
    </InfoTip>
  </span>
);

const attentionWide = (onOpen: (id: string) => void): DataTableColumnDef<AttentionRow>[] => [
  { id: "model", accessorFn: (row) => row.entry.model.name, enableHiding: false, header: ({ column }) => <DataTableColumnHeader column={column} title="Model" />, cell: ({ row }) => <ModelCell entry={row.original.entry} onOpen={onOpen} /> },
  { id: "mix", size: 210, enableSorting: false, header: () => <span>Mixer mix</span>, cell: ({ row }) => <MixerMix entry={row.original.entry} /> },
  { id: "heads", size: 66, accessorFn: (row) => row.facts.heads ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="Heads" align="right" />, cell: ({ row }) => <div className="text-right tabular-nums">{row.original.facts.heads ?? dash}</div> },
  { id: "kv-heads", size: 124, enableSorting: false, header: () => <span>KV heads / latent</span>, cell: ({ row }) => <div className="tabular-nums">{row.original.facts.kv?.text ?? dash}</div> },
  { id: "head-dim", size: 118, enableSorting: false, header: () => <span>Head dim</span>, cell: ({ row }) => <div className="tabular-nums">{row.original.facts.headDim ?? dash}</div> },
  { id: "window", size: 78, accessorFn: (row) => row.facts.window ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="Window" align="right" />, cell: ({ row }) => <div className="text-right tabular-nums">{row.original.facts.window !== null ? num(row.original.facts.window) : <span className="text-muted-foreground">none</span>}</div> },
  { id: "topk", size: 72, accessorFn: (row) => row.facts.topk ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="Top-k" align="right" />, cell: ({ row }) => <div className="text-right tabular-nums">{row.original.facts.topk !== null ? num(row.original.facts.topk) : <span className="text-muted-foreground">none</span>}</div> },
  { id: "context", size: 78, accessorFn: (row) => row.entry.model.contextTokens, header: ({ column }) => <DataTableColumnHeader column={column} title="Context" align="right" />, cell: ({ row }) => <div className="text-right tabular-nums">{ctxShort(row.original.entry.model.contextTokens)}</div> },
  { id: "kv", size: 164, accessorFn: (row) => row.entry.arch.kv.bytesPerToken ?? undefined, sortUndefined: "last", header: kvHeader, cell: ({ row }) => <KvCell entry={row.original.entry} /> },
];

const attentionNarrow = (onOpen: (id: string) => void): DataTableColumnDef<AttentionRow>[] => [
  {
    id: "stacked", enableHiding: false, enableSorting: false, header: () => <span>Model · attention</span>,
    cell: ({ row }) => {
      const { entry, facts } = row.original;
      return (
        <div className="min-w-0 space-y-2 py-0.5">
          <ModelCell entry={entry} onOpen={onOpen} />
          <MixerMix entry={entry} />
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12px]">
            <dt className="text-muted-foreground">Heads · KV</dt><dd className="tabular-nums">{facts.heads ?? "—"} · {facts.kv?.text ?? "—"}</dd>
            <dt className="text-muted-foreground">Window · top-k</dt><dd className="tabular-nums">{facts.window !== null ? num(facts.window) : "none"} · {facts.topk !== null ? num(facts.topk) : "none"}</dd>
            <dt className="text-muted-foreground">KV / token</dt><dd><KvCell entry={entry} align="left" /></dd>
          </dl>
        </div>
      );
    },
  },
];

function FractionCell({ fraction, name }: { fraction: number | null; name: string }) {
  if (fraction === null) return <div className="text-right">{dash}</div>;
  return (
    <div className="flex items-center justify-end gap-2" data-testid="arch-fraction">
      <span className="tabular-nums">{pct(fraction)}</span>
      <RadialGauge value={fraction * 100} size={22} thickness={4} sweep={360} color="var(--arch-active)" trackColor="var(--arch-total)" role="img" aria-label={`${name}: active parameters are ${pct(fraction)} of total`} />
    </div>
  );
}

const billions = (value: number | null) => (value === null ? dash : <MetricValue value={value} compactFrom={Infinity} maximumFractionDigits={2} />);
const count = (value: number | null) => (value === null ? dash : <span className="tabular-nums">{num(value)}</span>);

const expertsWide = (onOpen: (id: string) => void): DataTableColumnDef<ExpertRow>[] => [
  { id: "model", accessorFn: (row) => row.entry.model.name, enableHiding: false, header: ({ column }) => <DataTableColumnHeader column={column} title="Model" />, cell: ({ row }) => <ModelCell entry={row.original.entry} onOpen={onOpen} /> },
  { id: "total", size: 100, accessorFn: (row) => row.entry.model.totalParamsB ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="Total (B)" align="right" />, cell: ({ row }) => <div className="text-right tabular-nums">{billions(row.original.entry.model.totalParamsB)}</div> },
  { id: "active", size: 96, accessorFn: (row) => row.entry.model.activeParamsB ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="Active (B)" align="right" />, cell: ({ row }) => <div className="text-right tabular-nums">{billions(row.original.entry.model.activeParamsB)}</div> },
  { id: "fraction", size: 110, accessorFn: (row) => row.fraction ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="Active share" align="right" />, cell: ({ row }) => <FractionCell fraction={row.original.fraction} name={row.original.entry.model.name} /> },
  { id: "routed", size: 92, accessorFn: (row) => row.experts.routed ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="Routed" align="right" />, cell: ({ row }) => <div className="text-right">{row.original.experts.dense ? <span className="text-muted-foreground">dense</span> : count(row.original.experts.routed)}</div> },
  { id: "per-token", size: 92, accessorFn: (row) => row.experts.perToken ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="Per token" align="right" />, cell: ({ row }) => <div className="text-right">{count(row.original.experts.perToken)}</div> },
  { id: "shared", size: 84, accessorFn: (row) => row.experts.shared ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="Shared" align="right" />, cell: ({ row }) => <div className="text-right">{count(row.original.experts.shared)}</div> },
  { id: "prefix", size: 104, accessorFn: (row) => row.experts.densePrefix ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="Dense prefix" align="right" />, cell: ({ row }) => <div className="text-right">{count(row.original.experts.densePrefix)}</div> },
  { id: "draft", size: 110, accessorFn: (row) => row.experts.draft?.value ?? undefined, sortUndefined: "last", header: ({ column }) => <DataTableColumnHeader column={column} title="MTP / draft" align="right" />, cell: ({ row }) => <div className="text-right" title={row.original.experts.draftNote ?? row.original.experts.draft?.field}>{count(row.original.experts.draft?.value ?? null)}</div> },
];

const expertsNarrow = (onOpen: (id: string) => void): DataTableColumnDef<ExpertRow>[] => [
  {
    id: "stacked", enableHiding: false, enableSorting: false, header: () => <span>Model · parameters and experts</span>,
    cell: ({ row }) => {
      const { entry, experts, fraction } = row.original;
      const value = (v: number | null) => (v === null ? "—" : num(v, v % 1 ? 2 : 0));
      return (
        <div className="min-w-0 space-y-2 py-0.5">
          <ModelCell entry={entry} onOpen={onOpen} />
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12px]">
            <dt className="text-muted-foreground">Total · active (B)</dt><dd className="tabular-nums">{value(entry.model.totalParamsB)} · {value(entry.model.activeParamsB)}{fraction !== null ? ` · ${pct(fraction)} active` : ""}</dd>
            <dt className="text-muted-foreground">Experts</dt><dd className="tabular-nums">{experts.dense ? "dense" : `${value(experts.routed)} routed · ${value(experts.perToken)} per token · ${value(experts.shared)} shared`}</dd>
            <dt className="text-muted-foreground">Dense prefix · draft</dt><dd className="tabular-nums">{value(experts.densePrefix)} · {value(experts.draft?.value ?? null)}</dd>
          </dl>
        </div>
      );
    },
  },
];

export function AttentionTable({ entries, onOpen }: { entries: readonly ArchEntry[]; onOpen: (id: string) => void }) {
  const narrow = useMediaQuery(NARROW_MD);
  const rows = React.useMemo(() => entries.map((entry) => ({ entry, facts: attentionFacts(entry.model) })), [entries]);
  const columns = React.useMemo(() => (narrow ? attentionNarrow : attentionWide)(onOpen), [narrow, onOpen]);
  return (
    <DataTableCard
      key={narrow ? "stacked" : "table"} layout="fixed" minTableWidth={narrow ? undefined : 1060} density="compact"
      title="Attention and KV"
      description={<>Per model: mixer mix, attention fields as the configuration records them, and KV per token as a BF16 calculation from those fields (formula in the column header). &ldquo;—&rdquo; = the snapshot does not carry what the calculation needs; &ldquo;none&rdquo; = no sliding window or indexer configured. Not measured.</>}
      className={cardClass} data-testid="arch-attention" columns={columns} data={rows}
      getRowId={(row) => row.entry.model.id} showPagination={false} pageSize={50} showViewOptions={!narrow}
      onRowClick={(row) => onOpen(row.original.entry.model.id)}
      rowProps={(row) => ({ "data-model-id": row.original.entry.model.id } as React.ComponentProps<"tr">)}
    />
  );
}

export function ExpertsTable({ entries, onOpen }: { entries: readonly ArchEntry[]; onOpen: (id: string) => void }) {
  const narrow = useMediaQuery(NARROW_MD);
  const rows = React.useMemo(() => entries.map((entry) => ({ entry, experts: expertFacts(entry.model), fraction: activeFraction(entry.model.totalParamsB, entry.model.activeParamsB) })), [entries]);
  const columns = React.useMemo(() => (narrow ? expertsNarrow : expertsWide)(onOpen), [narrow, onOpen]);
  return (
    <DataTableCard
      key={narrow ? "stacked" : "table"} layout="fixed" minTableWidth={narrow ? undefined : 1000} density="compact"
      title="Experts and parameters"
      description={<>Total and active parameters as the catalog records them (publisher headlines or a stated census; see each model&apos;s parameter note), the active share as a calculation, and the expert and draft-layer fields of the configuration. Dense models show &ldquo;dense&rdquo; under Routed and have no per-token or shared experts. Otherwise &ldquo;—&rdquo; = not recorded. Not measured.</>}
      className={cardClass} data-testid="arch-experts" columns={columns} data={rows}
      getRowId={(row) => row.entry.model.id} showPagination={false} pageSize={50} showViewOptions={!narrow}
      onRowClick={(row) => onOpen(row.original.entry.model.id)}
      rowProps={(row) => ({ "data-model-id": row.original.entry.model.id } as React.ComponentProps<"tr">)}
    />
  );
}
