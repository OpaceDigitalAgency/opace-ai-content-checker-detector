<?php

namespace Opace\ContentIntegrity\Contracts;

defined( 'ABSPATH' ) || exit;

interface ServerAnalysisAdapter {
	public function status();

	public function analyse( $text, $request_id );
}
