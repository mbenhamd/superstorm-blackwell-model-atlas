import { describe, expect, test } from "bun:test";
import { substringFilter } from "../src/client/lib/search.js";

const models: [string, string[]][] = [
  ["glm-5.3", ["GLM 5.3", "glm-5.3", "z-ai", "zai-org/GLM-5.3"]],
  ["glm-5.3-flash", ["GLM 5.3 Flash", "glm-5.3-flash", "z-ai", "zai-org/GLM-5.3-Flash"]],
  ["mistral-large-4", ["Mistral Large 4", "mistral-large-4", "mistral-ai", "mistralai/Mistral-Large-4-1T-A52B"]],
  ["muse-glimmer-30b", ["Muse Glimmer 30B", "muse-glimmer-30b", "meta", "meta-models/Muse-Glimmer-30B"]],
  ["gemma-4-31b-it", ["Gemma 4 31B IT", "gemma-4-31b-it", "google", "google/gemma-4-31B-it"]],
];
const rank = (search: string) => models
  .map(([id, fields]) => ({ id, score: substringFilter(id, search, fields) }))
  .filter((item) => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .map((item) => item.id);

describe("picker substring search", () => {
  test("a contiguous substring is required: 'gemma' matches only Gemma, not fuzzy subsequences (GLM, Mistral, Muse)", () => {
    expect(rank("gemma")).toEqual(["gemma-4-31b-it"]);
    expect(rank("GEMMA 4")).toEqual(["gemma-4-31b-it"]);
  });

  test("label prefix > label substring > keyword substring", () => {
    expect(substringFilter("x", "glm", ["GLM 5.3"])).toBe(1);
    expect(substringFilter("x", "flash", ["GLM 5.3 Flash"])).toBe(0.9);
    expect(substringFilter("x", "flash glm", ["GLM 5.3 Flash"])).toBe(0.8);
    expect(substringFilter("x", "zai-org", ["GLM 5.3", "zai-org/GLM-5.3"])).toBe(0.6);
    expect(substringFilter("x", "zai 5.3", ["GLM 5.3", "zai-org/GLM-5.3"])).toBe(0.4);
    expect(rank("glm")).toEqual(["glm-5.3", "glm-5.3-flash"]);
  });

  test("every query word must match some field; an empty query keeps everything", () => {
    expect(substringFilter("x", "qwen fp8 sglang", ["Baseline · SGLang", "qwen3.8-27b.fp8.sglang.baseline", "Qwen 3.8 27B", "FP8"])).toBe(0.4);
    expect(substringFilter("x", "qwen nvfp4", ["Baseline · SGLang", "Qwen 3.8 27B", "FP8"])).toBe(0);
    expect(substringFilter("x", "  ", ["anything"])).toBe(1);
  });
});
