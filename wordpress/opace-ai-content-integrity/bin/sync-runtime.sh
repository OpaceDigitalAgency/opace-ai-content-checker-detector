#!/usr/bin/env bash
set -euo pipefail

plugin_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_dir="$(cd "${plugin_dir}/../.." && pwd)"

mkdir -p "${plugin_dir}/schemas" "${plugin_dir}/assets/js" "${plugin_dir}/tests/fixtures/hash" "${plugin_dir}/tests/fixtures/contracts/valid" "${plugin_dir}/tests/fixtures/contracts/invalid"
find "${plugin_dir}/schemas" -type f -name '*.schema.json' -delete
cp "${repo_dir}"/schemas/v1/*.schema.json "${plugin_dir}/schemas/"
cp "${repo_dir}/packages/core/dist/bundle.js" "${plugin_dir}/assets/js/core.mjs"
cp "${repo_dir}"/fixtures/contracts/hash/*.json "${plugin_dir}/tests/fixtures/hash/"
cp "${repo_dir}"/fixtures/contracts/valid/*.json "${plugin_dir}/tests/fixtures/contracts/valid/"
cp "${repo_dir}"/fixtures/contracts/invalid/*.json "${plugin_dir}/tests/fixtures/contracts/invalid/"

test "$(find "${plugin_dir}/schemas" -type f -name '*.schema.json' | wc -l | tr -d ' ')" = "13"
test -s "${plugin_dir}/assets/js/core.mjs"
