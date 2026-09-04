<?php

namespace Opace\ContentIntegrity\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * The checker screen.
 *
 * Two steps and a result, in one column, in that order. Step one takes the
 * draft. Step two picks the route, in three cards of one line each. The button
 * under them says exactly what pressing it will do — including sending the
 * draft once, or downloading the model — so the agreement is the press itself
 * rather than a box beside it that a reader can miss. Everything longer than a
 * line sits behind one disclosure that looks like a disclosure.
 */
final class LabPage {
	private $server_status;
	private $can_manage;
	private $limits;

	public function __construct( array $server_status, $can_manage = false, array $limits = array() ) {
		$this->server_status = $server_status;
		$this->can_manage    = (bool) $can_manage;
		$this->limits        = wp_parse_args(
			$limits,
			array(
				'max_chars'       => 100000,
				'min_words'       => 60,
				'max_file_mb'     => 20,
				'server_per_min'  => 3,
				'server_per_hour' => 20,
				'model_label'     => '34.5 MB',
				'model_bytes'     => 34301767,
				'model_sha256'    => '',
				'model_file'      => '',
				'service'         => array(),
				'recommended'     => 'on_device',
			)
		);
	}

	/**
	 * What the service itself allows this whole site, in whatever detail it has
	 * published. When it has published no figure the rule is stated without one,
	 * because a made-up number on a limits panel is worse than no number.
	 *
	 * @return string
	 */
	private function service_allowance_line() {
		$service  = is_array( $this->limits['service'] ) ? $this->limits['service'] : array();
		$per_hour = isset( $service['site_per_hour'] ) && is_int( $service['site_per_hour'] ) ? $service['site_per_hour'] : null;
		$per_day  = isset( $service['site_per_day'] ) && is_int( $service['site_per_day'] ) ? $service['site_per_day'] : null;
		if ( null !== $per_hour && null !== $per_day ) {
			return sprintf(
				/* translators: 1: section readings an hour for the whole site, 2: section readings a day. */
				__( 'The service holds this whole site to %1$s section readings an hour and %2$s a day. A section is roughly four hundred words.', 'opace-ai-content-checker-detector' ),
				number_format_i18n( $per_hour ),
				number_format_i18n( $per_day )
			);
		}
		return __( 'The service holds this whole site to its own hourly and daily ceiling. If a run is refused we name which allowance it was and when it comes back.', 'opace-ai-content-checker-detector' );
	}

	public function render() {
		$server_available = ! empty( $this->server_status['available'] );
		// The EU service scales to zero, so a cold container takes longer to
		// answer than this page should ever wait. Nothing is asked of it while
		// the page is drawn: when no answer is held the card says it is being
		// checked, the browser asks through the site's own REST route, and the
		// chooser is corrected in place. "Being checked" and "not available"
		// are different things, and only one of them is honest here.
		$server_checking = ! $server_available && ! empty( $this->server_status['checking'] );
		?>
		<div class="wrap oaci-wrap">
			<div class="oaci-header">
				<img class="oaci-mark" src="<?php echo esc_url( OPACE_CONTENT_INTEGRITY_URL . 'assets/images/opace-ai-content-checker-detector-logo-256.webp' ); ?>" alt="" width="88" height="88">
				<div>
					<h1><?php esc_html_e( 'Opace AI Content Checker & Detector', 'opace-ai-content-checker-detector' ); ?></h1>
					<p><?php esc_html_e( 'Read a draft the way our free online checker does. Add the text, pick where it runs, then see what the model found and why.', 'opace-ai-content-checker-detector' ); ?></p>
				</div>
			</div>
			<nav class="oaci-suite-nav" aria-label="<?php esc_attr_e( 'AI Content Checker', 'opace-ai-content-checker-detector' ); ?>">
				<a class="is-active" href="#checker" aria-current="page"><?php esc_html_e( 'Checker', 'opace-ai-content-checker-detector' ); ?></a>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=oaci-receipts' ) ); ?>"><?php esc_html_e( 'Receipts', 'opace-ai-content-checker-detector' ); ?></a>
				<?php if ( $this->can_manage ) : ?>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=oaci-methods' ) ); ?>"><?php esc_html_e( 'Methods & privacy', 'opace-ai-content-checker-detector' ); ?></a>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=oaci-settings' ) ); ?>"><?php esc_html_e( 'Settings', 'opace-ai-content-checker-detector' ); ?></a>
				<?php endif; ?>
			</nav>
			<div class="oaci-lab" id="oaci-lab-root" data-oaci-lab>

				<section class="oaci-panel" id="oaci-step-draft">
					<div class="oaci-step-head" id="checker">
						<span class="oaci-step-head__number" aria-hidden="true">1</span>
						<div>
							<h2><?php esc_html_e( 'Add your draft', 'opace-ai-content-checker-detector' ); ?></h2>
							<p><?php esc_html_e( 'Paste it in, open a file, or try one of our examples.', 'opace-ai-content-checker-detector' ); ?></p>
						</div>
					</div>
					<div class="oaci-tabs" role="tablist" aria-label="<?php esc_attr_e( 'How to add your draft', 'opace-ai-content-checker-detector' ); ?>">
						<button type="button" role="tab" id="oaci-tab-paste" aria-controls="oaci-panel-paste" aria-selected="true" data-oaci-tab="paste">
							<?php $this->icon( 'paste' ); ?>
							<span><b><?php esc_html_e( 'Paste text', 'opace-ai-content-checker-detector' ); ?></b><small><?php esc_html_e( 'Straight into the box', 'opace-ai-content-checker-detector' ); ?></small></span>
						</button>
						<button type="button" role="tab" id="oaci-tab-upload" aria-controls="oaci-panel-upload" aria-selected="false" tabindex="-1" data-oaci-tab="upload">
							<?php $this->icon( 'upload' ); ?>
							<span><b><?php esc_html_e( 'Upload a file', 'opace-ai-content-checker-detector' ); ?></b><small><?php esc_html_e( 'Text, image or PDF', 'opace-ai-content-checker-detector' ); ?></small></span>
						</button>
						<button type="button" role="tab" id="oaci-tab-example" aria-controls="oaci-panel-example" aria-selected="false" tabindex="-1" data-oaci-tab="example">
							<?php $this->icon( 'example' ); ?>
							<span><b><?php esc_html_e( 'Try an example', 'opace-ai-content-checker-detector' ); ?></b><small><?php esc_html_e( 'See how it reads', 'opace-ai-content-checker-detector' ); ?></small></span>
						</button>
					</div>
					<div class="oaci-input-panel" id="oaci-panel-paste" role="tabpanel" aria-labelledby="oaci-tab-paste" tabindex="0">
						<label for="oaci-source"><?php esc_html_e( 'Your draft', 'opace-ai-content-checker-detector' ); ?></label>
						<textarea id="oaci-source" rows="10" maxlength="100000" placeholder="<?php esc_attr_e( 'Paste your draft here, or drop a text file onto this box…', 'opace-ai-content-checker-detector' ); ?>"></textarea>
						<p class="oaci-counter" aria-live="polite">
							<span><strong id="oaci-word-count">0</strong> <?php esc_html_e( 'words', 'opace-ai-content-checker-detector' ); ?></span>
							<span><strong id="oaci-source-count">0</strong> <?php esc_html_e( 'of 100,000 characters', 'opace-ai-content-checker-detector' ); ?></span>
							<span class="oaci-count-hint" id="oaci-count-hint" data-state="short"><?php esc_html_e( '60 words needed for AI analysis', 'opace-ai-content-checker-detector' ); ?></span>
						</p>
						<p id="oaci-source-error" class="oaci-field-error" hidden></p>
					</div>
					<div class="oaci-input-panel" id="oaci-panel-upload" role="tabpanel" aria-labelledby="oaci-tab-upload" tabindex="0" hidden>
						<div class="oaci-dropzone" id="oaci-dropzone">
							<?php $this->icon( 'upload' ); ?>
							<b><?php esc_html_e( 'Drop a file here', 'opace-ai-content-checker-detector' ); ?></b>
							<p><?php esc_html_e( 'TXT, Markdown and HTML open in the box. JPEG, PNG, WebP and PDF run a Content Credentials check instead. Maximum file size: 20 MB.', 'opace-ai-content-checker-detector' ); ?></p>
							<label class="oaci-button" for="oaci-source-file"><?php esc_html_e( 'Choose a file', 'opace-ai-content-checker-detector' ); ?></label>
							<input class="screen-reader-text" id="oaci-source-file" type="file" accept=".txt,.md,.markdown,.html,.htm,.jpg,.jpeg,.png,.webp,.pdf,text/plain,text/markdown,text/html,image/jpeg,image/png,image/webp,application/pdf" aria-describedby="oaci-file-help oaci-file-error">
						</div>
						<span id="oaci-file-name" class="oaci-file-name"><?php esc_html_e( 'No file chosen', 'opace-ai-content-checker-detector' ); ?></span>
						<p id="oaci-file-help" class="oaci-file-help"><?php esc_html_e( 'Images and PDFs are checked for Content Credentials only. The AI reading needs text.', 'opace-ai-content-checker-detector' ); ?></p>
						<p id="oaci-file-error" class="oaci-field-error" role="alert" hidden></p>
						<details class="oaci-disclosure">
							<summary><?php esc_html_e( 'What happens to a file you open', 'opace-ai-content-checker-detector' ); ?></summary>
							<div class="oaci-disclosure__body">
								<p><?php esc_html_e( 'The file you choose is read in this browser and is not sent to Opace or to this site. Remote manifests, certificate status and trust lists are not fetched, so we never claim a signer is trusted.', 'opace-ai-content-checker-detector' ); ?></p>
							</div>
						</details>
					</div>
					<div class="oaci-input-panel" id="oaci-panel-example" role="tabpanel" aria-labelledby="oaci-tab-example" tabindex="0" hidden>
						<div class="oaci-examples" id="oaci-examples"></div>
						<p class="oaci-file-help"><?php esc_html_e( 'Each example is a short sample written for this plugin. Choosing one replaces whatever is in the draft box.', 'opace-ai-content-checker-detector' ); ?></p>
					</div>
				</section>

				<section class="oaci-panel" id="oaci-step-route">
					<div class="oaci-step-head">
						<span class="oaci-step-head__number" aria-hidden="true">2</span>
						<div>
							<h2><?php esc_html_e( 'Choose how it runs', 'opace-ai-content-checker-detector' ); ?></h2>
							<p><?php esc_html_e( 'One is always selected. The button below says exactly what pressing it will do.', 'opace-ai-content-checker-detector' ); ?></p>
						</div>
					</div>
					<fieldset class="oaci-routes">
						<legend class="screen-reader-text"><?php esc_html_e( 'Choose how this run should work', 'opace-ai-content-checker-detector' ); ?></legend>
						<label class="oaci-route<?php echo $server_available ? '' : ( $server_checking ? ' is-checking' : ' is-unavailable' ); ?>" data-oaci-route-card="server">
							<input type="radio" name="oaci-analysis-route" value="server" <?php checked( $server_available ); ?> <?php disabled( ! $server_available ); ?>>
							<span>
								<?php if ( $server_available ) : ?>
									<span class="oaci-route-tag oaci-route-tag--recommended" data-oaci-route-tag="server"><?php esc_html_e( 'Recommended', 'opace-ai-content-checker-detector' ); ?></span>
								<?php elseif ( $server_checking ) : ?>
									<span class="oaci-route-tag oaci-route-tag--checking" data-oaci-route-tag="server"><?php esc_html_e( 'Checking…', 'opace-ai-content-checker-detector' ); ?></span>
								<?php else : ?>
									<span class="oaci-route-tag oaci-route-tag--unavailable" data-oaci-route-tag="server"><?php esc_html_e( 'Not available yet', 'opace-ai-content-checker-detector' ); ?></span>
								<?php endif; ?>
								<strong><?php esc_html_e( 'Private EU analysis', 'opace-ai-content-checker-detector' ); ?></strong>
								<small data-oaci-route-blurb="server">
								<?php
								if ( $server_available ) {
									esc_html_e( 'Nothing to download. Your draft goes once to our EU server, which reads it and does not keep it.', 'opace-ai-content-checker-detector' );
								} elseif ( $server_checking ) {
									esc_html_e( 'We are asking the EU service whether it is accepting runs. On this device is ready now.', 'opace-ai-content-checker-detector' );
								} else {
									esc_html_e( 'An administrator has not turned it on or the service is not accepting runs. Use on this device instead.', 'opace-ai-content-checker-detector' );
								}
								?>
								</small>
							</span>
						</label>
						<label class="oaci-route" data-oaci-route-card="on_device">
							<input type="radio" name="oaci-analysis-route" value="on_device" <?php checked( ! $server_available ); ?>>
							<span>
								<span class="oaci-route-tag oaci-route-tag--<?php echo $server_available ? 'alternative' : 'recommended'; ?>" data-oaci-route-tag="on_device"><?php echo $server_available ? esc_html__( 'Private, no limit', 'opace-ai-content-checker-detector' ) : esc_html__( 'Recommended', 'opace-ai-content-checker-detector' ); ?></span>
								<strong><?php esc_html_e( 'On this device', 'opace-ai-content-checker-detector' ); ?></strong>
								<small><?php esc_html_e( 'The model runs in your browser. On this route the draft is not sent to Opace or to this site.', 'opace-ai-content-checker-detector' ); ?></small>
							</span>
						</label>
						<label class="oaci-route" data-oaci-route-card="local">
							<input type="radio" name="oaci-analysis-route" value="local">
							<span>
								<span class="oaci-route-tag oaci-route-tag--alternative" data-oaci-route-tag="local"><?php esc_html_e( 'No AI reading', 'opace-ai-content-checker-detector' ); ?></span>
								<strong><?php esc_html_e( 'Integrity checks only', 'opace-ai-content-checker-detector' ); ?></strong>
								<small><?php esc_html_e( 'Hidden characters, lookalike letters and writing patterns. This route does not produce an AI-pattern score.', 'opace-ai-content-checker-detector' ); ?></small>
							</span>
						</label>
					</fieldset>
					<p class="oaci-route-live" id="oaci-route-live" role="status" aria-live="polite"><?php echo $server_checking ? esc_html__( 'Checking whether private EU analysis is available. On this device is ready to run now.', 'opace-ai-content-checker-detector' ) : ''; ?></p>
					<?php if ( ! $server_available && ! $server_checking && $this->can_manage ) : ?>
						<p class="oaci-route-setup"><a href="<?php echo esc_url( admin_url( 'admin.php?page=oaci-settings' ) ); ?>"><?php esc_html_e( 'See what the EU route would do', 'opace-ai-content-checker-detector' ); ?></a></p>
					<?php endif; ?>

					<div class="oaci-run">
						<div class="oaci-run__action">
							<p class="oaci-run__note" id="oaci-primary-note"><?php esc_html_e( 'Add at least 60 words for an AI reading. Shorter drafts still get the character and writing checks.', 'opace-ai-content-checker-detector' ); ?></p>
							<button type="button" class="oaci-button oaci-button--primary" id="oaci-inspect"><?php esc_html_e( 'Check my draft', 'opace-ai-content-checker-detector' ); ?></button>
						</div>
						<div class="oaci-model-line" id="oaci-model-download" hidden>
							<span class="oaci-model-line__state" id="oaci-model-cache-state"><?php esc_html_e( 'We will look for a model already on this device when you press the button. That check needs no network.', 'opace-ai-content-checker-detector' ); ?></span>
							<button type="button" class="oaci-button oaci-button--quiet" id="oaci-clear-model-cache"><?php esc_html_e( 'Clear downloaded model', 'opace-ai-content-checker-detector' ); ?></button>
						</div>
						<details class="oaci-disclosure" id="oaci-route-disclosure">
							<summary><?php esc_html_e( 'How this route works', 'opace-ai-content-checker-detector' ); ?></summary>
							<div class="oaci-disclosure__body">
								<p id="oaci-route-detail"><?php echo $server_available ? esc_html__( 'When you press the button, the draft goes once through this WordPress site to our fixed EU service, is read there in memory to produce the reading, and is not kept. If that route is busy or has reached an allowance we say so and offer to run it on this device instead.', 'opace-ai-content-checker-detector' ) : esc_html__( 'The model runs in this browser. On this route your draft is not sent to Opace or to this site for scoring; only the pinned model files download, and only when you press a button that says so.', 'opace-ai-content-checker-detector' ); ?></p>
								<p id="oaci-model-facts" class="oaci-file-help"
								<?php
								echo $server_available ? ' hidden' : '';
								?>
								>
								<?php
								printf(
									/* translators: 1: download size, 2: file name, 3: exact byte count, 4: first eight characters of the SHA-256 hash. */
									esc_html__( 'The download is %1$s of model weights: %2$s, %3$s bytes, SHA-256 begins %4$s. It is a data file, not a program. Your browser checks it against a hash published in this plugin before anything reads it, keeps it cached like any other web asset, and you can remove it with one click.', 'opace-ai-content-checker-detector' ),
									esc_html( $this->limits['model_label'] ),
									esc_html( $this->limits['model_file'] ),
									esc_html( number_format_i18n( (int) $this->limits['model_bytes'] ) ),
									esc_html( substr( (string) $this->limits['model_sha256'], 0, 8 ) )
								);
								?>
								</p>
								<h3 class="oaci-eyebrow"><?php esc_html_e( 'How much this site will check at once', 'opace-ai-content-checker-detector' ); ?></h3>
								<ul class="oaci-usage-limits">
									<li>
									<?php
									printf(
										/* translators: %s: the character limit for this site. */
										esc_html__( 'Up to %s characters in one run. A longer draft is refused with a message; it is never quietly shortened.', 'opace-ai-content-checker-detector' ),
										esc_html( number_format_i18n( (int) $this->limits['max_chars'] ) )
									);
									?>
									</li>
									<li>
									<?php
									printf(
										/* translators: %s: the minimum word count for an AI reading. */
										esc_html__( 'At least %s words for an AI reading. Shorter drafts still get the character and writing checks.', 'opace-ai-content-checker-detector' ),
										esc_html( number_format_i18n( (int) $this->limits['min_words'] ) )
									);
									?>
									</li>
									<li>
									<?php
									printf(
										/* translators: %s: the file size limit in megabytes. */
										esc_html__( 'Files up to %s MB for a Content Credentials check.', 'opace-ai-content-checker-detector' ),
										esc_html( number_format_i18n( (int) $this->limits['max_file_mb'] ) )
									);
									?>
									</li>
									<li>
									<?php
									printf(
										/* translators: 1: runs per minute, 2: runs per hour. */
										esc_html__( 'Private EU analysis: %1$s runs a minute and %2$s an hour for each person, so one account cannot use up this site’s share.', 'opace-ai-content-checker-detector' ),
										esc_html( number_format_i18n( (int) $this->limits['server_per_min'] ) ),
										esc_html( number_format_i18n( (int) $this->limits['server_per_hour'] ) )
									);
									?>
									</li>
									<li><?php echo esc_html( $this->service_allowance_line() ); ?></li>
									<li><?php esc_html_e( 'On this device: no run limit at all. It is your own computer doing the work, so it is the one route that cannot run out.', 'opace-ai-content-checker-detector' ); ?></li>
								</ul>
							</div>
						</details>
						<div id="oaci-run-progress" class="oaci-progress" role="status" aria-live="polite" hidden>
							<div>
								<strong id="oaci-run-phase"><?php esc_html_e( 'Getting ready…', 'opace-ai-content-checker-detector' ); ?></strong>
								<progress aria-label="<?php esc_attr_e( 'Analysis in progress', 'opace-ai-content-checker-detector' ); ?>"></progress>
							</div>
							<button type="button" class="oaci-button" id="oaci-cancel-run"><?php esc_html_e( 'Cancel this run', 'opace-ai-content-checker-detector' ); ?></button>
						</div>
					</div>
				</section>

				<section class="oaci-panel oaci-result-panel" id="oaci-result-panel" aria-labelledby="oaci-evidence-title" tabindex="0">
					<div class="oaci-result-head">
						<div>
							<h2 id="oaci-evidence-title"><?php esc_html_e( 'Your result', 'opace-ai-content-checker-detector' ); ?></h2>
							<p><?php esc_html_e( 'Evidence to read, not proof of who wrote it.', 'opace-ai-content-checker-detector' ); ?></p>
						</div>
					</div>
					<div class="oaci-toolbar" id="oaci-toolbar" hidden>
						<button type="button" class="oaci-button" id="oaci-print" disabled><?php $this->icon( 'print' ); ?><?php esc_html_e( 'Print', 'opace-ai-content-checker-detector' ); ?></button>
						<button type="button" class="oaci-button" id="oaci-download-pdf" disabled><?php $this->icon( 'download' ); ?><?php esc_html_e( 'Download PDF', 'opace-ai-content-checker-detector' ); ?></button>
						<button type="button" class="oaci-button" id="oaci-download-json" disabled><?php $this->icon( 'download' ); ?><?php esc_html_e( 'Download JSON receipt', 'opace-ai-content-checker-detector' ); ?></button>
						<button type="button" class="oaci-button" id="oaci-copy-share" disabled><?php $this->icon( 'share' ); ?><?php esc_html_e( 'Copy share summary', 'opace-ai-content-checker-detector' ); ?></button>
						<button type="button" class="oaci-button" id="oaci-save-receipt" disabled><?php $this->icon( 'receipt' ); ?><?php esc_html_e( 'Save hash-only receipt', 'opace-ai-content-checker-detector' ); ?></button>
						<button type="button" class="oaci-button" id="oaci-preview-fixes" disabled><?php $this->icon( 'fix' ); ?><?php esc_html_e( 'Safe-fix preview', 'opace-ai-content-checker-detector' ); ?></button>
						<button type="button" class="oaci-button" id="oaci-show-protected" disabled><?php $this->icon( 'lock' ); ?><?php esc_html_e( 'Protected facts', 'opace-ai-content-checker-detector' ); ?></button>
					</div>
					<p class="oaci-toolbar-note" id="oaci-toolbar-note" hidden></p>
					<div id="oaci-status" role="status" aria-live="polite"></div>
					<div id="oaci-results">
						<div class="oaci-empty">
							<span class="oaci-empty__icon" aria-hidden="true"><?php $this->icon( 'target' ); ?></span>
							<h3><?php esc_html_e( 'Your result will appear here', 'opace-ai-content-checker-detector' ); ?></h3>
							<p><?php esc_html_e( 'Add a draft, choose how it runs, then press the button in step two. Every check that ran, and every one that could not, stays on this page.', 'opace-ai-content-checker-detector' ); ?></p>
						</div>
					</div>
					<div id="oaci-fix-panel" class="oaci-local-card" tabindex="-1" hidden>
						<h3><?php esc_html_e( 'Safe-fix preview', 'opace-ai-content-checker-detector' ); ?></h3>
						<p class="oaci-local-card__lead"><?php esc_html_e( 'These fixes change characters and spacing only. They do not test for, or remove, a statistical watermark.', 'opace-ai-content-checker-detector' ); ?></p>
						<div id="oaci-fix-list"></div>
						<button type="button" class="oaci-button" id="oaci-apply-fixes"><?php esc_html_e( 'Apply selected fixes to the draft', 'opace-ai-content-checker-detector' ); ?></button>
					</div>
					<div id="oaci-protected" class="oaci-local-card" tabindex="-1" hidden>
						<h3><?php esc_html_e( 'Protected facts', 'opace-ai-content-checker-detector' ); ?></h3>
						<p class="oaci-local-card__lead"><?php esc_html_e( 'Numbers, dates, links, quotations, citations and code found in your draft. Safe fixes never touch these.', 'opace-ai-content-checker-detector' ); ?></p>
						<div id="oaci-protected-list"></div>
					</div>
				</section>

			</div>
			<div class="oaci-footer"><a href="https://opace.agency/tools/ai/content-verification-integrity/" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'How the checker works', 'opace-ai-content-checker-detector' ); ?></a> · <?php esc_html_e( 'Evidence, not guarantees.', 'opace-ai-content-checker-detector' ); ?></div>
		</div>
		<?php
	}

	private function icon( $name ) {
		$paths = array(
			'paste'    => '<path d="M8 4h8v3H8z"/><path d="M9 2h6a1 1 0 0 1 1 1v1H8V3a1 1 0 0 1 1-1Z"/><path d="M5 5h2v2h10V5h2a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>',
			'upload'   => '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
			'example'  => '<path d="M10 3h4v6l4 8a2 2 0 0 1-1.8 3H7.8A2 2 0 0 1 6 17l4-8V3Z"/><path d="M8 3h8"/>',
			'print'    => '<path d="M7 8V3h10v5"/><path d="M5 8h14a2 2 0 0 1 2 2v6h-4v5H7v-5H3v-6a2 2 0 0 1 2-2Z"/>',
			'download' => '<path d="M12 3v11"/><path d="m8 11 4 4 4-4"/><path d="M4 17v3h16v-3"/>',
			'share'    => '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5"/>',
			'receipt'  => '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',
			'fix'      => '<path d="m14 6 4 4-9 9H5v-4l9-9Z"/><path d="m13 7 4 4"/>',
			'lock'     => '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
			'target'   => '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
		);
		if ( ! isset( $paths[ $name ] ) ) {
			return;
		}
		echo '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $paths[ $name ] . '</svg>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Fixed inline SVG path data from the local allow-list above.
	}
}
