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
			if (!String(content).trim()) {
				setValue({ status: 'empty', count: 0, hash: '', snapshot: '' });
				return;
			}
			setValue({ status: 'loading', count: 0, hash: '', snapshot: content });
			wp.apiFetch({ path: config.restPath, method: 'POST', data: { schema_version: '1.0', contract_version: '1.0.0', request_id: 'request_' + Date.now(), created_at: new Date().toISOString(), source: { content: content, content_type: 'html', language: document.documentElement.lang || 'en-GB' }, checks: ['unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic'], privacy: { allowed_routes: ['wordpress_local'], save_receipt: false, retain_content: false }, context: { caller: 'wordpress-editor', caller_object_id: 'post:' + postId } } })
				.then(function (result) { setValue({ status: 'complete', count: result.pattern_findings.length + (result.methods.filter(function (m) { return m.category === 'unicode'; })[0]?.evidence.length || 0), hash: result.source.content_hash, snapshot: content }); })
				.catch(function () { setValue({ status: 'error', count: 0, hash: '', snapshot: '' }); });
		}
		var stale = value.status === 'complete' && current !== value.snapshot;
		return el(wp.editPost.PluginDocumentSettingPanel, { name: 'oaci-panel', title: 'AI Content Checker quick check', className: 'oaci-editor-panel' },
			el('p', { className: 'oaci-editor-lead' }, value.status === 'idle' ? 'A quick look at this draft, run on this site.' : value.status === 'empty' ? 'There is nothing to check yet. Add some text to the post first.' : value.status === 'loading' ? 'Checking your draft…' : value.status === 'error' ? 'The quick check could not run. Try it again.' : value.count === 0 ? 'The quick check found nothing. It only runs 3 of the 116 writing rules, so that is not the same as clean.' : value.count + (value.count === 1 ? ' thing' : ' things') + ' to review. This quick check runs 3 of the 116 writing rules.'),
			el('span', { className: 'oaci-editor-scope' }, el('strong', null, 'AI reading: not assessed here.'), ' The trained model runs only in the full checker.'),
			stale && value.status === 'complete' ? el('p', { className: 'oaci-editor-note' }, 'You have edited the draft since this check. Run it again before relying on it.') : null,
			el(wp.components.Button, { variant: 'secondary', onClick: inspect, disabled: value.status === 'loading' }, value.status === 'complete' ? 'Check again' : 'Quick check'),
			el('p', null, el('a', { href: config.checkUrl || config.labUrl }, config.checkUrl ? 'Check this post in the full checker' : 'Open the full checker'))
		);
	}
	wp.plugins.registerPlugin('oaci-editor-sidebar', { render: Sidebar, icon: 'shield-alt' });
}(window.wp, window.OpaceContentIntegrityEditor));
