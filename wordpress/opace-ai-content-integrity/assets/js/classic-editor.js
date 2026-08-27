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
			.then(function (result) { status.textContent = result.pattern_findings.length + ' writing findings. Open the full lab for evidence and protected content.'; })
			.catch(function () { status.textContent = 'Inspection could not be completed. Try again.'; })
			.finally(function () { button.disabled = false; });
	});
}(window.wp, window.OpaceContentIntegrityEditor));
