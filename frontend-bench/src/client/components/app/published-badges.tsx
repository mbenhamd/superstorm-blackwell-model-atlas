import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FLAG_LABELS, VERSION_CLASS_LABELS, hardwareClass, hardwareStatus, sourceLinkText, weakReasons,
  type ExternalRecord, type ExternalSource, type VersionClass,
} from "../../../domain/external.js";
import { externalDataset } from "../../lib/external.js";
import { engineKey, engineLabel } from "./published-data.js";

/*
 * Shared marks for external published records (evidence class "external"): engine-version audit badge, hardware
 * with a badge when it is not the B300 target, caveat flag chips with their descriptions, the weak-record badge and
 * the source link. Dataset strings sit in tooltips (rendered on demand), never in `title` attributes.
 */

const focusable = "outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring";
const AUDIT_VARIANT: Record<VersionClass, "good" | "warning" | "neutral" | "critical"> = {
  stable: "good", prerelease: "warning", "nightly-or-commit": "warning", "custom-tag": "neutral", "not-stated": "neutral", invalid: "critical",
};

/** "External (published)": the evidence class of every number on these views. */
export function ExternalEvidenceBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" tabIndex={0} className={cn("cursor-help", focusable, className)} data-evidence="external">External (published)</Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">Published by a third party, an engine project or a vendor; not measured here. Never ranked against measured runs and no SLO is applied.</TooltipContent>
    </Tooltip>
  );
}

/** Engine-version audit class (stable ✓ / pre-release / nightly / custom build / not stated / invalid ✗) with the audit facts on hover. */
export function VersionAuditBadge({ record, className }: { record: ExternalRecord; className?: string }) {
  const audit = record.audit;
  const description = externalDataset().conventions.versionClasses[audit.class];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={AUDIT_VARIANT[audit.class]} tabIndex={0} className={cn("shrink-0 cursor-help", focusable, className)} data-version-class={audit.class}>
          {VERSION_CLASS_LABELS[audit.class]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-80 text-left text-pretty">
        <span className="block font-medium">Engine version audit: {VERSION_CLASS_LABELS[audit.class]}</span>
        {description ? <span className="text-background/80 block">{description}</span> : null}
        <span className="text-background/80 mt-1 block [overflow-wrap:anywhere]">As published: {audit.raw}</span>
        {audit.canonical ? <span className="text-background/80 block [overflow-wrap:anywhere]">Identified as {audit.canonical}{audit.releaseDate ? ` · released ${audit.releaseDate}` : ""}{audit.baseRelease ? ` · base ${audit.baseRelease}` : ""}</span> : null}
        {audit.flags.length ? <span className="text-background/80 block [overflow-wrap:anywhere]">Checks: {audit.flags.join(", ")}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

/** The version a record resolves to: the audit's canonical tag, else the published string; null when not stated. */
export const resolvedVersion = (record: ExternalRecord): string | null =>
  record.audit.canonical ?? (record.audit.class === "not-stated" ? null : record.engineVersion);

/**
 * The resolved engine version in mono, visible inline (never only in a tooltip). Long image tags wrap onto at most two
 * lines and end with a visible ellipsis; the full resolved and published strings are in the tooltip (keyboard focusable).
 */
export function VersionString({ record, className }: { record: ExternalRecord; className?: string }) {
  const version = resolvedVersion(record);
  if (!version) return null;
  const published = record.audit.raw && record.audit.raw !== version ? record.audit.raw : null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={cn("text-ink-2 line-clamp-2 min-w-0 cursor-help font-mono text-[11.5px] leading-snug break-all", focusable, className)} data-engine-version={version}>{version}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-80 text-left text-pretty">
        <span className="block font-mono [overflow-wrap:anywhere]">{version}</span>
        {published ? <span className="text-background/80 block [overflow-wrap:anywhere]">As published: {published}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

/** Engine family and the identified version (canonical tag, else the published string), then the audit badge. */
export function EngineVersion({ record, className }: { record: ExternalRecord; className?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5", className)} data-engine-family={engineKey(record)}>
      <span className="font-medium whitespace-nowrap">{engineLabel(engineKey(record))}</span>
      <VersionString record={record} />
      <VersionAuditBadge record={record} />
    </span>
  );
}

/**
 * "8× B300" for the target GPU; a stated other GPU is a badge ("not B300" on hover with the published GPU type); a GPU
 * type the source does not state reads "hardware not stated", never as a mismatch.
 */
export function HardwareMark({ record, className }: { record: ExternalRecord; className?: string }) {
  const kind = hardwareClass(record.gpuType), status = hardwareStatus(record);
  const count = record.gpuCount === null ? null : `${record.gpuCount}×`;
  if (status === "target") return <span className={cn("whitespace-nowrap tabular-nums", className)} data-hardware="B300">{count} B300</span>;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1 tabular-nums", className)} data-hardware={kind} data-hardware-status={status}>
      {count}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" tabIndex={0} className={cn("cursor-help", focusable)}>{status === "unstated" ? "hardware not stated" : kind === "other" ? "Other GPU" : kind}</Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-72 text-pretty">{status === "unstated" ? "The source states no GPU type; the hardware is unknown, so it can be neither matched with nor excluded from B300." : `Not B300 (the console target) · published as ${record.gpuType}`}</TooltipContent>
      </Tooltip>
    </span>
  );
}

/** Caveat flags as short labels: the first `max` as chips, the rest behind "+N"; each description on hover. */
export function FlagChips({ flags, max = 2, className }: { flags: readonly string[]; max?: number; className?: string }) {
  if (!flags.length) return <span className="text-muted-foreground" data-missing="true">—</span>;
  const descriptions = externalDataset().conventions.flags;
  const shown = flags.slice(0, max), rest = flags.slice(max);
  const chip = (flag: string) => (
    <Tooltip key={flag}>
      <TooltipTrigger asChild>
        <Badge variant="neutral" tabIndex={0} className={cn("block max-w-full cursor-help truncate leading-5", focusable)} data-flag={flag}>{FLAG_LABELS[flag] ?? flag}</Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty"><span className="font-medium">{FLAG_LABELS[flag] ?? flag}</span>{descriptions[flag] ? <span className="text-background/80"> · {descriptions[flag]}</span> : null}</TooltipContent>
    </Tooltip>
  );
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-1", className)} data-flag-count={flags.length}>
      {shown.map(chip)}
      {rest.length ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="neutral" tabIndex={0} className={cn("cursor-help", focusable)} aria-label={`${rest.length} more flags: ${rest.map((flag) => FLAG_LABELS[flag] ?? flag).join(", ")}`}>+{rest.length}</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-80 text-left">
            {rest.map((flag) => <span key={flag} className="block"><span className="font-medium">{FLAG_LABELS[flag] ?? flag}</span><span className="text-background/80"> · {descriptions[flag] ?? ""}</span></span>)}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

/** "Weak" for a record hidden by default, with its reasons. Nothing for other records. */
export function WeakBadge({ record, className }: { record: ExternalRecord; className?: string }) {
  const reasons = weakReasons(record);
  if (!reasons.length) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="critical" tabIndex={0} className={cn("shrink-0 cursor-help", focusable, className)} data-weak="true" aria-label={`Weak record: ${reasons.join(", ")}`}>Weak</Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">Hidden by default: {reasons.join(", ")}</TooltipContent>
    </Tooltip>
  );
}

/** Publisher with an outbound link to the source (title in the link's accessible name and tooltip). */
export function SourceLink({ source, showTitle = false, className }: { source: ExternalSource | undefined; showTitle?: boolean; className?: string }) {
  if (!source) return <span className="text-muted-foreground">—</span>;
  const link = (
    <a href={source.url} target="_blank" rel="noreferrer noopener" className={cn("text-link inline-flex min-w-0 items-center gap-1 hover:underline", focusable)} aria-label={`${source.publisher}: ${source.title} (opens the source)`} data-source-id={source.id} onClick={(event) => event.stopPropagation()}>
      <span className="truncate" title={showTitle ? source.title : undefined}>{showTitle ? sourceLinkText(source) : source.publisher}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
    </a>
  );
  if (showTitle) return <span className={cn("inline-flex min-w-0", className)}>{link}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex min-w-0", className)}>{link}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-80 text-pretty">{source.title}</TooltipContent>
    </Tooltip>
  );
}

