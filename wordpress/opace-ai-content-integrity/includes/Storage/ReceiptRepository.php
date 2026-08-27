<?php

namespace Opace\ContentIntegrity\Storage;

use Opace\ContentIntegrity\Core\Migrator;
use WP_Error;

defined( 'ABSPATH' ) || exit;

// Receipts are intentionally stored in the accepted ADR 0007 custom table.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching

final class ReceiptRepository {
	public function save( array $receipt, $job_id, $owner_id, $caller, $object_id ) {
		global $wpdb;
		if ( ( new Migrator() )->is_read_only() ) {
			return new WP_Error( 'legacy_storage_detected', __( 'Storage is read-only until the legacy data is reviewed.', 'opace-ai-content-integrity' ) );
		}
		if ( ! empty( $receipt['contains_content'] ) ) {
			return new WP_Error( 'consent_required', __( 'Content-bearing receipts are not enabled in this candidate.', 'opace-ai-content-integrity' ) );
		}
		$table = $wpdb->prefix . 'opace_ci_receipts';
		$json  = wp_json_encode( $receipt, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		$ok    = $wpdb->insert(
			$table,
			array(
				'public_id'        => $receipt['receipt_id'],
				'job_public_id'    => $job_id,
				'owner_user_id'    => absint( $owner_id ),
				'caller'           => sanitize_key( $caller ),
				'caller_object_id' => substr( sanitize_text_field( $object_id ), 0, 191 ),
				'source_hash'      => $receipt['source']['content_hash'],
				'candidate_hash'   => null,
				'receipt_hash'     => $receipt['integrity']['payload_hash'],
				'contains_content' => 0,
				'receipt_json'     => $json,
				'created_at'       => current_time( 'mysql', true ),
			),
			array( '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s' )
		);
		return false === $ok ? new WP_Error( 'receipt_save_failed', __( 'The hash-only receipt could not be saved.', 'opace-ai-content-integrity' ) ) : $receipt;
	}

	public function get_for_job( $job_id, $owner_id ) {
		global $wpdb;
		$table = $wpdb->prefix . 'opace_ci_receipts';
		$json  = $wpdb->get_var( $wpdb->prepare( 'SELECT receipt_json FROM %i WHERE job_public_id = %s AND owner_user_id = %d', $table, $job_id, $owner_id ) );
		return $json ? json_decode( $json, true ) : new WP_Error( 'object_not_found', __( 'The receipt was not found.', 'opace-ai-content-integrity' ), array( 'status' => 404 ) );
	}

	public function list_for_owner( $owner_id, $page = 1, $per_page = 20, $all = false ) {
		global $wpdb;
		$table    = $wpdb->prefix . 'opace_ci_receipts';
		$per_page = max( 1, min( 50, absint( $per_page ) ) );
		$offset   = ( max( 1, absint( $page ) ) - 1 ) * $per_page;
		if ( $all ) {
			$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT public_id, job_public_id, caller, receipt_hash, created_at FROM %i ORDER BY id DESC LIMIT %d OFFSET %d', $table, $per_page, $offset ), ARRAY_A );
		} else {
			$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT public_id, job_public_id, caller, receipt_hash, created_at FROM %i WHERE owner_user_id = %d ORDER BY id DESC LIMIT %d OFFSET %d', $table, $owner_id, $per_page, $offset ), ARRAY_A );
		}
		return $rows;
	}

	public function delete( $public_id, $owner_id, $all = false ) {
		global $wpdb;
		$table   = $wpdb->prefix . 'opace_ci_receipts';
		$where   = array( 'public_id' => $public_id );
		$formats = array( '%s' );
		if ( ! $all ) {
			$where['owner_user_id'] = absint( $owner_id );
			$formats[]              = '%d';
		}
		return (bool) $wpdb->delete( $table, $where, $formats );
	}

	public function delete_for_job( $job_id, $owner_id ) {
		global $wpdb;
		$table = $wpdb->prefix . 'opace_ci_receipts';
		return (bool) $wpdb->delete(
			$table,
			array(
				'job_public_id' => $job_id,
				'owner_user_id' => absint( $owner_id ),
			),
			array( '%s', '%d' )
		);
	}
}
