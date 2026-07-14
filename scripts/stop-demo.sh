#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=../lib/claudex-common.sh
source "${ROOT}/lib/claudex-common.sh"
claudex_load_env

tmux kill-session -t "${CLAUDEX_TMUX_SESSION:-claudex}" 2>/dev/null || true
if proxy_pid="$(claudex_proxy_pid 2>/dev/null)"; then
  kill "${proxy_pid}" 2>/dev/null || true
fi
echo "FableMaxxing demo session stopped."
