import * as React from "react";
import { Activity, ArrowRightLeft, CalendarDays, ClipboardList, Cpu, Download, Ellipsis, FileSearch, Plus, SquareKanban, Table2, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DistributionBar } from "@/components/ui/distribution-bar";
import { DotPlot } from "@/components/ui/dot-plot";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUSES, TRANSITIONS } from "../../domain/validation.js";
import type { Deployment, Experiment, ExperimentStatus } from "../../domain/types.js";
import { gpuFootprint } from "../../domain/validation.js";
import { runIdentity } from "./throughput.js";
import { openExperimentForm, openRun } from "../components/app/overlays.js";
import { EmptyState, PageHeader } from "../components/app/primitives.js";
import { ConfigChips, WorkloadTags } from "../components/app/performance.js";
import { moveExperiment, navigate, update, useAppState } from "../state.js";
import { configDetail, configName, engineBuildDetail, hardwareShape, workloadOf } from "../lib/display.js";
import { exportExperiments } from "../lib/export.js";
import { toast } from "../lib/toast.js";

const statusTone: Record<ExperimentStatus, "neutral" | "info" | "good" | "critical"> = { Backlog: "neutral", Scheduled: "info", Running: "info", Complete: "good", Failed: "critical" };
const statusDot: Record<ExperimentStatus, string> = { Backlog: "bg-muted-foreground/50", Scheduled: "bg-chart-1", Running: "bg-warning", Complete: "bg-good", Failed: "bg-critical" };
const statusColor: Record<ExperimentStatus, string> = { Backlog: "color-mix(in oklab, var(--muted-foreground) 50%, transparent)", Scheduled: "var(--chart-1)", Running: "var(--warning)", Complete: "var(--good)", Failed: "var(--critical)" };
/** model_name and runtime_version exactly as the bench would key the runs of this card. */
function identityOf(deployment: Deployment, dataset: string): { modelName: string; runtimeVersion: string } {
  const values = Object.fromEntries(runIdentity(deployment, dataset));
  return { modelName: values.model_name ?? deployment.artifactId, runtimeVersion: values.runtime_version ?? deployment.runtime };
}

function DatasetChips({ datasets, className, tags = false }: { datasets: string[]; className?: string; tags?: boolean }) {
  return (
    <span className={cn("flex flex-wrap gap-1", className)} data-testid="experiment-datasets-chips">
      {datasets.map((dataset) => {
        const workload = tags ? workloadOf(dataset) : undefined;
        return (
          <span key={dataset} className="bg-subtle text-ink-2 inline-flex items-center gap-1 rounded-sm border py-px pr-0.5 pl-1.5 font-mono text-[11px]">
            {dataset}
            {workload?.tags.length ? <WorkloadTags tags={workload.tags} compact className="[&_[data-slot=badge]]:h-4 [&_[data-slot=badge]]:border-0 [&_[data-slot=badge]]:bg-transparent" /> : null}
          </span>
        );
      })}
    </span>
  );
}

/** Extra wall-clock per sweep from the datasets' "costly · +Nh/run" tags (bench dataset config), summed per card. */
function costlyHours(datasets: string[]): number {
  return datasets.reduce((sum, dataset) => {
    const tag = workloadOf(dataset)?.tags.find((item) => item.startsWith("costly"));
    const hours = tag ? Number(/\+(\d+(?:\.\d+)?)h/.exec(tag)?.[1] ?? 0) : 0;
    return sum + hours;
  }, 0);
}

const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
/** Monday–Sunday of the current ISO week in local time, as YYYY-MM-DD strings. */
function currentWeek(now = new Date()): string[] {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => isoDay(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)));
}

/**
 * Planned dataset runs per target date in the current week (cards × datasets: one run identity per dataset).
 * Planning records, not executed runs; 0 is a real count. One dashboardcn dot column per day, today highlighted.
 */
function WeekStrip({ items }: { items: Experiment[] }) {
  const days = currentWeek();
  const today = isoDay(new Date());
  const counts = days.map((day) => items.filter((item) => item.scheduledDate === day).reduce((sum, item) => sum + item.datasets.length, 0));
  const top = Math.max(4, ...counts);
  return (
    <section className="bg-card shadow-panel rounded-lg border" aria-labelledby="week-title" data-testid="week-strip">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
        <h2 id="week-title" className="text-[13px] font-medium">This week <span className="text-muted-foreground font-normal tabular-nums">{dateLabel(days[0]!)} – {dateLabel(days[6]!)}</span></h2>
        <span className="text-muted-foreground text-xs tabular-nums">{counts.reduce((a, b) => a + b, 0)} planned runs</span>
      </div>
      <ol className="grid grid-cols-7 divide-x" aria-label="Planned runs by target date">
        {days.map((day, index) => {
          const runs = counts[index]!;
          const cards = items.filter((item) => item.scheduledDate === day).length;
          const isToday = day === today;
          return (
            <li key={day} className={cn("flex min-w-0 flex-col items-center gap-1.5 px-1 py-2", isToday && "bg-selection")} data-week-day={day} aria-current={isToday ? "date" : undefined} title={`${runs} planned ${runs === 1 ? "run" : "runs"} · ${cards} ${cards === 1 ? "card" : "cards"}`}>
              <DotPlot data={[runs]} max={top} rows={4} emphasis={0} showTooltip={false} color={isToday ? "var(--brand)" : "var(--chart-1)"} className="h-12 items-end [--dot-gap:0.2rem] [--dot-size:0.5rem]" aria-hidden="true" role={undefined} />
              <span className="flex items-baseline gap-1.5">
                <span className={cn("text-[11px] font-medium uppercase", isToday ? "text-foreground" : "text-muted-foreground")}>{new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span>
                <span className={cn("text-[13px] leading-5 font-semibold tabular-nums", runs === 0 && "text-muted-foreground font-normal")}>{runs}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const dateLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

async function move(id: string, status: ExperimentStatus): Promise<void> {
  try { await moveExperiment(id, status); toast(`Moved to ${status}`, "Planning record only. No job was launched."); }
  catch (error) { toast("Move not allowed", error instanceof Error ? error.message : "Move failed", true); }
}

/** Compact "…" menu: Move to (valid stages only, as a submenu) and Inspect configuration. Keyboard accessible via Radix. */
function CardMenu({ item }: { item: Experiment }) {
  const next = TRANSITIONS[item.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.name}`} data-move-experiment={item.id} onClick={(event) => event.stopPropagation()}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {next.length ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger data-move-submenu={item.id}><ArrowRightLeft aria-hidden="true" />Move to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {next.map((status) => (
                <DropdownMenuItem key={status} data-move-option={status} onSelect={() => void move(item.id, status)}>
                  <span className={cn("size-2 rounded-full", statusDot[status])} aria-hidden="true" />{status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : <DropdownMenuItem disabled>Final stage</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openRun(item.deploymentId)}><FileSearch aria-hidden="true" />Inspect configuration</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Horizontal scroller that fades the edge which still has hidden content. */
function BoardScroller({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });
  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
  }, []);
  React.useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [measure]);
  const mask = edges.left && edges.right ? "linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent)"
    : edges.right ? "linear-gradient(to right, black calc(100% - 32px), transparent)"
    : edges.left ? "linear-gradient(to right, transparent, black 32px)" : undefined;
  return (
    <div ref={ref} onScroll={measure} className="relative overflow-x-auto pb-2" style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined} data-testid="board-scroller" data-overflowing={edges.right || edges.left || undefined}>
      {children}
    </div>
  );
}

function ExperimentCard({ item }: { item: Experiment }) {
  const state = useAppState();
  const deployment = state.snapshot.deployments.find((d) => d.id === item.deploymentId);
  return (
    <article
      draggable
      data-experiment-id={item.id}
      onDragStart={(event) => { event.dataTransfer.setData("text/plain", item.id); event.dataTransfer.effectAllowed = "move"; event.currentTarget.classList.add("opacity-50"); }}
      onDragEnd={(event) => event.currentTarget.classList.remove("opacity-50")}
      className="experiment-card bg-card hover:border-border-strong cursor-grab space-y-2.5 rounded-md border p-3 transition-[border-color,opacity] duration-150 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13.5px] leading-5 font-medium">{item.name}</h3>
        {item.priority === "High" ? <Badge variant="warning">High</Badge> : null}
      </div>
      {deployment ? (() => {
        const identity = identityOf(deployment, item.datasets[0] ?? deployment.workloadId);
        return (
          <button type="button" onClick={() => openRun(deployment.id)} className="hover:bg-subtle -mx-1 block w-[calc(100%+0.5rem)] space-y-0.5 rounded px-1 py-0.5 text-left transition-colors" title={`${configName(deployment)} · ${configDetail(deployment)}`}>
            <span className="block truncate font-mono text-[12px] font-medium" data-testid="experiment-model-name">{identity.modelName}</span>
            <span className="text-muted-foreground block truncate font-mono text-[11.5px]">{identity.runtimeVersion} · {hardwareShape(deployment)}</span>
            <span className="text-muted-foreground block truncate text-[11.5px]">{engineBuildDetail(deployment)}</span>
          </button>
        );
      })() : null}
      {deployment ? <ConfigChips deployment={deployment} max={3} /> : null}
      <DatasetChips datasets={item.datasets} tags />
      {item.blockedReason ? <p className="text-warning-text line-clamp-1 text-xs" title={item.blockedReason}><Badge variant="warning" className="mr-1.5">Blocked</Badge>{item.blockedReason}</p> : null}
      {item.notes ? <p className="text-muted-foreground line-clamp-1 text-xs" title={item.notes}>{item.notes}</p> : null}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-muted-foreground inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs tabular-nums">
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden="true" />{dateLabel(item.scheduledDate)}</span>
          {deployment ? <span className="inline-flex items-center gap-1" title="gpu_footprint: GPUs reserved per dataset run"><Cpu className="size-3.5" aria-hidden="true" />{gpuFootprint(deployment)} GPU</span> : null}
          {costlyHours(item.datasets) > 0 ? <span className="text-warning-text inline-flex items-center gap-1" title="Estimated extra wall-clock from costly datasets (bench dataset tags), not a measurement" data-testid="experiment-costly"><Timer className="size-3.5" aria-hidden="true" />+{costlyHours(item.datasets)}h</span> : null}
          {item.priority === "High" ? null : <span>Normal</span>}
        </span>
        <span className="inline-flex items-center gap-0.5">
          {item.status === "Complete" && deployment ? <Button variant="ghost" size="icon-sm" aria-label={`Results for ${item.name}`} title="Open in Throughput" data-experiment-results={item.id} onClick={() => navigate("throughput", { run: deployment.id })}><Activity aria-hidden="true" /></Button> : null}
          <CardMenu item={item} />
        </span>
      </div>
    </article>
  );
}

function Column({ status, items }: { status: ExperimentStatus; items: Experiment[] }) {
  const [over, setOver] = React.useState(false);
  return (
    <section
      aria-label={`${status} experiments`}
      data-drop-status={status}
      onDragOver={(event) => { event.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => { event.preventDefault(); setOver(false); const id = event.dataTransfer.getData("text/plain"); if (id) void move(id, status); }}
      className={cn("bg-subtle/60 relative flex min-w-0 flex-col gap-2 rounded-lg border p-2 transition-colors duration-150 md:min-h-[220px]", items.length === 0 && "border-dashed", over && "border-ring bg-selection")}
    >
      <div className="flex items-center gap-2 px-1.5 pt-0.5 pb-1">
        <span className={cn("size-2 rounded-full", statusDot[status])} aria-hidden="true" />
        <h2 className="text-[13px] font-semibold">{status}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">{items.length}</span>
        {status === "Backlog" ? <Button variant="ghost" size="icon-sm" className="ml-auto size-6" aria-label="New experiment" onClick={() => openExperimentForm()}><Plus aria-hidden="true" /></Button> : null}
      </div>
      {items.map((item) => <ExperimentCard key={item.id} item={item} />)}
      {items.length === 0 ? <p className="text-muted-foreground flex flex-1 items-center justify-center py-1 text-center text-xs md:py-0" data-empty-column={status}><span aria-hidden="true">—</span><span className="sr-only">No {status.toLowerCase()} experiments; drop a card here</span></p> : null}
    </section>
  );
}

export function ExperimentsPage() {
  const state = useAppState();
  const items = state.snapshot.experiments;
  const storage = state.mode === "local" ? (state.storageAvailable ? "this browser" : "this tab only") : state.mode === "postgres" ? "PostgreSQL" : "server memory until restart";
  return (
    <div className="space-y-4">
      <PageHeader
        title="New benchmark"
        description={<span title={`Saved in ${storage}`}>Plan runs per configuration and dataset.</span>}
        actions={items.length ? (
          <>
            <Button variant="outline" onClick={exportExperiments}><Download aria-hidden="true" />Export plan</Button>
            <Button onClick={() => openExperimentForm()} data-testid="new-experiment"><Plus aria-hidden="true" />New experiment</Button>
          </>
        ) : undefined}
      />
      {items.length === 0 ? (
        // No plan yet: one centred empty state; the week strip and the five-column board appear with the first experiment.
        <div className="bg-card rounded-lg border" data-testid="experiments-empty">
          <EmptyState
            icon={ClipboardList}
            title="No planned runs"
            description="An experiment plans one configuration on one or more datasets. Planning never starts a cluster job."
            action={<Button onClick={() => openExperimentForm()} data-testid="new-experiment"><Plus aria-hidden="true" />New experiment</Button>}
          />
        </div>
      ) : (
      <>
      <WeekStrip items={items} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2" data-testid="experiment-pipeline">
          {items.length ? (
            <DistributionBar
              className="w-40"
              showLegend={false}
              segments={STATUSES.map((status) => ({ name: status, value: items.filter((item) => item.status === status).length, color: statusColor[status] }))}
            />
          ) : null}
          <span className="text-muted-foreground text-xs tabular-nums" title="Drag a card or use its “…” menu to move it">{items.length} experiments</span>
        </div>
        <ToggleGroup type="single" variant="outline" size="sm" value={state.experimentView} aria-label="View" onValueChange={(value: string) => { if (value) update((s) => { s.experimentView = value as "board" | "table"; }); }}>
          <ToggleGroupItem value="board" className="gap-1.5 px-2.5"><SquareKanban className="size-3.5" aria-hidden="true" />Board</ToggleGroupItem>
          <ToggleGroupItem value="table" className="gap-1.5 px-2.5"><Table2 className="size-3.5" aria-hidden="true" />Table</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {state.experimentView === "board" ? (
        <BoardScroller>
          {/* Phones: one stacked list grouped by status; md and up: five columns side by side. */}
          <div className="grid grid-cols-1 items-start gap-3 md:min-w-[960px] md:grid-cols-5">
            {STATUSES.map((status) => <Column key={status} status={status} items={items.filter((item) => item.status === status)} />)}
          </div>
        </BoardScroller>
      ) : (
        <div className="bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Experiment</TableHead>
                <TableHead>model_name · runtime_version</TableHead>
                <TableHead>Datasets</TableHead>
                <TableHead className="text-right">GPUs</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Target date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? <TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="text-muted-foreground py-6 text-center">—</TableCell></TableRow> : null}
              {items.map((item) => {
                const deployment = state.snapshot.deployments.find((d) => d.id === item.deploymentId);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}{item.blockedReason ? <Badge variant="warning" className="ml-2" title={item.blockedReason}>Blocked</Badge> : null}</TableCell>
                    <TableCell>{deployment ? <button type="button" className="text-left hover:underline" onClick={() => openRun(deployment.id)} title={configName(deployment)}><span className="block font-mono text-[12px]">{identityOf(deployment, item.datasets[0] ?? deployment.workloadId).modelName}</span><span className="text-muted-foreground block font-mono text-[11.5px]">{identityOf(deployment, item.datasets[0] ?? deployment.workloadId).runtimeVersion} · {hardwareShape(deployment)}</span></button> : item.deploymentId}</TableCell>
                    <TableCell><DatasetChips datasets={item.datasets} /></TableCell>
                    <TableCell className="text-right tabular-nums">{deployment ? gpuFootprint(deployment) : "—"}</TableCell>
                    <TableCell>{item.priority === "High" ? <Badge variant="warning">High</Badge> : <span className="text-muted-foreground">Normal</span>}</TableCell>
                    <TableCell className="tabular-nums">{dateLabel(item.scheduledDate)}</TableCell>
                    <TableCell><Badge variant={statusTone[item.status]}>{item.status}</Badge></TableCell>
                    <TableCell className="text-right"><CardMenu item={item} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      </>
      )}
    </div>
  );
}
