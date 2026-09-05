<?php
/**
 * The block editor's panel.
 *
 * @package Opace\ContentIntegrity
 */

namespace Opace\ContentIntegrity\Editor;

use Opace\ContentIntegrity\Contracts\ServerAnalysisAdapter;
use Opace\ContentIntegrity\Core\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the checker panel in the block editor's document sidebar.
 */
final class BlockEditor {

	/**
	 * The EU route's status, so the panel can say which routes are open.
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
		add_action( 'enqueue_block_editor_assets', array( $this, 'assets' ) );
	}

	public function assets() {
		if ( empty( Settings::get()['editor_sidebar'] ) || ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		wp_enqueue_style( 'oaci-editor', OPACE_CONTENT_INTEGRITY_URL . 'assets/css/editor.css', array( 'wp-edit-blocks' ), OPACE_CONTENT_INTEGRITY_VERSION );
		wp_enqueue_script(
			'oaci-editor-sidebar',
			OPACE_CONTENT_INTEGRITY_URL . 'assets/js/editor-sidebar.js',
			array( 'wp-plugins', 'wp-editor', 'wp-edit-post', 'wp-element', 'wp-data' ),
			OPACE_CONTENT_INTEGRITY_VERSION,
			true
		);
		wp_localize_script(
			'oaci-editor-sidebar',
			'OpaceContentIntegrityEditor',
			EditorConfig::build( (int) get_the_ID(), $this->server_analysis->status() )
		);
	}
}
