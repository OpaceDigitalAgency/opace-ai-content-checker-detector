<?php

use Opace\ContentIntegrity\Contracts\CanonicalJson;
use Opace\ContentIntegrity\Contracts\ContractValidator;
use PHPUnit\Framework\TestCase;

final class CanonicalContractTest extends TestCase {
	public function hashVectors() {
		$files = glob( OPACE_CONTENT_INTEGRITY_DIR . 'tests/fixtures/hash/*.json' );
		return array_map(
			static function ( $file ) {
				return array( $file );
			},
			$files
		);
	}

	/** @dataProvider hashVectors */
	public function test_frozen_rfc8785_vectors( $file ) {
		$fixture = json_decode( file_get_contents( $file ), true );
		$jcs     = new CanonicalJson();
		$this->assertSame( $fixture['canonical'], $jcs->canonicalize( json_encode( $fixture['value'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) ) );
		$this->assertSame( $fixture['sha256'], $jcs->sha256( json_encode( $fixture['value'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) ) );
	}

	public function test_all_valid_and_invalid_fixtures_use_frozen_validator() {
		$validator = new ContractValidator( OPACE_CONTENT_INTEGRITY_DIR . 'schemas' );
		foreach ( glob( OPACE_CONTENT_INTEGRITY_DIR . 'tests/fixtures/contracts/valid/*.json' ) as $file ) {
			$fixture = json_decode( file_get_contents( $file ) );
			$this->assertTrue( $validator->validate( $fixture->data, $fixture->schema )->isValid(), basename( $file ) );
		}
		foreach ( glob( OPACE_CONTENT_INTEGRITY_DIR . 'tests/fixtures/contracts/invalid/*.json' ) as $file ) {
			$fixture = json_decode( file_get_contents( $file ) );
			$this->assertFalse( $validator->validate( $fixture->data, $fixture->schema )->isValid(), basename( $file ) );
		}
	}
}
