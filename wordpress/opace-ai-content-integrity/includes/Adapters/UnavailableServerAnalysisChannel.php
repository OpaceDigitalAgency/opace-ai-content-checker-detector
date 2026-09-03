<?php

namespace Opace\ContentIntegrity\Adapters;

use Opace\ContentIntegrity\Contracts\ServerAnalysisChannel;
use WP_Error;

defined( 'ABSPATH' ) || exit;

final class UnavailableServerAnalysisChannel implements ServerAnalysisChannel {
	public function available() {
		return false;
	}

	public function authorise( array $request_args ) {
		return new WP_Error(
			'server_channel_unavailable',
			__( 'The Opace EU server route is not available in this build.', 'opace-ai-content-integrity' ),
			array( 'status' => 503 )
		);
	}

	public function limits() {
		return array_fill_keys( ServiceStatus::figure_names(), null );
	}
}
