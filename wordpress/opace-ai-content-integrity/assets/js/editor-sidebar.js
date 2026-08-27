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
		return el(wp.editPost.PluginDocumentSettingPanel, { name: 'oaci-panel', title: 'Content integrity' },
			el('p', null, value.status === 'idle' ? 'Inspect this draft for local content-integrity signals.' : value.status === 'loading' ? 'Inspecting draft…' : value.status === 'error' ? 'Inspection error. Try again.' : value.count + ' findings need review.'),
			stale && value.status === 'complete' ? el('p', { className: 'oaci-editor-note' }, 'Recheck after further edits before relying on this result.') : null,
			el(wp.components.Button, { variant: 'secondary', onClick: inspect, disabled: value.status === 'loading' }, value.status === 'complete' ? 'Check again' : 'Inspect draft'),
			el('p', null, el('a', { href: config.labUrl }, 'Open full lab'))
		);
	}
	wp.plugins.registerPlugin('oaci-editor-sidebar', { render: Sidebar, icon: 'shield-alt' });
}(window.wp, window.OpaceContentIntegrityEditor));
