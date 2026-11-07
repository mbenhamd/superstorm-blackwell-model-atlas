/**
 * Browser checks against the built bundle (run `bun run build` first).
 *
 * Two servers:
 *  - offline preview (scripts/preview.ts): the shipped console, atlas + Hugging Face + Artificial Analysis only;
 *  - API server with RUNS_FILE=tests/fixtures/sample-runs.json: TEST-labelled runs, used only to exercise the
 *    measured-data views (sweeps, frontier, tooltips). Those values are invented test inputs, not measurements.
 *
 * Covers: one h1 per route, no error state, no horizontal overflow at 1440 and 390 px, no page errors,
 * filters/sort/URL sync, compare, focus return for the evidence sheet and ⌘K, ⌘K page matching, chart-point
 * keyboard focus, SLO input commit on Enter, serve-command formatting, experiments, theme and dataset dialog.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const offline = "http://127.0.0.1:4173";
const measured = "http://127.0.0.1:4175";
const mod = process.platform === "darwin" ? "Meta" : "Control";
const routes = [
  "tldr", "intelligence", "throughput", "throughput?run=gemma-4-31b-it.nvfp4.sglang.baseline&tab=configuration", "compare",
  "engine", "engine?pair=glm-5.3.fp8@8", "models", "models?model=deepseek-v4-flash-0731&tab=overview", "models?model=qwen3.8-27b&tab=precision",
  "deployments", "new-benchmark", "methodology",
];
const aliases: [string, RegExp][] = [
  ["overview", /#\/tldr/], ["intelligence-vs-throughput", /#\/intelligence/],
  ["sustainable-throughput", /#\/throughput/], ["compare-benchmarks", /#\/compare/],
  ["versus", /#\/engine/], ["runtimes", /#\/engine/], ["models?model=glm-5.3&tab=engines", /#\/engine\?.*model=glm-5\.3/],
  ["quant", /#\/models\?.*model=qwen3\.8-27b.*tab=precision/], ["quantization", /#\/models\?.*tab=precision/],
  ["hardware", /#\/deployments/], ["experiments", /#\/new-benchmark/],
];
const navLabels = ["TL;DR", "Intelligence", "Throughput", "Compare", "Engine", "Models", "Deployments", "New benchmark", "Methodology"];

let servers: ReturnType<typeof Bun.spawn>[] = [];
let browser: Browser;
let context: BrowserContext;
let page: Page;
let pageErrors: string[];
let origin = offline;

async function waitFor(url: string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch { /* waiting for the server */ }
    await Bun.sleep(100);
  }
  throw new Error(`${url} did not become ready`);
}

beforeAll(async () => {
  servers = [
    Bun.spawn([process.execPath, "scripts/preview.ts"], { cwd: root, env: { ...process.env, PORT: "4173" }, stdout: "ignore", stderr: "inherit" }),
    Bun.spawn([process.execPath, "src/server/index.ts"], { cwd: root, env: { ...process.env, PORT: "4175", DATABASE_URL: "", RUNS_FILE: "tests/fixtures/sample-runs.json" }, stdout: "ignore", stderr: "inherit" }),
  ];
  await Promise.all([waitFor(offline), waitFor(`${measured}/health`)]);
  browser = await chromium.launch();
});

async function open(width = 1440, height = 900): Promise<void> {
  await context?.close();
  context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", acceptDownloads: true });
  page = await context.newPage();
  page.setDefaultTimeout(8000);
  pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push(message.text()); });
  await page.goto(origin);
  await page.evaluate(() => localStorage.clear());
}

async function go(path: string): Promise<void> {
  await page.goto(`${origin}/#/${path}`);
  await page.reload();
  await page.waitForSelector("main h1", { state: "attached" });
}

const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const active = () => page.evaluate(() => {
  const el = document.activeElement as HTMLElement | null;
  return el ? { tag: el.tagName, id: el.dataset.id ?? el.dataset.pointId ?? el.dataset.testid ?? el.id ?? "", text: (el.innerText || el.getAttribute("aria-label") || "").slice(0, 60) } : null;
});

afterAll(async () => {
  await context?.close(); await browser?.close();
  for (const server of servers) { server.kill(); await server.exited; }
});

describe("offline console (atlas, Hugging Face and Artificial Analysis data)", () => {
  beforeEach(async () => { origin = offline; await open(); });

  for (const path of routes) {
    test(`${path}: one h1, no error state, no overflow at 1440 and 390, no page errors`, async () => {
      await go(path);
      expect(await page.locator("h1").count()).toBe(1);
      expect(await page.locator(".error-state").count()).toBe(0);
      expect(await overflow()).toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(150);
      expect(await page.locator("h1").count()).toBe(1);
      expect(await overflow()).toBeLessThanOrEqual(0);
      expect(pageErrors).toEqual([]);
    });
  }

  test("sidebar keeps the route labels in order", async () => {
    await go("tldr");
    const labels = await page.locator('aside[aria-label="Sidebar"] a').allInnerTexts();
    expect(labels.map((label) => label.replace(/\s*Decision\s*$/i, "").trim()).filter((label) => label !== "Bench Console")).toEqual(navLabels);
  });

  test("legacy aliases resolve to canonical routes", async () => {
    for (const [alias, expected] of aliases) {
      await go(alias);
      expect(page.url()).toMatch(expected);
      expect(await page.locator("h1").count()).toBe(1);
    }
    expect(pageErrors).toEqual([]);
  });

  test("TL;DR shows real catalog counts, champions by workload and the variant ladder", async () => {
    await go("tldr");
    expect(await page.getByTestId("tldr-kpis").innerText()).toMatch(/36\s*of 54/);
    expect(await page.getByTestId("tldr-sort").count()).toBe(1);
    // No fixture runs: unmeasured cells are "—" and each panel carries one "Not measured" badge.
    expect(await page.getByTestId("not-measured-badge").count()).toBeGreaterThanOrEqual(1);
    expect(await page.getByTestId("workload-comparison").innerText()).not.toMatch(/\b0 tok/);
    expect(await page.getByTestId("data-badge").innerText()).toContain("HF + AA");
    // The catalog alone carries no fixture runs: no TEST banner.
    expect(await page.getByTestId("test-data-banner").count()).toBe(0);
    // Models glance is a MetricList: one row per model; a missing AA composite is text, never an empty tick bar.
    expect(await page.locator('[data-glance-row][data-slot="metric-list-row"]').count()).toBe(12);
    expect(await page.locator('[data-glance-row] [data-slot="tick-bar"][aria-valuenow="0"]').count()).toBe(0);
    expect(await page.locator("[data-nav-tag]").count()).toBeGreaterThanOrEqual(2);
    // Variant comparison defaults to the model with the most configurations (Qwen 3.8 27B: 13).
    expect(await page.locator("[data-variant-row]").count()).toBe(13);
    expect(await page.getByTestId("variant-summary").innerText()).toContain("vLLM · SGLang");
    // Nothing measured: no per-row table; one collapsed summary block per export (rows stay mounted in <details>).
    expect(await page.getByTestId("variant-ladder").getAttribute("data-collapsed")).toBe("true");
    expect(await page.getByTestId("variant-ladder").locator("th").count()).toBe(0);
    expect(await page.locator('[data-export-group]').evaluateAll((groups) => groups.every((group) => !(group as HTMLDetailsElement).open))).toBe(true);
    expect(await page.locator('[data-export-group="qwen3.8-27b.nvfp4"] summary').innerText()).toMatch(/\d+ configs? · vLLM\/SGLang/);
    expect(await page.getByTestId("concurrency-results").count()).toBe(0);
    // One KPI tile per bench dataset (3×2); the active one is marked.
    expect(await page.locator('[data-workload-row][data-slot="kpi-row-metric"]').count()).toBe(6);
    expect(await page.locator('[data-workload-row="single-turn-8k"]').getAttribute("aria-current")).toBe("true");
    // A glance row is keyboard-operable and re-scopes the family.
    const other = page.locator("[data-glance-row]:not([aria-current])").first();
    const otherId = await other.getAttribute("data-glance-row");
    await other.focus();
    await page.keyboard.press("Enter");
    await page.locator(`[data-glance-row="${otherId}"][aria-current="true"]`).waitFor();
    await page.locator('[data-glance-row="qwen3.8-27b"]').focus();
    await page.keyboard.press("Enter");
    await page.locator('[data-glance-row="qwen3.8-27b"][aria-current="true"]').waitFor();
    await page.locator('[data-glance-row="qwen3.8-27b"]').evaluate((el) => (el as HTMLElement).blur());
    await page.locator('[data-workload-row="chat-8-turn"]').click();
    await page.waitForFunction(() => location.hash.includes("workload=chat-8-turn"));
    await page.getByTestId("variant-compare").click();
    await page.waitForFunction(() => location.hash.startsWith("#/compare"));
    expect((new URL(page.url()).hash.match(/runs=([^&]+)/)?.[1] ?? "").split(/%2C|,/).length).toBe(4);
    expect(pageErrors).toEqual([]);
  });

  test("intelligence: unscored models keep hatched cells; benchmark guide lists all components", async () => {
    await go("intelligence");
    expect(await page.locator('[data-testid="aa-heatmap"] [data-missing]').count()).toBeGreaterThan(0);
    expect(await page.getByTestId("aa-heatmap").innerText()).toContain("no composite");
    expect(await page.locator("[data-guide-row]").count()).toBe(10);
    // Benchmark key is a collapsed native disclosure; its summary carries the count and the category weights.
    const guide = page.getByTestId("aa-guide");
    expect(await guide.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    expect(await guide.locator("summary").innerText()).toMatch(/Components\s*·\s*10/);
    // Coverage tiles: published composites, top index (one decimal, not rounded) and published component cells.
    const kpis = await page.getByTestId("intelligence-kpis").innerText();
    expect(kpis).toContain("46.5");
    expect(kpis).toMatch(/10\s*of 12 models/);
    // Unmeasured serving frontier keeps its frame: no padded shortlist, models only in the "Not benched" lane.
    expect(await page.getByTestId("frontier-shortlist").getAttribute("data-empty")).toBe("");
    expect(await page.locator('[data-testid="frontier-empty"] [data-lane-model]').count()).toBe(10);
    expect(await page.locator('[data-chart-panel="aa-index-versus-sustainable-throughput"] [data-point-id]').count()).toBe(0);
    expect(pageErrors).toEqual([]);
  });

  test("engine: all pairs table and runtime versions panel", async () => {
    await go("engine?pair=glm-5.3.fp8@8");
    expect(await page.locator("[data-engine-pair]").count()).toBe(14);
    expect(await page.locator('[data-engine-pair="glm-5.3.fp8@8"]').getAttribute("aria-current")).toBe("true");
    // Pairs table and engine-only flags are collapsed native disclosures: rows stay mounted, hidden until opened.
    const pairsDisclosure = page.getByTestId("engine-pairs-disclosure");
    expect(await pairsDisclosure.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    expect(await pairsDisclosure.locator("summary").innerText()).toMatch(/All matched pairs\s*·\s*14/);
    await pairsDisclosure.locator("summary").click();
    expect(await page.locator('[data-engine-pair="glm-5.3.fp8@8"]').isVisible()).toBe(true);
    const engineOnly = page.getByTestId("engine-only-flags");
    if (await engineOnly.count()) {
      expect(await engineOnly.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
      expect(await engineOnly.locator("summary").innerText()).toMatch(/Engine-only flags\s*·\s*vLLM \d+ · SGLang \d+/);
      expect(await engineOnly.locator("[data-engine-only]").count()).toBe(2);
    }
    expect(await page.locator('[data-arg-row="Engine-only"]').count()).toBe(0);
    // Engine cards: engine · configured build is the title; the release recheck is the secondary line; one status palette.
    expect(await page.locator('[data-engine-side="vLLM"]').innerText()).toMatch(/^vLLM · source snapshot/);
    expect(await page.locator('[data-engine-side] [data-status="candidate"][data-variant="info"]').count()).toBeGreaterThan(0);
    // Not measured: one compact block instead of two empty chart frames.
    expect(await page.getByTestId("engine-charts-empty").count()).toBe(1);
    expect(await page.locator('[data-empty-chart="true"]').count()).toBe(0);
    const versions = await page.getByTestId("runtime-versions").innerText();
    // GLM 5.3 configurations record a source snapshot, not a release; the v0.33.0 recheck is shown separately.
    expect(versions).toContain("vllm (source snapshot, no release tag)");
    expect(versions).toContain("Rechecked v0.33.0 · arguments not revalidated");
    expect(pageErrors).toEqual([]);
  });

  test("deployments: search, facets, sort and URL stay in sync", async () => {
    await go("deployments");
    const count = page.getByTestId("result-count");
    expect(await count.innerText()).toBe("54 of 54");
    expect(await page.getByTestId("load-heatmap").count()).toBe(0);
    expect(await page.getByTestId("load-heatmap-empty").count()).toBe(1);
    expect(await page.getByTestId("deployment-meta").innerText()).toBe("54 configs · 36 candidate · 18 probe · 0 measured");
    expect(await page.getByTestId("leaderboard-caption").innerText()).toContain("Not measured");
    // Five all-dash metric columns collapse into one "Metrics · not measured" column; no nested scroll area.
    expect(await page.locator("th", { hasText: "Metrics · not measured" }).count()).toBe(1);
    expect(await page.locator("th", { hasText: "TTFT p95" }).count()).toBe(0);
    expect(await page.locator('[data-slot="table-container"]').first().evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    const engineFacet = page.locator('[data-facet="engine"]');
    expect(await engineFacet.getAttribute("data-filter-state")).toBe("empty");
    expect(await engineFacet.evaluate((el) => getComputedStyle(el).borderStyle)).toBe("dashed");
    expect(await page.locator('input[type="search"]').count()).toBe(0);
    await go("deployments?q=qwen%203.8%2027b");
    expect(await page.getByTestId("query-chip").innerText()).toContain("qwen 3.8 27b");
    const qwen = Number((await count.innerText()).split(" ")[0]);
    expect(qwen).toBeGreaterThan(0);
    await engineFacet.click();
    await page.locator('[data-facet-option="SGLang"]').click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => location.hash.includes("runtime=SGLang"));
    expect(await engineFacet.getAttribute("data-filter-state")).toBe("active");
    expect(Number((await count.innerText()).split(" ")[0])).toBeLessThan(qwen);
    await page.getByTestId("reset-filters").click();
    expect(await count.innerText()).toBe("54 of 54");
    await go("deployments?precision=NVFP4");
    expect(Number((await count.innerText()).split(" ")[0])).toBeGreaterThan(0);
    const firstRow = () => page.locator("tbody tr[data-row-id]").first().getAttribute("data-row-id");
    const before = await firstRow();
    await page.getByRole("button", { name: /AA \(model\)/ }).first().click();
    await page.waitForTimeout(100);
    expect(await firstRow()).not.toBe(before);
    expect(pageErrors).toEqual([]);
  });

  test("compare: selection feeds compare; model-level intelligence profile without clipping", async () => {
    await go("deployments");
    await page.locator('[data-compare-id="qwen3.8-27b.fp8.vllm.baseline"]').click();
    await page.locator('[data-compare-id="gemma-4-31b-it.nvfp4.vllm.baseline"]').click();
    expect(await page.getByRole("region", { name: "Selected configurations" }).innerText()).toContain("2 selected");
    await go("compare?runs=qwen3.8-27b.fp8.vllm.baseline,gemma-4-31b-it.nvfp4.vllm.baseline,glm-5.3.fp8.vllm.baseline,kimi-k3.native.vllm.baseline");
    expect(await page.locator("[data-compare-row]").count()).toBe(4);
    const profile = page.getByTestId("quality-profile");
    expect(await profile.locator('[data-slot="radar-chart"]').count()).toBe(1);
    expect(await profile.locator("table").count()).toBe(0);
    // Radar is the default view; "Values" swaps in the exact component table.
    await page.getByTestId("quality-view").getByRole("radio", { name: "Values" }).click();
    await profile.locator("table").waitFor();
    expect(await profile.locator('[data-slot="radar-chart"]').count()).toBe(0);
    // Every header cell of the component table is inside its scroll container or fully visible (no clipped 4th column).
    const clipped = await profile.locator("table").evaluate((table) => {
      const box = table.parentElement!.getBoundingClientRect();
      return [...table.querySelectorAll("th")].some((th) => th.getBoundingClientRect().right > box.right + 1 && table.parentElement!.scrollWidth <= table.parentElement!.clientWidth);
    });
    expect(clipped).toBe(false);
    // Shipped state: no series, so one compact "Not measured" block (Plan run + SLO chips) replaces the four chart
    // frames and the SLO grid; never a "connect" notice and never an empty axis.
    expect(await page.getByTestId("compare-charts").count()).toBe(0);
    expect(await page.locator('[data-empty-chart="true"]').count()).toBe(0);
    const empty = page.getByTestId("compare-charts-empty");
    expect(await empty.innerText()).toContain("Not measured on single-turn-8k");
    expect(await empty.getByTestId("plan-run").count()).toBe(1);
    expect(await empty.getByTestId("slo-chips").innerText()).toContain("ITL p95 ≤ 26 ms");
    expect(await page.getByTestId("slo-grid").count()).toBe(0);
    expect(await page.locator('[data-compare-row] [data-cell="sustainable"]').first().innerText()).toBe("—");
    // Head-to-head cards appear only once a compared configuration is measured; offline the identity rows carry "—".
    expect(await page.getByTestId("compare-head-to-head").count()).toBe(0);
    expect(await page.locator('[role="progressbar"]').count()).toBe(0);
    expect(await page.getByText(/appear once bench results are connected/).count()).toBe(0);
    expect(pageErrors).toEqual([]);
  });

  test("evidence sheet returns focus to its opener on Escape", async () => {
    await go("deployments");
    const opener = page.locator('[data-action="open-run"][data-id="glm-5.3.nvfp4.vllm.baseline"]');
    await opener.focus();
    await page.keyboard.press("Enter");
    const sheet = page.getByTestId("evidence-sheet");
    await sheet.waitFor();
    expect(await sheet.innerText()).toContain("Weights export");
    expect(await page.getByTestId("evidence-class").innerText()).toBe("Reference");
    // Unmeasured: sustainable (tok/min/GPU) and C_max keep their tiles with "—".
    expect(await page.getByTestId("drawer-kpis").innerText()).toMatch(/Sustainable\s+—\s+tok\/min\/GPU · not measured/);
    await page.keyboard.press("Escape");
    await sheet.waitFor({ state: "detached" });
    expect((await active())?.id).toBe("glm-5.3.nvfp4.vllm.baseline");
    expect(pageErrors).toEqual([]);
  });

  test("⌘K returns focus to its opener on Escape, and after opening a configuration from it", async () => {
    await go("deployments");
    // ⌘K is deliberately ignored inside text inputs, so the opener is a button.
    const search = page.getByRole("button", { name: "Export CSV" });
    await search.focus();
    await page.keyboard.press(`${mod}+k`);
    const input = page.getByPlaceholder("Search pages, models, configurations…");
    await input.waitFor();
    await page.keyboard.press("Escape");
    await input.waitFor({ state: "detached" });
    await search.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    expect(await search.evaluate((el) => el === document.activeElement)).toBe(true);
    // ⌘K → configuration → evidence sheet → Escape lands back on the original opener.
    await search.focus();
    await page.keyboard.press(`${mod}+k`);
    await input.waitFor();
    await input.fill("glm-5.3.fp8.vllm.mtp");
    await page.keyboard.press("Enter");
    const sheet = page.getByTestId("evidence-sheet");
    await sheet.waitFor();
    await page.keyboard.press("Escape");
    await sheet.waitFor({ state: "detached" });
    // Radix restores focus in onCloseAutoFocus, which can land a frame after the node detaches.
    await search.evaluate((el) => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    expect(await search.evaluate((el) => el === document.activeElement)).toBe(true);
    expect(pageErrors).toEqual([]);
  });

  test("⌘K page matching is word-prefix, not fuzzy", async () => {
    await go("tldr");
    await page.keyboard.press(`${mod}+k`);
    const input = page.getByPlaceholder("Search pages, models, configurations…");
    await input.waitFor();
    const pages = () => page.locator('[cmdk-group]', { hasText: "Pages" }).locator("[cmdk-item]").allInnerTexts();
    await input.fill("comp");
    expect((await pages()).map((text) => text.split("\n")[0])).toEqual(["Compare"]);
    await input.fill("eng");
    expect((await pages()).map((text) => text.split("\n")[0])).toEqual(["Engine"]);
    await input.fill("zzq");
    expect(await page.getByText("No commands found.").count()).toBe(1);
    await input.fill("quantization");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash.includes("tab=precision") && document.querySelector("h1")?.textContent === "Qwen 3.8 27B");
    expect(await page.locator("h1").innerText()).toBe("Qwen 3.8 27B");
    expect(pageErrors).toEqual([]);
  });

  test("models: AA gauge, grouped configurations, engine review rows, export ladder, card claims collapsed with Card Δ", async () => {
    await go("models");
    expect(await page.getByTestId("model-count").innerText()).toBe("12 of 12");
    expect(await page.getByTestId("model-best").count()).toBe(12);
    await go("models?model=qwen3.8-27b&tab=overview");
    expect(await page.locator('[data-testid="model-aa"]').innerText()).toContain("20.1");
    // One view of configurations: the shared variant ladder (one collapsed block per export while unmeasured), no
    // separate configurations list or exports panel on Overview; missing sustainable values render "—" (never 0).
    const configRows = page.locator('[data-testid="variant-ladder"] [data-variant-row]');
    expect(await configRows.count()).toBe(13);
    expect(await page.locator('[data-testid="variant-ladder"] [data-export-group]').count()).toBe(3);
    expect(await page.locator("#export-ladder").count()).toBe(0);
    await page.locator('[data-testid="variant-ladder"] [data-export-toggle]').first().click();
    expect(await configRows.first().locator('[data-missing="true"]').innerText()).toBe("—");
    // AA card: the score is the hero; the effort is a small badge, not the headline. Four header pills.
    expect(await page.getByTestId("model-chips").locator("dt").allInnerTexts()).toEqual(["Params", "Context", "Layout", "License"]);
    expect(await page.getByTestId("model-switcher").count()).toBe(1);
    // Engine reviews: one row per engine; the assessment opens in a popover.
    const reviews = page.locator("[data-engine-review]");
    expect(await reviews.count()).toBeGreaterThan(0);
    await reviews.first().locator("[data-review-trigger]").click();
    await page.locator("[data-review-content]").waitFor();
    await page.keyboard.press("Escape");
    await go("models?model=qwen3.8-27b&tab=precision");
    expect(await page.locator("[data-precision-row]").count()).toBe(3);
    expect(await page.locator('[data-precision-row] [data-card-delta="−0.44"]').count()).toBe(1);
    const nvidia = page.locator('[data-card="nvidia/Qwen3.8-27B-NVFP4"]');
    expect(await nvidia.locator("table").count()).toBe(0);
    expect(await nvidia.innerText()).toContain("Card Δ −0.44 pts");
    expect(await nvidia.innerText()).toContain("6 benchmarks");
    await nvidia.locator("[data-card-toggle]").click();
    expect(await nvidia.locator("table").count()).toBe(1);
    expect(await nvidia.innerText()).toContain("Δ pts");
    const base = page.locator('[data-card="Qwen/Qwen3.8-27B"]');
    expect(await base.locator("table").count()).toBe(0);
    expect(await page.locator("main").innerText()).not.toContain("Cells with two scores");
    await go("models?model=kimi-k3.1-pro&tab=precision");
    expect(await page.locator("[data-unavailable-export]").count()).toBe(2);
    expect(await page.locator("[data-unavailable-export] a").count()).toBe(0);
    expect(pageErrors).toEqual([]);
  });

  test("intelligence: scatter points keep keyboard focus across Tab and hover", async () => {
    await go("intelligence");
    const points = page.locator('[data-chart-panel="aa-index-versus-active-parameters"] [data-point-id]');
    expect(await points.count()).toBeGreaterThan(3);
    await points.first().focus();
    const first = (await active())?.id;
    expect(first).toBeTruthy();
    await page.keyboard.press("Tab");
    const second = (await active())?.id;
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    await points.nth(2).hover();
    await page.waitForTimeout(100);
    expect((await active())?.id).toBe(second);
    expect(await page.getByTestId("aa-heatmap").locator('[data-slot="heatmap-chart-cell"]').count()).toBeGreaterThan(0);
    expect(pageErrors).toEqual([]);
  });

  test("SLO inputs commit on Enter as well as on blur", async () => {
    await go("throughput?tab=configuration");
    await page.getByTestId("slo-trigger").click();
    await page.getByTestId("slo-popover").waitFor();
    const prefill = page.locator('[data-slo="prefill"]');
    await prefill.fill("2000");
    await prefill.press("Enter");
    await page.waitForTimeout(50);
    expect(await page.getByTestId("ttft-ceiling").innerText()).toContain("4,000");
    expect(await page.getByTestId("slo-trigger").innerText()).toContain("Custom");
    const itl = page.locator('[data-slo="itl"]');
    await itl.fill("40");
    await page.locator('[data-slo="prefill"]').focus();
    await page.waitForTimeout(50);
    await page.setViewportSize({ width: 390, height: 844 });
    // Phones: the SLO is its own pill with the preset name; the values are in its accessible name and the popover.
    expect(await page.getByTestId("slo-compact").innerText()).toContain("Custom");
    expect(await page.getByTestId("slo-trigger").getAttribute("aria-label")).toContain("2000");
    expect(await page.getByTestId("slo-trigger").getAttribute("aria-label")).toContain("40 ms");
    await page.waitForTimeout(300);
    const workload = await page.getByTestId("workload-select").boundingBox();
    const sloBox = await page.getByTestId("slo-trigger").boundingBox();
    expect(sloBox!.x).toBeGreaterThanOrEqual(workload!.x + workload!.width);
    expect(pageErrors).toEqual([]);
  });

  test("throughput: run identity and a readable, copyable serve command", async () => {
    await go("throughput?run=glm-5.3.fp8.vllm.mtp&tab=configuration");
    expect(await page.getByTestId("run-identity").innerText()).toContain("vllm (source snapshot, no release tag)");
    // The run identity is a caption line of the serve command, not a separate panel.
    expect(await page.getByTestId("command-block").getByTestId("run-identity").count()).toBe(1);
    const command = await page.getByTestId("command-block").locator("code").innerText();
    const lines = command.split("\n");
    expect(lines[0]).toBe("vllm serve zai-org/GLM-5.3 \\");
    expect(lines.slice(1).every((line) => line.startsWith("  --"))).toBe(true);
    expect(command).toContain(`--speculative-config '{"method": "mtp", "num_speculative_tokens": 5}' \\`);
    expect(await page.getByTestId("copy-command").count()).toBe(1);
    await page.getByRole("tab", { name: "Overview" }).click();
    // Not measured: the performance structure stays, with "—" values and one "Not measured" badge.
    const strip = page.getByTestId("performance-strip");
    expect(await strip.getAttribute("data-measured")).toBeNull();
    expect(await strip.getByTestId("not-measured-badge").count()).toBe(1);
    expect(await strip.innerText()).toContain("Sustainable throughput");
    expect(await strip.innerText()).toContain("—");
    // Classic SLO on single-turn-8k: 8,000 prompt tokens ÷ 1,300 tok/s = 6,154 ms TTFT ceiling (nominal, computed).
    expect(await page.getByTestId("strip-ttft-ceiling").innerText()).toContain("6,154 ms");
    // Not measured: no chart frame at all; one compact block (Plan run + SLO chips) replaces the charts and the table.
    expect(await page.locator('[data-empty-chart="true"]').count()).toBe(0);
    expect(await page.getByTestId("throughput-not-measured").innerText()).toContain("Not measured on single-turn-8k");
    expect(await page.getByTestId("throughput-not-measured").getByTestId("plan-run").count()).toBe(1);
    expect(await page.getByTestId("concurrency-table").count()).toBe(0);
    // Header: selector, Add to compare and one overflow menu; the run picker appears only once runs exist.
    expect(await page.getByTestId("run-history").count()).toBe(0);
    expect(await page.getByTestId("throughput-more").count()).toBe(1);
    expect(await page.getByTestId("throughput-identity").innerText()).not.toContain("·  ·");
    await page.getByRole("button", { name: "Serve command" }).click();
    expect(await page.getByTestId("throughput-serve-command").locator("code").innerText()).toContain("vllm serve zai-org/GLM-5.3 \\");
    expect(pageErrors).toEqual([]);
  });

  test("configured engine build vs latest recheck (qwen3.8-27b FP8 · v0.31 FlashInfer FP8 KV)", async () => {
    await go("throughput?run=qwen3.8-27b.fp8.vllm.v031.fi-fp8-kv&tab=configuration");
    expect(await page.getByTestId("run-identity").innerText()).toContain("vllm-v0.31.0");
    const recheck = await page.getByTestId("recheck-details").innerText();
    expect(recheck).toContain("v0.33.0");
    expect(recheck).toContain("Not tested on B300");
    expect(recheck).toContain("Required reconciliation");
    expect(await page.getByTestId("command-block").first().innerText()).toContain("vLLM v0.31.0");
    await go("deployments");
    const cell = page.locator('[data-engine-build="v0.31.0"]').first();
    expect(await cell.innerText()).toContain("Rechecked v0.33.0");
    expect(await page.getByTestId("data-badge").innerText()).not.toMatch(/atlas|f626319/i);
    expect(pageErrors).toEqual([]);
  });

  test("experiments: create and move persist across reloads", async () => {
    await go("new-benchmark");
    // No seeded experiments: the board starts empty.
    const before = await page.locator(".experiment-card").count();
    // No experiments: one centred empty state; the week strip and the five-column board appear with the first card.
    expect(before).toBe(0);
    expect(await page.getByTestId("experiments-empty").count()).toBe(1);
    expect(await page.locator("[data-drop-status]").count()).toBe(0);
    expect(await page.getByTestId("week-strip").count()).toBe(0);
    await page.getByTestId("new-experiment").click();
    const dialog = page.getByTestId("experiment-dialog");
    await dialog.waitFor();
    await page.locator("#experiment-name").fill("Browser test experiment");
    await page.getByTestId("experiment-config").click();
    await page.getByRole("option").first().click();
    // Datasets default to the top-bar dataset; add a second one. The preview shows the bench run identity.
    expect(await page.locator('[data-dataset="single-turn-8k"]').getAttribute("data-state")).toBe("checked");
    await page.locator('[data-dataset="chat-8-turn"]').click();
    const preview = await page.getByTestId("experiment-identity").innerText();
    for (const key of ["model_name", "gpu_type", "num_gpus", "max_system_replicas", "runtime_version", "runtime_config", "dataset", "gpu_footprint"]) expect(preview).toContain(key);
    expect(preview).toContain("single-turn-8k · chat-8-turn");
    await page.getByRole("button", { name: "Create experiment" }).click();
    await dialog.waitFor({ state: "detached" });
    expect(await page.locator(".experiment-card").count()).toBe(before + 1);
    expect(await page.locator("[data-drop-status]").count()).toBe(5);
    expect(await page.locator("[data-empty-column]").count()).toBe(4);
    expect(await page.getByTestId("week-strip").locator("[data-week-day]").count()).toBe(7);
    expect(await page.getByTestId("board-scroller").evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    const card = page.locator(".experiment-card", { hasText: "Browser test experiment" });
    const id = await card.getAttribute("data-experiment-id");
    expect(await card.getByTestId("experiment-datasets-chips").innerText()).toMatch(/single-turn-8k\s*chat-8-turn/);
    expect(await card.evaluate((el) => el.closest("[data-drop-status]")?.getAttribute("data-drop-status"))).toBe("Backlog");
    await card.locator("[data-move-experiment]").focus();
    await page.keyboard.press("Enter");
    await page.locator(`[data-move-submenu="${id}"]`).waitFor();
    await page.locator(`[data-move-submenu="${id}"]`).press("ArrowRight");
    await page.locator('[data-move-option="Scheduled"]').waitFor();
    await page.keyboard.press("Enter");
    await page.reload();
    await page.waitForSelector(`[data-experiment-id="${id}"]`);
    const moved = page.locator(`[data-experiment-id="${id}"]`);
    expect(await moved.evaluate((el) => el.closest("[data-drop-status]")?.getAttribute("data-drop-status"))).toBe("Scheduled");
    expect(pageErrors).toEqual([]);
  });

  test("methodology: SLO presets, workload tags with legend, total-token sustainable definition, open evidence", async () => {
    await go("methodology");
    expect(await page.getByTestId("slo-presets").locator("tbody tr").count()).toBe(3);
    expect(await page.getByTestId("slo-presets").innerText()).toMatch(/Classic[\s\S]*1,300 tok\/s[\s\S]*26 ms/);
    expect(await page.locator("[data-methodology-workload]").count()).toBe(6);
    // The tag legend sits in a collapsed native <details>: its tags stay mounted.
    expect(await page.getByTestId("tag-legend").locator("[data-tag]").count()).toBeGreaterThanOrEqual(7);
    // Definitions are one tabbed panel; Performance is the default tab.
    expect(await page.locator("main").innerText()).toContain("Total (input + output) tok/s at C_max");
    await page.getByTestId("methodology-definitions").getByRole("tab", { name: "Comparability" }).click();
    expect(await page.getByTestId("methodology-definitions").innerText()).toContain("runtime_config");
    await page.getByTestId("methodology-workloads").click();
    await page.getByTestId("workloads-dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByTestId("workloads-dialog").waitFor({ state: "detached" });
    const open = await page.getByTestId("open-evidence").innerText();
    expect(open).toContain("Sustainable definition");
    expect(open).not.toMatch(/\.py\b|production|8,451|6,501/i);
    expect(pageErrors).toEqual([]);
  });

  test("theme toggle persists; the dataset reference lists six datasets", async () => {
    await go("tldr");
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");
    await page.getByTestId("theme-toggle").click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    await page.reload();
    await page.waitForSelector("main h1");
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    await page.getByTestId("workloads-info").click();
    const dialog = page.getByTestId("workloads-dialog");
    await dialog.waitFor();
    expect(await page.locator("[data-workload-card]").count()).toBe(6);
    expect(await dialog.innerText()).not.toMatch(/No measured run/);
    expect(await dialog.locator('[data-tag="prefix-immune"] svg').count()).toBeGreaterThan(0);
    expect(await dialog.locator('[data-slot="distribution-bar"]').count()).toBe(6);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    expect(pageErrors).toEqual([]);
  });

  test("no visible text or title attribute names the source repository (atlas) or internal artefacts", async () => {
    const leaks = async () => page.evaluate(() => {
      const scrub = (text: string) => text.replace(/MCP[- ]Atlas/g, "");
      const texts = [document.body.innerText, ...[...document.querySelectorAll("[title]")].map((el) => el.getAttribute("title") ?? "")];
      return texts.map(scrub).filter((text) => /\batlas\b|separate execution repository|\w\.py\b|\w\.ya?ml\b/i.test(text)).map((text) => text.slice(0, 120));
    });
    for (const path of routes) {
      await go(path);
      expect({ path, leaks: await leaks() }).toEqual({ path, leaks: [] });
    }
    // Catalog prose (configuration notes, recheck text) is rendered verbatim in the evidence sheet.
    await go("deployments");
    await page.locator('[data-action="open-run"]').first().click();
    await page.locator('[data-drawer-details]').first().waitFor();
    for (const details of await page.locator("[data-drawer-details]").all()) await details.evaluate((el) => { (el as HTMLDetailsElement).open = true; });
    expect(await leaks()).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("models and TL;DR variant rows open the evidence sheet from the keyboard", async () => {
    await go("models?model=qwen3.8-27b&tab=overview");
    await page.locator("[data-export-toggle]").first().click();
    const opener = page.locator("[data-variant-row] [data-action=\"open-run\"]").first();
    await opener.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await go("tldr");
    // Unmeasured ladder rows sit in collapsed export blocks: open the first one.
    await page.locator("[data-export-toggle]").first().click();
    const variant = page.locator("[data-variant-row] [data-action=\"open-run\"]").first();
    await variant.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor();
    expect(pageErrors).toEqual([]);
  });

  test("deployments: the GPUs facet is written to and restored from the URL", async () => {
    await go("deployments");
    const count = page.getByTestId("result-count");
    await page.locator('[data-facet="gpus"]').click();
    const option = page.locator("[data-facet-option]").first();
    const value = await option.getAttribute("data-facet-option");
    await option.click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => location.hash.includes("shape="));
    const filtered = await count.innerText();
    expect(filtered).not.toBe("54 of 54");
    await page.reload();
    await page.waitForSelector("main h1");
    expect(await count.innerText()).toBe(filtered);
    expect(await page.evaluate(() => new URLSearchParams(location.hash.split("?")[1]).get("shape"))).toBe(value);
    expect(pageErrors).toEqual([]);
  });

  test("390px: radar labels stay inside the chart, argument tables wrap, metric strip uses two columns", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go("compare?runs=qwen3.8-27b.fp8.vllm.baseline,gemma-4-31b-it.nvfp4.vllm.baseline,glm-5.3.fp8.vllm.baseline,kimi-k3.native.vllm.baseline");
    await page.locator("[data-slot=radar-chart] .recharts-polar-angle-axis-tick").first().waitFor();
    const outside = await page.evaluate(() => {
      const box = document.querySelector("[data-slot=radar-chart]")!.getBoundingClientRect();
      return [...document.querySelectorAll(".recharts-polar-angle-axis-tick")].filter((tick) => { const r = tick.getBoundingClientRect(); return r.left < box.left - 0.5 || r.right > box.right + 0.5; }).map((tick) => tick.textContent);
    });
    expect(outside).toEqual([]);
    await go("engine?pair=glm-5.3.fp8@8");
    await page.locator("[data-arg-row]").first().waitFor();
    const widths = await page.evaluate(() => [...new Set([...document.querySelectorAll("[data-arg-row]")].map((row) => row.closest("table")!))].map((table) => table.scrollWidth - table.parentElement!.clientWidth));
    for (const extra of widths) expect(extra).toBeLessThanOrEqual(1);
    await go("throughput");
    const lefts = await page.getByTestId("performance-strip").locator("[data-slot=kpi-row-metric]").evaluateAll((cells) => [...new Set(cells.map((cell) => Math.round(cell.getBoundingClientRect().left)))]);
    expect(lefts.length).toBe(2);
    expect(pageErrors).toEqual([]);
  });

    test("top bar: dataset and SLO on the left, provenance and theme on the right", async () => {
    await go("tldr");
    const slo = await page.getByTestId("slo-trigger").boundingBox();
    const badge = await page.getByTestId("data-badge").boundingBox();
    const theme = await page.getByTestId("theme-toggle").boundingBox();
    expect(slo!.x).toBeLessThan(badge!.x);
    expect(badge!.x).toBeLessThan(theme!.x);
    expect(slo!.x).toBeLessThan(900);
  });
});

describe("measured-data views (TEST fixture runs via RUNS_FILE)", () => {
  beforeEach(async () => { origin = measured; await open(); });

  test("TL;DR champion row shows sustainable capacity and the SLO verdict from fixture runs", async () => {
    await go("tldr");
    const row = await page.locator('[data-workload-row="single-turn-8k"]').innerText();
    expect(row).toContain("2,882,918");
    expect(row).toContain("pass");
    // Measured rows bring back the ladder's SLO-levels and latest-run columns.
    expect(await page.getByTestId("variant-ladder").locator("th").allInnerTexts()).toContain("SLO levels");
    expect(pageErrors).toEqual([]);
  });

  test("fixture runs raise a persistent TEST DATA banner on every route", async () => {
    for (const route of ["tldr", "throughput?run=qwen3.8-27b.fp8.vllm.baseline", "compare", "methodology"]) {
      await go(route);
      const banner = page.getByTestId("test-data-banner");
      expect(await banner.innerText()).toContain("TEST DATA — invented values");
      // Non-dismissible: no control inside it.
      expect(await banner.locator("button, a").count()).toBe(0);
    }
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(100);
    expect(await page.getByTestId("test-data-banner").isVisible()).toBe(true);
    expect(await page.getByTestId("data-badge").innerText()).toMatch(/HF \+ AA · 3 runs \(TEST\)/);
    expect(pageErrors).toEqual([]);
  });

  test("throughput: C_max, sweep charts with a concurrency tooltip, and PNG download", async () => {
    await go("throughput?run=qwen3.8-27b.fp8.vllm.baseline");
    expect(await page.getByTestId("throughput-identity").innerText()).toContain("Measured");
    // Fixture (TEST data): C_max 64 with 7 of 8 levels inside the SLO; sustainable = total tok/s at C_max × 0.8 × 60 ÷ GPUs.
    const strip = page.getByTestId("performance-strip");
    expect(await strip.getAttribute("data-measured")).toBe("true");
    const stripText = await strip.innerText();
    expect(stripText).toMatch(/7 of 8 levels in SLO/);
    expect(stripText).toContain("2,882,918");
    // Per-level table: collapsed native <details>, rows mounted; the summary names the level count.
    const levels = page.getByTestId("concurrency-details");
    expect(await levels.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    expect(await levels.locator("summary").innerText()).toContain("8 levels");
    expect(await page.getByTestId("concurrency-table").locator("tbody tr").count()).toBe(8);
    expect(await page.getByTestId("run-history").isDisabled()).toBe(false);
    const panel = page.locator('[data-chart-panel="throughput-per-gpu"]');
    await panel.waitFor();
    await panel.scrollIntoViewIfNeeded();
    const box = await panel.locator("svg.recharts-surface").boundingBox();
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(150);
    expect(await page.getByText(/concurrent requests/).count()).toBeGreaterThan(0);
    const section = page.locator("section", { has: panel });
    const [download] = await Promise.all([page.waitForEvent("download"), section.locator('[data-chart-action="download"]').first().click()]);
    expect(download.suggestedFilename()).toBe("bench-console-throughput-per-gpu.png");
    const bytes = new Uint8Array(await Bun.file(await download.path()).arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(pageErrors).toEqual([]);
  });

  test("intelligence frontier: Tab moves between points, Enter selects, focus survives re-render", async () => {
    await go("intelligence");
    const points = page.locator('[data-chart-panel="aa-index-versus-sustainable-throughput"] [data-point-id]');
    await points.first().waitFor();
    expect(await points.count()).toBeGreaterThanOrEqual(2);
    await points.first().focus();
    const first = (await active())?.id;
    await page.keyboard.press("Tab");
    const second = (await active())?.id;
    expect(second && second !== first).toBe(true);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    expect((await active())?.id).toBe(second);
    expect(await page.locator(`[data-point-id="${second}"]`).first().getAttribute("aria-pressed")).toBe("true");
    expect(pageErrors).toEqual([]);
  });

  test("compare on a dataset with a measured sibling: remove works and Add does not offer the sibling", async () => {
    await go("compare?workload=chat-8-turn&runs=qwen3.8-27b.fp8.vllm.baseline,qwen3.8-27b.bf16.vllm.baseline");
    const chip = page.locator('[data-compare-chip="qwen3.8-27b.fp8.vllm.baseline@chat-8-turn"]');
    await chip.waitFor();
    expect(await page.locator('[data-compare-row="qwen3.8-27b.fp8.vllm.baseline@chat-8-turn"]').getAttribute("data-measured")).toBe("true");
    await page.getByTestId("add-compare").click();
    await page.locator("[cmdk-item]").first().waitFor();
    expect(await page.locator('[cmdk-item][data-value*="@chat-8-turn"]').count()).toBe(0);
    await page.keyboard.press("Escape");
    await chip.getByRole("button", { name: /^Remove/ }).click();
    await page.waitForFunction(() => !location.hash.includes("qwen3.8-27b.fp8.vllm.baseline"));
    expect(await page.locator("[data-compare-chip]").count()).toBe(1);
    expect(pageErrors).toEqual([]);
  });

  test("throughput: picking or linking a measured sibling stores its base configuration id", async () => {
    const runParam = () => page.evaluate(() => new URLSearchParams(location.hash.split("?")[1]).get("run"));
    await go("throughput?workload=chat-8-turn&run=qwen3.8-27b.bf16.vllm.baseline");
    await page.getByTestId("run-picker").click();
    await page.locator('[cmdk-item][data-value$="qwen3.8-27b.fp8.vllm.baseline@chat-8-turn"]').click();
    await page.waitForFunction(() => location.hash.includes("run=qwen3.8-27b.fp8.vllm.baseline"));
    expect(await runParam()).toBe("qwen3.8-27b.fp8.vllm.baseline");
    // A shared link carrying a sibling id resolves to the base configuration on another dataset.
    await go("throughput?workload=single-turn-8k&run=qwen3.8-27b.fp8.vllm.baseline@chat-8-turn");
    await page.getByRole("tab", { name: "Configuration" }).click();
    await page.waitForFunction(() => location.hash.includes("tab=configuration"));
    expect(await runParam()).toBe("qwen3.8-27b.fp8.vllm.baseline");
    expect(await page.getByTestId("run-identity").innerText()).toContain("qwen3.8-27b-fp8");
    expect(pageErrors).toEqual([]);
  });

  test("evidence sheet Compare button on the Compare page adds to the compared set", async () => {
    await go("compare?runs=qwen3.8-27b.fp8.vllm.baseline");
    await page.locator('[data-compare-chip] button').first().click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("dialog").getByRole("button", { name: "Compare", exact: true }).click();
    await page.getByText("Already compared").first().waitFor();
    expect(await page.locator("[data-compare-chip]").count()).toBe(1);
    expect(pageErrors).toEqual([]);
  });

  test("compare draws sweep charts for measured configurations", async () => {
    await go("compare?runs=qwen3.8-27b.fp8.vllm.baseline,qwen3.8-27b.fp8.sglang.baseline");
    expect(await page.getByTestId("compare-charts").count()).toBe(1);
    // Sustainable total tok/min/GPU at C_max per measured configuration, plus the per-level SLO grid.
    for (const cell of await page.locator('[data-compare-row][data-measured] [data-cell="sustainable"]').allInnerTexts()) expect(cell).not.toBe("—");
    // Head-to-head series are labelled by what differs (here the engine), so two configurations never share a label.
    const sustainableCard = await page.locator('[data-testid="compare-head-to-head"] [data-metric="Sustainable throughput"]').innerText();
    expect(sustainableCard).toContain("vLLM");
    expect(sustainableCard).toContain("SGLang");
    expect(await page.locator('[data-testid="slo-grid"] [data-level-cell="pass"]').count()).toBeGreaterThan(0);
    // Throughput, ITL, TTFT and success rate against concurrency, plus throughput against per-user speed (interactivity).
    for (const slug of ["total-throughput-per-gpu", "itl", "ttft-p95", "success-rate", "throughput-vs-interactivity"]) {
      expect(await page.locator(`[data-testid="compare-charts"] [data-chart-panel="${slug}"]`).count()).toBe(1);
    }
    const interactivity = page.locator('[data-chart-panel="throughput-vs-interactivity"] [role="img"]');
    expect(await interactivity.getAttribute("aria-label")).toContain("ring marks C_max");
    expect(await page.locator('[data-chart-panel="throughput-vs-interactivity"] .recharts-scatter-line').count()).toBeGreaterThan(0);
    expect(pageErrors).toEqual([]);
  });
});
