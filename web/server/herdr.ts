import type { HerdrAgent, HerdrSnapshot } from "./types";

type UnknownRecord = Record<string, unknown>;

const allowedTypes = new Set(["claude", "codex", "grok"]);
const allowedStatuses = new Set(["working", "idle", "done", "blocked"]);

export function sanitizeHerdrSnapshot(raw: unknown): HerdrSnapshot {
  const root = raw && typeof raw === "object" ? raw as UnknownRecord : {};
  const result = root.result && typeof root.result === "object" ? root.result as UnknownRecord : {};
  const snapshot = result.snapshot && typeof result.snapshot === "object" ? result.snapshot as UnknownRecord : {};
  const rawAgents = Array.isArray(snapshot.agents) ? snapshot.agents : [];
  const agents: HerdrAgent[] = rawAgents.slice(0, 24).map((value, index) => {
    const agent = value && typeof value === "object" ? value as UnknownRecord : {};
    const rawType = typeof agent.agent === "string" ? agent.agent.toLowerCase() : "agent";
    const rawStatus = typeof agent.agent_status === "string" ? agent.agent_status.toLowerCase() : "unknown";
    return {
      alias: `Agent ${String(index + 1).padStart(2, "0")}`,
      type: allowedTypes.has(rawType) ? rawType : "agent",
      status: allowedStatuses.has(rawStatus) ? rawStatus as HerdrAgent["status"] : "unknown",
      focused: agent.focused === true,
    };
  });

  return {
    healthy: true,
    version: typeof snapshot.version === "string" ? snapshot.version.slice(0, 24) : "unknown",
    agents,
  };
}

export async function readHerdrSnapshot(): Promise<HerdrSnapshot> {
  try {
    const child = Bun.spawn(["herdr", "api", "snapshot"], { stdout: "pipe", stderr: "pipe" });
    const [stdout, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited]);
    if (exitCode !== 0) throw new Error("Herdr snapshot failed");
    return sanitizeHerdrSnapshot(JSON.parse(stdout));
  } catch {
    return { healthy: false, version: "unavailable", agents: [] };
  }
}
