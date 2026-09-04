<?php

use PHPUnit\Framework\TestCase;

final class PluginWiringTest extends TestCase {
	public function test_composition_root_wires_receipt_service_before_public_api() {
		$source = file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'includes/Core/Plugin.php' );
		$this->assertIsString( $source );
		$setter    = strpos( $source, '$sessions->set_receipt_service( $receipts );' );
		$configure = strpos( $source, '$api->configure( $sessions, $receipts, $source );' );
		$this->assertNotFalse( $setter, 'SessionService must receive ReceiptService or ready sessions have no receipt.' );
		$this->assertNotFalse( $configure );
		$this->assertLessThan( $configure, $setter, 'Receipt wiring must occur before the public API is announced.' );
	}

	public function test_receipt_persistence_requires_explicit_request_and_is_idempotent() {
		$session = file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'includes/Rewrite/SessionService.php' );
		$rest    = file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'includes/Rest/RestController.php' );
		$this->assertStringContainsString( "! empty( \$request['privacy']['save_receipt'] )", $session );
		$this->assertStringContainsString( 'find_idempotent', $session );
		$this->assertStringContainsString( "get_header( 'Idempotency-Key' )", $rest );
		$this->assertStringContainsString( 'idempotency_conflict', file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'includes/Storage/JobRepository.php' ) );
	}

	public function test_storage_transitions_and_receipt_deletion_are_fail_closed() {
		$jobs     = file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'includes/Storage/JobRepository.php' );
		$receipts = file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'includes/Storage/ReceiptRepository.php' );
		$admin    = file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'includes/Admin/Admin.php' );
		$this->assertStringContainsString( "'state'         => \$current['state']", $jobs );
		$this->assertStringContainsString( 'state_conflict', $jobs );
		$this->assertStringContainsString( 'delete_for_job', $receipts );
		$this->assertStringContainsString( 'check_admin_referer', $admin );
		$this->assertStringContainsString( 'admin_post_oaci_delete_receipts', $admin );
	}

	public function test_site_health_is_registered_without_content_fields() {
		$admin  = file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'includes/Admin/Admin.php' );
		$health = file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'includes/Support/Health.php' );
		$this->assertStringContainsString( 'site_status_tests', $admin );
		$this->assertStringNotContainsString( 'source_text', $health );
		$this->assertStringNotContainsString( 'candidate_text', $health );
	}
}
