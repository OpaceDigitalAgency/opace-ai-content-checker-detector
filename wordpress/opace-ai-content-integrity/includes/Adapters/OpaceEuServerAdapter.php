<?php

namespace Opace\ContentIntegrity\Adapters;

use Opace\ContentIntegrity\Contracts\ServerAnalysisAdapter;
use Opace\ContentIntegrity\Contracts\ServerAnalysisChannel;
use Opace\ContentIntegrity\Contracts\WordPressServerScoreValidator;
use Opace\ContentIntegrity\Core\Settings;
use WP_Error;

defined( 'ABSPATH' ) || exit;

final class OpaceEuServerAdapter implements ServerAnalysisAdapter {
	const MAX_RESPONSE_BYTES = 1048576;
	const TIMEOUT_SECONDS    = 45;

	private $channel;
	private $validator;
	private $endpoint;

	public function __construct( ServerAnalysisChannel $channel, ?WordPressServerScoreValidator $validator = null, $endpoint = WordPressServerAnalysisChannel::SERVICE_BASE . '/v1/wordpress/check' ) {
		$this->channel   = $channel;
		$this->validator = $validator ? $validator : new WordPressServerScoreValidator();
		$this->endpoint  = $this->valid_endpoint( $endpoint );
	}

	public function status() {
		$settings   = Settings::get();
		$opted_in   = ! empty( $settings['server_analysis_opt_in'] );
		$configured = '' !== $this->endpoint;
		$ready      = $opted_in && $this->channel->available();

		return array(
			'admin_opt_in'        => $opted_in,
			'endpoint_configured' => $configured,
			'channel_ready'       => $ready,
			'available'           => $opted_in && $configured && $ready,
			'state'               => ! $opted_in ? 'off' : ( ! $configured ? 'endpoint_missing' : ( ! $ready ? 'channel_unavailable' : 'ready' ) ),
		);
	}

	public function analyse( $text, $request_id ) {
		$status = $this->status();
		if ( ! $status['available'] ) {
			return new WP_Error(
				'server_channel_unavailable',
				__( 'The Opace EU server route is not available in this build.', 'opace-ai-content-integrity' ),
				array( 'status' => 503 )
			);
		}

		$args = array(
			'timeout'             => self::TIMEOUT_SECONDS,
			'redirection'         => 0,
			'reject_unsafe_urls'  => true,
			'limit_response_size' => self::MAX_RESPONSE_BYTES,
			'headers'             => array(
				'Accept'          => 'application/json',
				'Content-Type'    => 'application/json',
				'Idempotency-Key' => $request_id,
			),
			'body'                => wp_json_encode( array( 'text' => $text ) ),
			'data_format'         => 'body',
		);

		$args = $this->channel->authorise( $args );
		if ( is_wp_error( $args ) ) {
			return $args;
		}

		$response = wp_safe_remote_post( $this->endpoint, $args );
		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'server_unreachable', __( 'The EU analysis service could not be reached.', 'opace-ai-content-integrity' ), array( 'status' => 502 ) );
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		if ( 429 === $status_code ) {
			return new WP_Error( 'server_rate_limited', __( 'The EU analysis service is busy. Wait before trying again.', 'opace-ai-content-integrity' ), array( 'status' => 429 ) );
		}
		if ( $status_code < 200 || $status_code >= 300 ) {
			return new WP_Error( 'server_unavailable', __( 'The EU analysis service did not accept this request.', 'opace-ai-content-integrity' ), array( 'status' => 502 ) );
		}

		$content_type = strtolower( (string) wp_remote_retrieve_header( $response, 'content-type' ) );
		if ( 0 !== strpos( $content_type, 'application/json' ) ) {
			return new WP_Error( 'invalid_server_response', __( 'The server returned a result this plugin cannot safely display.', 'opace-ai-content-integrity' ), array( 'status' => 502 ) );
		}

		$payload = json_decode( wp_remote_retrieve_body( $response ), true );
		$valid   = $this->validator->validate( $payload, $text );
		return is_wp_error( $valid ) ? $valid : $payload;
	}

	private function valid_endpoint( $value ) {
		$url = esc_url_raw( trim( (string) $value ), array( 'https' ) );
		if ( '' === $url || ! wp_http_validate_url( $url ) ) {
			return '';
		}

		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) || 'https' !== ( isset( $parts['scheme'] ) ? strtolower( $parts['scheme'] ) : '' ) || empty( $parts['host'] ) || isset( $parts['user'] ) || isset( $parts['pass'] ) || isset( $parts['query'] ) || isset( $parts['fragment'] ) ) {
			return '';
		}
		return untrailingslashit( $url );
	}
}
