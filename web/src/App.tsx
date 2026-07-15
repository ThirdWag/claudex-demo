import { useCallback, useEffect, useMemo, useState } from "react";
import type { Snapshot, TokenTotals } from "./types";
import { AgentFlow } from "./components/AgentFlow";
import { AgentRail } from "./components/AgentRail";
import { ProviderTotals } from "./components/ProviderTotals";
import { TokenFlow } from "./components/TokenFlow";

const zeroTotals: TokenTotals = {
  inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cachedTokens: 0, totalTokens: 0, requests: 0,
};

const emptySnapshot: Snapshot = {
  access: { viaTailscale: false },
  updatedAt: new Date(0).toISOString(),
  services: { proxyHealthy: false, herdrHealthy: false },
  herdr: { healthy: false, version: "unavailable", agents: [] },
  route: { claudeModel: "claude-fable-5", codexModel: "gpt-5.6-sol" },
  tokenEvents: [],
  providerTotals: { claude: zeroTotals, codex: zeroTotals },
  tokenTotals: zeroTotals,
};

const time = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "--:--:--" : parsed.toLocaleTimeString([], { hour12: false });
};

export function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/snapshot", { cache: "no-store" });
      if (!response.ok) throw new Error(`Observer unavailable (${response.status})`);
      setSnapshot(await response.json());
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Observer unavailable");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const stale = useMemo(() => Date.now() - Date.parse(snapshot.updatedAt) > 6000 || Boolean(error), [snapshot.updatedAt, error]);
  const live = snapshot.services.herdrHealthy && snapshot.services.proxyHealthy && !stale;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">FABLEMAXXING</div>
        <div className="topbar-badges">
          <span className={`badge ${snapshot.access.viaTailscale ? "good" : "neutral"}`}><i />Tailnet {snapshot.access.viaTailscale ? "live" : "local"}</span>
          <span className="badge observer">Observer · read only</span>
        </div>
        <div className={`freshness ${live ? "good" : stale ? "bad" : "neutral"}`}>
          <span>Last updated</span><strong>{time(snapshot.updatedAt)}</strong><i />{live ? "Live" : stale ? "Stale" : "Connecting"}
        </div>
      </header>

      {error && <div className="notice error">{error}</div>}

      <div className="dashboard">
        <AgentRail agents={snapshot.herdr.agents} healthy={snapshot.services.herdrHealthy} version={snapshot.herdr.version} />
        <AgentFlow snapshot={snapshot} live={live} />
        <ProviderTotals totals={snapshot.providerTotals} combined={snapshot.tokenTotals} route={snapshot.route} />
        <TokenFlow events={snapshot.tokenEvents} live={live} />
      </div>

      <footer className="source-note">Sources: Herdr socket API + Claude Code usage metadata + CLIProxyAPI route health · transcript content excluded.</footer>
    </main>
  );
}
