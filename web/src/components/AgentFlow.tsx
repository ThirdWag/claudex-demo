import type { Snapshot } from "../types";

const compact = (value: number) => value >= 1_000_000
  ? `${(value / 1_000_000).toFixed(2)}m`
  : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

function ProviderNode({ kind, model, total, requests }: { kind: "claude" | "codex"; model: string; total: number; requests: number }) {
  return (
    <article className={`flow-node provider-node ${kind}`}>
      <span className="node-icon" aria-hidden="true">{kind === "claude" ? "C" : "O"}</span>
      <div><small>{kind}</small><strong>{model}</strong></div>
      <dl><div><dt>Tokens</dt><dd>{compact(total)}</dd></div><div><dt>Requests</dt><dd>{requests}</dd></div></dl>
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
        <span className="route-line branch-line"><i /></span>
        <div className="provider-branch">
          <ProviderNode kind="claude" model={snapshot.route.claudeModel} total={snapshot.providerTotals.claude.totalTokens} requests={snapshot.providerTotals.claude.requests} />
          <ProviderNode kind="codex" model={snapshot.route.codexModel} total={snapshot.providerTotals.codex.totalTokens} requests={snapshot.providerTotals.codex.requests} />
        </div>
      </div>
      <p className="flow-caveat">Requests branch by route. Agent activity and token events are aligned by time, not asserted as a direct causal link.</p>
    </section>
  );
}
