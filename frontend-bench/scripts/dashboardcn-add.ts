/**
 * Copy dashboardcn registry items into this project without overwriting local edits.
 *
 *   bun scripts/dashboardcn-add.ts <name...> [--dry-run]
 *
 * The shadcn CLI rewrites every file an item bundles, including primitives this project edits in place
 * (card, tabs, tooltip, delta-badge, metric-value, ...). This script fetches https://dashboardcn.com/r/<name>.json,
 * remaps `@/registry/dashboardcn/*` imports to the project aliases, writes only files that do not exist yet and
 * reports the rest: identical, or kept local because upstream differs (an upstream copy is saved next to the
 * system temp dir for comparison). Missing shadcn primitives and npm dependencies are listed, never installed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const REGISTRY = "https://dashboardcn.com/r";
const ROOT = join(import.meta.dir, "..");
const PATHS: [RegExp, string][] = [
  [/^registry\/dashboardcn\/ui\//, "src/client/components/ui/"],
  [/^registry\/dashboardcn\/blocks\//, "src/client/components/blocks/"],
  [/^registry\/dashboardcn\/lib\//, "src/client/lib/"],
  [/^registry\/dashboardcn\/hooks\//, "src/client/hooks/"],
];
const IMPORTS: [RegExp, string][] = [
  [/@\/registry\/dashboardcn\/ui\//g, "@/components/ui/"],
  [/@\/registry\/dashboardcn\/blocks\//g, "@/components/blocks/"],
  [/@\/registry\/dashboardcn\/lib\//g, "@/lib/"],
  [/@\/registry\/dashboardcn\/hooks\//g, "@/hooks/"],
];

interface RegistryItem { name: string; type: string; dependencies?: string[]; registryDependencies?: string[]; files: { path: string; content: string; type: string }[] }

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const names = args.filter((arg) => !arg.startsWith("--"));
if (!names.length) {
  console.error("usage: bun scripts/dashboardcn-add.ts <name...> [--dry-run]   (names: https://dashboardcn.com/llms.txt)");
  process.exit(2);
}

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
const installed = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
const missingNpm = new Set<string>();
const missingUi = new Set<string>();
let failed = false;

for (const name of names) {
  if (!/^[a-z0-9-]+$/.test(name)) { console.error(`✗ ${name}: not a registry item name`); failed = true; continue; }
  const response = await fetch(`${REGISTRY}/${name}.json`);
  if (!response.ok) { console.error(`✗ ${name}: ${response.status} from ${REGISTRY}/${name}.json`); failed = true; continue; }
  const item = (await response.json()) as RegistryItem;
  console.log(`\n${item.name} (${item.type})`);
  for (const file of item.files) {
    const rule = PATHS.find(([pattern]) => pattern.test(file.path));
    if (!rule) { console.log(`  ? ${file.path}: no mapping, skipped`); continue; }
    const target = file.path.replace(rule[0], rule[1]);
    const content = IMPORTS.reduce((text, [pattern, alias]) => text.replace(pattern, alias), file.content);
    if (content.includes("@/registry/")) console.log(`  ! ${target}: still imports @/registry/, remap by hand`);
    const absolute = join(ROOT, target);
    if (!existsSync(absolute)) {
      if (!dryRun) { mkdirSync(dirname(absolute), { recursive: true }); writeFileSync(absolute, content); }
      console.log(`  + ${target}${dryRun ? " (dry run)" : ""}`);
      continue;
    }
    if (readFileSync(absolute, "utf8") === content) { console.log(`  = ${target} (identical)`); continue; }
    const copy = join(tmpdir(), "dashboardcn-upstream", target);
    mkdirSync(dirname(copy), { recursive: true });
    writeFileSync(copy, content);
    console.log(`  ~ ${target}: kept local; upstream differs (copy: ${copy})`);
  }
  for (const dep of item.dependencies ?? []) {
    const bare = dep.replace(/(?<=.)@.*$/, "");
    if (!installed.has(bare)) missingNpm.add(dep);
  }
  for (const dep of item.registryDependencies ?? []) {
    if (/^[a-z0-9-]+$/.test(dep) && !existsSync(join(ROOT, "src/client/components/ui", `${dep}.tsx`))) missingUi.add(dep);
    else if (!/^[a-z0-9-]+$/.test(dep)) console.log(`  ? registry dependency ${dep}: check by hand`);
  }
}

if (missingUi.size) console.log(`\nMissing shadcn primitives (none of them exist locally, so the CLI is safe for these): bunx shadcn@latest add ${[...missingUi].join(" ")}`);
if (missingNpm.size) console.log(`\nMissing npm dependencies: bun add ${[...missingNpm].join(" ")}`);
console.log("\nNext: edit the new files to DESIGN.md (tokens, full numbers, \"—\" never 0), then run the gates in .agents/skills/bun-quality-gates.");
process.exit(failed ? 1 : 0);
