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

- The web backend listens only on `127.0.0.1:3000` and is exposed privately with Tailscale Serve.
- Requests without Tailscale identity headers are rejected unless explicit local-development mode is enabled.
- Every identified tailnet user is read-only; FableMaxxing exposes no lifecycle controls or writable terminal path.
- The action endpoint always returns HTTP 405, and terminal WebSocket upgrades require a same-origin request plus an existing tmux session.
- The backend polls CLIProxyAPI's authenticated management usage queue over localhost and never controls the proxy service.
- Raw usage records are reduced to token counts, latency, provider/model route, endpoint, and success state before mode-`0600` persistence.
- Never enable Tailscale Funnel for this service.
