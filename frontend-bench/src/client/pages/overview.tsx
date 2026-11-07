import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader, Term } from "../components/app/primitives.js";
import { useAppState } from "../state.js";
import { isMeasured, rankedRows } from "../lib/display.js";
import { ChampionsByWorkload, ModelsGlance, VariantLadder, type TldrSort } from "../components/app/tldr-comparisons.js";
import { exportRows } from "../lib/export.js";
import { IntelligenceView } from "./intelligence.js";

const SORTS: { value: TldrSort; label: string }[] = [
  { value: "sustainable", label: "Sustainable" }, { value: "cmax", label: "C_max" }, { value: "aa", label: "AA" }, { value: "name", label: "Name" },
];

/**
 * TL;DR variant selector. One model family (header select) on the active dataset and SLO:
 * champions per workload, then every variant; the cross-model glance below re-scopes the family on click.
 */
function TldrPage() {
  const state = useAppState();
  const models = state.snapshot.models;
  const configs = state.snapshot.deployments.filter((d) => d.id === d.configurationId);
  const configCount = (id: string) => configs.filter((d) => d.modelId === id).length;
  const fallback = [...models].sort((a, b) => configCount(b.id) - configCount(a.id))[0]?.id ?? "";
  const [modelId, setModelId] = React.useState(() => (state.model !== "all" && models.some((m) => m.id === state.model) ? state.model : fallback));
  const [sort, setSort] = React.useState<TldrSort>("sustainable");
  const rows = rankedRows();
  const candidates = configs.filter((d) => d.status === "candidate").length;
  const measured = rows.filter((row) => isMeasured(row.deployment)).length;
  return (
    <div className="space-y-4">
      <PageHeader
        title="TL;DR"
        description={
          <span data-testid="tldr-kpis" className="tabular-nums">
            {models.length} models · {candidates} of {configs.length} candidates · {measured} of {configs.length} measured on <span className="font-mono">{state.workload}</span>
          </span>
        }
        actions={
          <>
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger size="sm" className="h-8 w-[220px]" aria-label="Model family" data-testid="variant-model"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" align="end">
                {models.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} <span className="text-muted-foreground">· {configCount(item.id)}</span></SelectItem>)}
              </SelectContent>
            </Select>
            <ToggleGroup type="single" variant="outline" size="sm" value={sort} aria-label="Sort" data-testid="tldr-sort" onValueChange={(value: string) => { if (value) setSort(value as TldrSort); }}>
              {SORTS.map((item) => <ToggleGroupItem key={item.value} value={item.value} className="px-2.5">{item.label}</ToggleGroupItem>)}
            </ToggleGroup>
            <Button variant="outline" size="sm" onClick={() => exportRows(rows, "tldr")}><Download aria-hidden="true" />Export</Button>
          </>
        }
      />
      <ChampionsByWorkload modelId={modelId} />
      <VariantLadder modelId={modelId} sort={sort} />
      <ModelsGlance sort={sort} active={modelId} onSelect={setModelId} />
    </div>
  );
}

export function OverviewPage({ view }: { view: "tldr" | "intelligence" }) {
  const rows = rankedRows();
  if (view === "tldr") return <TldrPage />;
  return (
    <div className="space-y-4">
      <PageHeader
        title="Intelligence vs throughput"
        description={<><Term name="Intelligence">AA index</Term> (model level) against sustainable tok/min/GPU.</>}
        actions={<Button variant="outline" onClick={() => exportRows(rows, view)}><Download aria-hidden="true" />Export</Button>}
      />
      <IntelligenceView />
    </div>
  );
}
