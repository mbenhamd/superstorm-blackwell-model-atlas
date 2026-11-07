import * as React from "react";
import { RotateCcw, ServerCrash } from "lucide-react";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCommandPaletteShortcut } from "@/components/ui/command-palette";
import { CommandMenu, EvidenceSheet, ExperimentDialog } from "./components/app/overlays.js";
import { rememberOpener } from "./lib/focus-return.js";
import { CompareTray, DataBadge, MobileNav, Sidebar, TestDataBanner, ThemeToggle, Topbar, WorkloadSelect } from "./components/app/shell.js";
import { SloPopover } from "./components/app/slo-popover.js";
import { WorkloadInfoButton, WorkloadsDialog } from "./components/app/workloads.js";
import { EmptyState } from "./components/app/primitives.js";
import { appState, loadSnapshot, readRoute, restoreLocal, routeLabels, update, useAppState, type Route } from "./state.js";
import { OverviewPage } from "./pages/overview.js";
import { DeploymentsPage } from "./pages/deployments.js";
import { ModelsPage } from "./pages/models.js";
import { ThroughputPage } from "./pages/throughput.js";
import { ComparePage } from "./pages/compare.js";
import { ExperimentsPage } from "./pages/experiments.js";
import { MethodologyPage } from "./pages/methodology.js";
import { EnginePage } from "./pages/engine.js";

const pages: Record<Route, () => React.ReactElement> = {
  tldr: () => <OverviewPage view="tldr" />, intelligence: () => <OverviewPage view="intelligence" />,
  throughput: ThroughputPage, compare: ComparePage, engine: EnginePage, models: ModelsPage,
  deployments: DeploymentsPage, "new-benchmark": ExperimentsPage, methodology: MethodologyPage,
};

class PageBoundary extends React.Component<{ children: React.ReactNode; route: string }, { error: string }> {
  state = { error: "" };
  static getDerivedStateFromError(error: unknown) { return { error: error instanceof Error ? error.message : "Unknown error" }; }
  componentDidUpdate(previous: { route: string }) { if (previous.route !== this.props.route && this.state.error) this.setState({ error: "" }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-state bg-card rounded-lg border">
        <h1 className="sr-only">Error</h1>
        <EmptyState icon={ServerCrash} title="This view could not render" description={this.state.error} action={<Button variant="outline" onClick={() => { location.hash = "#/overview"; this.setState({ error: "" }); }}>Go to Overview</Button>} />
      </div>
    );
  }
}

function LoadingState() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <h1 className="sr-only">Loading</h1>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-[86px] w-full" />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><Skeleton className="h-[420px]" /><Skeleton className="h-[420px]" /></div>
    </div>
  );
}

async function initializeApi(): Promise<void> {
  update((s) => { s.loading = true; s.apiError = ""; });
  try { await loadSnapshot(); readRoute(); }
  catch (error) { appState.apiError = error instanceof Error ? error.message : "API unavailable"; }
  finally { update((s) => { s.loading = false; }); }
}

export function App() {
  const state = useAppState();
  const main = React.useRef<HTMLElement>(null);
  const setCommandOpen = React.useCallback((value: React.SetStateAction<boolean>) => update((s) => {
    const next = typeof value === "function" ? value(s.commandOpen) : value;
    if (next && !s.commandOpen) rememberOpener();
    s.commandOpen = next;
  }), []);
  useCommandPaletteShortcut(setCommandOpen);
  React.useEffect(() => {
    const onHash = () => { update(() => readRoute()); window.scrollTo({ top: 0 }); main.current?.focus({ preventScroll: true }); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  React.useEffect(() => { document.title = `${routeLabels[state.route]} · Bench Console`; }, [state.route]);
  React.useEffect(() => { if (document.querySelector('meta[name="bench-mode"]')?.getAttribute("content") === "api") void initializeApi(); }, []);
  const Page = pages[state.route];
  return (
    <TooltipProvider delayDuration={250}>
      <a href="#main-content" onClick={(event) => { event.preventDefault(); main.current?.focus(); }} data-testid="skip-link" className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2">Skip to main content</a>
      <Sidebar />
      <MobileNav />
      <div className="min-h-dvh min-[900px]:py-2 min-[900px]:pr-2 min-[900px]:pl-[220px]">
        <div className="bg-canvas min-h-dvh min-[900px]:shadow-canvas min-[900px]:min-h-[calc(100dvh-16px)] min-[900px]:rounded-lg">
        {/* One sticky region: the TEST DATA banner (when fixture runs are loaded) stays visible above the top bar. Opaque
            canvas behind both (the banner tint and the top bar are translucent) and above page content (charts, meters). */}
        <div className="bg-canvas sticky top-0 z-40 min-[900px]:rounded-t-lg">
        <TestDataBanner />
        <Topbar end={<><DataBadge /><ThemeToggle /></>}>
          <div className="flex min-w-0 items-center gap-0.5">
            <WorkloadSelect />
            <span className="hidden sm:contents"><WorkloadInfoButton /></span>
          </div>
          <SloPopover />
        </Topbar>
        </div>
        <main id="main-content" ref={main} tabIndex={-1} className="mx-auto w-full max-w-[1320px] px-4 pt-6 pb-24 outline-none min-[900px]:px-8">
          {state.loading ? <LoadingState /> : state.apiError ? (
            <div className="error-state bg-card rounded-lg border">
              <h1 className="sr-only">Workspace unavailable</h1>
              <EmptyState icon={ServerCrash} title="The benchmark API could not be reached" description={state.apiError}
                action={<><Button onClick={() => void initializeApi()}><RotateCcw aria-hidden="true" />Retry</Button><Button variant="outline" onClick={() => update((s) => { s.apiError = ""; s.mode = "local"; restoreLocal(); })}>Use local catalog</Button></>} />
            </div>
          ) : (
            <PageBoundary route={state.route}><Page /></PageBoundary>
          )}
        </main>
        </div>
      </div>
      <CompareTray />
      <EvidenceSheet />
      <ExperimentDialog />
      <WorkloadsDialog />
      <CommandMenu />
      <Toaster theme={state.theme} position="bottom-right" toastOptions={{ className: "!rounded-lg !border !border-border !bg-popover !text-popover-foreground !shadow-float !text-[13px]", descriptionClassName: "!text-muted-foreground" }} />
    </TooltipProvider>
  );
}
