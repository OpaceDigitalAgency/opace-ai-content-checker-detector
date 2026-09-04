<?php
/**
 * Remove opted-in, positively identified plugin data.
 *
 * @package OpaceAIContentCheckerDetector
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// Opted-in uninstall removes only version-identified ADR 0007 tables.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.SchemaChange

wp_clear_scheduled_hook( 'oaci_retention' );
delete_transient( 'oaci_show_onboarding' );

$oaci_settings = get_option( 'oaci_settings', array() );
if ( empty( $oaci_settings['delete_data_uninstall'] ) || '1.0.1' !== get_option( 'oaci_db_version', '' ) ) {
	return;
}

global $wpdb;
$oaci_tables = array( $wpdb->prefix . 'opace_ci_jobs', $wpdb->prefix . 'opace_ci_receipts' );
foreach ( $oaci_tables as $oaci_table ) {
	$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $oaci_table ) );
}

delete_option( 'oaci_settings' );
delete_option( 'oaci_db_version' );
delete_option( 'oaci_legacy_storage_detected' );
delete_option( 'oaci_storage_conflict_detected' );
delete_option( 'oaci_contract_version' );
delete_option( 'oaci_install_version' );
delete_option( 'oaci_install_id' );
delete_option( 'oaci_local_service_secret' );
delete_transient( 'oaci_wordpress_channel_status' );
delete_metadata( 'user', 0, 'oaci_onboarding_dismissed', '', true );
