<?php

use Opace\ContentIntegrity\Adapters\ServiceRefusal;
use Opace\ContentIntegrity\Adapters\ServiceStatus;
use Opace\ContentIntegrity\Adapters\WordPressServerAnalysisChannel;
use Opace\ContentIntegrity\Core\Settings;
use PHPUnit\Framework\TestCase;

/**
 * The two things the plugin reads off the EU service: whether the WordPress
 * channel is open, and how much allowance it has published. The first decides
 * which route the checker offers first, so it fails closed on anything it does
 * not recognise. The second is printed to administrators, so a figure the
 * service did not send has to come back as nothing rather than as a zero.
 */
final class ServiceStatusTest extends TestCase {
	protected function setUp(): void {
		$GLOBALS['oaci_test_options']           = array();
		$GLOBALS['oaci_test_transients']        = array();
		$GLOBALS['oaci_test_http_calls']        = array();
		$GLOBALS['oaci_test_http_response']     = null;
		$GLOBALS['oaci_test_http_get_response'] = null;
	}

	public function test_a_fully_matching_status_is_ready_and_any_single_mismatch_is_not() {
		$this->assertTrue( ServiceStatus::from_payload( $this->live_status() )->ready() );

		foreach ( array( 'model', 'segmentation_contract', 'input_normalisation', 'features_contract', 'scoring' ) as $field ) {
			$payload           = $this->live_status();
			$payload[ $field ] = 'something-else';
			$this->assertFalse( ServiceStatus::from_payload( $payload )->ready(), $field . ' should close the route' );
		}

		$payload = $this->live_status();
		unset( $payload['wordpress_channel'] );
		$this->assertFalse( ServiceStatus::from_payload( $payload )->ready() );

		$payload                                       = $this->live_status();
		$payload['wordpress_channel']['enabled']       = false;
		$this->assertFalse( ServiceStatus::from_payload( $payload )->ready() );
		$payload['wordpress_channel']['enabled']       = 'true';
		$this->assertFalse( ServiceStatus::from_payload( $payload )->ready(), 'a string must not read as enabled' );
		$payload                                       = $this->live_status();
		$payload['wordpress_channel']['credential_class'] = 'browser-v1';
		$this->assertFalse( ServiceStatus::from_payload( $payload )->ready() );

		$this->assertFalse( ServiceStatus::from_payload( null )->ready() );
		$this->assertFalse( ServiceStatus::from_payload( 'ok' )->ready() );
		$this->assertFalse( ServiceStatus::closed()->ready() );
	}

	public function test_the_allowance_figures_are_read_from_the_channel_the_pool_and_the_per_site_block() {
		$status = ServiceStatus::from_payload( $this->live_status() );
		$this->assertSame( 3000, $status->figure( 'channel_floor' ) );
		$this->assertSame( 2874, $status->figure( 'channel_remaining' ) );
		$this->assertSame( 5120, $status->figure( 'shared_pool_remaining' ) );
		$this->assertSame( 12000, $status->figure( 'shared_pool_cap' ) );
		$this->assertSame( 30, $status->figure( 'site_per_hour' ) );
		$this->assertSame( 120, $status->figure( 'site_per_day' ) );
		$this->assertSame( 60373, $status->figure( 'resets_in_seconds' ) );
	}

	public function test_a_service_that_publishes_no_figure_reports_null_rather_than_zero() {
		// Exactly the shape the live service returned on 3 September 2026,
		// before the per-channel work: no wordpress_channel counters at all.
		$status = ServiceStatus::from_payload(
			array(
				'ok'                            => true,
				'service_daily_cap'             => 12000,
				'service_daily_remaining_estimate' => 12000,
				'wordpress_channel'             => array( 'enabled' => false, 'credential_class' => 'wordpress-v1' ),
			)
		);
		$this->assertNull( $status->figure( 'channel_floor' ) );
		$this->assertNull( $status->figure( 'channel_remaining' ) );
		$this->assertNull( $status->figure( 'site_per_hour' ) );
		$this->assertNull( $status->figure( 'site_per_day' ) );
		// The service-wide numbers stand in for the pool until it names one.
		$this->assertSame( 12000, $status->figure( 'shared_pool_remaining' ) );
		$this->assertSame( 12000, $status->figure( 'shared_pool_cap' ) );
		$this->assertNull( $status->figure( 'not_a_figure' ) );
	}

	public function test_a_value_that_is_not_a_count_is_refused_rather_than_coerced() {
		$payload = $this->live_status();
		$payload['channel_allowance']['channels']['wordpress']['floor']                    = '3000';
		$payload['channel_allowance']['channels']['wordpress']['floor_remaining_estimate'] = -4;
		$payload['wordpress_channel']['per_site']['per_site_inferences_per_hour']          = true;
		$payload['wordpress_channel']['per_site']['per_site_inferences_per_day']           = 119.7;
		$status = ServiceStatus::from_payload( $payload );
		$this->assertNull( $status->figure( 'channel_floor' ), 'a numeric string is not a published count' );
		$this->assertNull( $status->figure( 'channel_remaining' ), 'a negative count is not a count' );
		$this->assertNull( $status->figure( 'site_per_hour' ), 'a boolean is not a count' );
		$this->assertSame( 119, $status->figure( 'site_per_day' ), 'a paced estimate rounds down' );
	}

	public function test_the_probe_is_cached_whole_so_the_figures_cost_no_second_request() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$GLOBALS['oaci_test_http_get_response']           = array(
			'response' => array( 'code' => 200 ),
			'headers'  => array( 'content-type' => 'application/json' ),
			'body'     => wp_json_encode( $this->live_status() ),
		);
		$channel = new WordPressServerAnalysisChannel();
		$this->assertTrue( $channel->available() );
		$this->assertSame( 3000, $channel->limits()['channel_floor'] );
		$this->assertSame( 30, $channel->limits()['site_per_hour'] );

		// The second and third calls come from the transient, not the network.
		$GLOBALS['oaci_test_http_get_response'] = null;
		$this->assertTrue( $channel->available() );
		$this->assertSame( 2874, $channel->limits()['channel_remaining'] );
	}

	public function test_every_published_reason_maps_to_one_of_this_plugins_own_codes() {
		$cases = array(
			array( 503, array( 'error' => 'wordpress_channel_disabled' ), 'server_route_disabled' ),
			array( 429, array( 'error' => 'rate_limited', 'scope' => 'per_site', 'window' => 'hour' ), 'site_hourly_limit' ),
			array( 429, array( 'error' => 'rate_limited', 'scope' => 'per_site', 'window' => 'day' ), 'site_daily_limit' ),
			array( 429, array( 'error' => 'rate_limited', 'scope' => 'per_install', 'window' => 'hour' ), 'site_hourly_limit' ),
			array( 429, array( 'error' => 'rate_limited', 'scope' => 'per_connection', 'window' => 'minute' ), 'server_rate_limited' ),
			array( 429, array( 'error' => 'channel_floor_exhausted' ), 'channel_floor_exhausted' ),
			array( 429, array( 'error' => 'shared_pool_exhausted' ), 'shared_pool_exhausted' ),
			array( 429, array( 'error' => 'daily_allowance_exhausted' ), 'shared_pool_exhausted' ),
			array( 400, array( 'error' => 'something_new' ), 'server_refused' ),
			array( 500, array(), 'server_refused' ),
			// The shape revision opace-detector-00041-riw publishes: the specific
			// allowance in `reason`, the class in `error`, plus channel_bucket.
			array( 429, array( 'error' => 'rate_limited', 'reason' => 'paced_allowance', 'channel_bucket' => 'wordpress' ), 'service_pacing' ),
			array( 429, array( 'error' => 'rate_limited', 'reason' => 'channel_floor_exhausted', 'channel_bucket' => 'wordpress' ), 'channel_floor_exhausted' ),
			array( 429, array( 'error' => 'rate_limited', 'reason' => 'shared_pool_exhausted', 'channel_bucket' => 'wordpress' ), 'shared_pool_exhausted' ),
			array( 429, array( 'error' => 'rate_limited', 'reason' => 'site_allowance_exhausted', 'scope' => 'per_site', 'window' => 'hour' ), 'site_hourly_limit' ),
			array( 429, array( 'error' => 'rate_limited', 'reason' => 'site_allowance_exhausted', 'scope' => 'per_site', 'window' => 'day' ), 'site_daily_limit' ),
			// `reason` wins over the older `error` when both are present.
			array( 429, array( 'error' => 'daily_allowance_exhausted', 'reason' => 'paced_allowance' ), 'service_pacing' ),
		);
		foreach ( $cases as list( $code, $body, $expected ) ) {
			$this->assertSame( $expected, ServiceRefusal::from_response( $code, $body )->get_error_code(), wp_json_encode( $body ) );
		}
		$this->assertSame( 'server_unreachable', ServiceRefusal::unreachable()->get_error_code() );
		foreach ( ServiceRefusal::reasons() as $reason ) {
			$this->assertNotSame( '', ServiceRefusal::from_response( 429, array( 'error' => $reason ) )->get_error_message() );
		}
	}

	public function test_the_wait_comes_from_the_body_then_the_header_and_a_nonsense_value_is_dropped() {
		$body = ServiceRefusal::from_response( 429, array( 'error' => 'rate_limited', 'retry_after' => 42 ), '900' );
		$this->assertSame( 42, $body->get_error_data()['retry_after'] );

		$header = ServiceRefusal::from_response( 429, array( 'error' => 'rate_limited' ), '900' );
		$this->assertSame( 900, $header->get_error_data()['retry_after'] );

		$resets = ServiceRefusal::from_response( 429, array( 'error' => 'shared_pool_exhausted', 'resets_in_seconds' => 3600 ), '' );
		$this->assertSame( 3600, $resets->get_error_data()['retry_after'] );

		foreach ( array( 'Wed, 21 Oct 2026 07:28:00 GMT', '', 0, -5, true, 100000 ) as $nonsense ) {
			$refusal = ServiceRefusal::from_response( 429, array( 'error' => 'rate_limited', 'retry_after' => $nonsense ), '' );
			$this->assertArrayNotHasKey( 'retry_after', $refusal->get_error_data(), 'a wait that is not a plain count of seconds must be dropped' );
		}
	}

	private function live_status() {
		return array(
			'ok'                               => true,
			'unit'                             => 'inferences',
			'service_daily_cap'                => 12000,
			'service_daily_remaining_estimate' => 8123,
			'resets_in_seconds'                => 60373,
			'model'                            => 'tier3-cycle5-full',
			'segmentation_contract'            => 'segments-v3',
			'input_normalisation'              => 'raw-v1',
			'features_contract'                => 'features-v1',
			'scoring'                          => 'margin-v1',
			// The shape the deployed service publishes, read from
			// https://opace-detector-...run.app/v1/status on 3 September 2026.
			'channel_allowance'                => array(
				'floors_pct'                    => array( 'browser' => 40, 'wordpress' => 40, 'chrome' => 20 ),
				'channels'                      => array(
					'browser'   => array( 'floor' => 4800, 'floor_remaining_estimate' => 4792 ),
					'wordpress' => array( 'floor' => 3000, 'floor_remaining_estimate' => 2874 ),
					'chrome'    => array( 'floor' => 2400, 'floor_remaining_estimate' => 2400 ),
				),
				'shared_pool_remaining_estimate' => 5120,
			),
			'shared_pool'                      => array( 'cap' => 12000 ),
			'wordpress_channel'                => array(
				'enabled'          => true,
				'credential_class' => 'wordpress-v1',
				'per_site'         => array( 'per_site_inferences_per_hour' => 30, 'per_site_inferences_per_day' => 120, 'windows' => 'utc-aligned' ),
			),
		);
	}
}
