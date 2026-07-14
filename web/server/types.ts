export type AccessRole = "viewer";
export type Provider = "claude" | "codex" | "unknown";
export type AgentStatus = "working" | "idle" | "done" | "blocked" | "unknown";

export interface SessionIdentity {
  user: string;
  displayName: string;
  role: AccessRole;
  viaTailscale: boolean;
}

export interface HerdrAgent {
  alias: string;
  type: string;
  status: AgentStatus;
  focused: boolean;
}

export interface HerdrSnapshot {
  healthy: boolean;
  version: string;
  agents: HerdrAgent[];
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
}

export interface PublicTokenEvent extends Omit<TokenEvent, "id" | "provider" | "model"> {
  provider: Exclude<Provider, "unknown">;
}

export interface TokenTotals {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  requests: number;
}
