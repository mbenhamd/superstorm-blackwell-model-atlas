import * as React from "react";
import { Activity, BookOpen, Boxes, ChartNoAxesGantt, ChartScatter, Columns2, FlaskConical, Gauge, Globe, Menu, Server, Moon, Rows3, Sun, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { appState, applyTheme, MAX_COMPARE, navigate, persistLocal, routeLabels, routeUrl, update, updateView, useAppState, type Route } from "../../state.js";
import { compactNum } from "../../lib/display.js";
import { BrandMark } from "./primitives.js";
import { atlasMeta } from "../../lib/atlas.js";

const catalogAsOf = atlasMeta.asOf;

const navGroups: { label: string; items: { route: Route; icon: LucideIcon; tag?: string }[] }[] = [
  { label: "Analyze", items: [
    { route: "tldr", icon: Gauge, tag: "Decision" },
    { route: "intelligence", icon: ChartScatter, tag: "Decision" },
    { route: "throughput", icon: Activity },
    { route: "compare", icon: Columns2 },
    { route: "engine", icon: Server },
    { route: "models", icon: Boxes },
    { route: "architecture", icon: ChartNoAxesGantt },
    { route: "deployments", icon: Rows3 },
    { route: "published", icon: Globe },
  ] },
  { label: "Plan", items: [{ route: "new-benchmark", icon: FlaskConical }] },
];

function NavLink({ route, icon: Icon, tag, onNavigate }: { route: Route; icon: LucideIcon; tag?: string; onNavigate?: () => void }) {
  const state = useAppState();
  const active = state.route === route;
  const count = route === "compare" && state.selected.length ? state.selected.length : 0;
  return (
    <a
      href={routeUrl(route)}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/nav relative flex h-7 items-center gap-2 rounded-md px-2 text-[13px] transition-[color,background-color,box-shadow] duration-150",
        active ? "bg-sidebar-active text-foreground font-medium" : "text-ink-2 hover:bg-sidebar-accent hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-foreground" : "text-muted-foreground group-hover/nav:text-foreground")} aria-hidden="true" strokeWidth={1.75} />
      <span className="flex-1">{routeLabels[route]}</span>
      {tag ? <span className="text-muted-foreground text-[10px] font-medium tracking-[0.06em] uppercase" data-nav-tag={tag}>{tag}</span> : null}
      {count ? <Badge variant="info" aria-label={`${count} selected`}>{count}</Badge> : null}
    </a>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <a href={routeUrl("tldr")} onClick={onNavigate} className="flex h-12 shrink-0 items-center gap-2 px-4 text-[13px] font-semibold">
        <BrandMark className="size-[18px]" />
        Bench Console
      </a>
      <nav aria-label="Main" className="flex-1 space-y-4 overflow-y-auto px-2 pt-1">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <div className="text-muted-foreground px-2 pb-1 text-[12px] font-medium tracking-[0.4px]">{group.label}</div>
            {group.items.map((item) => <NavLink key={item.route} {...item} onNavigate={onNavigate} />)}
          </div>
        ))}
      </nav>
      <div className="px-2 py-2">
        <NavLink route="methodology" icon={BookOpen} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="bg-sidebar fixed inset-y-0 left-0 z-30 hidden w-[220px] min-[900px]:block" aria-label="Sidebar">
      <NavContent />
    </aside>
  );
}

export function MobileNav() {
  const state = useAppState();
  return (
    <Sheet open={state.navOpen} onOpenChange={(open) => update((s) => { s.navOpen = open; })}>
      <SheetContent side="left" className="bg-sidebar w-[260px] max-w-[85vw] gap-0 p-0" aria-describedby={undefined}>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Main navigation</SheetDescription>
        <NavContent onNavigate={() => update((s) => { s.navOpen = false; })} />
      </SheetContent>
    </Sheet>
  );
}

export function ThemeToggle() {
  const state = useAppState();
  const next = state.theme === "light" ? "dark" : "light";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Switch to ${next} theme`}
          data-testid="theme-toggle"
          onClick={() => update((s) => { s.theme = next; applyTheme(); persistLocal(); })}
        >
          {state.theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Switch to {next} theme</TooltipContent>
    </Tooltip>
  );
}

export function WorkloadSelect() {
  const state = useAppState();
  return (
    <Select value={state.workload} onValueChange={(value) => updateView((s) => { s.workload = value; s.selected = []; })}>
      <SelectTrigger size="sm" aria-label="Workload" data-testid="workload-select" className="hover:bg-accent h-8 max-w-[52vw] min-w-0 shrink-0 gap-1.5 border-transparent bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent">
        <span className="text-ink-2 hidden font-medium lg:inline">Workload</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" position="popper">
        {state.snapshot.workloads.map((workload) => (
          <SelectItem key={workload.id} value={workload.id}>
            <span className="font-mono text-[12.5px]">{workload.name}</span> <span className="text-muted-foreground hidden tabular-nums sm:inline">· {workload.inputTokens === null ? "variable" : `${compactNum(workload.inputTokens)} → ${compactNum(workload.outputTokens)}`}{workload.turns > 1 ? ` · ${workload.turns} turns` : ""}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Topbar({ children, end }: { children: React.ReactNode; end?: React.ReactNode }) {
  return (
    <header className="bg-topbar sticky top-0 z-20 flex h-12 items-center gap-2 border-b px-4 backdrop-blur-xl backdrop-saturate-150 min-[900px]:rounded-t-lg min-[900px]:px-6">
      <Button variant="ghost" size="icon" className="-ml-1.5 min-[900px]:hidden" aria-label="Open navigation" data-testid="mobile-menu" onClick={() => update((s) => { s.navOpen = true; })}>
        <Menu aria-hidden="true" />
      </Button>
      {/* Global cohort context (dataset, SLO) reads left; data provenance and theme sit right. */}
      <div className="flex min-w-0 flex-1 items-center gap-1">{children}</div>
      {end ? <div className="flex shrink-0 items-center gap-2">{end}</div> : null}
    </header>
  );
}

/**
 * Persistent, non-dismissible banner while the loaded runs include "_test" fixture entries (invented values).
 * It sits above the top bar on every route so no screenshot of fixture numbers can pass for a measurement.
 */
export function TestDataBanner() {
  const state = useAppState();
  if (!state.snapshot.testData) return null;
  return (
    <div role="status" data-testid="test-data-banner" className="bg-warning-soft text-warning-text border-warning/40 flex items-center justify-center gap-2 border-b px-4 py-1.5 text-xs font-semibold tracking-wide min-[900px]:rounded-t-lg">
      <span className="bg-warning size-1.5 rounded-full" aria-hidden="true" />
      TEST DATA — invented values
    </div>
  );
}

/** Provenance of everything on screen: the catalog date, the sources (HF + AA) and how many measured runs are loaded. */
export function DataBadge() {
  const state = useAppState();
  const measured = state.snapshot.deployments.filter((d) => d.evidence === "measured").length;
  // Label counts imported runs (every runtime version and dataset); the tooltip names the measured configuration rows.
  const runs = state.snapshot.runs?.length ?? measured;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a href={routeUrl("methodology")} className="border-border-strong text-ink-2 hover:bg-accent hover:text-foreground hidden h-6 shrink-0 items-center gap-1.5 rounded-sm border px-1.5 text-xs font-medium tabular-nums transition-colors sm:inline-flex" data-testid="data-badge">
          <span className={measured ? "bg-good size-1.5 rounded-full" : "bg-muted-foreground/60 size-1.5 rounded-full"} aria-hidden="true" />
          Catalog {catalogAsOf} · HF + AA · {runs} run{runs === 1 ? "" : "s"}{state.snapshot.testData ? " (TEST)" : ""}
        </a>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">Models, exports and configurations as of {catalogAsOf}, pinned to immutable Hugging Face revisions. Intelligence scores are Artificial Analysis v5.0.1 (model-level). {measured ? `${runs} imported run${runs === 1 ? "" : "s"}; ${measured} configuration × dataset rows carry a measured run${state.snapshot.testData ? " from TEST fixture entries (invented values)" : ""}.` : "No measured runs are loaded; throughput fields stay empty rather than estimated."}</TooltipContent>
    </Tooltip>
  );
}

export function CompareTray() {
  const state = useAppState();
  if (!state.selected.length || state.route === "compare") return null;
  return (
    <div role="region" aria-label="Selected configurations" className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 min-[900px]:pl-[224px]">
      <div className="bg-popover shadow-float animate-in fade-in slide-in-from-bottom-2 pointer-events-auto flex max-w-full items-center gap-1 rounded-lg border p-1 pl-3 duration-150">
        <span className="text-[13px] font-medium tabular-nums whitespace-nowrap">{state.selected.length} selected</span>
        <span className="text-muted-foreground mr-1 text-xs whitespace-nowrap">of {MAX_COMPARE}</span>
        <Button variant="ghost" size="sm" onClick={() => update((s) => { s.selected = []; })}><X aria-hidden="true" />Clear</Button>
        <Button size="sm" data-testid="compare-selected" onClick={() => { appState.compare = [...appState.selected]; navigate("compare", { runs: appState.compare.join(",") }); }}>
          <Columns2 aria-hidden="true" />Compare
        </Button>
      </div>
    </div>
  );
}
