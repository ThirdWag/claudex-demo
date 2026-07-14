import { useState } from "react";
import type { Snapshot } from "../types";

export function OutputPanel({ tests, snapshot }: { tests: string; snapshot: Snapshot }) {
  const [tab, setTab] = useState<"tests" | "application">("tests");
  const application = [
    `FableMaxxing console: connected`,
    `Tailscale identity: ${snapshot.identity.displayName}`,
    `Proxy: ${snapshot.session.proxyHealthy ? "healthy" : "stopped"}`,
    `Route: ${snapshot.route.alias} → ${snapshot.route.model}`,
    `Observed tmux: ${snapshot.session.running ? "attached" : "not found"}`,
    `Usage events captured: ${snapshot.tokenTotals.requests}`,
  ].join("\n");
  return (
    <section className="panel output-panel">
      <div className="panel-header"><div><h2>Tests &amp; Application</h2></div></div>
      <div className="tabs" role="tablist">
        <button className={tab === "tests" ? "active" : ""} onClick={() => setTab("tests")}>Tests</button>
        <button className={tab === "application" ? "active" : ""} onClick={() => setTab("application")}>Application</button>
      </div>
      <pre>{tab === "tests" ? tests : application}</pre>
    </section>
  );
}
