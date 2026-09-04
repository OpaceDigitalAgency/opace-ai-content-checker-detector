<?php

namespace Opace\ContentIntegrity\Core;

defined( 'ABSPATH' ) || exit;

final class Activator {
	public static function activate( $network_wide = false ) {
		if ( is_multisite() && $network_wide ) {
			deactivate_plugins( plugin_basename( OPACE_CONTENT_INTEGRITY_FILE ) );
			wp_die( esc_html__( 'Network activation is not supported in this candidate. Activate the AI Content Checker per site.', 'opace-ai-content-checker-detector' ) );
		}

		Settings::seed_defaults();
		( new Migrator() )->migrate();
		if ( ! wp_next_scheduled( 'oaci_retention' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'twicedaily', 'oaci_retention' );
		}
		set_transient( 'oaci_show_onboarding', '1', HOUR_IN_SECONDS );
	}
}
