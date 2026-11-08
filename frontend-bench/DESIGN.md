---
version: alpha
name: Bench Console — Linear-derived Instrument
description: "Bench Console is an LLM-serving benchmark console. Its visual system adapts the public Linear DESIGN.md analysis (voltagent/awesome-design-md): one lavender-blue accent (#5e6ad2) used only for the brand dot, primary actions, focus and links; a surface ladder with 1px hairlines instead of shadows; Inter / SF Pro with negative display tracking. Light is the default product theme; dark follows Linear's near-black canvas. It is an original interface, not a Linear product or asset."

colors:
  primary: "#5e6ad2"
  on-primary: "#ffffff"
  primary-hover: "#4f5bc4"
  primary-hover-dark: "#828fff"
  focus: "#5e69d1"
  link: "#4b57c2"
  link-dark: "#828fff"
  frame: "#f5f6f6"
  canvas: "#ffffff"
  panel: "#ffffff"
  subtle: "#f9f9fa"
  muted: "#f1f2f3"
  ink: "#08090a"
  ink-muted: "#3c4149"
  ink-subtle: "#62666d"
  hairline: "#e6e7e9"
  hairline-strong: "#d6d8dc"
  dark-frame: "#010102"
  dark-canvas: "#0f1011"
  dark-panel: "#141516"
  dark-popover: "#18191a"
  dark-muted: "#191a1b"
  dark-ink: "#f7f8f8"
  dark-ink-muted: "#d0d6e0"
  dark-ink-subtle: "#8a8f98"
  dark-hairline: "#23252a"
  dark-hairline-strong: "#34343a"
  good: "#27a644"
  good-text: "#1d7a33"
  warning: "#e5a50a"
  warning-text: "#8a5e00"
  critical: "#d23c3c"
  critical-text: "#b42f2f"
  chart-1: "#5e6ad2"
  chart-2: "#e5793a"
  chart-3: "#26a68e"
  chart-4: "#b38600"
  chart-neutral: "#8a8f98"
  chart-grid: "#eceef0"
  chart-axis: "#d6d8dc"
  dark-good-text: "#4cc767"
  dark-warning: "#f2c94c"
  dark-critical-text: "#ff7a7a"
  dark-chart-1: "#7c87e8"
  dark-chart-2: "#f0894c"
  dark-chart-3: "#3cc0a6"
  dark-chart-4: "#cc8f1a"
  dark-chart-neutral: "#6b6f78"
  dark-chart-grid: "#1f2023"
  dark-chart-axis: "#34343a"

typography:
  page-title:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.4px
  metric:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.27
    letterSpacing: -0.5px
  panel-title:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  table:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  eyebrow:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.4px
  button:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.2
  mono:
    fontFamily: JetBrains Mono
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 1.6

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 32px
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 32px
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 16px
  canvas:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  sidebar:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.ink-muted}"
    width: 220px
  top-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    height: 48px
  tab-pill:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 32px
  status-pill:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
  tag-chip:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
  table-row:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.table}"
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-primary-hover-dark:
    backgroundColor: "{colors.primary-hover-dark}"
    textColor: "{colors.dark-frame}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.on-primary}"
  link:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.link}"
  link-dark:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.link-dark}"
  panel-subtle:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ink-subtle}"
  divider:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.ink}"
  divider-strong:
    backgroundColor: "{colors.hairline-strong}"
    textColor: "{colors.ink}"
  status-good:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.good-text}"
  status-good-dot:
    backgroundColor: "{colors.good}"
    textColor: "{colors.ink}"
  status-warning:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.warning-text}"
  status-warning-dot:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.ink}"
  status-critical:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.critical-text}"
  status-critical-dot:
    backgroundColor: "{colors.critical}"
    textColor: "{colors.on-primary}"
  chart-series-1:
    backgroundColor: "{colors.chart-1}"
    textColor: "{colors.on-primary}"
  chart-series-2:
    backgroundColor: "{colors.chart-2}"
    textColor: "{colors.ink}"
  chart-series-3:
    backgroundColor: "{colors.chart-3}"
    textColor: "{colors.ink}"
  chart-series-4:
    backgroundColor: "{colors.chart-4}"
    textColor: "{colors.ink}"
  chart-neutral-point:
    backgroundColor: "{colors.chart-neutral}"
    textColor: "{colors.ink}"
  chart-plot:
    backgroundColor: "{colors.chart-grid}"
    textColor: "{colors.ink}"
  chart-axis-line:
    backgroundColor: "{colors.chart-axis}"
    textColor: "{colors.ink}"
  panel-dark:
    backgroundColor: "{colors.dark-panel}"
    textColor: "{colors.dark-ink}"
  canvas-dark:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-ink-muted}"
  sidebar-dark:
    backgroundColor: "{colors.dark-frame}"
    textColor: "{colors.dark-ink-subtle}"
  popover-dark:
    backgroundColor: "{colors.dark-popover}"
    textColor: "{colors.dark-ink}"
  tag-chip-dark:
    backgroundColor: "{colors.dark-muted}"
    textColor: "{colors.dark-ink-muted}"
  divider-dark:
    backgroundColor: "{colors.dark-hairline}"
    textColor: "{colors.dark-ink}"
  divider-strong-dark:
    backgroundColor: "{colors.dark-hairline-strong}"
    textColor: "{colors.dark-ink}"
  status-good-dark:
    backgroundColor: "{colors.dark-panel}"
    textColor: "{colors.dark-good-text}"
  status-warning-dark:
    backgroundColor: "{colors.dark-panel}"
    textColor: "{colors.dark-warning}"
  status-critical-dark:
    backgroundColor: "{colors.dark-panel}"
    textColor: "{colors.dark-critical-text}"
  chart-series-1-dark:
    backgroundColor: "{colors.dark-chart-1}"
    textColor: "{colors.dark-frame}"
  chart-series-2-dark:
    backgroundColor: "{colors.dark-chart-2}"
    textColor: "{colors.dark-frame}"
  chart-series-3-dark:
    backgroundColor: "{colors.dark-chart-3}"
    textColor: "{colors.dark-frame}"
  chart-series-4-dark:
    backgroundColor: "{colors.dark-chart-4}"
    textColor: "{colors.dark-frame}"
  chart-neutral-point-dark:
    backgroundColor: "{colors.dark-chart-neutral}"
    textColor: "{colors.dark-ink}"
  chart-plot-dark:
    backgroundColor: "{colors.dark-chart-grid}"
    textColor: "{colors.dark-ink}"
  chart-axis-line-dark:
    backgroundColor: "{colors.dark-chart-axis}"
    textColor: "{colors.dark-ink}"
---

## Overview

Bench Console compares LLM-serving configurations (model, precision, engine, GPU topology) on quality and SLO-bounded throughput. The interface is dense and technical; the data is the protagonist and the chrome stays monochrome. The system adapts the public Linear DESIGN.md analysis: one lavender-blue accent, a surface ladder separated by 1px hairlines, negative tracking on display type and no decorative gradients.

Layout: a 220px sidebar on the frame colour, and an inset canvas (8px from the viewport edges, 12px corners, hairline outline) holding a translucent sticky top bar and the page. Below 900px the sidebar becomes a sheet and the canvas fills the viewport.

## Colors

- **Lavender (`primary` #5e6ad2)** is scarce: brand dot, primary button, focus ring, links, the first chart series, inline data bars, the Candidate status dot, the best-setup bar and load curve, and the hero sustainable value in the Throughput KPI strip. It is never a panel fill.
- **Surface ladder.** Light: frame #f5f6f6 → canvas #ffffff → panel #ffffff with hairline #e6e7e9 → subtle #f9f9fa. Dark: frame #010102 → canvas #0f1011 → panel #141516 → popover #18191a, hairline #23252a.
- **Ink.** ink, ink-muted and ink-subtle carry hierarchy. `ink-subtle` (#62666d light, #8a8f98 dark) meets 4.5:1 on canvas and frame.
- **Status** colours (good, warning, critical) appear only for real states: SLO pass/fail, validation errors, failed levels.
- **Charts.** Categorical slots in order: lavender, orange, teal, amber (light `chart-1..4`, dark `dark-chart-1..4`). Non-frontier points use `chart-neutral`; grid lines use `chart-grid`, axes `chart-axis`. Dark amber (`dark-chart-4` #cc8f1a) is deliberately distinct from the dark warning colour (#f2c94c) so a fourth series never reads as a warning. Light status: good #27a644 / text #1d7a33, warning #e5a50a / #8a5e00, critical #d23c3c / #b42f2f; dark status text: good #4cc767, warning #f2c94c, critical #ff7a7a.

## Typography

Inter (fallback SF Pro Display / system UI); JetBrains Mono for IDs, revisions and commands, with system mono fallbacks so the offline `preview.html` needs no web fonts. Body text is 13px; page titles are 20px/600 with −0.4px tracking; metric values 22px. Group labels in the sidebar use the eyebrow style (+0.4px tracking, sentence case). Tabular figures are applied per element (`tabular-nums`) on numeric cells, badges and values; the body leaves them off. Micro sizes (10–11.5px) are used for badges, nav tags (e.g. the "Decision" tag, 10px uppercase with 0.06em tracking) and secondary meta lines, never for a primary value.

## Layout

Content max width 1320px inside the canvas, 32px side padding on desktop and 16px on phones. Metric strips are one 12px-radius container divided by hairlines into 2 columns (phone) and 3/4/5 columns from 1024px; values carry no decorative icons, only real meters (quality / 100, evaluated / total). Chart rows are two columns from 1280px (xl) and one column below; wide tables switch to stacked cards below 768px. No horizontal document scroll at 390px; wide tables scroll inside their panel.

## Elevation & Depth

Depth comes from the surface ladder and hairlines. Panels and cards (including KPI, stat and score cards) carry no drop shadow in dark mode (only a faint top-edge highlight) and a 1px near-invisible shadow in light mode (`shadow-panel`; the shadcn `Card` base uses it too). Panel titles use the 13px/600 panel-title style; dashboardcn cards keep their own title sizes (allocation and dual-metric 14px; activity rings 16px unless a page overrides it). Toasts, the compare tray and chart tooltips use `shadow-float`; popovers, menus and selects `shadow-md`; dialogs and sheets `shadow-lg`; the command palette `shadow-2xl`. No gradients, no glow.

## Shapes

Buttons and inputs 8px; panels and metric cards 12px (the shadcn `Card` base is 16px; ring KPI and allocation cards are set to 12px where used, dual-metric cards keep 16px); the inset canvas 12px; tag chips (precision, IDs) 4px; status pills and tab pills fully rounded. Desktop controls are 28–32px high (Linear density); the shadcn `Input` default (36px) remains in the experiment dialog. Touch-specific 44px targets are not yet implemented; this is a known gap.

## Components

- **Top bar:** workload `Select` with an About-workloads info button, SLO popover trigger (a separate pill) on the left; provenance badge "Catalog <date> · HF + AA · N runs" (" (TEST)" with fixtures; from 640px; links to Methodology) and light/dark toggle on the right. No search field; the command menu opens with ⌘K / Ctrl+K.
- **Tabs:** pill tabs (selected = muted surface lift).
- **Chart panels:** header actions Expand (dialog with a taller plot), Download PNG and Copy image; below 640px they collapse into one overflow (⋯) button on the title row (no Expand). Exported PNGs carry a "Bench Console · captured <date> · catalog <date>" footer, plus a TEST DATA label when fixture runs are loaded (the evidence class is not drawn); the HTML legend is not yet drawn into the PNG. Scatter labels are placed by scoring candidate positions against markers, other labels and the frontier polyline. Compare shows one shared series/SLO key above its four sweep charts and a full-width Throughput vs interactivity chart.
- **Sidebar:** Analyze group (TL;DR, Intelligence, Throughput, Compare, Engine, Models, Deployments, Published), Plan group (New benchmark), Methodology pinned to the bottom.
- **Planning board:** with no experiment, one centred empty state ("No planned runs" + New experiment) replaces the week strip and the board. Otherwise five fixed columns inside a horizontally scrolling container with an edge fade from 768px, and one stacked list grouped by status below it; each card has a "…" menu with a keyboard-accessible "Move to" submenu in addition to drag and drop.
- **Tables:** sentence-case 12px headers, 40px rows, right-aligned numbers with units in headers, inline lavender data bars for SLO capacity, row "…" menu. Tables grow with the page (no nested fixed-height scroll area). Metric columns that are "—" in every row collapse into one "Metrics · not measured" column, and the freed width goes to the name. Below 768px a wide table renders each row as a stacked card (line 1 name and status, line 2 engine build and shape, line 3 the metric or "—", chips on their own wrapping line); chips are never clipped mid-word.
- **Status badge:** one shared component and palette on every page: Candidate = accent dot, Probe = warning dot.
- **TL;DR setups table:** answers one question, "which setup of this model sustains the most, and how far behind are the others?". One control row (model combobox grouped by publisher, GPU shape select with "All shapes"; both in the URL as `model` and `shape`), then one table (header actions Compare top 3 and Export): rows ranked by sustainable tok/min/GPU, highest first; setups never run on the active dataset fold into one "N setups not measured on <dataset>" row that expands them last (with nothing measured, every row stays visible and the metric columns collapse into one). Columns: rank · setup (knob plus the chips that tell sibling variants apart; precision, status and "N published" badges) · engine (the release that ran, e.g. "vLLM v0.33.0", or the configured build in muted text) · load curve (≥ 1024 px) · sustainable (value + bar scaled to the best, best in accent) · Δ vs best (±3 % tie badge) · C_max · chevron. The header counts setups, measured, and those inside the SLO when they differ. Rows are compact (≤ 56 px) and carry no runs, latencies or published values. The whole row and its setup name open the setup sheet (right side, `sm:max-w-[540px]`, full width on phones; focus moves to the sheet, returns to the row on close). The sheet leads with the decision numbers as four ring KPIs in a 2 × 2 grid, also at 390 px (a planning note replaces them when not measured), then facts, "Across workloads" (the same setup's rank, value and Δ on every dataset; another dataset is one click and keeps the sheet open; a configuration measured there only with another runtime config is flagged "other runtime config"), knobs, runs, published (external) cards and the configured command (titled "Configured command (catalog)", with the run's recorded overrides listed under it); actions sit in the footer. Phones: the engine folds into the setup cell, C_max is hidden, Δ sits under the value; no horizontal scroll. Summary blocks (winner list, export × engine matrix, champions by workload, published block, filter chips, sort) were removed from the TL;DR in favour of this table plus sheet; finer comparisons live on Throughput, Compare, Engine and Published.
- **Variant ladder (Model detail):** while no configuration of the family is measured, one summary block per export (export, repository, weights, card Δ, "n configs · vLLM/SGLang") with its rows as stacked cards in a native disclosure; the per-row table appears once a row is measured (768px and up). Model detail shows this ladder as its only configuration list; each row carries a one-click Throughput link beside the compare toggle, and the page header's primary action "Compare all setups" opens `#/tldr?model=<id>`.
- **Glance components (dashboardcn):** rings and sparklines carry only bounded or ordered quantities, always with a text value beside them. Rings: share of the best setup, SLO levels passing, ITL/TTFT p95 at C_max as a share of the SLO ceiling (setup sheet `ring-kpi-card`; Throughput "SLO budget used at C_max" `activity-rings-card`). Load curves (`sparkline`, no animation): x = tested concurrency ascending, y = total tok/s per GPU, never a time trend; brand hue for the best setup, neutral otherwise; fewer than two levels reads "—". Brand hue marks the best setup (TL;DR, setup sheet) or the run shown (Throughput Runtime versions); Deployments, Engine and published rows stay neutral. They sit in the TL;DR table (≥ 1024 px), the setup sheet's runs, Runtime versions (Throughput), Every measured version (Engine), Deployments and published ladder rows; published rows plot the published output tok/s/GPU. Published shows four `allocation-card` shares of the filtered records (stable engine release, B300, no caveat flag, ladders), two per row on phones.
- **Engine page density:** explanations sit behind ⓘ info tips (matchup controls and tie band, per-workload verdict rules, version Δ rule, published-ladder caveats); notes are one line. Unmeasured matchup cards drop the bar, the not-measured chart frames are not rendered, and Published vLLM vs SGLang shows one GPU class at a time (selector with ladder counts, B300 first) with the chart and its legend side by side at ≥ 1024 px.
- **Fewer clicks to quant throughput:** the Throughput selector row is Base model · Runtime (engine and configured build, never the run version) · Hardware (GPUs and parallel shape) · Runtime config · Run; Workloads and Add to compare are visible buttons in the page header (the selector row stays one line at 1440; below 640px Runtime and Hardware stack full width so labels never truncate); Serve command is a visible toggle on the identity line, and only Evidence and Plan run sit in the page's overflow menu. The Runtime config picker lists the chosen model's setups for that runtime and hardware, grouped by weights export ("<model> · <export>"): one option per measured variant on the dataset (recorded runtime_config; full knob string, run count, "best of N runtimes", the best run's sustainable tok/min/GPU; picking it shows that best run) and one "not measured" option per unmeasured setup, with a check on the current one; the identity line does not repeat the knob chips, and its warning badges are grouped with the run tag; changing a picker keeps the current export and knob when a matching setup exists. Options wrap the knob string and keep run count and sustainable tok/min/GPU in a right-aligned column that never truncates; the popover is at least min(500px, viewport − 32px) wide and the closed trigger wraps its knob line instead of cutting it. The Run picker (date · dataset) appears whenever the configuration has at least one run. The Serve command panel is titled "Configured command (catalog)"; when the run's recorded runtime_config contradicts an explicit value of that command, a note lists the recorded values (e.g. "kv_cache_dtype fp8, max_num_seqs 256") with a link to the Configuration tab. Offline, GPU totals state the catalog shape at one KServe replica ("8 GPUs per replica · 8 GPUs total (1 replica)"). Another model's quant is two picks away (Base model, then Runtime config) or one ⌘K search; an "All setups" link (named for the model in its accessible label) returns to the TL;DR. Deployments shows a Precision column by default. The command menu lists "Compare setups: <model>" for every model.
- **Throughput overview:** a KPI strip under the identity line (SLO chip, workload profile badge, "<in> in / <out> out", TTFT and ITL ceilings — measured state "(computed from measured prompt length)", offline "nominal" —; incomplete and errored request badges sit once on the identity line, not in the strip; an inline Classic / Low-latency / Frontier switch (the thresholds are stated once, in the strip header; the top bar owns the full SLO popover); C_max with "n of N measured levels in SLO", sustainable tok/min/GPU as the hero, per-user median with ITL p50 / p95, deployment-wide rates). Per-user p95 and request-rate p50 / p95 are named as missing ("per-user p95 —", "req/s p50 / p95 —", with a tooltip) in their cells (the imported runs do not carry them), never replaced by another metric. Profile strip (directly under the KPI strip; at ≥1280px its heading "By workload profile" sits beside the tiles so the strip stays one tile high and the first SLO evaluation row ends inside the first viewport at 1440×900): compact two-line tiles, one per measured dataset of the configuration, the current one highlighted, "×n vs Balanced" only between two measured values; the Balanced / Decode-intensive / Prefill-intensive label compares the dataset's input:output ratio with 16:1 (a console rule, stated in its tooltip). The total throughput vs concurrency chart spaces measured levels evenly, draws a segment solid only between two passing levels, marks C_max with a labelled ring, a dashed "Sustainable ×margin" line and a shaded region beyond C_max, with a line-style legend. A "Total | In / out" switch in the chart header replaces the line with stacked bars of input (dark) and output (light) tok/s per GPU at each level (one hue, one y-axis, dashed C_max line, observed values before the margin). An "External curves" toggle (hidden in the In / out view) in the chart header (off by default) overlays published ladders of the same model whose metric is the chart's own (total tok/s per GPU) in `chart-neutral`, short-dashed, hollow points, tagged P1… at their last level; levels join the category axis without bending measured segments. Default scope is the same GPU class and engine family (switch: same engine, all ladders; weak records behind "Show weak records"). The published-curves panel below lists every curve with a checkbox, source link, publisher, date, evidence class, hardware badge (warning when not B300), engine version with audit class, plotted metric ("derived ÷N" when divided) and caveat flags; curves in any other metric get one small chart each with their own title and y-axis (never a second axis on the main chart). Offline the panel draws the total tok/s per GPU curves on one shared chart. The overlay tooltip states each P-tag's ISL/OSL, and a "workload differs" legend entry (and list badge) marks ladders whose input/output lengths are not the run's (or not stated). Published values never feed C_max, the sustainable line or SLO verdicts. On Throughput and Engine, chart panels keep Expand as a direct icon button below 640px (beside the ⋯ menu). The SLO evaluation table sits beside the chart, visible by default, with the "SLO budget used at C_max" rings under it (one row per level: TTFT p95 against its ceiling, stated once in the header when all levels share it, ITL p95, TTFT / ITL / Success marks and the overall verdict; the C_max row highlighted and tagged; below 640px the three per-gate columns drop, the failed criterion stays as a red value and Overall stays visible without horizontal scroll). Runtime versions: one row per recorded runtime_version of the configuration and recorded runtime config on the dataset (other runtime configs are counted and live in the Runtime config picker), newest first, value and Δ vs the next older version before C_max, quality and date; selecting a row shows that run; "Compare top 2 versions" overlays both sweeps in the panel in one sequential encoding (vLLM hue, newer solid, older lighter and dashed), kept in the URL as `overlay=versions` (disabled with its reason below two versions; Compare holds one run per configuration, so two versions of one configuration are not added there); below 768px each version is a stacked card (version, value, Δ "vs older version", C_max, run date, quality). C_max labels on sweep charts sit above-left of the ring (above-right for a falling series); when an SLO threshold line would cross the text, the label moves above the plot area at the top of the vertical C_max line. The measured-results table (rates, TTFT / ITL / request latency mean · p50 · p95 · p99, request counts) stays collapsed lower on the page.
- **Engine page:** Engine matchup first — for the selected pair's model × GPU count on the active dataset, the best measured configuration of each engine (by sustainable tok/min/GPU; a configuration with no level in the SLO only when nothing else of that engine passes), with configured build, run tag, knob chips, the sustainable value with a bar in the engine's colour and C_max. A verdict and Δ appear only for a matched pair (same export, revision, model, topology, decoding policy, knob, data parallelism, run GPUs and replicas, and the same engine-equivalent runtime controls — KV dtype with fp8 ≈ fp8_e4m3, max_num_seqs ≈ max_running_requests, gpu_memory_utilization ≈ mem_fraction_static, prefix cache, context length — read from the run's recorded runtime_config, else the configured command (`src/domain/run-config.ts`); ±3% reads "tied"); otherwise "Different configs — no verdict" with each difference and both values (and their source) in the tooltip and the note. The same rule applies to every per-workload verdict row. A matched-pair verdict also reads as a headline sentence above the cards ("vLLM sustains 4.0% more than SGLang on <dataset> · matched pair"). Per-workload verdicts follow: grouped bars (one group per dataset with a run, one bar per engine, one y-axis; shown with two or more such datasets), then one row per measured dataset (profile badge, budget, verdict text, one card per engine with the sustainable value, C_max, ITL and TTFT p95, and one muted line for levels in SLO and per-user p50), while datasets neither engine ran collapse into one row of selectable chips; with nothing measured the whole panel is one chip block. Every measured version lists each run newest first (configuration chips, sustainable with bar, C_max, request quality, run date, Δ vs the highest older release of the same engine, configuration, dataset and run GPUs, else "—"); below 768px it renders stacked rows. Configured builds and release rechecks sit in a closed disclosure inside Every measured version (imported runs are listed once, in the table). The selected baseline pair (builds, status, flags, release review, controls, values at C_max in full, Open in Compare) is a closed "Baseline pair details" disclosure inside the matchup panel, not a second card. The catalog `testedOnTarget` flag is always labelled as catalog evidence ("Catalog: no B300 validation record"), and "Measured here · n runs" appears beside it when runs are imported. The throughput-by-version chart keeps each engine's hue (vLLM chart-1, SGLang chart-2) and tells versions apart by lightness and dash (newest solid); runs sharing a version are labelled by the knob chips that differ. "Published vLLM vs SGLang (external)": one GPU class at a time (selector with ladder counts, B300 first when published), one chart with the newest two published ladders per engine in the engine hue, dashed, one metric per chart (the first per-GPU throughput family both engines published there) named in the chart subtitle with its "derived ÷ GPUs" note, a numeric log₂ concurrency axis (power-of-two ticks) so ladders with different level sets keep their true spacing, each with its source line (hardware, engine version with audit class, workload and the first two caveats plus "+N"); when the plotted ladders do not share one ISL/OSL the chart header carries a "workloads differ" chip and lists each workload with its tags; a chart of GPU types the sources do not state is titled "Hardware not stated", not "not B300"; no verdict or Δ. Argument differences read KV dtype, max sequences, memory fraction, prefix cache and context length from the same normalised values as the matchup (marked "normalised", with recorded / configured source). The pair throughput (tok/s/GPU, as on Throughput) and ITL charts, argument differences (configured commands, labelled as such), serve commands and the all-pairs table follow. Charts re-measure after a theme or route change and remount when the drawn SVG is wider than its frame.
- **Published explorer (`#/published`):** external published results only (evidence class "external"), never ranked against measured runs. Filters (all in the URL, repeated keys for several values): model combobox, GPU chips with counts, All / Ladders / Points, engine, version audit, evidence class, "Has flag" / "Exclude flag" (dashed faceted buttons, no search field) and a "Show weak records" switch (invalid engine version, unverified extraction and superseded run hidden by default; "· N hidden"; shown ones carry a "Weak" badge with the reason); each value's count respects the other active filters. Coverage: a `heatmap-chart` of models × GPU class, shade = ladder count, points in the tooltip, hatched = nothing published, a centred dot = single points only, no ladder (legend entries for both); below 640px the GPU ticks are two-line ("GB" / "300"); it follows every filter except model and GPU, and selecting a cell sets both (a button clears it). Records: `data-table-card`, 20 per page, sorted by output tok/s/GPU (highest first; records without one last, newest first); `table-layout: fixed` with explicit column widths (model takes the rest; 1,060 px minimum, below which the table scrolls inside its card), so model/precision text, image tags and load-point annotations wrap inside their column and never widen the table; columns model and kind, GPUs (badge for a stated non-B300 GPU; "hardware not stated" when the source names none — never "not B300"), engine version with audit badge, highest published output tok/s/GPU with "@ cN" and "derived", source (publisher link, evidence class), date and caveat chips (long labels truncate; the tooltip carries label and description; "+N" for the rest); below 768px each record is a stacked card. A row expands in place, in a frame sized to the scroll container's visible width and pinned to its left edge (never the table's scroll width), to a concurrency-ladder line chart (x = published levels, labelled axes, one metric picked at a time, neutral grey dashed with hollow points, the same mark external overlays use elsewhere), the levels table as its text equivalent (auto width, value columns next to Concurrency), the record's facts with a catalog link and the source link. Source titles and raw version strings appear only in tooltips and the expanded view; a title that only repeats an id slug reads as its lead and date ("Fixstars · 2026-07-28"). A derived metric states its derivation once ("derived: aggregate ÷ 8 GPUs"); chart tooltips stay inside the chart box and wrap long metric names. No SLO, C_max or sustainable rate on the page. Published chart tags (P1…, V1/S1…) that end on the same level at nearby values are set side by side.
- **Page headers:** title, one selector and at most one primary action plus an overflow menu; facts that a tab already lists stay in that tab. Separators are flex gaps, never literal "·" that can start a wrapped line.
- **Model names:** every component renders the catalog's display name; a third-party label (e.g. Artificial Analysis) appears only in a tooltip.
- **Brand mark:** a monochrome disc cut by a convex frontier curve with a lavender point on the curve. Original artwork.

## States

- **Missing value:** "—", never 0, never accent-coloured; in tables and strips it stands alone in `ink-subtle`/muted with no unit beside it (the caption names the cell). Known exceptions: the unmeasured Engine matchup card and the setup-sheet ring KPIs show "—" at value size next to their label. Zero is an observed value.
- **Not measured:** metric strips keep their layout with a dashed frame and one "Not measured" badge. Charts render only once at least one series exists: a chart group with no series on the active dataset is replaced by one compact dashed block (icon, "Not measured on <dataset>", what appears after import, the SLO thresholds as chips and a "Plan run" action) — Throughput and Compare (also replaces the SLO grid). Engine does not render its unmeasured chart frames at all. Head-to-head cards appear only once a compared configuration is measured; identity rows still show "—". Offline, Throughput keeps the selector row, identity line, serve command and the KPI strip with "—" and the SLO thresholds; Engine keeps the matchup cards with "—" and "Not measured · no verdict", the per-workload verdicts as one chip block and every measured version as one line. The unmeasured Intelligence frontier is a compact block listing every model with a published AA composite in a ranked, labelled "Not benched" strip instead of a plot with an empty axis.
- **Unavailable matrix cell:** hatched background (e.g. intelligence components without a published value).
- **TEST DATA:** a persistent, non-dismissible banner in `warning-soft` / `warning-text` on every route whenever fixture runs are loaded; CSV, JSON and PNG exports are labelled TEST DATA. The banner and top bar share one sticky region on an opaque `canvas` background at z-40, so scrolled content never shows through.
- **Error:** an `.error-state` panel with an actionable message; API failures name the request, never a stack trace.
- **Loading:** the static build renders the bundled snapshot immediately; in API mode a skeleton layout holds the page until the snapshot loads.
- **Empty selection:** an empty state with one action (e.g. "Open Deployments").

## Data visualization

At most four categorical series per chart, assigned slots 1–4 in selection order, so a configuration keeps its colour across panels. `chart-5` and `chart-neutral` (separate tokens; they differ in dark mode) are reserved for non-series marks (non-frontier points, neutral load curves) and are never assigned to a series. Failed load levels are hollow markers; C_max is a ring. Every chart has a textual equivalent (table or `aria-label`) and keyboard-focusable points where points are interactive.

## Motion and focus

Colour and opacity transitions are 150–200ms; overlays (sheet, dialog, popover, menu, compare tray) fade, zoom or slide in through tw-animate-css; activity rings ease their fill over 700ms; charts and sparklines never animate their entrance. `prefers-reduced-motion: reduce` disables transitions and animations globally. Native focusable elements get a 2px outline (ring #5e69d1 at 70%, 2px offset, `:focus-visible`); shadcn controls (buttons, inputs, badges, tabs) use a 3px `ring/40–50` ring instead; dialogs and sheets trap focus and return it to the opener.

## Do's and Don'ts

Do keep the accent scarce, show "—" for missing values, keep failed load levels visible as hollow markers, and keep the catalog date on every export and the evidence class on CSV/JSON exports. Don't add gradients or a second accent, don't overlay incomparable cohorts, don't borrow quality from a neighbouring artifact, and don't present a computed candidate as a measured serving result.

## Responsive Behavior

Breakpoints: 640px (top bar adds the provenance badge, workloads info button and compact SLO values), 768px (full SLO thresholds in the top bar; wide tables leave stacked cards), 900px (persistent sidebar and inset canvas), 1024px ("Workload" label; 3/4/5-column metric strips; TL;DR load-curve column), 1280px (two-column chart rows). At 390px the top bar keeps menu, workload, a separate outlined SLO pill showing the preset name only (thresholds in its accessible name and popover; 640–767px adds labelled values, e.g. "Prefill 1.3K · ITL 26ms") and theme; the workloads info button moves to the command menu and Methodology.
