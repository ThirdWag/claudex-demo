# Presenter runbook

## 1. Prepare the dedicated Mac

Use a sanitized Apple Silicon Mac with FileVault enabled, automatic login disabled, persistent power, and no unrelated customer repositories or production credentials.

Install and authenticate Tailscale. For a normal macOS Tailscale installation, enable macOS Remote Login and connect over the Tailscale IP or MagicDNS name:

```bash
sudo systemsetup -setremotelogin on
sudo systemsetup -getremotelogin
sudo launchctl print system/com.openssh.sshd
```

Use SSH public keys. A suitable `/etc/ssh/sshd_config.d/claudex-demo.conf` is:

```text
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowUsers demo
```

Validate with `sudo sshd -t` while preserving an active SSH session. Restrict TCP port 22 in the Tailscale access policy to the presenter identity and this host.

Do not expose port 8317 through Tailscale Serve/Funnel, LAN binding, router forwarding, or an SSH reverse tunnel.

## 2. Install prerequisites

Install Git, Bun, tmux, Claude Code, and a pinned CLIProxyAPI release. This project recognizes both `cliproxyapi` and `cli-proxy-api` binary names.

```bash
./install.sh
cliproxyapi -codex-login
```

Edit `~/claudex-demo/config/demo.env`. Discover the current Codex model from the authenticated model list and set its exact ID as `CLAUDEX_CODEX_MODEL`.

## 3. Lock down the host

- Keep `~/claudex-demo/config/demo.env` at mode `0600`.
- Confirm CLIProxyAPI listens only on `127.0.0.1:8317`.
- Disable sleep while connected to AC power.
- Review raw proxy logs before showing them.
- Clear terminal scrollback and shell history before screen sharing.
- Do not put keys in commands, prompts, tmux titles, or screenshots.
- Pin known-working Claude Code and CLIProxyAPI versions for presentation day.

## 4. Rehearse

```bash
~/claudex-demo/bin/demo-doctor
~/claudex-demo/bin/demo-reset
~/claudex-demo/bin/demo --no-attach
tmux attach -t claudex
```

The terminal workflow and the browser observer must use the established CLIProxyAPI service already running on port 8317. Do not stop, replace, or launch another proxy for FableMaxxing.

Use [LIVE-DEMO-PROMPT.md](LIVE-DEMO-PROMPT.md) in the large Claude Code pane. Verify that both the primary request and subagent requests appear in the sanitized log pane.

### Browser presentation with FableMaxxing

FableMaxxing is display-only. Configure its mode-`0600` environment with the existing proxy client key and localhost management credential, and enable CLIProxyAPI usage statistics. Do not change the existing client key, aliases, or port.

Start the private site in the background so it survives SSH disconnects:

```bash
~/claudex-demo/bin/demo-web --background
tailscale serve status
```

Open the reported HTTPS MagicDNS URL from a browser on an authorized tailnet device. Every Tailscale-identified user is an observer. There are no Start, Reset, or Stop controls; the action and legacy terminal endpoints return HTTP 405. Restrict the Serve destination in the tailnet policy; do not enable Funnel.

The “Agent Request Flow” panel combines Herdr's socket API, metadata-only model usage from Herdr-managed Claude Code sessions, and CLIProxyAPI route health. It shows Claude Code inside Herdr and a true proxy branch to Claude or Codex; it does not claim that Claude hands a request directly to Codex. Raw prompts, paths, workspace labels, request/session/terminal IDs, API keys, OAuth material, and source identities are never sent to the browser.

## 5. Narration

Opening: Herdr is the runtime orchestrator and Claude Code is an agent inside it. Claude Code sends model requests to the localhost compatibility endpoint, where CLIProxyAPI routes each request to the configured Claude or Codex provider. Model self-description is not proof.

Completion: The meaningful evidence is a reproduced failure, a regression test, a focused patch, passing verification, an independent review, and a visible routing trail.

## 6. Recovery

- Proxy/auth failure: run `demo-doctor`, re-run `cliproxyapi -codex-login` if needed, and restart the demo.
- Model unavailable: query `/v1/models`, update `CLAUDEX_CODEX_MODEL`, and rerun doctor.
- Alias ignored: inspect `~/.claude/settings.json` and repository `.claude` settings; the launcher supplies an explicit `--model` and all family defaults.
- Disconnected terminal: reconnect and run `tmux attach -t claudex`.
- Unpredictable demo: run `demo-reset`; retain a recorded backup run separately from this repository.
- Direct Claude fallback: unset the `ANTHROPIC_*` variables in a fresh shell and invoke ordinary `claude`. Do not reuse the proxied shell environment.
