import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Provider, TokenTotals } from "./types";

type UnknownRecord = Record<string, unknown>;

export interface TranscriptUsage {
  since: string;
  updatedAt: string;
  available: boolean;
  filesRead: number;
  totals: { fable: TokenTotals; openai: TokenTotals; unattributed: TokenTotals };
  cache: { fable: CacheDimensions; openai: CacheDimensions; unattributed: CacheDimensions };
  billable: { fable: BillableUsage[]; openai: BillableUsage[] };
  models: { fable: string[]; openai: string[]; unattributed: string[] };
}

export interface BillableUsage {
  totals: TokenTotals;
  cache: CacheDimensions;
}

export interface CacheDimensions {
  creationTokens: number;
  creation1hTokens: number;
  readTokens: number;
}

interface UsageRow {
  timestamp: string;
  model: string;
  totals: TokenTotals;
  cache: CacheDimensions;
}

const zeroTotals = (): TokenTotals => ({
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  cachedTokens: 0,
  totalTokens: 0,
  requests: 0,
});

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;

const addTotals = (target: TokenTotals, row: TokenTotals) => {
  target.inputTokens += row.inputTokens;
  target.outputTokens += row.outputTokens;
  target.reasoningTokens += row.reasoningTokens;
  target.cachedTokens += row.cachedTokens;
  target.totalTokens += row.totalTokens;
  target.requests += row.requests;
};

const addCache = (target: CacheDimensions, row: CacheDimensions) => {
  target.creationTokens += row.creationTokens;
  target.creation1hTokens += row.creation1hTokens;
  target.readTokens += row.readTokens;
};

export function transcriptProvider(model: string, requestedAlias: string, routeVerified: boolean): Provider {
  const normalized = model.trim().toLowerCase();
  if (/fable/.test(normalized)) return "claude";
  if (/^(gpt-|codex|o[1-9](?:-|$))/.test(normalized)) return "codex";
  if (routeVerified && normalized === requestedAlias.trim().toLowerCase()) return "codex";
  return "unknown";
}

function usageRow(raw: UnknownRecord): UsageRow | null {
  if (raw.type !== "assistant" || !raw.message || typeof raw.message !== "object") return null;
  const message = raw.message as UnknownRecord;
  if (typeof message.id !== "string" || typeof message.model !== "string") return null;
  if (!message.usage || typeof message.usage !== "object" || typeof raw.timestamp !== "string") return null;
  const usage = message.usage as UnknownRecord;
  const inputTokens = numberValue(usage.input_tokens);
  const outputTokens = numberValue(usage.output_tokens);
  const cacheCreation = numberValue(usage.cache_creation_input_tokens);
  const cacheRead = numberValue(usage.cache_read_input_tokens);
  const cacheCreationDetails = usage.cache_creation && typeof usage.cache_creation === "object"
    ? usage.cache_creation as UnknownRecord
    : {};
  const cacheCreation1h = Math.min(cacheCreation, numberValue(cacheCreationDetails.ephemeral_1h_input_tokens));
  return {
    timestamp: raw.timestamp,
    model: message.model.slice(0, 160),
    totals: {
      inputTokens,
      outputTokens,
      reasoningTokens: 0,
      cachedTokens: cacheCreation + cacheRead,
      totalTokens: inputTokens + outputTokens + cacheCreation + cacheRead,
      requests: 1,
    },
    cache: { creationTokens: cacheCreation, creation1hTokens: cacheCreation1h, readTokens: cacheRead },
  };
}

async function jsonlFiles(root: string, sinceMs: number) {
  const files: string[] = [];
  const walk = async (directory: string) => {
    const entries = await readdir(directory, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return walk(path);
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) return;
      const metadata = await stat(path);
      if (metadata.mtimeMs >= sinceMs) files.push(path);
    }));
  };
  await walk(root);
  return files;
}

export async function readTranscriptUsage(
  root: string,
  since: string,
  requestedAlias: string,
  routeVerified: boolean,
): Promise<TranscriptUsage> {
  const sinceMs = Date.parse(since);
  const result: TranscriptUsage = {
    since,
    updatedAt: new Date().toISOString(),
    available: false,
    filesRead: 0,
    totals: { fable: zeroTotals(), openai: zeroTotals(), unattributed: zeroTotals() },
    cache: {
      fable: { creationTokens: 0, creation1hTokens: 0, readTokens: 0 },
      openai: { creationTokens: 0, creation1hTokens: 0, readTokens: 0 },
      unattributed: { creationTokens: 0, creation1hTokens: 0, readTokens: 0 },
    },
    billable: { fable: [], openai: [] },
    models: { fable: [], openai: [], unattributed: [] },
  };
  if (!Number.isFinite(sinceMs)) return result;

  try {
    const files = await jsonlFiles(resolve(root), sinceMs);
    const rows = new Map<string, UsageRow>();
    await Promise.all(files.map(async (file) => {
      const content = await readFile(file, "utf8");
      for (const line of content.split("\n")) {
        if (!line) continue;
        try {
          const raw = JSON.parse(line) as UnknownRecord;
          const row = usageRow(raw);
          const timestampMs = row ? Date.parse(row.timestamp) : Number.NaN;
          if (!row || !Number.isFinite(timestampMs) || timestampMs < sinceMs) continue;
          const message = raw.message as UnknownRecord;
          const key = `${file}\0${String(message.id)}`;
          const previous = rows.get(key);
          if (!previous || row.totals.totalTokens > previous.totals.totalTokens) rows.set(key, row);
        } catch {
          // Claude Code may be appending an incomplete final JSONL line while we read it.
        }
      }
    }));

    const models = { fable: new Set<string>(), openai: new Set<string>(), unattributed: new Set<string>() };
    for (const row of rows.values()) {
      const provider = transcriptProvider(row.model, requestedAlias, routeVerified);
      const lane = provider === "claude" ? "fable" : provider === "codex" ? "openai" : "unattributed";
      addTotals(result.totals[lane], row.totals);
      addCache(result.cache[lane], row.cache);
      if (lane !== "unattributed") result.billable[lane].push({ totals: row.totals, cache: row.cache });
      models[lane].add(row.model);
    }
    result.models = {
      fable: [...models.fable].sort(),
      openai: [...models.openai].sort(),
      unattributed: [...models.unattributed].sort(),
    };
    result.available = true;
    result.filesRead = files.length;
    return result;
  } catch {
    return result;
  }
}

export class TranscriptUsageReader {
  #cached: TranscriptUsage | null = null;
  #refreshedAt = 0;
  #cacheKey = "";

  constructor(private readonly root: string, private readonly cacheMs = 5000) {}

  async read(since: string, requestedAlias: string, routeVerified: boolean) {
    const now = Date.now();
    const cacheKey = `${since}\0${requestedAlias}\0${routeVerified}`;
    if (this.#cached && now - this.#refreshedAt < this.cacheMs
      && this.#cacheKey === cacheKey) return this.#cached;
    this.#cached = await readTranscriptUsage(this.root, since, requestedAlias, routeVerified);
    this.#refreshedAt = now;
    this.#cacheKey = cacheKey;
    return this.#cached;
  }
}
