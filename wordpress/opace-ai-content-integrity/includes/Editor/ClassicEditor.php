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

	/**
	 * Renders the quick-check box beside the post.
	 *
	 * @param \WP_Post|null $post The post being edited.
	 */
	public function render( $post = null ) {
		$check_url = $post && isset( $post->ID ) ? \Opace\ContentIntegrity\Admin\Admin::check_post_url( $post->ID ) : '';
		$link_url  = $check_url ? $check_url : admin_url( 'admin.php?page=oaci-lab' );
		$link_text = $check_url ? __( 'Check this post in the full checker', 'opace-ai-content-integrity' ) : __( 'Open the full checker', 'opace-ai-content-integrity' );
		echo '<div id="oaci-classic-box"><p>' . esc_html__( 'A quick look at this unsaved draft, run on this site.', 'opace-ai-content-integrity' ) . '</p><span class="oaci-editor-scope"><strong>' . esc_html__( 'AI reading: not assessed here.', 'opace-ai-content-integrity' ) . '</strong> ' . esc_html__( 'The trained model runs only in the full checker.', 'opace-ai-content-integrity' ) . '</span><button type="button" class="button" id="oaci-classic-inspect">' . esc_html__( 'Quick check', 'opace-ai-content-integrity' ) . '</button><p id="oaci-classic-status" role="status" aria-live="polite"></p><p><a href="' . esc_url( $link_url ) . '">' . esc_html( $link_text ) . '</a></p></div>';
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
