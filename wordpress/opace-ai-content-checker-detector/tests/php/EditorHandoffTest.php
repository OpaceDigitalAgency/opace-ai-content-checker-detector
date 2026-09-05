<?php
/**
 * Editor reports must stay in the browser, not a WordPress transient.
 *
 * @package Opace\ContentIntegrity
 */

use Opace\ContentIntegrity\Analysis\DeterministicAnalyser;
use Opace\ContentIntegrity\Contracts\ServerAnalysisAdapter;
use Opace\ContentIntegrity\Editor\EditorConfig;
use Opace\ContentIntegrity\Integration\WordPressPostSource;
use Opace\ContentIntegrity\Receipts\ReceiptService;
use Opace\ContentIntegrity\Rest\RestController;
use Opace\ContentIntegrity\Rest\ServerRateLimiter;
use Opace\ContentIntegrity\Rewrite\SessionService;
use Opace\ContentIntegrity\Storage\JobRepository;
use Opace\ContentIntegrity\Storage\ReceiptRepository;
use PHPUnit\Framework\TestCase;

if ( ! function_exists( 'register_rest_route' ) ) {
	function register_rest_route( $namespace, $route, $args ) {
		$GLOBALS['oaci_test_registered_routes'][ $namespace . $route ] = $args;
		return true;
	}
}

final class EditorHandoffTest extends TestCase {

	public function test_no_editor_report_handoff_endpoint_is_registered() {
		$GLOBALS['oaci_test_registered_routes'] = array();
		$this->controller()->routes();
		$routes = array_keys( $GLOBALS['oaci_test_registered_routes'] );
		$this->assertNotEmpty( $routes );
		foreach ( $routes as $route ) {
			$this->assertStringNotContainsString( '/editor/handoff', $route );
		}
		$this->assertContains( 'oaci/v1/analysis/server', $routes );
	}

	public function test_no_editor_report_server_storage_path_exists() {
		$controller = $this->controller();
		foreach ( array( 'store_handoff', 'collect_handoff', 'handoff_key' ) as $method ) {
			$this->assertFalse( method_exists( $controller, $method ), $method . ' must not send or store a local reading.' );
		}
		$source = file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'includes/Rest/RestController.php' );
		$this->assertStringNotContainsString( 'oaci_handoff_', $source );
	}

	public function test_the_editor_configuration_carries_versioned_modules_and_never_the_draft() {
		$config = EditorConfig::build(
			12,
			array(
				'available' => true,
				'checking'  => false,
				'state'     => 'ready',
				'limits'    => array(
					'site_per_hour' => 30,
					'site_per_day'  => 120,
				),
			)
		);

		// The version is read from the plugin rather than written down here: a
		// release bump must not be able to break the cache-busting test, and a
		// missing bump must not be able to pass it.
		foreach ( array( 'panel', 'engine', 'core', 'cycle5', 'worker' ) as $name ) {
			$this->assertStringContainsString( 'ver=' . OPACE_CONTENT_INTEGRITY_VERSION, $config['modules'][ $name ], "The {$name} module is not cache-busted." );
		}
		$this->assertSame( 12, $config['postId'] );
		$this->assertTrue( $config['serverAnalysis']['available'] );
		$this->assertSame( 60, $config['limits']['minWords'] );
		// The panel is told what the site allows, never what the post says.
		$this->assertStringNotContainsString( 'post_content', wp_json_encode( $config ) );
	}


	private function controller() {
		$analyser = new DeterministicAnalyser();
		$source   = new WordPressPostSource();
		$sessions = new SessionService( new JobRepository(), $analyser, $source );
		$receipts = new ReceiptService( new ReceiptRepository() );
		return new RestController( $analyser, $sessions, $receipts, $source, $this->adapter(), new ServerRateLimiter() );
	}

	private function adapter() {
		return new class() implements ServerAnalysisAdapter {
			public function status() {
				return array(
					'available'   => false,
					'checking'    => false,
					'recommended' => 'on_device',
					'state'       => 'off',
					'limits'      => array(
						'site_per_hour' => null,
						'site_per_day'  => null,
					),
				);
			}

			public function probed_status() {
				return $this->status();
			}

			public function analyse( $text, $request_id ) {
				return new WP_Error( 'server_channel_unavailable', 'off' );
			}
		};
	}
}
