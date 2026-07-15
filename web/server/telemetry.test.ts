import { describe, expect, test } from "bun:test";
import { attestRoute, providerForEvent, publicTokenEvent, sanitizeUsageRecord, tokenTotals, verifiedRouteEvents } from "./telemetry";

describe("usage telemetry sanitization", () => {
  test("keeps token accounting and drops credentials and identity", () => {
    const event = sanitizeUsageRecord({
      timestamp: "2026-07-14T12:00:00Z",
      latency_ms: 481,
      source: "private@example.com",
      api_key: "sk-sensitive",
      request_id: "req-1",
      tokens: {
        input_tokens: 1200,
        output_tokens: 300,
        reasoning_tokens: 180,
        cached_tokens: 900,
        total_tokens: 1680,
      },
      failed: false,
      provider: "openai",
      model: "gpt-test",
      alias: "",
    });

    expect(event).toEqual({
      id: "req-1",
      timestamp: "2026-07-14T12:00:00Z",
      latencyMs: 481,
      inputTokens: 1200,
      outputTokens: 300,
      reasoningTokens: 180,
      cachedTokens: 900,
      totalTokens: 1680,
      failed: false,
      provider: "openai",
      model: "gpt-test",
      alias: "",
    });
    expect(JSON.stringify(event)).not.toContain("private@example.com");
    expect(JSON.stringify(event)).not.toContain("sk-sensitive");
  });

  test("publishes a canonical provider without request identifiers or raw model metadata", () => {
    const event = sanitizeUsageRecord({
      request_id: "private-request-id",
      provider: "openai",
      model: "gpt-5.6-sol",
      endpoint: "POST /private/path",
      tokens: { total_tokens: 42 },
    }) as ReturnType<typeof sanitizeUsageRecord> & { alias: string; endpoint: string };
    event.alias = "legacy-private-alias";
    event.endpoint = "POST /legacy/private/path";
    expect(providerForEvent(event)).toBe("codex");
    const published = JSON.stringify(publicTokenEvent(event));
    expect(published).not.toContain("private-request-id");
    expect(published).not.toContain("gpt-5.6-sol");
    expect(published).not.toContain("private/path");
    expect(published).not.toContain("legacy-private-alias");
  });

  test("uses the routed model when the protocol provider says Claude", () => {
    const event = sanitizeUsageRecord({ provider: "claude", model: "gpt-5.6-sol", tokens: { total_tokens: 10 } });
    expect(providerForEvent(event)).toBe("codex");
  });

  test("attests only the forced alias reaching the expected Codex model", () => {
    const event = sanitizeUsageRecord({
      timestamp: "2026-07-14T22:00:00Z",
      provider: "codex",
      model: "gpt-5.6-sol",
      alias: "claudex-demo",
      tokens: { total_tokens: 314 },
    });
    const route = attestRoute([event], "claudex-demo", "gpt-5.6-sol", true);
    expect(route).toEqual({
      requestedAlias: "claudex-demo",
      expectedProvider: "codex",
      expectedModel: "gpt-5.6-sol",
      actualProvider: "codex",
      upstreamModel: "gpt-5.6-sol",
      verifiedAt: "2026-07-14T22:00:00Z",
      status: "verified",
    });
    expect(verifiedRouteEvents([event], route)).toEqual([event]);
  });

  test("reports architecture drift and withholds unverified totals", () => {
    const event = sanitizeUsageRecord({
      timestamp: "2026-07-14T22:00:00Z",
      provider: "anthropic",
      model: "claude-fable-5",
      alias: "claudex-demo",
      tokens: { total_tokens: 999 },
    });
    const route = attestRoute([event], "claudex-demo", "gpt-5.6-sol", true);
    expect(route.status).toBe("drift");
    expect(route.actualProvider).toBe("claude");
    expect(verifiedRouteEvents([event], route)).toEqual([]);
  });

  test("sums the session token dimensions", () => {
    const first = sanitizeUsageRecord({ tokens: { input_tokens: 10, output_tokens: 2, reasoning_tokens: 3, cached_tokens: 4, total_tokens: 15 } });
    const second = sanitizeUsageRecord({ tokens: { input_tokens: 20, output_tokens: 4, reasoning_tokens: 6, cached_tokens: 8, total_tokens: 30 } });
    expect(tokenTotals([first, second])).toEqual({
      inputTokens: 30,
      outputTokens: 6,
      reasoningTokens: 9,
      cachedTokens: 12,
      totalTokens: 45,
      requests: 2,
    });
  });
});
