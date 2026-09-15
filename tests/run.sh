#!/usr/bin/env bash
# Compiles the pure time library and runs its assertions against known tzdb
# facts, then checks the US split-zone boundaries against known cities.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .test-build
npx tsc src/lib/time.ts --outDir .test-build --target es2022 --module esnext \
  --moduleResolution bundler --lib es2022,dom
mv .test-build/time.js .test-build/time.mjs
node tests/time.test.mjs

# Guard the US map's two-tone split boundaries against cities of known zone.
node scripts/verify-splits.mjs

# Guard the world map's country labels: on the right country, not overlapping.
node scripts/verify-labels.mjs
