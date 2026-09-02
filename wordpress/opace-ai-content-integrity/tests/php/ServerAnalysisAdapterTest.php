<?php

use Opace\ContentIntegrity\Adapters\OpaceEuServerAdapter;
use Opace\ContentIntegrity\Adapters\UnavailableServerAnalysisChannel;
use Opace\ContentIntegrity\Adapters\WordPressServerAnalysisChannel;
use Opace\ContentIntegrity\Contracts\CanonicalCheckerResultValidator;
use Opace\ContentIntegrity\Contracts\ServerAnalysisChannel;
use Opace\ContentIntegrity\Core\Settings;
use Opace\ContentIntegrity\Rest\ServerRateLimiter;
use PHPUnit\Framework\TestCase;

final class ServerAnalysisAdapterTest extends TestCase {
	protected function setUp(): void {
		$GLOBALS['oaci_test_options']       = array();
		$GLOBALS['oaci_test_transients']    = array();
		$GLOBALS['oaci_test_http_calls']    = array();
		$GLOBALS['oaci_test_http_response'] = null;
		$GLOBALS['oaci_test_http_get_response'] = null;
	}

	public function test_server_route_is_off_and_channel_unavailable_by_default() {
		$adapter = new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() );
		$this->assertSame( 'off', $adapter->status()['state'] );
		$this->assertFalse( $adapter->status()['available'] );
		$this->assertSame( 'server_channel_unavailable', $adapter->analyse( 'Never sent', 'request_0000000001' )->get_error_code() );
		$this->assertCount( 0, $GLOBALS['oaci_test_http_calls'] );
	}

	public function test_endpoint_is_code_injected_and_rejects_unsafe_or_credentialled_values() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$this->assertSame( 'ready', ( new OpaceEuServerAdapter( $this->fixture_channel() ) )->status()['state'] );
		$this->assertSame( 'endpoint_missing', ( new OpaceEuServerAdapter( $this->fixture_channel(), null, '' ) )->status()['state'] );
		$this->assertSame( 'endpoint_missing', ( new OpaceEuServerAdapter( $this->fixture_channel(), null, 'http://eu.example.test/v1/check' ) )->status()['state'] );
		$this->assertSame( 'endpoint_missing', ( new OpaceEuServerAdapter( $this->fixture_channel(), null, 'https://user:secret@eu.example.test/v1/check' ) )->status()['state'] );
		$this->assertSame( 'endpoint_missing', ( new OpaceEuServerAdapter( $this->fixture_channel(), null, 'https://eu.example.test/v1/check?token=secret' ) )->status()['state'] );
	}

	public function test_ready_wordpress_channel_uses_three_bounded_body_bound_requests() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array(
			'server_analysis_opt_in' => true,
		);
		$GLOBALS['oaci_test_transients'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ] = array( 'ready' => true );
		$text                                    = $this->source_text();
		$GLOBALS['oaci_test_http_response']       = array(
			$this->response(
				array(
					'channel'         => 'wordpress-v1',
					'challenge'       => 'unit-test-challenge',
					'algorithm'       => 'sha256(challenge + \':\' + nonce)',
					'difficulty_bits' => 14,
					'expires_at'      => 1800000120,
					'expires_in'      => 120,
					'retained'        => 'nothing',
				)
			),
			$this->response(
				array(
					'channel'    => 'wordpress-v1',
					'token'      => 'unit-test-one-use-token',
					'expires_at' => 1800000120,
					'max_checks' => 1,
					'header'     => 'x-opace-wordpress-token',
					'retained'   => 'nothing',
				)
			),
			$this->response( $this->server_score_fixture( $text ) ),
		);

		$adapter = new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() );
		$result  = $adapter->analyse( $text, 'req_0000000000000001' );
		$this->assertEquals( $this->server_score_fixture( $text ), $result );
		$this->assertCount( 3, $GLOBALS['oaci_test_http_calls'] );
		$this->assertSame( WordPressServerAnalysisChannel::SERVICE_BASE . '/v1/wordpress/challenge', $GLOBALS['oaci_test_http_calls'][0]['url'] );
		$this->assertSame( WordPressServerAnalysisChannel::SERVICE_BASE . '/v1/wordpress/token', $GLOBALS['oaci_test_http_calls'][1]['url'] );
		$this->assertSame( WordPressServerAnalysisChannel::SERVICE_BASE . '/v1/wordpress/check', $GLOBALS['oaci_test_http_calls'][2]['url'] );
		$challenge_body = json_decode( $GLOBALS['oaci_test_http_calls'][0]['args']['body'], true );
		$this->assertArrayNotHasKey( 'text', $challenge_body );
		$this->assertSame( 'sha256:' . hash( 'sha256', $text ), $challenge_body['body_sha256'] );
		$this->assertStringStartsWith( 'wp_', $challenge_body['install_id'] );
		$check = $GLOBALS['oaci_test_http_calls'][2]['args'];
		$this->assertSame( $text, json_decode( $check['body'], true )['text'] );
		$this->assertSame( 'unit-test-one-use-token', $check['headers']['X-Opace-WordPress-Token'] );
		foreach ( $GLOBALS['oaci_test_http_calls'] as $call ) {
			$this->assertSame( 0, $call['args']['redirection'] );
			$this->assertTrue( $call['args']['reject_unsafe_urls'] );
			$this->assertArrayNotHasKey( 'Origin', $call['args']['headers'] );
			$this->assertArrayNotHasKey( 'User-Agent', $call['args']['headers'] );
		}
	}

	public function test_invalid_raw_score_response_fails_closed() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$text = $this->source_text();
		$GLOBALS['oaci_test_transients'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ] = array( 'ready' => true );
		$fixture = $this->server_score_fixture( $text );
		$fixture['segments'][0]['char_end'] = strlen( $text ) + 1;
		$GLOBALS['oaci_test_http_response'] = array(
			$this->response( array( 'channel' => 'wordpress-v1', 'challenge' => 'unit-test-challenge', 'algorithm' => 'sha256(challenge + \':\' + nonce)', 'difficulty_bits' => 14, 'retained' => 'nothing' ) ),
			$this->response( array( 'channel' => 'wordpress-v1', 'token' => 'token', 'max_checks' => 1, 'header' => 'x-opace-wordpress-token', 'retained' => 'nothing' ) ),
			$this->response( $fixture ),
		);
		$result = ( new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() ) )->analyse( $text, 'req_0000000000000002' );
		$this->assertSame( 'invalid_server_response', $result->get_error_code() );
	}

	public function test_capability_probe_fails_closed_for_old_service_and_accepts_only_current_enabled_contract() {
		$GLOBALS['oaci_test_options'][ Settings::OPTION ] = array( 'server_analysis_opt_in' => true );
		$channel = new WordPressServerAnalysisChannel();
		$GLOBALS['oaci_test_http_get_response'] = $this->response( array( 'ok' => true, 'model' => 'tier3-cycle5-full' ) );
		$this->assertFalse( $channel->available() );
		$this->assertFalse( $GLOBALS['oaci_test_transients'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ]['ready'] );

		unset( $GLOBALS['oaci_test_transients'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ] );
		$GLOBALS['oaci_test_http_get_response'] = $this->response(
			array(
				'ok'                    => true,
				'model'                 => 'tier3-cycle5-full',
				'segmentation_contract' => 'segments-v3',
				'input_normalisation'   => 'raw-v1',
				'features_contract'     => 'features-v1',
				'scoring'               => 'margin-v1',
				'wordpress_channel'     => array( 'enabled' => true, 'credential_class' => 'wordpress-v1' ),
			)
		);
		$this->assertTrue( $channel->available() );
		$this->assertTrue( $GLOBALS['oaci_test_transients'][ WordPressServerAnalysisChannel::STATUS_CACHE_KEY ]['ready'] );
	}

	public function test_canonical_schema_identity_source_and_content_boundary_fail_closed() {
		$validator = new CanonicalCheckerResultValidator();
		$text      = $this->source_text();
		$invalid   = json_decode( file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'tests/fixtures/contracts/invalid/checker-result-share-content.json' ), true );
		$this->assertSame( 'invalid_server_response', $validator->validate( $invalid['data'], $text )->get_error_code() );

		$valid                                  = $this->wordpress_fixture( $text );
		$valid['route']['model']['identity']     = 'unknown';
		$this->assertSame( 'invalid_server_response', $validator->validate( $valid, $text )->get_error_code() );
		$valid                                  = $this->wordpress_fixture( $text );
		$valid['sections'][0]['passage']         = 'Echoed source text';
		$this->assertSame( 'invalid_server_response', $validator->validate( $valid, $text )->get_error_code() );
		$valid                                  = $this->wordpress_fixture( $text );
		$valid['source']['content_hash']         = 'sha256:' . str_repeat( '0', 64 );
		$this->assertSame( 'invalid_server_response', $validator->validate( $valid, $text )->get_error_code() );
	}

	public function test_canonical_contradiction_fixtures_fail_closed() {
		$validator      = new CanonicalCheckerResultValidator();
		$text           = $this->source_text();
		$contradictions = json_decode( file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'tests/fixtures/checker-result/contradictions.json' ), true );
		foreach ( $contradictions as $contradiction ) {
			$payload = $this->wordpress_fixture( $text );
			$cursor  = &$payload;
			foreach ( $contradiction['path'] as $part ) {
				$cursor = &$cursor[ $part ];
			}
			$cursor = $contradiction['value'];
			unset( $cursor );
			$this->assertSame( 'invalid_server_response', $validator->validate( $payload, $text )->get_error_code(), $contradiction['name'] );
		}
	}

	public function test_per_user_rate_limit_keeps_only_timestamps() {
		$limiter = new ServerRateLimiter();
		$this->assertTrue( $limiter->claim( 7, 1000 ) );
		$this->assertTrue( $limiter->claim( 7, 1001 ) );
		$this->assertTrue( $limiter->claim( 7, 1002 ) );
		$denied = $limiter->claim( 7, 1003 );
		$this->assertSame( 'server_rate_limited', $denied->get_error_code() );
		$this->assertSame( array( 1000, 1001, 1002 ), $GLOBALS['oaci_test_transients']['oaci_server_rate_7'] );
	}

	private function fixture_channel() {
		return new class() implements ServerAnalysisChannel {
			public function available() {
				return true;
			}

			public function authorise( array $request_args ) {
				$request_args['headers']['X-Opace-Test-Channel'] = 'fixture-channel';
				return $request_args;
			}
		};
	}

	private function source_text() {
		return implode( ' ', array_fill( 0, 60, 'word' ) );
	}

	private function wordpress_fixture( $text ) {
		$fixture = json_decode( file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'tests/fixtures/contracts/valid/checker-result.json' ), true )['data'];
		$hash    = 'sha256:' . hash( 'sha256', $text );
		$length  = strlen( $text );
		$fixture['contains_content']                           = false;
		$fixture['source']['content_hash']                     = $hash;
		$fixture['source']['normalised_hash']                  = $hash;
		$fixture['source']['word_count']                       = 60;
		$fixture['source']['character_count']                  = $length;
		$fixture['route']['transport']['words_sent']           = 60;
		$fixture['abuse_controls']['channel_authentication']    = 'wordpress_challenge_token';
		$fixture['exports']['share']['payload']['word_count']   = 60;
		$fixture['sections'][0]['start_utf16']                  = 0;
		$fixture['sections'][0]['end_utf16']                    = 149;
		$fixture['sections'][0]['word_count']                   = 30;
		$fixture['sections'][0]['locator']                      = array( 'content_hash' => $hash, 'start_utf16' => 0, 'end_utf16' => 149 );
		$fixture['sections'][1]['start_utf16']                  = 149;
		$fixture['sections'][1]['end_utf16']                    = $length;
		$fixture['sections'][1]['word_count']                   = 30;
		$fixture['sections'][1]['locator']                      = array( 'content_hash' => $hash, 'start_utf16' => 149, 'end_utf16' => $length );
		unset( $fixture['sections'][0]['passage'], $fixture['sections'][1]['passage'] );
		return $fixture;
	}

	private function response( array $payload ) {
		return array(
			'response' => array( 'code' => 200 ),
			'headers'  => array( 'content-type' => 'application/json; charset=UTF-8' ),
			'body'     => wp_json_encode( $payload ),
		);
	}

	private function server_score_fixture( $text ) {
		return array(
			'model'                   => 'tier3-cycle5-full',
			'model_build'             => '45e00978b10d1df6',
			'precision'               => 'fp32',
			'segmentation_contract'   => 'segments-v3',
			'input_normalisation'     => 'raw-v1',
			'features_contract'       => 'features-v1',
			'scoring'                 => 'margin-v1',
			'aggregation'             => 'max',
			'probability_ai'          => 0.9785,
			'margin'                  => 4.0,
			'flagged'                 => true,
			'flag_reason'             => 'primary',
			'threshold_margin'        => 3.570935,
			'secondary_gap'           => 0.34,
			'word_count'              => 60,
			'words_sent'              => 60,
			'segment_count'           => 1,
			'strongest_segment'       => 0,
			'segments'                => array( array( 'index' => 0, 'char_start' => 0, 'char_end' => strlen( $text ), 'words' => 60, 'probability_ai' => 0.9785, 'margin' => 4.0, 'tokens_scored' => 60, 'truncated' => false ) ),
			'truncated'               => false,
			'processed'               => 'server',
			'retained'                => 'nothing',
			'channel'                 => 'wordpress-v1',
		);
	}
}
