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
