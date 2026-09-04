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

test "$(find "${plugin_dir}/schemas" -type f -name '*.schema.json' | wc -l | tr -d ' ')" = "14"
test -s "${plugin_dir}/assets/js/core.mjs"
node "${plugin_dir}/bin/sync-c2pa-runtime.mjs"
node "${plugin_dir}/bin/sync-cycle5-browser.mjs"
# One command syncs both shared families the plugin ships: shared/presentation
# (the renderer and its stylesheet) and shared/report (the printable report and
# the PDF writer). build-plugin.sh calls this script, so a build can never
# package a stale copy, and the ZIP contract below it names every shared file it
# expects to find.
node "${plugin_dir}/bin/sync-shared-presentation.mjs"
