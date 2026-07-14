#!/usr/bin/env bash

claudex_resolve_root() {
  if [[ -n "${CLAUDEX_ROOT:-}" ]]; then
    printf '%s\n' "${CLAUDEX_ROOT}"
    return
  fi
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

CLAUDEX_ROOT="$(claudex_resolve_root)"
export CLAUDEX_ROOT

claudex_env_file() {
  printf '%s/config/demo.env\n' "${CLAUDEX_ROOT}"
}

claudex_load_env() {
  local env_file
  env_file="$(claudex_env_file)"
  if [[ ! -f "${env_file}" ]]; then
    echo "Missing ${env_file}; run install.sh first." >&2
    return 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "${env_file}"
  set +a
}

claudex_require_env() {
  local name
  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      echo "Missing required environment variable: ${name}" >&2
      return 1
    fi
  done
}

claudex_proxy_binary() {
  if command -v cliproxyapi >/dev/null 2>&1; then
    command -v cliproxyapi
  elif command -v cli-proxy-api >/dev/null 2>&1; then
    command -v cli-proxy-api
  else
    return 1
  fi
}

claudex_proxy_pid() {
  local pid_file="${CLAUDEX_ROOT}/state/proxy.pid"
  [[ -f "${pid_file}" ]] || return 1
  local pid
  pid="$(<"${pid_file}")"
  [[ "${pid}" =~ ^[0-9]+$ ]] || return 1
  kill -0 "${pid}" 2>/dev/null || return 1
  printf '%s\n' "${pid}"
}

claudex_model_list() {
  curl --silent --show-error --fail \
    --connect-timeout 2 --max-time 10 \
    --header "Authorization: Bearer ${CLAUDEX_PROXY_KEY}" \
    "${CLAUDEX_PROXY_URL}/v1/models"
}

claudex_model_available() {
  local target="${1:-${CLAUDEX_HARNESS_MODEL}}"
  claudex_model_list | python3 -c '
import json, sys
target = sys.argv[1]
data = json.load(sys.stdin)
raise SystemExit(0 if any(item.get("id") == target for item in data.get("data", [])) else 1)
' "${target}"
}

claudex_wait_for_proxy() {
  local attempts="${1:-30}"
  local i
  for ((i = 0; i < attempts; i++)); do
    if claudex_model_list >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

claudex_test_baseline() {
  local temp_dir
  temp_dir="$(mktemp -d)"
  if ! git -C "${CLAUDEX_REPO}" archive "${CLAUDEX_BASELINE_TAG}" | tar -x -C "${temp_dir}"; then
    rm -rf "${temp_dir}"
    return 1
  fi
  if (cd "${temp_dir}" && bun install --no-progress >/dev/null && bun run test:demo >/dev/null); then
    rm -rf "${temp_dir}"
    return 0
  fi
  rm -rf "${temp_dir}"
  return 1
}

claudex_tracked_secret_findings() {
  local repo="$1"
  local filename_findings content_findings
  filename_findings="$(git -C "${repo}" ls-files | grep -E -i \
    '(^|/)(\.env($|\.)|.*credentials.*|.*secrets?.*|id_[a-z0-9_]+)$' || true)"
  content_findings="$(git -C "${repo}" grep -I -n -E \
    '(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})' \
    -- . ':(exclude)DEMO_BUG.md' 2>/dev/null || true)"
  printf '%s\n%s\n' "${filename_findings}" "${content_findings}" | sed '/^$/d'
}

claudex_pass() { printf '[PASS] %s\n' "$*"; }
claudex_warn() { printf '[WARN] %s\n' "$*"; }
claudex_fail() { printf '[FAIL] %s\n' "$*"; return 1; }
