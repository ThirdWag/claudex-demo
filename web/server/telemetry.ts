import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Provider, PublicTokenEvent, RouteAttestation, TokenEvent, TokenTotals } from "./types";

type UnknownRecord = Record<string, unknown>;

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
const stringValue = (value: unknown) => (typeof value === "string" ? value.slice(0, 160) : "");

export function sanitizeUsageRecord(raw: UnknownRecord): TokenEvent {
  const tokens = (raw.tokens && typeof raw.tokens === "object" ? raw.tokens : {}) as UnknownRecord;
  const timestamp = stringValue(raw.timestamp) || new Date().toISOString();
  const requestId = stringValue(raw.request_id);
  const stableId = requestId || `${timestamp}-${stringValue(raw.model)}-${numberValue(raw.latency_ms)}`;
  return {
    id: stableId,
    timestamp,
    latencyMs: numberValue(raw.latency_ms),
    inputTokens: numberValue(tokens.input_tokens),
    outputTokens: numberValue(tokens.output_tokens),
    reasoningTokens: numberValue(tokens.reasoning_tokens),
    cachedTokens: numberValue(tokens.cached_tokens),
    totalTokens: numberValue(tokens.total_tokens),
    failed: raw.failed === true,
    provider: stringValue(raw.provider),
    model: stringValue(raw.model),
    alias: stringValue(raw.alias),
  };
}

export function providerForEvent(event: TokenEvent): Provider {
  const provider = event.provider.trim().toLowerCase();
  if (provider === "codex" || provider === "openai") return "codex";
  if (provider === "claude" || provider === "anthropic") return "claude";
  return "unknown";
}

export function spendProviderForEvent(event: TokenEvent): Provider {
  const provider = providerForEvent(event);
  if (provider === "codex") return "codex";
  if (provider === "claude" && /fable/i.test(`${event.model} ${event.alias}`)) return "claude";
  return "unknown";
}

export function publicTokenEvent(event: TokenEvent): PublicTokenEvent {
  const provider = spendProviderForEvent(event);
  if (provider === "unknown") throw new Error("Unknown providers cannot be published");
  return {
    timestamp: event.timestamp,
    latencyMs: event.latencyMs,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    reasoningTokens: event.reasoningTokens,
    cachedTokens: event.cachedTokens,
    totalTokens: event.totalTokens,
    failed: event.failed,
    provider,
  };
}

export function tokenTotals(events: TokenEvent[]): TokenTotals {
  return events.reduce<TokenTotals>(
    (totals, event) => ({
      inputTokens: totals.inputTokens + event.inputTokens,
      outputTokens: totals.outputTokens + event.outputTokens,
      reasoningTokens: totals.reasoningTokens + event.reasoningTokens,
      cachedTokens: totals.cachedTokens + event.cachedTokens,
      totalTokens: totals.totalTokens + event.totalTokens,
      requests: totals.requests + 1,
    }),
    { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cachedTokens: 0, totalTokens: 0, requests: 0 },
  );
}

export function spendTotals(events: TokenEvent[]) {
  return {
    fable: tokenTotals(events.filter((event) => spendProviderForEvent(event) === "claude")),
    openai: tokenTotals(events.filter((event) => spendProviderForEvent(event) === "codex")),
  };
}

export function attestRoute(
  events: TokenEvent[],
  requestedAlias: string,
  expectedModel: string,
  proxyHealthy: boolean,
): RouteAttestation {
  const matching = events.filter((event) => event.alias === requestedAlias);
  const latest = matching.at(-1);
  const actualProvider = latest ? providerForEvent(latest) : "unknown";
  const verified = Boolean(
    proxyHealthy && latest && actualProvider === "codex" && latest.model === expectedModel && !latest.failed,
  );
  return {
    requestedAlias,
    expectedProvider: "codex",
    expectedModel,
    actualProvider,
    upstreamModel: latest?.model ?? "",
    verifiedAt: verified ? latest?.timestamp ?? null : null,
    status: !latest || !proxyHealthy ? "unverified" : verified ? "verified" : "drift",
  };
}

export function verifiedRouteEvents(events: TokenEvent[], route: RouteAttestation) {
  if (route.status !== "verified") return [];
  return events.filter((event) =>
    event.alias === route.requestedAlias
    && providerForEvent(event) === route.expectedProvider
    && event.model === route.expectedModel
    && !event.failed
  );
}

export class TokenStore {
  #events: TokenEvent[] = [];
  #ids = new Set<string>();

  constructor(private readonly path: string, private readonly limit = 250) {}

  async load() {
    try {
      const saved = JSON.parse(await readFile(this.path, "utf8"));
      if (Array.isArray(saved)) this.ingest(saved as TokenEvent[], false);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  events() {
    return [...this.#events];
  }

  totals() {
    return tokenTotals(this.#events);
  }

  async clear() {
    this.#events = [];
    this.#ids.clear();
    await this.#persist();
  }

  async ingest(events: TokenEvent[], persist = true) {
    for (const event of events) {
      if (this.#ids.has(event.id)) continue;
      this.#events.push(event);
      this.#ids.add(event.id);
    }
    this.#events.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    while (this.#events.length > this.limit) {
      const removed = this.#events.shift();
      if (removed) this.#ids.delete(removed.id);
    }
    if (persist) await this.#persist();
  }

  async #persist() {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, JSON.stringify(this.#events), { mode: 0o600 });
    await rename(temporary, this.path);
  }
}
