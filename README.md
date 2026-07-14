# Claudex Remote Demo

[![test](https://github.com/ThirdWag/claudex-demo/actions/workflows/test.yml/badge.svg)](https://github.com/ThirdWag/claudex-demo/actions/workflows/test.yml)

This project installs a repeatable macOS demonstration environment in which Claude Code is the agent harness and CLIProxyAPI routes the harness-visible model alias to a Codex OAuth model.

The proxy is always configured for `127.0.0.1:8317`. The presentation shows the configured route and sanitized proxy logs; it never treats model self-identification as proof.

## Quick start

```bash
./install.sh
$EDITOR "$HOME/claudex-demo/config/demo.env"
cliproxyapi -codex-login
"$HOME/claudex-demo/bin/demo-doctor"
"$HOME/claudex-demo/bin/demo"
```

Choose `CLAUDEX_CODEX_MODEL` from the authenticated `/v1/models` response rather than guessing a model name:

```bash
source "$HOME/claudex-demo/config/demo.env"
curl -fsS -H "Authorization: Bearer $CLAUDEX_PROXY_KEY" \
  "$CLAUDEX_PROXY_URL/v1/models"
```

The installer never modifies Remote Login, Tailscale policy, SSH configuration, sleep settings, or FileVault. Those host-level steps require administrator access and presenter-specific choices; follow [docs/PRESENTER-RUNBOOK.md](docs/PRESENTER-RUNBOOK.md).

## Source-tree checks

```bash
bash tests/run.sh
```

The test suite uses a temporary home directory and never touches the installed demo environment.

## Private browser console

FableMaxxing is a display-only browser surface for the remote Mac. It observes the existing CLIProxyAPI service, sanitized token accounting, repository/test status, and an optional read-only tmux mirror through Tailscale Serve. It never starts, stops, or reconfigures the proxy or Claude Code.

Configure `~/claudex-demo/config/demo.env` with the existing proxy's client key and its localhost management credential. CLIProxyAPI usage statistics must be enabled for token telemetry. Keep both files mode `0600` and never commit their values.

Then update the installed files and start the private site:

```bash
./install.sh
~/claudex-demo/bin/demo-web --background
```

The command prints the private `https://<device>.<tailnet>.ts.net` URL. The observer backend remains bound to localhost and does not own the existing proxy process. Do not use Tailscale Funnel.
