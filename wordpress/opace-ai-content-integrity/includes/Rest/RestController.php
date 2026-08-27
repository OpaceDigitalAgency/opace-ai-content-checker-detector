<?php

namespace Opace\ContentIntegrity\Rest;

use Opace\ContentIntegrity\Analysis\DeterministicAnalyser;
use Opace\ContentIntegrity\Contracts\WordPressContractValidator;
use Opace\ContentIntegrity\Core\Capabilities;
use Opace\ContentIntegrity\Core\Migrator;
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

	public function __construct( DeterministicAnalyser $analyser, SessionService $sessions, ReceiptService $receipts, WordPressPostSource $source ) {
		$this->analyser  = $analyser;
		$this->sessions  = $sessions;
		$this->receipts  = $receipts;
		$this->source    = $source;
		$this->validator = new WordPressContractValidator();
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
			return new WP_Error( 'permission_denied', __( 'Refresh the page and try again.', 'opace-ai-content-integrity' ), array( 'status' => 403 ) );
		}
		return current_user_can( 'edit_posts' );
	}

	public function can_read() {
		return is_user_logged_in() && current_user_can( 'edit_posts' );
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
			return new WP_Error( 'invalid_idempotency_key', __( 'The idempotency key is invalid.', 'opace-ai-content-integrity' ), array( 'status' => 400 ) );
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
		return new WP_Error( 'consent_required', __( 'Lock persistence is unavailable until the retention policy is approved.', 'opace-ai-content-integrity' ), array( 'status' => 409 ) );
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

	public function health() {
		return array(
			'status'           => ( new Migrator() )->is_read_only() ? 'read_only' : 'ok',
			'plugin_version'   => OPACE_CONTENT_INTEGRITY_VERSION,
			'contract_version' => '1.0.0',
			'generation'       => 'not_configured',
			'anthropic'        => 'unsupported',
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
			return new WP_Error( 'object_not_found', __( 'The source was not found.', 'opace-ai-content-integrity' ), array( 'status' => 404 ) );
		}
		return true;
	}
}
