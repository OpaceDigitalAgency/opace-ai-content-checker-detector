<?php

namespace Opace\ContentIntegrity\Editor;

use Opace\ContentIntegrity\Core\Settings;

defined( 'ABSPATH' ) || exit;

final class ClassicEditor {
	public function register() {
		add_action( 'add_meta_boxes', array( $this, 'meta_box' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
	}

	/**
	 * Registers the Classic Editor box, and only there.
	 *
	 * The block editor draws its own panel from BlockEditor.php, and both
	 * appearing at once gave an editor two quick checks in one screen. Two guards
	 * keep that from happening: the box is not registered at all on a screen that
	 * is using the block editor, and where it is registered it is marked as a
	 * back-compatibility box, which is the flag the block editor reads to leave a
	 * classic meta box out.
	 */
	public function meta_box() {
		if ( empty( Settings::get()['classic_meta_box'] ) ) {
			return;
		}
		if ( function_exists( 'get_current_screen' ) ) {
			$screen = get_current_screen();
			if ( $screen && method_exists( $screen, 'is_block_editor' ) && $screen->is_block_editor() ) {
				return;
			}
		}
		foreach ( get_post_types( array( 'show_ui' => true ) ) as $type ) {
			add_meta_box(
				'oaci-classic',
				__( 'AI Content Checker quick check', 'opace-ai-content-checker-detector' ),
				array( $this, 'render' ),
				$type,
				'side',
				'default',
				array( '__back_compat_meta_box' => true )
			);
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
		$link_text = $check_url ? __( 'Check this post in the full checker', 'opace-ai-content-checker-detector' ) : __( 'Open the full checker', 'opace-ai-content-checker-detector' );
		echo '<div id="oaci-classic-box"><p>' . esc_html__( 'A quick look at this unsaved draft, run on this site.', 'opace-ai-content-checker-detector' ) . '</p><span class="oaci-editor-scope"><strong>' . esc_html__( 'AI reading: not assessed here.', 'opace-ai-content-checker-detector' ) . '</strong> ' . esc_html__( 'The trained model runs only in the full checker.', 'opace-ai-content-checker-detector' ) . '</span><button type="button" class="button" id="oaci-classic-inspect">' . esc_html__( 'Quick check', 'opace-ai-content-checker-detector' ) . '</button><p id="oaci-classic-status" role="status" aria-live="polite"></p><p><a href="' . esc_url( $link_url ) . '">' . esc_html( $link_text ) . '</a></p></div>';
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
