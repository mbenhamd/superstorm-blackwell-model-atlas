import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel } from "../components/app/primitives.js";
import { archEntries, archEntry } from "../components/app/architecture-data.js";
import { LayerMap } from "../components/app/architecture-map.js";
import { AttentionTable, ExpertsTable } from "../components/app/architecture-tables.js";
import { ArchitectureSheet } from "../components/app/architecture-sheet.js";
import { rememberOpener } from "../lib/focus-return.js";
import { updateView, useAppState, type ArchTab } from "../state.js";
import { enginePairs } from "./engine.js";

/**
 * Architecture: how each catalog model mixes tokens, layer by layer, from its pinned publisher configuration. Three
 * views of the same derived maps (src/domain/architecture.ts): the layer map (default), attention and KV fields, and
 * experts and parameters. The open model is the URL `model` parameter, the view is `tab`. Nothing here is measured.
 */
export function ArchitecturePage() {
  const state = useAppState();
  const entries = archEntries();
  const open = state.model !== "all" ? archEntry(state.model) ?? null : null;
  const onOpen = React.useCallback((id: string) => { rememberOpener(); updateView((s) => { s.model = id; }); }, []);
  const pairs = React.useMemo(() => enginePairs(state.snapshot.deployments), [state.snapshot.deployments]);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Architecture"
        description="Token-mixing layers, attention and expert fields of each catalog model, read from its publisher configuration at the pinned revision. Configuration facts and calculations; nothing on this page is measured."
      />
      <Tabs value={state.archTab} onValueChange={(value) => updateView((s) => { s.archTab = value as ArchTab; })} className="gap-4">
        <TabsList variant="pill" aria-label="Architecture view" className="max-w-full flex-wrap justify-start group-data-[orientation=horizontal]/tabs:h-auto">
          <TabsTrigger value="layers" data-testid="arch-tab-layers">Layer map</TabsTrigger>
          <TabsTrigger value="attention" data-testid="arch-tab-attention">Attention &amp; KV</TabsTrigger>
          <TabsTrigger value="experts" data-testid="arch-tab-experts">Experts &amp; parameters</TabsTrigger>
        </TabsList>
        <TabsContent value="layers">
          <Panel
            title="Layer map"
            description="One row per model, grouped by publisher in catalog order. Hover a layer for its kind; select a row for details. Order provenance is stated beside each summary."
            bodyClassName="p-3 sm:p-4"
          >
            <LayerMap entries={entries} onOpen={onOpen} />
          </Panel>
        </TabsContent>
        <TabsContent value="attention"><AttentionTable entries={entries} onOpen={onOpen} /></TabsContent>
        <TabsContent value="experts"><ExpertsTable entries={entries} onOpen={onOpen} /></TabsContent>
      </Tabs>
      <ArchitectureSheet
        entry={open}
        enginePair={open ? pairs.some((pair) => pair.vllm.modelId === open.model.id) : false}
        onClose={() => updateView((s) => { s.model = "all"; })}
      />
    </div>
  );
}
