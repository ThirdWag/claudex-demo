#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=../lib/claudex-common.sh
source "${ROOT}/lib/claudex-common.sh"
claudex_load_env
claudex_require_env CLAUDEX_PROXY_KEY CLAUDEX_MANAGEMENT_KEY CLAUDEX_CODEX_MODEL CLAUDEX_HARNESS_MODEL

TEMPLATE="${CLAUDEX_ROOT}/config/cliproxyapi.yaml"
RUNTIME_CONFIG="${CLAUDEX_ROOT}/state/cliproxyapi.runtime.yaml"
LOG_FILE="${CLAUDEX_ROOT}/logs/proxy.log"
PID_FILE="${CLAUDEX_ROOT}/state/proxy.pid"
PROXY_BINARY="$(claudex_proxy_binary)" || {
  echo "CLIProxyAPI is not installed (expected cliproxyapi or cli-proxy-api)." >&2
  exit 1
}

mkdir -p "${CLAUDEX_ROOT}/state" "${CLAUDEX_ROOT}/logs"
python3 - "${TEMPLATE}" "${RUNTIME_CONFIG}" <<'PY'
import json
import os
import pathlib
import sys

source = pathlib.Path(sys.argv[1]).read_text()
values = {
    "CLAUDEX_PROXY_KEY_JSON": os.environ.get("CLAUDEX_PROXY_KEY"),
    "CLAUDEX_MANAGEMENT_KEY_JSON": os.environ.get("CLAUDEX_MANAGEMENT_KEY"),
    "CLAUDEX_CODEX_MODEL_JSON": os.environ.get("CLAUDEX_CODEX_MODEL"),
    "CLAUDEX_HARNESS_MODEL_JSON": os.environ.get("CLAUDEX_HARNESS_MODEL"),
}
for key, value in values.items():
    if not value:
        raise SystemExit(f"Missing required environment variable: {key.removesuffix('_JSON')}")
    source = source.replace("${" + key + "}", json.dumps(value))
if "${CLAUDEX_" in source:
    raise SystemExit("Unresolved Claudex placeholder in runtime configuration")
path = pathlib.Path(sys.argv[2])
path.write_text(source)
path.chmod(0o600)
PY

"${PROXY_BINARY}" -config "${RUNTIME_CONFIG}" >> "${LOG_FILE}" 2>&1 &
proxy_pid=$!
echo "${proxy_pid}" > "${PID_FILE}"
chmod 600 "${PID_FILE}"
trap 'kill "${proxy_pid}" 2>/dev/null || true; rm -f "${PID_FILE}"' EXIT INT TERM
wait "${proxy_pid}"
