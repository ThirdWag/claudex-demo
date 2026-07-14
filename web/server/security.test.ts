import { afterEach, describe, expect, test } from "bun:test";
import { identityFromRequest, isSameOrigin } from "./security";

afterEach(() => {
  delete process.env.FABLEMAXXING_ALLOW_LOCAL;
});

describe("Tailscale identity authorization", () => {
  test("treats every Tailscale identity as a read-only viewer", () => {
    const observer = identityFromRequest(new Request("https://demo.example", {
      headers: { "Tailscale-User-Login": "presenter@example.com", "Tailscale-User-Name": "Presenter" },
    }));
    const viewer = identityFromRequest(new Request("https://demo.example", {
      headers: { "Tailscale-User-Login": "viewer@example.com" },
    }));
    expect(observer?.role).toBe("viewer");
    expect(viewer?.role).toBe("viewer");
  });

  test("rejects requests without a Tailscale identity by default", () => {
    expect(identityFromRequest(new Request("http://127.0.0.1:3000"))).toBeNull();
  });

  test("requires matching origin and host for terminal observation websockets", () => {
    expect(isSameOrigin(new Request("https://demo.example/api/action", {
      headers: { host: "demo.example", origin: "https://demo.example" },
    }))).toBe(true);
    expect(isSameOrigin(new Request("https://demo.example/api/action", {
      headers: { host: "demo.example", origin: "https://attacker.example" },
    }))).toBe(false);
  });
});
