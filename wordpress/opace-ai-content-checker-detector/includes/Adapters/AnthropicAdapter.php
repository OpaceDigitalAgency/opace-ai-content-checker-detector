<?php

namespace Opace\ContentIntegrity\Adapters;

use WP_Error;

defined( 'ABSPATH' ) || exit;

final class AnthropicAdapter implements GenerationAdapter {
	public function id() {
		return 'watermark.anthropic'; }
	public function capabilities() {
		return array(
			'id'       => $this->id(),
			'category' => 'watermark',
			'version'  => 'adapter-placeholder/1',
			'state'    => 'unsupported',
			'reason'   => 'official_detector_unavailable',
		);
	}
	public function generate( array $request ) {
		return new WP_Error( 'method_unsupported', __( 'No official Anthropic detector interface is available.', 'opace-ai-content-checker-detector' ) );
	}
}
