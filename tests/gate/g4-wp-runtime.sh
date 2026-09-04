#!/usr/bin/env bash
set -euo pipefail

action="${1:-start}"
zip_path="${2:-}"
project="oaci-g4-103"
network="${project}-net"

containers=(
	"${project}-min-db" "${project}-min-web"
	"${project}-current-db" "${project}-current-web"
	"${project}-multi-db" "${project}-multi-web"
)
volumes=(
	"${project}-min-db" "${project}-min-wp"
	"${project}-current-db" "${project}-current-wp"
	"${project}-multi-db" "${project}-multi-wp"
)

stop_runtime() {
	docker rm -f "${containers[@]}" >/dev/null 2>&1 || true
	for volume in "${volumes[@]}"; do docker volume rm "${volume}" >/dev/null 2>&1 || true; done
	docker network rm "${network}" >/dev/null 2>&1 || true
}

if [[ "${action}" == "stop" ]]; then
	stop_runtime
	exit 0
fi

if [[ -z "${zip_path}" || ! -f "${zip_path}" ]]; then
	echo "Usage: $0 start /absolute/path/to/plugin.zip" >&2
	exit 2
fi

zip_path="$(cd "$(dirname "${zip_path}")" && pwd)/$(basename "${zip_path}")"
stop_runtime
docker network create "${network}" >/dev/null

start_cell() {
	local lane="$1" wp_version="$2" php_tag="$3" port="$4" multisite="$5"
	local db="${project}-${lane}-db" web="${project}-${lane}-web"
	local db_volume="${project}-${lane}-db" wp_volume="${project}-${lane}-wp"
	local site_url="http://127.0.0.1:${port}"
	if [[ "${multisite}" == "yes" ]]; then site_url='http://oaci-multi.local'; fi
	docker volume create "${db_volume}" >/dev/null
	docker volume create "${wp_volume}" >/dev/null
	docker run -d --name "${db}" --network "${network}" --network-alias "${lane}-db" \
		-v "${db_volume}:/var/lib/mysql" \
		-e MARIADB_DATABASE=wordpress -e MARIADB_USER=wordpress \
		-e MARIADB_PASSWORD=oaci-local-only -e MARIADB_ROOT_PASSWORD=oaci-root-local-only \
		mariadb:lts --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci >/dev/null
	for _ in $(seq 1 60); do
		if docker exec "${db}" mariadb-admin ping -uroot -poaci-root-local-only --silent >/dev/null 2>&1; then break; fi
		sleep 1
	done
	docker run --rm --network "${network}" --user 33:33 -e WP_CLI_PHP_ARGS='-d memory_limit=512M' \
		-v "${wp_volume}:/var/www/html" -v "${zip_path}:/candidate.zip:ro" \
		wordpress:"cli-${php_tag}" sh -euc "
			php -d memory_limit=512M /usr/local/bin/wp core download --version='${wp_version}' --force --allow-root
			php -d memory_limit=512M /usr/local/bin/wp config create --dbname=wordpress --dbuser=wordpress --dbpass=oaci-local-only --dbhost='${lane}-db' --skip-check --allow-root
			php -d memory_limit=512M /usr/local/bin/wp core install --url='${site_url}' --title='Opace G4 ${lane}' --admin_user=oaci_admin --admin_password='Oaci-G4-Local-Only-2026!' --admin_email='test@example.invalid' --skip-email --allow-root
			php -d memory_limit=512M /usr/local/bin/wp plugin install /candidate.zip --activate --allow-root
			php -d memory_limit=512M /usr/local/bin/wp option update avatar_default blank --allow-root
			php -d memory_limit=512M /usr/local/bin/wp option update show_avatars 0 --allow-root
			php -d memory_limit=512M /usr/local/bin/wp plugin install plugin-check --activate --allow-root
			php -d memory_limit=512M /usr/local/bin/wp plugin get opace-ai-content-checker-detector --fields=name,status,version --format=json --allow-root
			php -d memory_limit=512M /usr/local/bin/wp core version --allow-root
		"
	if [[ "${multisite}" == "yes" ]]; then
		docker run --rm --network "${network}" --user 33:33 -e WP_CLI_PHP_ARGS='-d memory_limit=512M' -v "${wp_volume}:/var/www/html" wordpress:"cli-${php_tag}" sh -euc "
			php -d memory_limit=512M /usr/local/bin/wp core multisite-convert --title='Opace G4 multisite' --allow-root
			php -d memory_limit=512M /usr/local/bin/wp site create --slug=site-two --title='Site Two' --email='test@example.invalid' --allow-root
			php -d memory_limit=512M /usr/local/bin/wp plugin deactivate opace-ai-content-checker-detector --allow-root
			php -d memory_limit=512M /usr/local/bin/wp plugin activate opace-ai-content-checker-detector --url='http://oaci-multi.local' --allow-root
			php -d memory_limit=512M /usr/local/bin/wp plugin activate opace-ai-content-checker-detector --url='http://oaci-multi.local/site-two/' --allow-root
		"
	fi
	docker run -d --name "${web}" --network "${network}" -p "127.0.0.1:${port}:80" \
		-v "${wp_volume}:/var/www/html" wordpress:"${php_tag}-apache" >/dev/null
}

start_cell min 6.5.5 php7.4 8932 no
start_cell current 7.1 php8.3 8931 no
start_cell multi 6.5.5 php7.4 8933 yes

for port in 8931 8932 8933; do
	for _ in $(seq 1 60); do
		if curl --fail --silent "http://127.0.0.1:${port}/wp-login.php" >/dev/null; then break; fi
		sleep 1
	done
done

docker ps --filter "name=${project}-" --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
