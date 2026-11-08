/**
 * Browser checks against the built bundle (run `bun run build` first).
 *
 * Two servers:
 *  - offline preview (scripts/preview.ts): the shipped console, atlas + Hugging Face + Artificial Analysis only;
 *  - API server with RUNS_FILE=tests/fixtures/sample-runs.json: TEST-labelled runs, used only to exercise the
 *    measured-data views (sweeps, frontier, tooltips). Those values are invented test inputs, not measurements.
 *
 * Covers: one h1 per route, no error state, no horizontal overflow at 1440 and 390 px, no page errors,
 * filters/sort/URL sync, TL;DR setups (model/shape/sort URL, Δ vs best, ±3% ties, unmeasured last), links to the
 * setups from Models / Throughput (model → quant picker) / Deployments (Precision column) / ⌘K, compare, focus return for the evidence sheet and ⌘K, ⌘K page matching, chart-point
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
  "deployments", "published", "new-benchmark", "methodology",
];
const aliases: [string, RegExp][] = [
  ["overview", /#\/tldr/], ["intelligence-vs-throughput", /#\/intelligence/],
  ["sustainable-throughput", /#\/throughput/], ["compare-benchmarks", /#\/compare/],
  ["versus", /#\/engine/], ["runtimes", /#\/engine/], ["models?model=glm-5.3&tab=engines", /#\/engine\?.*model=glm-5\.3/],
  ["quant", /#\/models\?.*model=qwen3\.8-27b.*tab=precision/], ["quantization", /#\/models\?.*tab=precision/],
  ["hardware", /#\/deployments/], ["experiments", /#\/new-benchmark/],
];
const navLabels = ["TL;DR", "Intelligence", "Throughput", "Compare", "Engine", "Models", "Deployments", "Published", "New benchmark", "Methodology"];

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

/**
 * Open a Combobox and wait until its search input has focus. Typing right after the click can otherwise race the
 * popover's focus move (Radix focuses the content in an effect) and drop keystrokes under load; a previous popover
 * of the same picker must have left the DOM first so only one list is queried.
 */
async function openCombobox(testId: string): Promise<void> {
  await page.locator('[data-slot="popover-content"]').waitFor({ state: "detached" });
  await page.getByTestId(testId).click();
  await page.waitForFunction(() => document.activeElement?.hasAttribute("cmdk-input") === true);
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

  test("TL;DR: one ranked setups table, details in a right sheet; unmeasured cells are '—', no AA, no extra blocks", async () => {
    await go("tldr");
    // Default model without runs: the first catalog model. Controls: model and GPU shape only (always ranked by sustainable).
    expect(await page.getByTestId("tldr-model").innerText()).toContain("Kimi K3");
    expect(await page.getByTestId("tldr-shape").count()).toBe(1);
    expect(await page.getByTestId("tldr-sort").count()).toBe(0);
    // One table and nothing else on the page: no summary blocks, champions, filters or published block.
    const table = page.getByTestId("setups-table");
    expect(await table.locator("[data-setup-row]").count()).toBe(5);
    expect(await table.locator('[data-setup-row][data-standing="unmeasured"]').count()).toBe(5);
    expect(await page.locator("main section").count()).toBe(1);
    for (const id of ["tldr-overview", "winner-gaps", "export-engine-matrix", "workload-comparison", "published-results", "setup-filters"]) expect(await page.getByTestId(id).count()).toBe(0);
    expect(await page.locator("main details, [data-published-row]").count()).toBe(0);
    // Unmeasured: one "Not measured" badge per row, never a bar or 0; the metric columns collapse into one.
    expect(await table.getByTestId("setup-not-measured").count()).toBe(5);
    expect(await table.locator("[data-bar]").count()).toBe(0);
    expect(await table.getAttribute("data-collapsed")).toBe("true");
    expect(await table.getByTestId("metrics-not-measured").count()).toBe(1);
    expect(await table.innerText()).not.toMatch(/(^|\s)0 tok/);
    expect(await table.innerText()).not.toContain("not recorded");
    const caption = await page.getByTestId("setups-caption").innerText();
    expect(caption).toContain("No measured setup on single-turn-8k yet; the ranking appears once runs are imported");
    expect(await page.getByTestId("compare-top").isDisabled()).toBe(true);
    expect(await page.locator("#compare-top-note").textContent()).toContain("Needs ≥2 measured setups");
    // Published results are only a count on the row; the records themselves are in the sheet.
    const counts = await table.locator("[data-published-count]").evaluateAll((items) => items.map((item) => Number(item.getAttribute("data-published-count"))));
    expect(counts.length).toBeGreaterThan(0);
    // A row click opens the setup sheet on the right: planning note instead of empty KPIs, knobs, serve command.
    await table.locator("[data-setup-row]").first().click();
    const sheet = page.getByTestId("setup-sheet");
    await sheet.waitFor();
    expect(await sheet.getByTestId("setup-kpis").count()).toBe(0);
    expect(await sheet.getByTestId("setup-not-measured").innerText()).toContain("Not measured on single-turn-8k");
    expect(await sheet.getByTestId("setup-knobs").count()).toBe(1);
    expect(await sheet.getByTestId("setup-command").innerText()).toContain("serve");
    // Opening focuses the sheet itself, so no tooltip opens on its own.
    expect(await page.locator('[data-slot="tooltip-content"]').count()).toBe(0);
    const box = await sheet.boundingBox();
    expect(box!.x + box!.width).toBeGreaterThanOrEqual(1439);
    await page.keyboard.press("Escape");
    await sheet.waitFor({ state: "detached" });
    // No Artificial Analysis element on the TL;DR (it lives on Intelligence and Models).
    expect(await page.locator("main").innerText()).not.toMatch(/\bAA\b|Artificial Analysis|Intelligence Index/);
    expect(await page.getByTestId("data-badge").innerText()).toContain("HF + AA");
    expect(await page.getByTestId("test-data-banner").count()).toBe(0);
    expect(pageErrors).toEqual([]);
  });

  test("TL;DR: model and shape live in the URL; legacy alias keeps them", async () => {
    await go("tldr?model=qwen3.8-27b");
    expect(await page.getByTestId("tldr-model").innerText()).toContain("Qwen 3.8 27B");
    expect(await page.locator("[data-setup-row]").count()).toBe(13);
    // Switching model: one click on the combobox, then choose (searchable, grouped by publisher).
    // Search is a contiguous substring (not cmdk's fuzzy subsequence): "gemma" highlights Gemma, never GLM 5.3.
    await openCombobox("tldr-model");
    await page.keyboard.type("gemma");
    expect(await page.locator("[cmdk-item]").allInnerTexts()).toEqual([expect.stringContaining("Gemma 4 31B IT")]);
    expect(await page.locator('[cmdk-item][data-selected="true"]').getAttribute("data-value")).toBe("gemma-4-31b-it");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash.includes("model=gemma-4-31b-it"));
    expect(await page.locator("[data-setup-row]").count()).toBe(4);
    await openCombobox("tldr-model");
    await page.keyboard.type("Qwen 3.8 27");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash.includes("model=qwen3.8-27b") && !location.hash.includes("flash"));
    // GPU shape filter: Mistral Medium 3.5 runs on several shapes.
    await go("tldr?model=mistral-medium-3.5");
    const all = await page.locator("[data-setup-row]").count();
    await page.getByTestId("tldr-shape").click();
    await page.getByRole("option", { name: /8× B300/ }).click();
    await page.waitForFunction(() => /shape=8xB300/.test(location.hash));
    const eight = await page.locator("[data-setup-row]").count();
    expect(eight).toBeGreaterThan(0);
    expect(eight).toBeLessThan(all);
    await page.reload();
    await page.waitForSelector("[data-setup-row]");
    expect(await page.locator("[data-setup-row]").count()).toBe(eight);
    // An unknown shape falls back to all shapes; the legacy alias canonicalizes and keeps the parameters.
    await go("tldr?model=qwen3.8-27b&shape=9xZ999");
    expect(await page.locator("[data-setup-row]").count()).toBe(13);
    await go("overview?model=qwen3.8-27b");
    expect(page.url()).toMatch(/#\/tldr\?.*model=qwen3\.8-27b/);
    expect(await page.locator("[data-setup-row]").count()).toBe(13);
    expect(pageErrors).toEqual([]);
  });

  test("TL;DR at 390 px: the table fits, rows stay readable, the sheet takes the full width", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go("tldr?model=qwen3.8-27b");
    const rows = page.locator("tr[data-setup-row]");
    expect(await rows.count()).toBe(13);
    expect(await overflow()).toBeLessThanOrEqual(0);
    const table = page.getByTestId("setups-table");
    expect(await table.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    // Every badge stays inside its row.
    const chipsOut = await page.locator('tr[data-setup-row] [data-slot="badge"]').evaluateAll((chips) => chips.filter((chip) => {
      const box = chip.getBoundingClientRect(), row = chip.closest("tr")!.getBoundingClientRect();
      return box.right > row.right + 0.5 || chip.scrollWidth > chip.clientWidth + 1;
    }).length);
    expect(chipsOut).toBe(0);
    await rows.first().locator('[data-action="open-setup"]').click();
    const sheet = page.getByTestId("setup-sheet");
    await sheet.waitFor();
    expect(Math.round((await sheet.boundingBox())!.width)).toBe(390);
    // Nothing in the sheet scrolls sideways except the serve command's own code box.
    expect(await sheet.evaluate((el) => [el, ...el.querySelectorAll("*")].filter((child) => child.tagName !== "PRE" && !child.closest("pre") && !child.classList.contains("sr-only") && child.scrollWidth > child.clientWidth + 1 && getComputedStyle(child).overflowX !== "visible").length)).toBe(0);
    expect(await sheet.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.keyboard.press("Escape");
    await openCombobox("tldr-model");
    await page.keyboard.type("gemma");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash.includes("model=gemma-4-31b-it"));
    expect(await overflow()).toBeLessThanOrEqual(0);
    expect(pageErrors).toEqual([]);
  });

  test("TL;DR published results (external) sit in the setup sheet, outside the ranking: source, audit class, differs", async () => {
    await go("tldr");
    // Kimi K3 (default offline model): rows with published records carry only a count.
    const row = page.locator('tr[data-setup-row="kimi-k3.native.vllm.baseline"]');
    const count = Number(await row.locator("[data-published-count]").getAttribute("data-published-count"));
    expect(count).toBeGreaterThan(0);
    await row.click();
    const section = page.getByTestId("setup-published");
    await section.waitFor();
    const records = section.locator("[data-published-record]");
    expect(await records.count()).toBe(count);
    // Every published number: a source link and an engine-version audit class; never "sustainable", no Δ or bar.
    for (const record of await records.all()) {
      expect(await record.locator("[data-source-link]").getAttribute("href")).toMatch(/^https?:\/\//);
      expect(await record.getByTestId("version-class").count()).toBe(1);
    }
    expect(await section.innerText()).not.toMatch(/sustainable/i);
    expect(await section.locator("[data-delta], [data-bar]").count()).toBe(0);
    expect(await section.innerText()).toContain("never ranked");
    // A linked record that states differences says "differs" and lists them; figures always have a load level.
    expect(await section.locator("[data-no-throughput]").count()).toBe(0);
    for (const record of await records.all()) {
      if (await record.locator("[data-differs]").count()) expect(await record.innerText()).toContain("Differs from this setup:");
    }
    for (const load of await section.locator("[data-load]").all()) expect((await load.innerText()).trim().length).toBeGreaterThan(0);
    expect(await section.getByRole("link", { name: "All published results for this model" }).getAttribute("href")).toMatch(/^#\/published\?.*model=kimi-k3/);
    expect(pageErrors).toEqual([]);
  });

  test("fewer clicks to quant throughput: Models, Throughput, Deployments and ⌘K lead to the setups", async () => {
    // Models › detail: the primary action opens the TL;DR for this model; each ladder row links to Throughput.
    await go("models?model=gemma-4-31b-it&tab=overview");
    const compareSetups = page.getByTestId("model-compare-setups");
    expect(await compareSetups.innerText()).toContain("Compare all setups");
    const ladderLinks = page.locator('[data-testid="variant-ladder"] [data-throughput-link]');
    expect(await ladderLinks.count()).toBe(await page.locator('[data-testid="variant-ladder"] [data-variant-row]').count());
    await compareSetups.click();
    await page.waitForFunction(() => location.hash.startsWith("#/tldr") && location.hash.includes("model=gemma-4-31b-it"));
    await page.locator("[data-setup-row]").first().waitFor();
    expect(await page.getByTestId("tldr-model").innerText()).toContain("Gemma 4");
    expect(await page.locator("[data-setup-row]").count()).toBe(4);
    await go("models?model=gemma-4-31b-it&tab=overview");
    await page.locator('[data-testid="variant-ladder"] [data-export-toggle]').first().click();
    const firstLink = ladderLinks.first();
    const run = await firstLink.getAttribute("data-throughput-link");
    await firstLink.click();
    await page.waitForFunction((id) => location.hash.startsWith("#/throughput") && location.hash.includes(`run=${id}`), run);
    // Throughput: the runtime-config picker lists this model's setups on the selected runtime and hardware, grouped by
    // weights export, so a quant is one interaction away; other models are one Base model pick away.
    await go("throughput?run=qwen3.8-27b.bf16.vllm.baseline");
    await page.getByTestId("throughput-model").click();
    expect(await page.locator('[cmdk-item][data-value="gemma-4-31b-it"]').count()).toBe(1);
    await page.keyboard.press("Escape");
    await page.locator('[data-slot="popover-content"]').waitFor({ state: "detached" });
    await page.getByTestId("run-picker").click();
    const headings = await page.locator("[cmdk-group-heading]").allInnerTexts();
    expect(headings).toEqual(["Qwen 3.8 27B · BF16", "Qwen 3.8 27B · FP8", "Qwen 3.8 27B · NVFP4 · NVIDIA"]);
    const fp8 = page.locator("[cmdk-group]", { has: page.locator("[cmdk-group-heading]", { hasText: /^Qwen 3\.8 27B · FP8$/ }) });
    expect(await fp8.locator("[cmdk-item]").first().innerText()).toContain("not measured");
    await fp8.locator('[cmdk-item][data-value$="qwen3.8-27b.fp8.vllm.baseline"]').click();
    await page.waitForFunction(() => location.hash.includes("run=qwen3.8-27b.fp8.vllm.baseline"));
    const allSetups = page.getByTestId("throughput-all-setups");
    expect(await allSetups.getAttribute("href")).toContain("#/tldr?");
    await allSetups.click();
    await page.waitForFunction(() => location.hash.startsWith("#/tldr") && location.hash.includes("model=qwen3.8-27b"));
    await page.locator("[data-setup-row]").first().waitFor();
    expect(await page.locator("[data-setup-row]").count()).toBe(13);
    // Deployments: the Precision column is visible by default and sorts by bit width.
    await go("deployments");
    expect(await page.locator("th", { hasText: /^Precision$/ }).count()).toBe(1);
    const cells = page.locator("tbody tr[data-row-id] [data-precision-cell]");
    expect(await cells.count()).toBe(54);
    const precisionHeader = page.locator("th", { hasText: /^Precision$/ });
    await precisionHeader.getByRole("button").click();
    await precisionHeader.locator('button[data-sorted="true"]').waitFor();
    // Ascending: BF16 first, NVFP4 last.
    expect(await cells.first().getAttribute("data-precision-cell")).toBe("BF16");
    const order = ["BF16", "FP8", "FP4/FP8", "MXFP4", "NVFP4"];
    const ranks = (await cells.evaluateAll((items) => items.map((item) => item.getAttribute("data-precision-cell") ?? ""))).map((value) => order.indexOf(value));
    expect(ranks.every((value, index) => index === 0 || value >= ranks[index - 1]!)).toBe(true);
    // ⌘K: "Compare setups: <model>" opens the TL;DR for that model.
    const opener = page.getByRole("button", { name: "Export CSV" });
    await opener.focus();
    await page.keyboard.press(`${mod}+k`);
    const input = page.getByPlaceholder("Search pages, models, configurations…");
    await input.waitFor();
    await input.fill("compare setups gemma");
    const group = page.locator("[cmdk-group]", { hasText: "Compare setups" }).locator("[cmdk-item]");
    expect((await group.allInnerTexts()).map((text) => text.split("\n")[0])).toEqual(["Compare setups: Gemma 4 31B IT"]);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash.startsWith("#/tldr") && location.hash.includes("model=gemma-4-31b-it"));
    await page.locator("[data-setup-row]").first().waitFor();
    expect(await page.locator("[data-setup-row]").count()).toBe(4);
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
    // Baseline pair: folded into the matchup as a closed disclosure (no second pair card on the page).
    const pairDetails = page.getByTestId("engine-baseline-pair");
    expect(await pairDetails.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    expect(await pairDetails.evaluate((el) => el.closest("#engine-matchup") !== null)).toBe(true);
    await pairDetails.locator("summary").click();
    // Engine cards: engine · configured build is the title; the release recheck is the secondary line; one status palette.
    expect(await page.locator('[data-engine-side="vLLM"]').innerText()).toMatch(/^vLLM · source snapshot/);
    // The atlas B300 flag reads as catalog evidence; offline there is no "Measured here" badge.
    expect(await page.locator('[data-engine-side="vLLM"] [data-catalog-target]').innerText()).toMatch(/^Catalog: (no B300 validation record|B300 validation recorded)$/);
    expect(await page.locator("[data-measured-here]").count()).toBe(0);
    expect(await page.locator('[data-engine-side] [data-status="candidate"][data-variant="info"]').count()).toBeGreaterThan(0);
    // Not measured: no chart frames and no placeholder block (the matchup cards already say "Not measured").
    expect(await page.getByTestId("engine-charts-empty").count()).toBe(0);
    expect(await page.locator('[data-empty-chart="true"]').count()).toBe(0);
    // Configured builds and rechecks sit collapsed inside Every measured version (no separate timeline panel).
    const builds = page.getByTestId("runtime-versions-disclosure");
    expect(await builds.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    expect(await builds.evaluate((el) => el.closest("#engine-versions") !== null)).toBe(true);
    await builds.locator("summary").click();
    const versions = await page.getByTestId("runtime-versions").innerText();
    // GLM 5.3 configurations record a source snapshot, not a release; the v0.33.0 recheck is shown separately.
    expect(versions).toContain("vllm (source snapshot, no release tag)");
    expect(versions).toContain("Rechecked v0.33.0 · arguments not revalidated");
    expect(pageErrors).toEqual([]);
  });

  test("engine offline: matchup shows the pair with — and no verdict; verdicts and versions stay compact", async () => {
    await go("engine?pair=glm-5.3.fp8@8");
    // Matchup: both engines, dashed and unmeasured, values "—" (never 0), no verdict.
    expect(await page.getByTestId("matchup-verdict").getAttribute("data-verdict-kind")).toBe("none");
    expect(await page.getByTestId("matchup-verdict").innerText()).toBe("Not measured · no verdict");
    for (const engine of ["vLLM", "SGLang"]) {
      const card = page.locator(`[data-matchup-engine="${engine}"]`);
      expect(await card.getAttribute("data-measured")).toBe("false");
      expect(await card.getByTestId("matchup-value").innerText()).toBe("—");
      expect(await card.getByTestId("matchup-cmax").innerText()).toContain("no run on this dataset");
    }
    expect(await page.getByTestId("matchup-scope").innerText()).toContain("8× B300 · single-turn-8k");
    // Per-workload verdicts collapse to one block of workload chips; Every measured version to one line.
    expect(await page.getByTestId("engine-verdicts").getAttribute("data-collapsed")).toBe("true");
    expect(await page.locator('[data-verdict-workload][data-verdict-kind="none"]').count()).toBe(6);
    expect(await page.locator('[data-verdict-workload="single-turn-8k"] [data-profile="Balanced"]').count()).toBe(1);
    expect(await page.getByTestId("engine-versions-empty").count()).toBe(1);
    expect(await page.locator("[data-version-row]").count()).toBe(0);
    // Add both to compare fills the selection tray (no hidden menu).
    // Offline: no pair cards at all (nothing measured).
    expect(await page.getByTestId("engine-head-to-head").count()).toBe(0);
    await page.getByTestId("matchup-add-compare").click();
    expect(await page.getByRole("region", { name: "Selected configurations" }).innerText()).toContain("2 selected");
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
    // Selector row: model, runtime (configured build), hardware and runtime config; Workloads and Add to compare are
    // visible header buttons; the run picker appears only once runs exist; Evidence and Plan run sit in one overflow menu.
    const selectors = page.getByTestId("throughput-selectors");
    for (const id of ["throughput-model", "throughput-runtime", "throughput-hardware", "run-picker"]) {
      expect(await selectors.getByTestId(id).isVisible()).toBe(true);
    }
    // Workloads and Add to compare are visible header buttons (not in the overflow menu).
    for (const id of ["throughput-workloads", "throughput-add-compare"]) {
      expect(await page.locator("main header").getByTestId(id).isVisible()).toBe(true);
    }
    expect(await page.getByTestId("throughput-model").innerText()).toContain("GLM 5.3");
    expect(await page.getByTestId("throughput-runtime").innerText()).toContain("vLLM · source snapshot");
    expect(await page.getByTestId("throughput-hardware").innerText()).toContain("8× B300 · TP8");
    expect(await page.getByTestId("run-picker").innerText()).toContain("mtp ×5");
    expect(await page.getByTestId("run-history").count()).toBe(0);
    expect(await page.getByTestId("throughput-more").count()).toBe(1);
    // Identity line (offline): hardware, GPU totals and knob chips; no doubled separators.
    const identity = page.getByTestId("throughput-identity");
    expect(await identity.innerText()).not.toContain("·  ·");
    expect(await identity.getByTestId("identity-hardware").innerText()).toBe("8× B300");
    // Offline: the catalog shape at one KServe replica, stated as such (the catalog carries no replica count).
    expect(await identity.getByTestId("identity-gpus").innerText()).toBe("8 GPUs per replica · 8 GPUs total (1 replica)");
    // The knob chips are stated once, in the Runtime config trigger above, not repeated on the identity line.
    expect(await identity.getByTestId("config-chips").count()).toBe(0);
    // KPI strip header (offline): profile, budget, ceilings, preset switch and threshold chips stay for planning.
    expect(await strip.locator('[data-profile="Balanced"]').count()).toBe(1);
    expect(await strip.getByTestId("strip-budget").innerText()).toContain("8,000 in / 500 out");
    expect(await strip.getByTestId("strip-budget").innerText()).toContain("ITL p95 ≤ 26 ms");
    // The thresholds are stated once, in the strip header (the top bar owns the full SLO popover).
    expect(await strip.getByTestId("strip-budget").innerText()).toContain("ITL p95 ≤ 26 ms");
    expect(await strip.locator('[data-strip-preset="classic"]').getAttribute("data-state")).toBe("on");
    await strip.locator('[data-strip-preset="low-latency"]').click();
    expect(await page.getByTestId("strip-ttft-ceiling").innerText()).toContain("3,077 ms");
    expect(await page.getByTestId("slo-compact").innerText()).toContain("Low-latency");
    await strip.locator('[data-strip-preset="classic"]').click();
    await page.getByTestId("throughput-workloads").click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Serve command" }).click();
    expect(await page.getByTestId("throughput-serve-command").locator("code").innerText()).toContain("vllm serve zai-org/GLM-5.3 \\");
    expect(await page.getByTestId("throughput-serve-command").innerText()).toContain("Configured command (catalog)");
    // Offline there is no run, so no "run recorded different values" note.
    expect(await page.getByTestId("serve-run-overrides").count()).toBe(0);
    expect(pageErrors).toEqual([]);
  });

  test("configured engine build vs latest recheck (qwen3.8-27b FP8 · v0.31 FlashInfer FP8 KV)", async () => {
    await go("throughput?run=qwen3.8-27b.fp8.vllm.v031.fi-fp8-kv&tab=configuration");
    expect(await page.getByTestId("run-identity").innerText()).toContain("vllm-v0.31.0");
    const recheck = await page.getByTestId("recheck-details").innerText();
    expect(recheck).toContain("v0.33.0");
    expect(recheck).toContain("Catalog: no B300 validation record");
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
    // External published results: one short section with the evidence class, exclusions and the six audit classes.
    const external = await page.getByTestId("methodology-external").innerText();
    expect(external).toMatch(/External \(published\)[\s\S]*Excluded from[\s\S]*sustainable throughput[\s\S]*No SLO is applied/);
    expect(external).toMatch(/Hidden by default[\s\S]*Show weak records/);
    expect(await page.getByTestId("methodology-external").locator("[data-version-class]").count()).toBe(6);
    expect(pageErrors).toEqual([]);
  });

  test("published: weak records and invalid versions hidden by default, filters in the URL, coverage heatmap, row expansion", async () => {
    await go("published");
    const records = page.getByTestId("published-records");
    const rows = records.locator("tbody tr[data-record-id]");
    const count = async () => { const match = /^(\d+) of (\d+)$/.exec((await page.getByTestId("published-count").innerText()).trim()); return { shown: Number(match![1]), total: Number(match![2]) }; };
    // Default: weak records (invalid engine version, unverified extraction, superseded run) are hidden and counted.
    const initial = await count();
    const hidden = Number(/(\d+) hidden/.exec(await page.getByTestId("published-weak-hidden").innerText())![1]);
    expect(hidden).toBeGreaterThan(0);
    expect(initial.shown + hidden).toBe(initial.total);
    expect(await records.locator("[data-weak]").count()).toBe(0);
    expect(await records.locator('[data-version-class="invalid"]').count()).toBe(0);
    expect(await rows.count()).toBe(Math.min(20, initial.shown));
    // Share cards: each is a fraction of the filtered records, stated as "n of N".
    const shares = page.getByTestId("published-shares").locator("[data-share]");
    expect(await shares.count()).toBe(4);
    for (const share of await shares.all()) {
      expect(await share.innerText()).toMatch(new RegExp(`Records: [\\d,]+ of ${initial.shown.toLocaleString("en-US")}`));
      expect(Number(await share.getAttribute("data-count"))).toBeLessThanOrEqual(initial.shown);
    }
    // Every row carries source link, version audit badge and evidence badge on the card.
    expect(await rows.first().locator("[data-source-id]").count()).toBe(1);
    expect(await rows.first().locator("[data-version-class]").count()).toBe(1);
    expect(await records.locator('[data-evidence="external"]').count()).toBeGreaterThan(0);
    // Show weak records + Version audit "invalid": only invalid rows, flagged weak; both in the URL.
    await page.getByTestId("published-weak").click();
    expect((await count()).shown).toBe(initial.total);
    await page.locator('[data-facet="version audit"]').click();
    await page.locator('[data-facet-option="invalid"]').click();
    await page.keyboard.press("Escape");
    const invalid = await count();
    expect(invalid.shown).toBeGreaterThan(0);
    expect(await rows.count()).toBe(Math.min(20, invalid.shown));
    expect(await records.locator('tr[data-record-id] [data-version-class="invalid"]').count()).toBe(await rows.count());
    expect(await records.locator("tr[data-record-id] [data-weak]").count()).toBe(await rows.count());
    expect(decodeURIComponent(page.url())).toMatch(/version=invalid/);
    expect(page.url()).toMatch(/weak=1/);
    // Turning weak records off again hides every invalid record.
    await page.getByTestId("published-weak").click();
    expect((await count()).shown).toBe(0);
    await page.getByTestId("published-reset").click();
    expect((await count()).shown).toBe(initial.shown);
    // Model and GPU from the URL; a GPU chip and an engine facet narrow the list.
    await go("published?model=kimi-k3&hw=B300");
    expect((await count()).shown).toBeGreaterThan(0);
    expect(await records.locator('tr[data-record-id] [data-hardware]').evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-hardware")))])).toEqual(["B300"]);
    expect(await page.getByTestId("published-coverage-clear").innerText()).toMatch(/Kimi K3[\s\S]*B300/);
    const b300 = (await count()).shown;
    await page.locator('[data-hardware-chip="GB300"]').click();
    expect((await count()).shown).toBeGreaterThan(b300);
    for (const value of await records.locator('tr[data-record-id] [data-hardware]').evaluateAll((els) => els.map((el) => el.getAttribute("data-hardware")))) expect(["B300", "GB300"]).toContain(value!);
    expect(page.url()).toMatch(/hw=B300&hw=GB300|hw=GB300&hw=B300/);
    // A global view change (top-bar workload) keeps the Published filters in the URL.
    await page.getByTestId("workload-select").click();
    await page.getByRole("option", { name: /chat-8-turn/ }).click();
    await page.waitForFunction(() => location.hash.includes("workload=chat-8-turn"));
    expect(page.url()).toMatch(/model=kimi-k3/);
    expect(page.url()).toMatch(/hw=B300&hw=GB300|hw=GB300&hw=B300/);
    await page.locator('[data-facet="engine"]').click();
    await page.locator('[data-facet-option="vllm"]').click();
    await page.keyboard.press("Escape");
    expect(await records.locator('tr[data-record-id] [data-engine-family]').evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-engine-family")))])).toEqual(["vllm"]);
    // Coverage heatmap: models × GPU classes; a cell click filters to that model and GPU.
    await go("published");
    const coverage = page.getByTestId("published-coverage");
    expect(Number(await coverage.getAttribute("data-models"))).toBeGreaterThanOrEqual(10);
    const cell = coverage.locator('[data-slot="heatmap-chart-cell"]:not([data-missing])').first();
    await cell.click();
    expect(page.url()).toMatch(/model=[^&]+/);
    expect(page.url()).toMatch(/hw=/);
    await page.getByTestId("published-coverage-clear").click();
    expect(page.url()).not.toMatch(/model=/);
    // Expand a ladder: chart (x = concurrency, labelled axes), metric picker, levels table, facts and source link.
    await go("published?model=kimi-k3&hw=B300&kind=ladder");
    await rows.first().locator("[data-expand]").click();
    const detail = page.getByTestId("published-detail").first();
    await detail.waitFor();
    expect(await rows.first().locator("[data-expand]").getAttribute("aria-expanded")).toBe("true");
    expect(await detail.getByTestId("published-levels").locator("tbody tr").count()).toBeGreaterThan(1);
    expect(await detail.locator("[data-source-id]").count()).toBeGreaterThan(0);
    if (await detail.getByTestId("published-ladder-chart").count()) {
      expect(await detail.getByTestId("published-ladder-chart").innerText()).toContain("Concurrency (published levels)");
      expect(await detail.getByTestId("published-ladder-legend").innerText()).toContain("Published curve (external)");
    }
    // 390 px with a row expanded: stacked cards, the levels table scrolls inside its frame.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    expect(await overflow()).toBeLessThanOrEqual(0);
    expect(await records.locator("[data-stacked-record]").count()).toBeGreaterThan(0);
    expect(pageErrors).toEqual([]);
  });

  test("published: the records table fits its card and the expanded ladder detail's values stay in view (1440 and 390)", async () => {
    await go("published?model=kimi-k3&hw=B300");
    const records = page.getByTestId("published-records");
    const fits = () => records.locator('[data-slot="table-container"]').evaluate((el) => ({ scroll: el.querySelector("table")!.scrollWidth, client: el.clientWidth }));
    let size = await fits();
    expect(size.scroll).toBeLessThanOrEqual(size.client);
    // Default order: highest output tok/s/GPU first, records without one last.
    expect(await records.locator("tbody tr[data-record-id]").first().locator("[data-headline]").count()).toBe(1);
    await records.locator("tbody tr[data-record-id] [data-expand]").first().click();
    const detail = page.getByTestId("published-detail").first();
    await detail.waitFor();
    const inView = () => detail.getByTestId("published-levels").locator("tbody td").first().evaluate((cell) => {
      const r = cell.getBoundingClientRect();
      const frame = cell.closest('[data-slot="table-container"]')!.getBoundingClientRect();
      return r.left >= frame.left - 1 && r.right <= frame.right + 1 && r.right <= window.innerWidth;
    });
    expect(await inView()).toBe(true);
    size = await fits();
    expect(size.scroll).toBeLessThanOrEqual(size.client);
    // The level table is not stretched: its first value column sits next to Concurrency.
    expect(await detail.getByTestId("published-levels").evaluate((el) => el.getBoundingClientRect().width)).toBeLessThan(await detail.evaluate((el) => el.getBoundingClientRect().width));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const c = document.querySelector('[data-testid="published-records"] [data-slot="table-container"]') as HTMLElement | null;
      return !!c && c.querySelector("table")!.scrollWidth <= c.clientWidth;
    });
    if (!(await page.getByTestId("published-detail").count())) await records.locator("[data-stacked-record] [data-expand]").first().click();
    await page.getByTestId("published-detail").first().waitFor();
    expect(await page.getByTestId("published-detail").first().getByTestId("published-levels").locator("tbody td").first().evaluate((cell) => {
      const r = cell.getBoundingClientRect();
      return r.left >= 0 && r.right <= window.innerWidth;
    })).toBe(true);
    expect(await overflow()).toBeLessThanOrEqual(0);
    // Coverage ticks on phones: two-line labels, so GB300 and GB200 stay distinguishable.
    await go("published");
    const ticks = await page.locator('[data-testid="published-coverage"] [data-slot="heatmap-chart-column-label"]').allInnerTexts();
    expect(ticks.map((tick) => tick.replace(/\s+/g, ""))).toEqual(expect.arrayContaining(["GB300", "GB200", "B300"]));
    expect(pageErrors).toEqual([]);
  });

  test("published: derivation stated once, readable source link for slug titles, tooltip kept in view at 390, points-only coverage marked", async () => {
    const id = "kimi-k3-b300x8-sglang-fixstars-deploying-kimi-k3-on-day-0-can-a-2-8t-model-run-on-a-single-node-of-nvidia-b300-x8";
    await go("published?model=kimi-k3&hw=B300&kind=ladder&engine=sglang");
    await page.locator(`[data-expand="${id}"]`).first().click();
    const detail = page.locator(`[data-testid="published-detail"][data-record-id="${id}"]`);
    await detail.waitFor();
    // The source title only repeats an id slug: the link reads "Fixstars · <date>" (full title in its title attribute).
    const link = detail.locator("[data-source-id]").first();
    expect(await link.innerText()).toMatch(/^Fixstars · \d{4}-\d{2}-\d{2}$/);
    expect(await detail.innerText()).not.toContain("fixstars-deploying");
    // Pick the derived per-GPU metric: "derived" once in the picker and once in the legend.
    await detail.getByTestId("published-ladder-metric").click();
    const option = page.getByRole("option", { name: /^output throughput per GPU/ });
    expect(await option.innerText()).toBe("output throughput per GPU · tok/s/GPU · derived");
    await option.click();
    expect(await detail.locator('[data-testid="published-ladder-legend"] [data-derived]').innerText()).toBe("Derived: aggregate ÷ 8 GPUs");
    // 390 px: hovering the last point keeps the tooltip inside the viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const chart = detail.getByTestId("published-ladder-chart").locator(".recharts-surface");
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    let shown = 0;
    for (const fraction of [0.97, 0.9, 0.8, 0.5, 0.2]) {
      await page.mouse.move(box!.x + box!.width * fraction, box!.y + box!.height / 2);
      await page.waitForTimeout(80);
      const tip = page.getByTestId("published-ladder-tooltip");
      if (await tip.isVisible().catch(() => false)) {
        shown++;
        const r = (await tip.boundingBox())!;
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThanOrEqual(390);
        expect((await tip.innerText()).trim()).not.toBe("");
      }
    }
    expect(shown).toBeGreaterThan(0);
    expect(await overflow()).toBeLessThanOrEqual(0);
    // Coverage: a model × GPU with single points but no ladder carries a dot, and the legend explains it.
    await page.setViewportSize({ width: 1440, height: 900 });
    await go("published");
    const coverage = page.getByTestId("published-coverage");
    const marked = coverage.locator('[data-slot="heatmap-chart-cell"][data-marked]');
    expect(await marked.count()).toBeGreaterThan(0);
    expect(await marked.first().getAttribute("aria-label")).toMatch(/^Points only: \d+ points?, no ladder/);
    expect(await page.locator('#published-coverage [data-legend="points-only"]').innerText()).toBe("points only");
    expect(pageErrors).toEqual([]);
  });

  test("published hardware: an unstated GPU type reads 'hardware not stated', never 'not B300'; versions show inline", async () => {
    await go("engine?model=kimi-k3");
    const published = page.locator("#engine-published");
    await published.waitFor();
    const otherChip = published.locator('[data-gpu-chip="other"]');
    if (await otherChip.count()) await otherChip.click();
    const unstated = published.locator('[data-published-hardware="other"]');
    expect(await unstated.count()).toBe(1);
    expect(await unstated.locator("figcaption").innerText()).toContain("Hardware not stated");
    expect(await unstated.innerText()).not.toContain("not B300");
    expect(await unstated.locator('[data-hardware-status="unstated"]').count()).toBeGreaterThan(0);
    // TL;DR setup sheet: the resolved engine version is visible inline next to its audit badge.
    await go("tldr?model=kimi-k3");
    await page.locator('tr[data-setup-row="kimi-k3.native.vllm.baseline"]').click();
    const section = page.getByTestId("setup-published");
    await section.waitFor();
    const line = section.locator("[data-published-record]").filter({ has: page.locator("[data-engine-version]") }).first();
    expect(await line.locator("[data-engine-version]").innerText()).not.toBe("");
    expect(await line.locator("[data-testid=version-class]").count()).toBe(1);
    // No "engine version not stated" chip beside a "not stated" audit badge.
    for (const item of await section.locator("[data-published-record]").all()) {
      if (await item.locator('[data-version-class="not-stated"]').count()) expect(await item.locator('[data-flag="engine-version-not-stated"]').count()).toBe(0);
    }
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

  test("models rows open the evidence sheet and TL;DR rows the setup sheet from the keyboard; focus returns", async () => {
    await go("models?model=qwen3.8-27b&tab=overview");
    await page.locator("[data-export-toggle]").first().click();
    const opener = page.locator("[data-variant-row] [data-action=\"open-run\"]").first();
    await opener.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await go("tldr");
    const setup = page.locator("[data-setup-row] [data-action=\"open-setup\"]").first();
    expect(await setup.getAttribute("aria-haspopup")).toBe("dialog");
    await setup.focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("setup-sheet").waitFor();
    expect(await page.getByRole("dialog").count()).toBe(1);
    await page.keyboard.press("Escape");
    await page.getByTestId("setup-sheet").waitFor({ state: "detached" });
    expect(await page.evaluate(() => document.activeElement?.getAttribute("data-action"))).toBe("open-setup");
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

  test("TL;DR ranks the fixture setups highest first: best, Δ vs best, unmeasured last; the sheet carries the detail", async () => {
    await go("tldr");
    // Default model: the first catalog model with a measured run.
    expect(await page.getByTestId("tldr-model").innerText()).toContain("Qwen 3.8 27B");
    const rows = page.locator("[data-setup-row]");
    // Setups never run on this dataset fold into one row; expanding lists them last.
    expect(await rows.count()).toBe(8);
    const toggle = page.getByTestId("setups-unmeasured-toggle");
    expect(await toggle.innerText()).toBe("6 setups not measured on single-turn-8k");
    await toggle.click();
    expect(await rows.count()).toBe(14);
    const best = rows.nth(0), second = rows.nth(1);
    expect(await best.getAttribute("data-standing")).toBe("best");
    expect(await best.getAttribute("data-position")).toBe("1");
    expect(await best.innerText()).toContain("2,882,918");
    expect(await best.locator('[data-delta="best"]').innerText()).toBe("Best");
    // Classic SLO: SGLang 2,771,947 vs vLLM 2,882,918 = −3.8%, outside the ±3% band.
    expect(await second.getAttribute("data-standing")).toBe("behind");
    expect(await second.locator("[data-delta]").innerText()).toMatch(/^−3\.8%/);
    expect(Number(await second.locator("[data-delta]").getAttribute("data-fraction"))).toBeCloseTo(-0.0385, 3);
    // One flat list (no export groups): positions ascend, values never increase, unmeasured rows come last.
    expect(await page.locator("[data-setup-group]").count()).toBe(0);
    const positions = (await rows.evaluateAll((items) => items.map((item) => item.getAttribute("data-position")))).filter(Boolean).map(Number);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    const standings = await rows.evaluateAll((items) => items.map((item) => item.getAttribute("data-standing")));
    const tally = (kind: string) => standings.filter((item) => item === kind).length;
    expect([tally("best"), tally("behind"), tally("no-passing"), tally("unmeasured")]).toEqual([1, 6, 1, 6]);
    expect(standings.slice(standings.indexOf("unmeasured")).every((kind) => kind === "unmeasured")).toBe(true);
    expect(await page.getByTestId("setups-table").locator('[data-bar="best"]').count()).toBe(1);
    // Compact rows: nothing but rank, setup, engine, sustainable, Δ, C_max.
    const heights = await rows.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
    expect(Math.max(...heights)).toBeLessThanOrEqual(56);
    expect(await page.getByTestId("setups-table").locator("thead").innerText()).toMatch(/#\s+Setup\s+Engine\s+Load curve\s+tok\/s\/GPU by concurrency\s+Sustainable\s+tok\/min\/GPU\s+Δ vs best\s+C_max/);
    // The sheet: KPIs, run quality, runs, knobs, actions.
    await best.click();
    const sheet = page.getByTestId("setup-sheet");
    await sheet.waitFor();
    expect(await sheet.getByTestId("setup-rank").innerText()).toBe("#1 of 7");
    expect(await sheet.getByTestId("setup-sustainable").innerText()).toContain("2,882,918");
    expect(await sheet.getByTestId("setup-kpis").innerText()).toContain("C_max");
    // KPI rings carry bounded fractions only (share of best, levels passing, latency budget used) with a text label.
    const rings = sheet.locator('[data-testid="setup-kpis"] [role="img"]');
    expect(await rings.count()).toBe(4);
    for (const label of await rings.evaluateAll((items) => items.map((item) => item.getAttribute("aria-label") ?? ""))) expect(label).not.toBe("");
    // Load curves: measured rows draw tok/s/GPU by concurrency; unmeasured rows show "—", never a flat zero line.
    expect(Number(await best.locator("[data-load-curve]").getAttribute("data-load-curve"))).toBeGreaterThan(1);
    expect(await rows.last().locator("[data-load-curve]").count()).toBe(0);
    expect(await rows.last().locator("td").nth(3).innerText()).toBe("—");
    // Across workloads: the same setup's rank on every dataset; the active one is marked, another reopens the sheet there.
    const across = sheet.getByTestId("setup-across");
    expect(await across.locator('[data-across-workload="single-turn-8k"]').getAttribute("data-active")).toBe("true");
    expect(await across.locator('[data-across-workload="single-turn-8k"]').getAttribute("data-standing")).toBe("best");
    expect(await across.locator("[data-across-workload]").count()).toBe(6);
    for (const text of await across.locator('[data-standing="none"]').allInnerTexts()) expect(text).toContain("not run");
    const chat = across.locator('[data-across-workload="chat-8-turn"] button');
    expect(await chat.innerText()).toMatch(/#\d+ of \d+/);
    await chat.click();
    await page.waitForFunction(() => location.hash.includes("workload=chat-8-turn"));
    await sheet.getByTestId("setup-across").locator('[data-across-workload="chat-8-turn"][data-active="true"]').waitFor();
    expect(await sheet.getByTestId("setup-rank").innerText()).toMatch(/^#\d+ of \d+$/);
    await page.keyboard.press("Escape");
    await sheet.waitFor({ state: "detached" });
    await go("tldr?workload=single-turn-8k");
    await page.getByTestId("setups-unmeasured-toggle").click();
    await best.click();
    await sheet.waitFor();
    const quality = sheet.getByTestId("run-quality-badge");
    expect(await quality.innerText()).toBe("1 inc · 3 err");
    expect(await quality.getAttribute("aria-label")).toBe("1 incomplete, 3 errored requests");
    expect(await sheet.getByTestId("setup-knobs").innerText()).toContain("seqs 256");
    expect(await sheet.getByTestId("setup-throughput").getAttribute("href")).toContain("run=qwen3.8-27b.fp8.vllm.baseline");
    expect(await sheet.getByTestId("setup-engine").getAttribute("href")).toMatch(/^#\/engine\?.*model=qwen3\.8-27b/);
    // Evidence from the sheet leads with Sustainable and C_max; the model-level AA index sits in a collapsed group.
    await sheet.getByTestId("setup-evidence").click();
    const kpis = page.getByTestId("drawer-kpis");
    await kpis.waitFor();
    expect(await kpis.getAttribute("data-order")).toBe("throughput");
    expect((await kpis.locator("dt").allInnerTexts()).slice(0, 2)).toEqual(["Sustainable", "C_max"]);
    expect(await kpis.innerText()).not.toContain("AA");
    expect(await page.locator('[data-drawer-details="Model quality"]').evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    await page.keyboard.press("Escape");
    // Compare top: the top three configurations (two variants of one configuration count once), then the Compare page.
    await go("tldr");
    await page.getByTestId("compare-top").click();
    await page.waitForFunction(() => location.hash.startsWith("#/compare"));
    expect(decodeURIComponent(new URL(page.url()).hash.match(/runs=([^&]+)/)?.[1] ?? "").split(",")).toEqual(["qwen3.8-27b.fp8.vllm.baseline", "qwen3.8-27b.fp8.sglang.baseline", "qwen3.8-27b.nvfp4.vllm.baseline"]);
    expect(pageErrors).toEqual([]);
  });

  test("TL;DR tie labelling: within ±3% of the best reads as a tie (Low-latency SLO)", async () => {
    await go("tldr");
    await page.getByTestId("slo-trigger").click();
    await page.locator('[data-slo-preset="low-latency"]').click();
    await page.keyboard.press("Escape");
    const second = page.locator("[data-setup-row]").nth(1);
    await page.waitForFunction(() => document.querySelectorAll('[data-setup-row][data-standing="tie"]').length === 1);
    // 2,002,046 vs 2,017,968: −0.8%, inside the assumed single-run noise band.
    expect(await second.getByTestId("tie-badge").innerText()).toBe("tie");
    expect(await second.locator("[data-delta]").innerText()).toContain("−0.8%");
    expect(await page.getByTestId("setups-caption").innerText()).toContain("assumed single-run noise (unverified policy)");
    expect(pageErrors).toEqual([]);
  });

  test("TL;DR measured at 390 px: value, bar and Δ stay in each row without overflow", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go("tldr");
    const best = page.locator("tr[data-setup-row]").first();
    expect(await best.innerText()).toContain("2,882,918");
    expect(await best.locator('[data-bar="best"]').count()).toBe(1);
    expect(await page.locator("tr[data-setup-row]").nth(1).locator("[data-delta]").innerText()).toMatch(/^−3\.8%/);
    expect(await page.locator("tr[data-setup-row]").nth(1).locator("[data-delta]").count()).toBe(1);
    expect(await overflow()).toBeLessThanOrEqual(0);
    expect(pageErrors).toEqual([]);
  });

  test("TL;DR variants: two runtime configs of one configuration, best of 2 runtimes, every run in the sheet", async () => {
    await go("tldr");
    // The FP8 vLLM baseline was measured with two recorded runtime configs: two rows of one configuration, told apart by their knobs.
    const fp8 = page.locator('tr[data-setup-row="qwen3.8-27b.fp8.vllm.baseline"]');
    expect(await fp8.count()).toBe(2);
    const best = fp8.first();
    expect(await best.getAttribute("data-standing")).toBe("best");
    expect(await best.locator('[data-action="open-setup"]').innerText()).toBe("Baseline · seqs 256 · prefix cache off");
    expect(await fp8.nth(1).locator('[data-action="open-setup"]').innerText()).toBe("Baseline · seqs 512 · prefix cache on");
    expect(await best.locator("[data-runtime-count]").innerText()).toBe("best of 2 runtimes");
    expect(await fp8.nth(1).locator("[data-delta]").innerText()).toMatch(/^−14\.0%/);
    // The export label already names FP8: no repeated precision chip.
    expect(await best.locator('[data-slot="badge"]', { hasText: /^FP8$/ }).count()).toBe(0);
    // NVFP4 vLLM: the older v0.32.0 run is faster, so it fronts the variant; the sheet lists both runs, newest first.
    const nvfp4 = page.locator('tr[data-setup-row="qwen3.8-27b.nvfp4.vllm.baseline"]');
    // The Engine column states the release that ran (from the run tag), not the tag itself.
    expect(await nvfp4.innerText()).toContain("vLLM v0.32.0");
    await nvfp4.click();
    const runs = page.getByTestId("setup-runs");
    await runs.waitFor();
    expect(await runs.locator("[data-variant-run]").count()).toBe(2);
    expect(await runs.locator("[data-variant-run]").first().innerText()).toContain("vllm-v0.33.0");
    expect(await runs.locator("[data-variant-run][data-fronts]").innerText()).toContain("vllm-v0.32.0");
    expect(await page.getByTestId("setup-knobs").innerText()).toContain("keys");
    expect(pageErrors).toEqual([]);
  });

  test("TL;DR sheet Throughput opens the row's variant (its best run), not the configuration's newest run", async () => {
    await go("tldr");
    const row = page.locator('tr[data-setup-row="qwen3.8-27b.fp8.vllm.baseline"]', { has: page.locator('[data-action="open-setup"]', { hasText: "seqs 512" }) });
    expect(await row.count()).toBe(1);
    await row.click();
    await page.getByTestId("setup-throughput").click();
    await page.waitForFunction(() => location.hash.startsWith("#/throughput") && location.hash.includes("rid="));
    await page.waitForFunction(() => document.querySelector('[data-testid="run-picker-chips"]')?.textContent?.includes("seqs 512") === true);
    expect(await page.getByTestId("run-picker-chips").innerText()).toContain("seqs 512 · prefix cache on");
    expect(await page.locator("main").innerText()).toContain("2,479,310");
    // A reload keeps the variant (the run id is in the URL).
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-testid="run-picker-chips"]')?.textContent?.includes("seqs 512") === true);
    expect(pageErrors).toEqual([]);
  });

  test("throughput pickers: runtime config states knob chips, run count and sustainable tok/min/GPU per export group", async () => {
    await go("throughput?run=qwen3.8-27b.bf16.vllm.baseline");
    await page.getByTestId("run-picker").click();
    const fp8 = page.locator("[cmdk-group]", { has: page.locator("[cmdk-group-heading]", { hasText: /^Qwen 3\.8 27B · FP8$/ }) });
    const items = await fp8.locator("[cmdk-item]").allInnerTexts();
    // Fixture (vLLM, 1× B300): the FP8 baseline is two measured variants on single-turn-8k (two recorded runtime
    // configs): prefix cache off, best of 2 runtimes (v0.33.0 2,882,918 under Classic; v0.32.0 older), and prefix
    // cache on with 512 sequences (one run). Every other FP8 setup is "not measured", never 0.
    expect(items.some((text) => text.includes("Baseline") && text.includes("kv fp8") && text.includes("prefix cache off") && text.includes("2 runs · best of 2 runtimes") && text.includes("2,882,918 tok/min/GPU"))).toBe(true);
    expect(items.some((text) => text.includes("Baseline") && text.includes("prefix cache on") && text.includes("seqs 512") && text.includes("1 run"))).toBe(true);
    expect(items.filter((text) => text.includes("not measured")).length).toBe(items.length - 2);
    expect(items.join("\n")).not.toMatch(/(^|\s)0 tok\/min/);
    // The current setup carries the check mark.
    expect(await page.locator('[cmdk-item][data-value="qwen3.8-27b.bf16.vllm.baseline"] svg.opacity-100').count()).toBe(1);
    await page.keyboard.press("Escape");
    // Runtime picker: switching to SGLang keeps the export (FP8) when that setup exists.
    await go("throughput?run=qwen3.8-27b.fp8.vllm.baseline");
    await page.getByTestId("throughput-runtime").click();
    await page.locator(`[cmdk-item][data-value^="sglang|" i]`).click();
    await page.waitForFunction(() => location.hash.includes("run=qwen3.8-27b.fp8.sglang.baseline"));
    expect(await page.getByTestId("performance-strip").innerText()).toContain("2,771,947");
    // Reopening: the current setup is the highlighted item; the model list scrolls it into the middle.
    await page.getByTestId("run-picker").click();
    const current = page.locator('[cmdk-item][data-selected="true"]');
    expect(await current.getAttribute("data-value")).toBe("qwen3.8-27b.fp8.sglang.baseline");
    await page.keyboard.press("Escape");
    // The closing popover animates out; wait until it leaves the DOM so only the next picker's list remains.
    await page.locator('[data-slot="popover-content"]').waitFor({ state: "detached" });
    await page.getByTestId("throughput-model").click();
    expect(await page.locator('[data-slot="popover-content"][data-state="open"] [cmdk-item][data-selected="true"]').getAttribute("data-value")).toBe("qwen3.8-27b");
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-slot="popover-content"][data-state="open"]');
      const list = root?.querySelector("[cmdk-list]"), item = root?.querySelector('[cmdk-item][data-selected="true"]');
      if (!list || !item) return false;
      const a = list.getBoundingClientRect(), b = item.getBoundingClientRect();
      return list.scrollTop > 0 && b.top >= a.top && b.bottom <= a.bottom;
    });
    await page.keyboard.press("Escape");
    // Deployments keeps the Precision column next to the rank once rows are measured.
    await go("deployments");
    expect(await page.locator("th", { hasText: /^Precision$/ }).count()).toBe(1);
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
    expect(await page.getByTestId("data-badge").innerText()).toMatch(/HF \+ AA · 12 runs \(TEST\)/);
    expect(pageErrors).toEqual([]);
  });

  test("throughput: KPI strip, total throughput chart with C_max and legend, SLO evaluation, measured results, PNG download", async () => {
    await go("throughput?run=qwen3.8-27b.fp8.vllm.baseline");
    const identity = page.getByTestId("throughput-identity");
    expect(await identity.innerText()).toContain("Measured · 2026-11-01");
    expect(await identity.innerText()).toContain("vllm-v0.33.0");
    expect(await identity.getByTestId("identity-hardware").innerText()).toBe("1xB300");
    expect(await identity.getByTestId("identity-gpus").innerText()).toBe("1 GPU per replica · 1 GPU total");
    // Request quality: incomplete and errored badges once, on the identity line (not repeated in the KPI strip).
    expect(await identity.getByTestId("incomplete-badge").innerText()).toBe("1 incomplete");
    expect(await identity.getByTestId("errored-badge").innerText()).toBe("3 errored");
    expect(await page.getByTestId("performance-strip").getByTestId("incomplete-badge").count()).toBe(0);
    expect(await page.getByTestId("performance-strip").getByTestId("errored-badge").count()).toBe(0);
    // The warning badges sit in one group with the run tag (never alone on a wrapped line); the knob string is stated
    // once, in the Runtime config trigger, not repeated as chips on the identity line.
    expect(await identity.getByTestId("identity-run").getByTestId("incomplete-badge").count()).toBe(1);
    expect(await identity.getByTestId("identity-run").innerText()).toContain("vllm-v0.33.0");
    expect(await identity.getByTestId("config-chips").count()).toBe(0);
    expect(await page.getByTestId("run-picker-chips").innerText()).toContain("kv fp8");
    // Fixture (TEST data): C_max 64 with 7 of 8 levels inside the SLO; sustainable = total tok/s at C_max × 0.8 × 60 ÷ GPUs.
    const strip = page.getByTestId("performance-strip");
    expect(await strip.getAttribute("data-measured")).toBe("true");
    expect(await strip.locator('[data-kpi="cmax"]').innerText()).toMatch(/64[\s\S]*7 of 8 measured levels in SLO/);
    const sustainable = await strip.locator('[data-kpi="sustainable"]').innerText();
    expect(sustainable).toContain("2,882,918");
    expect(sustainable).toContain("Observed 60,061 tok/s/GPU at the C_max ring · ×0.8 margin");
    const perUser = await strip.locator('[data-kpi="per-user"]').innerText();
    expect(perUser).toContain("60.0");
    expect(perUser).toContain("ITL p95 22.5 ms");
    expect(perUser).toContain("median token every 16.7 ms");
    // The run data has no per-user p95 and no request-rate percentiles: named as missing, not replaced by another metric.
    expect(await strip.locator('[data-kpi="per-user"] [data-missing-metric="per-user-p95"]').innerText()).toBe("per-user p95 —");
    const wide = await strip.locator('[data-kpi="deployment"]').innerText();
    expect(wide).toContain("observed 60,061 tok/s");
    expect(wide).toContain("7.07 req/s at C_max");
    expect(await strip.locator('[data-kpi="deployment"] [data-missing-metric="request-rate-percentiles"]').innerText()).toBe("req/s p50 / p95 —");
    expect(await strip.locator('[data-profile="Balanced"]').count()).toBe(1);
    expect(await strip.getByTestId("strip-budget").innerText()).toContain("8,000 in / 500 out");
    expect(await page.getByTestId("strip-ttft-ceiling").innerText()).toBe("TTFT p95 ≤ 6,154 ms (computed from measured prompt length)");
    // Profile tiles: one per measured dataset; the ratio divides two measured values of this configuration.
    const tiles = page.getByTestId("profile-tiles");
    expect(await tiles.locator("[data-profile-tile]").count()).toBe(2);
    const balanced = tiles.locator('[data-profile-tile="single-turn-8k"]');
    expect(await balanced.getAttribute("aria-pressed")).toBe("true");
    expect(await balanced.locator("[data-ratio]").getAttribute("data-ratio")).toBe("reference");
    const chat = tiles.locator('[data-profile-tile="chat-8-turn"]');
    expect(await chat.innerText()).toContain("629,491");
    expect(await chat.locator('[data-profile="Decode-intensive"]').count()).toBe(1);
    expect(await chat.locator("[data-ratio]").innerText()).toBe("×0.22 vs Balanced");
    // SLO evaluation: visible by default, one row per level, the C_max row tagged, 128 fails on ITL only.
    const slo = page.getByTestId("slo-evaluation");
    expect(await slo.isVisible()).toBe(true);
    expect(await slo.locator("tbody tr").count()).toBe(8);
    // Token mix: the throughput chart switches to stacked input/output bars per level (one axis), and back.
    await page.getByTestId("throughput-view-mix").click();
    const mix = page.getByTestId("token-mix-chart");
    expect(await mix.getAttribute("data-levels")).toBe("8");
    expect(await mix.locator("[role=img]").first().getAttribute("aria-label")).toContain("C_max 64.");
    expect(await page.getByTestId("external-curves-toggle").count()).toBe(0);
    await page.getByTestId("throughput-view-total").click();
    await page.getByTestId("throughput-chart").waitFor();
    // SLO budget rings: ITL and TTFT p95 at C_max as a share of their ceilings, C_max in the centre.
    const budget = page.getByTestId("slo-budget");
    expect(await budget.innerText()).toContain("ITL p95");
    expect(await budget.innerText()).toContain("TTFT p95");
    const cmaxRow = slo.locator('tr[data-capacity="true"]');
    expect(await cmaxRow.getAttribute("data-level")).toBe("64");
    expect(await cmaxRow.getByTestId("cmax-tag").innerText()).toBe("C_max");
    const last = slo.locator('tr[data-level="128"]');
    expect(await last.getAttribute("data-verdict")).toBe("fail");
    expect(await last.locator('[data-gate="ITL"]').getAttribute("data-result")).toBe("fail");
    expect(await last.locator('[data-gate="TTFT"]').getAttribute("data-result")).toBe("pass");
    // Chart: C_max label on the ring, sustainable rate line and the line-style legend.
    const chart = page.getByTestId("throughput-chart");
    expect(await chart.locator("[data-cmax-label]").textContent()).toBe("C_max=64");
    expect(await chart.locator('g[data-pass="false"]').count()).toBe(1);
    const legend = page.getByTestId("throughput-chart-legend");
    expect(await legend.locator('[data-legend="meets"]').innerText()).toContain("Meets SLO — continuous line, filled point");
    expect(await legend.locator('[data-legend="out"]').innerText()).toContain("Out of SLO — dashed line, hollow point");
    expect(await legend.locator('[data-legend="sustainable"]').innerText()).toContain("Sustainable rate — observed ×0.8");
    expect(await legend.locator('[data-legend="beyond"]').innerText()).toBe("Beyond C_max");
    // Measured results: collapsed native <details>, rows mounted; the summary names the level count.
    const levels = page.getByTestId("concurrency-details");
    expect(await levels.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    expect(await levels.locator("summary").innerText()).toContain("Measured results");
    expect(await levels.locator("summary").innerText()).toContain("8 levels");
    expect(await page.getByTestId("concurrency-table").locator("tbody tr").count()).toBe(8);
    expect(await page.getByTestId("run-history").isDisabled()).toBe(false);
    const panel = page.locator('[data-chart-panel="total-throughput-vs-concurrency"]');
    await panel.waitFor();
    await panel.scrollIntoViewIfNeeded();
    const box = await panel.locator("svg.recharts-surface").boundingBox();
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(150);
    expect(await page.getByText(/concurrent requests/).count()).toBeGreaterThan(0);
    const section = page.locator("section", { has: panel });
    const [download] = await Promise.all([page.waitForEvent("download"), section.locator('[data-chart-action="download"]').first().click()]);
    expect(download.suggestedFilename()).toBe("bench-console-total-throughput-vs-concurrency.png");
    const bytes = new Uint8Array(await Bun.file(await download.path()).arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(pageErrors).toEqual([]);
  });

  test("throughput: runtime versions with Δ prev, version overlay, run picking and profile tiles switch the dataset", async () => {
    await go("throughput?run=qwen3.8-27b.fp8.vllm.baseline");
    // Fixture (TEST data): vllm-v0.33.0 (2026-11-01, C_max 64) and the older vllm-v0.32.0 (2026-10-20, C_max 32).
    const rows = page.locator("[data-testid=runtime-version-rows] tbody tr");
    expect(await rows.count()).toBe(2);
    expect(await rows.nth(0).getAttribute("data-version")).toBe("vllm-v0.33.0");
    expect(await rows.nth(0).getAttribute("data-shown")).toBe("true");
    // 2,882,918 vs 1,876,709 tok/min/GPU: +53.6% vs the next older version; the oldest has no Δ.
    expect(await rows.nth(0).locator("[data-delta]").innerText()).toBe("+53.6%");
    expect(await rows.nth(1).locator("[data-delta]").getAttribute("data-delta")).toBe("none");
    expect(await rows.nth(1).locator("[data-delta]").innerText()).toBe("—");
    expect(await rows.nth(1).innerText()).toContain("2 incomplete");
    expect(await page.getByTestId("versions-quant-ladder").getAttribute("href")).toMatch(/^#\/tldr\?.*model=qwen3\.8-27b/);
    expect(await page.getByTestId("versions-engine").getAttribute("href")).toContain("pair=qwen3.8-27b.fp8%401");
    // Compare top 2 versions: an inline overlay of both sweeps, labelled by version; the state is in the URL (shareable).
    await page.getByTestId("compare-top-versions").click();
    const overlay = page.getByTestId("version-overlay");
    await overlay.waitFor();
    expect(await overlay.innerText()).toContain("vllm-v0.32.0");
    // One engine, two versions: a sequential encoding in the vLLM hue (newer solid, older lighter and dashed), never
    // the SGLang hue (chart-2) for an older vLLM version.
    const versionLegend = await overlay.locator("[data-series-legend]").evaluateAll((items) => items.map((item) => ({ text: (item as HTMLElement).innerText, color: item.getAttribute("data-series-color") ?? "", dash: item.getAttribute("data-series-dash") })));
    expect(versionLegend).toHaveLength(2);
    expect(versionLegend[0]).toEqual({ text: "vllm-v0.33.0 (newer)", color: "var(--chart-1)", dash: "solid" });
    expect(versionLegend[1]!.text).toBe("vllm-v0.32.0 (older)");
    expect(versionLegend[1]!.color).toContain("--chart-1");
    expect(versionLegend[1]!.color).toContain("color-mix");
    expect(versionLegend[1]!.dash).not.toBe("solid");
    expect(versionLegend.some((entry) => entry.color.includes("--chart-2"))).toBe(false);
    expect(await page.getByTestId("compare-top-versions").getAttribute("aria-expanded")).toBe("true");
    await page.waitForFunction(() => location.hash.includes("overlay=versions"));
    await page.reload();
    await page.getByTestId("version-overlay").waitFor();
    expect(await page.getByTestId("compare-top-versions").innerText()).toContain("Hide version overlay");
    // Selecting the older version shows that run everywhere: KPI strip, identity, run picker.
    await rows.nth(1).getByRole("button", { name: "vllm-v0.32.0" }).click();
    await page.waitForFunction(() => document.querySelector('[data-version="vllm-v0.32.0"]')?.getAttribute("data-shown") === "true");
    const strip = page.getByTestId("performance-strip");
    expect(await strip.locator('[data-kpi="sustainable"]').innerText()).toContain("1,876,709");
    expect(await strip.locator('[data-kpi="cmax"]').innerText()).toContain("6 of 7 measured levels in SLO");
    expect(await page.getByTestId("throughput-identity").innerText()).toContain("vllm-v0.32.0");
    expect(await page.getByTestId("identity-latest").innerText()).toBe("latest run 2026-11-01");
    expect(await page.getByTestId("run-history").innerText()).toContain("2026-10-20 · single-turn-8k");
    expect(await page.locator('[data-testid=slo-evaluation] tr[data-capacity="true"]').getAttribute("data-level")).toBe("32");
    // A profile tile switches the dataset; on chat-8-turn only one version exists, so the overlay explains why it is unavailable.
    await page.locator('[data-profile-tile="chat-8-turn"]').click();
    await page.waitForFunction(() => location.hash.includes("workload=chat-8-turn"));
    expect(await page.locator('[data-profile-tile="chat-8-turn"]').getAttribute("aria-pressed")).toBe("true");
    expect(await page.getByTestId("compare-top-versions").isDisabled()).toBe(true);
    expect(await page.locator("#versions-compare-reason").innerText()).toContain("Needs two measured versions");
    expect(await strip.locator('[data-profile="Decode-intensive"]').count()).toBe(1);
    // 390 px: selectors stack, nothing overflows the document.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    expect(await overflow()).toBeLessThanOrEqual(0);
    expect(await page.getByTestId("run-picker").isVisible()).toBe(true);
    expect(await page.getByTestId("run-history").isVisible()).toBe(true);
    // 390 px on single-turn-8k: the SLO table fits its card (no inner scroll) with the Overall verdict visible; the
    // per-gate columns drop and the failed criterion stays as a red value. Runtime versions reflow into cards with Δ.
    await go("throughput?run=qwen3.8-27b.fp8.vllm.baseline");
    const sloTable = page.getByTestId("slo-evaluation");
    expect(await sloTable.evaluate((el) => { const box = el.parentElement!; return box.scrollWidth <= box.clientWidth + 1; })).toBe(true);
    const failing = sloTable.locator('tr[data-level="128"]');
    expect(await failing.locator('[data-gate="Overall"]').isVisible()).toBe(true);
    expect(await failing.locator('[data-gate="ITL"]').isVisible()).toBe(false);
    expect(await failing.locator(".text-critical-text").first().isVisible()).toBe(true);
    const cards = page.locator("ul[data-testid=runtime-version-rows] > li");
    expect(await cards.count()).toBe(2);
    expect(await cards.nth(0).locator("[data-delta]").innerText()).toContain("+53.6%");
    expect(await cards.nth(0).innerText()).toContain("vs older version vllm-v0.32.0");
    expect(await cards.nth(0).innerText()).toMatch(/C_max 64/);
    expect(await cards.nth(0).innerText()).toContain("3 errored");
    expect(await cards.nth(1).innerText()).toContain("2 incomplete");
    expect(await overflow()).toBeLessThanOrEqual(0);
    expect(pageErrors).toEqual([]);
  });

  test("throughput: configured command vs recorded run values, readable runtime-config options, ITL C_max label clear of the threshold, opaque sticky header", async () => {
    await go("throughput?run=qwen3.8-27b.fp8.vllm.baseline");
    // Serve command: labelled as the catalog's configured command; the run's recorded values that contradict it are named.
    await page.getByTestId("serve-toggle").click();
    const serve = page.getByTestId("throughput-serve-command");
    expect(await serve.innerText()).toContain("Configured command (catalog)");
    expect(await serve.locator("code").innerText()).toContain("--max-num-seqs 32");
    const overrides = page.getByTestId("serve-run-overrides");
    expect(await overrides.innerText()).toContain("Run recorded different values: kv_cache_dtype fp8, max_num_seqs 256");
    await page.getByTestId("serve-open-configuration").click();
    await page.waitForFunction(() => location.hash.includes("tab=configuration"));
    expect(await page.getByTestId("recorded-runtime-config").innerText()).toContain("max_num_seqs");
    await page.getByRole("tab", { name: "Overview" }).click();
    // Runtime config trigger: the knob string wraps instead of cutting "fixture=TEST".
    const chips = page.getByTestId("run-picker-chips");
    expect(await chips.innerText()).toBe("kv fp8 · seqs 256 · prefix cache off · fixture=TEST");
    expect(await chips.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    // Options: run count and tok/min/GPU in a right-aligned column that never truncates; popover at least 420 px wide.
    await page.getByTestId("run-picker").click();
    const item = page.locator('[cmdk-item][data-value="qwen3.8-27b.fp8.vllm.baseline"]');
    const meta = item.locator("[data-option-meta]");
    expect(await meta.innerText()).toMatch(/2 runs · best of 2 runtimes\s+2,882,918 tok\/min\/GPU/);
    expect(await meta.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await item.locator("[data-option-detail]").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const popover = await page.locator('[data-slot="popover-content"][data-state="open"]').boundingBox();
    expect(popover!.width).toBeGreaterThanOrEqual(420);
    // The second runtime config of the same catalog configuration (prefix cache on, 512 sequences) is its own option;
    // picking it shows that variant's best run, and Runtime versions then lists only runs of that runtime config.
    await page.locator('[data-slot="popover-content"][data-state="open"] [cmdk-item]', { hasText: "seqs 512" }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="run-picker-chips"]')?.textContent?.includes("seqs 512") === true);
    expect(await page.getByTestId("throughput-identity").innerText()).toContain("Measured · 2026-10-28");
    expect(await page.getByTestId("run-picker-summary").innerText()).toMatch(/· 1 run$/);
    expect(await page.locator("[data-testid=runtime-version-rows] tbody tr").count()).toBe(1);
    expect(await page.getByTestId("versions-other-configs").innerText()).toContain("1 other runtime config");
    expect(await page.getByTestId("run-history").innerText()).toContain("2026-10-28 · single-turn-8k");
    await go("throughput?run=qwen3.8-27b.fp8.vllm.baseline");
    // ITL chart: the C_max label never sits on the dashed ITL p95 threshold line (fixture ITL p95 22.5 ms at C_max vs 26 ms).
    const itl = page.locator('[data-chart-panel="inter-token-latency"]');
    await itl.scrollIntoViewIfNeeded();
    const label = itl.locator("[data-marker-label]");
    await label.waitFor();
    expect(await label.textContent()).toBe("C_max 64");
    const clear = async () => itl.evaluate((root) => {
      const text = root.querySelector("[data-marker-label]")!.getBoundingClientRect();
      const lines = [...root.querySelectorAll(".recharts-reference-line line")].map((line) => line.getBoundingClientRect()).filter((box) => box.height < 1);
      return lines.length > 0 && lines.every((line) => line.top < text.top - 1 || line.top > text.bottom + 1);
    });
    expect(await clear()).toBe(true);
    // Sticky header: opaque canvas behind the TEST DATA banner and the top bar, stacked above the page content.
    const sticky = await page.getByTestId("test-data-banner").evaluate((el) => {
      const style = getComputedStyle(el.parentElement!);
      return { background: style.backgroundColor, z: Number(style.zIndex), position: style.position };
    });
    expect(sticky.position).toBe("sticky");
    expect(sticky.z).toBeGreaterThanOrEqual(40);
    expect(sticky.background).not.toMatch(/rgba\([^)]*,\s*0(\.\d+)?\)|transparent/);
    // 390 px: the ITL label still clears the threshold.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await itl.scrollIntoViewIfNeeded();
    expect(await clear()).toBe(true);
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

  test("engine matchup: best configuration per engine, matched-pair verdict, Δ on both cards, add both to compare", async () => {
    await go("engine?pair=qwen3.8-27b.fp8@1");
    expect(await page.getByTestId("matchup-scope").innerText()).toContain("Qwen 3.8 27B · 1× B300 · single-turn-8k");
    const verdict = page.getByTestId("matchup-verdict");
    expect(await verdict.getAttribute("data-verdict-kind")).toBe("lead");
    // The verdict reads as the panel's headline sentence, not only as a chip.
    expect(await page.getByTestId("matchup-headline").innerText()).toBe("vLLM sustains 4.0% more than SGLang on single-turn-8k · matched pair");
    expect(await verdict.innerText()).toBe("+4.0% vLLM · matched pair");
    const vllm = page.locator('[data-matchup-engine="vLLM"]'), sglang = page.locator('[data-matchup-engine="SGLang"]');
    expect(await vllm.getAttribute("data-measured")).toBe("true");
    expect(await vllm.getByTestId("matchup-value").innerText()).toBe("2,882,918");
    expect(await sglang.getByTestId("matchup-value").innerText()).toBe("2,771,947");
    expect(await vllm.locator("[data-matchup-config]").getAttribute("data-matchup-config")).toBe("qwen3.8-27b.fp8.vllm.baseline");
    expect(await vllm.locator("[data-run-tag]").innerText()).toBe("vllm-v0.33.0");
    expect(await vllm.locator("[data-matchup-delta]").getAttribute("data-matchup-delta")).toBe("+4.0%");
    expect(await sglang.locator("[data-matchup-delta]").getAttribute("data-matchup-delta")).toBe("−3.8%");
    expect(await vllm.getByTestId("matchup-cmax").innerText()).toMatch(/^C_max 64 · \d of 8 levels in SLO$/);
    expect(await vllm.getByTestId("incomplete-badge").innerText()).toBe("1 incomplete");
    expect(await vllm.locator("[data-testid=config-chips]").innerText()).toContain("kv fp8");
    // Matched pair: the recorded runtime controls match after normalisation (fp8 ≈ fp8_e4m3, max_num_seqs ≈ max_running_requests).
    // The note is one line; the controls a matched pair holds equal sit in the info tip.
    expect(await page.getByTestId("matchup-note").innerText()).toContain("Matched pair (ⓘ lists the controls held equal)");
    await page.getByTestId("matchup-info").hover();
    const tip = page.locator('[data-slot="tooltip-content"]').filter({ hasText: "A verdict needs a matched pair" });
    await tip.first().waitFor();
    expect(await tip.first().innerText()).toContain("same export, revision, shape, knob");
    expect(await tip.first().innerText()).toContain("same KV dtype, max sequences, memory fraction");
    await page.mouse.move(0, 0);
    expect(await page.getByTestId("matchup-differences").count()).toBe(0);
    // The baseline pair is the matchup's detail: collapsed, full numbers (no "2.88M"), and next to the measured runs
    // it says "Measured here · n runs" while the atlas flag reads as catalog evidence, not as a statement about runs.
    const pairCards = page.getByTestId("engine-baseline-pair");
    expect(await pairCards.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    expect(await pairCards.evaluate((el) => el.closest("#engine-matchup") !== null)).toBe(true);
    expect(await pairCards.getByTestId("engine-head-to-head").locator('[data-metric="Sustainable throughput"]').textContent()).toContain("2,882,918");
    await pairCards.locator("summary").click();
    expect(await pairCards.locator('[data-measured-here="vLLM"]').innerText()).toMatch(/^Measured here · \d+ runs?$/);
    expect(await pairCards.locator('[data-engine-side="vLLM"] [data-catalog-target]').innerText()).toMatch(/^Catalog: /);
    expect(await page.getByText("Not tested on B300").count()).toBe(0);
    await page.getByTestId("matchup-add-compare").click();
    expect(await page.getByRole("region", { name: "Selected configurations" }).innerText()).toContain("2 selected");
    await page.getByTestId("compare-selected").click();
    await page.waitForFunction(() => location.hash.startsWith("#/compare"));
    expect(decodeURIComponent(new URL(page.url()).hash.match(/runs=([^&]+)/)?.[1] ?? "").split(",").sort()).toEqual(["qwen3.8-27b.fp8.sglang.baseline", "qwen3.8-27b.fp8.vllm.baseline"]);
    // The quantization ladder link opens the TL;DR for the model on the same GPU count.
    await go("engine?pair=qwen3.8-27b.fp8@1");
    expect(await page.getByTestId("matchup-champions").count()).toBe(0);
    await page.getByTestId("matchup-ladder").click();
    await page.waitForFunction(() => location.hash.startsWith("#/tldr"));
    expect(page.url()).toMatch(/model=qwen3\.8-27b/);
    expect(page.url()).toMatch(/shape=1xB300/);
    await page.getByTestId("setups-table").waitFor();
    expect(pageErrors).toEqual([]);
  });

  test("engine per-workload verdicts and every measured version (fixture)", async () => {
    await go("engine?pair=qwen3.8-27b.fp8@1");
    const row = (id: string) => page.locator(`[data-verdict-workload="${id}"]`);
    expect(await page.getByTestId("engine-verdicts").getAttribute("data-collapsed")).toBeNull();
    // single-turn-8k: matched fp8 pair, vLLM leads outside ±3%.
    expect(await row("single-turn-8k").getAttribute("data-verdict-kind")).toBe("lead");
    expect(await row("single-turn-8k").locator("[data-verdict-text]").getAttribute("data-verdict-text")).toBe("+4.0% vLLM · matched pair");
    expect(await row("single-turn-8k").locator("[data-profile]").innerText()).toBe("Balanced");
    expect(await row("single-turn-8k").innerText()).toContain("8K → 500 tok · 1 turn");
    const cell = row("single-turn-8k").locator('[data-workload-engine="vLLM"]');
    expect(await cell.innerText()).toContain("2,882,918");
    expect(await cell.locator("[data-cell-delta]").getAttribute("data-cell-delta")).toBe("+4.0%");
    expect(await row("single-turn-8k").locator('[data-workload-engine="SGLang"] [data-cell-delta]').getAttribute("data-cell-delta")).toBe("−3.8%");
    // chat-8-turn: both engines measured, but the recorded max sequences differ (256 vs 128): no verdict and no Δ.
    expect(await row("chat-8-turn").getAttribute("data-verdict-kind")).toBe("different");
    expect(await row("chat-8-turn").locator("[data-verdict-text]").getAttribute("data-verdict-text")).toBe("different configs — no verdict");
    expect(await row("chat-8-turn").getByTestId("verdict-differences").innerText()).toBe("Max sequences: vLLM 256 (recorded) vs SGLang 128 (recorded)");
    expect(await row("chat-8-turn").locator('[data-workload-engine="SGLang"]').getAttribute("data-measured")).toBe("true");
    expect(await row("chat-8-turn").locator("[data-cell-delta]").count()).toBe(0);
    expect(await row("chat-8-turn").locator("[data-profile]").innerText()).toBe("Decode-intensive");
    // Grouped bars: one group per dataset with a run (single-turn-8k, chat-8-turn), one bar per engine, one y-axis.
    const bars = page.getByTestId("verdict-bars");
    expect(await bars.getAttribute("data-groups")).toBe("2");
    expect(await bars.locator("[role=img]").first().getAttribute("aria-label")).toContain("single-turn-8k: vLLM 2,882,918, SGLang 2,771,947");
    expect(await row("coding-agent-48-turn").getAttribute("data-verdict-kind")).toBe("none");
    // Datasets neither engine ran collapse into one chip row instead of full empty rows.
    expect(await row("coding-agent-48-turn").locator("xpath=ancestor::*[@data-testid='verdicts-unmeasured']").innerText()).toContain("No engine pair on these 4 workloads");
    expect(await page.locator('[data-testid=verdicts-unmeasured] [data-verdict-workload][data-verdict-kind="none"]').count()).toBe(4);
    expect(await row("coding-agent-48-turn").locator('[data-workload-engine]').count()).toBe(0);
    // Every measured version on the active dataset: newest run first; Δ prev only vs an older release of the same engine,
    // configuration and recorded runtime config. Fixture: 10 runs of qwen3.8-27b × 1 GPU on single-turn-8k.
    const versions = page.locator("[data-version-row]");
    expect(await versions.count()).toBe(10);
    expect(await versions.first().getAttribute("data-version-row")).toBe("sglang-v0.5.23");
    const version = (tag: string, config: string) => page.locator(`[data-version-row="${tag}"][data-version-config="${config}"]`);
    expect(await version("sglang-v0.5.23", "qwen3.8-27b.fp8.sglang.baseline").locator("[data-delta]").getAttribute("data-delta")).toBe("none");
    // Two v0.33.0 runs of the FP8 vLLM baseline: the newest (prefix cache off) first, then the prefix-cache-on runtime config.
    const latest = version("vllm-v0.33.0", "qwen3.8-27b.fp8.vllm.baseline").first();
    expect(await version("vllm-v0.33.0", "qwen3.8-27b.fp8.vllm.baseline").nth(1).locator("[data-delta]").getAttribute("data-delta")).toBe("none");
    expect(await latest.innerText()).toContain("2,882,918");
    // Fixture: vllm-v0.32.0 (1,876,709) is the older release of the same configuration, so v0.33.0 reads +53.6%.
    expect(await latest.locator("[data-delta]").getAttribute("data-delta")).toBe("+53.6%");
    expect(await latest.innerText()).toContain("vs vllm-v0.32.0");
    expect(await version("vllm-v0.32.0", "qwen3.8-27b.fp8.vllm.baseline").locator("[data-delta]").getAttribute("data-delta")).toBe("none");
    // Selecting a workload makes it the active dataset; the matchup follows.
    await row("chat-8-turn").getByRole("button", { name: "Show workload chat-8-turn" }).click();
    await page.waitForFunction(() => location.hash.includes("workload=chat-8-turn"));
    // The matchup follows the same rule: different recorded configs, so no verdict and no Δ on either card.
    expect(await page.getByTestId("matchup-verdict").getAttribute("data-verdict-kind")).toBe("different");
    expect(await page.getByTestId("matchup-verdict").innerText()).toBe("Different configs — no verdict");
    expect(await page.getByTestId("matchup-differences").innerText()).toContain("Max sequences: vLLM 256 (recorded) vs SGLang 128 (recorded)");
    expect(await page.locator("[data-matchup-delta]").count()).toBe(0);
    expect(await page.locator("[data-version-row]").count()).toBe(2);
    // 390 px: no document overflow; versions reflow into stacked rows.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    expect(await overflow()).toBeLessThanOrEqual(0);
    expect(await page.locator("ul[data-testid=engine-versions] [data-version-row]").count()).toBe(2);
    expect(pageErrors).toEqual([]);
  });

  test("engine: charts fit their cards after a theme toggle and hash navigation; version chart keeps engine hue", async () => {
    await go("throughput?run=qwen3.8-27b.fp8.vllm.baseline");
    await page.getByTestId("theme-toggle").click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    await page.evaluate(() => { location.hash = "#/engine?pair=qwen3.8-27b.fp8%401"; });
    await page.locator('[data-chart-panel="throughput-by-runtime-version"] svg.recharts-surface').waitFor();
    await page.waitForTimeout(250);
    const fits = await page.evaluate(() => [...document.querySelectorAll("[data-chart-panel]")].map((panel) => {
      const card = panel.closest("section")!.getBoundingClientRect();
      const svg = panel.querySelector("svg.recharts-surface")!.getBoundingClientRect();
      return { chart: panel.getAttribute("data-chart-panel"), over: Math.round(svg.right - card.right), wider: Math.round(svg.width - card.width) };
    }));
    expect(fits.length).toBeGreaterThanOrEqual(3);
    for (const fit of fits) { expect(fit.over).toBeLessThanOrEqual(0); expect(fit.wider).toBeLessThanOrEqual(0); }
    expect(await overflow()).toBeLessThanOrEqual(0);
    // Throughput by runtime version: vLLM stays chart-1 and SGLang chart-2; the older vLLM version is lighter and dashed.
    const legend = page.locator('[data-chart-panel="throughput-by-runtime-version"] [data-series-legend]');
    const entries = await legend.evaluateAll((items) => items.map((item) => ({ text: (item as HTMLElement).innerText, color: item.getAttribute("data-series-color") ?? "", dash: item.getAttribute("data-series-dash") })));
    // Fixture: four vLLM runs of the pair's FP8 export (v0.33.0 twice with different runtime configs, v0.32.0, v0.31.0) and one SGLang run.
    expect(entries.length).toBe(5);
    for (const entry of entries) expect(entry.color).toContain(entry.text.includes("vLLM") ? "--chart-1" : "--chart-2");
    const v033 = entries.filter((entry) => entry.text.includes("v0.33.0")), older = entries.find((entry) => entry.text.includes("v0.32.0"))!;
    expect(v033).toHaveLength(2);
    const newest = v033.find((entry) => entry.dash === "solid")!;
    expect(newest.color).toBe("var(--chart-1)");
    expect(v033.filter((entry) => entry.dash === "solid")).toHaveLength(1);
    expect(older.dash).not.toBe("solid");
    expect(older.color).toContain("color-mix");
    // Two runtime configs share v0.33.0: the legend tells them apart by the knob chips that differ (no duplicate label).
    expect(new Set(entries.map((entry) => entry.text)).size).toBe(entries.length);
    expect(v033.some((entry) => entry.text.includes("prefix cache on"))).toBe(true);
    // The page no longer repeats the pair or the runtime timeline as separate panels.
    expect(await page.getByRole("heading", { name: "Runtime versions" }).count()).toBe(0);
    expect(await page.locator("[data-engine-side]").evaluateAll((items) => items.every((item) => item.closest("[data-testid=engine-baseline-pair]") !== null))).toBe(true);
    expect(pageErrors).toEqual([]);
  });

  test("throughput: compact profile strip directly under the KPI strip, SLO evaluation still above the fold at 1440; configuration labels the atlas flag", async () => {
    await go("throughput?run=qwen3.8-27b.fp8.vllm.baseline");
    const slo = page.locator("#slo-evaluation");
    await slo.waitFor();
    const sloBox = (await slo.boundingBox())!;
    expect(sloBox.y).toBeLessThan(900);
    // The table header and first level are inside the first viewport, below the compact profile strip.
    const first = (await page.locator("[data-testid=slo-evaluation] tbody tr").first().boundingBox())!;
    expect(first.y + first.height).toBeLessThanOrEqual(900);
    const strip = page.getByTestId("profile-strip");
    const kpi = (await page.getByTestId("performance-strip").boundingBox())!;
    const stripBox = (await strip.boundingBox())!;
    expect(stripBox.y).toBeGreaterThanOrEqual(kpi.y + kpi.height);
    expect(stripBox.y - (kpi.y + kpi.height)).toBeLessThanOrEqual(24);
    expect(stripBox.y).toBeLessThan(sloBox.y);
    expect(stripBox.height).toBeLessThan(140);
    await page.getByRole("tab", { name: "Configuration" }).click();
    const config = await page.getByTestId("run-configuration").innerText();
    expect(config).toMatch(/Imported runs\s*Measured here · \d+ runs?/);
    expect(config).toMatch(/Catalog B300 record\s*Catalog: /);
    expect(config).not.toContain("Not tested on B300");
    // 390 px: Runtime and Hardware pickers stack full width; the runtime label is not truncated.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("tab", { name: "Overview" }).click();
    await page.waitForTimeout(150);
    const runtime = page.getByTestId("throughput-runtime");
    expect(await runtime.innerText()).toContain("vLLM · source snapshot");
    expect(await runtime.evaluate((el) => [...el.querySelectorAll("*")].every((child) => (child as HTMLElement).scrollWidth <= (child as HTMLElement).clientWidth + 1))).toBe(true);
    const [rBox, hBox] = [(await runtime.boundingBox())!, (await page.getByTestId("throughput-hardware").boundingBox())!];
    expect(hBox.y).toBeGreaterThan(rBox.y);
    expect(await overflow()).toBeLessThanOrEqual(0);
    expect(pageErrors).toEqual([]);
  });

  test("throughput: external curves toggle — same GPU + engine by default, overlay only on the chart's metric, small multiples otherwise, sources and flags", async () => {
    const turnOn = async () => {
      const toggle = page.getByTestId("external-curves-toggle");
      if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
      await page.getByTestId("published-curves").waitFor();
    };
    // FP8 vLLM on 1× B300: the default scope (B300 · vLLM) holds published ladders in other metrics only, so the main
    // chart keeps one series and each published curve gets its own small chart with its own title and axis.
    await go("throughput?run=qwen3.8-27b.fp8.vllm.baseline");
    expect(await page.getByTestId("published-curves").count()).toBe(0);
    await turnOn();
    expect(await page.locator('[data-testid=published-scope] [data-scope="same"]').getAttribute("data-state")).toBe("on");
    const listed = page.locator("[data-testid=published-curve-list] > li");
    expect(await listed.count()).toBeGreaterThan(0);
    expect(await page.locator("[data-testid=published-curve-list] > li[data-overlay]").count()).toBe(0);
    for (const hardware of await listed.locator("[data-hardware]").evaluateAll((items) => items.map((item) => item.getAttribute("data-hardware")))) expect(hardware).toBe("B300");
    expect(await page.getByTestId("throughput-chart").getAttribute("data-external-curves")).toBeNull();
    expect(await page.locator('[data-legend="external"]').count()).toBe(0);
    expect(await page.locator("[data-small-multiple]").count()).toBe(await listed.count());
    // Every curve names its source (link), engine version with its audit class and the plotted metric.
    expect(await listed.first().locator("[data-source-link]").getAttribute("href")).toMatch(/^https:\/\//);
    expect(await listed.first().locator("[data-audit-class]").count()).toBe(1);
    expect(await listed.first().locator("[data-plotted-metric]").count()).toBe(1);
    // NVFP4 SGLang MTP: no SGLang ladder on B300, so the default scope explains it; "Same engine" brings H200 ladders
    // in total tok/s per GPU (the chart's metric), drawn on the chart in neutral grey and tagged; the others stay below.
    await go("throughput?run=qwen3.8-27b.nvfp4.sglang.mtp");
    await turnOn();
    expect(await page.getByTestId("published-empty").innerText()).toContain("No published concurrency ladder");
    await page.locator('[data-testid=published-scope] [data-scope="engine"]').click();
    await page.getByTestId("published-curve-list").waitFor();
    const overlayRows = page.locator("[data-testid=published-curve-list] > li[data-overlay][data-chosen]");
    const drawn = await overlayRows.count();
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThanOrEqual(4);
    const chart = page.getByTestId("throughput-chart");
    expect(await chart.getAttribute("data-external-curves")).toBe(String(drawn));
    expect(await chart.locator("[data-external-tag]").count()).toBe(drawn);
    expect(await page.locator('[data-legend="external"]').innerText()).toContain("Published (external)");
    expect(await chart.getAttribute("data-external-curves")).not.toBeNull();
    // The H200 ladders ran other ISL/OSL than the run's 8K → 500: the legend says so per tag, and so does the list.
    expect(await page.locator('[data-legend="workload-differs"]').innerText()).toMatch(/workload differs[\s\S]*P\d+ ISL [\d,]+ \/ OSL [\d,]+/);
    expect(await overlayRows.first().locator("[data-workload-differs]").innerText()).toBe("workload differs");
    // Tooltip: each P-tag line carries its ISL/OSL.
    await chart.locator(".recharts-surface").first().scrollIntoViewIfNeeded();
    const box = await chart.locator(".recharts-surface").first().boundingBox();
    for (const fraction of [0.15, 0.3, 0.5, 0.7, 0.9]) {
      await page.mouse.move(box!.x + box!.width * fraction, box!.y + box!.height / 2);
      if (await page.locator("[data-tooltip-curve] [data-workload-differs]").first().isVisible().catch(() => false)) break;
    }
    expect(await page.locator("[data-tooltip-curve] [data-workload-differs]").first().innerText()).toMatch(/^ISL [\d,]+ \/ OSL [\d,]+ · workload differs$/);
    // Measured evidence is unchanged by the overlay: C_max ring and the sustainable line still come from the run.
    expect(await chart.locator("[data-cmax-label]").count()).toBeLessThanOrEqual(1);
    const firstOverlay = overlayRows.first();
    expect(await firstOverlay.locator('[data-plotted-metric="total-per-gpu"]').count()).toBe(1);
    expect(await firstOverlay.locator("[data-hardware]").innerText()).toContain("not B300");
    expect(await firstOverlay.locator('[data-flag="hardware-mismatch"]').innerText()).toBe("not B300");
    // Unchecking a curve removes it from the chart.
    await firstOverlay.getByRole("checkbox").click();
    await page.waitForFunction((n) => document.querySelector('[data-testid="throughput-chart"]')?.getAttribute("data-external-curves") === (n ? String(n) : null), drawn - 1);
    // Weak records are hidden by default; the switch only adds records.
    const before = await page.locator("[data-testid=published-curve-list] > li").count();
    await page.getByTestId("published-show-weak").click();
    expect(await page.locator("[data-testid=published-curve-list] > li").count()).toBeGreaterThanOrEqual(before);
    // 390 px: no document overflow; Expand stays a direct button on the chart panel and opens the dialog.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    expect(await overflow()).toBeLessThanOrEqual(0);
    const expand = page.locator("section", { has: page.locator('[data-chart-panel="total-throughput-vs-concurrency"]') }).locator('[data-chart-action="expand-direct"]');
    expect(await expand.isVisible()).toBe(true);
    await expand.click();
    await page.getByTestId("chart-dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByTestId("chart-dialog").waitFor({ state: "detached" });
    expect(pageErrors).toEqual([]);
  });

  test("engine: published vLLM vs SGLang small multiples per GPU (external, no verdict); argument differences use the matchup's normalised controls", async () => {
    await go("engine?pair=qwen3.8-27b.fp8@1");
    const published = page.getByTestId("engine-published");
    await published.waitFor();
    // One GPU class at a time: the selector lists each class with its ladder count, B300 first and selected.
    const charts = published.locator("[data-published-hardware]");
    expect(await charts.count()).toBe(1);
    expect(await charts.first().getAttribute("data-published-hardware")).toBe("B300");
    const chips = published.locator("[data-gpu-chip]");
    expect(await chips.count()).toBeGreaterThan(1);
    expect(await chips.first().getAttribute("data-gpu-chip")).toBe("B300");
    expect(await chips.first().getAttribute("data-state")).toBe("on");
    // The explanation sits behind the info tip, not as a paragraph.
    expect(await published.innerText()).not.toContain("Values as published");
    expect(await page.getByTestId("engine-published-info").count()).toBe(1);
    // One metric per chart; every legend entry is a vLLM or SGLang ladder of this GPU with its source and audit class.
    for (const gpu of await chips.evaluateAll((items) => items.map((item) => item.getAttribute("data-gpu-chip") ?? ""))) {
      await published.locator(`[data-gpu-chip="${gpu}"]`).click();
      const chart = published.locator(`[data-published-hardware="${gpu}"]`);
      await chart.waitFor();
      expect(await charts.count()).toBe(1);
      const hardware = await chart.getAttribute("data-published-hardware");
      const entries = chart.locator("[data-published-engine]");
      expect(await entries.count()).toBeGreaterThan(0);
      for (const engine of await entries.evaluateAll((items) => items.map((item) => item.getAttribute("data-published-engine") ?? ""))) expect(["vllm", "sglang"]).toContain(engine);
      for (const value of await chart.locator("[data-hardware]").evaluateAll((items) => items.map((item) => item.getAttribute("data-hardware")))) expect(value).toBe(hardware);
      expect(await chart.locator("[data-source-link]").count()).toBe(await entries.count());
      expect(await chart.locator("[data-audit-class]").count()).toBe(await entries.count());
      // The plotted metric is the chart subtitle (one per chart), not a chip on every legend line; x is log concurrency.
      expect(await chart.locator("[data-chart-metric]").getAttribute("data-chart-metric")).toBe(await chart.getAttribute("data-published-kind"));
      expect(await chart.locator("[data-published-engine] [data-plotted-metric]").count()).toBe(0);
      expect(await chart.innerText()).toContain("Concurrent requests (log scale)");
      // Caveats fold to two chips plus "+N" per legend line.
      for (const flags of await chart.locator('[data-published-engine] [data-testid="published-flags"]').all()) expect(await flags.locator("[data-flag]").count()).toBeLessThanOrEqual(2);
    }
    // H200: vLLM and SGLang ladders ran different ISL/OSL, so the chart says "workloads differ" and lists each workload
    // with its tags; B300 (one shared workload) carries no such chip.
    await published.locator('[data-gpu-chip="H200"]').click();
    const h200 = published.locator('[data-published-hardware="H200"]');
    expect(await h200.getByTestId("published-workloads-differ").innerText()).toBe("workloads differ");
    expect(await h200.getByTestId("published-workload-list").innerText()).toBe("V1, V2: ISL 61 / OSL 1,152 · S1, S2: ISL 1,024 / OSL 256");
    await published.locator('[data-gpu-chip="B300"]').click();
    expect(await published.locator('[data-published-hardware="B300"]').getByTestId("published-workloads-differ").count()).toBe(0);
    // External only: no verdict, Δ or tie is derived from published ladders.
    expect(await page.locator("#engine-published").innerText()).not.toMatch(/matched pair|engines tied|[+−]\d+(\.\d)?% (vLLM|SGLang)/);
    // Argument differences read the same normalised controls as the matchup: the fixture's recorded fp8 vs fp8_e4m3,
    // 256 vs 256 sequences and memory fraction 0.85 (configured) vs 0.85 (recorded) are identical, as the matched
    // pair verdict says; none of these rows is listed as a difference.
    for (const label of ["KV-cache dtype", "Max concurrent sequences", "Memory fraction"]) {
      const row = page.locator(`[data-arg-row="${label}"]`);
      expect(await row.getAttribute("data-normalised")).toBe("true");
      expect(await row.evaluate((el) => el.closest("details")?.querySelector("summary")?.textContent ?? "")).toContain("Identical values");
    }
    expect(await page.locator('[data-arg-row="KV-cache dtype"]').textContent()).toContain("kv_cache_dtype fp8_e4m3 (recorded)");
    expect(await page.locator('[data-arg-row="Memory fraction"]').textContent()).toContain("--gpu-memory-utilization 0.85 (configured)");
    expect(await page.getByTestId("matchup-verdict").getAttribute("data-verdict-kind")).toBe("lead");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    expect(await overflow()).toBeLessThanOrEqual(0);
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
