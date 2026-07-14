export type AccessRole = "viewer";

export interface SessionIdentity {
  user: string;
  displayName: string;
  role: AccessRole;
  viaTailscale: boolean;
}

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

export interface TokenTotals {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  requests: number;
}
