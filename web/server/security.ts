import type { SessionIdentity } from "./types";

function allowedUsers(): Set<string> {
  return new Set(
    (process.env.FABLEMAXXING_ALLOWED_USERS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function identityFromRequest(request: Request): SessionIdentity | null {
  const login = request.headers.get("tailscale-user-login")?.trim();
  const name = request.headers.get("tailscale-user-name")?.trim();
  if (login) {
    return {
      user: login,
      displayName: name || login,
      role: allowedUsers().has(login.toLowerCase()) ? "presenter" : "viewer",
      viaTailscale: true,
    };
  }

  if (process.env.FABLEMAXXING_ALLOW_LOCAL === "1") {
    return {
      user: "local-dev",
      displayName: "Local developer",
      role: "presenter",
      viaTailscale: false,
    };
  }
  return null;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
