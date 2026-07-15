import type { Snapshot } from "../types";

const compact = (value: number) => value >= 1_000_000
  ? `${(value / 1_000_000).toFixed(2)}m`
  : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

function CodexNode({ snapshot }: { snapshot: Snapshot }) {
  const { route, routeTokenTotals } = snapshot;
  return (
    <article className={`flow-node provider-node codex ${route.status}`}>
      <span className="node-icon" aria-hidden="true">O</span>
      <div><small>Codex upstream</small><strong>{route.upstreamModel || route.expectedModel}</strong></div>
      <span className={`node-status ${route.status === "verified" ? "good" : route.status === "drift" ? "bad" : "neutral"}`}>{route.status}</span>
      <dl><div><dt>Tokens</dt><dd>{compact(routeTokenTotals.totalTokens)}</dd></div><div><dt>Requests</dt><dd>{routeTokenTotals.requests}</dd></div></dl>
    </article>
  );
}

export function AgentFlow({ snapshot, live }: { snapshot: Snapshot; live: boolean }) {
  const activeClaude = snapshot.herdr.agents.filter((agent) => agent.type === "claude" && agent.status === "working").length;
  return (
    <section className="panel flow-panel">
      <div className="panel-header">
        <div><p>Runtime topology</p><h1>Agent Request Flow</h1></div>
        <span className={`live-state ${live ? "good" : "neutral"}`}><i />{live ? "Tracing" : "Waiting"}</span>
      </div>
      <div className={`topology ${live ? "is-live" : ""}`}>
        <article className="flow-node herdr-node">
          <span className="node-icon" aria-hidden="true">H</span>
          <div><small>Runtime orchestrator</small><strong>Herdr</strong></div>
          <span className="node-status">{snapshot.services.herdrHealthy ? `${snapshot.herdr.agents.length} agents` : "Unavailable"}</span>
        </article>
        <span className="route-line line-one"><i /></span>
        <article className="flow-node agent-node">
          <span className="node-icon" aria-hidden="true">AI</span>
          <div><small>Agent inside Herdr</small><strong>Claude Code</strong></div>
          <span className="node-status">{activeClaude ? `${activeClaude} working` : "Observed"}</span>
        </article>
        <span className="route-line line-two"><i /></span>
        <article className="flow-node proxy-node">
          <span className="node-icon" aria-hidden="true">P</span>
          <div><small>Routing boundary</small><strong>CLIProxyAPI</strong></div>
          <span className={`node-status ${snapshot.services.proxyHealthy ? "good" : "bad"}`}>{snapshot.services.proxyHealthy ? "Healthy" : "Unavailable"}</span>
        </article>
        <span className="route-line upstream-line"><i /></span>
        <CodexNode snapshot={snapshot} />
      </div>
      <p className={`flow-caveat route-${snapshot.route.status}`}>Requested alias <strong>{snapshot.route.requestedAlias}</strong> is force-mapped to Codex. {snapshot.route.status === "verified" ? "The latest authenticated usage record verifies the upstream route." : snapshot.route.status === "drift" ? "Architecture drift detected: the observed provider or model does not match the configured Codex route." : "Waiting for a model response to attest the upstream route."}</p>
    </section>
  );
}
