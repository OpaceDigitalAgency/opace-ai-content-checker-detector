/**
 * The Classic Editor's box.
 *
 * The same panel as the block editor's sidebar, in the right-hand column, drawn
 * by the same module. Only two things are specific to this editor and they are
 * both here: getting the draft out of TinyMCE or the plain textarea, whichever
 * the writer is using, and noticing when either of them changes under a reading
 * that is already on screen.
 */
(function (config) {
	'use strict';
	var host = document.getElementById('oaci-classic-box');
	if (!host || !config || !config.modules) return;

	function rawContent() {
		var editor = window.tinyMCE && window.tinyMCE.get ? window.tinyMCE.get('content') : null;
		if (editor && typeof editor.isHidden === 'function' && !editor.isHidden()) return editor.getContent();
		var field = document.getElementById('content');
		return field ? field.value : '';
	}

	function rawTitle() {
		var field = document.getElementById('title');
		return field ? field.value : '';
	}

	Promise.all([
		import(config.modules.panel),
		import(config.modules.engine)
	]).then(function (modules) {
		var panel = modules[0].mountEditorPanel(host, {
			surface: 'classic',
			config: config,
			getContent: function () {
				return modules[1].readableEditorText(rawContent(), rawTitle());
			}
		});
		// A reading on screen describes the draft it read. Both the visual editor
		// and the code editor are watched, because a writer can be in either.
		var moved = function () {
			panel.markStale();
			panel.refreshLabels();
		};
		['content', 'title'].forEach(function (id) {
			var field = document.getElementById(id);
			if (field) field.addEventListener('input', moved);
		});
		if (window.tinyMCE && window.tinyMCE.on) {
			window.tinyMCE.on('AddEditor', function (event) {
				if (!event.editor || event.editor.id !== 'content') return;
				event.editor.on('input change keyup', moved);
			});
			var existing = window.tinyMCE.get && window.tinyMCE.get('content');
			if (existing) existing.on('input change keyup', moved);
		}
	}).catch(function () {
		host.textContent = 'The checker could not start in this editor. Open the full checker instead.';
	});
}(window.OpaceContentIntegrityEditor));
