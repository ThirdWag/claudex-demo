export type Provider = "claude" | "codex";
export type AgentStatus = "working" | "idle" | "done" | "blocked" | "unknown";

export interface TokenTotals {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  requests: number;
}

export interface TokenEvent {
  timestamp: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  failed: boolean;
  provider: Provider;
}

export interface HerdrAgent {
  alias: string;
  type: string;
  status: AgentStatus;
  focused: boolean;
}

export interface Snapshot {
  access: { viaTailscale: boolean };
  updatedAt: string;
  services: { proxyHealthy: boolean; herdrHealthy: boolean };
  herdr: { healthy: boolean; version: string; agents: HerdrAgent[] };
  route: {
    requestedAlias: string;
    expectedProvider: "codex";
    expectedModel: string;
    actualProvider: Provider | "unknown";
    upstreamModel: string;
    verifiedAt: string | null;
    status: "verified" | "drift" | "unverified";
  };
  tokenEvents: TokenEvent[];
  routeTokenTotals: TokenTotals;
  providerTotals: { fable: TokenTotals; openai: TokenTotals };
  spendModels: { fable: string[]; openai: string[] };
  unattributedUsage: { totals: TokenTotals; models: string[] };
  spendSource: {
    kind: "claude-code-transcripts";
    since: string;
    updatedAt: string;
    available: boolean;
    filesRead: number;
  };
  reconciliation: {
    status: "complete" | "partial" | "unavailable";
    proxyObservedTokens: number;
    transcriptTokens: number;
    coveragePercent: number;
    proxyObserved: { fable: TokenTotals; openai: TokenTotals };
  };
  tokenTotals: TokenTotals;
}
