import type { TokenEvent } from "../types";

const compact = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}k` : String(value);
const time = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "--:--:--" : parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  });
};

export function TokenFlow({ events, live }: { events: TokenEvent[]; live: boolean }) {
  return (
    <section className="panel events-panel">
      <div className="panel-header compact-header">
        <div><p>Claude Code usage metadata</p><h2>Live Token Events</h2></div>
        <span className={`live-state ${live ? "good" : "neutral"}`}><i />{live ? "Live" : "Waiting"}</span>
      </div>
      <div className="events-table-wrap">
        <table className="events-table">
          <thead><tr><th>Time</th><th>Provider</th><th>Input</th><th>Cache/read</th><th>Output</th><th>Reasoning</th><th>Total</th><th>Latency</th><th>Status</th></tr></thead>
          <tbody>
            {events.slice(0, 14).map((event, index) => (
              <tr key={`${event.timestamp}-${event.provider}-${index}`}>
                <td>{time(event.timestamp)}</td><td className={event.provider}>{event.provider}</td><td>{compact(event.inputTokens)}</td><td>{compact(event.cachedTokens)}</td>
                <td>{compact(event.outputTokens)}</td><td>{compact(event.reasoningTokens)}</td><td>{compact(event.totalTokens)}</td><td>{event.latencyMs ? `${event.latencyMs}ms` : "—"}</td>
                <td className={event.failed ? "bad" : "good"}>{event.failed ? "Error" : "OK"}</td>
              </tr>
            ))}
            {!events.length && <tr><td colSpan={9} className="empty-state">Token events appear when a Herdr-managed Claude Code session receives a model response.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
