<?php
/**
 * What the editor panels are told about this site.
 *
 * One array, built once, used by both panels. Until 1.1.5 the two panels were
 * handed four keys between them and could therefore only ever call one PHP
 * route; they now run the same engine and reach the same two model routes as the
 * checker screen, so they need what that screen needs: the limits, the routes,
 * the model facts and the versioned module URLs.
 *
 * Nothing here is a decision. The site says what is on and what it allows; the
 * panel decides nothing on the reader's behalf and transfers nothing until a
 * button whose label names the cost is pressed.
 *
 * @package Opace\ContentIntegrity
 */

namespace Opace\ContentIntegrity\Editor;

use Opace\ContentIntegrity\Admin\Admin;
use Opace\ContentIntegrity\Core\Settings;
use Opace\ContentIntegrity\Rest\ServerRateLimiter;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the configuration both editor panels are localised with.
 */
final class EditorConfig {

	/**
	 * The configuration for one post.
	 *
	 * @param int   $post_id The post being edited, or 0.
	 * @param array $server  The EU route's status, from the adapter.
	 * @return array
	 */
	public static function build( $post_id, array $server ) {
		$post_id  = absint( $post_id );
		$settings = Settings::get();
		$base     = OPACE_CONTENT_INTEGRITY_URL . 'assets/js/';
		$version  = rawurlencode( OPACE_CONTENT_INTEGRITY_VERSION );

		return array(
			'restUrl'        => esc_url_raw( rest_url( 'oaci/v1/' ) ),
			'nonce'          => wp_create_nonce( 'wp_rest' ),
			'pluginVersion'  => OPACE_CONTENT_INTEGRITY_VERSION,
			'postId'         => $post_id,
			'maxChars'       => (int) $settings['max_chars'],
			'labUrl'         => admin_url( 'admin.php?page=oaci-lab' ),
			'checkUrl'       => $post_id > 0 ? Admin::check_post_url( $post_id ) : '',
			'logoUrl'        => esc_url_raw( OPACE_CONTENT_INTEGRITY_URL . 'assets/images/opace-ai-content-checker-mark.png' ),
			// Every module the panel reaches for at run time, with the plugin
			// version on it, because a browser that cached one of these from the
			// release before would otherwise keep using it.
			'modules'        => array(
				'panel'  => esc_url_raw( $base . 'editor-panel.mjs?ver=' . $version ),
				'engine' => esc_url_raw( $base . 'editor-check.mjs?ver=' . $version ),
				'core'   => esc_url_raw( $base . 'core.mjs?ver=' . $version ),
				'cycle5' => esc_url_raw( $base . 'cycle5-wordpress.mjs?ver=' . $version ),
				'worker' => esc_url_raw( $base . 'editor-engine-worker.mjs?ver=' . $version ),
			),
			'onDevice'       => array(
				'modelBaseUrl'           => Admin::SHIPPED_MODEL_BASE_URL,
				'overriddenModelBaseUrl' => self::mirrored_model_base_url(),
				'wasmUrl'                => esc_url_raw( OPACE_CONTENT_INTEGRITY_URL . 'assets/vendor/cycle5/ort-wasm-simd-threaded.wasm' ),
				'download'               => Admin::MODEL_DOWNLOAD_LABEL,
			),
			'limits'         => array(
				'maxChars'      => (int) $settings['max_chars'],
				'minWords'      => Admin::MODEL_MIN_WORDS,
				'serverPerMin'  => ServerRateLimiter::MINUTE_LIMIT,
				'serverPerHour' => ServerRateLimiter::HOUR_LIMIT,
				'sitePerHour'   => isset( $server['limits']['site_per_hour'] ) ? $server['limits']['site_per_hour'] : null,
				'sitePerDay'    => isset( $server['limits']['site_per_day'] ) ? $server['limits']['site_per_day'] : null,
			),
			'serverAnalysis' => array(
				'available' => ! empty( $server['available'] ),
				'checking'  => ! empty( $server['checking'] ),
				'state'     => isset( $server['state'] ) ? (string) $server['state'] : 'off',
			),
		);
	}

	/**
	 * The mirrored model directory, when a site has declared one. The same rule
	 * the checker screen applies: an HTTPS directory URL ending in a slash,
	 * declared in code rather than in a setting, so a compromised administrator
	 * account cannot redirect the download.
	 *
	 * @return string Empty string when no mirror is declared.
	 */
	private static function mirrored_model_base_url() {
		$mirror = defined( 'OPACE_CONTENT_INTEGRITY_MODEL_BASE_URL' ) ? (string) constant( 'OPACE_CONTENT_INTEGRITY_MODEL_BASE_URL' ) : '';
		/** This filter is documented in includes/Admin/Admin.php */
		$mirror = trim( (string) apply_filters( 'oaci_model_base_url', $mirror ) );
		if ( '' === $mirror || Admin::SHIPPED_MODEL_BASE_URL === $mirror ) {
			return '';
		}
		return preg_match( '#^https://[^\s]+/$#', $mirror ) ? esc_url_raw( $mirror ) : '';
	}
}
