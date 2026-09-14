#!/usr/bin/env bash
# Compiles the pure time library and runs its assertions against known tzdb facts.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .test-build
npx tsc src/lib/time.ts --outDir .test-build --target es2022 --module esnext \
  --moduleResolution bundler --lib es2022,dom
mv .test-build/time.js .test-build/time.mjs
node tests/time.test.mjs
