#!/usr/bin/env bash
set -euo pipefail

plugin_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_dir="$(cd "${plugin_dir}/../.." && pwd)"
output_dir="${1:-${repo_dir}/dist}"
mkdir -p "${output_dir}"
output_dir="$(cd "${output_dir}" && pwd)"
stage_root="$(mktemp -d)"
stage_plugin="${stage_root}/opace-ai-content-checker-detector"
trap 'rm -rf "${stage_root}"' EXIT

version="$(sed -n 's/^ \* Version: //p' "${plugin_dir}/opace-ai-content-checker-detector.php")"
constant="$(sed -n "s/^define( 'OPACE_CONTENT_INTEGRITY_VERSION', '\([^']*\)' );/\1/p" "${plugin_dir}/opace-ai-content-checker-detector.php")"
stable="$(sed -n 's/^Stable tag: //p' "${plugin_dir}/readme.txt")"
package="$(node -p "require('${plugin_dir}/package.json').version")"
citation="$(sed -n 's/^version: //p' "${plugin_dir}/CITATION.cff")"
test "${version}" = "${constant}"
test "${version}" = "${stable}"
test "${version}" = "${package}"
test "${version}" = "${citation}"

"${plugin_dir}/bin/sync-runtime.sh"
mkdir -p "${stage_plugin}"

rsync -a --delete \
	--exclude '.git*' --exclude '.wordpress-org/' --exclude '.wp-env.json' --exclude 'bin/' --exclude 'tests/' \
	--exclude 'node_modules/' --exclude 'phpunit.xml.dist' --exclude 'phpcs.xml.dist' \
	--exclude '.phpunit.result.cache' \
	--exclude 'package.json' --exclude 'package-lock.json' --exclude 'composer.json' --exclude 'composer-runtime.json' --exclude 'composer.lock' \
	--exclude '/vendor/' --exclude 'dist/' --exclude '*.map' \
	"${plugin_dir}/" "${stage_plugin}/"

cp "${plugin_dir}/composer.json" "${plugin_dir}/composer.lock" "${stage_plugin}/"
docker run --rm -e COMPOSER_ROOT_VERSION="${version}" -v "${repo_dir}/packages:/packages:ro" -v "${stage_plugin}:/stage-plugin" \
	-w /stage-plugin composer:2.9.8 \
	install --no-dev --classmap-authoritative --prefer-dist --no-interaction --no-progress
rm -f "${stage_plugin}/composer.json" "${stage_plugin}/composer.lock"
cp "${plugin_dir}/composer-runtime.json" "${stage_plugin}/composer.json"
# The path package is already resolved into the root Composer runtime. Remove its
# development-only nested install and hidden VCS metadata from the staged ZIP.
rm -rf "${stage_plugin}/vendor/opace/content-integrity-contracts/vendor"
find "${stage_plugin}/vendor" -type f -name 'composer.lock' -delete
find "${stage_plugin}" -type f -name '.*' -delete
# Composer records the local build source in installed-package metadata. Runtime
# consumers only need the bundled package, so remove the unavailable build path.
find "${stage_plugin}/vendor/composer" -type f -exec sed -i.bak 's#../../packages/contracts/php#bundled-frozen-contracts#g' {} +
find "${stage_plugin}/vendor/composer" -type f -name '*.bak' -delete

find "${stage_root}" -exec touch -h -t 202608260000 {} +
find "${stage_root}" -type d -exec chmod 755 {} +
find "${stage_root}" -type f -exec chmod 644 {} +

zip_path="${output_dir}/opace-ai-content-checker-detector-${version}.zip"
rm -f "${zip_path}"
( cd "${stage_root}" && LC_ALL=C find opace-ai-content-checker-detector -type f -print | LC_ALL=C sort | zip -X -q "${zip_path}" -@ )
unzip -tqq "${zip_path}"
if unzip -Z1 "${zip_path}" | grep -E '(^|/)(composer\.lock|composer-runtime\.json|package(-lock)?\.json|phpunit\.result\.cache)$' >/dev/null; then
	echo 'Build-only dependency metadata escaped into the plugin ZIP.' >&2
	exit 1
fi
if unzip -p "${zip_path}" | grep -E 'dev-main|\.\./\.\./packages/contracts/php' >/dev/null; then
	echo 'Unresolved development dependency metadata escaped into the plugin ZIP.' >&2
	exit 1
fi
for runtime_path in \
	opace-ai-content-checker-detector/vendor/autoload.php \
	opace-ai-content-checker-detector/vendor/opace/content-integrity-contracts/src/ContractValidator.php \
	opace-ai-content-checker-detector/vendor/opis/json-schema/src/Validator.php \
	opace-ai-content-checker-detector/assets/vendor/c2pa/index.js \
	opace-ai-content-checker-detector/assets/vendor/c2pa/c2pa-runtime.js \
	opace-ai-content-checker-detector/assets/vendor/c2pa/c2pa_worker.js \
	opace-ai-content-checker-detector/assets/vendor/c2pa/c2pa_bg.wasm \
	opace-ai-content-checker-detector/assets/vendor/c2pa/highgain.js \
	opace-ai-content-checker-detector/assets/vendor/c2pa/LICENSE-c2pa-web.txt \
	opace-ai-content-checker-detector/assets/vendor/c2pa/LICENSE-c2pa-wasm.txt \
	opace-ai-content-checker-detector/assets/vendor/c2pa/SOURCE-BUILD-NOTICE.txt; do
	if ! unzip -Z1 "${zip_path}" | grep -Fx "${runtime_path}" >/dev/null; then
		echo "Required runtime dependency is missing from the plugin ZIP: ${runtime_path}" >&2
		exit 1
	fi
done
for runtime_path in \
	opace-ai-content-checker-detector/assets/vendor/cycle5/index.js \
	opace-ai-content-checker-detector/assets/vendor/cycle5/ort-wasm-simd-threaded.wasm \
	opace-ai-content-checker-detector/assets/vendor/cycle5/LICENSE-cycle5-browser.txt \
	opace-ai-content-checker-detector/assets/vendor/cycle5/LICENSE-onnxruntime-web.txt \
	opace-ai-content-checker-detector/assets/vendor/cycle5/SOURCE-BUILD-NOTICE.txt; do
	if ! unzip -Z1 "${zip_path}" | grep -Fx "${runtime_path}" >/dev/null; then
		echo "Required on-device Cycle-5 runtime is missing from the plugin ZIP: ${runtime_path}" >&2
		exit 1
	fi
done
if unzip -Z1 "${zip_path}" | grep -E '^opace-ai-content-checker-detector/assets/vendor/c2pa/' | grep -Ev '/(index\.js|c2pa-runtime\.js|c2pa_worker\.js|c2pa_bg\.wasm|highgain\.js|LICENSE-(c2pa-(web|wasm|types|utilities)|highgain|ts-deepmerge)\.txt|SOURCE-BUILD-NOTICE\.txt)$' >/dev/null; then
	echo 'An unaudited file escaped into the packaged C2PA runtime.' >&2
	exit 1
fi
if unzip -Z1 "${zip_path}" | grep -E '^opace-ai-content-checker-detector/assets/vendor/cycle5/' | grep -Ev '/(index\.js|ort-wasm-simd-threaded\.wasm|LICENSE-(cycle5-browser|onnxruntime-web)\.txt|SOURCE-BUILD-NOTICE\.txt)$' >/dev/null; then
	echo 'An unaudited file escaped into the packaged Cycle-5 runtime.' >&2
	exit 1
fi
for runtime_path in \
	opace-ai-content-checker-detector/assets/vendor/shared/SHARED-SYNC-MANIFEST.txt \
	opace-ai-content-checker-detector/assets/vendor/shared/evidence/index.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/evidence/readings.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/evidence/cadence.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/evidence/document-tells.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/evidence/finding-spans.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/evidence/phrase-ratios.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/evidence/phrase-table.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/evidence/rule-liveness.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/evidence/rule-tells.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/presentation/checker-result-presentation.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/presentation/checker-ui.css \
	opace-ai-content-checker-detector/assets/vendor/shared/report/checker-pdf.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/report/helvetica-metrics.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/report/logo.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/report/pdf-writer.mjs \
	opace-ai-content-checker-detector/assets/vendor/shared/report/report-model.mjs \
	opace-ai-content-checker-detector/assets/fonts/outfit-variable.woff2 \
	opace-ai-content-checker-detector/assets/fonts/plus-jakarta-sans-latin.woff2 \
	opace-ai-content-checker-detector/assets/fonts/OFL.txt; do
	if ! unzip -Z1 "${zip_path}" | grep -Fx "${runtime_path}" >/dev/null; then
		echo "Required packaged file is missing from the plugin ZIP: ${runtime_path}" >&2
		exit 1
	fi
done
if unzip -Z1 "${zip_path}" | grep -E '^opace-ai-content-checker-detector/assets/vendor/shared/' | grep -Ev '/(SHARED-SYNC-MANIFEST\.txt|presentation/(checker-result-presentation\.mjs|checker-ui\.css)|evidence/(index|cadence|document-tells|finding-spans|phrase-ratios|phrase-table|rule-liveness|rule-tells|readings)\.mjs|report/(checker-pdf|helvetica-metrics|logo|pdf-writer|report-model)\.mjs)$' >/dev/null; then
	echo 'An unlisted file escaped into the packaged shared presentation or report runtime.' >&2
	exit 1
fi
if unzip -Z1 "${zip_path}" | grep -E '/vendor/(dealerdirect|doctrine|myclabs|nikic|phar-io|phpcsstandards|phpunit|sebastian|squizlabs|theseer|wp-coding-standards)/' >/dev/null; then
	echo 'Development-only Composer dependency escaped into the plugin ZIP.' >&2
	exit 1
fi
# Composer falls back from --prefer-dist to a source checkout when a dist
# download fails, and a source checkout brings the package's own .git, tests and
# CI configuration with it. Observed on 3 September 2026: two builds an hour
# apart differed only because opis/json-schema installed from source once. The
# ZIP is not deterministic while that can happen silently, and a vendor .git
# directory must never reach WordPress.org, so the build fails instead.
if unzip -Z1 "${zip_path}" | grep -E '/vendor/[^/]+/[^/]+/(tests?|\.git|\.github|\.travis\.yml|phpunit\.xml(\.dist)?)(/|$)' >/dev/null; then
	echo 'A Composer source checkout escaped into the plugin ZIP: re-run the build so every package installs from dist.' >&2
	exit 1
fi
if [ "$(wc -c < "${zip_path}" | tr -d ' ')" -ge 10485760 ]; then
	echo 'The plugin ZIP exceeds the 10 MB C2PA package target.' >&2
	exit 1
fi
shasum -a 256 "${zip_path}"
