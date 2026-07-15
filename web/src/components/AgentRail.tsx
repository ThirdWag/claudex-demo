import type { HerdrAgent } from "../types";

export function AgentRail({ agents, healthy, version }: { agents: HerdrAgent[]; healthy: boolean; version: string }) {
  const active = agents.filter((agent) => agent.status === "working").length;
  return (
    <section className="panel agents-panel">
      <div className="panel-header compact-header">
        <div><p>Herdr {version}</p><h2>Herdr Agents</h2></div>
        <span>{healthy ? `${active} active` : "Offline"}</span>
      </div>
      <div className="agent-list">
        {agents.map((agent) => (
          <article className={`agent-row ${agent.focused ? "focused" : ""}`} key={agent.alias}>
            <i className={`agent-dot ${agent.status}`} />
            <div><strong>{agent.alias}</strong><span>{agent.type}</span></div>
            <em>{agent.status}</em>
            {agent.focused && <small>Focus</small>}
          </article>
        ))}
        {!agents.length && <p className="empty-state">Waiting for sanitized Herdr agent metadata.</p>}
      </div>
      <div className="privacy-label">Aliases only · no prompts, paths, or session IDs</div>
    </section>
  );
}
