<?php

use Opace\ContentIntegrity\Adapters\OpaceEuServerAdapter;
use Opace\ContentIntegrity\Adapters\WordPressServerAnalysisChannel;
use Opace\ContentIntegrity\Core\Settings;
use PHPUnit\Framework\TestCase;

/**
 * The service status probe: who may wait for it, and for how long.
 *
 * The EU service scales to zero. Measured from inside the test container on
 * 3 September 2026 against the live service: three requests to a container that
 * had scaled to zero failed after 20.6 s and 18.4 s and then answered in 21.0 s,
 * and once warm the same request took 7.3 s, 4.7 s and 5.1 s. The five-second
 * wait this replaced therefore reported a healthy service as an absent one even
 * when it was warm. The fix is not a longer wait during a page render — that is
 * worse — but no wait at all while a screen is drawn, and a generous one, asked
 * twice when the first request never completed, from the route the browser
 * calls afterwards.
 */
final class ServiceProbeTest extends TestCase {
	protected function setUp(): void {
		$GLOBALS['oaci_test_options']           = array();
		$GLOBALS['oaci_test_transients']        = array();
		$GLOBALS['oaci_test_transient_ttl']     = array();
		$GLOBALS['oaci_test_http_calls']        = array();
		$GLOBALS['oaci_test_http_response']     = null;
		$GLOBALS['oaci_test_http_get_response'] = null;
	}

	public function test_drawing_a_screen_asks_the_service_nothing_and_says_it_is_checking() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$status = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->status();

		$this->assertCount( 0, $GLOBALS['oaci_test_http_calls'], 'rendering an admin screen must not wait on the network' );
		$this->assertSame( 'checking', $status['state'] );
		$this->assertTrue( $status['checking'] );
		// Not knowing is not the same as knowing it is off, and the card that is
		// offered while we do not know is the one that is ready either way.
		$this->assertFalse( $status['available'] );
		$this->assertSame( 'on_device', $status['recommended'] );
	}

	public function test_a_remembered_answer_is_what_the_screen_is_drawn_from() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$GLOBALS['oaci_test_transients'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ] = array(
			'ready'   => true,
			'figures' => array( 'site_per_hour' => 60, 'site_per_day' => 600 ),
		);
		$status = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->status();

		$this->assertCount( 0, $GLOBALS['oaci_test_http_calls'] );
		$this->assertSame( 'ready', $status['state'] );
		$this->assertFalse( $status['checking'] );
		$this->assertTrue( $status['available'] );
		$this->assertSame( 'server', $status['recommended'] );
		$this->assertSame( 60, $status['limits']['site_per_hour'] );
	}

	public function test_a_remembered_refusal_is_stated_as_one_rather_than_as_still_checking() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$GLOBALS['oaci_test_transients'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ] = array( 'ready' => false, 'figures' => array() );
		$status = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->status();

		$this->assertSame( 'channel_unavailable', $status['state'] );
		$this->assertFalse( $status['checking'] );
		$this->assertCount( 0, $GLOBALS['oaci_test_http_calls'] );
	}

	public function test_the_probe_waits_long_enough_for_a_cold_start_and_keeps_a_yes_for_five_minutes() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$GLOBALS['oaci_test_http_get_response']           = $this->ready_status();

		$status = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->probed_status();

		$this->assertCount( 1, $GLOBALS['oaci_test_http_calls'] );
		$this->assertSame( WordPressServerAnalysisChannel::SERVICE_BASE . '/v1/status', $GLOBALS['oaci_test_http_calls'][0]['url'] );
		// A warm container took five to seven seconds to answer this on the day,
		// so anything near the old five would report a healthy service as absent.
		$this->assertSame( 20, $GLOBALS['oaci_test_http_calls'][0]['args']['timeout'] );
		$this->assertSame( 20, WordPressServerAnalysisChannel::STATUS_PROBE_TIMEOUT_SECONDS );
		$this->assertSame( 0, $GLOBALS['oaci_test_http_calls'][0]['args']['redirection'] );
		$this->assertTrue( $GLOBALS['oaci_test_http_calls'][0]['args']['reject_unsafe_urls'] );
		$this->assertTrue( $status['available'] );
		$this->assertSame( 'server', $status['recommended'] );
		$this->assertSame( 300, $GLOBALS['oaci_test_transient_ttl'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ] );
	}

	public function test_a_no_is_kept_for_one_minute_so_a_service_that_comes_back_is_picked_up() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$GLOBALS['oaci_test_http_get_response']           = null;

		$status = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->probed_status();

		$this->assertFalse( $status['available'] );
		$this->assertFalse( $status['checking'], 'the service was asked, so the answer is no rather than unknown' );
		$this->assertSame( 'channel_unavailable', $status['state'] );
		$this->assertSame( 60, $GLOBALS['oaci_test_transient_ttl'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ] );
	}

	public function test_a_site_that_has_not_opted_in_asks_the_service_nothing_even_when_the_browser_asks() {
		$GLOBALS['oaci_test_http_get_response'] = $this->ready_status();
		$status                                 = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->probed_status();

		// The admin opt-in is the boundary, and it is checked before the probe,
		// not after it. Installing the plugin turns no network transfer on.
		$this->assertCount( 0, $GLOBALS['oaci_test_http_calls'] );
		$this->assertSame( 'off', $status['state'] );
		$this->assertFalse( $status['checking'] );
		$this->assertFalse( $status['available'] );
		$this->assertSame( 'on_device', $status['recommended'] );
	}

	public function test_an_answer_already_held_is_reused_rather_than_asked_for_again() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$GLOBALS['oaci_test_transients'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ] = array( 'ready' => true, 'figures' => array() );
		$GLOBALS['oaci_test_http_get_response']                                              = $this->ready_status();

		$status = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->probed_status();

		$this->assertTrue( $status['available'] );
		$this->assertCount( 0, $GLOBALS['oaci_test_http_calls'], 'a page load must not cost the service a request every time' );
	}

	public function test_a_run_still_waits_for_the_service_rather_than_refusing_because_nobody_had_asked() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$GLOBALS['oaci_test_http_get_response']           = $this->ready_status();
		$GLOBALS['oaci_test_http_response']               = array(
			$this->json( array( 'channel' => 'wordpress-v1', 'challenge' => 'unit-test-challenge', 'algorithm' => 'sha256(challenge + \':\' + nonce)', 'difficulty_bits' => 14, 'retained' => 'nothing' ) ),
			$this->json( array( 'channel' => 'wordpress-v1', 'token' => 'token', 'max_checks' => 1, 'header' => 'x-opace-wordpress-token', 'retained' => 'nothing' ) ),
			$this->refusal( 429, array( 'error' => 'shared_pool_exhausted', 'retry_after' => 300 ) ),
		);

		$result = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->analyse( implode( ' ', array_fill( 0, 60, 'word' ) ), 'req_0000000000000009' );

		// The run reached the service and was refused there for a named reason.
		// Before this, a cold cache would have refused it here instead, with
		// "not available in this build", which was never true.
		$this->assertSame( 'shared_pool_exhausted', $result->get_error_code() );
		$this->assertSame( WordPressServerAnalysisChannel::SERVICE_BASE . '/v1/status', $GLOBALS['oaci_test_http_calls'][0]['url'] );
		$this->assertCount( 4, $GLOBALS['oaci_test_http_calls'] );
	}

	public function test_a_request_that_never_completed_is_asked_once_more_before_giving_up() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		// What a container that has scaled to zero looks like from the site: the
		// first request dies while the container is starting, the second lands.
		$GLOBALS['oaci_test_http_get_response'] = array(
			new WP_Error( 'http_request_failed', 'cURL error 28: Operation timed out' ),
			$this->ready_status(),
		);

		$status = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->probed_status();

		$this->assertTrue( $status['available'], 'a service that was still starting must not be written off' );
		$this->assertCount( 2, $GLOBALS['oaci_test_http_calls'] );
	}

	public function test_a_service_that_answers_and_says_no_is_taken_at_its_word_and_not_asked_twice() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$GLOBALS['oaci_test_http_get_response']           = array(
			$this->json( array( 'ok' => true, 'model' => 'tier3-cycle5-full', 'wordpress_channel' => array( 'enabled' => false ) ) ),
			$this->ready_status(),
		);

		$status = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->probed_status();

		$this->assertFalse( $status['available'] );
		$this->assertCount( 1, $GLOBALS['oaci_test_http_calls'], 'asking a second time would only be arguing with the answer' );
		$this->assertSame( 2, WordPressServerAnalysisChannel::STATUS_PROBE_ATTEMPTS );
	}

	public function test_two_failed_requests_end_the_probe_rather_than_looping() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$GLOBALS['oaci_test_http_get_response']           = new WP_Error( 'http_request_failed', 'cURL error 28: Operation timed out' );

		$status = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->probed_status();

		$this->assertFalse( $status['available'] );
		$this->assertCount( 2, $GLOBALS['oaci_test_http_calls'] );
		$this->assertSame( 60, $GLOBALS['oaci_test_transient_ttl'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ] );
	}

	private function ready_status() {
		return $this->json(
			array(
				'ok'                    => true,
				'model'                 => 'tier3-cycle5-full',
				'segmentation_contract' => 'segments-v3',
				'input_normalisation'   => 'raw-v1',
				'features_contract'     => 'features-v1',
				'scoring'               => 'margin-v1',
				'wordpress_channel'     => array(
					'enabled'          => true,
					'credential_class' => 'wordpress-v1',
					'per_site'         => array( 'per_site_inferences_per_hour' => 60, 'per_site_inferences_per_day' => 600 ),
				),
			)
		);
	}

	private function json( array $payload ) {
		return array(
			'response' => array( 'code' => 200 ),
			'headers'  => array( 'content-type' => 'application/json; charset=UTF-8' ),
			'body'     => wp_json_encode( $payload ),
		);
	}

	private function refusal( $code, array $body ) {
		return array(
			'response' => array( 'code' => $code ),
			'headers'  => array( 'content-type' => 'application/json; charset=UTF-8' ),
			'body'     => wp_json_encode( $body ),
		);
	}
}
