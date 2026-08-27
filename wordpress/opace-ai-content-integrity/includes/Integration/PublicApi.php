<?php

namespace Opace\ContentIntegrity\Integration;

use Opace\ContentIntegrity\Contracts\SourceAdapter;
use Opace\ContentIntegrity\Receipts\ReceiptService;
use Opace\ContentIntegrity\Rewrite\SessionService;
use WP_Error;

defined( 'ABSPATH' ) || exit;

final class PublicApi {
	private static $instance;
	private $sessions;
	private $receipts;
	private $adapters = array();

	public static function instance() {
		if ( ! self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	public function configure( SessionService $sessions, ReceiptService $receipts, SourceAdapter $default_adapter ) {
		$this->sessions = $sessions;
		$this->receipts = $receipts;
		$this->register_source_adapter( $default_adapter );
	}

	public function version() {
		return OPACE_CONTENT_INTEGRITY_VERSION; }
	public function is_compatible( $constraint ) {
		return is_string( $constraint ) && ( '1' === $constraint || '1.0' === $constraint || 0 === strpos( $constraint, '^1' ) || 0 === strpos( $constraint, '1.' ) ); }
	public function capabilities() {
		return array(
			'product'          => 'opace-ai-content-integrity',
			'version'          => $this->version(),
			'contract_version' => '1.0.0',
			'routes'           => array( 'wordpress_local' ),
			'generation'       => 'not_configured',
			'methods'          => array(
				array(
					'id'     => 'watermark.anthropic',
					'state'  => 'unsupported',
					'reason' => 'official_detector_unavailable',
				),
			),
		);
	}
	public function register_source_adapter( SourceAdapter $adapter ) {
		$this->adapters[ $adapter->id() ] = $adapter;
		return true; }
	public function create_session( array $request ) {
		$idempotency_key = isset( $request['idempotency_key'] ) ? (string) $request['idempotency_key'] : '';
		unset( $request['idempotency_key'] );
		return $this->ready() ? $this->sessions->create( $request, get_current_user_id(), $idempotency_key ) : $this->unavailable(); }
	public function get_session( $uuid ) {
		return $this->ready() ? $this->sessions->get( sanitize_text_field( $uuid ), get_current_user_id() ) : $this->unavailable(); }
	public function approve( $uuid, array $selection ) {
		unset( $uuid, $selection );
		return $this->ready() ? $this->sessions->unavailable_approval() : $this->unavailable(); }
	public function get_approved_output( $uuid, $receipt_uuid ) {
		unset( $uuid, $receipt_uuid );
		return $this->ready() ? $this->sessions->unavailable_approval() : $this->unavailable(); }
	public function mark_applied( $uuid, $receipt_uuid, $output_hash ) {
		unset( $uuid, $receipt_uuid, $output_hash );
		return $this->ready() ? $this->sessions->unavailable_approval() : $this->unavailable(); }
	public function get_receipt( $uuid ) {
		return $this->ready() ? $this->receipts->get( sanitize_text_field( $uuid ), get_current_user_id() ) : $this->unavailable(); }
	public function asset_handles() {
		return array(
			'style'  => 'oaci-lab',
			'script' => 'oaci-lab-app',
			'module' => 'oaci-core',
		); }

	private function ready() {
		return $this->sessions && $this->receipts; }
	private function unavailable() {
		return new WP_Error( 'method_not_configured', __( 'Content Integrity is not ready.', 'opace-ai-content-integrity' ) ); }
}
