import type { TokenTotals } from "./types";
import type { BillableUsage, CacheDimensions } from "./transcript-usage";

export interface ModelRates {
  input: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
  output: number;
  longContextThreshold: number | null;
  longContextInputMultiplier: number;
  longContextOutputMultiplier: number;
}

export interface PricingConfig {
  asOf: string;
  fable: ModelRates;
  openai: ModelRates;
}

const envRate = (environment: NodeJS.ProcessEnv, key: string, fallback: number) => {
  const value = environment[key];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export function pricingConfig(environment: NodeJS.ProcessEnv = process.env): PricingConfig {
  return {
    asOf: environment.FABLEMAXXING_PRICING_AS_OF?.slice(0, 40) || "2026-07-15",
    fable: {
      input: envRate(environment, "FABLEMAXXING_FABLE_INPUT_PER_MTOK", 10),
      cacheWrite5m: envRate(environment, "FABLEMAXXING_FABLE_CACHE_WRITE_5M_PER_MTOK", 12.5),
      cacheWrite1h: envRate(environment, "FABLEMAXXING_FABLE_CACHE_WRITE_1H_PER_MTOK", 20),
      cacheRead: envRate(environment, "FABLEMAXXING_FABLE_CACHE_READ_PER_MTOK", 1),
      output: envRate(environment, "FABLEMAXXING_FABLE_OUTPUT_PER_MTOK", 50),
      longContextThreshold: null,
      longContextInputMultiplier: 1,
      longContextOutputMultiplier: 1,
    },
    openai: {
      input: envRate(environment, "FABLEMAXXING_OPENAI_INPUT_PER_MTOK", 5),
      cacheWrite5m: envRate(environment, "FABLEMAXXING_OPENAI_CACHE_WRITE_PER_MTOK", 6.25),
      cacheWrite1h: envRate(environment, "FABLEMAXXING_OPENAI_CACHE_WRITE_PER_MTOK", 6.25),
      cacheRead: envRate(environment, "FABLEMAXXING_OPENAI_CACHE_READ_PER_MTOK", 0.5),
      output: envRate(environment, "FABLEMAXXING_OPENAI_OUTPUT_PER_MTOK", 30),
      longContextThreshold: envRate(environment, "FABLEMAXXING_OPENAI_LONG_CONTEXT_THRESHOLD", 272000),
      longContextInputMultiplier: envRate(environment, "FABLEMAXXING_OPENAI_LONG_CONTEXT_INPUT_MULTIPLIER", 2),
      longContextOutputMultiplier: envRate(environment, "FABLEMAXXING_OPENAI_LONG_CONTEXT_OUTPUT_MULTIPLIER", 1.5),
    },
  };
}

export function priceUsage(totals: TokenTotals, cache: CacheDimensions, rates: ModelRates) {
  const cacheWrite5mTokens = Math.max(0, cache.creationTokens - cache.creation1hTokens);
  const baseInputCost = (
    totals.inputTokens * rates.input
    + cacheWrite5mTokens * rates.cacheWrite5m
    + cache.creation1hTokens * rates.cacheWrite1h
    + cache.readTokens * rates.cacheRead
  );
  const baseOutputCost = totals.outputTokens * rates.output;
  const promptTokens = totals.inputTokens + cache.creationTokens + cache.readTokens;
  const longContext = rates.longContextThreshold !== null && promptTokens > rates.longContextThreshold;
  return (
    baseInputCost * (longContext ? rates.longContextInputMultiplier : 1)
    + baseOutputCost * (longContext ? rates.longContextOutputMultiplier : 1)
  ) / 1_000_000;
}

const priceRows = (rows: BillableUsage[], rates: ModelRates) =>
  rows.reduce((sum, row) => sum + priceUsage(row.totals, row.cache, rates), 0);

export function estimateSpend(
  totals: { fable: TokenTotals; openai: TokenTotals },
  cache: { fable: CacheDimensions; openai: CacheDimensions },
  billable: { fable: BillableUsage[]; openai: BillableUsage[] },
  pricing = pricingConfig(),
) {
  const fable = billable.fable.length ? priceRows(billable.fable, pricing.fable) : priceUsage(totals.fable, cache.fable, pricing.fable);
  const openai = billable.openai.length ? priceRows(billable.openai, pricing.openai) : priceUsage(totals.openai, cache.openai, pricing.openai);
  const openaiAtFableRates = billable.openai.length ? priceRows(billable.openai, pricing.fable) : priceUsage(totals.openai, cache.openai, pricing.fable);
  const actual = fable + openai;
  const fableOnlyBaseline = fable + openaiAtFableRates;
  const savings = fableOnlyBaseline - actual;
  return {
    currency: "USD" as const,
    basis: "standard-api-list" as const,
    estimated: true,
    asOf: pricing.asOf,
    fable,
    openai,
    actual,
    fableOnlyBaseline,
    savings,
    savingsPercent: fableOnlyBaseline ? (savings / fableOnlyBaseline) * 100 : 0,
    routedLaneSavingsPercent: openaiAtFableRates ? ((openaiAtFableRates - openai) / openaiAtFableRates) * 100 : 0,
    rates: pricing,
  };
}
