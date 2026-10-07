#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
fixture_dir="src/app/foundation-test-error"
if [[ -e "$fixture_dir" ]]; then
  echo "Refusing to overwrite existing $fixture_dir" >&2
  exit 1
fi

cleanup() {
  rm -rf "$fixture_dir"
  # Next.js 16 keeps the active development server cache under .next/dev.
  if [[ -d .next ]]; then
    find .next -mindepth 1 -maxdepth 1 ! -name dev -exec rm -rf {} +
  fi
}
trap cleanup EXIT
mkdir -p "$fixture_dir"
cp tests/fixtures/error-page.tsx.txt "$fixture_dir/page.tsx"
node --env-file-if-exists=.env --import tsx tests/e2e/setup.ts
node --env-file-if-exists=.env node_modules/@playwright/test/cli.js test "$@"
