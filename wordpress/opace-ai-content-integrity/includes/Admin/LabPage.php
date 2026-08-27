<?php

namespace Opace\ContentIntegrity\Admin;

defined( 'ABSPATH' ) || exit;

final class LabPage {
	public function render() {
		?>
		<div class="wrap oaci-wrap">
			<div class="oaci-header">
				<div class="oaci-mark" aria-hidden="true"><span>1</span><span>2</span><span>3</span></div>
				<div><h1><?php esc_html_e( 'Opace AI Content Integrity', 'opace-ai-content-integrity' ); ?></h1><p><?php esc_html_e( 'Inspect drafts locally, protect evidence and save an honest hash-only receipt.', 'opace-ai-content-integrity' ); ?></p></div>
			</div>
			<nav class="oaci-suite-nav" aria-label="<?php esc_attr_e( 'Content Integrity Suite', 'opace-ai-content-integrity' ); ?>">
				<a class="is-active" href="#checker"><?php esc_html_e( 'Checker', 'opace-ai-content-integrity' ); ?></a>
				<span aria-disabled="true"><?php esc_html_e( 'Claude Readiness · Unsupported', 'opace-ai-content-integrity' ); ?></span>
				<span aria-disabled="true"><?php esc_html_e( 'Rewrite Lab · Not configured', 'opace-ai-content-integrity' ); ?></span>
				<span aria-disabled="true"><?php esc_html_e( 'Index · Planned', 'opace-ai-content-integrity' ); ?></span>
			</nav>
			<div class="oaci-layout" id="oaci-lab-root" data-oaci-lab>
				<ol class="oaci-stage-rail" aria-label="<?php esc_attr_e( 'Inspection stages; scroll horizontally to review every stage', 'opace-ai-content-integrity' ); ?>" tabindex="0">
					<li aria-current="step"><?php esc_html_e( '1. Source', 'opace-ai-content-integrity' ); ?></li><li><?php esc_html_e( '2. Inspect', 'opace-ai-content-integrity' ); ?></li><li><?php esc_html_e( '3. Protect', 'opace-ai-content-integrity' ); ?></li><li aria-disabled="true"><?php esc_html_e( '4. Improve', 'opace-ai-content-integrity' ); ?></li><li aria-disabled="true"><?php esc_html_e( '5. Compare', 'opace-ai-content-integrity' ); ?></li><li><?php esc_html_e( '6. Receipt', 'opace-ai-content-integrity' ); ?></li>
				</ol>
				<div class="oaci-source-rail">
					<section class="oaci-panel" id="checker"><h2><?php esc_html_e( 'Check text', 'opace-ai-content-integrity' ); ?></h2><p><?php esc_html_e( 'Nothing leaves this browser during inspection.', 'opace-ai-content-integrity' ); ?></p><label for="oaci-source"><strong><?php esc_html_e( 'Text to inspect', 'opace-ai-content-integrity' ); ?></strong></label><textarea id="oaci-source" rows="14" maxlength="100000"></textarea><p id="oaci-source-error" class="oaci-field-error" hidden></p><div class="oaci-actions"><button type="button" class="button button-primary" id="oaci-inspect"><?php esc_html_e( 'Inspect draft', 'opace-ai-content-integrity' ); ?></button><button type="button" class="button" id="oaci-preview-fixes" disabled><?php esc_html_e( 'Preview safe fixes', 'opace-ai-content-integrity' ); ?></button><button type="button" class="button" id="oaci-save-receipt" disabled><?php esc_html_e( 'Save hash-only receipt', 'opace-ai-content-integrity' ); ?></button></div></section>
					<section class="oaci-panel" id="oaci-fix-panel" tabindex="-1" hidden><h2><?php esc_html_e( 'Safe-fix preview', 'opace-ai-content-integrity' ); ?></h2><p><?php esc_html_e( 'These fixes affect characters and spacing only. They do not test or remove a statistical watermark.', 'opace-ai-content-integrity' ); ?></p><div id="oaci-fix-list"></div><button type="button" class="button" id="oaci-apply-fixes"><?php esc_html_e( 'Apply selected fixes to working copy', 'opace-ai-content-integrity' ); ?></button></section>
					<section class="oaci-panel" id="oaci-protected" hidden><h2><?php esc_html_e( 'Protected content', 'opace-ai-content-integrity' ); ?></h2><div id="oaci-protected-list"></div></section>
				</div>
				<aside class="oaci-evidence-rail" aria-labelledby="oaci-evidence-title" tabindex="0"><h2 id="oaci-evidence-title"><?php esc_html_e( 'Evidence', 'opace-ai-content-integrity' ); ?></h2><div id="oaci-status" role="status" aria-live="polite"><?php esc_html_e( 'Ready to inspect. A finding is not proof that AI wrote the text.', 'opace-ai-content-integrity' ); ?></div><div id="oaci-results"></div><div class="oaci-method-state"><strong><?php esc_html_e( 'Anthropic official verifier', 'opace-ai-content-integrity' ); ?></strong><span class="oaci-status oaci-status--unsupported"><?php esc_html_e( 'Unsupported', 'opace-ai-content-integrity' ); ?></span><p><?php esc_html_e( 'No official detector interface is available.', 'opace-ai-content-integrity' ); ?></p></div></aside>
			</div>
			<div class="oaci-footer"><a href="https://opace.agency/tools/ai/content-integrity/" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Opace Content Integrity methodology', 'opace-ai-content-integrity' ); ?></a> · <?php esc_html_e( 'Evidence, not guarantees.', 'opace-ai-content-integrity' ); ?></div>
		</div>
		<?php
	}
}
