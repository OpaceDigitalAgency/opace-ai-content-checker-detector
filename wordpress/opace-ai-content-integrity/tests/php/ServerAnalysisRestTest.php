<?php

use Opace\ContentIntegrity\Analysis\DeterministicAnalyser;
use Opace\ContentIntegrity\Contracts\ServerAnalysisAdapter;
use Opace\ContentIntegrity\Integration\WordPressPostSource;
use Opace\ContentIntegrity\Receipts\ReceiptService;
use Opace\ContentIntegrity\Rest\RestController;
use Opace\ContentIntegrity\Rest\ServerRateLimiter;
use Opace\ContentIntegrity\Rewrite\SessionService;
use Opace\ContentIntegrity\Storage\JobRepository;
use Opace\ContentIntegrity\Storage\ReceiptRepository;
use PHPUnit\Framework\TestCase;

final class ServerAnalysisRestTest extends TestCase {
	protected function setUp(): void {
		$GLOBALS['oaci_test_options']      = array();
		$GLOBALS['oaci_test_transients']   = array();
		$GLOBALS['oaci_test_logged_in']    = false;
		$GLOBALS['oaci_test_capabilities'] = array();
	}

	public function test_permission_requires_login_rest_nonce_and_editor_capability() {
		$controller = $this->controller( $this->adapter( false ) );
		$request    = new WP_REST_Request( array(), array( 'X-WP-Nonce' => 'valid-rest-nonce' ) );
		$this->assertSame( 'permission_denied', $controller->can_mutate( $request )->get_error_code() );

		$GLOBALS['oaci_test_logged_in'] = true;
		$request                        = new WP_REST_Request( array(), array( 'X-WP-Nonce' => 'wrong' ) );
		$this->assertSame( 'permission_denied', $controller->can_mutate( $request )->get_error_code() );

		$request = new WP_REST_Request( array(), array( 'X-WP-Nonce' => 'valid-rest-nonce' ) );
		$this->assertFalse( $controller->can_mutate( $request ) );
		$GLOBALS['oaci_test_capabilities']['edit_posts'] = true;
		$this->assertTrue( $controller->can_mutate( $request ) );
	}

	public function test_missing_consent_and_unavailable_channel_never_reach_adapter() {
		$adapter    = $this->adapter( false );
		$controller = $this->controller( $adapter );
		$request    = new WP_REST_Request(
			array(
				'consent' => false,
				'route'   => 'opace_eu_server',
				'text'    => $this->valid_text(),
			),
			array( 'Idempotency-Key' => 'req_0000000000000001' )
		);
		$this->assertSame( 'server_consent_required', $controller->server_analysis( $request )->get_error_code() );
		$this->assertSame( 0, $adapter->calls );

		$request = new WP_REST_Request(
			array(
				'consent' => true,
				'route'   => 'opace_eu_server',
				'text'    => $this->valid_text(),
			),
			array( 'Idempotency-Key' => 'req_0000000000000001' )
		);
		$this->assertSame( 'server_channel_unavailable', $controller->server_analysis( $request )->get_error_code() );
		$this->assertSame( 0, $adapter->calls );
	}

	public function test_ready_route_validates_size_and_request_identity_before_one_adapter_call() {
		$adapter    = $this->adapter( true );
		$controller = $this->controller( $adapter );
		$params     = array(
			'consent' => true,
			'route'   => 'opace_eu_server',
			'text'    => 'Too short.',
		);
		$request    = new WP_REST_Request( $params, array( 'Idempotency-Key' => 'req_0000000000000001' ) );
		$this->assertSame( 'server_text_too_short', $controller->server_analysis( $request )->get_error_code() );
		$this->assertSame( 0, $adapter->calls );

		$params['text'] = $this->valid_text();
		$request        = new WP_REST_Request( $params, array( 'Idempotency-Key' => 'bad key' ) );
		$this->assertSame( 'invalid_idempotency_key', $controller->server_analysis( $request )->get_error_code() );
		$this->assertSame( 0, $adapter->calls );

		$request = new WP_REST_Request( $params, array( 'Idempotency-Key' => 'req_0000000000000001' ) );
		$this->assertSame( array( 'accepted' => true ), $controller->server_analysis( $request ) );
		$this->assertSame( 1, $adapter->calls );
		$this->assertSame( $params['text'], $adapter->last_text );
		$this->assertSame( 'req_0000000000000001', $adapter->last_request_id );
	}

	public function test_server_limit_counts_astral_characters_as_utf16_units() {
		$adapter    = $this->adapter( true );
		$controller = $this->controller( $adapter );
		$text       = str_repeat( '🙂', 50001 ) . ' ' . implode( ' ', array_fill( 0, 60, 'word' ) );
		$request    = new WP_REST_Request(
			array( 'consent' => true, 'route' => 'opace_eu_server', 'text' => $text ),
			array( 'Idempotency-Key' => 'req_0000000000000001' )
		);
		$this->assertSame( 'request_too_large', $controller->server_analysis( $request )->get_error_code() );
		$this->assertSame( 0, $adapter->calls );
	}

	public function test_the_status_route_asks_the_service_and_answers_without_carrying_a_draft() {
		$adapter    = $this->adapter( true );
		$controller = $this->controller( $adapter );
		$answer     = $controller->server_status();

		// The checker screen calls this once it is already on screen, which is
		// the whole point: nothing waited for a cold service to wake up.
		$this->assertSame( 1, $adapter->probes );
		$this->assertTrue( $answer['available'] );
		$this->assertFalse( $answer['checking'] );
		$this->assertSame( 'ready', $answer['state'] );
		$this->assertSame( 'server', $answer['recommended'] );
		$this->assertArrayHasKey( 'sitePerHour', $answer['limits'] );
		// Whatever the answer is, it is a statement about the service. No draft,
		// no passage and no identifier of the person asking travels with it.
		$this->assertSame( array( 'available', 'checking', 'state', 'recommended', 'limits' ), array_keys( $answer ) );
		$this->assertSame( 0, $adapter->calls, 'asking whether the route is open must never score anything' );
	}

	public function test_the_status_route_is_behind_the_same_capability_and_nonce_as_a_run() {
		$controller = $this->controller( $this->adapter( true ) );
		$request    = new WP_REST_Request( array(), array( 'X-WP-Nonce' => 'valid-rest-nonce' ) );
		$this->assertSame( 'permission_denied', $controller->can_mutate( $request )->get_error_code() );

		$GLOBALS['oaci_test_logged_in'] = true;
		$this->assertFalse( $controller->can_mutate( $request ) );
		$GLOBALS['oaci_test_capabilities']['edit_posts'] = true;
		$this->assertTrue( $controller->can_mutate( $request ) );
		$this->assertSame( 'permission_denied', $controller->can_mutate( new WP_REST_Request( array(), array( 'X-WP-Nonce' => 'wrong' ) ) )->get_error_code() );
	}

	public function test_a_route_that_is_off_answers_the_browser_without_asking_the_service() {
		$adapter = $this->adapter( false );
		$answer  = $this->controller( $adapter )->server_status();

		$this->assertFalse( $answer['available'] );
		$this->assertSame( 'channel_unavailable', $answer['state'] );
		$this->assertSame( 'on_device', $answer['recommended'] );
	}

	private function controller( ServerAnalysisAdapter $adapter ) {
		$analyser = new DeterministicAnalyser();
		$source   = new WordPressPostSource();
		$sessions = new SessionService( new JobRepository(), $analyser, $source );
		$receipts = new ReceiptService( new ReceiptRepository() );
		return new RestController( $analyser, $sessions, $receipts, $source, $adapter, new ServerRateLimiter() );
	}

	private function adapter( $available ) {
		return new class( $available ) implements ServerAnalysisAdapter {
			public $calls = 0;
			public $probes = 0;
			public $last_text;
			public $last_request_id;
			private $available;

			public function __construct( $available ) {
				$this->available = $available;
			}

			public function status() {
				return array(
					'available'   => $this->available,
					'checking'    => false,
					'recommended' => $this->available ? 'server' : 'on_device',
					'state'       => $this->available ? 'ready' : 'channel_unavailable',
					'limits'      => array( 'site_per_hour' => null, 'site_per_day' => null ),
				);
			}

			public function probed_status() {
				++$this->probes;
				return $this->status();
			}

			public function analyse( $text, $request_id ) {
				++$this->calls;
				$this->last_text       = $text;
				$this->last_request_id = $request_id;
				return array( 'accepted' => true );
			}
		};
	}

	private function valid_text() {
		return implode( ' ', array_fill( 0, 60, 'word' ) );
	}
}
