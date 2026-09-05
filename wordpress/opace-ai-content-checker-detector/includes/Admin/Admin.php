<?php

namespace Opace\ContentIntegrity\Admin;

use Opace\ContentIntegrity\Core\Settings;
use Opace\ContentIntegrity\Contracts\ServerAnalysisAdapter;
use Opace\ContentIntegrity\Rest\ServerRateLimiter;
use Opace\ContentIntegrity\Storage\ReceiptRepository;

defined( 'ABSPATH' ) || exit;

final class Admin {
	/**
	 * The model directory shipped with the plugin. This value is pinned in code
	 * and is never editable from the admin screens.
	 */
	const SHIPPED_MODEL_BASE_URL = 'https://opace.agency/models/local-signals-v1/';

	/**
	 * The pinned facts about the on-device download, so the consent card can
	 * state the exact size and hash rather than a vague reassurance. These
	 * mirror CYCLE5_MODEL_* in assets/vendor/cycle5/index.js and a packaging
	 * test fails if the two ever drift apart.
	 */
	const MODEL_FILE           = 'tier3-cycle5-full-e5small-int8-perchannel.onnx';
	const MODEL_BYTES          = 34301767;
	const MODEL_SHA256         = '9f57d6a8fe48a329170c5272f4f09a08ed383f9f461e7900fecd70f9fb15ef1b';
	const MODEL_DOWNLOAD_LABEL = '34.5 MB';

	/** Below this the trained model has too little text to read. */
	const MODEL_MIN_WORDS = 60;

	private $server_analysis;

	public function __construct( ServerAnalysisAdapter $server_analysis ) {
		$this->server_analysis = $server_analysis;
	}

	public function register() {
		add_action( 'rest_api_init', array( new PostPicker(), 'register_routes' ) );
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
		add_action( 'admin_notices', array( $this, 'onboarding' ) );
		add_action( 'admin_post_oaci_delete_receipts', array( $this, 'delete_receipts' ) );
		add_filter( 'post_row_actions', array( $this, 'row_action' ), 10, 2 );
		add_filter( 'page_row_actions', array( $this, 'row_action' ), 10, 2 );
		add_filter( 'script_loader_tag', array( $this, 'module_tag' ), 10, 3 );
		add_filter( 'site_status_tests', array( 'Opace\\ContentIntegrity\\Support\\Health', 'tests' ) );
		add_filter( 'debug_information', array( 'Opace\\ContentIntegrity\\Support\\Health', 'debug_information' ) );
	}

	public function menu() {
		add_menu_page( __( 'Opace AI Content Checker & Detector', 'opace-ai-content-checker-detector' ), __( 'AI Content Checker', 'opace-ai-content-checker-detector' ), 'edit_posts', 'oaci-lab', array( $this, 'lab' ), 'dashicons-shield-alt', 58 );
		add_submenu_page( 'oaci-lab', __( 'Opace AI Content Checker & Detector', 'opace-ai-content-checker-detector' ), __( 'Checker', 'opace-ai-content-checker-detector' ), 'edit_posts', 'oaci-lab', array( $this, 'lab' ) );
		add_submenu_page( 'oaci-lab', __( 'Receipts · Opace AI Content Checker & Detector', 'opace-ai-content-checker-detector' ), __( 'Receipts', 'opace-ai-content-checker-detector' ), 'edit_posts', 'oaci-receipts', array( $this, 'receipts' ) );
		add_submenu_page( 'oaci-lab', __( 'Settings · Opace AI Content Checker & Detector', 'opace-ai-content-checker-detector' ), __( 'Settings', 'opace-ai-content-checker-detector' ), 'manage_options', 'oaci-settings', array( $this, 'settings_page' ) );
		add_submenu_page( 'oaci-lab', __( 'Methods & privacy · Opace AI Content Checker & Detector', 'opace-ai-content-checker-detector' ), __( 'Methods & privacy', 'opace-ai-content-checker-detector' ), 'manage_options', 'oaci-methods', array( $this, 'methods' ) );
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

	/**
	 * Mark the plugin's own screens on `<body>`.
	 *
	 * The stylesheet needs to paint the page behind the plugin, not only the
	 * cards on it: WordPress keeps the content area light under every admin
	 * colour scheme, so on the one scheme this plugin follows into dark the
	 * header, the footer and the primary button were drawing pale ink straight
	 * onto WordPress's own light grey. The class is added on these screens only,
	 * so nothing else in the admin is repainted.
	 *
	 * @param string $classes The classes WordPress has assembled.
	 * @return string
	 */
	public function body_class( $classes ) {
		return $this->is_plugin_screen() ? trim( $classes . ' oaci-screen' ) : $classes;
	}

	/**
	 * Whether the screen being rendered is one of this plugin's.
	 *
	 * @return bool
	 */
	private function is_plugin_screen() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only admin screen selection controls asset loading only.
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
		return 0 === strpos( $page, 'oaci-' );
	}

	public function assets() {
		if ( ! $this->is_plugin_screen() ) {
			return;
		}
		wp_enqueue_style( 'oaci-admin', OPACE_CONTENT_INTEGRITY_URL . 'assets/css/admin.css', array(), OPACE_CONTENT_INTEGRITY_VERSION );
		wp_enqueue_style( 'oaci-opace-footer', OPACE_CONTENT_INTEGRITY_URL . 'assets/css/opace-footer.css', array( 'oaci-admin' ), OPACE_CONTENT_INTEGRITY_VERSION );
		wp_enqueue_style( 'oaci-checker-ui', OPACE_CONTENT_INTEGRITY_URL . 'assets/vendor/shared/presentation/checker-ui.css', array( 'oaci-admin' ), OPACE_CONTENT_INTEGRITY_VERSION );
		wp_enqueue_style( 'oaci-lab', OPACE_CONTENT_INTEGRITY_URL . 'assets/css/lab.css', array( 'oaci-checker-ui' ), OPACE_CONTENT_INTEGRITY_VERSION );
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

	/**
	 * Adds "Check with AI Content Checker" to the Posts and Pages list tables.
	 *
	 * The link carries the post id and a nonce, never the post's text. The
	 * checker screen then fetches the content through the authenticated REST
	 * route, which checks edit_post for that exact post again.
	 *
	 * @param array    $actions Existing row actions.
	 * @param \WP_Post $post    The row's post.
	 * @return array
	 */
	public function row_action( $actions, $post ) {
		if ( ! is_array( $actions ) || ! $post || 'trash' === $post->post_status ) {
			return $actions;
		}
		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			return $actions;
		}
		$url                   = wp_nonce_url(
			add_query_arg(
				array(
					'page'      => 'oaci-lab',
					'oaci_post' => (int) $post->ID,
				),
				admin_url( 'admin.php' )
			),
			'oaci_check_post_' . (int) $post->ID,
			'oaci_nonce'
		);
		$actions['oaci_check'] = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Check with AI Content Checker', 'opace-ai-content-checker-detector' ) . '</a>';
		return $actions;
	}

	/**
	 * The checker link for one post, or an empty string when this user may not
	 * edit it. Shared by the row action and both editor panels.
	 *
	 * @param int $post_id The post to check.
	 * @return string
	 */
	public static function check_post_url( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 || ! current_user_can( 'edit_post', $post_id ) ) {
			return '';
		}
		return wp_nonce_url(
			add_query_arg(
				array(
					'page'      => 'oaci-lab',
					'oaci_post' => $post_id,
				),
				admin_url( 'admin.php' )
			),
			'oaci_check_post_' . $post_id,
			'oaci_nonce'
		);
	}

	public function onboarding() {
		if ( ! current_user_can( 'manage_options' ) || ! get_transient( 'oaci_show_onboarding' ) ) {
			return;
		}
		delete_transient( 'oaci_show_onboarding' );
		$url = admin_url( 'admin.php?page=oaci-lab' );
		echo '<div class="notice notice-info is-dismissible"><p><strong>' . esc_html__( 'Opace AI Content Checker & Detector is ready.', 'opace-ai-content-checker-detector' ) . '</strong> ' . esc_html__( 'Add a draft, choose how it runs, then read what the checks found.', 'opace-ai-content-checker-detector' ) . ' <a href="' . esc_url( $url ) . '">' . esc_html__( 'Open the checker', 'opace-ai-content-checker-detector' ) . '</a></p></div>';
	}

	public function lab() {
		( new LabPage( $this->server_analysis->status(), current_user_can( 'manage_options' ), $this->limits() ) )->render();
		OpaceFooter::render();
	}

	/**
	 * The post the checker screen was opened for, or 0. The nonce and the
	 * per-post capability are both checked here, so the browser is never trusted
	 * with which post it may load.
	 *
	 * @return int
	 */
	private function requested_post_id() {
		if ( ! isset( $_GET['oaci_post'], $_GET['oaci_nonce'] ) ) {
			return 0;
		}
		$post_id = absint( wp_unslash( $_GET['oaci_post'] ) );
		$nonce   = sanitize_text_field( wp_unslash( $_GET['oaci_nonce'] ) );
		if ( $post_id < 1 || ! wp_verify_nonce( $nonce, 'oaci_check_post_' . $post_id ) ) {
			return 0;
		}
		return current_user_can( 'edit_post', $post_id ) ? $post_id : 0;
	}

	public function receipts() {
		$rows = ( new ReceiptRepository() )->list_for_owner( get_current_user_id(), 1, 50, current_user_can( 'manage_options' ) );
		$this->header( __( 'Receipts', 'opace-ai-content-checker-detector' ), __( 'Hash-only evidence this site kept. A receipt holds hashes and check results, never your text.', 'opace-ai-content-checker-detector' ), 'oaci-receipts' );
		echo '<div class="oaci-panel">';
		if ( empty( $rows ) ) {
			echo '<div class="oaci-empty"><span class="oaci-empty__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></svg></span>';
			echo '<h3>' . esc_html__( 'No receipts yet', 'opace-ai-content-checker-detector' ) . '</h3>';
			echo '<p>' . esc_html__( 'Run a check, then choose “Save hash-only receipt” to keep evidence of it here.', 'opace-ai-content-checker-detector' ) . '</p>';
			echo '<a class="oaci-button" href="' . esc_url( admin_url( 'admin.php?page=oaci-lab' ) ) . '">' . esc_html__( 'Open the checker', 'opace-ai-content-checker-detector' ) . '</a></div></div></div>';
			OpaceFooter::render();
			return;
		}
		echo '<h2>' . esc_html__( 'Saved check receipts', 'opace-ai-content-checker-detector' ) . '</h2>';
		echo '<p class="oaci-group__help">' . esc_html__( 'Up to 50 recent receipts are shown below. A hash is a digital fingerprint for matching records; it cannot recover the draft or prove who wrote it. Select only the receipts you want to delete.', 'opace-ai-content-checker-detector' ) . '</p>';
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		echo '<input type="hidden" name="action" value="oaci_delete_receipts">';
		wp_nonce_field( 'oaci_delete_receipts' );
		echo '<div class="oaci-table-wrap"><table class="oaci-table"><thead><tr><th class="check-column"><span class="screen-reader-text">' . esc_html__( 'Select', 'opace-ai-content-checker-detector' ) . '</span></th><th>' . esc_html__( 'Date', 'opace-ai-content-checker-detector' ) . '</th><th>' . esc_html__( 'Where it ran', 'opace-ai-content-checker-detector' ) . '</th><th>' . esc_html__( 'Receipt ID', 'opace-ai-content-checker-detector' ) . '</th><th>' . esc_html__( 'Hash', 'opace-ai-content-checker-detector' ) . '</th></tr></thead><tbody>';
		foreach ( $rows as $row ) {
			echo '<tr><th class="check-column"><input type="checkbox" name="receipt_ids[]" value="' . esc_attr( $row['public_id'] ) . '" aria-label="' . esc_attr( sprintf( /* translators: %s: the receipt identifier. */ __( 'Select receipt %s', 'opace-ai-content-checker-detector' ), $row['public_id'] ) ) . '"></th><td data-label="' . esc_attr__( 'Date', 'opace-ai-content-checker-detector' ) . '">' . esc_html( $row['created_at'] ) . '</td><td data-label="' . esc_attr__( 'Where it ran', 'opace-ai-content-checker-detector' ) . '">' . esc_html( $row['caller'] ) . '</td><td data-label="' . esc_attr__( 'Receipt ID', 'opace-ai-content-checker-detector' ) . '"><code>' . esc_html( $row['public_id'] ) . '</code></td><td data-label="' . esc_attr__( 'Hash', 'opace-ai-content-checker-detector' ) . '"><code>' . esc_html( $row['receipt_hash'] ) . '</code></td></tr>';
		}
		echo '</tbody></table></div><p><button type="submit" class="oaci-button" name="bulk_action" value="delete">' . esc_html__( 'Delete selected receipts', 'opace-ai-content-checker-detector' ) . '</button></p></form></div></div>';
		OpaceFooter::render();
	}

	public function delete_receipts() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( esc_html__( 'You cannot delete these receipts.', 'opace-ai-content-checker-detector' ), '', array( 'response' => 403 ) );
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
		$value  = Settings::get();
		$server = $this->server_analysis->status();
		$this->header( __( 'Settings', 'opace-ai-content-checker-detector' ), __( 'Where checks run, how much text they accept, and what happens when you remove the plugin.', 'opace-ai-content-checker-detector' ), 'oaci-settings' );
		echo '<form method="post" action="options.php" class="oaci-panel">';
		settings_fields( 'oaci_settings' );

		echo '<section class="oaci-group">';
		echo '<h2>' . esc_html__( 'Where editors see the checker', 'opace-ai-content-checker-detector' ) . '</h2>';
		echo '<p class="oaci-group__help">' . esc_html__( 'These run the same checks as the checker screen, beside the post being written: every writing and character rule, and the AI reading through whichever route this site has open. An editor still presses a button that names any transfer or download.', 'opace-ai-content-checker-detector' ) . '</p>';
		$this->switch_row( 'editor_sidebar', __( 'Check in the block editor', 'opace-ai-content-checker-detector' ), __( 'A panel in the sidebar. It reads the unsaved draft, shows the level, the score and the three readings, and opens the full checker with that same reading.', 'opace-ai-content-checker-detector' ), $value );
		$this->switch_row( 'classic_meta_box', __( 'Check in the Classic Editor', 'opace-ai-content-checker-detector' ), __( 'The same panel in the right-hand column. It never appears in the block editor.', 'opace-ai-content-checker-detector' ), $value );
		echo '</section>';

		echo '<section class="oaci-group">';
		echo '<h2>' . esc_html__( 'How much text this site accepts', 'opace-ai-content-checker-detector' ) . '</h2>';
		echo '<p class="oaci-group__help">' . esc_html__( 'A longer draft is refused with a clear message. It is never quietly cut short and checked anyway.', 'opace-ai-content-checker-detector' ) . '</p>';
		echo '<div class="oaci-field"><label for="oaci-max-chars">' . esc_html__( 'Longest draft, in characters', 'opace-ai-content-checker-detector' ) . '</label>';
		echo '<input id="oaci-max-chars" name="oaci_settings[max_chars]" type="number" min="10000" max="100000" value="' . esc_attr( $value['max_chars'] ) . '" aria-describedby="oaci-max-chars-help">';
		echo '<p class="oaci-field__help" id="oaci-max-chars-help">' . esc_html__( 'Between 10,000 and 100,000.', 'opace-ai-content-checker-detector' ) . '</p></div>';
		echo '<div class="oaci-stats">';
		$this->stat( number_format_i18n( (int) $value['max_chars'] ), __( 'characters in one run', 'opace-ai-content-checker-detector' ) );
		$this->stat( number_format_i18n( self::MODEL_MIN_WORDS ), __( 'words needed for an AI reading', 'opace-ai-content-checker-detector' ) );
		$this->stat( '20 MB', __( 'largest file for a Content Credentials check', 'opace-ai-content-checker-detector' ) );
		echo '</div>';
		$this->disclosure( __( 'Every limit, written out', 'opace-ai-content-checker-detector' ), $this->bullets( $this->limits_sentences() ) );
		echo '</section>';

		echo '<section class="oaci-group" aria-labelledby="oaci-server-settings">';
		echo '<h2 id="oaci-server-settings">' . esc_html__( 'Private EU analysis', 'opace-ai-content-checker-detector' ) . '</h2>';
		echo '<p class="oaci-group__help">' . esc_html__( 'The route that sends a draft to our EU server instead of running the model in the browser. It is off until you turn it on.', 'opace-ai-content-checker-detector' ) . '</p>';
		$this->switch_row( 'server_analysis_opt_in', __( 'Let editors choose private EU analysis', 'opace-ai-content-checker-detector' ), __( 'They still have to press a button that names the transfer for each run.', 'opace-ai-content-checker-detector' ), $value );
		echo '<p class="oaci-group__help"><strong>' . esc_html__( 'Right now:', 'opace-ai-content-checker-detector' ) . '</strong> ' . esc_html( $this->server_state_label( $server['state'] ) ) . '</p>';
		echo '<div class="oaci-stats">';
		$this->stat( number_format_i18n( ServerRateLimiter::MINUTE_LIMIT ), __( 'EU runs a minute, for each person', 'opace-ai-content-checker-detector' ) );
		$this->stat( number_format_i18n( ServerRateLimiter::HOUR_LIMIT ), __( 'EU runs an hour, for each person', 'opace-ai-content-checker-detector' ) );
		foreach ( $this->service_figures() as $figure ) {
			$this->stat( $figure['value'], $figure['label'] );
		}
		$this->stat( __( 'No limit', 'opace-ai-content-checker-detector' ), __( 'runs on the editor’s own device', 'opace-ai-content-checker-detector' ) );
		echo '</div>';
		echo '<p class="oaci-field__help">' . esc_html__( 'Figures above come from the service’s own status reply and are only as fresh as the last few minutes. Where it publishes no figure, none is shown.', 'opace-ai-content-checker-detector' ) . '</p>';
		$this->disclosure(
			__( 'What turning this on does', 'opace-ai-content-checker-detector' ),
			$this->para( __( 'Once it is on and the service is reachable, private EU analysis becomes the route the checker offers first, because it needs no download and gives an answer in about a second. An editor still presses a button that names the one-off transfer for that run. The draft goes from their browser to this WordPress site, and once from here to a fixed Opace endpoint. The plugin does not keep that draft, and never puts it in a link, a receipt or a log.', 'opace-ai-content-checker-detector' ) )
			. $this->para( __( 'Running on the editor’s own device stays available whether this is on or off, and the checker offers it in one click whenever the EU route is unavailable, refuses a run or fails.', 'opace-ai-content-checker-detector' ) )
			. $this->para( __( 'You cannot change the destination. It is fixed in the plugin code so that a compromised administrator account, or a copied configuration file, cannot quietly point drafts somewhere else.', 'opace-ai-content-checker-detector' ) )
			. $this->para( __( 'What the draft goes through: it is read once in memory in europe-west1 to produce the reading, and is not kept afterwards. The service reports that it retains nothing, and the plugin refuses any answer that does not.', 'opace-ai-content-checker-detector' ) )
		);
		$this->disclosure( __( 'How the shared allowance is divided', 'opace-ai-content-checker-detector' ), $this->bullets( $this->allowance_sentences() ) );
		echo '</section>';

		echo '<section class="oaci-group">';
		echo '<h2>' . esc_html__( 'The on-device model download', 'opace-ai-content-checker-detector' ) . '</h2>';
		echo '<p class="oaci-group__help">' . esc_html__( 'Nothing to set here. This is what an editor is asked to download the first time they run on their own device.', 'opace-ai-content-checker-detector' ) . '</p>';
		echo '<div class="oaci-stats">';
		$this->stat( self::MODEL_DOWNLOAD_LABEL, __( 'of model weights, once, then cached', 'opace-ai-content-checker-detector' ) );
		$this->stat( 'SHA-256', __( 'checked before anything reads the file', 'opace-ai-content-checker-detector' ) );
		$this->stat( __( 'One click', 'opace-ai-content-checker-detector' ), __( 'to remove it again from the checker', 'opace-ai-content-checker-detector' ) );
		echo '</div>';
		$this->disclosure(
			__( 'What editors are asked to download', 'opace-ai-content-checker-detector' ),
			$this->para( $this->model_download_sentence() )
			. $this->para( __( 'The program that reads the file is the inference engine bundled inside this plugin and served from your own site. No executable code is fetched from anywhere else, and the draft is never sent with the download request.', 'opace-ai-content-checker-detector' ) )
		);
		echo '</section>';

		echo '<section class="oaci-group">';
		echo '<h2>' . esc_html__( 'When you remove the plugin', 'opace-ai-content-checker-detector' ) . '</h2>';
		echo '<p class="oaci-group__help">' . esc_html__( 'Either way, receipts hold hashes and check results, never your text, and the plugin keeps no event log.', 'opace-ai-content-checker-detector' ) . '</p>';
		$this->switch_row( 'delete_data_uninstall', __( 'Delete this plugin’s data when it is uninstalled', 'opace-ai-content-checker-detector' ), __( 'Leave this off to keep saved receipts if you remove the plugin.', 'opace-ai-content-checker-detector' ), $value );
		echo '</section>';

		echo '<p class="oaci-submit"><button type="submit" class="oaci-button oaci-button--primary">' . esc_html__( 'Save settings', 'opace-ai-content-checker-detector' ) . '</button></p>';
		echo '</form></div>';
		OpaceFooter::render();
	}

	/**
	 * The service's own published figures as stat tiles, and nothing where it
	 * published nothing. A missing figure is left out rather than shown as a zero
	 * or a guess.
	 *
	 * @return array[] Each entry has a value and a label.
	 */
	private function service_figures() {
		$service = $this->limits()['service'];
		$tiles   = array();
		$map     = array(
			'channel_floor'         => __( 'section readings a day kept for WordPress sites', 'opace-ai-content-checker-detector' ),
			'channel_remaining'     => __( 'left in that share, when this page last asked', 'opace-ai-content-checker-detector' ),
			'shared_pool_remaining' => __( 'left in the pool every surface shares', 'opace-ai-content-checker-detector' ),
			'site_per_hour'         => __( 'section readings an hour for this whole site', 'opace-ai-content-checker-detector' ),
			'site_per_day'          => __( 'section readings a day for this whole site', 'opace-ai-content-checker-detector' ),
		);
		foreach ( $map as $key => $label ) {
			if ( isset( $service[ $key ] ) && is_int( $service[ $key ] ) ) {
				$tiles[] = array(
					'value' => number_format_i18n( $service[ $key ] ),
					'label' => $label,
				);
			}
		}
		return $tiles;
	}

	public function methods() {
		$server = $this->server_analysis->status();
		$this->header( __( 'Methods & privacy', 'opace-ai-content-checker-detector' ), __( 'What runs, where it runs, and what a result can and cannot tell you.', 'opace-ai-content-checker-detector' ), 'oaci-methods' );
		echo '<div class="oaci-panel">';
		echo '<section class="oaci-group">';
		echo '<h2>' . esc_html__( 'The short version', 'opace-ai-content-checker-detector' ) . '</h2>';
		echo '<p class="oaci-group__help">' . esc_html__( 'No checker can prove who wrote a piece of text. This one reads patterns and shows you the evidence, in your own sentences, so you can judge for yourself. A finding is somewhere to look, not a verdict about a person.', 'opace-ai-content-checker-detector' ) . '</p>';
		echo '<div class="oaci-methods-grid">';

		$this->method_card(
			__( 'Runs in your browser, always', 'opace-ai-content-checker-detector' ),
			array(
				__( 'Hidden characters, lookalike letters, writing patterns and Content Credentials in files.', 'opace-ai-content-checker-detector' ),
				__( 'These four checks need no download and send nothing anywhere.', 'opace-ai-content-checker-detector' ),
			),
			$this->bullets(
				array(
					__( 'Hidden and invisible characters, and mixed-script lookalike letters (unicode:2026.08.2)', 'opace-ai-content-checker-detector' ),
					__( 'Writing patterns and editing suggestions (en-signals:2026.08.6)', 'opace-ai-content-checker-detector' ),
					__( 'Content Credentials in JPEG, PNG, WebP and PDF files (c2pa-web:0.14.3)', 'opace-ai-content-checker-detector' ),
					__( 'Protected numbers, dates, links, quotations, citations and code', 'opace-ai-content-checker-detector' ),
				)
			) . $this->para( __( 'The Content Credentials check never fetches a remote manifest, a certificate status or a trust list, so it will not tell you a signer is trusted. Present, absent, invalid and untrusted stay separate answers.', 'opace-ai-content-checker-detector' ) )
		);

		$this->method_card(
			__( 'On this device', 'opace-ai-content-checker-detector' ),
			array(
				__( 'The trained model runs in the editor’s browser, so the draft is not sent to Opace or to this site for scoring.', 'opace-ai-content-checker-detector' ),
				__( 'The first run downloads the model once; after that it is cached, and the route has no run limit.', 'opace-ai-content-checker-detector' ),
			),
			$this->para( $this->model_download_sentence() )
			. $this->para( __( 'On this route the run has no limit because it is the editor’s own computer doing the work. Saving a completed AI reading sends hashes and check results, never the text, to this site.', 'opace-ai-content-checker-detector' ) )
			. $this->para( __( 'The program that reads the file is the inference engine bundled inside this plugin, which WordPress serves from your own site. Nothing executable is fetched from anywhere else.', 'opace-ai-content-checker-detector' ) ),
			__( 'Private, no limit', 'opace-ai-content-checker-detector' ),
			'pass'
		);

		$this->method_card(
			__( 'Private EU analysis', 'opace-ai-content-checker-detector' ),
			array(
				__( 'The draft goes once through this site to our EU service, is read there in memory, and is not kept.', 'opace-ai-content-checker-detector' ),
				__( 'It needs three separate yeses, and it has allowances that running on the device does not.', 'opace-ai-content-checker-detector' ),
			),
			$this->para( $this->server_state_label( $server['state'] ) )
			. $this->para( __( 'The three yeses: an administrator turns the route on, the site confirms the service can be reached, and the editor presses a button that names the one-off transfer. Only then does the draft travel. The plugin never pretends to be a browser by faking an Origin or a user agent.', 'opace-ai-content-checker-detector' ) )
			. $this->para( __( 'When all three are true this is the route the checker offers first, because there is nothing to download and the answer comes back in about a second. The draft is read once in memory in europe-west1 and is not retained; the plugin refuses any answer that does not say so.', 'opace-ai-content-checker-detector' ) )
			. $this->para( __( 'Whenever this route is unavailable, refuses a run or fails, the checker says which allowance was reached and when it comes back, and offers to run the same model on the device in one click.', 'opace-ai-content-checker-detector' ) )
			. $this->bullets( $this->allowance_sentences() ),
			'ready' === $server['state'] ? __( 'Available', 'opace-ai-content-checker-detector' ) : __( 'Not available', 'opace-ai-content-checker-detector' ),
			'ready' === $server['state'] ? 'pass' : 'not_run'
		);

		$this->method_card(
			__( 'Not available in this release', 'opace-ai-content-checker-detector' ),
			array(
				__( 'Three things other tools claim, which this one will not.', 'opace-ai-content-checker-detector' ),
				__( 'Each reports its own state and stops, rather than offering a stand-in.', 'opace-ai-content-checker-detector' ),
			),
			$this->para( __( 'Anthropic official watermark verifier: Unsupported. There is no official detector we can call, so this check reports Unsupported and stops. A public watermark test or a writing-pattern result is not a stand-in for it, and we will not present one as though it were.', 'opace-ai-content-checker-detector' ) )
			. $this->para( __( 'Claude readiness: not supported. There is no readiness check in this release, so the plugin does not offer one.', 'opace-ai-content-checker-detector' ) )
			. $this->para( __( 'Rewrite Lab: not configured. Generated rewrites need a text-generation service, which this release does not include. Safe character fixes in the checker are a separate thing: they change characters and spacing only, and you preview them first.', 'opace-ai-content-checker-detector' ) ),
			__( 'Unsupported', 'opace-ai-content-checker-detector' ),
			'unsupported'
		);

		$this->method_card(
			__( 'Where your text goes', 'opace-ai-content-checker-detector' ),
			array(
				__( 'One line per route, because a single claim about the whole plugin could not stay true.', 'opace-ai-content-checker-detector' ),
				__( 'Shared summaries, downloaded JSON and links never carry your text.', 'opace-ai-content-checker-detector' ),
			),
			$this->bullets(
				array(
					__( 'Character, writing and file checks: your browser only.', 'opace-ai-content-checker-detector' ),
					__( 'On-device analysis: your browser only. Model files come down; the draft does not go up.', 'opace-ai-content-checker-detector' ),
					__( 'Saving a completed AI reading: only hashes and check results are sent to this site. Saving an integrity-checks-only receipt sends the draft to this site for hashing; only hashes and check results are stored. Neither receipt stores the draft.', 'opace-ai-content-checker-detector' ),
					__( 'Private EU analysis: the draft is sent once, and only when an administrator has turned the route on and you have pressed the button that names the transfer. It is read in memory in europe-west1 and is not retained afterwards.', 'opace-ai-content-checker-detector' ),
					__( 'Shared summaries, downloaded JSON and links never carry your text or the passages we quote back to you.', 'opace-ai-content-checker-detector' ),
				)
			)
		);

		$this->method_card(
			__( 'How much it will check at once', 'opace-ai-content-checker-detector' ),
			array(
				sprintf(
					/* translators: 1: character limit, 2: minimum word count. */
					__( 'Up to %1$s characters in one run, and at least %2$s words for an AI reading.', 'opace-ai-content-checker-detector' ),
					number_format_i18n( $this->limits()['max_chars'] ),
					number_format_i18n( self::MODEL_MIN_WORDS )
				),
				__( 'Editors see these in the checker as plain messages, never as an error code.', 'opace-ai-content-checker-detector' ),
			),
			$this->bullets( $this->limits_sentences() )
		);

		echo '</div></section></div></div>';
		OpaceFooter::render();
	}

	/**
	 * One method card: a heading, two lines, and everything else behind a
	 * disclosure. Two lines is the budget on purpose — a card that needs four is
	 * a card whose detail belongs inside the disclosure.
	 *
	 * @param string   $title       The method's name in the reader's words.
	 * @param string[] $lines       Exactly what the card says before it is opened.
	 * @param string   $detail_html The disclosure body, already escaped.
	 * @param string   $chip        Optional status word.
	 * @param string   $chip_state  Which chip colour: pass, not_run or unsupported.
	 */
	private function method_card( $title, array $lines, $detail_html, $chip = '', $chip_state = 'pass' ) {
		echo '<div class="oaci-methods-card"><div class="oaci-methods-card__head"><h3>' . esc_html( $title ) . '</h3>';
		if ( '' !== $chip ) {
			echo '<span class="oaci-chip oaci-chip--' . esc_attr( $chip_state ) . '">' . esc_html( $chip ) . '</span>';
		}
		echo '</div>';
		foreach ( $lines as $line ) {
			echo '<p>' . esc_html( $line ) . '</p>';
		}
		$this->disclosure( __( 'Details', 'opace-ai-content-checker-detector' ), $detail_html );
		echo '</div>';
	}

	/**
	 * Every usage limit this site applies, in one place, so the checker screen,
	 * the settings screen and the methods screen cannot describe them
	 * differently.
	 *
	 * @return array
	 */
	private function limits() {
		$status = $this->server_analysis->status();
		return array(
			'max_chars'       => (int) Settings::get()['max_chars'],
			'min_words'       => self::MODEL_MIN_WORDS,
			'max_file_mb'     => 20,
			'server_per_min'  => ServerRateLimiter::MINUTE_LIMIT,
			'server_per_hour' => ServerRateLimiter::HOUR_LIMIT,
			'model_label'     => self::MODEL_DOWNLOAD_LABEL,
			'model_bytes'     => self::MODEL_BYTES,
			'model_sha256'    => self::MODEL_SHA256,
			'model_file'      => self::MODEL_FILE,
			// What the service last said about its own allowances. Every entry
			// is null until the service publishes that figure, and a null is
			// printed as nothing at all rather than as a zero or a guess.
			'service'         => isset( $status['limits'] ) && is_array( $status['limits'] ) ? $status['limits'] : array(),
			'recommended'     => isset( $status['recommended'] ) ? (string) $status['recommended'] : 'on_device',
		);
	}

	/**
	 * How the shared EU allowance is divided, in whatever detail the service has
	 * actually published. The general shape is always stated; a number appears
	 * only where the service sent one, so a screen never invents a figure and
	 * never prints a proportion.
	 *
	 * @return string[] One sentence per line.
	 */
	private function allowance_sentences() {
		$service   = $this->limits()['service'];
		$figure    = static function ( $name ) use ( $service ) {
			return isset( $service[ $name ] ) && is_int( $service[ $name ] ) ? $service[ $name ] : null;
		};
		$sentences = array();

		$floor = $figure( 'channel_floor' );
		if ( null === $floor ) {
			$sentences[] = __( 'The EU service reads a set number of sections of text each day. WordPress sites have their own reserved share of that day, so a busy week on our website cannot use up the plugin’s allowance, and the plugin cannot use up the website’s.', 'opace-ai-content-checker-detector' );
		} else {
			$sentences[] = sprintf(
				/* translators: %s: the number of section readings reserved for WordPress each day. */
				__( 'WordPress sites have their own reserved share of the EU service: %s section readings a day, which no other surface can spend. A section is roughly four hundred words, so a typical blog draft costs three of them.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( $floor )
			);
		}

		$remaining = $figure( 'channel_remaining' );
		if ( null !== $remaining ) {
			$sentences[] = sprintf(
				/* translators: %s: section readings left in the WordPress share today. */
				__( 'Left in that share when this page last asked: %s section readings.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( $remaining )
			);
		}

		$pool = $figure( 'shared_pool_remaining' );
		if ( null === $pool ) {
			$sentences[] = __( 'Once that share is spent for the day, runs draw on the pool every surface shares. When the pool is empty too, the service says so and the checker offers the on-device route instead.', 'opace-ai-content-checker-detector' );
		} else {
			$sentences[] = sprintf(
				/* translators: %s: section readings left in the shared pool. */
				__( 'Once that share is spent, runs draw on the pool every surface shares, which had %s section readings left when this page last asked. When the pool is empty too, the service says so and the checker offers the on-device route instead.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( $pool )
			);
		}

		$per_hour = $figure( 'site_per_hour' );
		$per_day  = $figure( 'site_per_day' );
		if ( null === $per_hour && null === $per_day ) {
			$sentences[] = __( 'The service also holds each site to its own hourly and daily ceiling, so one site cannot take the whole reserved share.', 'opace-ai-content-checker-detector' );
		} elseif ( null !== $per_hour && null !== $per_day ) {
			$sentences[] = sprintf(
				/* translators: 1: section readings an hour for this site, 2: section readings a day. */
				__( 'The service also holds each site to %1$s section readings an hour and %2$s a day, so one site cannot take the whole reserved share.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( $per_hour ),
				number_format_i18n( $per_day )
			);
		} else {
			$sentences[] = sprintf(
				/* translators: %s: the per-site ceiling in section readings. */
				__( 'The service also holds each site to %s section readings in its own window, so one site cannot take the whole reserved share.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( null !== $per_hour ? $per_hour : $per_day )
			);
		}

		$sentences[] = __( 'Running on the editor’s own device has no allowance and no ceiling, so it is always there when any of these run out.', 'opace-ai-content-checker-detector' );
		return $sentences;
	}

	/**
	 * The one sentence that explains the on-device download, used on the checker
	 * screen, the settings screen and the methods screen so no two of them can
	 * describe it differently. It says what the file is, where it comes from,
	 * that it is checked before use, and that it can be removed.
	 *
	 * @return string
	 */
	private function model_download_sentence() {
		return sprintf(
			/* translators: 1: download size, 2: file name, 3: exact byte count, 4: first eight characters of the SHA-256 hash. */
			__( 'The first on-device run downloads %1$s of model weights: %2$s, %3$s bytes, SHA-256 beginning %4$s. It is a data file, not a program, and the browser fetches it from opace.agency the same way it fetches an image. The plugin checks it against that hash before anything reads it, keeps it in the browser cache like any other web asset, and an editor can remove it with one click on the checker screen.', 'opace-ai-content-checker-detector' ),
			self::MODEL_DOWNLOAD_LABEL,
			self::MODEL_FILE,
			number_format_i18n( self::MODEL_BYTES ),
			substr( self::MODEL_SHA256, 0, 8 )
		);
	}

	/**
	 * Every usage limit, written out, one sentence each. Shared by the settings
	 * and methods screens so the numbers cannot disagree.
	 *
	 * @return string[]
	 */
	private function limits_sentences() {
		$limits = $this->limits();
		return array(
			sprintf(
				/* translators: %s: character limit. */
				__( 'Up to %s characters in one run. A longer draft is refused with a message and is never quietly shortened.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( $limits['max_chars'] )
			),
			sprintf(
				/* translators: %s: minimum word count. */
				__( 'At least %s words for an AI reading. Shorter drafts still get the character and writing checks.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( $limits['min_words'] )
			),
			sprintf(
				/* translators: %s: file size limit in megabytes. */
				__( 'Files up to %s MB for a Content Credentials check.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( $limits['max_file_mb'] )
			),
			sprintf(
				/* translators: 1: runs per minute, 2: runs per hour. */
				__( 'Private EU analysis: %1$s runs a minute and %2$s an hour for each person on this site, so one account cannot use up the site’s share.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( $limits['server_per_min'] ),
				number_format_i18n( $limits['server_per_hour'] )
			),
			$this->site_allowance_line( $limits ),
			__( 'On this device: no run limit. It is the editor’s own computer doing the work, so it is the one route that cannot run out.', 'opace-ai-content-checker-detector' ),
		);
	}

	/**
	 * The service-side ceiling on this whole site, with the numbers when the
	 * service published them and the rule alone when it did not.
	 *
	 * @param array $limits The limits() array.
	 * @return string
	 */
	private function site_allowance_line( array $limits ) {
		$service  = isset( $limits['service'] ) && is_array( $limits['service'] ) ? $limits['service'] : array();
		$per_hour = isset( $service['site_per_hour'] ) && is_int( $service['site_per_hour'] ) ? $service['site_per_hour'] : null;
		$per_day  = isset( $service['site_per_day'] ) && is_int( $service['site_per_day'] ) ? $service['site_per_day'] : null;
		if ( null !== $per_hour && null !== $per_day ) {
			return sprintf(
				/* translators: 1: section readings an hour for the whole site, 2: section readings a day. */
				__( 'The service also limits this whole site to %1$s section readings an hour and %2$s a day, and reserves a share of each day for WordPress sites so the plugin and our website cannot starve each other.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( $per_hour ),
				number_format_i18n( $per_day )
			);
		}
		return __( 'The service also limits this whole site by the hour and by the day, and reserves a share of each day for WordPress sites so the plugin and our website cannot starve each other. Reaching any of those says which one it was and when it comes back.', 'opace-ai-content-checker-detector' );
	}

	private function config() {
		$server = $this->server_analysis->status();
		return array(
			'restUrl'        => esc_url_raw( rest_url( 'oaci/v1/' ) ),
			'nonce'          => wp_create_nonce( 'wp_rest' ),
			'apiVersion'     => '1.0',
			'pluginVersion'  => OPACE_CONTENT_INTEGRITY_VERSION,
			'maxChars'       => Settings::get()['max_chars'],
			'onDevice'       => array(
				'modelBaseUrl'           => self::SHIPPED_MODEL_BASE_URL,
				'overriddenModelBaseUrl' => $this->mirrored_model_base_url(),
				'wasmUrl'                => esc_url_raw( OPACE_CONTENT_INTEGRITY_URL . 'assets/vendor/cycle5/ort-wasm-simd-threaded.wasm' ),
				'maxChars'               => 100000,
				'download'               => self::MODEL_DOWNLOAD_LABEL,
				'modelBytes'             => self::MODEL_BYTES,
				'modelSha256'            => self::MODEL_SHA256,
				'modelFile'              => self::MODEL_FILE,
			),
			'post'           => $this->requested_post_id(),
			'limits'         => array(
				'maxChars'      => (int) Settings::get()['max_chars'],
				'minWords'      => self::MODEL_MIN_WORDS,
				'maxFileBytes'  => 20 * 1024 * 1024,
				'serverPerMin'  => ServerRateLimiter::MINUTE_LIMIT,
				'serverPerHour' => ServerRateLimiter::HOUR_LIMIT,
				'sitePerHour'   => isset( $server['limits']['site_per_hour'] ) ? $server['limits']['site_per_hour'] : null,
				'sitePerDay'    => isset( $server['limits']['site_per_day'] ) ? $server['limits']['site_per_day'] : null,
			),
			'logoUrl'        => esc_url_raw( OPACE_CONTENT_INTEGRITY_URL . 'assets/images/opace-ai-content-checker-mark.png' ),
			'adminUrl'       => admin_url( 'admin.php?page=oaci-lab' ),
			'receiptsUrl'    => admin_url( 'admin.php?page=oaci-receipts' ),
			'settingsUrl'    => current_user_can( 'manage_options' ) ? admin_url( 'admin.php?page=oaci-settings' ) : '',
			'serverAnalysis' => array(
				'adminOptIn'         => $server['admin_opt_in'],
				'endpointConfigured' => $server['endpoint_configured'],
				'channelReady'       => $server['channel_ready'],
				'available'          => $server['available'],
				// True when the route is on but nobody has asked the service
				// yet. The browser then asks through this site's own REST route
				// and corrects the chooser, so a cold service never hides the
				// recommended route behind a page that waited for it.
				'checking'           => $server['checking'],
				'state'              => $server['state'],
				// The route the page opens on. The browser is told the answer
				// rather than working it out, so the card that is checked in the
				// markup and the one the script agrees with cannot drift apart.
				'recommended'        => $server['recommended'],
			),
			'strings'        => array(
				'working' => __( 'Inspecting draft…', 'opace-ai-content-checker-detector' ),
				'error'   => __( 'Inspection could not be completed.', 'opace-ai-content-checker-detector' ),
			),
		);
	}

	/**
	 * A site that mirrors the pinned model directory elsewhere, for example on an
	 * internal host, declares that mirror with the
	 * OPACE_CONTENT_INTEGRITY_MODEL_BASE_URL constant in wp-config.php or with the
	 * oaci_model_base_url filter. There is no admin setting for it, so a
	 * compromised administrator account cannot silently redirect the download.
	 * A mirror must be an HTTPS directory URL ending in a slash, matching the
	 * rule the shared browser runtime enforces. When nothing is declared, or the
	 * declared value fails that rule, the shipped directory is used.
	 *
	 * @return string Empty string when no mirror is declared.
	 */
	private function mirrored_model_base_url() {
		$mirror = defined( 'OPACE_CONTENT_INTEGRITY_MODEL_BASE_URL' ) ? (string) constant( 'OPACE_CONTENT_INTEGRITY_MODEL_BASE_URL' ) : '';
		/**
		 * Filters the directory the verified model files are downloaded from.
		 *
		 * @param string $mirror Absolute URL ending in a slash, or an empty string.
		 */
		$mirror = (string) apply_filters( 'oaci_model_base_url', $mirror );
		$mirror = trim( $mirror );
		if ( '' === $mirror || self::SHIPPED_MODEL_BASE_URL === $mirror ) {
			return '';
		}
		if ( ! preg_match( '#^https://[^\s]+/$#', $mirror ) ) {
			return '';
		}
		return esc_url_raw( $mirror );
	}

	/**
	 * The page shell every screen but the checker uses: the mark, the title, one
	 * line of what the screen is for, and the same navigation the checker has, so
	 * no screen is a dead end.
	 *
	 * @param string $title       The screen's own name.
	 * @param string $description One line, not a paragraph.
	 * @param string $current     Which navigation item is this screen.
	 */
	private function header( $title, $description, $current = '' ) {
		echo '<div class="wrap oaci-wrap"><div class="oaci-header"><img class="oaci-mark" src="' . esc_url( OPACE_CONTENT_INTEGRITY_URL . 'assets/images/opace-ai-content-checker-mark.png' ) . '" alt="" width="40" height="40"><div><h1>' . esc_html( $title ) . '</h1><p>' . esc_html( $description ) . '</p></div></div>';
		$this->suite_nav( $current );
	}

	/**
	 * The same navigation on every screen, in the same order.
	 *
	 * @param string $current The page slug of the screen being drawn.
	 */
	private function suite_nav( $current ) {
		$items = array(
			'oaci-lab'      => __( 'Checker', 'opace-ai-content-checker-detector' ),
			'oaci-receipts' => __( 'Receipts', 'opace-ai-content-checker-detector' ),
		);
		if ( current_user_can( 'manage_options' ) ) {
			$items['oaci-methods']  = __( 'Methods & privacy', 'opace-ai-content-checker-detector' );
			$items['oaci-settings'] = __( 'Settings', 'opace-ai-content-checker-detector' );
		}
		echo '<nav class="oaci-suite-nav" aria-label="' . esc_attr__( 'AI Content Checker', 'opace-ai-content-checker-detector' ) . '">';
		foreach ( $items as $slug => $label ) {
			$active = $slug === $current;
			echo '<a class="' . ( $active ? 'is-active' : '' ) . '" href="' . esc_url( admin_url( 'admin.php?page=' . $slug ) ) . '"' . ( $active ? ' aria-current="page"' : '' ) . '>' . esc_html( $label ) . '</a>';
		}
		echo '</nav>';
	}

	/**
	 * One switch: the control, a short label, and one line of help. Never a
	 * paragraph, and never a label that needs a paragraph to be understood.
	 *
	 * @param string $key   The settings key.
	 * @param string $label Short, in the reader's words.
	 * @param string $help  One line.
	 * @param array  $value The saved settings.
	 */
	private function switch_row( $key, $label, $help, array $value ) {
		echo '<label class="oaci-switch"><input type="checkbox" name="oaci_settings[' . esc_attr( $key ) . ']" value="1" ' . checked( ! empty( $value[ $key ] ), true, false ) . '><span><strong>' . esc_html( $label ) . '</strong><small>' . esc_html( $help ) . '</small></span></label>';
	}

	/**
	 * One tile in a stat row: the figure, then what it counts.
	 *
	 * @param string $value The figure, already formatted.
	 * @param string $label What that figure counts.
	 */
	private function stat( $value, $label ) {
		echo '<div class="oaci-stat"><b>' . esc_html( $value ) . '</b><span>' . esc_html( $label ) . '</span></div>';
	}

	/**
	 * A disclosure that looks like one, with its body already set in.
	 *
	 * @param string $summary   The question, on the summary line.
	 * @param string $body_html The answer, assembled from escaped fragments.
	 */
	private function disclosure( $summary, $body_html ) {
		echo '<details class="oaci-disclosure"><summary>' . esc_html( $summary ) . '</summary><div class="oaci-disclosure__body">' . $body_html . '</div></details>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $body_html is assembled from escaped fragments by the caller.
	}

	/**
	 * A paragraph, escaped, for a disclosure body.
	 *
	 * @param string $text The sentence or sentences.
	 * @return string
	 */
	private function para( $text ) {
		return '<p>' . esc_html( $text ) . '</p>';
	}

	/**
	 * A bulleted list, escaped, for a disclosure body.
	 *
	 * @param string[] $items One sentence per item.
	 * @return string
	 */
	private function bullets( array $items ) {
		$html = '<ul>';
		foreach ( $items as $item ) {
			$html .= '<li>' . esc_html( $item ) . '</li>';
		}
		return $html . '</ul>';
	}

	private function server_state_label( $state ) {
		$labels = array(
			'off'                 => __( 'Off, so no endpoint is contacted at all. Editors are offered the on-device route, which has no limit.', 'opace-ai-content-checker-detector' ),
			'endpoint_missing'    => __( 'On here, but this build carries no endpoint, so the route cannot be offered. Editors get the on-device route instead.', 'opace-ai-content-checker-detector' ),
			'channel_unavailable' => __( 'On here, but the service is not accepting WordPress runs at the moment. Editors get the on-device route instead.', 'opace-ai-content-checker-detector' ),
			'checking'            => __( 'On here, and nobody has asked the service yet. The checker asks as it opens and says what came back.', 'opace-ai-content-checker-detector' ),
			'ready'               => __( 'On and reachable, so the checker offers it first. Running on the editor’s own device stays one click away.', 'opace-ai-content-checker-detector' ),
		);
		return isset( $labels[ $state ] ) ? $labels[ $state ] : $labels['off'];
	}
}
