<?php
/**
 * The Classic Editor's box.
 *
 * @package Opace\ContentIntegrity
 */

namespace Opace\ContentIntegrity\Editor;

use Opace\ContentIntegrity\Contracts\ServerAnalysisAdapter;
use Opace\ContentIntegrity\Core\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the checker box in the Classic Editor's right-hand column.
 */
final class ClassicEditor {

	/**
	 * The EU route's status, so the box can say which routes are open.
	 *
	 * @var ServerAnalysisAdapter
	 */
	private $server_analysis;

	/**
	 * Holds the adapter the panel's route line is drawn from.
	 *
	 * @param ServerAnalysisAdapter $server_analysis The EU route adapter.
	 */
	public function __construct( ServerAnalysisAdapter $server_analysis ) {
		$this->server_analysis = $server_analysis;
	}

	public function register() {
		add_action( 'add_meta_boxes', array( $this, 'meta_box' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
	}

	/**
	 * Registers the Classic Editor box, and only there.
	 *
	 * The block editor draws its own panel from BlockEditor.php, and both
	 * appearing at once gave an editor two checkers in one screen. Two guards
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
				__( 'AI Content Checker', 'opace-ai-content-checker-detector' ),
				array( $this, 'render' ),
				$type,
				'side',
				'default',
				array( '__back_compat_meta_box' => true )
			);
		}
	}

	/**
	 * Renders the box's mounting point and the sentence a reader sees if the
	 * panel cannot start at all.
	 *
	 * The panel is drawn by `assets/js/editor-panel.mjs`, the same module the
	 * block editor's sidebar uses, so there is no second copy of the markup here
	 * to fall out of step with it.
	 *
	 * @param \WP_Post|null $post The post being edited.
	 */
	public function render( $post = null ) {
		$link = $post && isset( $post->ID ) ? \Opace\ContentIntegrity\Admin\Admin::check_post_url( (int) $post->ID ) : '';
		if ( '' === $link ) {
			$link = admin_url( 'admin.php?page=oaci-lab' );
		}
		echo '<div id="oaci-classic-box" class="oaci-ed"><p class="oaci-ed__boot">'
			. esc_html__( 'Starting the checker…', 'opace-ai-content-checker-detector' )
			. ' <a href="' . esc_url( $link ) . '">' . esc_html__( 'Open the full checker', 'opace-ai-content-checker-detector' ) . '</a></p></div>';
	}

	public function assets( $hook ) {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) || ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		if ( empty( Settings::get()['classic_meta_box'] ) ) {
			return;
		}
		wp_enqueue_style( 'oaci-editor', OPACE_CONTENT_INTEGRITY_URL . 'assets/css/editor.css', array(), OPACE_CONTENT_INTEGRITY_VERSION );
		wp_enqueue_script( 'oaci-classic-editor', OPACE_CONTENT_INTEGRITY_URL . 'assets/js/classic-editor.js', array(), OPACE_CONTENT_INTEGRITY_VERSION, true );
		wp_localize_script(
			'oaci-classic-editor',
			'OpaceContentIntegrityEditor',
			EditorConfig::build( (int) get_the_ID(), $this->server_analysis->status() )
		);
	}
}
