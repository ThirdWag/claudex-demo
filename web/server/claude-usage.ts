import { homedir } from "node:os";
import { resolve } from "node:path";
import type { TokenEvent } from "./types";

type UnknownRecord = Record<string, unknown>;

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;

export function usageEventsFromJsonl(content: string, source: string): TokenEvent[] {
  const events = new Map<string, TokenEvent>();
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let raw: UnknownRecord;
    try {
      raw = JSON.parse(line) as UnknownRecord;
    } catch {
      continue;
    }
    if (raw.type !== "assistant") continue;
    const message = raw.message && typeof raw.message === "object" ? raw.message as UnknownRecord : {};
    const usage = message.usage && typeof message.usage === "object" ? message.usage as UnknownRecord : {};
    const model = typeof message.model === "string" ? message.model.slice(0, 120) : "";
    const messageId = typeof message.id === "string" ? message.id.slice(0, 180) : "";
    const timestamp = typeof raw.timestamp === "string" ? raw.timestamp.slice(0, 80) : "";
    if (!model || !messageId || !timestamp) continue;

    const inputTokens = numberValue(usage.input_tokens);
    const outputTokens = numberValue(usage.output_tokens);
    const reasoningTokens = numberValue(usage.reasoning_tokens);
    const cachedTokens = numberValue(usage.cache_read_input_tokens) + numberValue(usage.cache_creation_input_tokens);
    const totalTokens = inputTokens + outputTokens + reasoningTokens + cachedTokens;
    if (totalTokens === 0) continue;
    const event: TokenEvent = {
      id: `${source}:${messageId}`,
      timestamp,
      latencyMs: 0,
      inputTokens,
      outputTokens,
      reasoningTokens,
      cachedTokens,
      totalTokens,
      failed: false,
      provider: "claude-code",
      model,
    };
    const previous = events.get(event.id);
    if (!previous || event.totalTokens > previous.totalTokens) events.set(event.id, event);
  }
  return [...events.values()];
}

export async function readClaudeUsage(sessionIds: string[], projectsRoot = resolve(homedir(), ".claude/projects")) {
  const events: TokenEvent[] = [];
  for (const sessionId of sessionIds) {
    const patterns = [`**/${sessionId}.jsonl`, `**/${sessionId}/subagents/*.jsonl`];
    for (const pattern of patterns) {
      const glob = new Bun.Glob(pattern);
      for await (const path of glob.scan({ cwd: projectsRoot, absolute: true, onlyFiles: true })) {
        try {
          events.push(...usageEventsFromJsonl(await Bun.file(path).text(), path));
        } catch {
          // A session file may be replaced while Claude Code is writing it.
        }
      }
    }
  }
  return events.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}
