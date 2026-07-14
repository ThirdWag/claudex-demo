import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import * as pty from "node-pty";
import { identityFromRequest, isSameOrigin } from "./security";
import { sanitizeUsageRecord, TokenStore } from "./telemetry";
import type { AccessRole, SessionIdentity } from "./types";

const root = process.env.CLAUDEX_ROOT ?? resolve(import.meta.dir, "../..");
const repo = process.env.CLAUDEX_REPO ?? resolve(root, "repo/cre-api-demo");
const session = process.env.CLAUDEX_TMUX_SESSION ?? "claudex";
const port = Number(process.env.FABLEMAXXING_PORT ?? 3000);
const dist = resolve(import.meta.dir, "../dist");
const statePath = process.env.FABLEMAXXING_STATE_FILE ?? resolve(root, "state/token-events.json");
const store = new TokenStore(statePath);
await store.load();

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
    provider: "openai",
    model: process.env.CLAUDEX_CODEX_MODEL ?? "gpt-5.6-sol",
    alias: process.env.CLAUDEX_HARNESS_MODEL ?? "claudex-demo",
    endpoint: "POST /v1/messages",
  })));
}

type SocketData = {
  identity: SessionIdentity;
  terminal?: pty.IPty;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function capture(command: string[], cwd = root) {
  const child = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

async function runScript(path: string) {
  return capture([path]);
}

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

async function tmuxRunning() {
  return (await capture(["tmux", "has-session", "-t", session])).exitCode === 0;
}

async function tail(path: string, lines = 80) {
  try {
    const content = await readFile(path, "utf8");
    return content.split("\n").slice(-lines).join("\n");
  } catch {
    return "Waiting for output…";
  }
}

async function repositoryStatus() {
  const [branch, head, status, diff] = await Promise.all([
    capture(["git", "branch", "--show-current"], repo),
    capture(["git", "log", "-1", "--pretty=%h %s"], repo),
    capture(["git", "status", "--short"], repo),
    capture(["git", "diff", "--numstat"], repo),
  ]);
  const files = diff.stdout
    .split("\n")
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => {
      const [added, deleted, ...path] = line.split("\t");
      return { path: path.join("\t"), added: Number(added) || 0, deleted: Number(deleted) || 0 };
    });
  return {
    branch: branch.stdout || "unknown",
    head: head.stdout || "unknown",
    dirty: Boolean(status.stdout),
    files,
  };
}

async function snapshot(identity: SessionIdentity) {
  const [proxy, tmux, repository, tests] = await Promise.all([
    proxyHealthy(),
    tmuxRunning(),
    repositoryStatus(),
    tail(resolve(root, "logs/tests.log")),
  ]);
  return {
    identity,
    session: { name: session, running: tmux, proxyHealthy: proxy },
    route: {
      alias: process.env.CLAUDEX_HARNESS_MODEL ?? "claudex-demo",
      model: process.env.CLAUDEX_CODEX_MODEL ?? "unconfigured",
    },
    tokenEvents: store.events().slice(-40).reverse(),
    tokenTotals: store.totals(),
    repository,
    tests,
  };
}

let actionInFlight = false;
function actionMessage(label: string, result: Awaited<ReturnType<typeof runScript>>) {
  if (result.exitCode === 0) return `${label} complete.`;
  const detail = (result.stderr || result.stdout || "Check the remote console log.")
    .split("\n")
    .filter(Boolean)
    .slice(-4)
    .join("\n");
  return `${label} failed.\n${detail}`;
}

async function performAction(action: string) {
  if (actionInFlight) return { ok: false, message: "Another action is already running." };
  actionInFlight = true;
  try {
    if (action === "start") {
      await store.clear();
      const result = await runScript(resolve(root, "scripts/start-web-demo.sh"));
      return { ok: result.exitCode === 0, message: actionMessage("Start", result) };
    }
    if (action === "reset") {
      await capture(["tmux", "kill-session", "-t", session]);
      await store.clear();
      const result = await runScript(resolve(root, "bin/demo-reset"));
      return { ok: result.exitCode === 0, message: actionMessage("Reset", result) };
    }
    if (action === "stop") {
      const result = await runScript(resolve(root, "scripts/stop-demo.sh"));
      return { ok: result.exitCode === 0, message: actionMessage("Stop", result) };
    }
    return { ok: false, message: "Unsupported action." };
  } finally {
    actionInFlight = false;
  }
}

let polling = false;
async function pollUsage() {
  if (polling) return;
  const key = process.env.CLAUDEX_MANAGEMENT_KEY;
  const url = process.env.CLAUDEX_PROXY_URL;
  if (!key || !url) return;
  polling = true;
  try {
    const response = await fetch(`${url}/v0/management/usage-queue?count=100`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return;
    const records = await response.json();
    if (!Array.isArray(records)) return;
    const expectedAlias = process.env.CLAUDEX_HARNESS_MODEL;
    const events = records
      .filter((record) => record && typeof record === "object")
      .map((record) => sanitizeUsageRecord(record as Record<string, unknown>))
      .filter((event) => !expectedAlias || event.alias === expectedAlias || event.model === process.env.CLAUDEX_CODEX_MODEL);
    if (events.length) await store.ingest(events);
  } catch {
    // The proxy can legitimately be stopped while the console remains available.
  } finally {
    polling = false;
  }
}
setInterval(pollUsage, 1000);
void pollUsage();

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = Bun.serve<SocketData>({
  hostname: "127.0.0.1",
  port,
  async fetch(request, server) {
    const identity = identityFromRequest(request);
    if (!identity) return new Response("FableMaxxing is available through Tailscale Serve only.", { status: 401 });
    const url = new URL(request.url);

    if (url.pathname === "/ws/terminal") {
      if (!isSameOrigin(request)) return new Response("Invalid origin.", { status: 403 });
      return server.upgrade(request, { data: { identity } })
        ? undefined
        : new Response("WebSocket upgrade failed.", { status: 400 });
    }

    if (url.pathname === "/api/snapshot") return json(await snapshot(identity));
    if (url.pathname === "/api/action" && request.method === "POST") {
      if (identity.role !== "presenter") return json({ ok: false, message: "Presenter access required." }, 403);
      if (!isSameOrigin(request)) return json({ ok: false, message: "Invalid origin." }, 403);
      const body = await request.json().catch(() => ({})) as { action?: string };
      const result = await performAction(body.action ?? "");
      return json(result, result.ok ? 200 : 409);
    }

    const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const filePath = resolve(dist, requested);
    if (filePath !== dist && !filePath.startsWith(`${dist}${sep}`)) return new Response("Not found.", { status: 404 });
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file, { headers: { "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream" } });
    }
    const index = Bun.file(resolve(dist, "index.html"));
    return (await index.exists()) ? new Response(index, { headers: { "Content-Type": mimeTypes[".html"] } }) : new Response("Build missing.", { status: 503 });
  },
  websocket: {
    open(socket) {
      const terminal = pty.spawn("tmux", ["attach-session", "-t", session], {
        name: "xterm-256color",
        cols: 120,
        rows: 38,
        cwd: repo,
        env: { ...process.env, TERM: "xterm-256color" } as Record<string, string>,
      });
      socket.data.terminal = terminal;
      terminal.onData((data) => socket.send(data));
      terminal.onExit(() => socket.close());
    },
    message(socket, message) {
      let payload: { type?: string; data?: string; cols?: number; rows?: number };
      try {
        payload = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message as Uint8Array));
      } catch {
        return;
      }
      if (payload.type === "resize" && payload.cols && payload.rows) {
        socket.data.terminal?.resize(Math.min(payload.cols, 240), Math.min(payload.rows, 80));
      }
      if (payload.type === "input" && socket.data.identity.role === "presenter" && payload.data) {
        socket.data.terminal?.write(payload.data.slice(0, 4096));
      }
    },
    close(socket) {
      socket.data.terminal?.kill();
    },
  },
});

console.log(`FableMaxxing listening on http://${server.hostname}:${server.port}`);
