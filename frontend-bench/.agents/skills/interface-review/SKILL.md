---
name: interface-review
description: Audit and improve all benchmark-dashboard routes, accessibility, responsive behavior, and visual consistency.
---

# Interface Review

Read DESIGN.md. Use one reusable browser session. Open all nine routes (tldr, intelligence, throughput with Overview/Configuration tabs, compare, engine, models with Overview/Precision tabs, deployments, new-benchmark, methodology) and the legacy aliases from `src/client/state.ts` (overview → tldr, intelligence-vs-throughput, sustainable-throughput, compare-benchmarks/compare-runs, versus/runtimes/engines and models?tab=engines → engine, quant/quantization → models precision, hardware → deployments, experiments → new-benchmark) at 1440×900 and 390×844, light and dark. Exercise search, faceted filters, zero-result states, sorting, compare selection, mixed-cohort guard, SLO popover, workload reference dialog, evidence sheet, chart expand / PNG download / copy image, exports, experiment creation and moves, mobile menu, ⌘K command menu and the theme toggle. Check document overflow and focus order. Inspect screenshots instead of relying only on DOM counts. Preserve data semantics while improving hierarchy and spacing. Fix common components rather than patching every screen separately. Run bun run build, bun run test:browser and bun run screenshots (written outside the repository to $SCREENSHOT_DIR; the script refuses an in-repository path), and update docs/VERIFICATION.md.
