import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

test('version identity is aligned before package build', async () => {
	const bootstrap = await readFile(new URL('opace-ai-content-integrity.php', root), 'utf8');
	const readme = await readFile(new URL('readme.txt', root), 'utf8');
	const citation = await readFile(new URL('CITATION.cff', root), 'utf8');
	const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
	assert.match(bootstrap, /\* Version: 1\.0\.12/);
	assert.match(bootstrap, /OPACE_CONTENT_INTEGRITY_VERSION', '1\.0\.12'/);
	assert.match(readme, /Stable tag: 1\.0\.12/);
	assert.match(readme, /^= 1\.0\.12 =$/m);
	assert.match(readme, /^== Screenshots ==$/m);
	assert.match(citation, /^version: 1\.0\.12$/m);
	assert.equal(packageJson.version, '1.0.12');
	assert.match(readme, /^Contributors: opacewebdesign$/m);
	// The owner's September disclosure requirements (every usage limit, and what
	// the on-device download actually is) do not fit the old 10 KB guard. The
	// budget is still tight enough to stop the file drifting into a manual.
	assert.ok(Buffer.byteLength(readme) < 13_000, 'WordPress.org readme should stay below 13 KB');
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
	// The Lab navigation lists only destinations a person can open. The
	// unsupported and unconfigured facts live on Methods & privacy instead.
	assert.doesNotMatch(page, /Index · Planned|Rewrite Lab · Not configured|Claude Readiness · Unsupported/);
	assert.doesNotMatch(page, /aria-disabled="true"/);
	assert.match(admin, /Claude readiness: not supported\./);
	assert.match(admin, /Rewrite Lab: not configured\./);
	assert.match(admin, /Anthropic official watermark verifier: Unsupported\./);
});

test('admin headers use the packaged canonical mark, never WordPress.org directory assets', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const mark = await readFile(new URL('assets/images/opace-ai-content-integrity-logo-256.webp', root));
	assert.match(page, /assets\/images\/opace-ai-content-integrity-logo-256\.webp/);
	assert.match(admin, /assets\/images\/opace-ai-content-integrity-logo-256\.webp/);
	assert.doesNotMatch(`${page}\n${admin}`, /\.wordpress-org/);
	assert.doesNotMatch(`${page}\n${admin}`, /<span>1<\/span><span>2<\/span><span>3<\/span>/);
	assert.equal(mark.subarray(0, 4).toString('ascii'), 'RIFF');
	assert.equal(mark.subarray(8, 12).toString('ascii'), 'WEBP');
	assert.ok(mark.byteLength < 50_000, 'runtime canonical logo should remain lightweight');
});

test('Lab source includes method-level finding hierarchy and a persistent unavailable-model boundary', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const evidence = await readFile(new URL('assets/js/lab-evidence.mjs', root), 'utf8');
	assert.match(page, /AI-pattern model/);
	assert.match(page, /live service route has not been enabled/);
	assert.match(page, /does not produce an AI-pattern score/);
	assert.match(app, /renderEvidence\(results, result, document\)/);
	assert.match(evidence, /Each finding stays under the method that produced it/);
	assert.match(evidence, /What this check cannot prove/);
	assert.match(evidence, /What to do:/);
});

test('EU server route is informed, same-site and fail-closed until its first-party channel exists', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const plugin = await readFile(new URL('includes/Core/Plugin.php', root), 'utf8');
	const rest = await readFile(new URL('includes/Rest/RestController.php', root), 'utf8');
	const adapter = await readFile(new URL('includes/Adapters/OpaceEuServerAdapter.php', root), 'utf8');
	const channel = await readFile(new URL('includes/Adapters/WordPressServerAnalysisChannel.php', root), 'utf8');
	const client = await readFile(new URL('assets/js/lab-route.mjs', root), 'utf8');
	assert.match(admin, /server_analysis_opt_in/);
	assert.doesNotMatch(admin, /server_analysis_endpoint/);
	assert.match(page, /I understand that this draft will be sent once/i);
	assert.match(page, /disabled\( ! \$server_available \)/);
	assert.match(plugin, /new WordPressServerAnalysisChannel\(\)/);
	assert.match(channel, /STATUS_CACHE_KEY/);
	assert.match(channel, /\['wordpress_channel'\]/);
	assert.match(channel, /'wordpress-v1'[^\n]+'credential_class'/);
	assert.match(channel, /wp_safe_remote_get/);
	assert.match(rest, /\/analysis\/server/);
	assert.match(rest, /wp_verify_nonce/);
	assert.match(rest, /current_user_can\( 'edit_posts' \)/);
	assert.match(adapter, /wp_safe_remote_post/);
	assert.match(adapter, /'redirection'\s*=> 0/);
	assert.match(adapter, /'limit_response_size' => self::MAX_RESPONSE_BYTES/);
	assert.doesNotMatch(adapter, /['"]Origin['"]/);
	assert.doesNotMatch(adapter, /['"]User-Agent['"]/);
	assert.match(client, /rest\.origin !== page\.origin/);
	assert.match(client, /consent !== true/);
});

test('Lab includes responsive file, empty, progress, cancel and route states', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const css = await readFile(new URL('assets/css/lab.css', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	assert.match(page, /id="oaci-source-file"/);
	assert.match(page, /id="oaci-run-progress"/);
	assert.match(page, /id="oaci-cancel-run"/);
	assert.match(page, /class="oaci-empty-state"/);
	assert.match(page, /name="oaci-analysis-route"/);
	assert.match(css, /\.oaci-route-picker/);
	assert.match(css, /\.oaci-run-progress\[hidden\]/);
	assert.match(css, /@media \(max-width: 782px\)/);
	assert.match(app, /activeRun = new AbortController\(\)/);
	assert.match(app, /activeRun\?\.abort\(\)/);
	// A privacy line names the route and the recipient it applies to; a blanket
	// claim cannot stay true once another route exists.
	assert.match(app, /File loaded into this browser\. It was not sent to Opace or to this site\./);
	// The banned phrases are assembled from fragments rather than written out,
	// because the repository's shipped-claims guard scans this file too and a
	// literal here would read as the plugin making the claim.
	const blanketClaim = new RegExp([['nothing', 'was', 'uploaded'].join('\\s+'), ['never', 'uploaded'].join('\\s+')].join('|'), 'i');
	assert.doesNotMatch(app, blanketClaim);
});

test('full checker view consumes the canonical runtime and keeps all scored sections visible', async () => {
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const result = await readFile(new URL('assets/js/checker-result.mjs', root), 'utf8');
	const css = await readFile(new URL('assets/css/lab.css', root), 'utf8');
	const schema = JSON.parse(await readFile(new URL('schemas/checker-result.schema.json', root), 'utf8'));
	const fixture = JSON.parse(await readFile(new URL('tests/fixtures/contracts/valid/checker-result.json', root), 'utf8'));
	assert.equal(schema.$id, 'https://schemas.opace.agency/content-integrity/v1/checker-result.schema.json');
	assert.equal(fixture.schema, 'checker-result.schema.json');
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const sharedManifest = await readFile(new URL('assets/vendor/shared/SHARED-SYNC-MANIFEST.txt', root), 'utf8');
	assert.match(app, /CHECKER_LEVELS, CHECKER_HONESTY_LINE, assertCheckerResultInvariants/);
	assert.match(app, /renderCheckerResult\(results, fullResult, content, checkerSemantics, document, \{/);
	// The result is drawn by the cross-surface renderer, so this file holds only
	// the WordPress adapter: no second copy of the level names, no second gauge.
	assert.match(result, /vendor\/shared\/presentation\/checker-result-presentation\.mjs/);
	assert.match(result, /levels: semantics\.levels/);
	assert.match(result, /surface: SURFACE_NAME/);
	assert.match(result, /headingLevel: 2/);
	assert.doesNotMatch(result, /Strongly AI|Likely AI|Potentially AI|Likely human/);
	assert.doesNotMatch(result, /<svg|createElementNS|stroke-opacity/);
	assert.match(result, /buildSectionAdvice/);
	assert.match(result, /advice/);
	assert.match(sharedManifest, /presentation\/checker-result-presentation\.mjs/);
	assert.match(sharedManifest, /presentation\/checker-ui\.css/);
	// The shared stylesheet is enqueued, and every rule in it is scoped to the
	// component so it cannot restyle the plugin's own admin markup.
	assert.match(admin, /assets\/vendor\/shared\/presentation\/checker-ui\.css/);
	const shared = await readFile(new URL('assets/vendor/shared/presentation/checker-ui.css', root), 'utf8');
	// Every selector is anchored on the component root, so nothing in the shared
	// stylesheet can reach the plugin's own .oaci-panel, .oaci-status or toolbar.
	const unscoped = shared.split('\n').filter((line) => /^\.oaci-/.test(line.trim()) && !/^\.oaci-result/.test(line.trim()) && line.includes('{'));
	assert.deepEqual(unscoped, []);
	assert.match(shared, /What this means|oaci-meaning/);
	// The plugin's own screen no longer duplicates the result styling.
	assert.doesNotMatch(css, /\.oaci-verdict__level|\.oaci-dial|\.oaci-strip__/);
	assert.match(css, /\.oaci-toolbar/);
});

test('the draft input offers paste, upload and example routes with a word-count guide', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const examples = await readFile(new URL('assets/js/lab-examples.mjs', root), 'utf8');
	assert.match(page, /role="tablist"/);
	assert.match(page, /Paste text/);
	assert.match(page, /Upload a file/);
	assert.match(page, /Try an example/);
	assert.match(page, /60 words needed for AI analysis/);
	assert.match(page, /id="oaci-dropzone"/);
	assert.match(page, /Check my draft/);
	assert.match(app, /MODEL_WORD_MINIMUM = Number\(config\.limits\?\.minWords\)/);
	assert.match(app, /addEventListener\('drop'/);
	assert.match(app, /aria-selected/);
	// Four labelled samples, each long enough for the model to score.
	const names = [...examples.matchAll(/^\t\tname: '([^']+)'/gmu)].map((match) => match[1]);
	assert.equal(names.length, 4);
	for (const block of [...examples.matchAll(/^const [A-Z_]+ = `([\s\S]*?)`;$/gmu)].map((match) => match[1])) {
		assert.ok((block.trim().match(/\S+/gu) ?? []).length >= 60, 'every example must be long enough for an AI reading');
	}
});

test('the route chooser shows one disclosure and only the agreement for the chosen route', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	assert.match(page, /Private EU analysis/);
	assert.match(page, /Not available yet/);
	assert.match(page, /On this device/);
	assert.match(page, /Recommended/);
	assert.match(page, /id="oaci-server-consent-row" hidden/);
	assert.match(app, /serverConsentRow\.hidden = !server/);
	assert.match(app, /modelConsentRow\.hidden = !onDevice/);
	assert.match(app, /modelDownload\.hidden = !onDevice/);
});

test('the on-device model host is pinned in code and only a declared mirror can change it', async () => {
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const wrapper = await readFile(new URL('assets/js/cycle5-wordpress.mjs', root), 'utf8');
	assert.match(admin, /const SHIPPED_MODEL_BASE_URL = 'https:\/\/opace\.agency\/models\/local-signals-v1\/'/);
	assert.match(admin, /OPACE_CONTENT_INTEGRITY_MODEL_BASE_URL/);
	assert.match(admin, /apply_filters\( 'oaci_model_base_url'/);
	assert.doesNotMatch(admin, /oaci_settings\[[^\]]*model[^\]]*\]/, 'the model host must never become an editable setting');
	assert.match(wrapper, /options\.modelBaseUrl !== WORDPRESS_MODEL_BASE\) throw/);
	assert.match(wrapper, /overriddenModelBaseUrl/);
});

test('the result toolbar offers every export and a bundled font carries its licence', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const css = await readFile(new URL('assets/css/lab.css', root), 'utf8');
	const licence = await readFile(new URL('assets/fonts/OFL.txt', root), 'utf8');
	for (const id of ['oaci-print', 'oaci-download-pdf', 'oaci-download-json', 'oaci-copy-share', 'oaci-save-receipt', 'oaci-preview-fixes', 'oaci-show-protected']) {
		assert.match(page, new RegExp(`id="${id}" disabled`), id);
	}
	assert.match(css, /@font-face/);
	assert.doesNotMatch(css, /https?:\/\//u, 'no remote font or asset may be requested from the stylesheet');
	assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/);
	assert.match(licence, /Outfit/);
	assert.match(licence, /Plus Jakarta Sans/);
	const fonts = await Promise.all([
		readFile(new URL('assets/fonts/outfit-variable.woff2', root)),
		readFile(new URL('assets/fonts/plus-jakarta-sans-latin.woff2', root))
	]);
	for (const font of fonts) assert.equal(font.subarray(0, 4).toString('ascii'), 'wOF2');
	assert.ok(fonts.reduce((total, font) => total + font.byteLength, 0) < 250_000, 'bundled fonts stay under 250 KB');
});

test('a post can be opened in the checker by id, never by carrying its text in a link', async () => {
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const rest = await readFile(new URL('includes/Rest/RestController.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const classic = await readFile(new URL('includes/Editor/ClassicEditor.php', root), 'utf8');
	const block = await readFile(new URL('includes/Editor/BlockEditor.php', root), 'utf8');
	const sidebar = await readFile(new URL('assets/js/editor-sidebar.js', root), 'utf8');
	assert.match(admin, /add_filter\( 'post_row_actions'/);
	assert.match(admin, /add_filter\( 'page_row_actions'/);
	assert.match(admin, /Check with Content Integrity/);
	// The row action carries an id and a nonce, and both are re-checked server-side.
	assert.match(admin, /wp_nonce_url\(/);
	assert.match(admin, /'oaci_check_post_' \. \(int\) \$post->ID/);
	assert.match(admin, /current_user_can\( 'edit_post', \$post->ID \)/);
	assert.match(admin, /wp_verify_nonce\( \$nonce, 'oaci_check_post_' \. \$post_id \)/);
	assert.doesNotMatch(admin, /oaci_content=|post_content.*add_query_arg/s);
	assert.match(rest, /'\/posts\/\(\?P<id>\[0-9\]\+\)'/);
	assert.match(rest, /current_user_can\( 'edit_post', \$post_id \)/);
	assert.match(rest, /wp_verify_nonce\( \$request->get_header\( 'X-WP-Nonce' \)/);
	assert.match(app, /`\$\{config\.restUrl\}posts\/\$\{postId\}`/);
	assert.match(app, /'X-WP-Nonce': config\.nonce/);
	assert.match(classic, /check_post_url/);
	assert.match(block, /check_post_url/);
	assert.match(sidebar, /config\.checkUrl/);
});

test('a post opened from the row action arrives as readable writing, not stored markup', async () => {
	const rest = await readFile(new URL('includes/Rest/RestController.php', root), 'utf8');
	const readable = await readFile(new URL('includes/Integration/ReadablePostText.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	// The route converts; it never hands the raw column back.
	assert.match(rest, /ReadablePostText::from_post\( \$title, \$post->post_content \)/);
	assert.doesNotMatch(rest, /'content'\s*=>\s*\(string\) \$post->post_content/);
	assert.match(rest, /'content_type'\s*=>\s*'plain_text'/);
	// Block delimiters are HTML comments, and every tag goes.
	assert.match(readable, /<!--\.\*\?-->/);
	assert.match(readable, /wp_strip_all_tags\( \$text \)/);
	assert.match(readable, /html_entity_decode/);
	// Paragraph breaks survive as blank lines rather than being collapsed away.
	assert.match(readable, /BLOCK_TAGS/);
	assert.match(readable, /"\\n\\n", \$text/);
	// The client scores it as plain text and never as HTML.
	assert.match(app, /contentType = 'plain_text';/);
	assert.doesNotMatch(app, /contentType = 'html';/);
});

test('every usage limit is written out on all three screens and shown in the checker as words', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const readme = await readFile(new URL('readme.txt', root), 'utf8');
	const limits = await readFile(new URL('assets/js/lab-limits.mjs', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const rateLimiter = await readFile(new URL('includes/Rest/ServerRateLimiter.php', root), 'utf8');
	assert.match(rateLimiter, /const HOUR_LIMIT\s+= 20;/);
	assert.match(rateLimiter, /const MINUTE_LIMIT = 3;/);
	assert.match(admin, /ServerRateLimiter::MINUTE_LIMIT/);
	assert.match(admin, /ServerRateLimiter::HOUR_LIMIT/);
	assert.match(admin, /private function limits_list\(\)/);
	// The same list appears on the checker, on Settings and on Methods & privacy.
	assert.equal((admin.match(/\$this->limits_list\(\);/g) || []).length, 2);
	assert.match(page, /class="oaci-usage-limits"/);
	assert.match(page, /runs a minute and %2\$s an hour/);
	assert.match(page, /no run limit at all/);
	assert.match(readme, /^= Limits =$/m);
	assert.match(readme, /3 runs a minute and 20 an hour/);
	assert.match(readme, /On-device analysis has no run limit at all/);
	assert.match(readme, /never an error code/);
	// The checker turns a limit into words, not a code.
	assert.match(app, /const friendly = limitNotice\(error, config\.limits \|\| \{\}\)/);
	assert.match(limits, /server_rate_limited/);
	assert.match(limits, /ON_DEVICE_IS_UNLIMITED/);
});

test('the on-device download is described as data, with its size and hash, everywhere it is mentioned', async () => {
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const readme = await readFile(new URL('readme.txt', root), 'utf8');
	const vendor = await readFile(new URL('assets/vendor/cycle5/index.js', root), 'utf8');
	// The stated facts are the runtime's own, so they cannot drift.
	const sha = vendor.match(/var CYCLE5_MODEL_SHA256 = "([0-9a-f]{64})"/)[1];
	const bytes = vendor.match(/var CYCLE5_MODEL_BYTES = (\d+)/)[1];
	const file = vendor.match(/var CYCLE5_MODEL_FILE = "([^"]+)"/)[1];
	const label = vendor.match(/var CYCLE5_MODEL_DOWNLOAD_LABEL = "([^"]+)"/)[1];
	assert.match(admin, new RegExp(`const MODEL_SHA256\\s+= '${sha}'`));
	assert.match(admin, new RegExp(`const MODEL_BYTES\\s+= ${bytes}`));
	assert.match(admin, new RegExp(`const MODEL_FILE\\s+= '${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
	assert.match(admin, new RegExp(`const MODEL_DOWNLOAD_LABEL = '${label}'`));
	assert.match(readme, new RegExp(bytes.replace(/\B(?=(\d{3})+(?!\d))/g, ',')));
	assert.match(readme, new RegExp(sha.slice(0, 8)));
	assert.match(readme, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
	// One sentence, reused, so the three screens cannot disagree.
	assert.match(admin, /private function model_download_sentence\(\)/);
	assert.equal((admin.match(/\$this->model_download_sentence\(\)/g) || []).length, 2);
	for (const source of [admin, page, readme]) {
		assert.match(source, /data file|model weights/i);
		assert.match(source, /not a program/i);
	}
	// Nothing may read as though executable code is fetched from elsewhere.
	assert.match(admin, /No executable code is fetched from anywhere else/);
	assert.match(readme, /no executable code is fetched from anywhere/i);
	assert.match(page, /checks it against a hash published in this plugin/);
	assert.match(page, /SHA-256 begins/);
});

test('a site served over plain HTTP still gets identifiers, because randomUUID is secure-context only', async () => {
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const wrapper = await readFile(new URL('assets/js/cycle5-wordpress.mjs', root), 'utf8');
	const ids = await readFile(new URL('assets/js/random-id.mjs', root), 'utf8');
	// Nothing outside random-id.mjs may reach for the secure-context API.
	assert.doesNotMatch(app, /crypto\.randomUUID/);
	assert.doesNotMatch(wrapper, /crypto\.randomUUID/);
	assert.match(app, /requestId\(\)/);
	assert.match(wrapper, /sharedResultId\(\)/);
	assert.match(ids, /getRandomValues/);
	assert.match(ids, /Math\.random/);
	// Content hashes never come from Web Crypto, so the fallback changes nothing there.
	const core = await readFile(new URL('assets/js/core.mjs', root), 'utf8');
	assert.doesNotMatch(core, /crypto\.subtle/);
});

test('the on-device route is refused, and explained, on a site served over plain HTTP', async () => {
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const limits = await readFile(new URL('assets/js/lab-limits.mjs', root), 'utf8');
	assert.match(app, /window\.isSecureContext !== false/);
	assert.match(app, /error\.code = 'insecure_context'/);
	// The card says so before a run is attempted, not only when one fails.
	assert.match(app, /Needs HTTPS/);
	assert.match(app, /input\.disabled = true/);
	assert.match(limits, /insecure_context/);
	assert.match(limits, /rather than skip the check/);
});

test('the shared presentation sync script refuses to copy an unfinished renderer', async () => {
	const sync = await readFile(new URL('bin/sync-shared-presentation.mjs', root), 'utf8');
	const runtime = await readFile(new URL('bin/sync-runtime.sh', root), 'utf8');
	assert.match(sync, /READY FOR INTEGRATION/);
	assert.match(sync, /assets\/vendor\/shared/);
	assert.match(runtime, /sync-shared-presentation\.mjs/);
});

test('complete PDF is explicit, same-result, evidence-complete and safely paginated', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const report = await readFile(new URL('assets/js/checker-report.mjs', root), 'utf8');
	const provenance = await readFile(new URL('assets/js/provenance-report.mjs', root), 'utf8');
	const sharedManifest = await readFile(new URL('assets/vendor/shared/SHARED-SYNC-MANIFEST.txt', root), 'utf8');
	const css = await readFile(new URL('assets/css/lab.css', root), 'utf8');
	assert.match(page, /id="oaci-download-pdf" disabled/);
	assert.match(app, /downloadCheckerPdf\(canonicalResult, inspectedContent, checkerSemantics, document\)/);
	// The PDF itself comes from the cross-surface writer, so the plugin, the
	// extension and the website all produce the same document.
	assert.match(report, /vendor\/shared\/report\/checker-pdf\.mjs/);
	assert.match(report, /surfaceName: SURFACE_NAME/);
	assert.match(report, /levelLabels: levelLabelsFrom\(semantics\)/);
	assert.match(report, /sourceText/);
	assert.match(report, /semantics\.assertResult\(result\)/);
	assert.match(provenance, /vendor\/shared\/report\/checker-pdf\.mjs/);
	assert.match(sharedManifest, /report\/checker-pdf\.mjs/);
	assert.match(sharedManifest, /report\/pdf-writer\.mjs/);
	assert.match(css, /@media print/);
	assert.match(css, /\.oaci-toolbar[^\n]+display: none !important/);
});

test('local file UI accepts text and genuine local C2PA methods with an explicit privacy boundary', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const route = await readFile(new URL('assets/js/lab-route.mjs', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	assert.match(page, /accept="[^"]*\.jpg,\.jpeg,\.png,\.webp,\.pdf[^"]*image\/jpeg,image\/png,image\/webp,application\/pdf"/);
	assert.match(page, /Maximum file size: 20 MB/);
	assert.match(page, /Remote manifests, certificate status and trust lists are not fetched/);
	assert.match(route, /MAX_LOCAL_FILE_BYTES = 20 \* 1024 \* 1024/);
	assert.match(app, /import\(`\.\/c2pa-provenance\.mjs\?ver=\$\{cacheVersion\}`\)/);
	assert.ok(app.indexOf('async function loadFile()') < app.indexOf('c2pa-provenance.mjs'));
	assert.match(app, /status: 'provenance_complete', result: null, serverResult: null, sourceHash: '', error: null/);
	assert.match(app, /if \(receiptButton\) receiptButton\.disabled = true/);
	assert.match(app, /provenanceExport = buildProvenanceExport\(file, result\)/);
	assert.match(app, /if \(pdfButton\) pdfButton\.disabled = false/);
	assert.match(app, /if \(jsonButton\) jsonButton\.disabled = false/);
	assert.match(app, /downloadProvenancePdf/);
});

test('runtime sync includes the canonical checker schema and the pinned local C2PA distribution', async () => {
	const sync = await readFile(new URL('bin/sync-runtime.sh', root), 'utf8');
	const c2paSync = await readFile(new URL('bin/sync-c2pa-runtime.mjs', root), 'utf8');
	const cycle5Sync = await readFile(new URL('bin/sync-cycle5-browser.mjs', root), 'utf8');
	const build = await readFile(new URL('bin/build-plugin.sh', root), 'utf8');
	const c2paFiles = [
		'assets/vendor/c2pa/index.js',
		'assets/vendor/c2pa/c2pa-runtime.js',
		'assets/vendor/c2pa/c2pa_worker.js',
		'assets/vendor/c2pa/c2pa_bg.wasm',
		'assets/vendor/c2pa/highgain.js',
		'assets/vendor/c2pa/LICENSE-c2pa-web.txt',
		'assets/vendor/c2pa/LICENSE-c2pa-wasm.txt',
		'assets/vendor/c2pa/SOURCE-BUILD-NOTICE.txt'
	];
	const schemas = await Promise.all([
		readFile(new URL('schemas/checker-result.schema.json', root)),
		readFile(new URL('tests/fixtures/contracts/valid/checker-result.json', root)),
		readFile(new URL('tests/fixtures/contracts/invalid/checker-result-share-content.json', root))
	]);
	const cycle5Files = [
		'assets/vendor/cycle5/index.js',
		'assets/vendor/cycle5/ort-wasm-simd-threaded.wasm',
		'assets/vendor/cycle5/LICENSE-cycle5-browser.txt',
		'assets/vendor/cycle5/LICENSE-onnxruntime-web.txt',
		'assets/vendor/cycle5/SOURCE-BUILD-NOTICE.txt'
	];
	assert.match(sync, /= "14"/);
	assert.match(sync, /sync-c2pa-runtime\.mjs/);
	assert.match(c2paSync, /'@contentauth\/c2pa-web': '0\.14\.3'/);
	assert.match(c2paSync, /'@contentauth\/c2pa-wasm': '0\.11\.3'/);
	assert.match(c2paSync, /Remote manifest fetching, OCSP fetching and trust-list verification/);
	assert.match(cycle5Sync, /onnxruntime-web/);
	assert.match(cycle5Sync, /ort-wasm-simd-threaded\.wasm/);
	assert.match(build, /--exclude '\/vendor\/'/);
	assert.match(build, /10485760/);
	assert.ok(schemas.every((source) => source.byteLength > 100));
	for (const path of c2paFiles) assert.ok((await readFile(new URL(path, root))).byteLength > 100, path);
	for (const path of cycle5Files) assert.ok((await readFile(new URL(path, root))).byteLength > 100, path);
});

test('opt-in uninstall removes the WordPress channel continuity and status records', async () => {
	const uninstall = await readFile(new URL('uninstall.php', root), 'utf8');
	assert.match(uninstall, /delete_option\( 'oaci_install_id' \)/);
	assert.match(uninstall, /delete_transient\( 'oaci_wordpress_channel_status' \)/);
});
