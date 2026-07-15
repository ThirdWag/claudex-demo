import type { Snapshot, TokenTotals } from "../types";

const compact = (value: number) => value >= 1_000_000
  ? `${(value / 1_000_000).toFixed(2)}m`
  : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

const dollars = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

function TotalCard({ kind, label, model, totals, estimatedCost, combinedCost }: { kind: "fable" | "openai"; label: string; model: string; totals: TokenTotals; estimatedCost: number; combinedCost: number }) {
  const share = combinedCost ? Math.round((estimatedCost / combinedCost) * 100) : 0;
  return (
    <article className={`provider-total ${kind}`}>
      <div className="provider-title"><span>{label}</span><small>{model}</small></div>
      <strong>{dollars(estimatedCost)}</strong>
      <span className="provider-share">{share}% of cost · {totals.requests} calls</span>
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
  const { providerTotals: totals, tokenTotals: combined, spendModels: models, reconciliation, spendSource, unattributedUsage, cost } = snapshot;
  const saving = (cost?.savings ?? 0) >= 0;
  return (
    <section className="panel totals-panel">
      <div className="panel-header compact-header"><div><p>Standard API list price since {dateLabel(spendSource.since)}</p><h2>Estimated Cost</h2></div><span>{combined.requests} calls</span></div>
      <div className="totals-stack">
        <TotalCard kind="fable" label="Fable API" model={modelLabel(models.fable, "No calls observed")} totals={totals.fable} estimatedCost={cost?.fable ?? 0} combinedCost={cost?.actual ?? 0} />
        <TotalCard kind="openai" label="OpenAI / Codex" model={modelLabel(models.openai, "No calls observed")} totals={totals.openai} estimatedCost={cost?.openai ?? 0} combinedCost={cost?.actual ?? 0} />
        {cost && <div className={`savings ${saving ? "positive" : "negative"}`}>
          <span>{saving ? "Estimated savings" : "Estimated added cost"}</span><strong>{dollars(Math.abs(cost.savings))}</strong>
          <b>{Math.abs(cost.savingsPercent).toFixed(1)}% across the observed workflow</b>
          <small>Fable-only baseline {dollars(cost.fableOnlyBaseline)} → blended {dollars(cost.actual)}</small>
          <small>OpenAI-routed lane saves {cost.routedLaneSavingsPercent.toFixed(1)}% at the same observed token mix.</small>
          <small>Standard list rates as of {cost.asOf}, including GPT-5.6 long-context premiums; estimate only, not an invoice.</small>
        </div>}
        <div className={`reconciliation ${reconciliation.status}`}>
          <span>Proxy evidence coverage</span><strong>{reconciliation.status === "unavailable" ? "Unavailable" : `${reconciliation.coveragePercent}%`}</strong>
          <small>Retained queue evidence: Fable {coverage(reconciliation.proxyObserved.fable.totalTokens, totals.fable.totalTokens)} · OpenAI {coverage(reconciliation.proxyObserved.openai.totalTokens, totals.openai.totalTokens)}</small>
          {unattributedUsage.totals.totalTokens > 0 && <small className="unattributed">{compact(unattributedUsage.totals.totalTokens)} transcript tokens unattributed: {unattributedUsage.models.join(", ")}</small>}
        </div>
      </div>
      <div className="combined-total"><span>Estimated blended cost</span><strong>{cost ? dollars(cost.actual) : "Unavailable"}</strong></div>
    </section>
  );
}
