#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_ROOT="${CLAUDEX_INSTALL_ROOT:-${HOME}/claudex-demo}"

usage() {
  cat <<'EOF'
Usage: ./install.sh [--root PATH]

Installs the Claudex demo scaffold. Existing demo.env and demo repository data
are preserved. No administrator or network settings are changed.
EOF
}

while (( $# )); do
  case "$1" in
    --root)
      [[ $# -ge 2 ]] || { echo "--root requires a path" >&2; exit 2; }
      INSTALL_ROOT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "${INSTALL_ROOT}" in
  /|"${HOME}")
    echo "Refusing unsafe install root: ${INSTALL_ROOT}" >&2
    exit 2
    ;;
esac

mkdir -p \
  "${INSTALL_ROOT}/bin" \
  "${INSTALL_ROOT}/config" \
  "${INSTALL_ROOT}/docs" \
  "${INSTALL_ROOT}/lib" \
  "${INSTALL_ROOT}/logs" \
  "${INSTALL_ROOT}/repo" \
  "${INSTALL_ROOT}/scripts" \
  "${INSTALL_ROOT}/state" \
  "${INSTALL_ROOT}/templates" \
  "${INSTALL_ROOT}/web"

cp -R "${SOURCE_ROOT}/bin/." "${INSTALL_ROOT}/bin/"
cp -R "${SOURCE_ROOT}/docs/." "${INSTALL_ROOT}/docs/"
cp -R "${SOURCE_ROOT}/lib/." "${INSTALL_ROOT}/lib/"
cp -R "${SOURCE_ROOT}/scripts/." "${INSTALL_ROOT}/scripts/"
rm -rf "${INSTALL_ROOT}/web"
cp -R "${SOURCE_ROOT}/web" "${INSTALL_ROOT}/web"
rm -rf "${INSTALL_ROOT}/web/node_modules" "${INSTALL_ROOT}/web/dist"
rm -rf "${INSTALL_ROOT}/templates/demo-repo"
cp -R "${SOURCE_ROOT}/templates/demo-repo" "${INSTALL_ROOT}/templates/demo-repo"
cp "${SOURCE_ROOT}/config/cliproxyapi.yaml" "${INSTALL_ROOT}/config/cliproxyapi.yaml"
cp "${SOURCE_ROOT}/config/demo.env.example" "${INSTALL_ROOT}/config/demo.env.example"
cp "${SOURCE_ROOT}/config/proxy-log-redactions.sed" "${INSTALL_ROOT}/config/proxy-log-redactions.sed"

if [[ ! -f "${INSTALL_ROOT}/config/demo.env" ]]; then
  proxy_key="$(openssl rand -hex 32)"
  management_key="$(openssl rand -hex 32)"
  INSTALL_ROOT_VALUE="${INSTALL_ROOT}" PROXY_KEY_VALUE="${proxy_key}" \
    MANAGEMENT_KEY_VALUE="${management_key}" \
    python3 - "${SOURCE_ROOT}/config/demo.env.example" "${INSTALL_ROOT}/config/demo.env" <<'PY'
import os
import pathlib
import sys

source = pathlib.Path(sys.argv[1]).read_text()
source = source.replace("__CLAUDEX_ROOT__", os.environ["INSTALL_ROOT_VALUE"])
source = source.replace("__CLAUDEX_PROXY_KEY__", os.environ["PROXY_KEY_VALUE"])
source = source.replace("__CLAUDEX_MANAGEMENT_KEY__", os.environ["MANAGEMENT_KEY_VALUE"])
pathlib.Path(sys.argv[2]).write_text(source)
PY
fi

if ! grep -q '^export CLAUDEX_MANAGEMENT_KEY=' "${INSTALL_ROOT}/config/demo.env"; then
  printf '\nexport CLAUDEX_MANAGEMENT_KEY="%s"\n' "$(openssl rand -hex 32)" >> "${INSTALL_ROOT}/config/demo.env"
fi
if ! grep -q '^export FABLEMAXXING_PORT=' "${INSTALL_ROOT}/config/demo.env"; then
  cat >> "${INSTALL_ROOT}/config/demo.env" <<'EOF'
export FABLEMAXXING_PORT="3000"
export FABLEMAXXING_ALLOW_LOCAL="0"
EOF
fi

chmod 700 "${INSTALL_ROOT}" "${INSTALL_ROOT}/bin" "${INSTALL_ROOT}/config" \
  "${INSTALL_ROOT}/lib" "${INSTALL_ROOT}/logs" "${INSTALL_ROOT}/scripts" \
  "${INSTALL_ROOT}/state"
chmod 700 "${INSTALL_ROOT}/bin/"* "${INSTALL_ROOT}/scripts/"*
chmod 600 "${INSTALL_ROOT}/config/demo.env"
chmod 644 "${INSTALL_ROOT}/config/demo.env.example" "${INSTALL_ROOT}/config/cliproxyapi.yaml" \
  "${INSTALL_ROOT}/config/proxy-log-redactions.sed"

(cd "${INSTALL_ROOT}/web" && bun install --frozen-lockfile --no-progress && bun run build)

CLAUDEX_ROOT="${INSTALL_ROOT}" "${INSTALL_ROOT}/scripts/seed-demo.sh"

cat <<EOF
Installed Claudex demo at ${INSTALL_ROOT}

Next:
  1. Set CLAUDEX_CODEX_MODEL in ${INSTALL_ROOT}/config/demo.env
  2. Authenticate Codex: cliproxyapi -codex-login
  3. Run: ${INSTALL_ROOT}/bin/demo-doctor
  4. Follow: ${INSTALL_ROOT}/docs/PRESENTER-RUNBOOK.md
EOF
