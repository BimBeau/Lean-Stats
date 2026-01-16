#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v wp >/dev/null 2>&1; then
  (cd "${repo_root}" && wp i18n make-mo languages)
  (cd "${repo_root}" && wp i18n make-json build --output-dir=languages --no-purge)
else
  echo "Warning: wp-cli not found; skipping .mo and JS translation JSON generation." >&2
fi
