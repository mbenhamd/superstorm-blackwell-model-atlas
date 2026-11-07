import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "../../lib/toast.js";

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
