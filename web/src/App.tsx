import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { Snapshot } from "./types";
import { TokenFlow } from "./components/TokenFlow";
import { StatusPanel } from "./components/StatusPanel";
import { OutputPanel } from "./components/OutputPanel";

const TerminalPanel = lazy(() => import("./components/TerminalPanel").then((module) => ({ default: module.TerminalPanel })));

const emptySnapshot: Snapshot = {
  identity: { user: "", displayName: "Connecting…", role: "viewer", viaTailscale: false },
  session: { name: "claudex", running: false, proxyHealthy: false },
  route: { alias: "claudex-demo", model: "unconfigured" },
  tokenEvents: [],
  tokenTotals: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cachedTokens: 0, totalTokens: 0, requests: 0 },
  repository: { branch: "unknown", head: "unknown", dirty: false, files: [] },
  tests: "Waiting for output…",
};

export function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/snapshot", { cache: "no-store" });
      if (!response.ok) throw new Error(`Console unavailable (${response.status})`);
      setSnapshot(await response.json());
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Console unavailable");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const connectionLabel = useMemo(
    () => snapshot.identity.viaTailscale ? "Connected via Tailscale" : "Local development",
    [snapshot.identity.viaTailscale],
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">FABLEMAXXING</div>
        <div className="topbar-context">
          <span className="connection"><span className="status-dot healthy" />{connectionLabel}</span>
          <span className="divider" />
          <span className="access">Access: Read-only observer</span>
          <span className="divider" />
          <span className="session-label">Session: {snapshot.session.name}</span>
        </div>
        <div className="actions" aria-label="Observer mode">
          <span className="role viewer">Observer</span>
        </div>
      </header>

      {error && <div className="notice error">{error}</div>}

      <div className="workspace">
        <section className="primary-column">
          <Suspense fallback={<section className="panel terminal-panel loading-terminal">Loading terminal…</section>}>
            <TerminalPanel
              running={snapshot.session.running}
              alias={snapshot.route.alias}
              model={snapshot.route.model}
            />
          </Suspense>
          <OutputPanel tests={snapshot.tests} snapshot={snapshot} />
        </section>
        <aside className="evidence-column">
          <TokenFlow events={snapshot.tokenEvents} totals={snapshot.tokenTotals} route={snapshot.route} live={snapshot.session.proxyHealthy} />
          <StatusPanel snapshot={snapshot} />
        </aside>
      </div>
    </main>
  );
}
