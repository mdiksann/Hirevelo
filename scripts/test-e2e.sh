#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
fixture_dir="src/app/foundation-test-error"
if [[ -e "$fixture_dir" ]]; then
  echo "Refusing to overwrite existing $fixture_dir" >&2
  exit 1
fi

cleanup() {
  rm -rf "$fixture_dir" .next/dev/types
}
trap cleanup EXIT
mkdir -p "$fixture_dir"
cp tests/fixtures/error-page.tsx.txt "$fixture_dir/page.tsx"
node --env-file-if-exists=.env node_modules/@playwright/test/cli.js test "$@"
