#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_slug="lean-stats"
version="$(node -p "require('${repo_root}/package.json').version")"
output_dir="${repo_root}/dist"
output_file="${output_dir}/${plugin_slug}-${version}.zip"

mkdir -p "${output_dir}"

npm --prefix "${repo_root}" run build

temp_dir="$(mktemp -d)"
trap 'rm -rf "${temp_dir}"' EXIT

rsync -a --delete \
  --exclude ".git" \
  --exclude ".github" \
  --exclude "dist" \
  --exclude "node_modules" \
  --exclude "package-tmp" \
  "${repo_root}/" "${temp_dir}/${plugin_slug}/"

(cd "${temp_dir}" && zip -r "${output_file}" "${plugin_slug}")

echo "Created ${output_file}"
