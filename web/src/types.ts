export interface TokenEvent {
  id: string;
  timestamp: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  failed: boolean;
  provider: string;
  model: string;
  alias: string;
  endpoint: string;
}

export interface Snapshot {
  identity: { user: string; displayName: string; role: "viewer"; viaTailscale: boolean };
  session: { name: string; running: boolean; proxyHealthy: boolean };
  route: { alias: string; model: string };
  tokenEvents: TokenEvent[];
  tokenTotals: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cachedTokens: number;
    totalTokens: number;
    requests: number;
  };
  repository: {
    branch: string;
    head: string;
    dirty: boolean;
    files: Array<{ path: string; added: number; deleted: number }>;
  };
  tests: string;
}
