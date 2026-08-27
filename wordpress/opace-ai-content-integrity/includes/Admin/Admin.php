<?php

namespace Opace\ContentIntegrity\Admin;

use Opace\ContentIntegrity\Core\Settings;
use Opace\ContentIntegrity\Storage\ReceiptRepository;

defined( 'ABSPATH' ) || exit;

final class Admin {
	public function register() {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
		add_action( 'admin_notices', array( $this, 'onboarding' ) );
		add_action( 'admin_post_oaci_delete_receipts', array( $this, 'delete_receipts' ) );
		add_filter( 'script_loader_tag', array( $this, 'module_tag' ), 10, 3 );
		add_filter( 'site_status_tests', array( 'Opace\\ContentIntegrity\\Support\\Health', 'tests' ) );
		add_filter( 'debug_information', array( 'Opace\\ContentIntegrity\\Support\\Health', 'debug_information' ) );
	}

	public function menu() {
		add_menu_page( __( 'Content Integrity', 'opace-ai-content-integrity' ), __( 'Content Integrity', 'opace-ai-content-integrity' ), 'edit_posts', 'oaci-lab', array( $this, 'lab' ), 'dashicons-shield-alt', 58 );
		add_submenu_page( 'oaci-lab', __( 'Content Integrity Suite', 'opace-ai-content-integrity' ), __( 'Suite', 'opace-ai-content-integrity' ), 'edit_posts', 'oaci-lab', array( $this, 'lab' ) );
		add_submenu_page( 'oaci-lab', __( 'Content Integrity Receipts', 'opace-ai-content-integrity' ), __( 'Receipts', 'opace-ai-content-integrity' ), 'edit_posts', 'oaci-receipts', array( $this, 'receipts' ) );
		add_submenu_page( 'oaci-lab', __( 'Content Integrity Settings', 'opace-ai-content-integrity' ), __( 'Settings', 'opace-ai-content-integrity' ), 'manage_options', 'oaci-settings', array( $this, 'settings_page' ) );
		add_submenu_page( 'oaci-lab', __( 'Methods and privacy', 'opace-ai-content-integrity' ), __( 'Methods & privacy', 'opace-ai-content-integrity' ), 'manage_options', 'oaci-methods', array( $this, 'methods' ) );
	}

	public function settings() {
		register_setting(
			'oaci_settings',
			Settings::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( 'Opace\\ContentIntegrity\\Core\\Settings', 'sanitise' ),
				'default'           => Settings::defaults(),
			)
		);
	}

	public function assets() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only admin screen selection controls asset loading only.
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
		if ( 0 !== strpos( $page, 'oaci-' ) ) {
			return;
		}
		wp_enqueue_style( 'oaci-admin', OPACE_CONTENT_INTEGRITY_URL . 'assets/css/admin.css', array(), OPACE_CONTENT_INTEGRITY_VERSION );
		wp_enqueue_style( 'oaci-lab', OPACE_CONTENT_INTEGRITY_URL . 'assets/css/lab.css', array( 'oaci-admin' ), OPACE_CONTENT_INTEGRITY_VERSION );
		wp_enqueue_script( 'oaci-config', OPACE_CONTENT_INTEGRITY_URL . 'assets/js/config.js', array(), OPACE_CONTENT_INTEGRITY_VERSION, true );
		wp_localize_script( 'oaci-config', 'OpaceContentIntegrityConfig', $this->config() );
		wp_enqueue_script( 'oaci-lab-app', OPACE_CONTENT_INTEGRITY_URL . 'assets/js/lab-app.mjs', array( 'oaci-config' ), OPACE_CONTENT_INTEGRITY_VERSION, true );
	}

	public function module_tag( $tag, $handle, $src ) {
		if ( 'oaci-lab-app' !== $handle ) {
			return $tag;
		}
		return wp_get_script_tag(
			array(
				'id'   => 'oaci-lab-app-js',
				'type' => 'module',
				'src'  => $src,
			)
		);
	}

	public function onboarding() {
		if ( ! current_user_can( 'manage_options' ) || ! get_transient( 'oaci_show_onboarding' ) ) {
			return;
		}
		delete_transient( 'oaci_show_onboarding' );
		$url = admin_url( 'admin.php?page=oaci-lab' );
		echo '<div class="notice notice-info is-dismissible"><p><strong>' . esc_html__( 'Opace AI Content Integrity is ready for local inspection.', 'opace-ai-content-integrity' ) . '</strong> <a href="' . esc_url( $url ) . '">' . esc_html__( 'Inspect a draft', 'opace-ai-content-integrity' ) . '</a></p></div>';
	}

	public function lab() {
		( new LabPage() )->render();
	}

	public function receipts() {
		$rows = ( new ReceiptRepository() )->list_for_owner( get_current_user_id(), 1, 50, current_user_can( 'manage_options' ) );
		$this->header( __( 'Receipts', 'opace-ai-content-integrity' ), __( 'Hash-only evidence retained by this site.', 'opace-ai-content-integrity' ) );
		echo '<div class="oaci-panel"><form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		echo '<input type="hidden" name="action" value="oaci_delete_receipts">';
		wp_nonce_field( 'oaci_delete_receipts' );
		echo '<table class="widefat striped"><thead><tr><th class="check-column"><span class="screen-reader-text">' . esc_html__( 'Select', 'opace-ai-content-integrity' ) . '</span></th><th>' . esc_html__( 'Date', 'opace-ai-content-integrity' ) . '</th><th>' . esc_html__( 'Surface', 'opace-ai-content-integrity' ) . '</th><th>' . esc_html__( 'Receipt ID', 'opace-ai-content-integrity' ) . '</th><th>' . esc_html__( 'Hash', 'opace-ai-content-integrity' ) . '</th></tr></thead><tbody>';
		if ( empty( $rows ) ) {
			echo '<tr><td colspan="5">' . esc_html__( 'No receipts yet. Inspect a draft to create the first one.', 'opace-ai-content-integrity' ) . '</td></tr>';
		}
		foreach ( $rows as $row ) {
			echo '<tr><th class="check-column"><input type="checkbox" name="receipt_ids[]" value="' . esc_attr( $row['public_id'] ) . '" aria-label="' . esc_attr__( 'Select receipt', 'opace-ai-content-integrity' ) . '"></th><td data-label="' . esc_attr__( 'Date', 'opace-ai-content-integrity' ) . '">' . esc_html( $row['created_at'] ) . '</td><td data-label="' . esc_attr__( 'Surface', 'opace-ai-content-integrity' ) . '">' . esc_html( $row['caller'] ) . '</td><td data-label="' . esc_attr__( 'Receipt ID', 'opace-ai-content-integrity' ) . '"><code>' . esc_html( $row['public_id'] ) . '</code></td><td data-label="' . esc_attr__( 'Hash', 'opace-ai-content-integrity' ) . '"><code>' . esc_html( $row['receipt_hash'] ) . '</code></td></tr>';
		}
		echo '</tbody></table><p><button type="submit" class="button" name="bulk_action" value="delete">' . esc_html__( 'Delete selected receipts', 'opace-ai-content-integrity' ) . '</button></p></form></div></div>';
	}

	public function delete_receipts() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( esc_html__( 'You cannot delete these receipts.', 'opace-ai-content-integrity' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'oaci_delete_receipts' );
		$ids  = isset( $_POST['receipt_ids'] ) && is_array( $_POST['receipt_ids'] ) ? array_slice( array_map( 'sanitize_text_field', wp_unslash( $_POST['receipt_ids'] ) ), 0, 50 ) : array();
		$repo = new ReceiptRepository();
		foreach ( $ids as $id ) {
			if ( preg_match( '/^receipt_[A-Za-z0-9_-]{8,32}$/', $id ) ) {
				$repo->delete( $id, get_current_user_id(), current_user_can( 'manage_options' ) );
			}
		}
		wp_safe_redirect( admin_url( 'admin.php?page=oaci-receipts&deleted=1' ) );
		exit;
	}

	public function settings_page() {
		$value = Settings::get();
		$this->header( __( 'Settings', 'opace-ai-content-integrity' ), __( 'Local inspection and data controls.', 'opace-ai-content-integrity' ) );
		echo '<form method="post" action="options.php" class="oaci-panel">';
		settings_fields( 'oaci_settings' );
		echo '<fieldset><legend class="screen-reader-text">' . esc_html__( 'Editor surfaces', 'opace-ai-content-integrity' ) . '</legend>';
		$this->checkbox( 'editor_sidebar', __( 'Enable block-editor sidebar', 'opace-ai-content-integrity' ), $value );
		$this->checkbox( 'classic_meta_box', __( 'Enable Classic Editor meta box', 'opace-ai-content-integrity' ), $value );
		echo '</fieldset><p><label for="oaci-max-chars"><strong>' . esc_html__( 'Maximum characters', 'opace-ai-content-integrity' ) . '</strong></label><br><input id="oaci-max-chars" name="oaci_settings[max_chars]" type="number" min="10000" max="100000" value="' . esc_attr( $value['max_chars'] ) . '"></p>';
		$this->checkbox( 'delete_data_uninstall', __( 'Delete positively identified plugin data on uninstall', 'opace-ai-content-integrity' ), $value );
		echo '<p class="description">' . esc_html__( 'Content-bearing receipts, event logging, remote engines and provider routes are unavailable in this candidate.', 'opace-ai-content-integrity' ) . '</p>';
		submit_button();
		echo '</form></div>';
	}

	public function methods() {
		$this->header( __( 'Methods & privacy', 'opace-ai-content-integrity' ), __( 'What runs, where it runs and what it can prove.', 'opace-ai-content-integrity' ) );
		echo '<div class="oaci-panel"><h2>' . esc_html__( 'Available locally', 'opace-ai-content-integrity' ) . '</h2><ul><li><code>unicode:2026.08.1</code> — ' . esc_html__( 'characters and mixed scripts', 'opace-ai-content-integrity' ) . '</li><li><code>en-gb:2026.08.1</code> — ' . esc_html__( 'editorial writing patterns', 'opace-ai-content-integrity' ) . '</li><li>' . esc_html__( 'Protected numbers, dates, links, quotations, citations and code', 'opace-ai-content-integrity' ) . '</li></ul><h2>' . esc_html__( 'Unavailable', 'opace-ai-content-integrity' ) . '</h2><p><strong>' . esc_html__( 'Anthropic official verifier: Unsupported.', 'opace-ai-content-integrity' ) . '</strong> ' . esc_html__( 'No official detector call is available. Public watermark or writing-pattern results are not substitutes.', 'opace-ai-content-integrity' ) . '</p><h2>' . esc_html__( 'Privacy', 'opace-ai-content-integrity' ) . '</h2><p>' . esc_html__( 'Browser inspection sends no text over the network. Saving a receipt sends the current text only to this WordPress site; the stored receipt contains hashes and method evidence, not source text.', 'opace-ai-content-integrity' ) . '</p></div></div>';
	}

	private function config() {
		return array(
			'restUrl'       => esc_url_raw( rest_url( 'oaci/v1/' ) ),
			'nonce'         => wp_create_nonce( 'wp_rest' ),
			'apiVersion'    => '1.0',
			'pluginVersion' => OPACE_CONTENT_INTEGRITY_VERSION,
			'maxChars'      => Settings::get()['max_chars'],
			'adminUrl'      => admin_url( 'admin.php?page=oaci-lab' ),
			'strings'       => array(
				'working' => __( 'Inspecting draft…', 'opace-ai-content-integrity' ),
				'error'   => __( 'Inspection could not be completed.', 'opace-ai-content-integrity' ),
			),
		);
	}

	private function header( $title, $description ) {
		echo '<div class="wrap oaci-wrap"><div class="oaci-header"><div class="oaci-mark" aria-hidden="true"><span>1</span><span>2</span><span>3</span></div><div><h1>' . esc_html( $title ) . '</h1><p>' . esc_html( $description ) . '</p></div></div>';
	}

	private function checkbox( $key, $label, array $value ) {
		echo '<p><label><input type="checkbox" name="oaci_settings[' . esc_attr( $key ) . ']" value="1" ' . checked( ! empty( $value[ $key ] ), true, false ) . '> ' . esc_html( $label ) . '</label></p>';
	}
}
