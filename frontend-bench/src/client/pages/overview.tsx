import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Term } from "../components/app/primitives.js";
import { appState, updateView, useAppState } from "../state.js";
import { rankedRows } from "../lib/display.js";
import { TldrControls, useTldrShape } from "../components/app/tldr-controls.js";
import { SetupsTable } from "../components/app/tldr-setups.js";
import { ChampionsByWorkload } from "../components/app/tldr-champions.js";
import { ExportEngineMatrix, WinnerAndGaps } from "../components/app/tldr-overview.js";
import { PublishedResults } from "../components/app/tldr-published.js";
import { isFiltered, NO_FILTER, useTldrModelId, type LadderFilter } from "../components/app/tldr-data.js";
import { useSetupEntries } from "../components/app/tldr-parts.js";
import { exportRows } from "../lib/export.js";
import { IntelligenceView } from "./intelligence.js";

/**
 * TL;DR: pick a model and a GPU shape; every setup is ranked by sustainable throughput with its gap to the best.
 * Control row → (once ≥2 setups have a sustainable value) winner and gaps + best by export × engine → setups ladder
 * (variants, filter chips, published sub-rows) → published results (external, never ranked) → champions by workload.
 * The workload and SLO come from the top bar.
 */
function TldrPage() {
  const state = useAppState();
  const modelId = useTldrModelId();
  const shape = useTldrShape(modelId);
  const { rows, entries } = useSetupEntries(modelId, shape, state.workload);
  // Ladder filter chips live in the URL (`engine`, `precision`, `spec`) so a filtered ladder can be shared and survives
  // a reload; a model or shape change after the first render clears them. The weak-records toggle is per view.
  const filter: LadderFilter = state.tldrFilter;
  const setFilter = React.useCallback((next: LadderFilter) => updateView((s) => { s.tldrFilter = { engines: [...next.engines], precisions: [...next.precisions], spec: next.spec }; }), []);
  const [showWeak, setShowWeak] = React.useState(false);
  const scopeKey = `${modelId}|${shape}`;
  const previousScope = React.useRef(scopeKey);
  React.useEffect(() => {
    if (previousScope.current === scopeKey) return;
    previousScope.current = scopeKey;
    if (isFiltered(appState.tldrFilter)) setFilter(NO_FILTER);
  }, [scopeKey, setFilter]);
  const ranked = entries.filter((entry) => entry.position !== null).length;
  return (
    <div className="space-y-4">
      <PageHeader title="TL;DR" description="Pick a model and hardware; every setup is ranked by sustainable throughput with its gap to the best.">
        <div className="pt-2"><TldrControls modelId={modelId} /></div>
      </PageHeader>
      {ranked >= 2 ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" data-testid="tldr-overview">
          <WinnerAndGaps entries={entries} rows={rows} />
          <ExportEngineMatrix entries={entries} rows={rows} onFilter={setFilter} />
        </div>
      ) : null}
      <SetupsTable modelId={modelId} shape={shape} sort={state.tldrSort} filter={filter} onFilter={setFilter} showWeak={showWeak} />
      <PublishedResults modelId={modelId} showWeak={showWeak} onShowWeak={setShowWeak} />
      <ChampionsByWorkload modelId={modelId} shape={shape} />
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
