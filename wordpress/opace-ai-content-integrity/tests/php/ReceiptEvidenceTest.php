<?php

use Opace\ContentIntegrity\Analysis\DeterministicAnalyser;
use Opace\ContentIntegrity\Receipts\ReceiptService;
use Opace\ContentIntegrity\Storage\ReceiptRepository;
use PHPUnit\Framework\TestCase;

final class ReceiptEvidenceTest extends TestCase {
	public function test_hash_only_receipt_retains_named_evidence_without_source_text() {
		$marker  = 'PRIVATE_RECEIPT_MARKER';
		$request = array(
			'schema_version'   => '1.0',
			'contract_version' => '1.0.0',
			'request_id'       => 'request_receipt_001',
			'created_at'       => '2026-08-26T10:00:00Z',
			'source'           => array( 'content' => "{$marker} In conclusion.\u{200B}", 'content_type' => 'plain_text', 'language' => 'en-GB' ),
			'checks'           => array( 'unicode.invisible', 'style.patterns' ),
			'privacy'          => array( 'allowed_routes' => array( 'wordpress_local' ), 'save_receipt' => true, 'retain_content' => false ),
		);
		$analysis = ( new DeterministicAnalyser() )->analyse( $request );

		$GLOBALS['wpdb'] = new class() {
			public $prefix = 'wp_';
			public $saved;
			public function insert( $table, $data ) {
				$this->saved = array( 'table' => $table, 'data' => $data );
				return 1;
			}
		};
		$receipt = ( new ReceiptService( new ReceiptRepository() ) )->create_inspection( $analysis, 'job_receipt_001', 7, 'wordpress-editor', 'post:4' );

		$this->assertFalse( $receipt['contains_content'] );
		$this->assertNotEmpty( $receipt['methods'][0]['evidence'] );
		$this->assertNotEmpty( $receipt['methods'][1]['evidence'] );
		$this->assertStringNotContainsString( $marker, $GLOBALS['wpdb']->saved['data']['receipt_json'] );
		$this->assertSame( 'sha256:' . hash( 'sha256', $request['source']['content'] ), $receipt['source']['content_hash'] );
	}
}
