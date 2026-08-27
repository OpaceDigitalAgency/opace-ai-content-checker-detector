<?php

use Opace\ContentIntegrity\Analysis\DeterministicAnalyser;
use PHPUnit\Framework\TestCase;

final class DeterministicAnalyserTest extends TestCase {
	public function test_local_analysis_finds_unicode_patterns_and_protected_values() {
		$request = array(
			'schema_version'   => '1.0',
			'contract_version' => '1.0.0',
			'request_id'       => 'request_000001',
			'source'           => array(
				'content'      => "In conclusion, Opace charged £120 on 26 August 2026.\u{200B}",
				'content_type' => 'plain_text',
				'language'     => 'en-GB',
			),
			'checks'           => array( 'unicode.invisible', 'style.patterns', 'watermark.anthropic' ),
			'privacy'          => array( 'allowed_routes' => array( 'browser', 'wordpress_local' ) ),
		);
		$result  = ( new DeterministicAnalyser() )->analyse( $request );
		$this->assertIsArray( $result );
		$this->assertSame( 'sha256:' . hash( 'sha256', $request['source']['content'] ), $result['source']['content_hash'] );
		$this->assertNotEmpty( $result['unicode_findings'] );
		$this->assertNotEmpty( $result['pattern_findings'] );
		$this->assertNotEmpty( $result['protected_spans'] );
		$anthropic = array_values(
			array_filter(
				$result['methods'],
				static function ( $method ) {
					return 'watermark.anthropic' === $method['id'];
				}
			)
		)[0];
		$this->assertSame( 'unsupported', $anthropic['status'] );
		$this->assertNull( $anthropic['score'] );
	}

	public function test_limits_and_major_fail_closed() {
		$GLOBALS['oaci_test_options']['oaci_settings'] = array( 'max_chars' => 10000 );
		$base = array(
			'schema_version'   => '1.0',
			'contract_version' => '2.0.0',
			'source'           => array( 'content' => 'text' ),
			'privacy'          => array( 'allowed_routes' => array( 'wordpress_local' ) ),
		);
		$this->assertSame( 'contract_incompatible', ( new DeterministicAnalyser() )->analyse( $base )->get_error_code() );
		$base['contract_version']  = '1.0.0';
		$base['source']['content'] = str_repeat( 'a', 10001 );
		$this->assertSame( 'request_too_large', ( new DeterministicAnalyser() )->analyse( $base )->get_error_code() );
	}

	public function test_wordpress_local_route_requires_explicit_consent() {
		$request = array(
			'schema_version'   => '1.0',
			'contract_version' => '1.0.0',
			'source'           => array( 'content' => 'Local inspection text.' ),
			'privacy'          => array( 'allowed_routes' => array( 'browser', 'hub_provider' ) ),
		);
		$denied  = ( new DeterministicAnalyser() )->analyse( $request );
		$this->assertSame( 'consent_required', $denied->get_error_code() );
		$this->assertSame( 409, $denied->get_error_data()['status'] );

		$request['privacy']['allowed_routes'][] = 'wordpress_local';
		$this->assertIsArray( ( new DeterministicAnalyser() )->analyse( $request ) );
	}
}
