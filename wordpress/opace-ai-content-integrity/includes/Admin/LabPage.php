<?php

namespace Opace\ContentIntegrity\Admin;

defined( 'ABSPATH' ) || exit;

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
				__( 'The service holds this whole site to %1$s section readings an hour and %2$s a day — a section is roughly four hundred words — and keeps a share of each day for WordPress sites so no other surface can spend it.', 'opace-ai-content-integrity' ),
				number_format_i18n( $per_hour ),
				number_format_i18n( $per_day )
			);
		}
		return __( 'The service holds this whole site to its own hourly and daily ceiling, and keeps a share of each day for WordPress sites so no other surface can spend it. If a run is refused we name which allowance it was and when it comes back.', 'opace-ai-content-integrity' );
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
				<img class="oaci-mark" src="<?php echo esc_url( OPACE_CONTENT_INTEGRITY_URL . 'assets/images/opace-ai-content-integrity-logo-256.webp' ); ?>" alt="" width="88" height="88">
				<div>
					<h1><?php esc_html_e( 'Opace AI Content Integrity', 'opace-ai-content-integrity' ); ?></h1>
					<p><?php esc_html_e( 'Read a draft the way our free online checker does: pick where it runs, then see what the model found and why.', 'opace-ai-content-integrity' ); ?></p>
				</div>
			</div>
			<nav class="oaci-suite-nav" aria-label="<?php esc_attr_e( 'Content Integrity', 'opace-ai-content-integrity' ); ?>">
				<a class="is-active" href="#checker" aria-current="page"><?php esc_html_e( 'Checker', 'opace-ai-content-integrity' ); ?></a>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=oaci-receipts' ) ); ?>"><?php esc_html_e( 'Receipts', 'opace-ai-content-integrity' ); ?></a>
				<?php if ( $this->can_manage ) : ?>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=oaci-methods' ) ); ?>"><?php esc_html_e( 'Methods & privacy', 'opace-ai-content-integrity' ); ?></a>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=oaci-settings' ) ); ?>"><?php esc_html_e( 'Settings', 'opace-ai-content-integrity' ); ?></a>
				<?php endif; ?>
			</nav>
			<div class="oaci-lab-canvas">
			<div class="oaci-layout" id="oaci-lab-root" data-oaci-lab>
				<div class="oaci-source-rail">
					<section class="oaci-panel oaci-workspace" id="checker">
						<?php $this->step( '1', __( 'Add your draft', 'opace-ai-content-integrity' ), __( 'Paste it in, open a file, or try one of our examples. Nothing leaves this browser until you choose a route that sends it.', 'opace-ai-content-integrity' ) ); ?>
						<div class="oaci-tabs" role="tablist" aria-label="<?php esc_attr_e( 'How to add your draft', 'opace-ai-content-integrity' ); ?>">
							<button type="button" role="tab" id="oaci-tab-paste" aria-controls="oaci-panel-paste" aria-selected="true" data-oaci-tab="paste">
								<?php $this->icon( 'paste' ); ?>
								<span><b><?php esc_html_e( 'Paste text', 'opace-ai-content-integrity' ); ?></b><small><?php esc_html_e( 'Straight into the box', 'opace-ai-content-integrity' ); ?></small></span>
							</button>
							<button type="button" role="tab" id="oaci-tab-upload" aria-controls="oaci-panel-upload" aria-selected="false" tabindex="-1" data-oaci-tab="upload">
								<?php $this->icon( 'upload' ); ?>
								<span><b><?php esc_html_e( 'Upload a file', 'opace-ai-content-integrity' ); ?></b><small><?php esc_html_e( 'Text, image or PDF', 'opace-ai-content-integrity' ); ?></small></span>
							</button>
							<button type="button" role="tab" id="oaci-tab-example" aria-controls="oaci-panel-example" aria-selected="false" tabindex="-1" data-oaci-tab="example">
								<?php $this->icon( 'example' ); ?>
								<span><b><?php esc_html_e( 'Try an example', 'opace-ai-content-integrity' ); ?></b><small><?php esc_html_e( 'See how it reads', 'opace-ai-content-integrity' ); ?></small></span>
							</button>
						</div>
						<div class="oaci-input-panel" id="oaci-panel-paste" role="tabpanel" aria-labelledby="oaci-tab-paste" tabindex="0">
							<label for="oaci-source"><?php esc_html_e( 'Your draft', 'opace-ai-content-integrity' ); ?></label>
							<textarea id="oaci-source" rows="14" maxlength="100000" placeholder="<?php esc_attr_e( 'Paste your draft here, or drop a text file onto this box…', 'opace-ai-content-integrity' ); ?>"></textarea>
							<p class="oaci-counter" aria-live="polite">
								<span><strong id="oaci-word-count">0</strong> <?php esc_html_e( 'words', 'opace-ai-content-integrity' ); ?></span>
								<span><strong id="oaci-source-count">0</strong> <?php esc_html_e( 'of 100,000 characters', 'opace-ai-content-integrity' ); ?></span>
								<span class="oaci-count-hint" id="oaci-count-hint" data-state="short"><?php esc_html_e( '60 words needed for AI analysis', 'opace-ai-content-integrity' ); ?></span>
							</p>
							<p id="oaci-source-error" class="oaci-field-error" hidden></p>
						</div>
						<div class="oaci-input-panel" id="oaci-panel-upload" role="tabpanel" aria-labelledby="oaci-tab-upload" tabindex="0" hidden>
							<div class="oaci-dropzone" id="oaci-dropzone">
								<?php $this->icon( 'upload' ); ?>
								<b><?php esc_html_e( 'Drop a file here', 'opace-ai-content-integrity' ); ?></b>
								<p><?php esc_html_e( 'TXT, Markdown and HTML open in the box above. JPEG, PNG, WebP and PDF run a Content Credentials check instead. Maximum file size: 20 MB.', 'opace-ai-content-integrity' ); ?></p>
								<label class="button" for="oaci-source-file"><?php esc_html_e( 'Choose a file', 'opace-ai-content-integrity' ); ?></label>
								<input class="screen-reader-text" id="oaci-source-file" type="file" accept=".txt,.md,.markdown,.html,.htm,.jpg,.jpeg,.png,.webp,.pdf,text/plain,text/markdown,text/html,image/jpeg,image/png,image/webp,application/pdf" aria-describedby="oaci-file-help oaci-file-error">
							</div>
							<span id="oaci-file-name" class="oaci-file-name"><?php esc_html_e( 'No file chosen', 'opace-ai-content-integrity' ); ?></span>
							<p id="oaci-file-help" class="oaci-file-help"><?php esc_html_e( 'Images and PDFs are checked for Content Credentials only. The AI reading needs text.', 'opace-ai-content-integrity' ); ?></p>
							<p id="oaci-file-error" class="oaci-field-error" role="alert" hidden></p>
							<p class="oaci-file-privacy"><strong><?php esc_html_e( 'Checked in this browser, not sent to us:', 'opace-ai-content-integrity' ); ?></strong> <?php esc_html_e( 'The file you choose stays in this browser. Remote manifests, certificate status and trust lists are not fetched, so we never claim a signer is trusted.', 'opace-ai-content-integrity' ); ?></p>
						</div>
						<div class="oaci-input-panel" id="oaci-panel-example" role="tabpanel" aria-labelledby="oaci-tab-example" tabindex="0" hidden>
							<div class="oaci-examples" id="oaci-examples"></div>
							<p class="oaci-file-help"><?php esc_html_e( 'Each example is a short sample written for this plugin. Choosing one replaces whatever is in the draft box.', 'opace-ai-content-integrity' ); ?></p>
						</div>

						<?php $this->step( '2', __( 'Choose how it runs', 'opace-ai-content-integrity' ), __( 'Two ways to get an AI reading, plus a checks-only option that never scores. Pick one and we will tell you exactly what happens to the draft.', 'opace-ai-content-integrity' ) ); ?>
						<fieldset class="oaci-route-picker">
							<legend class="screen-reader-text"><?php esc_html_e( 'Choose how this run should work', 'opace-ai-content-integrity' ); ?></legend>
							<label class="oaci-route-card<?php echo $server_available ? '' : ( $server_checking ? ' is-checking' : ' is-unavailable' ); ?>" data-oaci-route-card="server">
								<input type="radio" name="oaci-analysis-route" value="server" <?php checked( $server_available ); ?> <?php disabled( ! $server_available ); ?>>
								<span>
									<?php if ( $server_available ) : ?>
										<span class="oaci-route-tag oaci-route-tag--recommended" data-oaci-route-tag="server"><?php esc_html_e( 'Recommended', 'opace-ai-content-integrity' ); ?></span>
									<?php elseif ( $server_checking ) : ?>
										<span class="oaci-route-tag oaci-route-tag--checking" data-oaci-route-tag="server"><?php esc_html_e( 'Checking…', 'opace-ai-content-integrity' ); ?></span>
									<?php else : ?>
										<span class="oaci-route-tag oaci-route-tag--unavailable" data-oaci-route-tag="server"><?php esc_html_e( 'Not available yet', 'opace-ai-content-integrity' ); ?></span>
									<?php endif; ?>
									<strong><?php esc_html_e( 'Private EU analysis', 'opace-ai-content-integrity' ); ?></strong>
									<small data-oaci-route-blurb="server">
									<?php
									if ( $server_available ) {
										esc_html_e( 'Nothing to download and an answer in about a second. Local checks run here, then the draft goes once to our EU server for the AI reading and is not kept there. It has an allowance; on this device does not.', 'opace-ai-content-integrity' );
									} elseif ( $server_checking ) {
										esc_html_e( 'We are waking the EU service and asking whether it is accepting runs. That takes a few seconds when it has been idle. On this device is ready now, so you can start there.', 'opace-ai-content-integrity' );
									} else {
										esc_html_e( 'The plugin is ready for this route, but an administrator has not turned it on or the service is not accepting runs. Use “On this device” in the meantime.', 'opace-ai-content-integrity' );
									}
									?>
									</small>
								</span>
							</label>
							<label class="oaci-route-card" data-oaci-route-card="on_device">
								<input type="radio" name="oaci-analysis-route" value="on_device" <?php checked( ! $server_available ); ?>>
								<span>
									<span class="oaci-route-tag oaci-route-tag--<?php echo $server_available ? 'alternative' : 'recommended'; ?>" data-oaci-route-tag="on_device"><?php echo $server_available ? esc_html__( 'Private, no limit', 'opace-ai-content-integrity' ) : esc_html__( 'Recommended', 'opace-ai-content-integrity' ); ?></span>
									<strong><?php esc_html_e( 'On this device', 'opace-ai-content-integrity' ); ?></strong>
									<small><?php esc_html_e( 'On this route the draft stays in your browser and is not sent to Opace or to this site for scoring, and there is no limit on how often you run it. The first run downloads a 34.5 MB model we check against a pinned hash; after that it is cached.', 'opace-ai-content-integrity' ); ?></small>
								</span>
							</label>
							<label class="oaci-route-card oaci-route-card--subordinate">
								<input type="radio" name="oaci-analysis-route" value="local">
								<span>
									<strong><?php esc_html_e( 'Integrity checks only', 'opace-ai-content-integrity' ); ?></strong>
									<small><?php esc_html_e( 'Hidden characters, lookalike letters and writing patterns. Nothing downloads and nothing is sent, but this route does not produce an AI-pattern score.', 'opace-ai-content-integrity' ); ?></small>
								</span>
							</label>
						</fieldset>
						<p class="oaci-route-live" id="oaci-route-live" role="status" aria-live="polite"><?php echo $server_checking ? esc_html__( 'Checking whether private EU analysis is available. On this device is ready to run now.', 'opace-ai-content-integrity' ) : ''; ?></p>
						<?php if ( ! $server_available && ! $server_checking && $this->can_manage ) : ?>
							<p class="oaci-route-setup"><a href="<?php echo esc_url( admin_url( 'admin.php?page=oaci-settings' ) ); ?>"><?php esc_html_e( 'See what the EU route would do', 'opace-ai-content-integrity' ); ?></a></p>
						<?php endif; ?>
						<div id="oaci-route-disclosure" class="oaci-route-disclosure" role="status" aria-live="polite">
							<strong><?php echo $server_available ? esc_html__( 'What happens to your draft: private EU analysis', 'opace-ai-content-integrity' ) : esc_html__( 'What happens to your draft: on this device', 'opace-ai-content-integrity' ); ?></strong>
							<p><?php echo $server_available ? esc_html__( 'When you press the button, the draft goes once through this WordPress site to our fixed EU service, is read there in memory to produce the reading, and is not kept. If that route is busy or has reached an allowance we will say so and offer to run it on this device instead.', 'opace-ai-content-integrity' ) : esc_html__( 'The model runs in this browser. On this route your draft is not sent to Opace or to this site for scoring; only the pinned model files download, and only after you agree.', 'opace-ai-content-integrity' ); ?></p>
						</div>
						<label class="oaci-server-consent" id="oaci-server-consent-row" <?php echo $server_available ? '' : 'hidden'; ?>>
							<input type="checkbox" id="oaci-server-consent">
							<span><?php esc_html_e( 'I understand that this draft will be sent once to the Opace EU server for this run.', 'opace-ai-content-integrity' ); ?></span>
						</label>
						<label class="oaci-server-consent oaci-model-consent" id="oaci-model-consent-row" <?php echo $server_available ? 'hidden' : ''; ?>>
							<input type="checkbox" id="oaci-model-consent">
							<span>
								<strong>
								<?php
								printf(
									/* translators: %s: the download size, for example 34.5 MB. */
									esc_html__( 'Download the %s model file to this device if it is not already here.', 'opace-ai-content-integrity' ),
									esc_html( $this->limits['model_label'] )
								);
								?>
								</strong>
								<span class="oaci-model-consent__facts">
									<?php esc_html_e( 'This is a data file of model weights, not a program. Your browser fetches it from opace.agency the same way it fetches an image, checks it against a hash published in this plugin before anything runs, keeps it cached like any other web asset, and you can remove it with one click below.', 'opace-ai-content-integrity' ); ?>
								</span>
								<span class="oaci-model-consent__figures">
									<?php
									printf(
										/* translators: 1: file name, 2: exact byte count, 3: first eight characters of the SHA-256 hash. */
										esc_html__( '%1$s · %2$s bytes · SHA-256 begins %3$s…', 'opace-ai-content-integrity' ),
										esc_html( $this->limits['model_file'] ),
										esc_html( number_format_i18n( (int) $this->limits['model_bytes'] ) ),
										esc_html( substr( (string) $this->limits['model_sha256'], 0, 8 ) )
									);
									?>
								</span>
							</span>
						</label>
						<div class="oaci-model-download" id="oaci-model-download" <?php echo $server_available ? 'hidden' : ''; ?>>
							<span class="oaci-model-download__state">
								<span id="oaci-model-cache-state"><?php esc_html_e( 'We will look for a cached model on this device when you press the button. That check needs no network.', 'opace-ai-content-integrity' ); ?></span>
								<span class="oaci-model-bar" id="oaci-model-bar" hidden><i></i></span>
							</span>
							<button type="button" class="button-link" id="oaci-clear-model-cache"><?php esc_html_e( 'Clear downloaded model', 'opace-ai-content-integrity' ); ?></button>
						</div>
						<details class="oaci-usage-limits">
							<summary><?php esc_html_e( 'How much this site will check at once', 'opace-ai-content-integrity' ); ?></summary>
							<ul>
								<li>
								<?php
								printf(
									/* translators: %s: the character limit for this site. */
									esc_html__( 'Up to %s characters in one run. A longer draft is refused with a message; it is never quietly shortened.', 'opace-ai-content-integrity' ),
									esc_html( number_format_i18n( (int) $this->limits['max_chars'] ) )
								);
								?>
								</li>
								<li>
								<?php
								printf(
									/* translators: %s: the minimum word count for an AI reading. */
									esc_html__( 'At least %s words for an AI reading. Shorter drafts still get the character and writing checks.', 'opace-ai-content-integrity' ),
									esc_html( number_format_i18n( (int) $this->limits['min_words'] ) )
								);
								?>
								</li>
								<li>
								<?php
								printf(
									/* translators: %s: the file size limit in megabytes. */
									esc_html__( 'Files up to %s MB for a Content Credentials check.', 'opace-ai-content-integrity' ),
									esc_html( number_format_i18n( (int) $this->limits['max_file_mb'] ) )
								);
								?>
								</li>
								<li>
								<?php
								printf(
									/* translators: 1: runs per minute, 2: runs per hour. */
									esc_html__( 'Private EU analysis: %1$s runs a minute and %2$s an hour for each person, so one account cannot use up this site’s share. If you reach it we say so and tell you when to try again.', 'opace-ai-content-integrity' ),
									esc_html( number_format_i18n( (int) $this->limits['server_per_min'] ) ),
									esc_html( number_format_i18n( (int) $this->limits['server_per_hour'] ) )
								);
								?>
								</li>
								<li><?php echo esc_html( $this->service_allowance_line() ); ?></li>
								<li><?php esc_html_e( 'On this device: no run limit at all. It is your computer doing the work, so it is the one route that cannot run out.', 'opace-ai-content-integrity' ); ?></li>
							</ul>
						</details>
						<div class="oaci-primary-row">
							<p class="oaci-primary-note" id="oaci-primary-note"><?php esc_html_e( 'Add at least 60 words for an AI reading. Shorter drafts still get the character and writing checks.', 'opace-ai-content-integrity' ); ?></p>
							<button type="button" class="oaci-primary" id="oaci-inspect"><?php esc_html_e( 'Check my draft', 'opace-ai-content-integrity' ); ?></button>
						</div>
						<div id="oaci-run-progress" class="oaci-run-progress" role="status" aria-live="polite" hidden>
							<div>
								<strong id="oaci-run-phase"><?php esc_html_e( 'Getting ready…', 'opace-ai-content-integrity' ); ?></strong>
								<progress aria-label="<?php esc_attr_e( 'Analysis in progress', 'opace-ai-content-integrity' ); ?>"></progress>
							</div>
							<button type="button" class="button" id="oaci-cancel-run"><?php esc_html_e( 'Cancel', 'opace-ai-content-integrity' ); ?></button>
						</div>
					</section>
					<section class="oaci-panel" id="oaci-fix-panel" tabindex="-1" hidden>
						<h2><?php esc_html_e( 'Safe-fix preview', 'opace-ai-content-integrity' ); ?></h2>
						<p><?php esc_html_e( 'These fixes change characters and spacing only. They do not test for, or remove, a statistical watermark.', 'opace-ai-content-integrity' ); ?></p>
						<div id="oaci-fix-list"></div>
						<button type="button" class="button" id="oaci-apply-fixes"><?php esc_html_e( 'Apply selected fixes to the draft', 'opace-ai-content-integrity' ); ?></button>
					</section>
					<section class="oaci-panel" id="oaci-protected" tabindex="-1" hidden>
						<h2><?php esc_html_e( 'Protected facts', 'opace-ai-content-integrity' ); ?></h2>
						<p><?php esc_html_e( 'Numbers, dates, links, quotations, citations and code found in your draft. Safe fixes never touch these.', 'opace-ai-content-integrity' ); ?></p>
						<div id="oaci-protected-list"></div>
					</section>
				</div>
				<aside class="oaci-evidence-rail" aria-labelledby="oaci-evidence-title" tabindex="0">
					<h2 id="oaci-evidence-title"><?php esc_html_e( 'Your result', 'opace-ai-content-integrity' ); ?></h2>
					<p class="oaci-rail-lead"><?php esc_html_e( 'Evidence to read, not proof of who wrote it.', 'opace-ai-content-integrity' ); ?></p>
					<div id="oaci-status" role="status" aria-live="polite"><?php esc_html_e( 'Ready when you are.', 'opace-ai-content-integrity' ); ?></div>
					<div class="oaci-toolbar">
						<button type="button" class="button" id="oaci-print" disabled><?php $this->icon( 'print' ); ?><?php esc_html_e( 'Print', 'opace-ai-content-integrity' ); ?></button>
						<button type="button" class="button" id="oaci-download-pdf" disabled><?php $this->icon( 'download' ); ?><?php esc_html_e( 'Download PDF', 'opace-ai-content-integrity' ); ?></button>
						<button type="button" class="button" id="oaci-download-json" disabled><?php $this->icon( 'download' ); ?><?php esc_html_e( 'Download JSON receipt', 'opace-ai-content-integrity' ); ?></button>
						<button type="button" class="button" id="oaci-copy-share" disabled><?php $this->icon( 'share' ); ?><?php esc_html_e( 'Copy share summary', 'opace-ai-content-integrity' ); ?></button>
						<button type="button" class="button" id="oaci-save-receipt" disabled><?php $this->icon( 'receipt' ); ?><?php esc_html_e( 'Save hash-only receipt', 'opace-ai-content-integrity' ); ?></button>
						<button type="button" class="button" id="oaci-preview-fixes" disabled><?php $this->icon( 'fix' ); ?><?php esc_html_e( 'Safe-fix preview', 'opace-ai-content-integrity' ); ?></button>
						<button type="button" class="button" id="oaci-show-protected" disabled><?php $this->icon( 'lock' ); ?><?php esc_html_e( 'Protected facts', 'opace-ai-content-integrity' ); ?></button>
					</div>
					<div class="oaci-model-state" id="oaci-model-state">
						<strong><?php esc_html_e( 'AI-pattern model', 'opace-ai-content-integrity' ); ?></strong>
						<span class="oaci-chip oaci-chip--not_run" id="oaci-model-state-badge"><?php esc_html_e( 'Not run', 'opace-ai-content-integrity' ); ?></span>
						<p id="oaci-model-state-note"><?php esc_html_e( 'Choose the EU server or the on-device route for an AI reading. Character and writing checks alone never set that score.', 'opace-ai-content-integrity' ); ?></p>
					</div>
					<div id="oaci-results">
						<div class="oaci-empty-state">
							<span aria-hidden="true"><?php $this->icon( 'target' ); ?></span>
							<h3><?php esc_html_e( 'Your result will appear here', 'opace-ai-content-integrity' ); ?></h3>
							<p><?php esc_html_e( 'Add a draft, choose how it runs, then press Check my draft. Every check that ran, and every one that could not, stays on the page.', 'opace-ai-content-integrity' ); ?></p>
						</div>
					</div>
				</aside>
			</div>
			</div>
			<div class="oaci-footer"><a href="https://opace.agency/tools/ai/content-verification-integrity/" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'How the checker works', 'opace-ai-content-integrity' ); ?></a> · <?php esc_html_e( 'Evidence, not guarantees.', 'opace-ai-content-integrity' ); ?></div>
		</div>
		<?php
	}

	private function step( $number, $title, $description ) {
		?>
		<div class="oaci-step">
			<span class="oaci-step__number" aria-hidden="true"><?php echo esc_html( $number ); ?></span>
			<div>
				<h2><?php echo esc_html( $title ); ?></h2>
				<p><?php echo esc_html( $description ); ?></p>
			</div>
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
