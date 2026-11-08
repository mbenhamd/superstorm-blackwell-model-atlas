import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Term } from "../components/app/primitives.js";
import { updateView, useAppState } from "../state.js";
import { rankedRows } from "../lib/display.js";
import { TldrControls, useTldrShape } from "../components/app/tldr-controls.js";
import { SetupsTable } from "../components/app/tldr-setups.js";
import { SetupSheet } from "../components/app/tldr-setup-sheet.js";
import { usePublishedByConfiguration } from "../components/app/tldr-published.js";
import { shapeKey, shapeLabel, useTldrModelId } from "../components/app/tldr-data.js";
import { useSetupEntries } from "../components/app/tldr-parts.js";
import { exportRows } from "../lib/export.js";
import { rememberOpener } from "../lib/focus-return.js";
import { IntelligenceView } from "./intelligence.js";

/**
 * TL;DR: pick a model and a GPU shape; one table lists every setup by sustainable tok/min/GPU, highest first, with its
 * Δ vs the best. Selecting a setup opens its sheet on the right (knobs, runs, latencies, published results, serve
 * command, links); finer comparisons live on Throughput, Compare, Engine and Published. Workload and SLO: top bar.
 */
function TldrPage() {
  const state = useAppState();
  const modelId = useTldrModelId();
  const shape = useTldrShape(modelId);
  const { rows, entries } = useSetupEntries(modelId, shape, state.workload);
  const published = usePublishedByConfiguration(modelId, false);
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const scopeKey = `${modelId}|${shape}|${state.workload}`;
  // A scope change closes the sheet, except "Across workloads", which reopens the same setup on the picked dataset.
  const pendingKey = React.useRef<string | null>(null);
  React.useEffect(() => { setOpenKey(pendingKey.current); pendingKey.current = null; }, [scopeKey]);
  const model = state.snapshot.models.find((item) => item.id === modelId);
  const shapes = [...new Set(entries.map((entry) => shapeKey(entry.row.deployment)))];
  const scope = [model?.name ?? modelId, shape ? shapeLabel(shape) : shapes.length === 1 ? shapeLabel(shapes[0]!) : "all GPU shapes", state.workload].join(" · ");
  // Published records sit with the first (best-ranked) row of their configuration, as in the sheet.
  const publishedAt = new Map<string, number>();
  const placed = new Set<string>();
  for (const entry of entries) {
    const id = entry.row.deployment.configurationId;
    if (!placed.has(id) && published.has(id)) { placed.add(id); publishedAt.set(entry.row.key, published.get(id)!.length); }
  }
  const openEntry = entries.find((entry) => entry.row.key === openKey) ?? null;
  return (
    <div className="space-y-4">
      <PageHeader title="TL;DR" description="Every setup of a model ranked by sustainable throughput. Select a setup for its details.">
        <div className="pt-2"><TldrControls modelId={modelId} /></div>
      </PageHeader>
      {model ? (
        <SetupsTable
          entries={entries} rows={rows} modelName={model.name} modelId={model.id} scope={scope}
          publishedCount={(row) => publishedAt.get(row.key) ?? 0}
          onOpen={(key) => { rememberOpener(); setOpenKey(key); }}
        />
      ) : null}
      <SetupSheet
        entry={openEntry} entries={entries} rows={rows}
        published={openEntry && publishedAt.has(openEntry.row.key) ? published.get(openEntry.row.deployment.configurationId) ?? [] : []}
        onClose={() => setOpenKey(null)}
        shapeFilter={shape}
        onPickWorkload={(workloadId, key) => { pendingKey.current = key; updateView((s) => { s.workload = workloadId; s.selected = []; }); }}
      />
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
