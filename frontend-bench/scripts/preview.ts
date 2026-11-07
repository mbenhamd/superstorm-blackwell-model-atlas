import { join } from "node:path";
const root = join(import.meta.dir, "../public");
const port = Number(process.env.PORT ?? 3000);
const allowed: Record<string, string> = { "/": "index.html", "/index.html": "index.html", "/assets/app.js": "assets/app.js", "/assets/styles.css": "assets/styles.css" };
const server = Bun.serve({ hostname: "127.0.0.1", port,
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
    const file = allowed[new URL(request.url).pathname];
    if (!file) return new Response("Not found", { status: 404 });
    const asset = Bun.file(join(root, file));
    return await asset.exists() ? new Response(request.method === "HEAD" ? null : asset, { headers: { "X-Content-Type-Options": "nosniff", "Cache-Control": "no-cache" } }) : new Response("Build assets missing. Run bun run build.", { status: 404 });
  },
});
console.log(`Offline-mode preview: http://127.0.0.1:${server.port}`);
