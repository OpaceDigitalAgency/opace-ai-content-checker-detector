<?php

namespace Opace\ContentIntegrity\Contracts;

defined( 'ABSPATH' ) || exit;

interface SourceAdapter {
	public function id();
	public function can_read( $source_ref, $actor_id );
	public function get_content( $source_ref, array $working_copy = array() );
	public function content_hash( $content );
	public function label( $source_ref );
	public function url( $source_ref );
}
