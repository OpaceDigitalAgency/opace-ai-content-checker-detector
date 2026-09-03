<?php

namespace Opace\ContentIntegrity\Adapters;

use Opace\ContentIntegrity\Contracts\ServerAnalysisChannel;
use WP_Error;

defined( 'ABSPATH' ) || exit;

final class UnavailableServerAnalysisChannel implements ServerAnalysisChannel {
	public function available() {
		return false;
	}

	/**
	 * A build with no channel has a settled answer, so a screen states it
	 * rather than saying it is still checking.
	 */
	public function status_known() {
		return true;
	}

	public function probe() {
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
