import { useSyncExternalStore } from "react";
import { createCatalogSnapshot, DEFAULT_WORKLOAD } from "../domain/catalog.js";
import { DEFAULT_SLO } from "../domain/metrics.js";
import type { Experiment, ExperimentInput, ExperimentStatus, SloPolicy, Snapshot } from "../domain/types.js";
import { migrateExperiment, parseExperiment, transitionExperiment } from "../domain/validation.js";
import { SETUP_SORTS, type SetupSort } from "../domain/setups.js";

export type Route = "tldr" | "intelligence" | "throughput" | "compare" | "engine" | "models" | "deployments" | "new-benchmark" | "methodology";
export type ModelTab = "overview" | "precision";
export type Theme = "light" | "dark";
export type SortKey = "model" | "quality" | "capacity" | "latency" | "memory";

/** Sidebar order of the canonical routes; Methodology last. */
export const routeLabels: Record<Route, string> = {
  tldr: "TL;DR", intelligence: "Intelligence", throughput: "Throughput", compare: "Compare", engine: "Engine",
  models: "Models", deployments: "Deployments", "new-benchmark": "New benchmark", methodology: "Methodology",
};
/** Route names from the original app and the previous redesign, resolved to a canonical route plus default parameters. */
export const aliases: Record<string, { route: Route; params?: Record<string, string> }> = {
  overview: { route: "tldr" },
  "intelligence-vs-throughput": { route: "intelligence" },
  "sustainable-throughput": { route: "throughput" },
  "compare-benchmarks": { route: "compare" },
  "compare-runs": { route: "compare" },
  versus: { route: "engine" },
  runtimes: { route: "engine" },
  engines: { route: "engine" },
  quant: { route: "models", params: { model: "qwen3.8-27b", tab: "precision" } },
  quantization: { route: "models", params: { model: "qwen3.8-27b", tab: "precision" } },
  hardware: { route: "deployments" },
  experiments: { route: "new-benchmark" },
};
/** Quality floor for the "fastest with acceptable quality" pick. Stated wherever it is used. */
export const QUALITY_FLOOR = 63;
export const MAX_COMPARE = 4;

export const appState = {
  snapshot: createCatalogSnapshot(), mode: "local" as "local" | "memory" | "postgres",
  route: "tldr" as Route, workload: DEFAULT_WORKLOAD, theme: "light" as Theme, storageAvailable: true,
  query: "", gpu: [] as string[], shape: [] as string[], runtime: [] as string[], precision: [] as string[], model: "all",
  selected: [] as string[], compare: ["qwen3.8-27b.bf16.vllm.baseline", "qwen3.8-27b.fp8.vllm.baseline", "qwen3.8-27b.nvfp4.vllm.baseline"] as string[],
  run: "qwen3.8-27b.fp8.vllm.baseline", pair: "", modelTab: "overview" as ModelTab, runTab: "sweep" as "sweep" | "configuration", experimentView: "board" as "board" | "table",
  frontierOnly: false, logScale: false, sort: "capacity" as SortKey, sortDirection: "desc" as "asc" | "desc",
  slo: { ...DEFAULT_SLO } as SloPolicy, focusId: "",
  /** TL;DR: GPU shape key ("8xB300"; "" = all shapes) and setup sort. The model is `model` ("all" = default model). */
  tldrShape: "", tldrSort: "sustainable" as SetupSort,
  drawerId: "", commandOpen: false, workloadsOpen: false, experimentFormFor: null as string | null, navOpen: false,
  loading: false, apiError: "",
};

/* ----------------------------- tiny external store ----------------------------- */
let version = 0;
const listeners = new Set<() => void>();
export function emit(): void { version++; listeners.forEach((listener) => listener()); }
export function update(mutator: (state: typeof appState) => void): void { mutator(appState); emit(); }
export function useAppState(): typeof appState {
  useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => version, () => version);
  return appState;
}

/* ----------------------------------- routing ----------------------------------- */
const list = (value: string | null): string[] => (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
/**
 * Base configuration id for any deployment id. A measured sibling (`<cfg>@<dataset>`) maps to `<cfg>`, so stored
 * selections stay valid when the active dataset changes. Unknown ids are returned unchanged.
 */
export function configurationIdOf(id: string, snapshot: Snapshot = appState.snapshot): string {
  return snapshot.deployments.find((deployment) => deployment.id === id)?.configurationId ?? id;
}
/** TL;DR shape key: "<GPUs>x<gpu_type>", e.g. "8xB300". */
export const TLDR_SHAPE = /^\d{1,3}x[A-Za-z0-9]{1,24}$/;
export function readRoute(): void {
  const hash = location.hash.replace(/^#\/?/, "");
  const [path = "", query = ""] = hash.split("?");
  const params = new URLSearchParams(query);
  const alias = aliases[path];
  let route: Route = "tldr";
  if (Object.hasOwn(routeLabels, path)) route = path as Route;
  // The old model "engines" tab is now the Engine page.
  if (route === "models" && params.get("tab") === "engines") { route = "engine"; params.delete("tab"); }
  else if (alias) {
    route = alias.route;
    for (const [key, value] of Object.entries(alias.params ?? {})) if (!params.has(key)) params.set(key, value);
  }
  const snapshot = appState.snapshot;
  appState.route = route;
  const workload = params.get("workload");
  appState.workload = workload && snapshot.workloads.some((item) => item.id === workload) ? workload : DEFAULT_WORKLOAD;
  appState.query = params.get("q") ?? "";
  appState.gpu = list(params.get("gpu")).filter((id) => snapshot.hardware.some((item) => item.id === id));
  // Hardware-shape facet values ("8× B300", "1x2B300"); unknown values simply match no row.
  appState.shape = list(params.get("shape")).filter((id) => id.length <= 32);
  appState.runtime = list(params.get("runtime")).filter((id) => id === "vLLM" || id === "SGLang");
  appState.precision = list(params.get("precision")).filter((id) => ["BF16", "FP8", "NVFP4", "MXFP4", "FP4/FP8"].includes(id));
  const model = params.get("model");
  appState.model = model && snapshot.models.some((item) => item.id === model) ? model : "all";
  const tldrShape = params.get("shape");
  appState.tldrShape = route === "tldr" && tldrShape && TLDR_SHAPE.test(tldrShape) ? tldrShape : "";
  const tldrSort = params.get("sort");
  appState.tldrSort = route === "tldr" && SETUP_SORTS.includes(tldrSort as SetupSort) ? tldrSort as SetupSort : "sustainable";
  const tab = params.get("tab");
  appState.modelTab = tab === "precision" ? "precision" : "overview";
  appState.runTab = route === "throughput" && tab === "configuration" ? "configuration" : "sweep";
  appState.logScale = params.get("scale") === "log";
  appState.frontierOnly = params.get("frontier") === "1";
  const pair = params.get("pair");
  appState.pair = pair && /^[a-z0-9._-]+@\d+$/.test(pair) ? pair : "";
  const run = params.get("run");
  if (run && snapshot.deployments.some((deployment) => deployment.id === run)) appState.run = configurationIdOf(run, snapshot);
  if (params.has("runs")) appState.compare = [...new Set(list(params.get("runs")).filter((id) => snapshot.deployments.some((deployment) => deployment.id === id)).map((id) => configurationIdOf(id, snapshot)))].slice(0, MAX_COMPARE);
  appState.navOpen = false;
  // Canonicalize old aliases so shared links show the current route name.
  if (route !== path) history.replaceState(null, "", routeUrl(route, Object.fromEntries([...params].filter(([key]) => key !== "workload"))));
}
export function routeUrl(route: Route, params: Record<string, string> = {}): string {
  const search = new URLSearchParams({ workload: appState.workload, ...params });
  return `#/${route}?${search}`;
}
export function navigate(route: Route, params: Record<string, string> = {}): void {
  appState.navOpen = false;
  location.hash = routeUrl(route, params);
}
/** Parameters that describe the current view; written back to the URL so every view is linkable. */
export function viewParams(route: Route = appState.route): Record<string, string> {
  const params: Record<string, string> = {};
  if (route === "deployments") {
    if (appState.query) params.q = appState.query;
    for (const name of ["gpu", "shape", "runtime", "precision"] as const) if (appState[name].length) params[name] = appState[name].join(",");
    if (appState.model !== "all") params.model = appState.model;
  }
  if (route === "models") { if (appState.model !== "all") { params.model = appState.model; params.tab = appState.modelTab; } else if (appState.query) params.q = appState.query; }
  if (route === "compare") params.runs = appState.compare.join(",");
  if (route === "throughput") { params.run = appState.run; if (appState.runTab === "configuration") params.tab = "configuration"; }
  if (route === "engine") { if (appState.pair) params.pair = appState.pair; else if (appState.model !== "all") params.model = appState.model; }
  if (route === "tldr") {
    if (appState.model !== "all") params.model = appState.model;
    if (appState.tldrShape) params.shape = appState.tldrShape;
    if (appState.tldrSort !== "sustainable") params.sort = appState.tldrSort;
  }
  if (route === "intelligence") { if (appState.logScale) params.scale = "log"; if (appState.frontierOnly) params.frontier = "1"; }
  return params;
}
export function syncUrl(): void { history.replaceState(null, "", routeUrl(appState.route, viewParams())); }
/** Mutate view state, write it to the URL, and re-render. */
export function updateView(mutator: (state: typeof appState) => void): void { mutator(appState); syncUrl(); emit(); }

/* --------------------------------- persistence --------------------------------- */
export function persistLocal(): boolean {
  try {
    localStorage.setItem("bench-console-v1", JSON.stringify({ experiments: appState.snapshot.experiments, theme: appState.theme }));
    appState.storageAvailable = true; return true;
  } catch { appState.storageAvailable = false; return false; }
}
export function restoreLocal(): void {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem("bench-console-v1") ?? "null");
    if (!stored || typeof stored !== "object") return;
    const record = stored as { experiments?: Experiment[]; theme?: string };
    if (Array.isArray(record.experiments)) {
      // Cards saved before datasets existed are upgraded in place; records that no longer resolve are dropped.
      appState.snapshot.experiments = record.experiments.map((item) => migrateExperiment(item, appState.snapshot)).filter((item): item is Experiment => item !== null);
    }
    appState.theme = record.theme === "dark" ? "dark" : "light";
  } catch { appState.storageAvailable = false; /* The console remains usable in tab memory. */ }
}
export function applyTheme(): void {
  document.documentElement.dataset.theme = appState.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", appState.theme === "dark" ? "#010102" : "#f5f6f6");
}

/* ------------------------------------- API ------------------------------------- */
async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...options?.headers }, signal: AbortSignal.timeout(8000) });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status})`);
  return result;
}
export const apiMode = (): boolean => document.querySelector('meta[name="bench-mode"]')?.getAttribute("content") === "api";
export async function loadSnapshot(): Promise<void> {
  if (!apiMode()) return;
  const result = await apiRequest<{ snapshot: Snapshot; mode: "memory" | "postgres" }>("/api/snapshot");
  if (result.snapshot.schemaVersion !== 2) throw new Error("Unsupported snapshot schema");
  appState.snapshot = result.snapshot;
  appState.mode = result.mode;
}
function localId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 15) | 64;
  bytes[8] = ((bytes[8] ?? 0) & 63) | 128;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export async function createExperiment(raw: unknown): Promise<Experiment> {
  const input: ExperimentInput = parseExperiment(raw, appState.snapshot);
  const item = appState.mode === "local"
    ? { ...input, id: localId(), status: "Backlog" as const, owner: "Local plan", version: 1, createdAt: new Date().toISOString() }
    : await apiRequest<Experiment>("/api/experiments", { method: "POST", body: JSON.stringify(input) });
  appState.snapshot.experiments.unshift(item);
  if (appState.mode === "local") persistLocal();
  emit();
  return item;
}
export async function moveExperiment(id: string, status: ExperimentStatus): Promise<void> {
  const index = appState.snapshot.experiments.findIndex((item) => item.id === id);
  const previous = appState.snapshot.experiments[index];
  if (!previous) throw new Error("Experiment not found");
  const candidate = transitionExperiment(previous, status, previous.version);
  const next = appState.mode === "local" ? candidate : await apiRequest<Experiment>(`/api/experiments/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status, version: previous.version }) });
  // Re-resolve by id: a card created during the request shifts the array.
  const current = appState.snapshot.experiments.findIndex((item) => item.id === id);
  if (current >= 0) appState.snapshot.experiments[current] = next;
  if (appState.mode === "local") persistLocal();
  emit();
}
