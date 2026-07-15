import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTranscriptUsage, transcriptProvider } from "./transcript-usage";

const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const assistant = (id: string, model: string, timestamp: string, usage: Record<string, number>) => JSON.stringify({
  type: "assistant",
  timestamp,
  message: { id, model, usage },
});

describe("Claude Code transcript usage", () => {
  test("classifies only explicit Fable and OpenAI models plus an attested alias", () => {
    expect(transcriptProvider("claude-fable-5", "claudex-demo", false)).toBe("claude");
    expect(transcriptProvider("gpt-5.6-sol", "claudex-demo", false)).toBe("codex");
    expect(transcriptProvider("claudex-demo", "claudex-demo", false)).toBe("unknown");
    expect(transcriptProvider("claudex-demo", "claudex-demo", true)).toBe("codex");
    expect(transcriptProvider("claude-sonnet-4", "claudex-demo", true)).toBe("unknown");
  });

  test("matches ccusage token dimensions and deduplicates repeated response IDs per file", async () => {
    const root = await mkdtemp(join(tmpdir(), "fablemaxxing-usage-"));
    temporary.push(root);
    const nested = join(root, "project", "session", "subagents");
    await mkdir(nested, { recursive: true });
    const repeated = assistant("resp-1", "claude-fable-5", "2026-07-14T12:01:00Z", {
      input_tokens: 10,
      output_tokens: 20,
      cache_creation_input_tokens: 30,
      cache_read_input_tokens: 40,
    });
    const largerRepeat = assistant("resp-1", "claude-fable-5", "2026-07-14T12:01:01Z", {
      input_tokens: 10,
      output_tokens: 21,
      cache_creation_input_tokens: 30,
      cache_read_input_tokens: 40,
    });
    await writeFile(join(root, "project", "main.jsonl"), [
      assistant("old", "claude-fable-5", "2026-07-13T23:59:59Z", { input_tokens: 999 }),
      repeated,
      repeated,
      largerRepeat,
      assistant("resp-2", "claudex-demo", "2026-07-14T12:02:00Z", { input_tokens: 100, output_tokens: 5 }),
      "{incomplete",
    ].join("\n"));
    await writeFile(join(nested, "agent.jsonl"), assistant("resp-1", "gpt-5.6-sol", "2026-07-14T12:03:00Z", {
      input_tokens: 7,
      cache_read_input_tokens: 8,
    }));

    const usage = await readTranscriptUsage(root, "2026-07-14T00:00:00Z", "claudex-demo", true);

    expect(usage.available).toBe(true);
    expect(usage.filesRead).toBe(2);
    expect(usage.totals.fable).toEqual({
      inputTokens: 10,
      outputTokens: 21,
      reasoningTokens: 0,
      cachedTokens: 70,
      totalTokens: 101,
      requests: 1,
    });
    expect(usage.totals.openai).toEqual({
      inputTokens: 107,
      outputTokens: 5,
      reasoningTokens: 0,
      cachedTokens: 8,
      totalTokens: 120,
      requests: 2,
    });
    expect(usage.models.openai).toEqual(["claudex-demo", "gpt-5.6-sol"]);
  });
});
