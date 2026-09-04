<?php

namespace Opace\ContentIntegrity\Rest;

use Opace\ContentIntegrity\Analysis\DeterministicAnalyser;
use Opace\ContentIntegrity\Analysis\TextOffsets;
use Opace\ContentIntegrity\Contracts\WordPressContractValidator;
use Opace\ContentIntegrity\Contracts\ServerAnalysisAdapter;
use Opace\ContentIntegrity\Core\Settings;
use Opace\ContentIntegrity\Core\Capabilities;
use Opace\ContentIntegrity\Core\Migrator;
use Opace\ContentIntegrity\Integration\ReadablePostText;
use Opace\ContentIntegrity\Integration\WordPressPostSource;
use Opace\ContentIntegrity\Receipts\ReceiptService;
use Opace\ContentIntegrity\Rewrite\SessionService;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

final class RestController {
	const NS = 'oaci/v1';
	private $analyser;
	private $sessions;
	private $receipts;
	private $source;
	private $validator;
	private $server_analysis;
	private $server_rate_limiter;

	public function __construct( DeterministicAnalyser $analyser, SessionService $sessions, ReceiptService $receipts, WordPressPostSource $source, ServerAnalysisAdapter $server_analysis, ServerRateLimiter $server_rate_limiter ) {
		$this->analyser            = $analyser;
		$this->sessions            = $sessions;
		$this->receipts            = $receipts;
		$this->source              = $source;
		$this->validator           = new WordPressContractValidator();
		$this->server_analysis     = $server_analysis;
		$this->server_rate_limiter = $server_rate_limiter;
	}

	public function register() {
		add_action( 'rest_api_init', array( $this, 'routes' ) );
	}

	public function routes() {
		$mutation  = array( $this, 'can_mutate' );
		$owned     = array( $this, 'can_read' );
		$id        = '(?P<uuid>[A-Za-z0-9_-]{8,40})';
		$candidate = '(?P<candidate>[A-Za-z0-9_-]{1,40})';

		register_rest_route(
			self::NS,
			'/analysis',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'analysis' ),
				'permission_callback' => $mutation,
			)
		);
		register_rest_route(
			self::NS,
			'/posts/(?P<id>[0-9]+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'post_content' ),
				'permission_callback' => array( $this, 'can_read_post' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
		register_rest_route(
			self::NS,
			'/analysis/server',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'server_analysis' ),
				'permission_callback' => $mutation,
			)
		);
		register_rest_route(
			self::NS,
			'/analysis/server/status',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'server_status' ),
				'permission_callback' => $mutation,
			)
		);
		register_rest_route(
			self::NS,
			'/sessions',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_session' ),
				'permission_callback' => $mutation,
			)
		);
		register_rest_route(
			self::NS,
			'/sessions/' . $id,
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_session' ),
					'permission_callback' => $owned,
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( $this, 'delete_session' ),
					'permission_callback' => $mutation,
				),
			)
		);
		register_rest_route(
			self::NS,
			'/sessions/' . $id . '/locks',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'locks' ),
				'permission_callback' => $mutation,
			)
		);
		register_rest_route(
			self::NS,
			'/sessions/' . $id . '/candidates',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'candidate_unavailable' ),
				'permission_callback' => $mutation,
			)
		);
		register_rest_route(
			self::NS,
			'/sessions/' . $id . '/candidates/' . $candidate,
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'candidate_unavailable' ),
					'permission_callback' => $owned,
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( $this, 'candidate_unavailable' ),
					'permission_callback' => $mutation,
				),
			)
		);
		register_rest_route(
			self::NS,
			'/sessions/' . $id . '/approve',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'approval_unavailable' ),
				'permission_callback' => $mutation,
			)
		);
		register_rest_route(
			self::NS,
			'/sessions/' . $id . '/applied',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'approval_unavailable' ),
				'permission_callback' => $mutation,
			)
		);
		register_rest_route(
			self::NS,
			'/sessions/' . $id . '/receipt',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'receipt' ),
				'permission_callback' => $owned,
			)
		);
		register_rest_route(
			self::NS,
			'/receipts/checker',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'checker_receipt' ),
				'permission_callback' => $mutation,
			)
		);
		register_rest_route(
			self::NS,
			'/receipts',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'receipts' ),
				'permission_callback' => $owned,
			)
		);
		register_rest_route(
			self::NS,
			'/health',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'health' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);
	}

	public function can_mutate( WP_REST_Request $request ) {
		if ( ! is_user_logged_in() || ! wp_verify_nonce( $request->get_header( 'X-WP-Nonce' ), 'wp_rest' ) ) {
			return new WP_Error( 'permission_denied', __( 'Refresh the page and try again.', 'opace-ai-content-checker-detector' ), array( 'status' => 403 ) );
		}
		return current_user_can( 'edit_posts' );
	}

	public function can_read() {
		return is_user_logged_in() && current_user_can( 'edit_posts' );
	}

	/**
	 * The checker screen loads a post's own text through this route rather than
	 * carrying it in a link. The editor's per-post capability is checked, not
	 * just the general one, so a contributor cannot read somebody else's draft.
	 *
	 * @param WP_REST_Request $request The incoming request.
	 * @return bool|WP_Error
	 */
	public function can_read_post( WP_REST_Request $request ) {
		if ( ! is_user_logged_in() || ! wp_verify_nonce( $request->get_header( 'X-WP-Nonce' ), 'wp_rest' ) ) {
			return new WP_Error( 'permission_denied', __( 'Refresh the page and try again.', 'opace-ai-content-checker-detector' ), array( 'status' => 403 ) );
		}
		$post_id = absint( $request['id'] );
		return $post_id > 0 && current_user_can( 'edit_post', $post_id );
	}

	public function post_content( WP_REST_Request $request ) {
		$post_id = absint( $request['id'] );
		$post    = get_post( $post_id );
		if ( ! $post || 'trash' === $post->post_status ) {
			return new WP_Error( 'object_not_found', __( 'That post could not be opened.', 'opace-ai-content-checker-detector' ), array( 'status' => 404 ) );
		}
		// The editor stores block delimiters and HTML. The checker reads writing,
		// so the route hands back the prose and never the markup around it.
		$title   = (string) get_the_title( $post_id );
		$content = ReadablePostText::from_post( $title, $post->post_content );
		$limit   = (int) Settings::get()['max_chars'];
		if ( strlen( $content ) > $limit ) {
			return new WP_Error(
				'post_too_long',
				sprintf(
					/* translators: %s: the character limit set for this site. */
					__( 'That post is longer than this site’s limit of %s characters, so it was not loaded. Nothing was shortened.', 'opace-ai-content-checker-detector' ),
					number_format_i18n( $limit )
				),
				array( 'status' => 413 )
			);
		}
		return rest_ensure_response(
			array(
				'id'           => $post_id,
				'title'        => $title,
				'type'         => $post->post_type,
				'content'      => $content,
				'content_type' => 'plain_text',
			)
		);
	}

	public function can_manage() {
		return is_user_logged_in() && Capabilities::can_manage();
	}

	public function analysis( WP_REST_Request $request ) {
		$data  = $request->get_json_params();
		$valid = $this->validator->validate( $data, 'analysis-request.schema.json' );
		if ( is_wp_error( $valid ) ) {
			return $valid;
		}
		$source_access = $this->assert_source_access( $data );
		if ( is_wp_error( $source_access ) ) {
			return $source_access;
		}
		return $this->analyser->analyse( $data );
	}

	/**
	 * Asks the EU service whether it is accepting runs, and answers the checker
	 * screen with what it said.
	 *
	 * The screen is already drawn by the time this is called, which is the whole
	 * point: the service scales to zero and a cold start takes longer than any
	 * page render should. Nothing here carries a draft, and a site that has not
	 * turned the route on makes no outbound request, because the adapter checks
	 * the opt-in before it probes.
	 *
	 * @return WP_REST_Response
	 */
	public function server_status() {
		$status = $this->server_analysis->probed_status();
		return rest_ensure_response(
			array(
				'available'   => ! empty( $status['available'] ),
				'checking'    => ! empty( $status['checking'] ),
				'state'       => isset( $status['state'] ) ? (string) $status['state'] : 'off',
				'recommended' => isset( $status['recommended'] ) ? (string) $status['recommended'] : 'on_device',
				'limits'      => array(
					'sitePerHour' => isset( $status['limits']['site_per_hour'] ) ? $status['limits']['site_per_hour'] : null,
					'sitePerDay'  => isset( $status['limits']['site_per_day'] ) ? $status['limits']['site_per_day'] : null,
				),
			)
		);
	}

	public function server_analysis( WP_REST_Request $request ) {
		$data = $request->get_json_params();
		if ( ! is_array( $data ) || true !== ( isset( $data['consent'] ) ? $data['consent'] : false ) || 'opace_eu_server' !== ( isset( $data['route'] ) ? $data['route'] : '' ) ) {
			return new WP_Error( 'server_consent_required', __( 'Choose the EU server route and confirm this one-off transmission before running it.', 'opace-ai-content-checker-detector' ), array( 'status' => 409 ) );
		}

		$status = $this->server_analysis->status();
		if ( empty( $status['available'] ) ) {
			return new WP_Error( 'server_channel_unavailable', __( 'The Opace EU server route is not available in this build.', 'opace-ai-content-checker-detector' ), array( 'status' => 503 ) );
		}

		$text       = isset( $data['text'] ) && is_string( $data['text'] ) ? $data['text'] : '';
		$request_id = trim( (string) $request->get_header( 'Idempotency-Key' ) );
		if ( '' === trim( $text ) ) {
			return new WP_Error( 'empty_source', __( 'Add text before running EU server analysis.', 'opace-ai-content-checker-detector' ), array( 'status' => 400 ) );
		}
		if ( 1 !== preg_match( '//u', $text ) ) {
			return new WP_Error( 'invalid_source_encoding', __( 'The text is not valid UTF-8.', 'opace-ai-content-checker-detector' ), array( 'status' => 400 ) );
		}

		$max_chars  = min( 100000, absint( Settings::get()['max_chars'] ) );
		$characters = TextOffsets::utf16_length( $text );
		if ( $characters > $max_chars ) {
			return new WP_Error( 'request_too_large', __( 'The text exceeds this site’s EU analysis limit.', 'opace-ai-content-checker-detector' ), array( 'status' => 413 ) );
		}

		$words = preg_split( '/\s+/u', trim( $text ), -1, PREG_SPLIT_NO_EMPTY );
		if ( ! is_array( $words ) || count( $words ) < 60 ) {
			return new WP_Error( 'server_text_too_short', __( 'EU model analysis needs at least 60 words.', 'opace-ai-content-checker-detector' ), array( 'status' => 422 ) );
		}
		if ( count( $words ) > 8000 ) {
			return new WP_Error( 'server_text_too_long', __( 'EU model analysis accepts at most 8,000 words and does not truncate.', 'opace-ai-content-checker-detector' ), array( 'status' => 413 ) );
		}
		if ( ! preg_match( '/^req_[A-Za-z0-9_-]{16,64}$/', $request_id ) ) {
			return new WP_Error( 'invalid_idempotency_key', __( 'The request identity is invalid.', 'opace-ai-content-checker-detector' ), array( 'status' => 400 ) );
		}

		$allowed = $this->server_rate_limiter->claim( get_current_user_id() );
		return is_wp_error( $allowed ) ? $allowed : $this->server_analysis->analyse( $text, $request_id );
	}

	public function create_session( WP_REST_Request $request ) {
		$data  = $request->get_json_params();
		$valid = $this->validator->validate( $data, 'analysis-request.schema.json' );
		if ( is_wp_error( $valid ) ) {
			return $valid;
		}
		$source_access = $this->assert_source_access( $data );
		if ( is_wp_error( $source_access ) ) {
			return $source_access;
		}
		$idempotency_key = trim( (string) $request->get_header( 'Idempotency-Key' ) );
		if ( '' !== $idempotency_key && ( strlen( $idempotency_key ) < 8 || strlen( $idempotency_key ) > 128 || ! preg_match( '/^[A-Za-z0-9._:-]+$/', $idempotency_key ) ) ) {
			return new WP_Error( 'invalid_idempotency_key', __( 'The idempotency key is invalid.', 'opace-ai-content-checker-detector' ), array( 'status' => 400 ) );
		}
		return $this->sessions->create( $data, get_current_user_id(), $idempotency_key );
	}

	public function get_session( WP_REST_Request $request ) {
		return $this->sessions->get( $request['uuid'], get_current_user_id() );
	}

	public function delete_session( WP_REST_Request $request ) {
		$owned = $this->assert_owned( $request['uuid'] );
		if ( is_wp_error( $owned ) ) {
			return $owned;
		}
		return array( 'deleted' => $this->sessions->delete( $request['uuid'], get_current_user_id() ) );
	}

	public function locks( WP_REST_Request $request ) {
		$owned = $this->assert_owned( $request['uuid'] );
		if ( is_wp_error( $owned ) ) {
			return $owned;
		}
		return new WP_Error( 'consent_required', __( 'Lock persistence is unavailable until the retention policy is approved.', 'opace-ai-content-checker-detector' ), array( 'status' => 409 ) );
	}

	public function candidate_unavailable( WP_REST_Request $request ) {
		$owned = $this->assert_owned( $request['uuid'] );
		return is_wp_error( $owned ) ? $owned : $this->sessions->unavailable_candidate();
	}

	public function approval_unavailable( WP_REST_Request $request ) {
		$owned = $this->assert_owned( $request['uuid'] );
		return is_wp_error( $owned ) ? $owned : $this->sessions->unavailable_approval();
	}

	public function receipt( WP_REST_Request $request ) {
		$owned = $this->assert_owned( $request['uuid'] );
		return is_wp_error( $owned ) ? $owned : $this->receipts->get( $request['uuid'], get_current_user_id() );
	}

	public function receipts( WP_REST_Request $request ) {
		return $this->receipts->list_receipts( get_current_user_id(), $request->get_param( 'page' ), $request->get_param( 'per_page' ), current_user_can( 'manage_options' ) && (bool) $request->get_param( 'all' ) );
	}

	public function checker_receipt( WP_REST_Request $request ) {
		$data   = $request->get_json_params();
		$result = is_array( $data ) && isset( $data['result'] ) && is_array( $data['result'] ) ? $data['result'] : array();
		if ( empty( $result ) || strlen( wp_json_encode( $result ) ) > 524288 ) {
			return new WP_Error( 'invalid_checker_receipt', __( 'The content-free checker receipt is invalid or too large.', 'opace-ai-content-checker-detector' ), array( 'status' => 400 ) );
		}
		$receipt = $this->receipts->create_checker_result( $result, get_current_user_id() );
		return is_wp_error( $receipt ) ? $receipt : array( 'receipt' => $receipt );
	}

	public function health() {
		return array(
			'status'           => ( new Migrator() )->is_read_only() ? 'read_only' : 'ok',
			'plugin_version'   => OPACE_CONTENT_INTEGRITY_VERSION,
			'contract_version' => '1.0.0',
			'generation'       => 'not_configured',
			'anthropic'        => 'unsupported',
			'server_analysis'  => $this->server_analysis->status()['state'],
		);
	}

	private function assert_owned( $uuid ) {
		return $this->sessions->get( sanitize_text_field( $uuid ), get_current_user_id() );
	}

	private function assert_source_access( array $data ) {
		$source_ref = isset( $data['context']['caller_object_id'] ) ? (string) $data['context']['caller_object_id'] : '';
		if ( 0 !== strpos( $source_ref, 'post:' ) ) {
			return true;
		}
		if ( ! $this->source->can_read( $source_ref, get_current_user_id() ) ) {
			return new WP_Error( 'object_not_found', __( 'The source was not found.', 'opace-ai-content-checker-detector' ), array( 'status' => 404 ) );
		}
		return true;
	}
}
