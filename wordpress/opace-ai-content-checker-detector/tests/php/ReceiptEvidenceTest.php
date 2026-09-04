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

	public function test_full_checker_receipt_persists_the_validated_content_free_result_for_its_owner() {
		$result                                                = json_decode( file_get_contents( OPACE_CONTENT_INTEGRITY_DIR . 'tests/fixtures/contracts/valid/checker-result.json' ), true )['data'];
		$result['contains_content']                            = false;
		$result['route']['transport']['endpoint_class']        = 'wordpress_challenge_token';
		$result['abuse_controls']['channel_authentication'] = 'wordpress_challenge_token';
		$result['exports']['report']['contains_content']       = false;
		foreach ( $result['sections'] as &$section ) {
			unset( $section['passage'] );
			$section['locator']  = array(
				'content_hash' => $result['source']['content_hash'],
				'start_utf16'  => $section['start_utf16'],
				'end_utf16'    => $section['end_utf16'],
			);
			$section['evidence'] = array();
		}
		unset( $section );
		foreach ( $result['methods'] as &$method ) {
			$method['evidence'] = array();
		}
		unset( $method );
		$GLOBALS['wpdb'] = new class() {
			public $prefix = 'wp_';
			public $saved;
			public function insert( $table, $data ) {
				$this->saved = array( 'table' => $table, 'data' => $data );
				return 1;
			}
		};
		$receipt = ( new ReceiptService( new ReceiptRepository() ) )->create_checker_result( $result, 7 );
		$this->assertFalse( is_wp_error( $receipt ) );
		$this->assertSame( $result['result_id'], $receipt['checker_result']['result_id'] );
		$this->assertSame( 7, $GLOBALS['wpdb']->saved['data']['owner_user_id'] );
		$this->assertStringNotContainsString( '"passage":', $GLOBALS['wpdb']->saved['data']['receipt_json'] );
		$this->assertStringNotContainsString( 'The first complete scored passage', $GLOBALS['wpdb']->saved['data']['receipt_json'] );
	}
}
