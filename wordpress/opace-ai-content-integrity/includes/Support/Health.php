<?php

namespace Opace\ContentIntegrity\Support;

use Opace\ContentIntegrity\Core\Migrator;

defined( 'ABSPATH' ) || exit;

final class Health {
	public static function tests( array $tests ) {
		$tests['direct']['oaci_storage'] = array(
			'label' => __( 'Content Integrity storage', 'opace-ai-content-integrity' ),
			'test'  => array( __CLASS__, 'storage_test' ),
		);
		return $tests;
	}

	public static function storage_test() {
		$read_only = ( new Migrator() )->is_read_only();
		return array(
			'label'       => $read_only ? __( 'Content Integrity storage needs review', 'opace-ai-content-integrity' ) : __( 'Content Integrity storage is ready', 'opace-ai-content-integrity' ),
			'status'      => $read_only ? 'critical' : 'good',
			'badge'       => array(
				'label' => __( 'Content Integrity', 'opace-ai-content-integrity' ),
				'color' => 'blue',
			),
			'description' => $read_only ? __( 'The plugin is read-only because conflicting, legacy or newer storage was detected. No content was changed.', 'opace-ai-content-integrity' ) : __( 'The local inspection and hash-only receipt tables are available.', 'opace-ai-content-integrity' ),
			'actions'     => '',
			'test'        => 'oaci_storage',
		);
	}

	public static function debug_information( array $info ) {
		$info['oaci'] = array(
			'label'  => __( 'Opace AI Content Integrity', 'opace-ai-content-integrity' ),
			'fields' => array(
				'plugin_version'   => array(
					'label' => __( 'Plugin version', 'opace-ai-content-integrity' ),
					'value' => OPACE_CONTENT_INTEGRITY_VERSION,
				),
				'contract_version' => array(
					'label' => __( 'Contract version', 'opace-ai-content-integrity' ),
					'value' => '1.0.0',
				),
				'storage_state'    => array(
					'label' => __( 'Storage state', 'opace-ai-content-integrity' ),
					'value' => ( new Migrator() )->is_read_only() ? 'read_only' : 'ready',
				),
				'generation'       => array(
					'label' => __( 'Rewrite generation', 'opace-ai-content-integrity' ),
					'value' => 'not_configured',
				),
				'anthropic'        => array(
					'label' => __( 'Anthropic official verifier', 'opace-ai-content-integrity' ),
					'value' => 'unsupported',
				),
			),
		);
		return $info;
	}
}
