import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "../../lib/toast.js";
import { recordedOverrides } from "../../../domain/run-config.js";
import type { Deployment } from "../../../domain/types.js";

/**
 * A copyable shell command: one flag per line with `\` continuations, flags and values in distinct tones.
 * Copy writes the exact text shown, which pastes as one command in POSIX shells and KServe `command:` lists.
 */
export function CommandBlock({ command, title, caption, className, testId = "command-block" }: {
  command: string; title: React.ReactNode; caption?: React.ReactNode; className?: string; testId?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(command).then(
      () => { setCopied(true); toast("Command copied", "Paste it as-is; line continuations are POSIX shell."); setTimeout(() => setCopied(false), 1500); },
      () => toast("Copy unavailable", "Select the command text instead.", true),
    );
  };
  const lines = command.split("\n");
  return (
    <section className={cn("bg-card overflow-hidden rounded-lg border", className)} data-testid={testId}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold">{title}</h3>
          {caption ? <p className="text-muted-foreground text-xs text-pretty">{caption}</p> : null}
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={copy} data-testid="copy-command" aria-label={copied ? "Command copied" : "Copy command"}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="bg-subtle overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-6" aria-label="Serve command"><code>
        {lines.map((line, index) => {
          const match = /^(\s*)(--?[\w-]+)(.*?)( \\)?$/.exec(line);
          return (
            <React.Fragment key={index}>
              {index ? "\n" : null}
              {match && index > 0 ? (
                <>{match[1]}<span className="text-brand">{match[2]}</span><span className="text-foreground">{match[3]}</span><span className="text-muted-foreground">{match[4]}</span></>
              ) : (
                <span className="text-foreground font-medium">{line.replace(/ \\$/, "")}{line.endsWith(" \\") ? <span className="text-muted-foreground font-normal"> \</span> : null}</span>
              )}
            </React.Fragment>
          );
        })}
      </code></pre>
    </section>
  );
}

/**
 * Under a configured (catalog) command: the runtime controls the measured run recorded with values that differ from
 * the command, so a copied command is never taken for a reproduction of the measured numbers. Renders nothing when
 * the run recorded no differing control. Shared by the TL;DR sheet, Throughput and the evidence sheet.
 */
export function RecordedOverridesNote({ deployment, testId, action }: { deployment: Deployment; testId: string; action?: React.ReactNode }) {
  const overrides = recordedOverrides(deployment);
  if (!overrides.length) return null;
  return (
    <p className="border-warning/40 bg-warning-soft text-ink-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-xs text-pretty" data-testid={testId}>
      <span>
        The measured run recorded different values:{" "}
        {overrides.map(({ recorded, configured }, index) => (
          <React.Fragment key={recorded.key}>
            {index ? ", " : null}
            <span className="text-foreground font-mono" title={`Configured ${configured.field} ${configured.raw}`} data-override={recorded.field ?? recorded.key}>{recorded.field} {recorded.raw}</span>
          </React.Fragment>
        ))}
        . The configured command is not a full record of the run: controls it leaves unset fall back to engine defaults.
      </span>
      {action}
    </p>
  );
}
