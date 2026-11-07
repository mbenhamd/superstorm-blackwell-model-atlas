import { Badge } from "@/components/ui/badge";
import type { Deployment } from "../../../domain/types.js";

/**
 * One status palette on every page: Candidate = accent dot, Probe = warning dot. The full label and the catalog
 * reason sit in the title; the visible text stays one word so it fits tables and stacked rows.
 */
export function StatusBadge({ deployment: d, className }: { deployment: Pick<Deployment, "status" | "reason">; className?: string }) {
  const candidate = d.status === "candidate";
  return (
    <Badge variant={candidate ? "info" : "warning"} className={className} data-status={d.status} title={`${candidate ? "Candidate" : "Compatibility probe"}${d.reason ? `: ${d.reason}` : ""}`}>
      {candidate ? "Candidate" : "Probe"}
    </Badge>
  );
}
