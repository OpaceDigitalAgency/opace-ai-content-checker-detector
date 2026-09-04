<?php

namespace Opace\ContentIntegrity\Core;

defined( 'ABSPATH' ) || exit;

// Custom-table ownership checks cannot use the WordPress object cache.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching

final class Migrator {
	const DB_OPTION       = 'oaci_db_version';
	const LEGACY_OPTION   = 'oaci_legacy_storage_detected';
	const CONFLICT_OPTION = 'oaci_storage_conflict_detected';

	public function maybe_migrate() {
		if ( version_compare( (string) get_option( self::DB_OPTION, '0' ), OPACE_CONTENT_INTEGRITY_DB_VERSION, '<' ) ) {
			$this->migrate();
		}
	}

	public function migrate() {
		global $wpdb;
		if ( $this->legacy_tables_exist() ) {
			update_option( self::LEGACY_OPTION, '1', false );
			return false;
		}

		$current = (string) get_option( self::DB_OPTION, '0' );
		if ( '0' === $current && $this->canonical_tables_exist() ) {
			update_option( self::CONFLICT_OPTION, '1', false );
			return false;
		}
		if ( version_compare( $current, OPACE_CONTENT_INTEGRITY_DB_VERSION, '>' ) ) {
			return false;
		}

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset  = $wpdb->get_charset_collate();
		$jobs     = $wpdb->prefix . 'opace_ci_jobs';
		$receipts = $wpdb->prefix . 'opace_ci_receipts';

		$sql_jobs = "CREATE TABLE {$jobs} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			public_id varchar(40) NOT NULL,
			owner_user_id bigint(20) unsigned NOT NULL,
			caller varchar(64) NOT NULL,
			caller_object_id varchar(191) NULL,
			state varchar(32) NOT NULL,
			privacy_route varchar(32) NOT NULL,
			input_hash char(71) NOT NULL,
			config_hash char(71) NOT NULL,
			idempotency_key_hash char(71) NULL,
			payload_ref varchar(191) NULL,
			result_ref varchar(191) NULL,
			error_code varchar(64) NULL,
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			expires_at datetime NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY public_id (public_id),
			UNIQUE KEY owner_idempotency (owner_user_id, idempotency_key_hash),
			KEY owner_user_id (owner_user_id),
			KEY caller (caller),
			KEY state (state)
		) {$charset};";

		$sql_receipts = "CREATE TABLE {$receipts} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			public_id varchar(40) NOT NULL,
			job_public_id varchar(40) NULL,
			owner_user_id bigint(20) unsigned NOT NULL,
			caller varchar(64) NOT NULL,
			caller_object_id varchar(191) NULL,
			source_hash char(71) NOT NULL,
			candidate_hash char(71) NULL,
			receipt_hash char(71) NOT NULL,
			contains_content tinyint(1) NOT NULL DEFAULT 0,
			receipt_json longtext NOT NULL,
			approved_at datetime NULL,
			created_at datetime NOT NULL,
			expires_at datetime NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY public_id (public_id),
			KEY job_public_id (job_public_id),
			KEY owner_user_id (owner_user_id)
		) {$charset};";

		dbDelta( $sql_jobs );
		dbDelta( $sql_receipts );
		update_option( self::DB_OPTION, OPACE_CONTENT_INTEGRITY_DB_VERSION, false );
		delete_option( self::LEGACY_OPTION );
		delete_option( self::CONFLICT_OPTION );
		return true;
	}

	public function is_read_only() {
		return '1' === get_option( self::LEGACY_OPTION, '' )
			|| '1' === get_option( self::CONFLICT_OPTION, '' )
			|| version_compare( (string) get_option( self::DB_OPTION, '0' ), OPACE_CONTENT_INTEGRITY_DB_VERSION, '>' );
	}

	private function canonical_tables_exist() {
		global $wpdb;
		foreach ( array( 'opace_ci_jobs', 'opace_ci_receipts' ) as $suffix ) {
			$table = $wpdb->prefix . $suffix;
			$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) );
			if ( $found === $table ) {
				return true;
			}
		}
		return false;
	}

	private function legacy_tables_exist() {
		global $wpdb;
		foreach ( array( 'oaci_sessions', 'oaci_candidates', 'oaci_receipts' ) as $suffix ) {
			$table = $wpdb->prefix . $suffix;
			$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) );
			if ( $found === $table ) {
				return true;
			}
		}
		return false;
	}
}
