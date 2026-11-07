import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Model } from "../../../domain/types.js";
import { atlasModel } from "../../lib/atlas.js";
import { Panel } from "./primitives.js";

/**
 * Release-note reviews of one model, one row per engine ("vLLM v0.33.0"); the assessment, the NVFP4 note, the source
 * IDs and the review date open in a popover. Reviews are release-note and source inspection, not measurements.
 */
export function ModelsEngineReviews({ model }: { model: Model }) {
  const reviews = atlasModel(model.id)?.reviews;
  if (!reviews?.engines.length) return null;
  return (
    <Panel title="Engine reviews" description={<span title={reviews.deploymentLayer}>Release notes · not measured</span>} bodyClassName="py-1">
      <ul className="divide-y">
        {reviews.engines.map((review) => (
          <li key={review.engine} className="flex min-w-0 items-center gap-3 py-2.5" data-engine-review={review.engine}>
            <h3 className="min-w-0 flex-1 truncate text-[13px]"><span className="font-medium">{review.engine}</span> <span className="text-ink-2">{review.release}</span></h3>
            {review.nvfp4Assessment ? <Badge variant="neutral">NVFP4 note</Badge> : null}
            <span className="text-muted-foreground hidden text-xs tabular-nums sm:inline">{review.sourceIds.length} source{review.sourceIds.length === 1 ? "" : "s"}</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" data-review-trigger={review.engine} aria-label={`Read the ${review.engine} ${review.release} review`}>Review<ChevronRight aria-hidden="true" /></Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(440px,calc(100vw-32px))] space-y-2 text-[13px]" data-review-content={review.engine}>
                <p className="text-muted-foreground text-xs">{review.engine} {review.release} · reviewed {reviews.checkedOn} · not measured</p>
                <p className="max-h-72 overflow-y-auto text-pretty">{review.assessment}</p>
                {review.nvfp4Assessment ? <p className="text-ink-2 border-t pt-2 text-pretty"><span className="text-foreground font-medium">NVFP4: </span>{review.nvfp4Assessment}</p> : null}
                <div className="flex flex-wrap gap-1 border-t pt-2">{review.sourceIds.map((id) => <Badge key={id} variant="mono">{id}</Badge>)}</div>
              </PopoverContent>
            </Popover>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
