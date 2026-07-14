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

FableMaxxing is the browser presentation surface for the same remote-Mac demo. It provides a live Claude Code terminal, real CLIProxyAPI token accounting, repository/test status, and presenter-only controls through Tailscale Serve.

On the remote Mac, set the presenter identity in `~/claudex-demo/config/demo.env`:

```bash
export FABLEMAXXING_ALLOWED_USERS="presenter@example.com"
```

Then update the installed files and start the private site:

```bash
./install.sh
~/claudex-demo/bin/demo-web --background
```

The command prints the private `https://<device>.<tailnet>.ts.net` URL. The web backend and CLIProxyAPI remain bound to localhost. Do not use Tailscale Funnel.
