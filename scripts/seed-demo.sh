#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=../lib/claudex-common.sh
source "${ROOT}/lib/claudex-common.sh"
claudex_load_env
claudex_require_env CLAUDEX_REPO CLAUDEX_BASELINE_TAG CLAUDEX_BASELINE_BRANCH

if [[ -d "${CLAUDEX_REPO}/.git" ]]; then
  if [[ -f "${CLAUDEX_REPO}/.claudex-demo-repo" ]]; then
    echo "Demo repository already exists; preserving ${CLAUDEX_REPO}"
    exit 0
  fi
  echo "Refusing to replace unrecognized Git repository: ${CLAUDEX_REPO}" >&2
  exit 1
fi

mkdir -p "$(dirname "${CLAUDEX_REPO}")"
if [[ -e "${CLAUDEX_REPO}" ]]; then
  if [[ -d "${CLAUDEX_REPO}" && -z "$(find "${CLAUDEX_REPO}" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    rmdir "${CLAUDEX_REPO}"
  else
    echo "Refusing to replace existing non-demo path: ${CLAUDEX_REPO}" >&2
    exit 1
  fi
fi
cp -R "${CLAUDEX_ROOT}/templates/demo-repo" "${CLAUDEX_REPO}"

cd "${CLAUDEX_REPO}"
git init -q
git switch -q -c "${CLAUDEX_BASELINE_BRANCH}"
bun install --no-progress >/dev/null
bun run test:demo
git add .
git -c user.name='Claudex Demo' -c user.email='demo@localhost' \
  commit -q -m 'chore: seed Claudex demo baseline'
git tag "${CLAUDEX_BASELINE_TAG}"
git switch -q -c "${CLAUDEX_WORK_BRANCH:-demo/live}"
echo "Seeded demo repository at ${CLAUDEX_REPO}"
