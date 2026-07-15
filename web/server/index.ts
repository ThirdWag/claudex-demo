import { extname, resolve, sep } from "node:path";
import { identityFromRequest } from "./security";
import { readHerdrRuntime } from "./herdr";
import { attestRoute, publicTokenEvent, sanitizeUsageRecord, TokenStore, tokenTotals, verifiedRouteEvents } from "./telemetry";

const root = process.env.CLAUDEX_ROOT ?? resolve(import.meta.dir, "../..");
const port = Number(process.env.FABLEMAXXING_PORT ?? 3000);
const dist = resolve(import.meta.dir, "../dist");
const statePath = process.env.FABLEMAXXING_STATE_FILE ?? resolve(root, "state/token-events.json");
const store = new TokenStore(statePath);
await store.load();
const observedSince = Date.now();

if (process.env.FABLEMAXXING_DEMO_DATA === "1" && store.events().length === 0) {
  const now = Date.now();
  await store.ingest(Array.from({ length: 8 }, (_, index) => sanitizeUsageRecord({
    timestamp: new Date(now - index * 8200).toISOString(),
    latency_ms: 420 + index * 67,
    request_id: `demo-${index}`,
    tokens: {
      input_tokens: 12400 - index * 430,
      cached_tokens: 8100 - index * 310,
      output_tokens: 4800 - index * 170,
      reasoning_tokens: 2300 - index * 90,
      total_tokens: 19500 - index * 510,
    },
    failed: false,
    provider: "codex",
    model: process.env.CLAUDEX_CODEX_MODEL ?? "gpt-5.6-sol",
    alias: process.env.CLAUDEX_HARNESS_MODEL ?? "claudex-demo",
  })));
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function proxyHealthy() {
  const key = process.env.CLAUDEX_PROXY_KEY;
  const url = process.env.CLAUDEX_PROXY_URL;
  if (!key || !url) return false;
  try {
    const response = await fetch(`${url}/v1/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function snapshot(viaTailscale: boolean) {
  const [proxy, herdrRuntime] = await Promise.all([proxyHealthy(), readHerdrRuntime()]);
  const requestedAlias = process.env.CLAUDEX_HARNESS_MODEL ?? "claudex-demo";
  const expectedModel = process.env.CLAUDEX_CODEX_MODEL ?? "gpt-5.6-sol";
  const observedEvents = store.events().filter((event) => Date.parse(event.timestamp) >= observedSince);
  const route = attestRoute(observedEvents, requestedAlias, expectedModel, proxy);
  const allEvents = verifiedRouteEvents(observedEvents, route);
  const events = allEvents.slice(-40).reverse();
  const herdr = herdrRuntime.snapshot;

  return {
    access: { viaTailscale },
    updatedAt: new Date().toISOString(),
    services: { proxyHealthy: proxy, herdrHealthy: herdr.healthy },
    herdr,
    route,
    tokenEvents: events.map(publicTokenEvent),
    tokenTotals: tokenTotals(allEvents),
  };
}

let polling = false;
let managementUnavailable = false;
async function pollUsage() {
  if (polling || managementUnavailable) return;
  const key = process.env.CLAUDEX_MANAGEMENT_KEY;
  const url = process.env.CLAUDEX_PROXY_URL;
  if (!key || !url) return;
  polling = true;
  try {
    const response = await fetch(`${url}/v0/management/usage-queue?count=100`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2500),
    });
    if (response.status === 401 || response.status === 403) {
      managementUnavailable = true;
      console.error(`Usage telemetry disabled after management authentication returned HTTP ${response.status}.`);
      return;
    }
    if (!response.ok) return;
    const records = await response.json();
    if (!Array.isArray(records)) return;
    const events = records
      .filter((record) => record && typeof record === "object")
      .map((record) => sanitizeUsageRecord(record as Record<string, unknown>));
    if (events.length) await store.ingest(events);
  } catch {
    // Either observed service can stop independently while the observer stays up.
  } finally {
    polling = false;
  }
}
setInterval(pollUsage, 1500);
void pollUsage();

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const identity = identityFromRequest(request);
    if (!identity) return new Response("FableMaxxing is available through Tailscale Serve only.", { status: 401 });
    const url = new URL(request.url);

    if (url.pathname === "/api/snapshot") return json(await snapshot(identity.viaTailscale));
    if (url.pathname === "/api/action" || url.pathname === "/ws/terminal") {
      return json({ ok: false, message: "FableMaxxing is display-only." }, 405);
    }

    const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const filePath = resolve(dist, requested);
    if (filePath !== dist && !filePath.startsWith(`${dist}${sep}`)) return new Response("Not found.", { status: 404 });
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file, { headers: { "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream" } });
    }
    const index = Bun.file(resolve(dist, "index.html"));
    return (await index.exists())
      ? new Response(index, { headers: { "Content-Type": mimeTypes[".html"] } })
      : new Response("Build missing.", { status: 503 });
  },
});

console.log(`FableMaxxing listening on http://${server.hostname}:${server.port}`);
