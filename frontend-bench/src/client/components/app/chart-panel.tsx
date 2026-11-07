import * as React from "react";
import { Copy, Download, Ellipsis, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { chartToPng, downloadBlob } from "../../lib/chart-image.js";
import { toast } from "../../lib/toast.js";
import { cn } from "@/lib/utils";
import { Panel } from "./primitives.js";

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function IconAction({ label, onClick, children, testId, chartTitle }: { label: string; onClick: () => void; children: React.ReactNode; testId: string; chartTitle: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`${label}: ${chartTitle}`} onClick={onClick} data-chart-action={testId}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Expand, download-PNG and copy-image actions for any chart rendered inside `target`. */
export function ChartActions({ title, target, onExpand }: { title: string; target: React.RefObject<HTMLElement | null>; onExpand?: () => void }) {
  const render = async () => {
    if (!target.current) throw new Error("Chart not ready");
    return chartToPng(target.current, title);
  };
  const download = () => { render().then((blob) => { downloadBlob(blob, `bench-console-${slug(title)}.png`); toast("PNG downloaded", title); }, (error: Error) => toast("Download failed", error.message, true)); };
  const copy = () => {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      toast("Copy unavailable", window.isSecureContext ? "This browser cannot copy images." : "Image copy needs HTTPS or localhost. Use Download PNG.", true);
      return;
    }
    // Build the ClipboardItem synchronously within the click so Safari keeps the user activation.
    navigator.clipboard.write([new ClipboardItem({ "image/png": render() })]).then(() => toast("Image copied", "Paste it into a document or chat."), (error: Error) => toast("Copy failed", error.message, true));
  };
  // Below sm the three icons collapse into one overflow button so they stay on the title row (expand is dropped:
  // the inline plot already spans the phone width).
  return (
    <>
      <div className="-my-1 hidden items-center gap-0.5 sm:flex">
        {onExpand ? <IconAction label="Expand chart" onClick={onExpand} testId="expand" chartTitle={title}><Maximize2 aria-hidden="true" /></IconAction> : null}
        <IconAction label="Download PNG" onClick={download} testId="download" chartTitle={title}><Download aria-hidden="true" /></IconAction>
        <IconAction label="Copy image" onClick={copy} testId="copy" chartTitle={title}><Copy aria-hidden="true" /></IconAction>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="-my-1 sm:hidden" aria-label={`Chart actions: ${title}`} data-chart-action="menu"><Ellipsis aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={download}><Download aria-hidden="true" />Download PNG</DropdownMenuItem>
          <DropdownMenuItem onSelect={copy}><Copy aria-hidden="true" />Copy image</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/**
 * A Panel holding one chart, with expand / download PNG / copy image in the header.
 * `chart(expanded)` renders the chart; expanded charts get a taller plot inside a dialog.
 *
 * Plot alignment: in a grid row the panels stretch to one height. The panel is a flex column whose
 * header (the first child) takes the spare height, so every chart body sits on the panel's bottom
 * edge and plot areas line up even when only some panels carry a description or a title wraps.
 * The header content stays top-aligned.
 */
export function ChartPanel({ title, description, actions, chart, className, id }: {
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
        // Top-aligned, the 20px title line sits 2px high against the 24px action row; nudge it to centre.
        "[&>div:first-child:not(:last-child)>div:first-child]:pt-0.5",
        // Without extra actions the chart actions never wrap under the title (one overflow button below sm).
        !actions && "[&>div:first-child]:flex-nowrap",
        className
      )} title={title} description={description} actions={<>{actions}<ChartActions title={title} target={inline} onExpand={() => setExpanded(true)} /></>}>
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
