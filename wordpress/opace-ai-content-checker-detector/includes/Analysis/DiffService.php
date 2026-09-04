<?php

namespace Opace\ContentIntegrity\Analysis;

defined( 'ABSPATH' ) || exit;

final class DiffService {
	public function compare( $source, $candidate ) {
		return array(
			'version'      => 'bounded-lines:1.0.0',
			'change_count' => hash_equals( (string) $source, (string) $candidate ) ? 0 : 1,
			'source_hash'  => 'sha256:' . hash( 'sha256', $source ),
			'target_hash'  => 'sha256:' . hash( 'sha256', $candidate ),
		);
	}
}
