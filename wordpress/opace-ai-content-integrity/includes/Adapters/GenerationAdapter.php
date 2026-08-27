<?php

namespace Opace\ContentIntegrity\Adapters;

defined( 'ABSPATH' ) || exit;

interface GenerationAdapter {
	public function id();
	public function capabilities();
	public function generate( array $request );
}
