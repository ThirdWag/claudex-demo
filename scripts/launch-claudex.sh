#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=../lib/claudex-common.sh
source "${ROOT}/lib/claudex-common.sh"
claudex_load_env
claudex_require_env CLAUDEX_PROXY_KEY CLAUDEX_CODEX_MODEL CLAUDEX_PROXY_URL \
  CLAUDEX_HARNESS_MODEL CLAUDEX_REPO

cd "${CLAUDEX_REPO}"

export ANTHROPIC_BASE_URL="${CLAUDEX_PROXY_URL}"
export ANTHROPIC_AUTH_TOKEN="${CLAUDEX_PROXY_KEY}"
export ANTHROPIC_API_KEY="${CLAUDEX_PROXY_KEY}"
export ANTHROPIC_MODEL="${CLAUDEX_HARNESS_MODEL}"
export ANTHROPIC_DEFAULT_OPUS_MODEL="${CLAUDEX_HARNESS_MODEL}"
export ANTHROPIC_DEFAULT_SONNET_MODEL="${CLAUDEX_HARNESS_MODEL}"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="${CLAUDEX_HARNESS_MODEL}"
export ANTHROPIC_DEFAULT_FABLE_MODEL="${CLAUDEX_HARNESS_MODEL}"
export CLAUDE_CODE_SUBAGENT_MODEL="${CLAUDEX_HARNESS_MODEL}"
export CLAUDEX_MODE=1

printf '\033]0;CLAUDEX DEMO — Claude Code + Codex\007\n'
printf '╭────────────────────────────────────────────────────────────╮\n'
printf '│ %-58.58s │\n' 'CLAUDEX DEMO'
printf '│ %-58.58s │\n' 'Harness: Claude Code'
printf '│ %-58.58s │\n' "Harness model label: ${CLAUDEX_HARNESS_MODEL}"
printf '│ %-58.58s │\n' "Proxy: ${CLAUDEX_PROXY_URL}"
printf '│ %-58.58s │\n' "Configured backend route: ${CLAUDEX_CODEX_MODEL}"
printf '│ %-58.58s │\n' 'Verification: CLIProxyAPI request log'
printf '╰────────────────────────────────────────────────────────────╯\n\n'

exec claude --model "${CLAUDEX_HARNESS_MODEL}"
