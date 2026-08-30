<?php

namespace Opace\ContentIntegrity\Editor;

use Opace\ContentIntegrity\Core\Settings;

defined( 'ABSPATH' ) || exit;

final class ClassicEditor {
	public function register() {
		add_action( 'add_meta_boxes', array( $this, 'meta_box' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
	}

	public function meta_box() {
		if ( empty( Settings::get()['classic_meta_box'] ) ) {
			return;
		}
		foreach ( get_post_types( array( 'show_ui' => true ) ) as $type ) {
			add_meta_box( 'oaci-classic', __( 'Content integrity', 'opace-ai-content-integrity' ), array( $this, 'render' ), $type, 'side', 'default' );
		}
	}

	public function render() {
		echo '<div id="oaci-classic-box"><p>' . esc_html__( 'Run a quick server-side check on this unsaved working copy. It is a subset of the full engine, not the same check.', 'opace-ai-content-integrity' ) . '</p><button type="button" class="button" id="oaci-classic-inspect">' . esc_html__( 'Quick check', 'opace-ai-content-integrity' ) . '</button><p id="oaci-classic-status" role="status" aria-live="polite"></p><p><a href="' . esc_url( admin_url( 'admin.php?page=oaci-lab' ) ) . '">' . esc_html__( 'Open full lab — runs every check', 'opace-ai-content-integrity' ) . '</a></p></div>';
	}

	public function assets( $hook ) {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) || ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		wp_enqueue_style( 'oaci-editor', OPACE_CONTENT_INTEGRITY_URL . 'assets/css/editor.css', array(), OPACE_CONTENT_INTEGRITY_VERSION );
		wp_enqueue_script( 'oaci-classic-editor', OPACE_CONTENT_INTEGRITY_URL . 'assets/js/classic-editor.js', array( 'wp-api-fetch' ), OPACE_CONTENT_INTEGRITY_VERSION, true );
		wp_localize_script(
			'oaci-classic-editor',
			'OpaceContentIntegrityEditor',
			array(
				'restPath' => '/oaci/v1/analysis',
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'labUrl'   => admin_url( 'admin.php?page=oaci-lab' ),
			)
		);
	}
}
