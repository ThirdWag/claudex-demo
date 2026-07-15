# Security model

- CLIProxyAPI is rendered with `host: "127.0.0.1"` and port `8317`.
- Requests require a random 256-bit client key generated during installation.
- Runtime configuration, environment files, logs, state, and seeded demo repositories are ignored by this source repository.
- The runtime YAML and environment file are mode `0600`.
- The log pane applies defense-in-depth redaction for bearer tokens, API keys, access tokens, and refresh tokens.
- The demo repository contains synthetic names and data only.
- `demo-reset` refuses to operate without the dedicated marker and fails on credential-like tracked filenames, recognized secret content, or untracked credential files.

The sanitized viewer is not a substitute for reviewing raw logs before a public presentation. Keep HTTP body logging disabled unless all prompts and repository contents are confirmed safe.

## FableMaxxing browser boundary

- The web backend listens only on its configured `127.0.0.1` port and is exposed privately with Tailscale Serve.
- Requests without Tailscale identity headers are rejected unless explicit local-development mode is enabled.
- Every identified tailnet user is read-only; FableMaxxing exposes no lifecycle controls or terminal stream.
- The action endpoint and legacy terminal WebSocket path always return HTTP 405.
- The backend polls CLIProxyAPI's authenticated management usage queue over localhost for route evidence and never controls the proxy service.
- Displayed token counts come from allowlisted `model` and `usage` metadata in the current Herdr-managed Claude Code sessions. Assistant content, user content, prompts, tool calls, and transcript identifiers are not returned to the browser.
- Raw proxy usage records are reduced to token counts, latency, provider/model classification, and success state before mode-`0600` persistence. The browser receives neither request IDs nor raw model, alias, or endpoint fields.
- Herdr socket snapshots are allowlisted to synthetic agent aliases, agent type, status, focus, and Herdr version. Working directories, workspace labels, terminal IDs, session IDs, and terminal content never cross the browser boundary.
- Tailscale identity is used only to authorize the request; login and display-name values are not returned by the snapshot API.
- Never enable Tailscale Funnel for this service.
