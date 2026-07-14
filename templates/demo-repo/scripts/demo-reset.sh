#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CLAUDEX_ROOT:-}" ]]; then
  echo "CLAUDEX_ROOT is required; use the outer demo-reset command." >&2
  exit 1
fi
exec "${CLAUDEX_ROOT}/bin/demo-reset"
