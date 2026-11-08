import { AllocationCard } from "@/components/blocks/allocation-card";
import { flagLabels, hardwareStatus, type ExternalRecord } from "../../../domain/external.js";
import { num } from "../../lib/display.js";

/*
 * Published › shares of the filtered records (dashboardcn allocation cards): how much of what is listed can be read
 * at face value. Each card is one share of the same total (the records under the current filters), never a trend.
 */
const SHARES: { key: string; title: string; description: string; test: (record: ExternalRecord) => boolean }[] = [
  { key: "stable", title: "Stable release", description: "Records whose engine version resolves to a stable vLLM or SGLang release (not nightly, prerelease, custom image or unstated).", test: (record) => record.audit.class === "stable" },
  { key: "b300", title: "On B300", description: "Records whose source states B300 as the GPU. Other GPUs are context, not this console's target hardware.", test: (record) => hardwareStatus(record) === "target" },
  { key: "clean", title: "No caveat", description: "Records without any caveat flag (e.g. cached input in totals, simulated acceptance, different checkpoint, nightly build).", test: (record) => flagLabels(record).length === 0 },
  { key: "ladder", title: "Ladders", description: "Records with a published concurrency sweep rather than a single load point.", test: (record) => record.kind === "ladder" },
];

export function PublishedShares({ records }: { records: readonly ExternalRecord[] }) {
  if (!records.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" data-testid="published-shares">
      {SHARES.map((share) => {
        const count = records.filter(share.test).length;
        return (
          <AllocationCard
            key={share.key}
            title={share.title}
            description={share.description}
            value={count / records.length}
            segments={32}
            stat={{ label: "Records", value: `${num(count)} of ${num(records.length)} shown` }}
            className="shadow-panel rounded-lg gap-2.5 py-3.5 sm:gap-3 sm:py-4 [&_[data-slot=card-footer]]:text-xs [&_[data-slot=card-header]]:px-3.5 sm:[&_[data-slot=card-header]]:px-6 [&_[data-slot=card-content]]:px-3.5 sm:[&_[data-slot=card-content]]:px-6 [&_[data-slot=card-footer]]:px-3.5 sm:[&_[data-slot=card-footer]]:px-6"
            data-share={share.key}
            data-count={count}
          />
        );
      })}
    </div>
  );
}
