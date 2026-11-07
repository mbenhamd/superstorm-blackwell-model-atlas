import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Deployment } from "../../../domain/types.js";
import { engineBuildDetail, engineVersion, recheckNote, testedLabel } from "../../lib/display.js";

/** Configured engine build, with the latest release recheck as a muted second line (never as the build itself). */
export function EngineBuild({ deployment: d, showEngine = true, size = "sm" }: { deployment: Deployment; showEngine?: boolean; size?: "sm" | "title" }) {
  const note = d.recheck ? `Rechecked ${/^v\d/.test(d.recheck.engineRelease) ? d.recheck.engineRelease : "(unreleased)"}` : null;
  const title = size === "title";
  return (
    <span className={cn("inline-flex min-w-0 flex-col", title && "gap-0.5")} data-engine-build={d.runtimeVersion}>
      {/* "title": engine · build at the 13px/600 panel-title size (engine cards); "sm": table cells. */}
      <span className={cn(title ? "text-[13px] leading-5 font-semibold" : "whitespace-nowrap")} title={engineBuildDetail(d)}>{showEngine ? <span className={title ? undefined : "font-medium"}>{d.runtime}{title ? " · " : " "}</span> : null}<span className={title ? "text-foreground" : "text-ink-2"}>{engineVersion(d)}</span></span>
      {note && d.recheck ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="text-muted-foreground w-fit cursor-help text-[11.5px] whitespace-nowrap underline decoration-dotted underline-offset-2" data-recheck={d.recheck.engineRelease}>{note}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-80 text-left">
            <span className="block font-medium">{recheckNote(d)}</span>
            <span className="block font-medium">{d.recheck.checkedOn} · {d.recheck.engineRelease} · {testedLabel(d.recheck.testedOnTarget)}</span>
            {d.recheck.argumentStatus ? <span className="text-background/80 mt-1 block">{d.recheck.argumentStatus}</span> : null}
            {d.recheck.reconciliation.length ? <span className="text-background/80 mt-1 block">{d.recheck.reconciliation.length} required reconciliation item{d.recheck.reconciliation.length > 1 ? "s" : ""}; see the configuration details.</span> : null}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

/** Latest release recheck as a list: status of the argument array and every required reconciliation item. */
export function RecheckDetails({ deployment: d }: { deployment: Deployment }) {
  if (!d.recheck) return null;
  const r = d.recheck;
  return (
    <section className="space-y-2" data-testid="recheck-details">
      <h3 className="text-xs font-semibold">Latest release recheck · {/^v\d/.test(r.engineRelease) ? r.engineRelease : "unreleased build"} · {r.checkedOn}</h3>
      <p className="text-muted-foreground text-xs text-pretty">{r.argumentStatus ?? "Argument status not recorded."} {testedLabel(r.testedOnTarget)}.</p>
      {r.reconciliation.length ? (
        <>
          <h4 className="text-ink-2 text-xs font-medium">Required reconciliation</h4>
          <ul className="text-ink-2 list-disc space-y-1 pl-4 text-[13px] text-pretty">{r.reconciliation.map((line) => <li key={line}>{line}</li>)}</ul>
        </>
      ) : null}
      {d.priorRechecks.length ? <p className="text-muted-foreground text-xs">Earlier rechecks: {d.priorRechecks.map((item) => `${item.engineRelease} (${item.checkedOn})`).join(", ")}</p> : null}
    </section>
  );
}
