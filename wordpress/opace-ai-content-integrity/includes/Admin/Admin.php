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
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
		add_action( 'admin_notices', array( $this, 'onboarding' ) );
		add_action( 'admin_post_oaci_delete_receipts', array( $this, 'delete_receipts' ) );
		add_filter( 'post_row_actions', array( $this, 'row_action' ), 10, 2 );
		add_filter( 'page_row_actions', array( $this, 'row_action' ), 10, 2 );
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
	 * Adds "Check with Content Integrity" to the Posts and Pages list tables.
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
		$actions['oaci_check'] = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Check with Content Integrity', 'opace-ai-content-integrity' ) . '</a>';
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
		echo '<div class="notice notice-info is-dismissible"><p><strong>' . esc_html__( 'Opace AI Content Integrity is ready for local inspection.', 'opace-ai-content-integrity' ) . '</strong> <a href="' . esc_url( $url ) . '">' . esc_html__( 'Inspect a draft', 'opace-ai-content-integrity' ) . '</a></p></div>';
	}

	public function lab() {
		( new LabPage( $this->server_analysis->status(), current_user_can( 'manage_options' ), $this->limits() ) )->render();
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
		$value  = Settings::get();
		$server = $this->server_analysis->status();
		$this->header( __( 'Settings', 'opace-ai-content-integrity' ), __( 'Where checks run, how much text they accept and what happens when you remove the plugin.', 'opace-ai-content-integrity' ) );
		echo '<form method="post" action="options.php" class="oaci-panel">';
		settings_fields( 'oaci_settings' );
		echo '<h2>' . esc_html__( 'Where editors see the checker', 'opace-ai-content-integrity' ) . '</h2>';
		echo '<p>' . esc_html__( 'The full checker always lives on the Suite screen. These two options add a smaller quick check beside the post you are writing.', 'opace-ai-content-integrity' ) . '</p>';
		echo '<fieldset><legend class="screen-reader-text">' . esc_html__( 'Editor surfaces', 'opace-ai-content-integrity' ) . '</legend>';
		$this->checkbox( 'editor_sidebar', __( 'Show the quick check in the block editor sidebar', 'opace-ai-content-integrity' ), $value );
		$this->checkbox( 'classic_meta_box', __( 'Show the quick check in the Classic Editor', 'opace-ai-content-integrity' ), $value );
		echo '</fieldset><p><label for="oaci-max-chars"><strong>' . esc_html__( 'Longest draft this site will accept', 'opace-ai-content-integrity' ) . '</strong></label><br><input id="oaci-max-chars" name="oaci_settings[max_chars]" type="number" min="10000" max="100000" value="' . esc_attr( $value['max_chars'] ) . '"><br><span class="description">' . esc_html__( 'Characters, up to 100,000. A longer draft is refused with a clear message. It is never quietly cut short and checked anyway.', 'opace-ai-content-integrity' ) . '</span></p>';
		echo '<h2>' . esc_html__( 'The limits this site applies', 'opace-ai-content-integrity' ) . '</h2>';
		echo '<p>' . esc_html__( 'Editors see these in the checker as plain messages, never as an error code.', 'opace-ai-content-integrity' ) . '</p>';
		$this->limits_list();
		echo '<h2>' . esc_html__( 'The on-device model download', 'opace-ai-content-integrity' ) . '</h2>';
		echo '<div class="oaci-settings-note"><strong>' . esc_html__( 'What editors are asked to download', 'opace-ai-content-integrity' ) . '</strong><p>' . esc_html( $this->model_download_sentence() ) . '</p><p>' . esc_html__( 'The program that reads the file is the inference engine bundled inside this plugin and served from your own site. No executable code is fetched from anywhere else, and the draft is never sent with the download request.', 'opace-ai-content-integrity' ) . '</p></div>';
		echo '<section class="oaci-settings-section" aria-labelledby="oaci-server-settings"><h2 id="oaci-server-settings">' . esc_html__( 'Private EU analysis', 'opace-ai-content-integrity' ) . '</h2>';
		echo '<p>' . esc_html__( 'This is the route that sends a draft to our server instead of running the model in the browser. It is off until you turn it on here, and the on-device route works without it.', 'opace-ai-content-integrity' ) . '</p>';
		$this->checkbox( 'server_analysis_opt_in', __( 'Let editors choose private EU analysis', 'opace-ai-content-integrity' ), $value );
		echo '<div class="oaci-route-disclosure"><strong>' . esc_html__( 'What turning this on does', 'opace-ai-content-integrity' ) . '</strong><p>' . esc_html__( 'Once it is on and the service is reachable, private EU analysis becomes the route the checker offers first, because it needs no download and gives an answer in about a second. An editor still has to tick a box confirming the one-off transfer for that run and press the button. The draft goes from their browser to this WordPress site, and once from here to a fixed Opace endpoint. The plugin does not keep that draft, and never puts it in a link, a receipt or a log.', 'opace-ai-content-integrity' ) . '</p><p>' . esc_html__( 'Running on the editor’s own device stays available whether this is on or off, and the checker suggests it in one click whenever the EU route is unavailable, refuses a run or fails.', 'opace-ai-content-integrity' ) . '</p><p>' . esc_html__( 'You cannot change the destination. It is fixed in the plugin code so that a compromised administrator account, or a copied configuration file, cannot quietly point drafts somewhere else.', 'opace-ai-content-integrity' ) . '</p><p><strong>' . esc_html__( 'Right now:', 'opace-ai-content-integrity' ) . '</strong> ' . esc_html( $this->server_state_label( $server['state'] ) ) . '</p></div>';
		echo '<h3>' . esc_html__( 'How the shared allowance is divided', 'opace-ai-content-integrity' ) . '</h3>';
		echo '<div class="oaci-settings-note"><ul>';
		foreach ( $this->allowance_sentences() as $sentence ) {
			echo '<li>' . esc_html( $sentence ) . '</li>';
		}
		echo '</ul><p class="description">' . esc_html__( 'Any figure above comes from the service’s own status reply and is only as fresh as the last few minutes. Where the service publishes no figure, the plugin describes the rule and states no number.', 'opace-ai-content-integrity' ) . '</p></div>';
		echo '<p>' . esc_html__( 'What the draft goes through: it is read once in memory in europe-west1 to produce the reading, and is not kept afterwards. The service reports that it retains nothing, and the plugin refuses any answer that does not.', 'opace-ai-content-integrity' ) . '</p></section>';
		echo '<h2>' . esc_html__( 'When you remove the plugin', 'opace-ai-content-integrity' ) . '</h2>';
		$this->checkbox( 'delete_data_uninstall', __( 'Delete this plugin’s data when it is uninstalled', 'opace-ai-content-integrity' ), $value );
		echo '<p class="description">' . esc_html__( 'Leave this off to keep saved receipts if you remove the plugin. Either way, receipts hold hashes and check results, never your text, and the plugin keeps no event log.', 'opace-ai-content-integrity' ) . '</p>';
		submit_button();
		echo '</form></div>';
	}

	public function methods() {
		$server = $this->server_analysis->status();
		$this->header( __( 'Methods & privacy', 'opace-ai-content-integrity' ), __( 'What runs, where it runs, and what a result can and cannot tell you.', 'opace-ai-content-integrity' ) );
		echo '<div class="oaci-panel">';
		echo '<h2>' . esc_html__( 'The short version', 'opace-ai-content-integrity' ) . '</h2>';
		echo '<p>' . esc_html__( 'No checker can prove who wrote a piece of text. This one reads patterns and shows you the evidence, in your own sentences, so you can judge for yourself. A finding is somewhere to look, not a verdict about a person.', 'opace-ai-content-integrity' ) . '</p>';
		echo '<div class="oaci-methods-grid">';
		echo '<div class="oaci-methods-card"><h3>' . esc_html__( 'Runs in your browser, always', 'opace-ai-content-integrity' ) . '</h3><ul><li>' . esc_html__( 'Hidden and invisible characters, and mixed-script lookalike letters', 'opace-ai-content-integrity' ) . ' <code>unicode:2026.08.2</code></li><li>' . esc_html__( 'Writing patterns and editing suggestions', 'opace-ai-content-integrity' ) . ' <code>en-signals:2026.08.6</code></li><li>' . esc_html__( 'Content Credentials in JPEG, PNG, WebP and PDF files', 'opace-ai-content-integrity' ) . ' <code>c2pa-web:0.14.3</code></li><li>' . esc_html__( 'Protected numbers, dates, links, quotations, citations and code', 'opace-ai-content-integrity' ) . '</li></ul><p>' . esc_html__( 'The Content Credentials check never fetches a remote manifest, a certificate status or a trust list, so it will not tell you a signer is trusted. Present, absent, invalid and untrusted stay separate answers.', 'opace-ai-content-integrity' ) . '</p></div>';
		echo '<div class="oaci-methods-card"><h3>' . esc_html__( 'On this device', 'opace-ai-content-integrity' ) . '</h3><p>' . esc_html( $this->model_download_sentence() ) . '</p><p>' . esc_html__( 'On this route the draft is read in your browser and is not sent to Opace, to this site or to any other service for scoring, and the run has no limit because it is your own computer doing the work. Saving a receipt afterwards sends its hashes, never the text, to this site.', 'opace-ai-content-integrity' ) . '</p><p>' . esc_html__( 'The program that reads the file is the inference engine bundled inside this plugin, which WordPress serves from your own site. Nothing executable is fetched from anywhere else.', 'opace-ai-content-integrity' ) . '</p></div>';
		echo '<div class="oaci-methods-card"><h3>' . esc_html__( 'Private EU analysis', 'opace-ai-content-integrity' ) . '</h3><p><strong>' . esc_html( $this->server_state_label( $server['state'] ) ) . '</strong></p><p>' . esc_html__( 'This route needs three separate yeses: an administrator turns it on, the site confirms the service can be reached, and the editor ticks a box for that run. Only then does the draft travel once through this site to our EU service. The plugin never pretends to be a browser by faking an Origin or a user agent.', 'opace-ai-content-integrity' ) . '</p><p>' . esc_html__( 'When all three are true this is the route the checker offers first, because there is nothing to download and the answer comes back in about a second. The draft is read once in memory in europe-west1 and is not retained; the plugin refuses any answer that does not say so.', 'opace-ai-content-integrity' ) . '</p><p>' . esc_html__( 'It has allowances, and running on the editor’s own device does not. Whenever this route is unavailable, refuses a run or fails, the checker says which allowance was reached and when it comes back, and offers to run the same model on the device in one click.', 'opace-ai-content-integrity' ) . '</p><ul>';
		foreach ( $this->allowance_sentences() as $sentence ) {
			echo '<li>' . esc_html( $sentence ) . '</li>';
		}
		echo '</ul></div>';
		echo '<div class="oaci-methods-card"><h3>' . esc_html__( 'Not available', 'opace-ai-content-integrity' ) . '</h3><p><strong>' . esc_html__( 'Anthropic official watermark verifier: Unsupported.', 'opace-ai-content-integrity' ) . '</strong> ' . esc_html__( 'There is no official detector we can call, so this check reports Unsupported and stops. A public watermark test or a writing-pattern result is not a stand-in for it, and we will not present one as though it were.', 'opace-ai-content-integrity' ) . '</p><p><strong>' . esc_html__( 'Claude readiness: not supported.', 'opace-ai-content-integrity' ) . '</strong> ' . esc_html__( 'There is no readiness check in this release, so the plugin does not offer one.', 'opace-ai-content-integrity' ) . '</p><p><strong>' . esc_html__( 'Rewrite Lab: not configured.', 'opace-ai-content-integrity' ) . '</strong> ' . esc_html__( 'Generated rewrites need a text-generation service, which this release does not include. Safe character fixes in the checker are a separate thing: they change characters and spacing only, and you preview them first.', 'opace-ai-content-integrity' ) . '</p></div>';
		echo '</div>';
		echo '<h2>' . esc_html__( 'How much it will check at once', 'opace-ai-content-integrity' ) . '</h2>';
		$this->limits_list();
		echo '<h2>' . esc_html__( 'Where your text goes', 'opace-ai-content-integrity' ) . '</h2>';
		echo '<ul><li>' . esc_html__( 'Character, writing and file checks: your browser only.', 'opace-ai-content-integrity' ) . '</li><li>' . esc_html__( 'On-device analysis: your browser only. Model files come down; the draft does not go up.', 'opace-ai-content-integrity' ) . '</li><li>' . esc_html__( 'Saving a receipt: the draft is sent to this WordPress site so it can be hashed, and only hashes and check results are stored.', 'opace-ai-content-integrity' ) . '</li><li>' . esc_html__( 'Private EU analysis: the draft is sent once, and only when an administrator has turned the route on and you have confirmed it for that run. It is read in memory in europe-west1 to produce the reading and is not retained afterwards.', 'opace-ai-content-integrity' ) . '</li><li>' . esc_html__( 'Shared summaries, downloaded JSON and links never carry your text or the passages we quote back to you.', 'opace-ai-content-integrity' ) . '</li></ul>';
		echo '</div></div>';
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
			$sentences[] = __( 'The EU service reads a set number of sections of text each day. WordPress sites have their own reserved share of that day, so a busy week on our website cannot use up the plugin’s allowance, and the plugin cannot use up the website’s.', 'opace-ai-content-integrity' );
		} else {
			$sentences[] = sprintf(
				/* translators: %s: the number of section readings reserved for WordPress each day. */
				__( 'WordPress sites have their own reserved share of the EU service: %s section readings a day, which no other surface can spend. A section is roughly four hundred words, so a typical blog draft costs three of them.', 'opace-ai-content-integrity' ),
				number_format_i18n( $floor )
			);
		}

		$remaining = $figure( 'channel_remaining' );
		if ( null !== $remaining ) {
			$sentences[] = sprintf(
				/* translators: %s: section readings left in the WordPress share today. */
				__( 'Left in that share when this page last asked: %s section readings.', 'opace-ai-content-integrity' ),
				number_format_i18n( $remaining )
			);
		}

		$pool = $figure( 'shared_pool_remaining' );
		if ( null === $pool ) {
			$sentences[] = __( 'Once that share is spent for the day, runs draw on the pool every surface shares. When the pool is empty too, the service says so and the checker offers the on-device route instead.', 'opace-ai-content-integrity' );
		} else {
			$sentences[] = sprintf(
				/* translators: %s: section readings left in the shared pool. */
				__( 'Once that share is spent, runs draw on the pool every surface shares, which had %s section readings left when this page last asked. When the pool is empty too, the service says so and the checker offers the on-device route instead.', 'opace-ai-content-integrity' ),
				number_format_i18n( $pool )
			);
		}

		$per_hour = $figure( 'site_per_hour' );
		$per_day  = $figure( 'site_per_day' );
		if ( null === $per_hour && null === $per_day ) {
			$sentences[] = __( 'The service also holds each site to its own hourly and daily ceiling, so one site cannot take the whole reserved share.', 'opace-ai-content-integrity' );
		} elseif ( null !== $per_hour && null !== $per_day ) {
			$sentences[] = sprintf(
				/* translators: 1: section readings an hour for this site, 2: section readings a day. */
				__( 'The service also holds each site to %1$s section readings an hour and %2$s a day, so one site cannot take the whole reserved share.', 'opace-ai-content-integrity' ),
				number_format_i18n( $per_hour ),
				number_format_i18n( $per_day )
			);
		} else {
			$sentences[] = sprintf(
				/* translators: %s: the per-site ceiling in section readings. */
				__( 'The service also holds each site to %s section readings in its own window, so one site cannot take the whole reserved share.', 'opace-ai-content-integrity' ),
				number_format_i18n( null !== $per_hour ? $per_hour : $per_day )
			);
		}

		$sentences[] = __( 'Running on the editor’s own device has no allowance and no ceiling, so it is always there when any of these run out.', 'opace-ai-content-integrity' );
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
			__( 'The first on-device run downloads %1$s of model weights: %2$s, %3$s bytes, SHA-256 beginning %4$s. It is a data file, not a program, and the browser fetches it from opace.agency the same way it fetches an image. The plugin checks it against that hash before anything reads it, keeps it in the browser cache like any other web asset, and an editor can remove it with one click on the checker screen.', 'opace-ai-content-integrity' ),
			self::MODEL_DOWNLOAD_LABEL,
			self::MODEL_FILE,
			number_format_i18n( self::MODEL_BYTES ),
			substr( self::MODEL_SHA256, 0, 8 )
		);
	}

	/**
	 * Every usage limit, written out. Shared by the settings and methods
	 * screens so the numbers cannot disagree.
	 */
	private function limits_list() {
		$limits = $this->limits();
		echo '<ul>';
		echo '<li>' . esc_html(
			sprintf(
				/* translators: %s: character limit. */
				__( 'Up to %s characters in one run. A longer draft is refused with a message and is never quietly shortened.', 'opace-ai-content-integrity' ),
				number_format_i18n( $limits['max_chars'] )
			)
		) . '</li>';
		echo '<li>' . esc_html(
			sprintf(
				/* translators: %s: minimum word count. */
				__( 'At least %s words for an AI reading. Shorter drafts still get the character and writing checks.', 'opace-ai-content-integrity' ),
				number_format_i18n( $limits['min_words'] )
			)
		) . '</li>';
		echo '<li>' . esc_html(
			sprintf(
				/* translators: %s: file size limit in megabytes. */
				__( 'Files up to %s MB for a Content Credentials check.', 'opace-ai-content-integrity' ),
				number_format_i18n( $limits['max_file_mb'] )
			)
		) . '</li>';
		echo '<li>' . esc_html(
			sprintf(
				/* translators: 1: runs per minute, 2: runs per hour. */
				__( 'Private EU analysis: %1$s runs a minute and %2$s an hour for each person on this site, so one account cannot use up the site’s share.', 'opace-ai-content-integrity' ),
				number_format_i18n( $limits['server_per_min'] ),
				number_format_i18n( $limits['server_per_hour'] )
			)
		) . '</li>';
		echo '<li>' . esc_html( $this->site_allowance_line( $limits ) ) . '</li>';
		echo '<li>' . esc_html__( 'On this device: no run limit. It is the editor’s own computer doing the work, so it is the one route that cannot run out.', 'opace-ai-content-integrity' ) . '</li>';
		echo '</ul>';
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
				__( 'The service also limits this whole site to %1$s section readings an hour and %2$s a day, and reserves a share of each day for WordPress sites so the plugin and our website cannot starve each other.', 'opace-ai-content-integrity' ),
				number_format_i18n( $per_hour ),
				number_format_i18n( $per_day )
			);
		}
		return __( 'The service also limits this whole site by the hour and by the day, and reserves a share of each day for WordPress sites so the plugin and our website cannot starve each other. Reaching any of those says which one it was and when it comes back.', 'opace-ai-content-integrity' );
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
			'logoUrl'        => esc_url_raw( OPACE_CONTENT_INTEGRITY_URL . 'assets/images/opace-ai-content-integrity-logo-256.webp' ),
			'adminUrl'       => admin_url( 'admin.php?page=oaci-lab' ),
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
				'working' => __( 'Inspecting draft…', 'opace-ai-content-integrity' ),
				'error'   => __( 'Inspection could not be completed.', 'opace-ai-content-integrity' ),
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

	private function header( $title, $description ) {
		echo '<div class="wrap oaci-wrap"><div class="oaci-header"><img class="oaci-mark" src="' . esc_url( OPACE_CONTENT_INTEGRITY_URL . 'assets/images/opace-ai-content-integrity-logo-256.webp' ) . '" alt="" width="88" height="88"><div><h1>' . esc_html( $title ) . '</h1><p>' . esc_html( $description ) . '</p></div></div>';
	}

	private function checkbox( $key, $label, array $value ) {
		echo '<p><label><input type="checkbox" name="oaci_settings[' . esc_attr( $key ) . ']" value="1" ' . checked( ! empty( $value[ $key ] ), true, false ) . '> ' . esc_html( $label ) . '</label></p>';
	}

	private function server_state_label( $state ) {
		$labels = array(
			'off'                 => __( 'Off, so no endpoint is contacted at all. Editors are offered the on-device route, which has no limit.', 'opace-ai-content-integrity' ),
			'endpoint_missing'    => __( 'Turned on here, but this build carries no endpoint or channel, so the route cannot be offered. The on-device route is offered instead.', 'opace-ai-content-integrity' ),
			'channel_unavailable' => __( 'Turned on here, but the service is not accepting WordPress runs at the moment. The on-device route is offered instead and has no limit.', 'opace-ai-content-integrity' ),
			'checking'            => __( 'Turned on here, and nobody has asked the service since this site last checked. The checker screen asks as it opens and says what came back; until then it offers the on-device route, which has no limit.', 'opace-ai-content-integrity' ),
			'ready'               => __( 'On and reachable, so private EU analysis is the route the checker offers first. Running on the editor’s own device is one click away whenever it is needed.', 'opace-ai-content-integrity' ),
		);
		return isset( $labels[ $state ] ) ? $labels[ $state ] : $labels['off'];
	}
}
