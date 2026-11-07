/**
 * Picker search: contiguous, case-insensitive substring matching instead of cmdk's fuzzy subsequence score, so
 * "gemma" never ranks "GLM 5.3" (g…m…a) first. `fields[0]` is the option label; the rest are the option value and
 * its keywords (id, Hugging Face id, engine, …). Ranking: label prefix (1) > label substring (0.9) > every query word
 * inside the label (0.8) > whole query inside a keyword (0.6) > every query word somewhere (0.4); otherwise hidden (0).
 * The signature matches cmdk's `filter(value, search, keywords)`.
 */
export function substringFilter(_value: string, search: string, fields: readonly string[] = []): number {
  const query = search.trim().toLowerCase();
  if (!query) return 1;
  const [label = "", ...rest] = fields.map((field) => field.toLowerCase());
  if (label.startsWith(query)) return 1;
  if (label.includes(query)) return 0.9;
  const terms = query.split(/[\s·]+/).filter(Boolean);
  if (!terms.length) return 1;
  if (!terms.every((term) => label.includes(term) || rest.some((field) => field.includes(term)))) return 0;
  if (terms.every((term) => label.includes(term))) return 0.8;
  if (rest.some((field) => field.includes(query))) return 0.6;
  return 0.4;
}
