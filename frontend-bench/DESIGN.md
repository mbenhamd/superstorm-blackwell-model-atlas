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

- **Lavender (`primary` #5e6ad2)** is scarce: brand dot, primary button, focus ring, links, the first chart series and inline data bars. It is never a panel fill.
- **Surface ladder.** Light: frame #f5f6f6 → canvas #ffffff → panel #ffffff with hairline #e6e7e9 → subtle #f9f9fa. Dark: frame #010102 → canvas #0f1011 → panel #141516 → popover #18191a, hairline #23252a.
- **Ink.** ink, ink-muted and ink-subtle carry hierarchy. `ink-subtle` (#62666d light, #8a8f98 dark) meets 4.5:1 on canvas and frame.
- **Status** colours (good, warning, critical) appear only for real states: SLO pass/fail, validation errors, failed levels.
- **Charts.** Categorical slots in order: lavender, orange, teal, amber (light `chart-1..4`, dark `dark-chart-1..4`). Non-frontier points use `chart-neutral`; grid lines use `chart-grid`, axes `chart-axis`. Dark amber (`dark-chart-4` #cc8f1a) is deliberately distinct from the dark warning colour (#f2c94c) so a fourth series never reads as a warning. Light status: good #27a644 / text #1d7a33, warning #e5a50a / #8a5e00, critical #d23c3c / #b42f2f; dark status text: good #4cc767, warning #f2c94c, critical #ff7a7a.

## Typography

Inter (fallback SF Pro Display / system UI); JetBrains Mono for IDs, revisions and commands, with system mono fallbacks so the offline `preview.html` needs no web fonts. Body text is 13px; page titles are 20px/600 with −0.4px tracking; metric values 22px. Group labels in the sidebar use the eyebrow style (+0.4px tracking, sentence case). Numbers use tabular figures everywhere. A micro style (10–11.5px, medium) is used only inside badges and nav tags (e.g. the "Decision" tag, 10px uppercase with 0.06em tracking); it never carries a primary value.

## Layout

Content max width 1320px inside the canvas, 32px side padding on desktop and 16px on phones. Metric strips are one 12px-radius container divided by hairlines into 2 columns (phone) and 3/4/5 columns from 1024px; values carry no decorative icons, only real meters (quality / 100, evaluated / total). Two-column analysis rows collapse to one column below 1024px. No horizontal document scroll at 390px; wide tables scroll inside their panel.

## Elevation & Depth

Depth comes from the surface ladder and hairlines. Panels and cards (including KPI, stat and score cards) carry no drop shadow in dark mode (only a faint top-edge highlight) and a 1px near-invisible shadow in light mode (`shadow-panel`; the shadcn `Card` base uses it too). Every panel and card title uses the 13px/600 panel-title style. Floating layers (popover, menu, dialog, sheet, toast) use `shadow-float`. No gradients, no glow.

## Shapes

Buttons and inputs 8px; panels and metric cards 12px; the inset canvas 12px; tag chips (precision, IDs) 4px; status pills and tab pills fully rounded. Desktop controls are 28–32px high (Linear density). Touch-specific 44px targets are not yet implemented; this is a known gap.

## Components

- **Top bar:** workload `Select` with an About-workloads info button, SLO popover trigger (a separate pill) on the left; provenance badge (catalog date · HF + AA, or the measured-run count; links to Methodology) and light/dark toggle on the right. No search field; the command menu opens with ⌘K / Ctrl+K.
- **Tabs:** pill tabs (selected = muted surface lift).
- **Chart panels:** header actions Expand (dialog with a taller plot), Download PNG and Copy image; below 640px they collapse into one overflow (⋯) button on the title row (no Expand). Exported PNGs carry a "Bench Console · <date>" footer; the HTML legend is not yet drawn into the PNG. Scatter labels are placed by scoring candidate positions against markers, other labels and the frontier polyline. Compare shows one shared series/SLO key above its four charts.
- **Sidebar:** Analyze group (TL;DR, Intelligence, Throughput, Compare, Engine, Models, Deployments), Plan group (New benchmark), Methodology pinned to the bottom.
- **Planning board:** with no experiment, one centred empty state ("No planned runs" + New experiment) replaces the week strip and the board. Otherwise five fixed columns inside a horizontally scrolling container with an edge fade from 768px, and one stacked list grouped by status below it; each card has a "…" menu with a keyboard-accessible "Move to" submenu in addition to drag and drop.
- **Tables:** sentence-case 12px headers, 40px rows, right-aligned numbers with units in headers, inline lavender data bars for SLO capacity, row "…" menu. Tables grow with the page (no nested fixed-height scroll area). Metric columns that are "—" in every row collapse into one "Metrics · not measured" column, and the freed width goes to the name. Below 768px a wide table renders each row as a stacked card (line 1 name and status, line 2 engine build and shape, line 3 the metric or "—", chips on their own wrapping line); chips are never clipped mid-word.
- **Status badge:** one shared component and palette on every page: Candidate = accent dot, Probe = warning dot.
- **TL;DR setups table:** one control row (model combobox grouped by publisher, GPU shape select with "All shapes", sort Sustainable tok/min/GPU · C_max · Name; all in the URL as `model`, `shape`, `sort`; the workload stays the top bar's), then every setup of that model × shape, always expanded and grouped by weights export (label · precision chip only when the label does not already start with it · weights, "— GB" when unknown · n setups). Columns: rank, setup (knob, precision chip, shape, knob chips), runtime (configured build, recheck muted, run tag when measured), sustainable tok/min/GPU with a bar scaled to the model's best measured value (best in accent, others `chart-neutral`), Δ vs best ("Best", signed %, "tie" within ±3% — an assumed policy, stated in tooltip and caption), C_max with a small bar, TTFT / ITL p95 at C_max, latest run with incomplete/errored badges, and row actions (compare checkbox, Throughput); the setup name is the row's single evidence trigger. Header actions: "Compare top 3" (disabled with its reason in a tooltip and `aria-describedby` below two measured setups), a "Champions by workload" jump that scrolls to and focuses the champions panel, Export. With nothing measured the caption says so ("No measured setup on <dataset> yet; ranking appears once runs are imported") instead of describing bars. The evidence sheet opened from the TL;DR leads with Sustainable, C_max, TTFT / ITL p95 and context cap; the model-level AA index moves into a collapsed "Model quality" group (other pages keep AA first). Unmeasured setups follow measured ones with "—", one dashed empty track (sustainable column only) and one "Not measured" badge. When no setup is measured on the dataset, the five metric columns collapse into one "Metrics · not measured on <dataset>" column holding the badge (no tracks), as in Tables. Below 768px each setup is a stacked card. Champions by workload follow: per dataset the champion, its value and C_max, and up to three challengers with Δ vs champion (rest in a tooltip); selecting a row sets the global workload. With no run of the model × shape on any dataset, the champions table is replaced by one sentence and a wrapping row of selectable workload chips (dashed, active one marked). No Artificial Analysis element on the TL;DR. Picker search (every `Combobox`): contiguous, case-insensitive substring on label, value and keywords, ranked label prefix > label substring > keyword substring (`lib/search.ts`), never cmdk's fuzzy subsequence; on open the current option is highlighted and scrolled to the middle of the list.
- **Variant ladder (Model detail):** while no configuration of the family is measured, one summary block per export (export, repository, weights, card Δ, "n configs · vLLM/SGLang") with its rows as stacked cards in a native disclosure; the per-row table appears once a row is measured (768px and up). Model detail shows this ladder as its only configuration list; each row carries a one-click Throughput link beside the compare toggle, and the page header's primary action "Compare all setups" opens `#/tldr?model=<id>`.
- **Fewer clicks to quant throughput:** the Throughput configuration picker groups options by model → weights export ("<model> · <export>"), so a quantization is one picker interaction away, and states the sustainable tok/min/GPU (or "not measured") in each option; an "All setups of this model" link returns to the TL;DR. Deployments shows a Precision column by default. The command menu lists "Compare setups: <model>" for every model.
- **Page headers:** title, one selector and at most one primary action plus an overflow menu; facts that a tab already lists stay in that tab. Separators are flex gaps, never literal "·" that can start a wrapped line.
- **Model names:** every component renders the catalog's display name; a third-party label (e.g. Artificial Analysis) appears only in a tooltip.
- **Brand mark:** a monochrome disc cut by a convex frontier curve with a lavender point on the curve. Original artwork.

## States

- **Missing value:** a lone "—" in `ink-subtle`/muted, never 0, never accent-coloured, with no unit or inline label beside it (the caption names the cell). Zero is an observed value.
- **Not measured:** metric strips keep their layout with a dashed frame and one "Not measured" badge. Charts render only once at least one series exists: a chart group with no series on the active dataset is replaced by one compact dashed block (icon, "Not measured on <dataset>", what appears after import, the SLO thresholds as chips and a "Plan run" action) — Throughput, Compare (also replaces the SLO grid) and Engine. Head-to-head cards appear only once a compared configuration is measured; identity rows still show "—". The unmeasured Intelligence frontier is a compact block listing every model in a ranked, labelled "Not benched" strip instead of a plot with an empty axis.
- **Unavailable matrix cell:** hatched background (e.g. intelligence components without a published value).
- **TEST DATA:** a persistent, non-dismissible banner in `warning-soft` / `warning-text` on every route whenever fixture runs are loaded; exports are labelled TEST DATA.
- **Error:** an `.error-state` panel with an actionable message; API failures name the request, never a stack trace.
- **Loading:** the shell renders immediately; API-mode data replaces the offline snapshot without layout shift.
- **Empty selection:** an empty state with one action (e.g. "Open Deployments").

## Data visualization

At most four categorical series per chart, assigned slots 1–4 in selection order, so a configuration keeps its colour across panels. `chart-5` / `chart-neutral` is reserved for non-series marks (non-frontier points) and is never assigned to a series. Failed load levels are hollow markers; C_max is a ring. Every chart has a textual equivalent (table or `aria-label`) and keyboard-focusable points where points are interactive.

## Motion and focus

Motion is limited to 150ms colour and opacity transitions and disclosure rotations; no animated chart entrances in tests or with `prefers-reduced-motion: reduce`, which disables transitions and animations globally. Focus is a 2px `focus` (#5e69d1) outline with 2px offset on every interactive element (`:focus-visible`); dialogs and sheets trap focus and return it to the opener.

## Do's and Don'ts

Do keep the accent scarce, show "—" for missing values, keep failed load levels visible as hollow markers, and keep the catalog date and evidence class on every export. Don't add gradients or a second accent, don't overlay incomparable cohorts, don't borrow quality from a neighbouring artifact, and don't present a computed candidate as a measured serving result.

## Responsive Behavior

Breakpoints: 640px (top bar shows full labels), 900px (persistent sidebar and inset canvas), 1024px (two-column analysis rows; 3/4/5-column metric strips). At 390px the top bar keeps menu, workload, a separate outlined SLO pill showing the preset name only (thresholds in its accessible name and popover; 640–767px adds labelled values, e.g. "Prefill 1.3K · ITL 26ms") and theme; the workloads info button moves to the command menu and Methodology.
