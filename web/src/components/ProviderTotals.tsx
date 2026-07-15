import type { Snapshot, TokenTotals } from "../types";

const compact = (value: number) => value >= 1_000_000
  ? `${(value / 1_000_000).toFixed(2)}m`
  : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

function TotalCard({ model, totals }: { model: string; totals: TokenTotals }) {
  return (
    <article className="provider-total codex">
      <div className="provider-title"><span>Codex</span><small>{model}</small></div>
      <strong>{compact(totals.totalTokens)}</strong>
      <span className="provider-share">{totals.requests} responses</span>
      <i><b style={{ width: totals.requests ? "100%" : "0%" }} /></i>
      <dl><div><dt>Input</dt><dd>{compact(totals.inputTokens)}</dd></div><div><dt>Cache/read</dt><dd>{compact(totals.cachedTokens)}</dd></div><div><dt>Output</dt><dd>{compact(totals.outputTokens)}</dd></div><div><dt>Reasoning</dt><dd>{compact(totals.reasoningTokens)}</dd></div></dl>
    </article>
  );
}

export function ProviderTotals({ totals, route }: { totals: TokenTotals; route: Snapshot["route"] }) {
  return (
    <section className="panel totals-panel">
      <div className="panel-header compact-header"><div><p>Verified route only</p><h2>Codex Usage</h2></div><span className={route.status === "verified" ? "good" : route.status === "drift" ? "bad" : "neutral"}>{route.status}</span></div>
      <div className="totals-stack">
        <TotalCard model={route.upstreamModel || route.expectedModel} totals={totals} />
        <dl className="route-attestation">
          <div><dt>Harness alias</dt><dd>{route.requestedAlias}</dd></div>
          <div><dt>Actual provider</dt><dd className={route.actualProvider === "codex" ? "good" : route.actualProvider === "unknown" ? "neutral" : "bad"}>{route.actualProvider}</dd></div>
          <div><dt>Upstream model</dt><dd>{route.upstreamModel || "Waiting"}</dd></div>
          <div><dt>Evidence</dt><dd>{route.verifiedAt ? new Date(route.verifiedAt).toLocaleTimeString([], { hour12: false }) : "Not attested"}</dd></div>
        </dl>
      </div>
      <div className="combined-total"><span>Verified Codex tokens</span><strong>{compact(totals.totalTokens)}</strong></div>
    </section>
  );
}
