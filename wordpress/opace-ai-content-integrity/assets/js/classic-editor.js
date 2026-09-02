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
	function findingCount(result) {
		var patterns = Array.isArray(result.pattern_findings) ? result.pattern_findings : [];
		var unicode = Array.isArray(result.unicode_findings) ? result.unicode_findings : [];
		return patterns.length + unicode.length;
	}
	function resultMessage(result) {
		var count = findingCount(result);
		if (count === 0) return 'The quick check found nothing. It only runs 3 of the 116 writing rules, so that is not the same as clean.';
		return count + (count === 1 ? ' thing' : ' things') + ' to review. This quick check runs 3 of the 116 writing rules.';
	}
	button.addEventListener('click', function () {
		var content = window.tinyMCE && window.tinyMCE.get('content') && !window.tinyMCE.get('content').isHidden() ? window.tinyMCE.get('content').getContent() : (document.getElementById('content')?.value || '');
		var postId = document.getElementById('post_ID')?.value || 0;
		if (!String(content).trim()) {
			status.textContent = 'There is nothing to check yet. Add some text to the post first.';
			return;
		}
		status.textContent = 'Checking your draft…'; button.disabled = true;
		wp.apiFetch({ path: config.restPath, method: 'POST', data: { schema_version: '1.0', contract_version: '1.0.0', request_id: 'request_' + Date.now(), created_at: new Date().toISOString(), source: { content: content, content_type: 'html', language: document.documentElement.lang || 'en-GB' }, checks: ['unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic'], privacy: { allowed_routes: ['wordpress_local'], save_receipt: false, retain_content: false }, context: { caller: 'wordpress-classic', caller_object_id: 'post:' + postId } } })
			.then(function (result) { status.textContent = resultMessage(result) + ' Open the full checker for the AI reading and every other check.'; })
			.catch(function () { status.textContent = 'The quick check could not run. Try it again.'; })
			.finally(function () { button.disabled = false; });
	});
}(window.wp, window.OpaceContentIntegrityEditor));
