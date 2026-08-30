import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

test('version identity is aligned before package build', async () => {
	const bootstrap = await readFile(new URL('opace-ai-content-integrity.php', root), 'utf8');
	const readme = await readFile(new URL('readme.txt', root), 'utf8');
	const citation = await readFile(new URL('CITATION.cff', root), 'utf8');
	const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
	assert.match(bootstrap, /\* Version: 1\.0\.6/);
	assert.match(bootstrap, /OPACE_CONTENT_INTEGRITY_VERSION', '1\.0\.6'/);
	assert.match(readme, /Stable tag: 1\.0\.6/);
	assert.match(citation, /^version: 1\.0\.6$/m);
	assert.equal(packageJson.version, '1.0.6');
});

test('admin interface carries responsive and accessible states', async () => {
	const css = await readFile(new URL('assets/css/lab.css', root), 'utf8');
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	assert.match(css, /max-width: 782px/);
	assert.match(css, /prefers-reduced-motion/);
	assert.match(css, /\.oaci-evidence-rail:focus/);
	assert.match(page, /aria-live="polite"/);
	assert.match(page, /class="oaci-evidence-rail" aria-labelledby="oaci-evidence-title" tabindex="0"/);
	assert.match(page, /id="oaci-source-error" class="oaci-field-error" hidden/);
	assert.match(page, /id="oaci-fix-panel" tabindex="-1" hidden/);
	assert.match(app, /source\.setAttribute\('aria-invalid', 'true'\)/);
	assert.match(app, /source\.setAttribute\('aria-describedby', sourceError\.id\)/);
	assert.match(app, /source\.focus\(\)/);
	assert.match(app, /fixPanel\.focus\(\)/);
	assert.match(app, /source\?\.focus\(\)/);
	assert.doesNotMatch(page, /<(?:header|footer)\b[^>]*class="oaci-(?:header|footer)"/);
	assert.doesNotMatch(admin, /<(?:header|footer)\b[^>]*class=\\?"oaci-(?:header|footer)/);
	assert.match(page, /Unsupported/);
});
