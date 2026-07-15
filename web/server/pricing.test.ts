import { describe, expect, test } from "bun:test";
import { estimateSpend, priceUsage, pricingConfig } from "./pricing";

const totals = (inputTokens: number, outputTokens: number, cachedTokens: number) => ({
  inputTokens,
  outputTokens,
  reasoningTokens: 0,
  cachedTokens,
  totalTokens: inputTokens + outputTokens + cachedTokens,
  requests: 1,
});

describe("API list-price estimation", () => {
  test("prices uncached input, cache writes, cache reads, and output independently", () => {
    expect(priceUsage(
      totals(1_000_000, 1_000_000, 3_000_000),
      { creationTokens: 2_000_000, creation1hTokens: 1_000_000, readTokens: 1_000_000 },
      { input: 10, cacheWrite5m: 12.5, cacheWrite1h: 20, cacheRead: 1, output: 50, longContextThreshold: null, longContextInputMultiplier: 1, longContextOutputMultiplier: 1 },
    )).toBe(93.5);
  });

  test("applies GPT-5.6 long-context multipliers per request instead of to the aggregate", () => {
    const rates = pricingConfig().openai;
    const cache = { creationTokens: 0, creation1hTokens: 0, readTokens: 0 };
    expect(priceUsage(totals(272_000, 100_000, 0), cache, rates)).toBeCloseTo(4.36);
    expect(priceUsage(totals(272_001, 100_000, 0), cache, rates)).toBeCloseTo(7.22001);
  });

  test("compares blended cost with the same OpenAI-lane tokens priced as Fable", () => {
    const spend = estimateSpend(
      { fable: totals(100_000, 0, 0), openai: totals(100_000, 0, 0) },
      { fable: { creationTokens: 0, creation1hTokens: 0, readTokens: 0 }, openai: { creationTokens: 0, creation1hTokens: 0, readTokens: 0 } },
      { fable: [], openai: [] },
    );
    expect(spend.fable).toBe(1);
    expect(spend.openai).toBe(0.5);
    expect(spend.actual).toBe(1.5);
    expect(spend.fableOnlyBaseline).toBe(2);
    expect(spend.savings).toBe(0.5);
    expect(spend.savingsPercent).toBe(25);
    expect(spend.routedLaneSavingsPercent).toBe(50);
  });

  test("accepts non-negative environment overrides and rejects invalid rates", () => {
    const config = pricingConfig({
      FABLEMAXXING_FABLE_INPUT_PER_MTOK: "7.5",
      FABLEMAXXING_OPENAI_OUTPUT_PER_MTOK: "invalid",
      FABLEMAXXING_PRICING_AS_OF: "custom-contract",
    });
    expect(config.fable.input).toBe(7.5);
    expect(config.openai.output).toBe(30);
    expect(config.asOf).toBe("custom-contract");
  });
});
