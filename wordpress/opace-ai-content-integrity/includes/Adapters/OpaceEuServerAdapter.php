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

	/**
	 * What the site knows about the route right now, without asking the service.
	 *
	 * Every screen calls this while it is being drawn, so it must not wait on
	 * the network. When nothing has asked the service yet the answer is
	 * "checking" rather than "unavailable", and the checker screen says so.
	 *
	 * @return array
	 */
	public function status() {
		return $this->describe( false );
	}

	/**
	 * The same description, having asked the service first when nothing was
	 * remembered. Only the REST route the browser calls after the page is on
	 * screen uses this, and it is still bounded by the admin opt-in below.
	 *
	 * @return array
	 */
	public function probed_status() {
		return $this->describe( true );
	}

	/**
	 * Describes the route, optionally asking the service first.
	 *
	 * @param bool $probe Whether to ask the service when no answer is held.
	 * @return array
	 */
	private function describe( $probe ) {
		$settings   = Settings::get();
		$opted_in   = ! empty( $settings['server_analysis_opt_in'] );
		$configured = '' !== $this->endpoint;
		// A site that has not opted in asks the service nothing at all, so
		// neither opening an admin screen nor calling the status route can
		// produce an outbound request.
		if ( $opted_in && $probe ) {
			$this->channel->probe();
		}
		$ready     = $opted_in && $this->channel->available();
		$known     = ! $opted_in || $this->channel->status_known();
		$available = $opted_in && $configured && $ready;
		$checking  = $opted_in && $configured && ! $known;

		return array(
			'admin_opt_in'        => $opted_in,
			'endpoint_configured' => $configured,
			'channel_ready'       => $ready,
			'available'           => $available,
			// True while the route is on but nobody has asked the service yet.
			// The screen shows the EU card as being checked rather than as
			// unavailable, because those are different things and a cold
			// service should not be reported as a closed one.
			'checking'            => $checking,
			// The route the checker screen should offer first. Private EU
			// analysis leads whenever an administrator has enabled it and the
			// service says the WordPress channel is open; otherwise the
			// unlimited on-device route leads, including while we are still
			// checking. Nothing here changes what the editor may pick, only
			// which card is chosen when the page loads.
			'recommended'         => $available ? 'server' : 'on_device',
			'limits'              => $opted_in ? $this->channel->limits() : array_fill_keys( ServiceStatus::figure_names(), null ),
			'state'               => ! $opted_in ? 'off' : ( ! $configured ? 'endpoint_missing' : ( $checking ? 'checking' : ( ! $ready ? 'channel_unavailable' : 'ready' ) ) ),
		);
	}

	public function analyse( $text, $request_id ) {
		// A run may wait for the service: it is about to send a draft anyway,
		// and refusing because nobody had asked yet would be a false refusal.
		$status = $this->probed_status();
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
			return ServiceRefusal::unreachable();
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		if ( $status_code < 200 || $status_code >= 300 ) {
			// Which allowance ran out, and when it comes back, both come from
			// the service's own answer rather than from the status code alone.
			return ServiceRefusal::from_response(
				$status_code,
				json_decode( wp_remote_retrieve_body( $response ), true ),
				wp_remote_retrieve_header( $response, 'retry-after' )
			);
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
