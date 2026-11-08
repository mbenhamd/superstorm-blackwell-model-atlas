import * as React from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../components/app/primitives.js";
import { PublishedCoverage, coverageColumns } from "../components/app/published-coverage.js";
import { EMPTY_FILTERS, applyFilters, filterParams, isFiltered, parseFilters, type PublishedFilters } from "../components/app/published-data.js";
import { PublishedFilterBar } from "../components/app/published-filters.js";
import { PublishedRecords } from "../components/app/published-records.js";
import { PublishedShares } from "../components/app/published-shares.js";
import { externalDataset } from "../lib/external.js";
import { appState, navigate, useAppState } from "../state.js";

/**
 * Published: explorer of external published results (evidence class "external": third-party, engine-project and
 * vendor benchmarks). Filters → shares of the filtered records (allocation cards) → coverage heatmap (models × GPU, cell = ladders) → record list with in-place ladder
 * charts. Nothing here is ranked against measured runs, and no SLO, C_max or sustainable rate is computed.
 *
 * Filters live in the URL (`#/published?model=kimi-k3&hw=B300&engine=vllm&version=stable&evidence=…&flag=…&noflag=…
 * &kind=ladder&weak=1`; repeated keys for several values). They are written with history.replaceState by this page:
 * state.ts syncUrl keeps them on a global view update (e.g. the workload select) and only refreshes `workload`.
 */
function readFilters(): PublishedFilters {
  const data = externalDataset();
  const query = location.hash.split("?")[1] ?? "";
  return parseFilters(new URLSearchParams(query), data.records, new Set(appState.snapshot.models.map((model) => model.id)));
}
function writeFilters(filters: PublishedFilters): void {
  const search = new URLSearchParams({ workload: appState.workload });
  for (const [key, value] of filterParams(filters)) search.append(key, value);
  history.replaceState(null, "", `#/published?${search}`);
}

export function PublishedPage() {
  useAppState();
  const data = externalDataset();
  const [filters, setFilters] = React.useState<PublishedFilters>(readFilters);
  React.useEffect(() => {
    // Links into the page while it is open (⌘K, another page's "published" link) arrive as a hash change.
    const onHash = () => { if (/^#\/published\b/.test(location.hash)) setFilters(readFilters()); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const change = (next: PublishedFilters) => { setFilters(next); writeFilters(next); };
  const reset = () => change({ ...EMPTY_FILTERS, weak: filters.weak });
  const columns = React.useMemo(() => coverageColumns(data.records), [data]);
  const visible = React.useMemo(() => applyFilters(data.records, filters), [data, filters]);
  const coverage = React.useMemo(() => applyFilters(data.records, { ...filters, model: "", hardware: [] }), [data, filters]);
  const ladders = data.records.filter((record) => record.kind === "ladder").length;
  return (
    <div className="space-y-4" data-testid="published-page">
      <PageHeader
        title="Published results"
        description={<span data-testid="published-meta">{data.records.length} external records ({ladders} concurrency ladders, {data.records.length - ladders} points) from {Object.keys(data.sources).length} sources, retrieved {data.retrievedOn}. Published by others and not measured here: never ranked against measured runs, no SLO applied.</span>}
        actions={<Button variant="outline" size="sm" onClick={() => navigate("methodology")} data-testid="published-methodology"><BookOpen aria-hidden="true" />How external data is handled</Button>}
      />
      <PublishedFilterBar records={data.records} filters={filters} onChange={change} columns={columns} />
      <PublishedShares records={visible} />
      <PublishedCoverage
        records={coverage}
        columns={columns}
        selected={{ model: filters.model, hardware: filters.hardware }}
        onSelect={(model, hardware) => change({ ...filters, model, hardware: [hardware] })}
        onClear={() => change({ ...filters, model: "", hardware: [] })}
      />
      <PublishedRecords records={visible} total={data.records.length} onReset={reset} filtered={isFiltered(filters)} />
    </div>
  );
}
