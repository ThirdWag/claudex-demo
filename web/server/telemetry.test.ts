import { describe, expect, test } from "bun:test";
import { sanitizeUsageRecord, tokenTotals } from "./telemetry";

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
      alias: "claudex-demo",
      endpoint: "POST /v1/messages",
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
      alias: "claudex-demo",
      endpoint: "POST /v1/messages",
    });
    expect(JSON.stringify(event)).not.toContain("private@example.com");
    expect(JSON.stringify(event)).not.toContain("sk-sensitive");
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
