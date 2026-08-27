<?php

namespace Opace\ContentIntegrity\Storage;

use Opace\ContentIntegrity\Core\Migrator;
use WP_Error;

defined( 'ABSPATH' ) || exit;

// Sessions are intentionally stored in the accepted ADR 0007 custom table.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching

final class JobRepository {
	public function find_idempotent( $owner_id, $idempotency_hash, $input_hash, $config_hash ) {
		global $wpdb;
		$table = $wpdb->prefix . 'opace_ci_jobs';
		$row   = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE owner_user_id = %d AND idempotency_key_hash = %s', $table, $owner_id, $idempotency_hash ), ARRAY_A );
		if ( ! $row ) {
			return null;
		}
		if ( ! hash_equals( $row['input_hash'], $input_hash ) || ! hash_equals( $row['config_hash'], $config_hash ) ) {
			return new WP_Error( 'idempotency_conflict', __( 'That idempotency key was already used for a different request.', 'opace-ai-content-integrity' ), array( 'status' => 409 ) );
		}
		return $this->normalise( $row );
	}

	public function create( $owner_id, $caller, $object_id, $input_hash, $config_hash, $idempotency_hash = null ) {
		global $wpdb;
		if ( ( new Migrator() )->is_read_only() ) {
			return new WP_Error( 'legacy_storage_detected', __( 'Storage is read-only until the legacy data is reviewed.', 'opace-ai-content-integrity' ) );
		}
		$table     = $wpdb->prefix . 'opace_ci_jobs';
		$now       = current_time( 'mysql', true );
		$public_id = 'job_' . str_replace( '-', '', wp_generate_uuid4() );
		$inserted  = $wpdb->insert(
			$table,
			array(
				'public_id'            => $public_id,
				'owner_user_id'        => absint( $owner_id ),
				'caller'               => sanitize_key( $caller ),
				'caller_object_id'     => substr( sanitize_text_field( $object_id ), 0, 191 ),
				'state'                => 'accepted',
				'privacy_route'        => 'wordpress_local',
				'input_hash'           => $input_hash,
				'config_hash'          => $config_hash,
				'idempotency_key_hash' => $idempotency_hash,
				'created_at'           => $now,
				'updated_at'           => $now,
			),
			array( '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);
		if ( false === $inserted && $idempotency_hash ) {
			$existing = $this->find_idempotent( $owner_id, $idempotency_hash, $input_hash, $config_hash );
			if ( is_array( $existing ) ) {
				$existing['_oaci_idempotent_replay'] = true;
			}
			return $existing;
		}
		return false === $inserted ? new WP_Error( 'internal_error', __( 'The inspection session could not be created.', 'opace-ai-content-integrity' ) ) : $this->get( $public_id, $owner_id );
	}

	public function get( $public_id, $owner_id ) {
		global $wpdb;
		$table = $wpdb->prefix . 'opace_ci_jobs';
		$row   = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE public_id = %s AND owner_user_id = %d', $table, $public_id, $owner_id ), ARRAY_A );
		return $row ? $this->normalise( $row ) : new WP_Error( 'object_not_found', __( 'The session was not found.', 'opace-ai-content-integrity' ), array( 'status' => 404 ) );
	}

	public function transition( $public_id, $owner_id, $state, $receipt_id = null ) {
		global $wpdb;
		$transitions = array(
			'accepted'         => array( 'validating', 'ready_for_review', 'cancelling', 'failed', 'interrupted' ),
			'validating'       => array( 'protecting', 'ready_for_review', 'cancelling', 'failed', 'interrupted' ),
			'protecting'       => array( 'generating', 'ready_for_review', 'cancelling', 'failed', 'interrupted' ),
			'generating'       => array( 'gating', 'cancelling', 'failed', 'interrupted' ),
			'gating'           => array( 'scoring', 'ready_for_review', 'cancelling', 'failed', 'interrupted' ),
			'scoring'          => array( 'ready_for_review', 'cancelling', 'failed', 'interrupted' ),
			'ready_for_review' => array( 'approved', 'completed_without_approval', 'cancelling', 'failed' ),
			'cancelling'       => array( 'cancelled', 'failed', 'interrupted' ),
		);
		$current     = $this->get( $public_id, $owner_id );
		if ( is_wp_error( $current ) ) {
			return $current;
		}
		if ( $current['state'] === $state ) {
			return $current;
		}
		if ( ! isset( $transitions[ $current['state'] ] ) || ! in_array( $state, $transitions[ $current['state'] ], true ) ) {
			return new WP_Error( 'invalid_request', __( 'Unknown session state.', 'opace-ai-content-integrity' ) );
		}
		$table = $wpdb->prefix . 'opace_ci_jobs';
		$data  = array(
			'state'      => $state,
			'updated_at' => current_time( 'mysql', true ),
		);
		if ( $receipt_id ) {
			$data['result_ref'] = $receipt_id;
		}
		$updated = $wpdb->update(
			$table,
			$data,
			array(
				'public_id'     => $public_id,
				'owner_user_id' => absint( $owner_id ),
				'state'         => $current['state'],
			)
		);
		if ( 1 !== $updated ) {
			$latest = $this->get( $public_id, $owner_id );
			return ! is_wp_error( $latest ) && $latest['state'] === $state ? $latest : new WP_Error( 'state_conflict', __( 'The session changed during this request. Refresh and try again.', 'opace-ai-content-integrity' ), array( 'status' => 409 ) );
		}
		return $this->get( $public_id, $owner_id );
	}

	public function delete( $public_id, $owner_id ) {
		global $wpdb;
		$table = $wpdb->prefix . 'opace_ci_jobs';
		return (bool) $wpdb->delete(
			$table,
			array(
				'public_id'     => $public_id,
				'owner_user_id' => absint( $owner_id ),
			),
			array( '%s', '%d' )
		);
	}

	private function normalise( array $row ) {
		return array(
			'schema_version'   => '1.0',
			'contract_version' => '1.0.0',
			'job_id'           => $row['public_id'],
			'request_id'       => 'request_' . substr( $row['config_hash'], 7, 16 ),
			'state'            => $row['state'],
			'transitions'      => array(),
			'candidates'       => array(),
			'created_at'       => gmdate( 'c', strtotime( $row['created_at'] . ' UTC' ) ),
			'updated_at'       => gmdate( 'c', strtotime( $row['updated_at'] . ' UTC' ) ),
			'receipt_id'       => isset( $row['result_ref'] ) ? $row['result_ref'] : null,
			'source_hash'      => $row['input_hash'],
			'caller'           => $row['caller'],
			'caller_object_id' => $row['caller_object_id'],
		);
	}
}
