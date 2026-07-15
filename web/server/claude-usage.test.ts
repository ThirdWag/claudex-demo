import { describe, expect, test } from "bun:test";
import { usageEventsFromJsonl } from "./claude-usage";

describe("Claude Code usage metadata", () => {
  test("deduplicates streamed rows and keeps the highest usage for each response", () => {
    const rows = [
      { type: "assistant", timestamp: "2026-07-14T22:00:00Z", message: { id: "resp-1", model: "gpt-5.6-sol", usage: { input_tokens: 0, output_tokens: 0 } } },
      { type: "assistant", timestamp: "2026-07-14T22:00:01Z", message: { id: "resp-1", model: "gpt-5.6-sol", usage: { input_tokens: 30, cache_read_input_tokens: 20, output_tokens: 5 } } },
      { type: "user", timestamp: "2026-07-14T22:00:02Z", message: { content: "private prompt" } },
    ].map((row) => JSON.stringify(row)).join("\n");

    expect(usageEventsFromJsonl(rows, "safe-source")).toEqual([{
      id: "safe-source:resp-1",
      timestamp: "2026-07-14T22:00:01Z",
      latencyMs: 0,
      inputTokens: 30,
      cachedTokens: 20,
      outputTokens: 5,
      reasoningTokens: 0,
      totalTokens: 55,
      failed: false,
      provider: "claude-code",
      model: "gpt-5.6-sol",
    }]);
    expect(JSON.stringify(usageEventsFromJsonl(rows, "safe-source"))).not.toContain("private prompt");
  });
});
