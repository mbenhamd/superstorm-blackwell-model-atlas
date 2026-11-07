import * as React from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { intelligence as snapshot } from "../../lib/atlas.js";
import { Panel } from "./primitives.js";
import { atlasModel, hfUrl } from "../../lib/atlas.js";
import { useAppState } from "../../state.js";

/**
 * Published intelligence scores pinned in the catalog snapshot (scripts/import-intelligence.ts).
 * Third-party Artificial Analysis Intelligence Index v5.0.1 by effort variant, with the Hugging Face
 * repository and pinned revision for catalog models. These are not measurements of any configuration in
 * this console: they identify no export, engine, KServe path or GPU, and never feed the serving frontier.
 */

type Release = (typeof snapshot.releases)[number];
type Variant = Release["variants"][number];

const AXIS_MAX = 70;
const ticks = [0, 10, 20, 30, 40, 50, 60, 70];
const fmt = (value: number) => value.toFixed(1);
const pct = (value: number) => `${Math.min(100, (value / AXIS_MAX) * 100)}%`;
const effortLabel = (variant: Variant) => variant.effort === "reasoning, no effort setting" ? "reasoning" : variant.effort;

function VariantTrack({ release }: { release: Release }) {
  const published = release.variants.filter((variant): variant is Variant & { index: number } => variant.index !== null);
  const top = release.highest?.index ?? null;
  return (
    <div className="relative h-5 min-w-0" aria-hidden="true">
      <div className="bg-border absolute inset-x-0 top-1/2 h-px" />
      {ticks.slice(1).map((tick) => <div key={tick} className="bg-border absolute top-1/2 h-1.5 w-px -translate-y-1/2" style={{ left: pct(tick) }} />)}
      {top !== null ? <div className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full" style={{ width: pct(top), backgroundColor: release.role === "catalog" ? "color-mix(in oklab, var(--chart-1) 35%, transparent)" : "color-mix(in oklab, var(--muted-foreground) 30%, transparent)" }} /> : null}
      {published.map((variant) => {
        const isTop = variant.slug === release.highest?.slug;
        return (
          <span
            key={variant.slug}
            className={cn("absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--card)]", isTop ? "size-2.5" : "size-[7px]")}
            style={{ left: pct(variant.index), backgroundColor: isTop ? (release.role === "catalog" ? "var(--chart-1)" : "var(--foreground)") : "var(--chart-neutral)" }}
          />
        );
      })}
    </div>
  );
}

function ReleaseRow({ release }: { release: Release }) {
  const hf = release.catalogKey ? atlasModel(release.catalogKey) : undefined;
  // Catalog models render under the catalog's canonical display name; AA's own label stays in the title.
  const catalogName = useAppState().snapshot.models.find((model) => model.id === release.catalogKey)?.name;
  const name = catalogName ?? release.name;
  const aaLabel = catalogName && catalogName !== release.name ? ` · listed by Artificial Analysis as “${release.name}”` : "";
  const top = release.variants.find((variant) => variant.slug === release.highest?.slug);
  const published = release.variants.filter((variant) => variant.index !== null);
  const incomplete = release.variants.filter((variant) => variant.index === null);
  const variantSummary = [...release.variants]
    .sort((a, b) => (b.index ?? -1) - (a.index ?? -1))
    .map((variant) => `${effortLabel(variant)} ${variant.index === null ? "no composite" : fmt(variant.index)}`)
    .join(", ");
  const origin = `${release.creator} · ${release.openWeights ? "open weights" : "proprietary"}${hf ? ` · ${hf.hfId}` : ""}`;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2 md:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)_6.5rem]" data-intelligence-release={release.key}>
      <div className="flex min-w-0 items-center gap-1.5">
        {hf ? (
          <a className="hover:text-link truncate text-[13px] font-medium underline-offset-2 hover:underline" href={hfUrl(hf.hfId, hf.revision)} target="_blank" rel="noreferrer" title={`${origin} (Hugging Face, pinned revision)${aaLabel}`}>{name}</a>
        ) : (
          <span className="truncate text-[13px] font-medium" title={`${origin}${aaLabel}`}>{name}</span>
        )}
        {release.role === "frontier_reference" ? <Badge variant="neutral" className="shrink-0">Ref</Badge> : null}
      </div>
      <div className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <div tabIndex={0} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${name} effort variants: ${variantSummary}`}>
              <VariantTrack release={release} />
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-left">
            {[...release.variants].sort((a, b) => (b.index ?? -1) - (a.index ?? -1)).map((variant) => (
              <div key={variant.slug} className="flex justify-between gap-4 tabular-nums">
                <span>{variant.name}</span>
                <span className="font-medium">{variant.index === null ? "no composite" : fmt(variant.index)}</span>
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="col-start-2 row-start-1 flex items-baseline justify-end gap-1.5 md:col-start-auto md:row-start-auto">
        {top && top.index !== null ? (
          <>
            <a href={top.source?.url} target="_blank" rel="noreferrer" className="hover:text-link text-[14px] font-semibold tabular-nums" title={`Artificial Analysis page for ${top.name}${published.length > 1 ? ` · ${published.length} effort variants` : ""}`}>{fmt(top.index)}</a>
            <span className="text-muted-foreground w-14 text-[11px]">{effortLabel(top)}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-xs whitespace-nowrap" title={`No composite: not published ${incomplete.flatMap((variant) => variant.missing).join(", ")}`}>No composite{incomplete[0] ? ` · ${Object.values(incomplete[0].components).filter((value) => value !== null).length}/${Object.keys(incomplete[0].components).length}` : ""}</span>
        )}
      </div>
    </li>
  );
}

export function PublishedIntelligencePanel() {
  const [scope, setScope] = React.useState<"catalog" | "all">("catalog");
  const releases = snapshot.releases
    .filter((release) => scope === "all" || release.role === "catalog")
    .sort((a, b) => (b.highest?.index ?? -1) - (a.highest?.index ?? -1));
  const catalogCount = snapshot.releases.filter((release) => release.role === "catalog").length;
  return (
    <Panel
      id="published-intelligence"
      title={<>{snapshot.name} {snapshot.version}</>}
      description={<>Model level · {snapshot.asOf}</>}
      actions={
        <ToggleGroup type="single" variant="outline" size="sm" value={scope} aria-label="Releases shown" onValueChange={(value: string) => { if (value) setScope(value as "catalog" | "all"); }}>
          <ToggleGroupItem value="catalog" className="px-2.5">Catalog · {catalogCount}</ToggleGroupItem>
          <ToggleGroupItem value="all" className="px-2.5">+ References · {snapshot.releases.length}</ToggleGroupItem>
        </ToggleGroup>
      }
      bodyClassName="px-0 pb-0"
    >
      <div data-testid="published-intelligence">
        <div className="text-muted-foreground hidden grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)_6.5rem] gap-x-4 border-b px-4 py-1.5 text-[11px] md:grid">
          <span>Model</span>
          <span className="relative h-4" aria-hidden="true">
            {ticks.map((tick) => <span key={tick} className="absolute -translate-x-1/2 tabular-nums" style={{ left: pct(tick) }}>{tick}</span>)}
          </span>
          <span className="text-right">Top effort</span>
        </div>
        <ol className="divide-y">
          {releases.map((release) => <ReleaseRow key={release.key} release={release} />)}
        </ol>
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-4 py-2 text-[11px]">
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><span className="bg-chart-1 size-2.5 rounded-full" aria-hidden="true" />Top effort</span>
            <span className="inline-flex items-center gap-1.5"><span className="bg-chart-neutral size-[7px] rounded-full" aria-hidden="true" />Other efforts</span>
          </span>
          <a className="hover:text-foreground inline-flex items-center gap-1 underline-offset-2 hover:underline" href={snapshot.method.url} target="_blank" rel="noreferrer">Methodology<ExternalLink className="size-3" aria-hidden="true" /></a>
        </div>
      </div>
    </Panel>
  );
}
