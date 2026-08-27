<?php

namespace Opace\ContentIntegrity\Core;

defined( 'ABSPATH' ) || exit;

final class Capabilities {
	public static function can_inspect( $post_id = 0 ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return false;
		}
		return ! $post_id || current_user_can( 'edit_post', absint( $post_id ) );
	}

	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}
}
