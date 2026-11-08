/**
 * Captures every route at 1440×900 (light + dark) and 390×844 (light).
 * Output goes outside the repository so captures can never be committed: $SCREENSHOT_DIR, or a
 * bench-console-screenshots folder in the OS temporary directory.
 * Usage: bun run build && bun scripts/screenshots.ts [route ...]
 */
import { join, relative, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const root = join(import.meta.dir, "..");
const repoRoot = resolve(root, "..");
const out = resolve(process.env.SCREENSHOT_DIR ?? join(tmpdir(), "bench-console-screenshots"));
if (!relative(repoRoot, out).startsWith("..")) throw new Error(`SCREENSHOT_DIR must be outside the repository (${repoRoot}); got ${out}`);
const port = 4174;
const origin = `http://127.0.0.1:${port}`;
const routes: [string, string][] = [
  ["tldr", "tldr"],
  ["intelligence", "intelligence"],
  ["throughput", "throughput"],
  ["throughput-config", "throughput?run=gemma-4-31b-it.nvfp4.sglang.baseline&tab=configuration"],
  ["compare", "compare"],
  ["engine", "engine?pair=glm-5.3.fp8@8"],
  ["models", "models"],
  ["models-overview", "models?model=deepseek-v4-flash-0731&tab=overview"],
  ["models-precision", "models?model=qwen3.8-27b&tab=precision"],
  ["architecture", "architecture"],
  ["architecture-attention", "architecture?tab=attention"],
  ["deployments", "deployments"],
  ["published", "published"],
  ["new-benchmark", "new-benchmark"],
  ["methodology", "methodology"],
];
const only = process.argv.slice(2);
await mkdir(out, { recursive: true });
const server = Bun.spawn([process.execPath, "scripts/preview.ts"], { cwd: root, env: { ...process.env, PORT: String(port) }, stdout: "ignore", stderr: "inherit" });
try {
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* waiting */ }
    await Bun.sleep(100);
  }
  const browser = await chromium.launch();
  const shots: { name: string; width: number; height: number; theme: "light" | "dark" }[] = [
    { name: "desktop", width: 1440, height: 900, theme: "light" },
    { name: "dark", width: 1440, height: 900, theme: "dark" },
    { name: "mobile", width: 390, height: 844, theme: "light" },
  ];
  for (const shot of shots) {
    const context = await browser.newContext({ viewport: { width: shot.width, height: shot.height }, deviceScaleFactor: shot.width < 500 ? 2 : 1, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(origin);
    await page.evaluate((theme) => localStorage.setItem("bench-console-v1", JSON.stringify({ theme })), shot.theme);
    await page.reload();
    for (const [name, path] of routes) {
      if (only.length && !only.includes(name)) continue;
      await page.goto(`${origin}/#/${path}`);
      await page.reload();
      await page.waitForTimeout(350);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      // Grow the viewport to the document height before capturing: a plain full-page capture resizes during the
      // shot, and charts that track their container can be caught mid-resize (drawn at a fraction of their size).
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: shot.width, height: Math.min(Math.max(height, shot.height), 16000) });
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(out, `${name}-${shot.name}.png`), fullPage: true });
      await page.setViewportSize({ width: shot.width, height: shot.height });
      console.log(`${name}-${shot.name}.png${overflow > 0 ? `  OVERFLOW ${overflow}px` : ""}`);
    }
    if (errors.length) console.log(`errors (${shot.name}):`, [...new Set(errors)].join("\n"));
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}
