#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
languages_dir="${repo_root}/languages"
pot_file="${languages_dir}/lean-stats.pot"
exclude_paths="node_modules,build,dist,package-tmp,vendor,tests,docs,assets/js/__tests__"

if command -v wp >/dev/null 2>&1; then
  if ! command -v msgmerge >/dev/null 2>&1; then
    echo "Error: msgmerge not found. Install gettext to update PO files." >&2
    exit 1
  fi

  (cd "${repo_root}" && wp i18n make-pot . "${pot_file}" \
    --domain=lean-stats \
    --exclude="${exclude_paths}")

  for po_file in "${languages_dir}"/lean-stats-*.po; do
    if [ -f "${po_file}" ]; then
      msgmerge --update --backup=none "${po_file}" "${pot_file}"
    fi
  done

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
