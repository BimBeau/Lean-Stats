#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v wp >/dev/null 2>&1; then
  (cd "${repo_root}" && wp i18n make-mo languages)

  # Scan source files for JS translations; build artifacts can be minified and miss i18n metadata.
  if (cd "${repo_root}" && wp i18n make-json src --no-purge --output-dir=languages); then
    :
  else
    echo "Warning: wp i18n make-json does not support --output-dir; falling back to moving JSON from src." >&2
    (cd "${repo_root}" && wp i18n make-json src --no-purge)
    (cd "${repo_root}" && find src -type f -name '*lean-stats*.json' -exec mv -f {} languages/ \; || true)
  fi

  if ! (cd "${repo_root}" && find languages -type f -name '*.json' | grep -q .); then
    echo "Warning: no JS translation JSON files were generated." >&2
  fi
else
  echo "Warning: wp-cli not found; skipping .mo and JS translation JSON generation." >&2
fi
