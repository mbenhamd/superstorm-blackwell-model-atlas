---
name: interface-review
description: Audit and improve all benchmark-dashboard routes, accessibility, responsive behavior, and visual consistency.
---

# Interface Review

Read DESIGN.md. It takes precedence over the generic `frontend-design` skill: DESIGN.md first, then AGENTS.md, then `frontend-design` only on axes DESIGN.md leaves free (for example new empty-state or error copy).

Component fit: for each card, chart or table, ask whether a dashboardcn block or primitive (live catalog at https://dashboardcn.com/explore) carries the encoding better than the current one. Follow `dashboardcn-bench` for the choice, the install with `scripts/dashboardcn-add.ts`, and the console adaptations.

Use one reusable browser session. Open all eleven routes at 1440×900 and 390×844, light and dark:

- tldr
- intelligence
- throughput: tabs Overview (default, no `tab` parameter) and Configuration (`tab=configuration`)
- compare
- engine
- models: Overview and Precision tabs on a model detail, `models?model=<id>&tab=overview|precision`
- architecture: tabs Layer map (default, no `tab` parameter), Attention & KV (`tab=attention`) and Experts & parameters (`tab=experts`); the sheet with `model=<id>`
- deployments
- published
- new-benchmark
- methodology: Definitions tabs Performance / Intelligence / Comparability / Pipeline, page-local

Open the legacy aliases from `src/client/state.ts`. Each must canonicalize the URL (history.replaceState):

- overview → tldr
- intelligence-vs-throughput → intelligence
- sustainable-throughput → throughput
- compare-benchmarks, compare-runs → compare
- versus, runtimes, engines, models?tab=engines → engine (keeps `model`)
- quant, quantization → models?model=qwen3.8-27b&tab=precision
- hardware → deployments
- experiments → new-benchmark

Exercise:

- **Search and filters:** Deployments search (`q`), facets, column sort and zero-result state; Models text filter; ⌘K word-prefix search.
- **TL;DR:** model combobox and GPU-shape select (`model`, `shape` in the URL). The TL;DR has no sort, filter chips, winner list or champions; they must stay absent.
- **TL;DR setup sheet:** opening a row's sheet. Check:
  - focus moves in and returns to the row on close;
  - KPI rings show "—" and an empty ring for missing values;
  - "Across workloads" switches the dataset and keeps the sheet open;
  - runs show load curves;
  - published (external) cards are present.
- **Throughput:**
  - tabs and the KPI strip;
  - the Total / In-out chart toggle;
  - SLO budget rings;
  - the External curves toggle;
  - runtime versions and "Compare top 2 versions" (`overlay=versions`).
- **Engine:**
  - matchup and its ⓘ tip;
  - per-workload verdicts with grouped bars;
  - Every measured version;
  - Published vLLM vs SGLang GPU-class selector (B300 first, one chart at a time).
- **Architecture:** layer-map cell tooltips and arrow keys on a row name, row click or Enter opens the sheet (`model` in the URL, focus returns on close), tabs in the URL, the TL;DR "Architecture" link; at 390 the strips fit without horizontal scroll; "—" (never 0) for unrecorded parameters and KV.
- **Published:** filters (repeated URL keys `model`, `hw`, `engine`, `version`, `evidence`, `flag`, `noflag`, `kind`, `weak`), share cards, coverage heatmap cell selection, records paging, sort and row expansion at 1440 and 390.
- **Shared components:**
  - Compare selection and mixed-cohort guard;
  - SLO popover, including the margin slider;
  - workload reference dialog;
  - evidence sheet;
  - chart Expand / Download PNG / Copy image (⋯ below 640px);
  - CSV/JSON exports;
  - experiment creation and moves, including the keyboard "Move to";
  - mobile menu;
  - theme toggle.

Rings and load curves must carry only bounded or ordered quantities with a text value beside them, never a time trend. Fewer than two levels reads "—".

Check document overflow and focus order. Inspect screenshots instead of relying only on DOM counts. Preserve data semantics while improving hierarchy and spacing. Fix common components rather than patching every screen separately.

Run `bun run build`, `bun run test:browser` and `bun run screenshots`. The screenshots script captures 13 route states at 1440 light and dark plus 390 light. It writes to `$SCREENSHOT_DIR` or the OS temp folder and refuses any path inside the parent atlas repository. Check 390 dark, the open TL;DR setup sheet and an expanded Published row by hand. Update docs/VERIFICATION.md.
