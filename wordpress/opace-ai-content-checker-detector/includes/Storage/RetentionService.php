<?php

namespace Opace\ContentIntegrity\Storage;

defined( 'ABSPATH' ) || exit;

// Bounded expiry cleanup operates on the accepted ADR 0007 jobs table.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching

final class RetentionService {
	public static function run() {
		global $wpdb;
		$jobs = $wpdb->prefix . 'opace_ci_jobs';
		$now  = current_time( 'mysql', true );
		$wpdb->query( $wpdb->prepare( 'DELETE FROM %i WHERE expires_at IS NOT NULL AND expires_at < %s LIMIT 100', $jobs, $now ) );
	}
}
