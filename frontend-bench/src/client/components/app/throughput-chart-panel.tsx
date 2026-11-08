import * as React from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartActions } from "./chart-panel.js";
import { Panel } from "./primitives.js";

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Chart panel for the Throughput and Engine pages: the shared ChartPanel layout (header actions Expand, Download
 * PNG, Copy image; expanded dialog with a taller plot) with one difference below 640px: Expand stays a direct icon
 * button beside the overflow (⋯) menu instead of being dropped, so the taller plot is one tap away on a phone.
 * Kept page-local because chart-panel.tsx is shared; the DOM contract (`data-chart-panel`, `data-chart-action`,
 * `chart-dialog`) is the same, so tests and PNG export treat both alike.
 */
export function ExpandableChartPanel({ title, description, actions, chart, className, id }: {
  title: string; description?: React.ReactNode; actions?: React.ReactNode; chart: (expanded: boolean) => React.ReactNode; className?: string; id?: string;
}) {
  const inline = React.useRef<HTMLDivElement>(null);
  const large = React.useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  return (
    <>
      <Panel id={id} className={cn(
        "flex flex-col",
        "[&>div:first-child:not(:last-child)]:flex-1 [&>div:first-child:not(:last-child)]:items-start",
        "[&>div:first-child:not(:last-child)>div:first-child]:pt-0.5",
        !actions && "[&>div:first-child]:flex-nowrap",
        className,
      )} title={title} description={description} actions={<>
        {actions}
        <Button variant="ghost" size="icon" className="-my-1 sm:hidden" aria-label={`Expand chart: ${title}`} onClick={() => setExpanded(true)} data-chart-action="expand-direct"><Maximize2 aria-hidden="true" /></Button>
        <ChartActions title={title} target={inline} onExpand={() => setExpanded(true)} />
      </>}>
        <div ref={inline} data-chart-panel={slug(title)}>{chart(false)}</div>
      </Panel>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="bg-card max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[1200px] overflow-y-auto sm:max-w-[1200px]" data-testid="chart-dialog" onOpenAutoFocus={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement).focus(); }}>
          <DialogHeader className="flex-row items-start justify-between gap-4 pr-8">
            <div className="min-w-0 space-y-1">
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">Expanded chart</DialogDescription>}
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}<ChartActions title={title} target={large} /></div>
          </DialogHeader>
          <div ref={large}>{expanded ? chart(true) : null}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
