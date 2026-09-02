<?php

namespace Opace\ContentIntegrity\Contracts;

defined( 'ABSPATH' ) || exit;

interface ServerAnalysisChannel {
	public function available();

	public function authorise( array $request_args );
}
