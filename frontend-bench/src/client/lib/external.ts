import raw from "../../../data/external-benchmarks.json";
import { ATLAS } from "../../domain/catalog.js";
import { parseExternalDataset, type ExternalDataset } from "../../domain/external.js";

/**
 * External published results bundled with the console (data/external-benchmarks.json, written and checked by
 * scripts/import-external.ts). Evidence class "external": shown beside, never inside, measured rankings. Parsed and
 * validated once, on first use.
 */
let dataset: ExternalDataset | null = null;
export function externalDataset(): ExternalDataset {
  dataset ??= parseExternalDataset(raw as unknown, {
    modelIds: new Set(ATLAS.models.map((model) => model.id)),
    configurationModels: new Map(ATLAS.configurations.map((config) => [config.id, config.modelId])),
  });
  return dataset;
}
