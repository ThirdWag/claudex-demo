#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=../lib/claudex-common.sh
source "${ROOT}/lib/claudex-common.sh"
claudex_load_env
claudex_require_env CLAUDEX_PROXY_KEY CLAUDEX_CODEX_MODEL CLAUDEX_PROXY_URL CLAUDEX_HARNESS_MODEL

request_file="$(mktemp)"
response_file="$(mktemp)"
trap 'rm -f "${request_file}" "${response_file}"' EXIT
python3 - "${CLAUDEX_HARNESS_MODEL}" "${request_file}" <<'PY'
import json
import pathlib
import sys

payload = {
    "model": sys.argv[1],
    "max_tokens": 32,
    "messages": [{"role": "user", "content": "Reply with the single word READY."}],
}
pathlib.Path(sys.argv[2]).write_text(json.dumps(payload))
PY
http_code="$(curl --silent --show-error \
  --output "${response_file}" --write-out '%{http_code}' \
  --connect-timeout 2 --max-time 60 \
  --header "Authorization: Bearer ${CLAUDEX_PROXY_KEY}" \
  --header 'Content-Type: application/json' \
  --data-binary "@${request_file}" \
  "${CLAUDEX_PROXY_URL}/v1/messages")"

python3 - "${CLAUDEX_HARNESS_MODEL}" "${CLAUDEX_CODEX_MODEL}" "${http_code}" "${response_file}" <<'PY'
import datetime
import json
import pathlib
import sys

alias, backend, status, response_path = sys.argv[1:]
raw = pathlib.Path(response_path).read_text()
try:
    data = json.loads(raw)
except json.JSONDecodeError:
    data = {}

print("CLAUDEX ROUTE VERIFICATION")
print(f"  Time: {datetime.datetime.now().astimezone().isoformat(timespec='seconds')}")
print(f"  HTTP status: {status}")
print(f"  Requested alias: {alias}")
print(f"  Configured backend: {backend}")
print(f"  Response model: {data.get('model', 'not returned')}")
print(f"  Response received: {'yes' if status.startswith('2') else 'no'}")
if not status.startswith("2"):
    error = data.get("error", {})
    if isinstance(error, dict):
        error = error.get("message") or error.get("type")
    print(f"  Error: {error or 'request failed'}")
    raise SystemExit(1)
PY
