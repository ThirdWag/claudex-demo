import type { Snapshot } from "../types";

const compact = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

function HealthRow({ label, healthy, value }: { label: string; healthy: boolean; value: string }) {
  return <div className="health-row"><span>{label}</span><span className={healthy ? "success" : "muted"}><span className={`status-dot ${healthy ? "healthy" : "idle"}`} />{value}</span></div>;
}

export function StatusPanel({ snapshot }: { snapshot: Snapshot }) {
  const tokenRows = [
    ["Input", snapshot.tokenTotals.inputTokens],
    ["Cache read", snapshot.tokenTotals.cachedTokens],
    ["Output", snapshot.tokenTotals.outputTokens],
    ["Reasoning", snapshot.tokenTotals.reasoningTokens],
  ] as const;
  const maximum = Math.max(...tokenRows.map(([, value]) => value), 1);
  return (
    <section className="panel status-panel">
      <div className="panel-header"><div><h2>Demo Status</h2></div></div>
      <div className="status-grid">
        <div className="health-list">
          <HealthRow label="Environment" healthy={snapshot.identity.viaTailscale} value={snapshot.identity.viaTailscale ? "Tailnet" : "Local"} />
          <HealthRow label="CLIProxyAPI" healthy={snapshot.session.proxyHealthy} value={snapshot.session.proxyHealthy ? "Connected" : "Stopped"} />
          <HealthRow label="Codex route" healthy={snapshot.session.proxyHealthy} value={snapshot.route.model} />
          <HealthRow label="Claude session" healthy={snapshot.session.running} value={snapshot.session.running ? "Running" : "Stopped"} />
        </div>
        <div className="token-meters">
          <h3>Session Token Totals</h3>
          {tokenRows.map(([label, value]) => (
            <div className="meter-row" key={label}><span>{label}</span><strong>{compact(value)}</strong><i><b style={{ width: `${(value / maximum) * 100}%` }} /></i></div>
          ))}
          <div className="meter-total"><span>Total</span><strong>{compact(snapshot.tokenTotals.totalTokens)}</strong></div>
        </div>
      </div>
      <div className="repo-status">
        <dl><div><dt>Branch</dt><dd>{snapshot.repository.branch}</dd></div><div><dt>Last commit</dt><dd>{snapshot.repository.head}</dd></div></dl>
        <div className="diff-header"><span>Recent Diff</span><span>{snapshot.repository.dirty ? "Working tree changed" : "Clean baseline"}</span></div>
        <div className="diff-list">
          {snapshot.repository.files.map((file) => <div key={file.path}><span>{file.path}</span><span><b>+{file.added}</b> <em>-{file.deleted}</em></span></div>)}
          {!snapshot.repository.files.length && <p>No uncommitted changes yet.</p>}
        </div>
      </div>
    </section>
  );
}
