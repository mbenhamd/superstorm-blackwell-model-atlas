import { watch } from "node:fs";
import { join } from "node:path";
import { buildClient } from "./build.js";
await buildClient(true);
const root = join(import.meta.dir, "..");
const server = Bun.spawn([process.execPath, "--watch", "src/server/index.ts"], { cwd: root, stdin: "inherit", stdout: "inherit", stderr: "inherit", env: process.env });
let timer: ReturnType<typeof setTimeout> | undefined;
let build = Promise.resolve();
function scheduleBuild(): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    build = build.then(() => buildClient(true)).then(() => console.log("Client rebuilt. Refresh the browser to view changes.")).catch((error) => console.error(error));
  }, 100);
}
const watchers = ["src/client", "src/domain"].map((directory) => watch(join(root, directory), { recursive: true }, scheduleBuild));
function cleanup(): void { clearTimeout(timer); watchers.forEach((watcher) => watcher.close()); server.kill(); }
process.once("SIGINT", cleanup);
process.once("SIGTERM", cleanup);
const code = await server.exited;
cleanup();
process.exit(code);
