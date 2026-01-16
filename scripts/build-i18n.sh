#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v wp >/dev/null 2>&1; then
  (cd "${repo_root}" && wp i18n make-mo languages)

  (cd "${repo_root}" && wp i18n make-json languages --no-purge)

  if ! (cd "${repo_root}" && find languages -type f -name '*.json' | grep -q .); then
    echo "Error: no JS translation JSON files were generated." >&2
    echo "Diagnostics: wp i18n make-json --help" >&2
    (cd "${repo_root}" && wp i18n make-json --help) || true
    echo "Diagnostics: ls -la languages" >&2
    (cd "${repo_root}" && ls -la languages) || true
    echo "Diagnostics: JS references in languages/lean-stats-fr_FR.po" >&2
    if (cd "${repo_root}" && grep -nE '^#:' languages/lean-stats-fr_FR.po | head -n 50); then
      :
    else
      echo "Note: no JS references found in languages/lean-stats-fr_FR.po." >&2
    fi
    exit 1
  fi
else
  echo "Warning: wp-cli not found; skipping .mo and JS translation JSON generation." >&2
fi
