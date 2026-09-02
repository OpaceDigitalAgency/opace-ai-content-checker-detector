<?php

namespace Opace\ContentIntegrity\Rest;

use WP_Error;

defined( 'ABSPATH' ) || exit;

final class ServerRateLimiter {
	const HOUR_LIMIT   = 20;
	const MINUTE_LIMIT = 3;

	public function claim( $user_id, $now = null ) {
		$now     = null === $now ? time() : absint( $now );
		$key     = 'oaci_server_rate_' . absint( $user_id );
		$history = get_transient( $key );
		$history = is_array( $history ) ? array_values(
			array_filter(
				array_map( 'absint', $history ),
				static function ( $timestamp ) use ( $now ) {
					return $timestamp > $now - HOUR_IN_SECONDS;
				}
			)
		) : array();
		$minute  = array_filter(
			$history,
			static function ( $timestamp ) use ( $now ) {
				return $timestamp > $now - MINUTE_IN_SECONDS;
			}
		);

		if ( count( $minute ) >= self::MINUTE_LIMIT || count( $history ) >= self::HOUR_LIMIT ) {
			return new WP_Error(
				'server_rate_limited',
				__( 'Too many EU analysis requests were made from this account. Wait before trying again.', 'opace-ai-content-integrity' ),
				array(
					'status'      => 429,
					'retry_after' => count( $minute ) >= self::MINUTE_LIMIT ? MINUTE_IN_SECONDS : HOUR_IN_SECONDS,
				)
			);
		}

		$history[] = $now;
		set_transient( $key, $history, HOUR_IN_SECONDS );
		return true;
	}
}
