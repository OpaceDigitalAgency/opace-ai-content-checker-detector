// As with the block-editor sidebar: this is the SERVER-SIDE SUBSET (3 of the
// 116 writing rules, 16 of 38 carrier rules), not the full engine. The strings
// say so, and a nil result offers the Lab instead of implying the draft is
// clean.
(function (wp, config) {
	'use strict';
	var button = document.getElementById('oaci-classic-inspect');
	var status = document.getElementById('oaci-classic-status');
	if (!button || !status || !wp || !wp.apiFetch) return;
	wp.apiFetch.use(wp.apiFetch.createNonceMiddleware(config.nonce));
	button.addEventListener('click', function () {
		var content = window.tinyMCE && window.tinyMCE.get('content') && !window.tinyMCE.get('content').isHidden() ? window.tinyMCE.get('content').getContent() : (document.getElementById('content')?.value || '');
		var postId = document.getElementById('post_ID')?.value || 0;
		status.textContent = 'Inspecting draft…'; button.disabled = true;
		wp.apiFetch({ path: config.restPath, method: 'POST', data: { schema_version: '1.0', contract_version: '1.0.0', request_id: 'request_' + Date.now(), created_at: new Date().toISOString(), source: { content: content, content_type: 'html', language: document.documentElement.lang || 'en-GB' }, checks: ['unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic'], privacy: { allowed_routes: ['wordpress_local'], save_receipt: false, retain_content: false }, context: { caller: 'wordpress-classic', caller_object_id: 'post:' + postId } } })
			.then(function (result) { status.textContent = (result.pattern_findings.length === 0 ? 'Nothing found by the quick check. It runs 3 of the 116 writing rules, so this is not a clean result.' : result.pattern_findings.length + ' found by the quick check, which runs 3 of the 116 writing rules.') + ' Open the full lab to run every check.'; })
			.catch(function () { status.textContent = 'Inspection could not be completed. Try again.'; })
			.finally(function () { button.disabled = false; });
	});
}(window.wp, window.OpaceContentIntegrityEditor));
