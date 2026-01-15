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

if command -v wp >/dev/null 2>&1; then
  (cd "${repo_root}" && wp i18n make-mo languages)
  (cd "${repo_root}" && wp i18n make-json languages --no-purge)
else
  echo "Warning: wp-cli not found; skipping .mo and JS translation JSON generation." >&2
fi

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
