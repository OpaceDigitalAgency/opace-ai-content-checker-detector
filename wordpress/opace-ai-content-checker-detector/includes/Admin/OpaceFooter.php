<?php
/**
 * Shared Opace footer for AI Content Checker admin screens.
 *
 * @package Opace\ContentIntegrity
 */

namespace Opace\ContentIntegrity\Admin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders the same useful related links after every AI Content Checker admin page.
 */
final class OpaceFooter {

	/**
	 * Render the footer card.
	 *
	 * @return void
	 */
	public static function render() {
		?>
		<div class="wrap oaci-wrap oaci-opace-footer-wrap">
			<section class="oaci-opace-footer" aria-labelledby="oaci-more-from-opace">
				<p class="oaci-opace-footer__byline">
					<?php
					printf(
						/* translators: %s: Link to the Opace website. */
						wp_kses_post( __( 'Built and supported by %s, a UK digital agency.', 'opace-ai-content-checker-detector' ) ),
						'<a href="' . esc_url( 'https://opace.agency/' ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Opace', 'opace-ai-content-checker-detector' ) . '</a>'
					);
					?>
				</p>
				<h2 id="oaci-more-from-opace"><?php esc_html_e( 'More from Opace', 'opace-ai-content-checker-detector' ); ?></h2>
				<ul class="oaci-opace-footer__links">
					<?php
					self::render_link(
						'https://wordpress.org/plugins/ai-scribe-the-chatgpt-powered-seo-content-creation-wizard/',
						__( 'AI Scribe — AI Content Creation', 'opace-ai-content-checker-detector' ),
						'dashicons-edit'
					);
					self::render_link(
						'https://wordpress.org/plugins/opace-ai-prompt-library-api-hub/',
						__( 'AI Hub — Save Prompts & AI Models/Providers', 'opace-ai-content-checker-detector' ),
						'dashicons-wordpress'
					);
					self::render_link(
						'https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector',
						__( 'AI Content Checker - GitHub', 'opace-ai-content-checker-detector' ),
						'dashicons-editor-code'
					);
					self::render_link(
						'https://opace.agency/services/web-design/',
						__( 'Get Custom Web Design & WordPress Support', 'opace-ai-content-checker-detector' ),
						'dashicons-admin-site-alt3'
					);
					?>
				</ul>
			</section>
		</div>
		<?php
	}

	/**
	 * Render one external destination.
	 *
	 * @param string $url  Destination URL.
	 * @param string $text Visible link text.
	 * @param string $icon Dashicon class.
	 * @return void
	 */
	private static function render_link( $url, $text, $icon ) {
		?>
		<li>
			<a href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener noreferrer">
				<span class="dashicons <?php echo esc_attr( $icon ); ?>" aria-hidden="true"></span>
				<span><?php echo esc_html( $text ); ?></span>
				<span class="dashicons dashicons-external" aria-hidden="true"></span>
			</a>
		</li>
		<?php
	}
}
