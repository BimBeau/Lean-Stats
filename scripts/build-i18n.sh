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

  echo "i18n: repo root ${repo_root}"
  echo "i18n: generating POT (${pot_file})"
  (cd "${repo_root}" && wp i18n make-pot . "${pot_file}" \
    --domain=lean-stats \
    --exclude="${exclude_paths}" \
    --location=full)

  for po_file in "${languages_dir}"/lean-stats-*.po; do
    if [ -f "${po_file}" ]; then
      msgmerge --update --backup=none "${po_file}" "${pot_file}"
    fi
  done

  echo "i18n: generating MO files"
  (cd "${repo_root}" && wp i18n make-mo languages)

  make_json_cmd=(wp i18n make-json languages --no-purge --domain=lean-stats)
  echo "i18n: generating JS JSON (${make_json_cmd[*]})"
  make_json_output="$(
    cd "${repo_root}" && "${make_json_cmd[@]}" 2>&1
  )" || make_json_status=$?
  make_json_status="${make_json_status:-0}"

  if [ "${make_json_status}" -ne 0 ]; then
    echo "${make_json_output}" >&2
  fi

  has_js_refs=false
  if (cd "${repo_root}" && grep -Eq '^#:\s+.*\.(js|jsx|ts|tsx)' languages/lean-stats-*.po); then
    has_js_refs=true
  fi

  if ! (cd "${repo_root}" && find languages -type f -name '*.json' | grep -q .); then
    if [ "${has_js_refs}" = "true" ] || [ "${make_json_status}" -ne 0 ]; then
      echo "Error: no JS translation JSON files were generated." >&2
      echo "Diagnostics: pwd" >&2
      (cd "${repo_root}" && pwd) || true
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
    else
      echo "Warning: no JS translation JSON files were generated because no JS references were found." >&2
    fi
  elif [ "${make_json_status}" -ne 0 ] && [ "${has_js_refs}" = "true" ]; then
    echo "Error: wp i18n make-json failed despite JS references in PO files." >&2
    echo "${make_json_output}" >&2
    exit 1
  fi
else
  echo "Warning: wp-cli not found; skipping .mo and JS translation JSON generation." >&2
fi
