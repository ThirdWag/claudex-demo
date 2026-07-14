#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=../lib/claudex-common.sh
source "${ROOT}/lib/claudex-common.sh"
claudex_load_env

"${CLAUDEX_ROOT}/bin/demo-doctor" --preflight
"${CLAUDEX_ROOT}/bin/demo-reset"

if claudex_model_list >/dev/null 2>&1; then
  claudex_proxy_pid >/dev/null 2>&1 || {
    echo "Port 8317 is served by an external CLIProxyAPI instance; stop it before starting FableMaxxing." >&2
    exit 1
  }
else
  claudex_proxy_pid >/dev/null 2>&1 && {
    echo "The demo-managed proxy exists but is not healthy." >&2
    exit 1
  }
  : > "${CLAUDEX_ROOT}/logs/proxy.log"
  nohup "${CLAUDEX_ROOT}/scripts/launch-proxy.sh" >/dev/null 2>&1 &
  disown || true
  claudex_wait_for_proxy 30 || {
    echo "CLIProxyAPI did not become healthy." >&2
    exit 1
  }
fi

"${CLAUDEX_ROOT}/bin/demo-doctor"
"${CLAUDEX_ROOT}/scripts/verify-routing.sh"

session="${CLAUDEX_TMUX_SESSION:-claudex}"
tmux kill-session -t "${session}" 2>/dev/null || true
tmux new-session -d -s "${session}" -n claude -c "${CLAUDEX_REPO}" \
  "${CLAUDEX_ROOT}/scripts/launch-claudex.sh"
tmux set-option -t "${session}" window-size largest >/dev/null

(
  cd "${CLAUDEX_REPO}"
  bun run test:demo > "${CLAUDEX_ROOT}/logs/tests.log" 2>&1
) &
disown || true

echo "FableMaxxing demo session started."
