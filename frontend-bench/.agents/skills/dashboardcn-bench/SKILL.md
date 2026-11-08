---
name: dashboardcn-bench
description: How Bench Console finds, installs and adapts dashboardcn components and blocks. Use before building or reworking any card, chart, KPI row, gauge, table or page section in frontend-bench, and whenever a request mentions dashboardcn, a block, a component from dashboardcn.com, or "make better use of the components".
---

# dashboardcn in Bench Console

dashboardcn is an MIT shadcn registry of dashboard components (primitives) and blocks (composed cards). Bench Console is built on it (ADR 0005). The vendored upstream skill `.agents/skills/dashboardcn/` (catalog, data conventions, props in `references/api.md`) explains the library. This skill states how this repository uses it. Precedence: DESIGN.md, then AGENTS.md and `benchmark-integrity`, then this skill, then the upstream skill.

## 1. Check the current catalog first (it changes)

The registry is not versioned, and new items appear between sessions. Before choosing a component, fetch the live sources rather than relying on the list below:

| Source | Use |
| --- | --- |
| https://dashboardcn.com/explore | Every block as a live preview, to compare shapes visually |
| https://dashboardcn.com/llms.txt | Index of every component and block with one-line purpose |
| `https://dashboardcn.com/docs/components/<name>.md`, `https://dashboardcn.com/docs/blocks/<name>.md` | Props, examples and source for one item, as Markdown |
| https://dashboardcn.com/r/registry.json | Machine index: every item, its files and dependencies |
| `https://dashboardcn.com/r/<name>.json` | The item itself (what the install script reads) |
| https://dashboardcn.com/llms-full.txt | Everything, including all component source (large) |
| https://github.com/NoahGdev/dashboardcn | Source, issues, the upstream skill (`skills/dashboardcn/`) |

When the upstream skill changes, refresh `.agents/skills/dashboardcn/` from the repository unmodified and update the commit in NOTICE.md.

## 2. Pick: block first, then primitive, then custom

1. Name the job: one number, a row of numbers, part of a whole, progress against a limit, a distribution, a ranking, a trend over concurrency, a table.
2. Look for a block on /explore whose layout matches. Use a block when it fits; when it is close, edit it after install rather than wrapping it.
3. Otherwise compose primitives (`composed-chart`, `bar-list`, `distribution-bar`, `tick-bar`, `segmented-meter`, `radial-gauge`, `data-table`, `metric-value`, ...).
4. Write a custom component only when no item can carry the encoding, for example the Architecture layer strips. Even then, reuse `card`, `tooltip`, `metric-value` and the tokens.

## 3. Install without clobbering local edits

The shadcn CLI rewrites every file an item bundles, including primitives this project edits in place (`card`, `tabs`, `tooltip`, `delta-badge`, `metric-value`, `composed-chart`, ...). Use the project script:

```bash
bun scripts/dashboardcn-add.ts <name...> --dry-run   # plan: + new, = identical, ~ kept local (upstream copy in the temp dir)
bun scripts/dashboardcn-add.ts <name...>             # writes only new files, remaps @/registry/dashboardcn/* imports
```

Layout: primitives go in `src/client/components/ui/`, blocks in `src/client/components/blocks/` (this project's choice; upstream puts blocks in `components/`), and `format.ts` in `src/client/lib/`. The script lists missing shadcn primitives and npm packages but does not install them. Add those with `bunx shadcn@latest add <primitive>` (only for primitives that do not exist locally) and `bun add <pkg>`, and commit `bun.lock`. To take an upstream fix into a file marked `~`, merge it by hand from the saved copy, keeping the local edits. Never run `bunx shadcn@latest add @dashboardcn/<block>` for a block that bundles an existing primitive.

## 4. Adapt to the console (required after every install)

- **Numbers.** KPI values show full numbers (`compactFrom={Infinity}` on `MetricValue`, e.g. 2,882,918, not 2.9M). Compact notation is for axis ticks and dense chart labels only. Missing values render "—" through the console's `Missing`/`num` helpers, never 0 or an empty bar.
- **Deltas.** dashboardcn deltas are fractions (`0.124` → +12.4%). Δ vs best or vs the previous run uses `relativeDelta`. Latency, errors and TTFT are "down is good" (`invertDelta`). Within the ±3% tie band, show "tie", not a coloured delta.
- **Charts.** One y-axis per chart: never use `composed-chart`'s right axis. Load and sweep charts are by concurrency, never time, so the time-based `period-tabs`, `trend-chart` and "vs previous period" wording do not apply unless the x-axis really is run date. Rings, gauges and tick bars only show bounded fractions (levels passing / total, latency / ceiling, active / total params).
- **Colour.** Series colours come from `--chart-1`..`--chart-5`. Status colours (`--good`, `--warning`, `--critical`) are only for SLO pass/fail and quality flags, with an icon or label. Text never wears a series colour.
- **Remove demo furniture:** avatar stacks, currency, "More" menus that do nothing, invented sample data, gradients and brand marks. Every visible number must come from the snapshot, with its provenance (measured run, catalog configuration, external publisher) stated as `benchmark-integrity` requires; external data is never ranked against measured data.
- **Accessibility.** Each chart or ring gets `role="img"` and an `aria-label` with the actual values; interactive pieces stay keyboard-reachable; check 390 px and dark mode.
- **Tests and docs.** Add a browser assertion for the new element (`data-testid`), mention the component in DESIGN.md where the page is described, then run the gates in `bun-quality-gates`.

## 5. Inventory (8 November 2026; check `src/client/components/` for the current state)

Installed and in use. Primitives: activity-rings, command-palette, composed-chart, data-table, delta-badge, distribution-bar, dot-plot, heatmap-chart, kpi-card, metric-list, metric-value, period-tabs, radar-chart, radial-gauge, scatter-chart, sparkline, tick-bar, timeline. Blocks: activity-rings-card, allocation-card, data-table-card, dual-metric-card, kpi-row-card, ring-kpi-card, score-gauge-card.

Not installed, with candidate uses that respect the rules above. These are candidates to evaluate, not decisions:

| Item | Candidate use in the console |
| --- | --- |
| `goal-chart-card` / `bar-chart` | ITL or TTFT p95 per concurrency level against the SLO ceiling as the dashed goal line; bars within the ceiling are coloured as passing |
| `segmented-meter` | A latency budget: zones up to the ceiling, with a marker at the measured p95 (Glance, setup sheet) |
| `bar-list` | Ranked lists within one population: setups on a workload (measured only), or external records within the Published layer |
| `tick-kpi-card` | "7 of 8 levels inside the SLO", "n of N setups measured" |
| `breakdown-card` / `distribution-card` | Part of a whole: token mix (input vs output), mixer kinds per model on Architecture, active vs total parameters |
| `stage-bars-card` / `funnel-chart` | Request accounting per run: sent → completed → inside the SLO, only if the run records those counts |
| `metric-tabs-chart-card` | Throughput metric switcher (tok/s/GPU, ITL, TTFT by concurrency), with "previous period" replaced by "previous run" or removed |
| `trend-chart` | Sustainable value across run dates of one configuration (x is run date, the one legitimate time axis) |
| `insight-card` | One plain-language verdict for a page (Engine matchup), never a vendor claim |
| `donut-chart`, `sankey-chart`, `corner-frame`, `payment-summary-card`, `revenue-ring-card`, `balance-chart-card`, `contributions-card`, `activity-heatmap` | No current fit; prefer `distribution-bar` over a donut for part of a whole |
