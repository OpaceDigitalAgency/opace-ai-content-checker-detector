<?php

namespace Opace\ContentIntegrity\Core;

defined( 'ABSPATH' ) || exit;

final class Deactivator {
	public static function deactivate() {
		$timestamp = wp_next_scheduled( 'oaci_retention' );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, 'oaci_retention' );
		}
	}
}
