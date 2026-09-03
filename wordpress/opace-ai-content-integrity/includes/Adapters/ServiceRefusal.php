<?php

namespace Opace\ContentIntegrity\Adapters;

use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Turns a refusal from the EU service into one of this plugin's own reasons.
 *
 * There is one mapping table and it lives here, so the checker screen, the REST
 * route and the tests cannot disagree about what a refusal means. The reason
 * codes are the plugin's, not the service's: the service names its own scopes
 * and windows, and a client that echoed them would break the moment a scope was
 * renamed. Anything unrecognised becomes a single honest "the service refused
 * this run" rather than an invented explanation.
 *
 * Nothing here writes a sentence for a reader. The wording lives in
 * assets/js/lab-limits.mjs, in one place, so a notice cannot be phrased two ways
 * on two screens.
 */
final class ServiceRefusal {
	/**
	 * Reads one refusal.
	 *
	 * @param int   $status_code   The HTTP status the service returned.
	 * @param mixed $payload       The decoded JSON body, or anything at all.
	 * @param mixed $retry_header  The Retry-After response header, if any.
	 * @return WP_Error
	 */
	public static function from_response( $status_code, $payload, $retry_header = '' ) {
		$body = is_array( $payload ) ? $payload : array();
		// The deployed service names the specific allowance in `reason` and keeps
		// `error` for the general class, so `reason` is read first and `error`
		// is the fallback for the older shape.
		$error = isset( $body['reason'] ) && is_string( $body['reason'] ) ? sanitize_key( $body['reason'] ) : '';
		if ( '' === $error ) {
			$error = isset( $body['error'] ) && is_string( $body['error'] ) ? sanitize_key( $body['error'] ) : '';
		}
		$scope       = isset( $body['scope'] ) && is_string( $body['scope'] ) ? sanitize_key( $body['scope'] ) : '';
		$window      = isset( $body['window'] ) && is_string( $body['window'] ) ? sanitize_key( $body['window'] ) : '';
		$retry_after = self::seconds( isset( $body['retry_after'] ) ? $body['retry_after'] : null );
		if ( null === $retry_after ) {
			$retry_after = self::seconds( $retry_header );
		}
		if ( null === $retry_after ) {
			$retry_after = self::seconds( isset( $body['resets_in_seconds'] ) ? $body['resets_in_seconds'] : null );
		}

		$code = self::code_for( $status_code, $error, $scope, $window );
		$data = array( 'status' => 429 === (int) $status_code ? 429 : 503 );
		if ( null !== $retry_after ) {
			$data['retry_after'] = $retry_after;
		}
		return new WP_Error( $code, self::message_for( $code ), $data );
	}

	/**
	 * A transport failure: the service was never reached, so nothing about
	 * allowances can be said.
	 *
	 * @return WP_Error
	 */
	public static function unreachable() {
		return new WP_Error( 'server_unreachable', self::message_for( 'server_unreachable' ), array( 'status' => 502 ) );
	}

	/** Every reason this plugin can report, so the notices can be tested. */
	public static function reasons() {
		return array(
			'server_rate_limited',
			'service_pacing',
			'site_hourly_limit',
			'site_daily_limit',
			'channel_floor_exhausted',
			'shared_pool_exhausted',
			'server_route_disabled',
			'server_unreachable',
			'server_refused',
		);
	}

	private static function code_for( $status_code, $error, $scope, $window ) {
		if ( 'wordpress_channel_disabled' === $error || 'channel_disabled' === $error || ( 503 === (int) $status_code && '' === $error ) ) {
			return 'server_route_disabled';
		}
		if ( 'channel_floor_exhausted' === $error ) {
			return 'channel_floor_exhausted';
		}
		if ( 'shared_pool_exhausted' === $error || 'daily_allowance_exhausted' === $error ) {
			return 'shared_pool_exhausted';
		}
		// The allowance is released across the day rather than handed out at
		// midnight, so a run can be paced for seconds with nothing exhausted.
		if ( 'paced_allowance' === $error ) {
			return 'service_pacing';
		}
		if ( 'site_allowance_exhausted' === $error ) {
			return 'day' === $window ? 'site_daily_limit' : 'site_hourly_limit';
		}
		if ( 'rate_limited' === $error || 429 === (int) $status_code ) {
			if ( 'per_site' === $scope || 'per_install' === $scope ) {
				return 'day' === $window ? 'site_daily_limit' : 'site_hourly_limit';
			}
			return 'server_rate_limited';
		}
		return 'server_refused';
	}

	/**
	 * A short administrator-facing sentence. Editors never see these: the
	 * checker screen replaces every one of them with the friendly notice keyed
	 * on the same code.
	 *
	 * @param string $code One of reasons().
	 * @return string
	 */
	private static function message_for( $code ) {
		$messages = array(
			'server_rate_limited'     => __( 'The EU analysis service is busy. Wait before trying again.', 'opace-ai-content-integrity' ),
			'service_pacing'          => __( 'The EU analysis service is spacing out requests just now.', 'opace-ai-content-integrity' ),
			'site_hourly_limit'       => __( 'This site has used its hourly share of the EU analysis service.', 'opace-ai-content-integrity' ),
			'site_daily_limit'        => __( 'This site has used its daily share of the EU analysis service.', 'opace-ai-content-integrity' ),
			'channel_floor_exhausted' => __( 'The share of the EU service reserved for WordPress sites is spent for now.', 'opace-ai-content-integrity' ),
			'shared_pool_exhausted'   => __( 'The shared EU allowance is spent for now.', 'opace-ai-content-integrity' ),
			'server_route_disabled'   => __( 'The EU analysis service is not accepting WordPress runs at the moment.', 'opace-ai-content-integrity' ),
			'server_unreachable'      => __( 'The EU analysis service could not be reached.', 'opace-ai-content-integrity' ),
			'server_refused'          => __( 'The EU analysis service did not accept this request.', 'opace-ai-content-integrity' ),
		);
		return isset( $messages[ $code ] ) ? $messages[ $code ] : $messages['server_refused'];
	}

	/**
	 * A wait in whole seconds, or null. A value that is not a plain positive
	 * number is dropped rather than guessed at, because a wrong "try again in"
	 * is worse than none.
	 *
	 * @param mixed $value Whatever the service or the header carried.
	 * @return int|null
	 */
	private static function seconds( $value ) {
		if ( is_bool( $value ) || null === $value || '' === $value ) {
			return null;
		}
		if ( is_string( $value ) && ! preg_match( '/^\d+$/', trim( $value ) ) ) {
			return null;
		}
		if ( ! is_numeric( $value ) ) {
			return null;
		}
		$seconds = (int) floor( (float) $value );
		// A day is the longest wait worth stating; beyond that the figure is
		// almost certainly a timestamp rather than a duration.
		return $seconds > 0 && $seconds <= DAY_IN_SECONDS ? $seconds : null;
	}
}
