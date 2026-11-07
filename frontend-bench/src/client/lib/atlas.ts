import { ATLAS } from "../../domain/catalog.js";

/**
 * Read-only views of the pinned atlas snapshot (src/data/atlas.json): model facts, engine reviews,
 * Artificial Analysis Intelligence Index records and publisher benchmark tables from Hugging Face cards.
 * Model-level scores are never attached to an export or configuration as if measured there.
 */

export type AtlasModel = (typeof ATLAS.models)[number];
export type AtlasArtifact = (typeof ATLAS.artifacts)[number];
export type AaRelease = (typeof ATLAS.intelligence.releases)[number];
export type AaVariant = AaRelease["variants"][number];

export const intelligence = ATLAS.intelligence;
export const atlasMeta = ATLAS.atlas;
export const atlasModel = (id: string): AtlasModel | undefined => ATLAS.models.find((model) => model.id === id);
export const artifact = (id: string): AtlasArtifact | undefined => ATLAS.artifacts.find((item) => item.id === id);
export const artifactsOf = (modelId: string): AtlasArtifact[] => ATLAS.artifacts.filter((item) => item.modelId === modelId);
/** Requested export names with no artifact on the Hub; never mapped to another repository. */
export const unavailableExportsOf = (modelId: string) => ATLAS.unavailableExports.filter((item) => item.modelId === modelId);
export const aaRelease = (modelId: string): AaRelease | undefined => ATLAS.intelligence.releases.find((release) => release.catalogKey === modelId);

/** Highest published v5.0.1 variant of a catalog model, with its effort setting; null when AA has no composite. */
export function aaHeadline(modelId: string): { index: number; variant: AaVariant; release: AaRelease } | null {
  const release = aaRelease(modelId);
  const variant = release?.variants.find((item) => item.slug === release.highest?.slug);
  return release && variant && variant.index !== null ? { index: variant.index, variant, release } : null;
}
export const effortLabel = (variant: { effort: string }): string => variant.effort === "reasoning, no effort setting" ? "reasoning" : variant.effort;

export interface CardTable {
  heading: string; line_start: number; line_end: number; settings: string | null;
  columns: string[]; baseline_column: string | null; rows: { benchmark: string; values: Record<string, number | string> }[];
}
export interface CardRecord {
  card_path: string; catalog_key: string; variant_key: string | null; role: string; hf_id: string; revision: string | null;
  source_id: string | null; precision: string | null; tables: CardTable[]; notes: string;
}
export const cardBenchmarks = ATLAS.cardBenchmarks as { extractedOn: string; method: string; cards: CardRecord[] } | null;
export const cardsOf = (modelId: string): CardRecord[] => (cardBenchmarks?.cards ?? []).filter((card) => card.catalog_key === modelId);
export const cardFor = (modelId: string, variantKey: string | null): CardRecord | undefined =>
  cardsOf(modelId).find((card) => card.variant_key === variantKey && (variantKey !== null || card.role === "base"));

export const hfUrl = (hfId: string, revision?: string | null): string => `https://huggingface.co/${hfId}${revision ? `/tree/${revision}` : ""}`;
export const shortSha = (sha: string | null | undefined): string => (sha ? sha.slice(0, 7) : "—");
export const paramsLabel = (model: { totalParamsB: number | null; activeParamsB: number | null }): string =>
  model.totalParamsB === null ? "Parameters not established" : `${model.totalParamsB >= 100 ? Math.round(model.totalParamsB) : model.totalParamsB}B total${model.activeParamsB !== null && model.activeParamsB !== model.totalParamsB ? ` · ${model.activeParamsB}B active` : ""}`;
export const contextLabel = (tokens: number): string => tokens >= 1_000_000 ? `${(tokens / 1_048_576).toFixed(tokens % 1_048_576 ? 1 : 0)}M context` : `${Math.round(tokens / 1024)}K context`;

/** Mean of (quantized − baseline) over a card table's numeric rows; a calculation on the card's own claims. */
export function cardRetention(card: CardRecord): { mean: number; rows: number; heading: string } | null {
  for (const table of card.tables) {
    const base = table.baseline_column;
    const other = table.columns.filter((column) => column !== base);
    if (!base || other.length !== 1) continue;
    const deltas = table.rows.map((row) => {
      const b = row.values[base], q = row.values[other[0]!];
      return typeof b === "number" && typeof q === "number" ? q - b : null;
    }).filter((value): value is number => value !== null);
    if (deltas.length) return { mean: deltas.reduce((sum, value) => sum + value, 0) / deltas.length, rows: deltas.length, heading: table.heading };
  }
  return null;
}

/** 0–100 display scale for one AA component: pass rates ×100; AA-Briefcase Elo through AA's clamp((Elo − 500) / 2000). */
export const componentScore = (name: string, raw: number): number => /briefcase/i.test(name) ? Math.max(0, Math.min(1, (raw - 500) / 2000)) * 100 : raw * 100;

/**
 * Per-category score (Knowledge Work, Coding, Science, General): weight-averaged component scores on the 0–100 display
 * scale. A calculation on AA's published components, not an AA-published number; null when any component is missing.
 */
export function categoryScores(variant: { components: Record<string, number | null> }): { category: string; score: number | null }[] {
  const categories = [...new Set(ATLAS.intelligence.components.map((component) => component.category))];
  return categories.map((category) => {
    const members = ATLAS.intelligence.components.filter((component) => component.category === category);
    if (members.some((component) => variant.components[component.evaluation] === null || variant.components[component.evaluation] === undefined)) return { category, score: null };
    const weight = members.reduce((sum, component) => sum + component.weight, 0);
    return { category, score: members.reduce((sum, component) => sum + component.weight * componentScore(component.evaluation, variant.components[component.evaluation] as number), 0) / weight };
  });
}
