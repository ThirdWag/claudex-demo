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
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

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

  const isPresenter = snapshot.identity.role === "presenter";
  const action = async (name: "start" | "reset" | "stop") => {
    if (!isPresenter || busy) return;
    if (name === "reset" && !window.confirm("Reset the disposable demo repository to its baseline?")) return;
    setBusy(name);
    setNotice("");
    try {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name }),
      });
      const result = await response.json();
      setNotice(result.message || (response.ok ? "Done." : "Action failed."));
      await refresh();
    } catch {
      setNotice("Action failed. Check the remote console log.");
    } finally {
      setBusy(null);
    }
  };

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
          <span className="access">Access: {isPresenter ? "Presenter" : "Read-only"}</span>
          <span className="divider" />
          <span className="session-label">Session: {snapshot.session.name}</span>
        </div>
        <div className="actions" aria-label="Demo controls">
          <span className={`role ${isPresenter ? "presenter" : "viewer"}`}>{isPresenter ? "Presenter" : "Viewer"}</span>
          <button className="start" disabled={!isPresenter || Boolean(busy)} onClick={() => action("start")}>{busy === "start" ? "Starting…" : "Start"}</button>
          <button disabled={!isPresenter || Boolean(busy)} onClick={() => action("reset")}>{busy === "reset" ? "Resetting…" : "Reset"}</button>
          <button className="stop" disabled={!isPresenter || Boolean(busy)} onClick={() => action("stop")}>{busy === "stop" ? "Stopping…" : "Stop"}</button>
        </div>
      </header>

      {(error || notice) && <div className={error ? "notice error" : "notice"}>{error || notice}</div>}

      <div className="workspace">
        <section className="primary-column">
          <Suspense fallback={<section className="panel terminal-panel loading-terminal">Loading terminal…</section>}>
            <TerminalPanel
              running={snapshot.session.running}
              presenter={isPresenter}
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
