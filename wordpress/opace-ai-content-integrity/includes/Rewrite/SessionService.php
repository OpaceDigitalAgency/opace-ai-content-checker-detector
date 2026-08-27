<?php

namespace Opace\ContentIntegrity\Rewrite;

use Opace\ContentIntegrity\Analysis\DeterministicAnalyser;
use Opace\ContentIntegrity\Contracts\CanonicalJson;
use Opace\ContentIntegrity\Integration\WordPressPostSource;
use Opace\ContentIntegrity\Storage\JobRepository;
use Opace\ContentIntegrity\Receipts\ReceiptService;
use WP_Error;

defined( 'ABSPATH' ) || exit;

final class SessionService {
	private $jobs;
	private $analyser;
	private $source;
	private $receipts;

	public function __construct( JobRepository $jobs, DeterministicAnalyser $analyser, WordPressPostSource $source ) {
		$this->jobs     = $jobs;
		$this->analyser = $analyser;
		$this->source   = $source;
	}

	public function set_receipt_service( ReceiptService $receipts ) {
		$this->receipts = $receipts;
	}

	public function create( array $request, $actor_id, $idempotency_key = '' ) {
		$context    = isset( $request['context'] ) && is_array( $request['context'] ) ? $request['context'] : array();
		$caller     = isset( $context['caller'] ) ? sanitize_key( $context['caller'] ) : 'standalone';
		$object_id  = isset( $context['caller_object_id'] ) ? sanitize_text_field( $context['caller_object_id'] ) : 'paste:' . $actor_id;
		$source     = isset( $request['source'] ) && is_array( $request['source'] ) ? $request['source'] : array();
		$content    = isset( $source['content'] ) && is_string( $source['content'] ) ? $source['content'] : '';
		$input_hash = 'sha256:' . hash( 'sha256', $content );

		if ( 0 === strpos( $object_id, 'post:' ) && ! $this->source->can_read( $object_id, $actor_id ) ) {
			return new WP_Error( 'object_not_found', __( 'The source was not found.', 'opace-ai-content-integrity' ), array( 'status' => 404 ) );
		}
		$config                      = $request;
		$config['source']['content'] = '';
		$config_hash                 = 'sha256:' . ( new CanonicalJson() )->sha256( wp_json_encode( $config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
		$idempotency                 = '' !== $idempotency_key ? 'sha256:' . hash( 'sha256', $actor_id . '|' . $idempotency_key ) : null;
		if ( $idempotency ) {
			$existing = $this->jobs->find_idempotent( $actor_id, $idempotency, $input_hash, $config_hash );
			if ( is_wp_error( $existing ) ) {
				return $existing;
			}
			if ( $existing ) {
				$analysis = $this->analyser->analyse( $request );
				$receipt  = ! empty( $request['privacy']['save_receipt'] ) && $this->receipts ? $this->receipts->get( $existing['job_id'], $actor_id ) : null;
				return array(
					'session'  => $existing,
					'analysis' => $analysis,
					'receipt'  => is_wp_error( $receipt ) ? null : $receipt,
				);
			}
		}
		$analysis = $this->analyser->analyse( $request );
		if ( is_wp_error( $analysis ) ) {
			return $analysis;
		}
		$job = $this->jobs->create( $actor_id, $caller, $object_id, $input_hash, $config_hash, $idempotency );
		if ( is_wp_error( $job ) ) {
			return $job;
		}
		if ( ! empty( $job['_oaci_idempotent_replay'] ) ) {
			unset( $job['_oaci_idempotent_replay'] );
			$receipt = ! empty( $request['privacy']['save_receipt'] ) && $this->receipts ? $this->receipts->get( $job['job_id'], $actor_id ) : null;
			return array(
				'session'  => $job,
				'analysis' => $analysis,
				'receipt'  => is_wp_error( $receipt ) ? null : $receipt,
			);
		}
		$receipt = ! empty( $request['privacy']['save_receipt'] ) && $this->receipts ? $this->receipts->create_inspection( $analysis, $job['job_id'], $actor_id, $caller, $object_id ) : null;
		if ( is_wp_error( $receipt ) ) {
			$this->jobs->transition( $job['job_id'], $actor_id, 'failed' );
			return $receipt;
		}
		$job = $this->jobs->transition( $job['job_id'], $actor_id, 'ready_for_review', isset( $receipt['receipt_id'] ) ? $receipt['receipt_id'] : null );
		return array(
			'session'  => $job,
			'analysis' => $analysis,
			'receipt'  => $receipt,
		);
	}

	public function get( $uuid, $actor_id ) {
		return $this->jobs->get( $uuid, $actor_id );
	}

	public function delete( $uuid, $actor_id ) {
		if ( $this->receipts ) {
			$this->receipts->delete_for_job( $uuid, $actor_id );
		}
		return $this->jobs->delete( $uuid, $actor_id );
	}

	public function unavailable_candidate() {
		return new WP_Error( 'provider_not_configured', __( 'Rewrite generation is unavailable until an approved local or Hub route is configured.', 'opace-ai-content-integrity' ), array( 'status' => 409 ) );
	}

	public function unavailable_approval() {
		return new WP_Error( 'method_not_configured', __( 'There is no approved candidate to apply.', 'opace-ai-content-integrity' ), array( 'status' => 409 ) );
	}
}
