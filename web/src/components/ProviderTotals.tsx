import type { Snapshot, TokenTotals } from "../types";

const compact = (value: number) => value >= 1_000_000
  ? `${(value / 1_000_000).toFixed(2)}m`
  : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

function TotalCard({ kind, model, totals, combined }: { kind: "claude" | "codex"; model: string; totals: TokenTotals; combined: number }) {
  const share = combined ? Math.round((totals.totalTokens / combined) * 100) : 0;
  return (
    <article className={`provider-total ${kind}`}>
      <div className="provider-title"><span>{kind}</span><small>{model}</small></div>
      <strong>{compact(totals.totalTokens)}</strong>
      <span className="provider-share">{share}%</span>
      <i><b style={{ width: `${share}%` }} /></i>
      <dl><div><dt>Input</dt><dd>{compact(totals.inputTokens)}</dd></div><div><dt>Cache/read</dt><dd>{compact(totals.cachedTokens)}</dd></div><div><dt>Output</dt><dd>{compact(totals.outputTokens)}</dd></div><div><dt>Reasoning</dt><dd>{compact(totals.reasoningTokens)}</dd></div></dl>
    </article>
  );
}

export function ProviderTotals({ totals, combined, route }: { totals: Snapshot["providerTotals"]; combined: TokenTotals; route: Snapshot["route"] }) {
  return (
    <section className="panel totals-panel">
      <div className="panel-header compact-header"><div><p>Herdr session usage</p><h2>Provider Totals</h2></div><span>{combined.requests} responses</span></div>
      <div className="totals-stack">
        <TotalCard kind="claude" model={route.claudeModel} totals={totals.claude} combined={combined.totalTokens} />
        <TotalCard kind="codex" model={route.codexModel} totals={totals.codex} combined={combined.totalTokens} />
      </div>
      <div className="combined-total"><span>Combined tokens</span><strong>{compact(combined.totalTokens)}</strong></div>
    </section>
  );
}
