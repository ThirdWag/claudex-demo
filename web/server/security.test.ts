import { afterEach, describe, expect, test } from "bun:test";
import { identityFromRequest, isSameOrigin } from "./security";

afterEach(() => {
  delete process.env.FABLEMAXXING_ALLOWED_USERS;
  delete process.env.FABLEMAXXING_ALLOW_LOCAL;
});

describe("Tailscale identity authorization", () => {
  test("grants presenter access only to the explicit allowlist", () => {
    process.env.FABLEMAXXING_ALLOWED_USERS = "presenter@example.com";
    const presenter = identityFromRequest(new Request("https://demo.example", {
      headers: { "Tailscale-User-Login": "presenter@example.com", "Tailscale-User-Name": "Presenter" },
    }));
    const viewer = identityFromRequest(new Request("https://demo.example", {
      headers: { "Tailscale-User-Login": "viewer@example.com" },
    }));
    expect(presenter?.role).toBe("presenter");
    expect(viewer?.role).toBe("viewer");
  });

  test("rejects requests without a Tailscale identity by default", () => {
    expect(identityFromRequest(new Request("http://127.0.0.1:3000"))).toBeNull();
  });

  test("requires matching origin and host for mutations and websockets", () => {
    expect(isSameOrigin(new Request("https://demo.example/api/action", {
      headers: { host: "demo.example", origin: "https://demo.example" },
    }))).toBe(true);
    expect(isSameOrigin(new Request("https://demo.example/api/action", {
      headers: { host: "demo.example", origin: "https://attacker.example" },
    }))).toBe(false);
  });
});
