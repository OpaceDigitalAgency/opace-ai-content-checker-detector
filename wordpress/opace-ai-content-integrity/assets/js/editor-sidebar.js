// The sidebar runs the SERVER-SIDE SUBSET, not the full engine. It calls the
// REST route, which runs `includes/Analysis/` in PHP: 3 writing-pattern rules
// against the engine's 116, and 16 invisible code points against 38 carrier
// rules plus three private-use ranges. Every string below therefore says
// "quick check", and a nil result offers the Lab rather than claiming the
// draft is clean. A user must never read this panel as the verdict the Lab
// would give on the same text.
(function (wp, config) {
	'use strict';
	if (!wp || !wp.plugins || !wp.editPost || !wp.element || !wp.components || !wp.data || !wp.apiFetch) return;
	var el = wp.element.createElement;
	wp.apiFetch.use(wp.apiFetch.createNonceMiddleware(config.nonce));

	function Sidebar() {
		var state = wp.element.useState({ status: 'idle', count: 0, hash: '', snapshot: '' });
		var value = state[0], setValue = state[1];
		var current = wp.data.useSelect(function (select) { return select('core/editor').getEditedPostContent() || ''; }, []);
		var postId = wp.data.useSelect(function (select) { return select('core/editor').getCurrentPostId(); }, []);
		function inspect() {
			var content = current;
			setValue({ status: 'loading', count: 0, hash: '', snapshot: content });
			wp.apiFetch({ path: config.restPath, method: 'POST', data: { schema_version: '1.0', contract_version: '1.0.0', request_id: 'request_' + Date.now(), created_at: new Date().toISOString(), source: { content: content, content_type: 'html', language: document.documentElement.lang || 'en-GB' }, checks: ['unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic'], privacy: { allowed_routes: ['wordpress_local'], save_receipt: false, retain_content: false }, context: { caller: 'wordpress-editor', caller_object_id: 'post:' + postId } } })
				.then(function (result) { setValue({ status: 'complete', count: result.pattern_findings.length + (result.methods.filter(function (m) { return m.category === 'unicode'; })[0]?.evidence.length || 0), hash: result.source.content_hash, snapshot: content }); })
				.catch(function () { setValue({ status: 'error', count: 0, hash: '', snapshot: '' }); });
		}
		var stale = value.status === 'complete' && current !== value.snapshot;
		return el(wp.editPost.PluginDocumentSettingPanel, { name: 'oaci-panel', title: 'Content integrity — quick check' },
			el('p', null, value.status === 'idle' ? 'Run a quick server-side check on this draft. It is a subset of the full engine.' : value.status === 'loading' ? 'Checking draft…' : value.status === 'error' ? 'Check error. Try again.' : value.count === 0 ? 'Nothing found by the quick check. It runs 3 of the 116 writing rules, so this is not a clean result.' : value.count + ' found by the quick check, which runs 3 of the 116 writing rules.'),
			value.status === 'complete' ? el('p', { className: 'oaci-editor-note' }, 'Open the full lab to run every check.') : null,
			stale && value.status === 'complete' ? el('p', { className: 'oaci-editor-note' }, 'Recheck after further edits before relying on this result.') : null,
			el(wp.components.Button, { variant: 'secondary', onClick: inspect, disabled: value.status === 'loading' }, value.status === 'complete' ? 'Check again' : 'Quick check'),
			el('p', null, el('a', { href: config.labUrl }, 'Open full lab — runs every check'))
		);
	}
	wp.plugins.registerPlugin('oaci-editor-sidebar', { render: Sidebar, icon: 'shield-alt' });
}(window.wp, window.OpaceContentIntegrityEditor));
