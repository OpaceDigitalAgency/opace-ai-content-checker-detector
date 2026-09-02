<?php

namespace Opace\ContentIntegrity\Editor;

use Opace\ContentIntegrity\Core\Settings;

defined( 'ABSPATH' ) || exit;

final class BlockEditor {
	public function register() {
		add_action( 'enqueue_block_editor_assets', array( $this, 'assets' ) );
	}

	public function assets() {
		if ( empty( Settings::get()['editor_sidebar'] ) || ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		wp_enqueue_style( 'oaci-editor', OPACE_CONTENT_INTEGRITY_URL . 'assets/css/editor.css', array( 'wp-edit-blocks' ), OPACE_CONTENT_INTEGRITY_VERSION );
		wp_enqueue_script( 'oaci-editor-sidebar', OPACE_CONTENT_INTEGRITY_URL . 'assets/js/editor-sidebar.js', array( 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-components', 'wp-data', 'wp-api-fetch' ), OPACE_CONTENT_INTEGRITY_VERSION, true );
		wp_localize_script(
			'oaci-editor-sidebar',
			'OpaceContentIntegrityEditor',
			array(
				'restPath' => '/oaci/v1/analysis',
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'labUrl'   => admin_url( 'admin.php?page=oaci-lab' ),
				'checkUrl' => \Opace\ContentIntegrity\Admin\Admin::check_post_url( (int) get_the_ID() ),
			)
		);
	}
}
