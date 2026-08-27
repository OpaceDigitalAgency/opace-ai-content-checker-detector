#!/usr/bin/env bash
set -euo pipefail

plugin_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_dir="$(cd "${plugin_dir}/../.." && pwd)"
output_dir="${1:-${repo_dir}/dist}"
mkdir -p "${output_dir}"
output_dir="$(cd "${output_dir}" && pwd)"
stage_root="$(mktemp -d)"
stage_plugin="${stage_root}/opace-ai-content-integrity"
trap 'rm -rf "${stage_root}"' EXIT

version="$(sed -n 's/^ \* Version: //p' "${plugin_dir}/opace-ai-content-integrity.php")"
constant="$(sed -n "s/^define( 'OPACE_CONTENT_INTEGRITY_VERSION', '\([^']*\)' );/\1/p" "${plugin_dir}/opace-ai-content-integrity.php")"
stable="$(sed -n 's/^Stable tag: //p' "${plugin_dir}/readme.txt")"
test "${version}" = "${constant}"
test "${version}" = "${stable}"

"${plugin_dir}/bin/sync-runtime.sh"
mkdir -p "${stage_plugin}"

rsync -a --delete \
	--exclude '.git*' --exclude '.wordpress-org/' --exclude '.wp-env.json' --exclude 'bin/' --exclude 'tests/' \
	--exclude 'node_modules/' --exclude 'phpunit.xml.dist' --exclude 'phpcs.xml.dist' \
	--exclude '.phpunit.result.cache' \
	--exclude 'package.json' --exclude 'package-lock.json' --exclude 'composer.json' --exclude 'composer-runtime.json' --exclude 'composer.lock' \
	--exclude 'vendor/' --exclude 'dist/' --exclude '*.map' \
	"${plugin_dir}/" "${stage_plugin}/"

cp "${plugin_dir}/composer.json" "${plugin_dir}/composer.lock" "${stage_plugin}/"
docker run --rm -e COMPOSER_ROOT_VERSION="${version}" -v "${repo_dir}/packages:/packages:ro" -v "${stage_plugin}:/stage-plugin" \
	-w /stage-plugin composer:2.8.12 \
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

zip_path="${output_dir}/opace-ai-content-integrity-${version}.zip"
rm -f "${zip_path}"
( cd "${stage_root}" && LC_ALL=C find opace-ai-content-integrity -type f -print | LC_ALL=C sort | zip -X -q "${zip_path}" -@ )
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
	opace-ai-content-integrity/vendor/autoload.php \
	opace-ai-content-integrity/vendor/opace/content-integrity-contracts/src/ContractValidator.php \
	opace-ai-content-integrity/vendor/opis/json-schema/src/Validator.php; do
	if ! unzip -Z1 "${zip_path}" | grep -Fx "${runtime_path}" >/dev/null; then
		echo "Required runtime dependency is missing from the plugin ZIP: ${runtime_path}" >&2
		exit 1
	fi
done
if unzip -Z1 "${zip_path}" | grep -E '/vendor/(dealerdirect|doctrine|myclabs|nikic|phar-io|phpcsstandards|phpunit|sebastian|squizlabs|theseer|wp-coding-standards)/' >/dev/null; then
	echo 'Development-only Composer dependency escaped into the plugin ZIP.' >&2
	exit 1
fi
shasum -a 256 "${zip_path}"
