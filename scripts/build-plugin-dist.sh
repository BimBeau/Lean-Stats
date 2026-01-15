#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_slug="lean-stats"
dest_root="${1:-}"

if [ -z "$dest_root" ]; then
  echo "Usage: $(basename "$0") <destination-root>" >&2
  exit 1
fi

mkdir -p "${dest_root}/${plugin_slug}"

"${repo_root}/scripts/build-i18n.sh"

rsync -a --delete \
  --exclude ".git" \
  --exclude ".github" \
  --exclude "dist" \
  --exclude "node_modules" \
  --exclude "package-tmp" \
  --exclude "src" \
  --exclude "tests" \
  --exclude "docs" \
  --exclude "scripts" \
  --exclude "assets/js/__tests__" \
  --exclude ".eslintrc.json" \
  --exclude "phpcs.xml" \
  --exclude "phpunit.xml.dist" \
  --exclude "webpack.config.js" \
  --exclude "AGENTS.md" \
  --exclude "package.json" \
  --exclude "package-lock.json" \
  "${repo_root}/" "${dest_root}/${plugin_slug}/"
