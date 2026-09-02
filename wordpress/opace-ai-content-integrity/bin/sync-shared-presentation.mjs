/**
 * Copies the cross-surface result presentation and printable report from
 * `shared/` into the plugin bundle, the same way sync-c2pa-runtime.mjs and
 * sync-cycle5-browser.mjs copy their vendored runtimes.
 *
 * The plugin never imports out of `shared/` at runtime: the packaged ZIP has to
 * stand alone, so the files are copied into `assets/vendor/shared/` and the
 * copies are what ship. Nothing is copied until `shared/STATUS.md` records that
 * the lane building those files is ready, because a half-finished renderer
 * silently replacing a working one is worse than an older look.
 *
 * Running this script with nothing ready is not an error. It reports what it
 * found and leaves the plugin exactly as it is, so it is safe to call from the
 * build at any time.
 */
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = resolve(pluginDir, '../..');
const sharedDir = join(repoDir, 'shared');
const statusPath = join(sharedDir, 'STATUS.md');
const outputDir = join(pluginDir, 'assets/vendor/shared');
const manifestPath = join(outputDir, 'SHARED-SYNC-MANIFEST.txt');

/**
 * shared/STATUS.md carries one section per shared lane, each with its own
 * readiness line. Every lane whose files this plugin ships must say yes, so a
 * single lane still in progress holds the whole sync.
 */
const READY_LINE = /^[*`\s]*READY FOR INTEGRATION:\s*[*`\s]*(yes|no)\b/gim;

/**
 * The exact files the plugin ships. The list is explicit rather than a glob so a
 * new file in shared/ cannot arrive in the packaged ZIP unreviewed, and so the
 * build-only entries that import Node built-ins (`build-css.mjs`, `node.mjs`)
 * stay out of a browser bundle.
 */
const SOURCES = Object.freeze([
	{ directory: 'presentation', files: ['checker-result-presentation.mjs', 'checker-ui.css'] },
	{ directory: 'report', files: ['checker-pdf.mjs', 'helvetica-metrics.mjs', 'logo.mjs', 'pdf-writer.mjs', 'report-model.mjs'] }
]);

/** Ready in `shared/` but not imported by this plugin, so not shipped. */
const PENDING = Object.freeze([]);

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const exists = async (path) => access(path).then(() => true, () => false);

async function readStatus() {
	if (!(await exists(statusPath))) return { ready: false, reason: 'shared/STATUS.md does not exist yet.' };
	const status = await readFile(statusPath, 'utf8');
	const answers = [...status.matchAll(READY_LINE)].map((match) => match[1].toLowerCase());
	if (!answers.length) return { ready: false, reason: 'shared/STATUS.md records no readiness line.' };
	if (answers.some((answer) => answer !== 'yes')) return { ready: false, reason: `shared/STATUS.md still reports ${answers.filter((answer) => answer !== 'yes').length} lane(s) not ready.` };
	return { ready: true, reason: `shared/STATUS.md reports ${answers.length} lane(s) ready for integration.` };
}

async function collect(source) {
	const directory = join(sharedDir, source.directory);
	if (!(await exists(directory))) return [];
	const found = [];
	for (const name of source.files) {
		const from = join(directory, name);
		if (!(await exists(from))) throw new Error(`shared/${source.directory}/${name} is named in the sync list but does not exist.`);
		found.push({ from, to: join(outputDir, source.directory, name), name: `${source.directory}/${name}` });
	}
	return found;
}

const status = await readStatus();
if (!status.ready) {
	process.stdout.write(`sync-shared-presentation: nothing copied. ${status.reason}\n`);
	process.stdout.write('sync-shared-presentation: the plugin keeps its own renderer and report writer.\n');
	process.exit(0);
}

const files = (await Promise.all(SOURCES.map(collect))).flat();
if (!files.length) {
	process.stdout.write('sync-shared-presentation: shared/STATUS.md reports ready, but no presentation or report file was found.\n');
	process.exit(1);
}

await mkdir(outputDir, { recursive: true });
const lines = [];
for (const file of files) {
	await mkdir(dirname(file.to), { recursive: true });
	await copyFile(file.from, file.to);
	const bytes = await readFile(file.to);
	if (file.name.endsWith('.mjs') && /\brequire\(|\bnode:|process\.env/u.test(bytes.toString('utf8'))) {
		throw new Error(`${file.name} uses a Node-only construct and cannot ship in a browser bundle.`);
	}
	lines.push(`${sha256(bytes)}  ${bytes.byteLength}  ${file.name}`);
	process.stdout.write(`sync-shared-presentation: copied ${file.name}\n`);
}
await writeFile(manifestPath, `${['Copied from shared/ by bin/sync-shared-presentation.mjs.', 'sha256  bytes  file', ...lines].join('\n')}\n`, 'utf8');
process.stdout.write(`sync-shared-presentation: ${files.length} file(s) copied and recorded in assets/vendor/shared/SHARED-SYNC-MANIFEST.txt\n`);
for (const pending of PENDING) process.stdout.write(`sync-shared-presentation: not shipped yet, see the PENDING note in this script: ${pending}\n`);
