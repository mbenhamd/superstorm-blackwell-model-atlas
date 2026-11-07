import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native `<details>` disclosure for the Engine and Intelligence pages. Content stays mounted while collapsed, so
 * rows, data-* hooks and tooltip triggers inside it remain in the DOM (Radix popovers and sheets mount lazily).
 *
 * - `card`: a standalone panel-styled section (same frame as Panel), summary in panel-title type.
 * - `inline`: a footer row inside a panel, separated by a hairline, summary in caption type.
 */
export interface EngineIntelDisclosureProps extends Omit<React.ComponentProps<"details">, "children" | "summary"> {
  summary: React.ReactNode;
  /** Muted text after the summary, e.g. a count or the composition of the hidden content. */
  meta?: React.ReactNode;
  /** Right-aligned summary content, e.g. a badge. Clicks inside it still toggle the disclosure. */
  aside?: React.ReactNode;
  variant?: "card" | "inline";
  summaryClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function EngineIntelDisclosure({ summary, meta, aside, variant = "inline", className, summaryClassName, contentClassName, children, ...props }: EngineIntelDisclosureProps) {
  const card = variant === "card";
  return (
    <details
      data-slot="engine-intel-disclosure"
      className={cn("group/disclosure min-w-0", card ? "bg-card shadow-panel rounded-lg border" : "border-t", className)}
      {...props}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 [&::-webkit-details-marker]:hidden",
          card ? "px-4 py-3 text-[13px] font-medium" : "text-muted-foreground hover:text-foreground px-4 py-2.5 text-xs",
          summaryClassName,
        )}
      >
        <ChevronRight className="text-muted-foreground size-4 shrink-0 motion-safe:transition-transform group-open/disclosure:rotate-90" aria-hidden="true" />
        <span className={cn(card ? "text-foreground" : "font-medium")}>{summary}</span>
        {meta ? <span className="text-muted-foreground font-normal tabular-nums">· {meta}</span> : null}
        {aside ? <span className="ml-auto flex items-center gap-1.5 font-normal">{aside}</span> : null}
      </summary>
      <div className={cn(card && "border-t", contentClassName)}>{children}</div>
    </details>
  );
}
