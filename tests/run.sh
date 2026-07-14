#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

for file in \
  "${SOURCE_ROOT}/install.sh" \
  "${SOURCE_ROOT}"/bin/* \
  "${SOURCE_ROOT}"/lib/*.sh \
  "${SOURCE_ROOT}"/scripts/*.sh \
  "${SOURCE_ROOT}"/templates/demo-repo/scripts/*.sh; do
  bash -n "${file}" || fail "bash syntax: ${file}"
done
pass "bash syntax"

if HOME="${TMP}/unsafe-home" CLAUDEX_INSTALL_ROOT="${TMP}/unsafe-home" \
  bash "${SOURCE_ROOT}/install.sh" >/dev/null 2>&1; then
  fail "installer accepted HOME as its install root"
fi
pass "unsafe install roots are rejected"

HOME="${TMP}/home" CLAUDEX_INSTALL_ROOT="${TMP}/home/claudex-demo" \
  bash "${SOURCE_ROOT}/install.sh" >/dev/null
ROOT="${TMP}/home/claudex-demo"

[[ "$(stat -f '%Lp' "${ROOT}/config/demo.env")" == "600" ]] || fail "demo.env mode"
[[ -f "${ROOT}/repo/cre-api-demo/.claudex-demo-repo" ]] || fail "demo repository marker"
git -C "${ROOT}/repo/cre-api-demo" rev-parse --verify refs/tags/claudex-demo-baseline >/dev/null \
  || fail "baseline tag"
pass "isolated installation and baseline seed"

CLAUDEX_ROOT="${ROOT}" "${ROOT}/bin/demo-reset" >/dev/null
[[ -z "$(git -C "${ROOT}/repo/cre-api-demo" status --porcelain)" ]] || fail "clean reset"
[[ "$(git -C "${ROOT}/repo/cre-api-demo" branch --show-current)" == "demo/live" ]] \
  || fail "work branch after reset"
pass "deterministic reset"

touch "${ROOT}/repo/cre-api-demo/.env"
if CLAUDEX_ROOT="${ROOT}" "${ROOT}/bin/demo-reset" >/dev/null 2>&1; then
  fail "reset accepted an untracked credential file"
fi
[[ -f "${ROOT}/repo/cre-api-demo/.env" ]] || fail "reset removed credential without warning"
rm "${ROOT}/repo/cre-api-demo/.env"
pass "reset refuses untracked credentials"

ROOT_TO_SCAN="${ROOT}" python3 - <<'PY'
import os
import pathlib

root = pathlib.Path(os.environ["ROOT_TO_SCAN"])
env = (root / "config/demo.env").read_text()
assert "__CLAUDEX_" not in env
key_line = next(line for line in env.splitlines() if line.startswith("export CLAUDEX_PROXY_KEY="))
key = key_line.split('"', 2)[1]
assert len(key) == 64 and all(c in "0123456789abcdef" for c in key)
template = (root / "config/cliproxyapi.yaml").read_text()
assert 'host: "127.0.0.1"' in template
PY
pass "generated secret and localhost-only template"

cd "${ROOT}/repo/cre-api-demo"
bun run test:demo >/dev/null
pass "demo fixture baseline tests"

bun "${SOURCE_ROOT}/tests/verify-demo-bug.mjs"
pass "deliberate concurrent duplicate is reproducible"

sed -i '' 's/export CLAUDEX_CODEX_MODEL=""/export CLAUDEX_CODEX_MODEL="gpt-test"/' \
  "${ROOT}/config/demo.env"
mkdir -p "${TMP}/mock-bin"
cat > "${TMP}/mock-bin/cliproxyapi" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
[[ "$1" == "-config" ]]
[[ -f "$2" ]]
rg -q '^host: "127\.0\.0\.1"$' "$2"
rg -q 'name: "gpt-test"' "$2"
rg -q 'alias: "claudex-demo"' "$2"
EOF
chmod +x "${TMP}/mock-bin/cliproxyapi"
PATH="${TMP}/mock-bin:${PATH}" CLAUDEX_ROOT="${ROOT}" "${ROOT}/scripts/launch-proxy.sh"
[[ "$(stat -f '%Lp' "${ROOT}/state/cliproxyapi.runtime.yaml")" == "600" ]] \
  || fail "runtime config mode"
ruby -ryaml -e 'YAML.safe_load(File.read(ARGV.fetch(0)))' \
  "${ROOT}/state/cliproxyapi.runtime.yaml"
pass "runtime config rendering and proxy invocation"

redacted="$(printf '%s\n' \
  'Authorization: Bearer abc.DEF-123' \
  'api_key=super-secret-value' \
  'refresh-token: another-secret' | \
  sed -E -f "${ROOT}/config/proxy-log-redactions.sed")"
if printf '%s\n' "${redacted}" | rg -q 'abc\.DEF|super-secret|another-secret'; then
  fail "proxy log redaction"
fi
[[ "$(printf '%s\n' "${redacted}" | rg -o '\[REDACTED\]' | wc -l | tr -d ' ')" == "3" ]] \
  || fail "proxy log redaction count"
pass "proxy log secrets are redacted"

echo "All tests passed."
