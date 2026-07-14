import { describe, expect, test } from "bun:test";
import { sanitizeHerdrSnapshot } from "./herdr";

describe("Herdr snapshot sanitization", () => {
  test("publishes only aliases, agent type, status, and focus", () => {
    const result = sanitizeHerdrSnapshot({ result: { snapshot: {
      version: "0.7.3",
      agents: [{
        agent: "claude",
        agent_status: "working",
        focused: true,
        cwd: "/Users/private/secret-repo",
        terminal_id: "term-secret",
        agent_session: { value: "session-secret" },
      }],
    } } });

    expect(result).toEqual({
      healthy: true,
      version: "0.7.3",
      agents: [{ alias: "Agent 01", type: "claude", status: "working", focused: true }],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("secret-repo");
    expect(serialized).not.toContain("term-secret");
    expect(serialized).not.toContain("session-secret");
  });
});
