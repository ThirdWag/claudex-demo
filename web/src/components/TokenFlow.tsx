import type { Snapshot, TokenEvent } from "../types";

const compact = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}k` : String(value);
const time = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "--:--:--" : parsed.toLocaleTimeString([], { hour12: false });
};

export function TokenFlow({ events, totals, route, live }: {
  events: TokenEvent[];
  totals: Snapshot["tokenTotals"];
  route: Snapshot["route"];
  live: boolean;
}) {
  return (
    <section className="panel token-panel">
      <div className="panel-header">
        <div><h2>Claude → Codex Token Flow</h2></div>
        <span className={live ? "live" : "live waiting"}><span className={`status-dot ${live ? "healthy" : "idle"}`} />{live ? "Live" : "Waiting"}</span>
      </div>
      <div className="route-label">{route.alias} → {route.model}</div>
      <div className="token-table-wrap">
        <table className="token-table">
          <thead><tr><th>Time</th><th>Request</th><th>Claude in</th><th>Cache</th><th>Output</th><th>Reasoning</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {events.slice(0, 9).map((event) => (
              <tr key={event.id}>
                <td>{time(event.timestamp)}</td><td title={event.endpoint}>{event.endpoint.replace(/^(POST\s+)?\/v1\//, "") || "request"}</td><td>{compact(event.inputTokens)}</td><td>{compact(event.cachedTokens)}</td>
                <td>{compact(event.outputTokens)}</td><td>{compact(event.reasoningTokens)}</td><td>{compact(event.totalTokens)}</td>
                <td className={event.failed ? "failed" : "success"}>{event.failed ? "ERR" : "200"}</td>
              </tr>
            ))}
            {!events.length && <tr><td colSpan={8} className="empty-row">Token events appear after Claude Code sends a request through the proxy.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="token-total-strip">
        <span><small>Input</small>{compact(totals.inputTokens)}</span>
        <span><small>Cache read</small>{compact(totals.cachedTokens)}</span>
        <span><small>Output</small>{compact(totals.outputTokens)}</span>
        <span><small>Reasoning</small>{compact(totals.reasoningTokens)}</span>
        <span><small>Total</small>{compact(totals.totalTokens)}</span>
      </div>
    </section>
  );
}
