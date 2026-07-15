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

const dateLabel = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "configured window" : parsed.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const coverage = (observed: number, accounted: number) => {
  if (!accounted) return "0%";
  const percent = (observed / accounted) * 100;
  return percent > 0 && percent < 1 ? "<1%" : `${Math.min(100, Math.round(percent))}%`;
};

export function ProviderTotals({ snapshot }: { snapshot: Snapshot }) {
  const { providerTotals: totals, tokenTotals: combined, spendModels: models, reconciliation, spendSource, unattributedUsage } = snapshot;
  return (
    <section className="panel totals-panel">
      <div className="panel-header compact-header"><div><p>Claude Code usage since {dateLabel(spendSource.since)}</p><h2>Token Spend</h2></div><span>{combined.requests} calls</span></div>
      <div className="totals-stack">
        <TotalCard kind="fable" label="Fable API" model={modelLabel(models.fable, "No calls observed")} totals={totals.fable} combined={combined.totalTokens} />
        <TotalCard kind="openai" label="OpenAI / Codex" model={modelLabel(models.openai, "No calls observed")} totals={totals.openai} combined={combined.totalTokens} />
        <div className={`reconciliation ${reconciliation.status}`}>
          <span>Proxy evidence coverage</span><strong>{reconciliation.status === "unavailable" ? "Unavailable" : `${reconciliation.coveragePercent}%`}</strong>
          <small>Retained queue evidence: Fable {coverage(reconciliation.proxyObserved.fable.totalTokens, totals.fable.totalTokens)} · OpenAI {coverage(reconciliation.proxyObserved.openai.totalTokens, totals.openai.totalTokens)}</small>
          {unattributedUsage.totals.totalTokens > 0 && <small className="unattributed">{compact(unattributedUsage.totals.totalTokens)} transcript tokens unattributed: {unattributedUsage.models.join(", ")}</small>}
        </div>
      </div>
      <div className="combined-total"><span>Combined token spend</span><strong>{compact(combined.totalTokens)}</strong></div>
    </section>
  );
}
