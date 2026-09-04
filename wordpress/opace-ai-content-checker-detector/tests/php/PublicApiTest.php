<?php

use Opace\ContentIntegrity\Integration\PublicApi;
use PHPUnit\Framework\TestCase;

final class PublicApiTest extends TestCase {
	public function test_pre_ready_methods_fail_safely() {
		$api = PublicApi::instance();
		foreach ( array(
			$api->create_session( array() ),
			$api->get_session( 'job_missing' ),
			$api->get_approved_output( 'job_missing', 'receipt_missing' ),
			$api->mark_applied( 'job_missing', 'receipt_missing', 'sha256:' . str_repeat( 'a', 64 ) ),
			$api->get_receipt( 'job_missing' ),
		) as $result ) {
			$this->assertInstanceOf( WP_Error::class, $result );
			$this->assertSame( 'method_not_configured', $result->get_error_code() );
		}
	}

	public function test_facade_identity_is_exact() {
		$methods = array( 'version', 'is_compatible', 'capabilities', 'register_source_adapter', 'create_session', 'get_session', 'approve', 'get_approved_output', 'mark_applied', 'get_receipt', 'asset_handles' );
		foreach ( $methods as $method ) {
			$this->assertTrue( method_exists( PublicApi::class, $method ), $method );
		}
	}
}
