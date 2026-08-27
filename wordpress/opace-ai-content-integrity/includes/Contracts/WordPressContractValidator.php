<?php

namespace Opace\ContentIntegrity\Contracts;

use WP_Error;

defined( 'ABSPATH' ) || exit;

final class WordPressContractValidator {
	private $validator;

	public function __construct() {
		$this->validator = class_exists( 'Opace\\ContentIntegrity\\Contracts\\ContractValidator' )
			? new ContractValidator( OPACE_CONTENT_INTEGRITY_DIR . 'schemas' )
			: null;
	}

	public function validate( $value, $schema_file ) {
		if ( ! $this->validator ) {
			return new WP_Error( 'contract_validator_unavailable', __( 'The reviewed contract validator is unavailable.', 'opace-ai-content-integrity' ), array( 'status' => 500 ) );
		}
		$outcome = $this->validator->validate( json_decode( wp_json_encode( $value ) ), $schema_file );
		if ( $outcome->isValid() ) {
			return true;
		}
		return new WP_Error(
			'invalid_request',
			__( 'The request does not match the content-integrity contract.', 'opace-ai-content-integrity' ),
			array(
				'status'      => 400,
				'error_count' => count( $outcome->errors() ),
			)
		);
	}
}
