<?php

namespace Opace\ContentIntegrity\Adapters;

use Opace\ContentIntegrity\Contracts\ServerAnalysisChannel;
use Opace\ContentIntegrity\Core\Settings;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/** One-use, body-bound challenge/token channel for WordPress servers. */
final class WordPressServerAnalysisChannel implements ServerAnalysisChannel {
	const SERVICE_BASE       = 'https://opace-detector-877422072168.europe-west1.run.app';
	const TIMEOUT_SECONDS    = 15;
	const MAX_RESPONSE_BYTES = 16384;
	const MIN_POW_BITS       = 14;
	const MAX_POW_BITS       = 20;
	const STATUS_CACHE_KEY   = 'oaci_wordpress_channel_status';

	/**
	 * How long the probe waits for the service to answer.
	 *
	 * The service scales to zero, so the first request after an idle spell has
	 * to start a container first. Measured on 3 September 2026 from inside the
	 * test containers: 0.39 s warm, and 9.51 s and 14.03 s cold. A five-second
	 * wait therefore reported a healthy service as unavailable whenever it had
	 * been idle. Twenty seconds covers the cold starts we have measured, and it
	 * is affordable because nothing that renders a screen waits for it: the
	 * admin page draws from the remembered answer and the browser asks for a
	 * fresh one afterwards.
	 */
	const STATUS_PROBE_TIMEOUT_SECONDS = 20;

	/**
	 * How many times the probe asks before it gives up.
	 *
	 * Measured against the live service from inside the test container on
	 * 3 September 2026: three consecutive requests to a container that had
	 * scaled to zero failed after 20.6 s and 18.4 s and then answered in 21.0 s,
	 * and once warm the same request took 7.3 s, 4.7 s and 5.1 s. A cold
	 * container does not merely answer slowly, it drops the requests that arrive
	 * while it is starting, so a single attempt reports a service that is coming
	 * up as one that is not there. The second attempt is made only when the
	 * first failed to complete at all: a service that answered and said no is
	 * taken at its word and not asked again.
	 */
	const STATUS_PROBE_ATTEMPTS = 2;

	/**
	 * How long each answer is remembered. A yes is trusted for five minutes; a
	 * no for one, so a service that has just come back is picked up within the
	 * minute rather than being written off for five.
	 */
	const STATUS_READY_SECONDS   = 300;
	const STATUS_UNREADY_SECONDS = 60;

	private $service_base;

	public function __construct( $service_base = self::SERVICE_BASE ) {
		$this->service_base = untrailingslashit( (string) $service_base );
	}

	/**
	 * Whether the channel is open, according to the answer we already hold.
	 *
	 * This never asks the service. Screens call it while they are being drawn,
	 * and a screen that waits on a cold container for ten seconds is a worse
	 * outcome than a screen that says it is still checking. When nothing is
	 * remembered this returns false and status_known() returns false with it,
	 * so the caller can tell "no" apart from "not asked yet".
	 */
	public function available() {
		$cached = $this->remembered();
		return $cached ? $cached->ready() : false;
	}

	/**
	 * Whether any answer is remembered at all.
	 *
	 * @return bool
	 */
	public function status_known() {
		return null !== $this->remembered();
	}

	/**
	 * The allowance figures the service published, each null when it published
	 * none, and all null while no answer is remembered. Read from the same
	 * remembered probe as available(), so asking for them costs no request.
	 *
	 * @return array<string,int|null>
	 */
	public function limits() {
		$cached = $this->remembered();
		return $cached ? $cached->figures() : ServiceStatus::closed()->figures();
	}

	/**
	 * Asks the service, and remembers the answer.
	 *
	 * This is the one method that blocks, and only two things call it: the REST
	 * route the checker screen calls from the browser once the page is already
	 * on screen, and a run that is about to send a draft anyway. An answer we
	 * already hold is reused rather than asked for again, so a page load costs
	 * the service nothing for five minutes after a yes and one minute after a
	 * no.
	 *
	 * @return bool Whether the channel is open.
	 */
	public function probe() {
		if ( self::SERVICE_BASE !== $this->service_base && ! defined( 'OACI_TEST_SERVER_BASE' ) ) {
			return false;
		}
		$cached = $this->remembered();
		if ( $cached ) {
			return $cached->ready();
		}
		$status = ServiceStatus::closed();
		for ( $attempt = 0; $attempt < self::STATUS_PROBE_ATTEMPTS; ++$attempt ) {
			$response = wp_safe_remote_get(
				$this->service_base . '/v1/status',
				array(
					'timeout'             => self::STATUS_PROBE_TIMEOUT_SECONDS,
					'redirection'         => 0,
					'reject_unsafe_urls'  => true,
					'limit_response_size' => self::MAX_RESPONSE_BYTES,
					'headers'             => array( 'Accept' => 'application/json' ),
				)
			);
			if ( is_wp_error( $response ) ) {
				// The request did not complete. That is what a container still
				// starting looks like from here, so it is worth one more ask.
				continue;
			}
			if ( 200 === wp_remote_retrieve_response_code( $response )
				&& 0 === strpos( strtolower( (string) wp_remote_retrieve_header( $response, 'content-type' ) ), 'application/json' ) ) {
				$status = ServiceStatus::from_payload( json_decode( wp_remote_retrieve_body( $response ), true ) );
			}
			// The service answered. Whatever it said is the answer, and asking
			// it again would only be arguing with it.
			break;
		}
		set_transient( self::STATUS_CACHE_KEY, $status->to_array(), $status->ready() ? self::STATUS_READY_SECONDS : self::STATUS_UNREADY_SECONDS );
		return $status->ready();
	}

	/**
	 * The answer we hold, or null when we hold none.
	 *
	 * @return ServiceStatus|null
	 */
	private function remembered() {
		if ( self::SERVICE_BASE !== $this->service_base && ! defined( 'OACI_TEST_SERVER_BASE' ) ) {
			return ServiceStatus::closed();
		}
		return ServiceStatus::from_cache( get_transient( self::STATUS_CACHE_KEY ) );
	}

	public function authorise( array $request_args ) {
		// A run is already about to spend seconds sending a draft, so it is the
		// one caller that may wait for the service to answer.
		if ( ! $this->probe() ) {
			return $this->error( 'server_channel_unavailable', 'The fixed Opace EU service is unavailable in this build.', 503 );
		}
		$decoded    = json_decode( isset( $request_args['body'] ) ? $request_args['body'] : '', true );
		$text       = is_array( $decoded ) && isset( $decoded['text'] ) && is_string( $decoded['text'] ) ? $decoded['text'] : '';
		$request_id = isset( $request_args['headers']['Idempotency-Key'] ) ? (string) $request_args['headers']['Idempotency-Key'] : '';
		if ( '' === $text || ! preg_match( '/^req_[A-Za-z0-9_-]{16,64}$/', $request_id ) ) {
			return $this->error( 'invalid_server_request', 'The EU analysis request could not be prepared.', 400 );
		}

		$site_id    = 'sha256:' . hash( 'sha256', $this->site_origin() );
		$install_id = Settings::install_id();
		$body_hash  = 'sha256:' . hash( 'sha256', $text );
		$challenge  = $this->post_json(
			'/v1/wordpress/challenge',
			array(
				'site_id'     => $site_id,
				'install_id'  => $install_id,
				'request_id'  => $request_id,
				'body_sha256' => $body_hash,
			)
		);
		if ( is_wp_error( $challenge ) ) {
			return $challenge;
		}
		if ( 'wordpress-v1' !== ( isset( $challenge['channel'] ) ? $challenge['channel'] : '' )
			|| 'sha256(challenge + \':\' + nonce)' !== ( isset( $challenge['algorithm'] ) ? $challenge['algorithm'] : '' )
			|| 'nothing' !== ( isset( $challenge['retained'] ) ? $challenge['retained'] : '' )
			|| empty( $challenge['challenge'] ) || strlen( $challenge['challenge'] ) > 2048
			|| ! isset( $challenge['difficulty_bits'] ) || ! is_int( $challenge['difficulty_bits'] )
			|| $challenge['difficulty_bits'] < self::MIN_POW_BITS || $challenge['difficulty_bits'] > self::MAX_POW_BITS ) {
			return $this->error( 'invalid_server_response', 'The EU service returned an invalid challenge.', 502 );
		}

		$nonce = $this->solve( $challenge['challenge'], $challenge['difficulty_bits'] );
		if ( is_wp_error( $nonce ) ) {
			return $nonce;
		}
		$token = $this->post_json(
			'/v1/wordpress/token',
			array(
				'challenge' => $challenge['challenge'],
				'nonce'     => $nonce,
			)
		);
		if ( is_wp_error( $token ) ) {
			return $token;
		}
		if ( 'wordpress-v1' !== ( isset( $token['channel'] ) ? $token['channel'] : '' )
			|| 'x-opace-wordpress-token' !== ( isset( $token['header'] ) ? strtolower( $token['header'] ) : '' )
			|| 'nothing' !== ( isset( $token['retained'] ) ? $token['retained'] : '' )
			|| 1 !== ( isset( $token['max_checks'] ) ? $token['max_checks'] : 0 )
			|| empty( $token['token'] ) || strlen( $token['token'] ) > 2048 ) {
			return $this->error( 'invalid_server_response', 'The EU service returned an invalid one-use token.', 502 );
		}

		$request_args['headers']['X-Opace-WordPress-Token'] = $token['token'];

		$request_args['body'] = wp_json_encode(
			array(
				'text'            => $text,
				'full_word_count' => count( preg_split( '/\s+/u', trim( $text ), -1, PREG_SPLIT_NO_EMPTY ) ),
				'site_id'         => $site_id,
				'install_id'      => $install_id,
				'request_id'      => $request_id,
			)
		);
		return $request_args;
	}

	private function post_json( $path, array $body ) {
		$response = wp_safe_remote_post(
			$this->service_base . $path,
			array(
				'timeout'             => self::TIMEOUT_SECONDS,
				'redirection'         => 0,
				'reject_unsafe_urls'  => true,
				'limit_response_size' => self::MAX_RESPONSE_BYTES,
				'headers'             => array(
					'Accept'       => 'application/json',
					'Content-Type' => 'application/json',
				),
				'body'                => wp_json_encode( $body ),
				'data_format'         => 'body',
			)
		);
		if ( is_wp_error( $response ) ) {
			return ServiceRefusal::unreachable();
		}
		$status = wp_remote_retrieve_response_code( $response );
		$parsed = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( $status < 200 || $status >= 300 ) {
			// A refusal at the challenge or token step carries the same reasons
			// as one at the scoring step, so it is read the same way.
			return ServiceRefusal::from_response( $status, $parsed, wp_remote_retrieve_header( $response, 'retry-after' ) );
		}
		$content_type = strtolower( (string) wp_remote_retrieve_header( $response, 'content-type' ) );
		return 0 === strpos( $content_type, 'application/json' ) && is_array( $parsed ) ? $parsed : $this->error( 'invalid_server_response', 'The EU service returned an unreadable response.', 502 );
	}

	private function solve( $challenge, $bits ) {
		$deadline = microtime( true ) + 8;
		$limit    = 1 << min( self::MAX_POW_BITS + 2, 23 );
		for ( $candidate = 0; $candidate < $limit; ++$candidate ) {
			if ( microtime( true ) >= $deadline ) {
				break;
			}
			$digest = hash( 'sha256', $challenge . ':' . $candidate, true );
			if ( $this->leading_zero_bits( $digest ) >= $bits ) {
				return (string) $candidate;
			}
		}
		return $this->error( 'challenge_timeout', 'The EU service proof of work could not be completed in time.', 503 );
	}

	private function leading_zero_bits( $digest ) {
		$bits   = 0;
		$length = strlen( $digest );
		for ( $index = 0; $index < $length; ++$index ) {
			$byte = ord( $digest[ $index ] );
			if ( 0 === $byte ) {
				$bits += 8;
				continue;
			}
			for ( $mask = 128; $mask > 0 && 0 === ( $byte & $mask ); $mask >>= 1 ) {
				++$bits;
			}
			break;
		}
		return $bits;
	}

	private function site_origin() {
		$parts = wp_parse_url( home_url( '/' ) );
		$port  = isset( $parts['port'] ) ? ':' . absint( $parts['port'] ) : '';
		return strtolower( $parts['scheme'] . '://' . $parts['host'] ) . $port;
	}

	private function error( $code, $message, $status ) {
		return new WP_Error( $code, $message, array( 'status' => $status ) );
	}
}
