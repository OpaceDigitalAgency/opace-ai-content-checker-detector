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
			// The wait is measured from the run that is about to age out of the
			// window, not from a flat minute or hour. Telling somebody to wait
			// an hour when they could go again in four minutes is the sort of
			// small dishonesty that makes people stop believing the messages.
			$hour_reached = count( $history ) >= self::HOUR_LIMIT;
			$window       = $hour_reached ? HOUR_IN_SECONDS : MINUTE_IN_SECONDS;
			$oldest       = $hour_reached ? min( $history ) : min( $minute );
			$retry_after  = max( 1, ( $oldest + $window ) - $now );
			return new WP_Error(
				'server_rate_limited',
				__( 'Too many EU analysis requests were made from this account. Wait before trying again.', 'opace-ai-content-checker-detector' ),
				array(
					'status'      => 429,
					'retry_after' => $retry_after,
				)
			);
		}

		$history[] = $now;
		set_transient( $key, $history, HOUR_IN_SECONDS );
		return true;
	}
}
