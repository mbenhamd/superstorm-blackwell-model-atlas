# Sources and provenance

Reference date: 7 November 2026. These are design and implementation references, not benchmark data sources.

| Reference | Use and boundary |
| --- | --- |
| https://github.com/voltagent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md | Public Linear design-language analysis (also shown at https://www.shadcn.io/design/linear). Source of the lavender accent, surface ladder, hairlines, radii and type tracking adapted in DESIGN.md. No Linear assets bundled. |
| https://dashboardcn.com/explore and registry `https://dashboardcn.com/r/{name}.json` | Installed via the shadcn CLI and edited in place. Components in `components/ui`, all imported by the app: data-table, scatter-chart, composed-chart, heatmap-chart, radar-chart, tick-bar, distribution-bar, timeline, metric-value, command-palette, delta-badge, kpi-card, sparkline, dot-plot, radial-gauge, metric-list, period-tabs. Blocks in `components/blocks`, all imported: score-gauge-card, data-table-card, dual-metric-card, kpi-row-card. Installed but unused files (bar-list, segmented-meter, corner-frame, trend-chart, progress-card, tick-kpi-card) were removed on 7 November 2026. |
| https://ui.shadcn.com | shadcn/ui primitives (new-york style, Radix) installed via CLI and edited in place. |
| https://github.com/google-labs-code/design.md | DESIGN.md alpha format; `bunx @google/design.md lint DESIGN.md`. |
| https://bun.com/docs/bundler | `Bun.build`, used with `bun-plugin-tailwind`. |
| https://tailwindcss.com/docs | Tailwind CSS v4 `@theme inline`, custom variants. |
| https://recharts.org | Recharts 3 chart primitives and axis hooks used by the edited chart components. |
| https://effect.website/docs | Effect 4 service and layer conventions (server). |
| https://node-postgres.com | Parameterized queries and transactions (server). |

Workflow references supplied by the user were reviewed visually; they are not stored in this repository.

Catalog data is pinned from the parent research atlas by `scripts/import-atlas.ts` into `src/data/atlas.json` (commit and as-of date recorded in the file). Hugging Face card tables are extracted verbatim into `data/hf-card-benchmarks.json` with line ranges and settings. Artificial Analysis Intelligence Index v5.0.1 records come from the atlas `catalog/aa-intelligence-index.json` (version rechecked live on 2026-11-07). No benchmark result ships with the console; `tests/fixtures/sample-runs.json` is invented TEST data for automated tests only.

Benchmark descriptions on the Intelligence page summarise Artificial Analysis's Intelligence Benchmarking methodology page (https://artificialanalysis.ai/methodology/intelligence-benchmarking, v5.0.1, retrieved 2026-11-07); weights and scoring rules come from the atlas `catalog/aa-intelligence-index.json` (source ID AA-II-METHOD).
