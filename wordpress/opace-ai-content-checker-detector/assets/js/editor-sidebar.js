/**
 * The block editor's panel.
 *
 * This file registers the panel with WordPress and hands its inside to
 * `editor-panel.mjs`, which the Classic Editor's box uses as well. Everything
 * here is about the block editor and nothing else: where the panel lives, how to
 * get the draft out of the editor's own store, and when the draft has changed
 * under a reading that is already on screen.
 *
 * The check itself is the real one. Until 1.1.4 this panel called a WordPress
 * REST route that ran three of the engine's 116 writing rules in PHP, printed a
 * count and then told the reader the real check was on another screen. It now
 * runs the whole rule set in a worker and takes the AI reading through whichever
 * route this site has open, with the same button labels and the same consent
 * wording as the checker screen.
 */
(function (wp, config) {
	'use strict';
	if (!wp || !wp.plugins || !wp.element || !wp.data) return;
	// WordPress 6.6 moved the document panel to wp.editor and left a deprecated
	// alias on wp.editPost. Prefer the new home, fall back to the old one, and
	// draw nothing rather than throw where neither exists.
	var Panel = (wp.editor && wp.editor.PluginDocumentSettingPanel) || (wp.editPost && wp.editPost.PluginDocumentSettingPanel);
	if (!Panel) return;
	var el = wp.element.createElement;

	function Sidebar() {
		var host = wp.element.useRef(null);
		var panel = wp.element.useRef(null);
		var content = wp.data.useSelect(function (select) {
			var editor = select('core/editor');
			return editor ? (editor.getEditedPostContent() || '') : '';
		}, []);
		var title = wp.data.useSelect(function (select) {
			var editor = select('core/editor');
			return editor ? String(editor.getEditedPostAttribute('title') || '') : '';
		}, []);
		// The panel reads the draft when it is asked to, not when React last
		// rendered, so a run always scores what is on screen at the press.
		var latest = wp.element.useRef({ content: content, title: title });
		latest.current = { content: content, title: title };

		// The panel is a Slot fill, so its element arrives after the component's
		// own effects have run: an effect with an empty dependency list sees a
		// null ref, returns, and is never called again, which is exactly what
		// left an empty panel body in the sidebar. A callback ref is called with
		// the element the moment it exists and with null when it goes, so the
		// panel is mounted and destroyed at the two moments that actually matter.
		var attach = wp.element.useCallback(function (node) {
			host.current = node;
			if (!node) {
				if (panel.current) panel.current.destroy();
				panel.current = null;
				return;
			}
			if (panel.current) return;
			Promise.all([
				import(config.modules.panel),
				import(config.modules.engine)
			]).then(function (modules) {
				if (host.current !== node) return;
				var mountEditorPanel = modules[0].mountEditorPanel;
				var readableEditorText = modules[1].readableEditorText;
				panel.current = mountEditorPanel(node, {
					surface: 'block',
					config: config,
					getContent: function () {
						return readableEditorText(latest.current.content, latest.current.title);
					}
				});
			}).catch(function () {
				if (host.current !== node) return;
				node.textContent = 'The checker could not start in this editor. Open the full checker instead.';
			});
		}, []);

		// A reading on screen describes the draft it read. The moment the draft
		// moves, the panel says so rather than letting the reading stand.
		wp.element.useEffect(function () {
			if (panel.current) {
				panel.current.markStale();
				panel.current.refreshLabels();
			}
		}, [content, title]);

		return el(Panel, { name: 'oaci-panel', title: 'AI Content Checker', className: 'oaci-editor-panel' }, el('div', { ref: attach }));
	}

	wp.plugins.registerPlugin('oaci-editor-sidebar', { render: Sidebar, icon: 'shield-alt' });
}(window.wp, window.OpaceContentIntegrityEditor || {}));
