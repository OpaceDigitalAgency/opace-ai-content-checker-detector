<?php

namespace Opace\ContentIntegrity\Receipts;

use Opace\ContentIntegrity\Contracts\CanonicalJson;
use Opace\ContentIntegrity\Storage\ReceiptRepository;

defined( 'ABSPATH' ) || exit;

final class ReceiptService {
	private $repository;

	public function __construct( ReceiptRepository $repository ) {
		$this->repository = $repository;
	}

	public function create_inspection( array $analysis, $job_id, $owner_id, $caller, $object_id ) {
		$receipt = array(
			'schema_version'   => '1.0',
			'contract_version' => '1.0.0',
			'product_version'  => OPACE_CONTENT_INTEGRITY_VERSION,
			'receipt_id'       => 'receipt_' . str_replace( '-', '', wp_generate_uuid4() ),
			'created_at'       => gmdate( 'c' ),
			'source'           => $analysis['source'],
			'policy'           => array(
				'id'               => 'inspection-hash-only',
				'version'          => '1.0.0',
				'requested_checks' => wp_list_pluck( $analysis['methods'], 'id' ),
				'allowed_routes'   => array( 'wordpress_local' ),
				'retain_content'   => false,
			),
			'methods'          => $analysis['methods'],
			'rewrite'          => null,
			'approval'         => array( 'scope' => 'none' ),
			'limitations'      => array( 'This receipt records named checks and does not prove human authorship.' ),
			'contains_content' => false,
			'integrity'        => array(
				'canonicalisation' => 'RFC8785',
				'payload_hash'     => 'sha256:' . str_repeat( '0', 64 ),
			),
		);
		$payload = $receipt;
		unset( $payload['integrity']['payload_hash'] );
		unset( $payload['integrity']['signature'] );
		$canonical                            = ( new CanonicalJson() )->canonicalize( wp_json_encode( $payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
		$receipt['integrity']['payload_hash'] = 'sha256:' . hash( 'sha256', $canonical );
		return $this->repository->save( $receipt, $job_id, $owner_id, $caller, $object_id );
	}

	public function get( $job_id, $owner_id ) {
		return $this->repository->get_for_job( $job_id, $owner_id );
	}

	public function list_receipts( $owner_id, $page, $per_page, $all = false ) {
		return $this->repository->list_for_owner( $owner_id, $page, $per_page, $all );
	}

	public function delete_for_job( $job_id, $owner_id ) {
		return $this->repository->delete_for_job( $job_id, $owner_id );
	}
}
