import type { Snapshot, TokenTotals } from "../types";

const compact = (value: number) => value >= 1_000_000
  ? `${(value / 1_000_000).toFixed(2)}m`
  : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

function TotalCard({ kind, label, model, totals, combined }: { kind: "fable" | "openai"; label: string; model: string; totals: TokenTotals; combined: number }) {
  const share = combined ? Math.round((totals.totalTokens / combined) * 100) : 0;
  return (
    <article className={`provider-total ${kind}`}>
      <div className="provider-title"><span>{label}</span><small>{model}</small></div>
      <strong>{compact(totals.totalTokens)}</strong>
      <span className="provider-share">{share}% · {totals.requests} calls</span>
      <i><b style={{ width: `${share}%` }} /></i>
      <dl><div><dt>Input</dt><dd>{compact(totals.inputTokens)}</dd></div><div><dt>Cache/read</dt><dd>{compact(totals.cachedTokens)}</dd></div><div><dt>Output</dt><dd>{compact(totals.outputTokens)}</dd></div><div><dt>Reasoning</dt><dd>{compact(totals.reasoningTokens)}</dd></div></dl>
    </article>
  );
}

const modelLabel = (models: string[], fallback: string) => models.length ? models.join(", ") : fallback;

export function ProviderTotals({ totals, combined, models }: { totals: Snapshot["providerTotals"]; combined: TokenTotals; models: Snapshot["spendModels"] }) {
  return (
    <section className="panel totals-panel">
      <div className="panel-header compact-header"><div><p>All observed proxy calls</p><h2>Token Spend</h2></div><span>{combined.requests} calls</span></div>
      <div className="totals-stack">
        <TotalCard kind="fable" label="Fable API" model={modelLabel(models.fable, "No calls observed")} totals={totals.fable} combined={combined.totalTokens} />
        <TotalCard kind="openai" label="OpenAI / Codex" model={modelLabel(models.openai, "No calls observed")} totals={totals.openai} combined={combined.totalTokens} />
      </div>
      <div className="combined-total"><span>Combined token spend</span><strong>{compact(combined.totalTokens)}</strong></div>
    </section>
  );
}
