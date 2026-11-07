import { Effect } from "effect";
import { basename, join } from "node:path";
import { loadRunsFile, makeRepository, Repository, type StoreError } from "./repository.js";
import { ATLAS } from "../domain/catalog.js";
import { parseExperiment, STATUSES, ValidationError } from "../domain/validation.js";
import type { ExperimentStatus } from "../domain/types.js";

const root = join(import.meta.dir, "../..");
const hostname = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer in 1–65535");
if (!["127.0.0.1", "localhost", "::1"].includes(hostname) && process.env.POC_ALLOW_REMOTE !== "true") throw new Error("This unauthenticated POC binds to loopback only. Add authentication before remote access.");
// RUNS_FILE (memory mode only): validated measured runs, e.g. tests/fixtures/sample-runs.json for browser tests.
// It is never loaded by default; an invalid file stops startup rather than serving a partial set.
const runsFile = process.env.RUNS_FILE || undefined;
const runs = runsFile ? await loadRunsFile(runsFile) : undefined;
const repository = makeRepository(process.env.DATABASE_URL || undefined, runs);
const securityHeaders = {
  "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};
const json = (data: unknown, status = 200): Response => Response.json(data, { status, headers: { ...securityHeaders, "Cache-Control": "no-store" } });
function errorResponse(error: unknown): Response {
  const tag = typeof error === "object" && error !== null && "_tag" in error ? String(error._tag) : "";
  if (tag === "ValidationError" || error instanceof SyntaxError) return json({ error: error instanceof Error ? error.message : "Invalid request" }, 400);
  if (tag === "NotFoundError") return json({ error: "Experiment not found" }, 404);
  if (tag === "ConflictError") return json({ error: "This experiment changed. Reload before trying again." }, 409);
  console.error("Request failed", error);
  return json({ error: "The benchmark store is unavailable. Check server logs." }, 503);
}
/** Convert typed failures to HTTP at the boundary, before runPromise can wrap an error. */
async function runHttp<A>(program: Effect.Effect<A, StoreError, Repository>, status = 200): Promise<Response> {
  const handled = program.pipe(Effect.map((result) => json(result, status)), Effect.catch((error) => Effect.succeed(errorResponse(error))), Effect.provide(repository.layer));
  return Effect.runPromise(handled);
}
async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ValidationError("Use Content-Type: application/json");
  return request.json();
}
const server = Bun.serve({
  hostname, port, maxRequestBodySize: 65536,
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);
    if (["POST", "PATCH", "DELETE"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) return json({ error: "Cross-origin writes are not allowed" }, 403);
    }
    try {
      if (url.pathname === "/health" && request.method === "GET") return json({
        ok: true, mode: repository.mode, kind: repository.kind, atlasCommit: ATLAS.atlas.commit,
        // File name only: the full path is a local detail.
        ...(runsFile ? { runsFile: basename(runsFile), runs: runs?.length ?? 0 } : {}),
        databaseConnectivityChecked: false,
      });
      if (url.pathname === "/api/snapshot" && request.method === "GET") return runHttp(Effect.gen(function* () {
        const store = yield* Repository;
        const snapshot = yield* store.snapshot();
        return { snapshot, mode: repository.mode };
      }));
      if (url.pathname === "/api/atlas" && request.method === "GET") return runHttp(Effect.gen(function* () {
        const store = yield* Repository;
        return yield* store.atlas();
      }));
      if (url.pathname === "/api/experiments" && request.method === "POST") {
        const raw = await readJson(request);
        return runHttp(Effect.gen(function* () {
          const store = yield* Repository;
          const snapshot = yield* store.snapshot();
          const input = yield* Effect.try({ try: () => parseExperiment(raw, snapshot), catch: (cause) => cause instanceof ValidationError ? cause : new ValidationError("Invalid experiment") });
          return yield* store.create(input);
        }), 201);
      }
      const match = /^\/api\/experiments\/([^/]+)$/.exec(url.pathname);
      if (match?.[1] && request.method === "PATCH") {
        const raw = await readJson(request);
        if (!raw || typeof raw !== "object") throw new ValidationError("Invalid update");
        const value = raw as Record<string, unknown>;
        if (!STATUSES.includes(value.status as ExperimentStatus) || typeof value.version !== "number" || !Number.isInteger(value.version) || value.version < 1) throw new ValidationError("A valid status and version are required");
        // A malformed percent-escape is a client error (400), not a store failure.
        let id: string;
        try { id = decodeURIComponent(match[1]); } catch { throw new ValidationError("Invalid experiment id"); }
        return runHttp(Effect.gen(function* () {
          const store = yield* Repository;
          return yield* store.move(id, value.status as ExperimentStatus, value.version as number);
        }));
      }
      if (url.pathname.startsWith("/api/")) return json({ error: "Unknown API route or method" }, 404);
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: securityHeaders });
      // Explicit allowlist prevents traversal and accidental exposure of .env or source files.
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const html = await Bun.file(join(root, "public/index.html")).text();
        return new Response(request.method === "HEAD" ? null : html.replace('name="bench-mode" content="offline"', 'name="bench-mode" content="api"'), { headers: { ...securityHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } });
      }
      const assets: Record<string, string> = { "/assets/app.js": "text/javascript; charset=utf-8", "/assets/styles.css": "text/css; charset=utf-8" };
      const contentType = assets[url.pathname];
      if (contentType) {
        const file = Bun.file(join(root, "public", url.pathname.slice(1)));
        if (!await file.exists()) return new Response("Build assets are missing. Run bun run build.", { status: 404 });
        return new Response(request.method === "HEAD" ? null : file, { headers: { ...securityHeaders, "Content-Type": contentType, "Cache-Control": "no-cache" } });
      }
      return new Response("Not found", { status: 404, headers: securityHeaders });
    } catch (error) { return errorResponse(error); }
  },
});
console.log(`Bench Console: http://${hostname}:${server.port} · ${repository.mode} storage · measurements: ${repository.kind}${runsFile ? ` (${basename(runsFile)}, ${runs?.length ?? 0} runs)` : ""} · atlas ${ATLAS.atlas.commit.slice(0, 12)}`);
let stopping = false;
async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  await server.stop(true);
  await repository.close();
}
process.once("SIGINT", () => { void shutdown().then(() => process.exit(0)).catch(() => process.exit(1)); });
process.once("SIGTERM", () => { void shutdown().then(() => process.exit(0)).catch(() => process.exit(1)); });
