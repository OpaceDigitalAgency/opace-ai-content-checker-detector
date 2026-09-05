/**
 * The Classic Editor's entry point.
 *
 * Until 1.1.5 this file held its own copy of the check and its own wording, and
 * this test held that wording. Both are gone: the box is now the same panel the
 * block editor draws, and the only things left here that are specific to the
 * Classic Editor are which field the draft comes out of and when that field has
 * moved. Those are what this holds.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { readableEditorText } from '../../assets/js/editor-check.mjs';

const source = await readFile(new URL('../../assets/js/classic-editor.js', import.meta.url), 'utf8');

const CONFIG = {
	modules: { panel: '/assets/js/editor-panel.mjs', engine: '/assets/js/editor-check.mjs' },
	restUrl: 'https://wordpress.example/wp-json/oaci/v1/',
	nonce: 'n',
	postId: 42
};

/**
 * Runs the entry file against stand-ins for the two editors, and hands back what
 * it mounted and what it wired.
 *
 * @param {{visualEditor?: object, textarea?: string, title?: string, config?: object}} world
 */
async function boot(world = {}) {
	const mounted = {};
	const host = { id: 'oaci-classic-box', textContent: '', listeners: {} };
	const fields = {
		content: { value: world.textarea ?? '', listeners: [], addEventListener(name, handler) { this.listeners.push(name); } },
		title: { value: world.title ?? '', listeners: [], addEventListener(name, handler) { this.listeners.push(name); } }
	};
	const panel = { markStale() { mounted.staleCalls = (mounted.staleCalls || 0) + 1; }, refreshLabels() {}, destroy() {} };
	const context = {
		console,
		URL,
		Promise,
		setTimeout,
		document: {
			getElementById: (id) => (id === 'oaci-classic-box' ? host : fields[id] || null)
		},
		OpaceContentIntegrityEditor: Object.prototype.hasOwnProperty.call(world, 'config') ? world.config : CONFIG
	};
	context.window = context;
	context.window.tinyMCE = world.visualEditor ? { get: () => world.visualEditor, on() {} } : undefined;
	// The entry file loads its two modules by URL. Both are stood in for so the
	// test can see exactly what the file asked each of them to do.
	const modules = [
		{ mountEditorPanel: (element, options) => { mounted.element = element; mounted.options = options; return panel; } },
		{ readableEditorText }
	];
	vm.runInNewContext(source.replace(/import\(([^)]+)\)/g, '__import($1)'), { ...context, __import: (url) => Promise.resolve(url.includes('panel') ? modules[0] : modules[1]) });
	await new Promise((resolve) => setImmediate(resolve));
	await new Promise((resolve) => setImmediate(resolve));
	return { mounted, host, fields, panel };
}

test('the box mounts the same panel the block editor draws, into its own element', async () => {
	const { mounted, host } = await boot({ textarea: '<p>Some writing.</p>' });
	assert.equal(mounted.element, host);
	assert.equal(mounted.options.surface, 'classic');
	assert.equal(mounted.options.config.postId, 42);
});

test('the draft comes from the visual editor when the writer is in it, and the textarea when they are not', async () => {
	const visible = await boot({
		visualEditor: { isHidden: () => false, getContent: () => '<p>From TinyMCE.</p>', on() {} },
		textarea: '<p>From the textarea.</p>'
	});
	assert.equal(visible.mounted.options.getContent(), 'From TinyMCE.');

	const hidden = await boot({
		visualEditor: { isHidden: () => true, getContent: () => '<p>From TinyMCE.</p>', on() {} },
		textarea: '<p>From the textarea.</p>'
	});
	assert.equal(hidden.mounted.options.getContent(), 'From the textarea.');

	const plain = await boot({ textarea: '<p>From the textarea.</p>' });
	assert.equal(plain.mounted.options.getContent(), 'From the textarea.');
});

test('the markup around the writing never reaches the check, and the title leads it', async () => {
	const { mounted } = await boot({
		textarea: '<!-- wp:paragraph --><p>The body of it.</p><!-- /wp:paragraph -->',
		title: 'A real title'
	});
	assert.equal(mounted.options.getContent(), 'A real title\n\nThe body of it.');
});

test('both fields are watched, so a reading cannot stand over a draft that has moved', async () => {
	const { fields } = await boot({ textarea: '<p>Writing.</p>' });
	assert.deepEqual(fields.content.listeners, ['input']);
	assert.deepEqual(fields.title.listeners, ['input']);
});

test('a box with no configuration draws nothing rather than throwing', async () => {
	const { mounted } = await boot({ config: undefined, textarea: 'x' });
	assert.equal(mounted.element, undefined);
});
