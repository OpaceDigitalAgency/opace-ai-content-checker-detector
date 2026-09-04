<?php
/**
 * Plugin Name: Opace AI Content Checker & Detector
 * Plugin URI: https://opace.agency/tools/ai/content-verification-integrity/wordpress-plugin/
 * Description: Check a draft for AI writing patterns, hidden characters and Content Credentials, and read the evidence behind every finding.
 * Version: 1.1.2
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: Opace Digital Agency
 * Author URI: https://opace.agency/
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: opace-ai-content-checker-detector
 *
 * @package OpaceAIContentCheckerDetector
 */

defined( 'ABSPATH' ) || exit;

define( 'OPACE_CONTENT_INTEGRITY_VERSION', '1.1.2' );
define( 'OPACE_CONTENT_INTEGRITY_DB_VERSION', '1.0.1' );
define( 'OPACE_CONTENT_INTEGRITY_FILE', __FILE__ );
define( 'OPACE_CONTENT_INTEGRITY_DIR', plugin_dir_path( __FILE__ ) );
define( 'OPACE_CONTENT_INTEGRITY_URL', plugin_dir_url( __FILE__ ) );

$oaci_vendor = OPACE_CONTENT_INTEGRITY_DIR . 'vendor/autoload.php';
if ( is_readable( $oaci_vendor ) ) {
	require_once $oaci_vendor;
}

spl_autoload_register(
	static function ( $class_name ) {
		$prefix = 'Opace\\ContentIntegrity\\';
		if ( 0 !== strpos( $class_name, $prefix ) ) {
			return;
		}
		$relative = substr( $class_name, strlen( $prefix ) );
		$file     = OPACE_CONTENT_INTEGRITY_DIR . 'includes/' . str_replace( '\\', '/', $relative ) . '.php';
		if ( is_readable( $file ) ) {
			require_once $file;
		}
	}
);

register_activation_hook( __FILE__, array( 'Opace\\ContentIntegrity\\Core\\Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Opace\\ContentIntegrity\\Core\\Deactivator', 'deactivate' ) );

add_action(
	'plugins_loaded',
	static function () {
		if ( version_compare( PHP_VERSION, '7.4', '<' ) || version_compare( get_bloginfo( 'version' ), '6.5', '<' ) ) {
			add_action(
				'admin_notices',
				static function () {
					echo '<div class="notice notice-error"><p>' . esc_html__( 'Opace AI Content Checker & Detector requires WordPress 6.5 and PHP 7.4 or newer.', 'opace-ai-content-checker-detector' ) . '</p></div>';
				}
			);
			return;
		}

		\Opace\ContentIntegrity\Core\Plugin::instance()->boot();
	}
);
