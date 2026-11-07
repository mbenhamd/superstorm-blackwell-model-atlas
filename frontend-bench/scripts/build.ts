import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import tailwind from "bun-plugin-tailwind";

const root = join(import.meta.dir, "..");

/** Bundles the React client with Bun, compiles Tailwind v4, and writes public/ plus the offline preview.html. */
export async function buildClient(development = false): Promise<void> {
  const outdir = join(root, "public/assets");
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  const result = await Bun.build({
    entrypoints: [join(root, "src/client/main.tsx")],
    outdir,
    target: "browser",
    format: "esm",
    naming: { entry: "app.[ext]", asset: "[name].[ext]", chunk: "[name].[ext]" },
    minify: !development,
    sourcemap: "none",
    plugins: [tailwind],
    define: { "process.env.NODE_ENV": JSON.stringify(development ? "development" : "production") },
  });
  if (!result.success) throw new AggregateError(result.logs, "Client build failed");
  const css = await Bun.file(join(outdir, "app.css")).text();
  const javascript = await Bun.file(join(outdir, "app.js")).text();
  await Bun.write(join(outdir, "styles.css"), css);
  await rm(join(outdir, "app.css"), { force: true });
  const template = await Bun.file(join(root, "src/client/index.html")).text();
  await Bun.write(join(root, "public/index.html"), template);
  const preview = template
    .replace('<link rel="stylesheet" href="./assets/styles.css">', () => `<style>${css}</style>`)
    .replace('<script type="module" src="./assets/app.js"></script>', () => `<script type="module">${javascript.replaceAll("</script", "<\\/script")}</script>`);
  await Bun.write(join(root, "preview.html"), preview);
  const size = (text: string) => Math.round(new TextEncoder().encode(text).length / 1024);
  console.log(`Built public/ (app.js ${size(javascript)} KiB, styles.css ${size(css)} KiB) and preview.html (${size(preview)} KiB)`);
}
if (import.meta.main) await buildClient();
