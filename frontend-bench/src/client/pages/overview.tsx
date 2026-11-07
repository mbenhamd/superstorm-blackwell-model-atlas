import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Term } from "../components/app/primitives.js";
import { useAppState } from "../state.js";
import { rankedRows } from "../lib/display.js";
import { TldrControls, useTldrShape } from "../components/app/tldr-controls.js";
import { SetupsTable } from "../components/app/tldr-setups.js";
import { ChampionsByWorkload } from "../components/app/tldr-champions.js";
import { useTldrModelId } from "../components/app/tldr-data.js";
import { exportRows } from "../lib/export.js";
import { IntelligenceView } from "./intelligence.js";

/**
 * TL;DR: pick a model and a GPU shape; every setup is ranked by sustainable throughput with its gap to the best
 * (control row → setups table → champions by workload). The workload and SLO come from the top bar.
 */
function TldrPage() {
  const state = useAppState();
  const modelId = useTldrModelId();
  const shape = useTldrShape(modelId);
  return (
    <div className="space-y-4">
      <PageHeader title="TL;DR" description="Pick a model and hardware; every setup is ranked by sustainable throughput with its gap to the best.">
        <div className="pt-2"><TldrControls modelId={modelId} /></div>
      </PageHeader>
      <SetupsTable modelId={modelId} shape={shape} sort={state.tldrSort} />
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
