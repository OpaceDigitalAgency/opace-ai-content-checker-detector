import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

test('version identity is aligned before package build', async () => {
	const bootstrap = await readFile(new URL('opace-ai-content-checker-detector.php', root), 'utf8');
	const readme = await readFile(new URL('readme.txt', root), 'utf8');
	const citation = await readFile(new URL('CITATION.cff', root), 'utf8');
	const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
	assert.match(bootstrap, /\* Version: 1\.1\.11/);
	assert.match(bootstrap, /OPACE_CONTENT_INTEGRITY_VERSION', '1\.1\.11'/);
	assert.match(readme, /Stable tag: 1\.1\.11/);
	assert.match(readme, /^= 1\.1\.11 =$/m);
	assert.match(readme, /^== Screenshots ==$/m);
	assert.match(citation, /^version: 1\.1\.11$/m);
	assert.equal(packageJson.version, '1.1.11');
	assert.match(readme, /^Contributors: opacewebdesign$/m);
	// Keep the directory copy within WordPress guidance without dropping disclosures.
	assert.ok(Buffer.byteLength(readme) < 10_000, 'WordPress.org readme should stay below 10 KB');
	assert.match(readme, /^Tags: ai detector, ai content detector, ai content checker, chatgpt detector, ai watermark$/m);
});

test('admin interface carries responsive and accessible states', async () => {
	const css = await readFile(new URL('assets/css/lab.css', root), 'utf8');
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	assert.match(css, /max-width: 782px/);
	assert.match(css, /prefers-reduced-motion/);
	assert.match(css, /\.oaci-result-panel:focus/);
	assert.match(page, /aria-live="polite"/);
	assert.match(page, /class="oaci-panel oaci-result-panel" id="oaci-result-panel" aria-labelledby="oaci-evidence-title" tabindex="0"/);
	assert.match(page, /id="oaci-source-error" class="oaci-field-error" hidden/);
	assert.match(page, /id="oaci-fix-panel" class="oaci-local-card" tabindex="-1" hidden/);
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
	const mark = await readFile(new URL('assets/images/opace-ai-content-checker-mark.png', root));
	assert.match(page, /assets\/images\/opace-ai-content-checker-mark\.png/);
	assert.match(admin, /assets\/images\/opace-ai-content-checker-mark\.png/);
	assert.doesNotMatch(`${page}\n${admin}`, /\.wordpress-org/);
	assert.doesNotMatch(`${page}\n${admin}`, /<span>1<\/span><span>2<\/span><span>3<\/span>/);
	assert.equal(mark.subarray(1, 4).toString('ascii'), 'PNG');
	assert.equal(mark.readUInt32BE(16), 128);
	assert.equal(mark.readUInt32BE(20), 128);
	assert.ok(mark.byteLength < 50_000, 'runtime canonical logo should remain lightweight');
});

test('Lab source includes method-level finding hierarchy and a persistent unavailable-model boundary', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const evidence = await readFile(new URL('assets/js/lab-evidence.mjs', root), 'utf8');
	// The rail's "AI-pattern model: Not run" box is gone. It sat directly above a
	// second box that said the same thing, and two panels saying one thing read
	// as two competing answers. One card now carries the heading, the counts and
	// the boundary together.
	assert.doesNotMatch(page, /AI-pattern model/);
	assert.doesNotMatch(page, /oaci-model-state/);
	assert.match(evidence, /Integrity checks only/);
	assert.match(evidence, /No AI reading/);
	assert.match(evidence, /no trained model read this draft/i);
	assert.match(page, /[Aa]n administrator has not turned it on or the service is not accepting runs/);
	assert.match(page, /does not produce an AI-pattern score/);
	assert.match(app, /renderEvidence\(results, result, document, \{/);
	assert.match(evidence, /Each finding stays under the method that produced it/);
	// Twenty findings in a row is a wall. The first few are open and the rest sit
	// behind a disclosure that names how many, so nothing is hidden by omission.
	assert.match(evidence, /const FINDINGS_SHOWN = 5;/);
	assert.match(evidence, /Show the other \$\{rest\.length\}/);
	assert.match(evidence, /What this check cannot prove/);
	assert.match(evidence, /What to do:/);
});

test('EU server route is informed, same-site and fail-closed until its first-party channel exists', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const plugin = await readFile(new URL('includes/Core/Plugin.php', root), 'utf8');
	const rest = await readFile(new URL('includes/Rest/RestController.php', root), 'utf8');
	const adapter = await readFile(new URL('includes/Adapters/OpaceEuServerAdapter.php', root), 'utf8');
	const channel = await readFile(new URL('includes/Adapters/WordPressServerAnalysisChannel.php', root), 'utf8');
	const client = await readFile(new URL('assets/js/lab-route.mjs', root), 'utf8');
	assert.match(admin, /server_analysis_opt_in/);
	assert.doesNotMatch(admin, /server_analysis_endpoint/);
	// There is no tick box on the checker. Agreement to send the draft once, or
	// to download the model, is the press of a button whose label names it, and
	// the run refuses unless that press is what started it.
	assert.doesNotMatch(page, /type="checkbox"/);
	assert.doesNotMatch(page, /I understand that this draft will be sent once/i);
	assert.match(app, /if \(route === 'server' && !consented\)/);
	assert.match(app, /consent: consented,/);
	assert.match(app, /if \(route === 'server'\) return 'Send once to the EU server and check';/);
	assert.match(app, /Download model \(\$\{modelSizeLabel\(\)\}\) and check/);
	assert.match(app, /if \(consented !== true\) \{/);
	// The label can only be honest if the page knows whether the model is here,
	// and asking must cost nothing: no session, no fetch, one cache lookup.
	const wrapper = await readFile(new URL('assets/js/cycle5-wordpress.mjs', root), 'utf8');
	assert.match(wrapper, /export async function cachedModelPresent/);
	assert.doesNotMatch(wrapper.split('export async function cachedModelPresent')[1].split('\n}')[0], /fetch\(/);
	assert.match(app, /refreshModelCacheState\(\)/);
	// A control whose label the service's answer can change must not be pressable
	// while that answer is outstanding, or a reader can press a button that meant
	// something else when they started reading it.
	assert.match(app, /const primaryBlocked = \(\) => serviceChecking && !routeChosen;/);
	assert.match(app, /inspectButton\.disabled = runningNow \|\| primaryBlocked\(\)/);
	assert.match(app, /Checking which routes are open…/);
	// The shortfall for an AI reading is stated beside the button, not only in a
	// chip in the card above.
	assert.match(app, /more \$\{missing === 1 \? 'word' : 'words'\} for an AI reading/);
	assert.match(page, /disabled\( ! \$server_available \)/);
	assert.match(plugin, /new WordPressServerAnalysisChannel\(\)/);
	assert.match(channel, /STATUS_CACHE_KEY/);
	assert.match(channel, /wp_safe_remote_get/);
	// Nothing that draws a screen may wait on the service. available() reads the
	// remembered answer, probe() is the only method that touches the network,
	// and it waits long enough for a container that scaled to zero to start.
	assert.match(channel, /const STATUS_PROBE_TIMEOUT_SECONDS = 20;/);
	assert.match(channel, /'timeout'\s*=> self::STATUS_PROBE_TIMEOUT_SECONDS/);
	assert.match(channel, /const STATUS_READY_SECONDS\s*= 300;/);
	assert.match(channel, /const STATUS_UNREADY_SECONDS = 60;/);
	assert.doesNotMatch(channel, /public function available\(\) \{[\s\S]{0,400}wp_safe_remote_get/);
	// The identity check the route hangs on now lives in its own parser, and
	// every contract the plugin was built against has to match before it opens.
	const status = await readFile(new URL('includes/Adapters/ServiceStatus.php', root), 'utf8');
	assert.match(status, /\['wordpress_channel'\]/);
	assert.match(status, /'wordpress-v1' === self::text\( \$channel, 'credential_class' \)/);
	for (const contract of ['tier3-cycle5-full', 'segments-v3', 'raw-v1', 'features-v1', 'margin-v1']) {
		assert.match(status, new RegExp(`'${contract}'`), contract);
	}
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

test('the EU card is refreshed from the browser, so a cold service never hides the route', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const rest = await readFile(new URL('includes/Rest/RestController.php', root), 'utf8');
	const adapter = await readFile(new URL('includes/Adapters/OpaceEuServerAdapter.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const service = await readFile(new URL('assets/js/lab-service-status.mjs', root), 'utf8');
	const css = await readFile(new URL('assets/css/lab.css', root), 'utf8');

	// The route the browser calls is authenticated, same-site and capability
	// checked, and it never carries a draft.
	assert.match(rest, /\/analysis\/server\/status/);
	assert.match(rest, /'callback'\s*=> array\( \$this, 'server_status' \)/);
	assert.match(rest, /'permission_callback' => \$mutation/);
	assert.match(adapter, /public function probed_status\(\)/);
	assert.match(adapter, /if \( \$opted_in && \$probe \) \{/);

	// The three states the card can be in, and the hooks the script moves.
	assert.match(page, /data-oaci-route-card="server"/);
	assert.match(page, /data-oaci-route-tag="server"/);
	assert.match(page, /data-oaci-route-blurb="server"/);
	assert.match(page, /data-oaci-route-tag="on_device"/);
	assert.match(page, /id="oaci-route-live" role="status" aria-live="polite"/);
	assert.match(page, /\$server_checking/);
	assert.match(page, /Checking…/);
	assert.match(admin, /'checking'\s*=> \$server\['checking'\]/);
	assert.match(app, /config\.serverAnalysis\?\.checking === true/);
	assert.match(app, /applyServiceStatus\(serviceNodes\(\), serviceState\)/);
	assert.match(service, /analysis\/server\/status/);
	assert.match(css, /\.oaci-route\.is-checking/);
	assert.match(css, /\.oaci-route-live:empty/);
});

test('Lab includes responsive file, empty, progress, cancel and route states', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const css = await readFile(new URL('assets/css/lab.css', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	assert.match(page, /id="oaci-source-file"/);
	assert.match(page, /id="oaci-run-progress"/);
	assert.match(page, /id="oaci-cancel-run"/);
	assert.match(page, /class="oaci-empty"/);
	// The reason a run was refused sits above the export row, not under it.
	assert.match(css, /#oaci-status \{ order: 2; \}/);
	assert.match(css, /\.oaci-toolbar \{ order: 3; \}/);
	assert.match(page, /class="oaci-toolbar-note" id="oaci-toolbar-note" hidden/);
	assert.match(app, /explainDisabledExports/);
	assert.match(page, /name="oaci-analysis-route"/);
	assert.match(css, /\.oaci-routes/);
	assert.match(css, /\.oaci-progress\[hidden\]/);
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
	// One disclosure, and it looks like one. The route's own paragraph and the
	// model's facts are inside it; nothing on the chooser is longer than a line.
	assert.match(page, /<details class="oaci-disclosure" id="oaci-route-disclosure">/);
	assert.match(page, /How this route works/);
	assert.match(app, /routeDetail\.textContent = routeDetailFor\(route\)/);
	assert.match(app, /modelFacts\.hidden = !onDevice/);
	assert.match(app, /modelDownload\.hidden = !onDevice/);
});

test('private EU analysis leads when it is on and reachable, and on this device leads otherwise', async () => {
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	const adapter = await readFile(new URL('includes/Adapters/OpaceEuServerAdapter.php', root), 'utf8');
	const settings = await readFile(new URL('includes/Core/Settings.php', root), 'utf8');
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const choice = await readFile(new URL('assets/js/lab-route-choice.mjs', root), 'utf8');
	// The EU card is the checked one exactly when the site says it is available,
	// and it carries Recommended there rather than the unavailable tag.
	assert.match(page, /value="server" <\?php checked\( \$server_available \); \?>/);
	assert.match(page, /value="on_device" <\?php checked\( ! \$server_available \); \?>/);
	assert.match(page, /\$server_available \? esc_html__\( 'Private, no limit'/);
	// Installing the plugin never turns network transfer on by itself.
	assert.match(settings, /'server_analysis_opt_in'\s+=> false/);
	assert.match(adapter, /'recommended'\s+=> \$available \? 'server' : 'on_device'/);
	// One function decides the opening card, and the page uses it.
	assert.match(choice, /export function defaultRoute/);
	assert.match(app, /defaultRoute\(\{ serverAvailable: config\.serverAnalysis\?\.available === true/);
});

test('a refused EU run names the reason and offers the unlimited route in one click', async () => {
	const app = await readFile(new URL('assets/js/lab-app.mjs', root), 'utf8');
	const limits = await readFile(new URL('assets/js/lab-limits.mjs', root), 'utf8');
	const refusal = await readFile(new URL('includes/Adapters/ServiceRefusal.php', root), 'utf8');
	const route = await readFile(new URL('assets/js/lab-route.mjs', root), 'utf8');
	assert.match(app, /const offer = fallbackOffer\(error/);
	assert.match(app, /button\.id = 'oaci-run-fallback'/);
	// A refused run must not leave the rail claiming one is still going.
	assert.match(app, /This run did not produce an AI reading\./);
	// Taking the offer switches the card and counts as the reader's own choice,
	// so a late answer from the service cannot switch it back underneath them.
	assert.match(app, /input\.checked = true;\s*\n\s*routeChosen = true;\s*\n\s*if \(routeLive\) routeLive\.textContent = '';\s*\n\s*updateRoute\(\);/);
	// Every reason the service can give has words of its own on the screen.
	for (const reason of ['site_hourly_limit', 'site_daily_limit', 'channel_floor_exhausted', 'shared_pool_exhausted', 'server_route_disabled', 'server_unreachable']) {
		assert.match(refusal, new RegExp(`'${reason}'`), `${reason} is not mapped in PHP`);
		assert.match(limits, new RegExp(`code === '${reason}'`), `${reason} has no notice`);
	}
	// The wait comes from the service, never from a number made up here.
	assert.match(route, /function retryAfterFrom\(payload, response\)/);
	assert.match(route, /Retry-After/);
	// The route is built for both ways WordPress publishes its API, because a
	// site with plain permalinks would otherwise post to the site root.
	assert.match(route, /rest\.searchParams\.get\('rest_route'\)/);
	assert.doesNotMatch(limits, /\d+\s*%/u, 'a notice must never state a proportion of an allowance');
});

test('the allowance figures come from the status probe and a missing one prints nothing', async () => {
	const status = await readFile(new URL('includes/Adapters/ServiceStatus.php', root), 'utf8');
	const admin = await readFile(new URL('includes/Admin/Admin.php', root), 'utf8');
	const page = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	assert.match(status, /channel_floor/);
	assert.match(status, /shared_pool_remaining/);
	assert.match(status, /site_per_hour/);
	// Both screens branch on whether the service actually sent a figure.
	assert.match(admin, /private function allowance_sentences\(\)/);
	assert.match(admin, /if \( null === \$floor \)/);
	assert.match(page, /private function service_allowance_line\(\)/);
	// A site that has not opted in makes no request to the service at all.
	const adapter = await readFile(new URL('includes/Adapters/OpaceEuServerAdapter.php', root), 'utf8');
	assert.match(adapter, /\$opted_in \? \$this->channel->limits\(\)/);
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
	const design = await readFile(new URL('assets/css/admin.css', root), 'utf8');
	assert.match(design, /@font-face/);
	for (const stylesheet of [design, css, await readFile(new URL('assets/css/editor.css', root), 'utf8')]) {
		assert.doesNotMatch(stylesheet, /https?:\/\//u, 'no remote font or asset may be requested from a stylesheet');
	}
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
	// Both panels are configured from one place since 1.1.5, so the checker link
	// for a post is built once and checked once.
	const editorConfig = await readFile(new URL('includes/Editor/EditorConfig.php', root), 'utf8');
	const panel = await readFile(new URL('assets/js/editor-panel.mjs', root), 'utf8');
	assert.match(admin, /add_filter\( 'post_row_actions'/);
	assert.match(admin, /add_filter\( 'page_row_actions'/);
	assert.match(admin, /Check with AI Content Checker/);
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
	assert.match(editorConfig, /Admin::check_post_url\( \$post_id \)/);
	assert.match(panel, /config\.checkUrl/);
	// A finished reading stays in the tab, never a server handover or a link.
	assert.doesNotMatch(rest, /\/editor\/handoff|store_handoff|collect_handoff|oaci_handoff_/);
	assert.match(rest, /current_user_can\( 'edit_post', \$post_id \)/);
	assert.doesNotMatch(editorConfig, /post_content|'result'/);
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
	assert.match(admin, /private function limits_sentences\(\)/);
	// The same list appears on the checker, on Settings and on Methods & privacy.
	assert.equal((admin.match(/\$this->limits_sentences\(\)/g) || []).length, 2);
	assert.match(page, /class="oaci-usage-limits"/);
	assert.match(page, /runs a minute and %2\$s an hour/);
	assert.match(page, /no run limit at all/);
	assert.match(readme, /^= Usage limits and compatibility =$/m);
	assert.match(readme, /3 runs a minute and 20 an hour/);
	assert.match(readme, /On-device analysis has no run-count limit/);
	assert.match(readme, /Limit messages name the allowance, reset and on-device fallback/);
	// The checker turns a limit into words, not a code.
	assert.match(app, /const friendly = limitNoticeParts\(error, config\.limits \|\| \{\}\)/);
	assert.match(limits, /export function limitNoticeParts/);
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
	// A route the browser will not let us verify cannot also be the recommended
	// one, so the rendered tag is replaced rather than joined.
	assert.match(app, /card\?\.querySelector\('\.oaci-route-tag'\)\?\.remove\(\)/);
	// The card is found by a class the markup actually carries. A rename in the
	// stylesheet used to break this silently: the radio was disabled while its
	// tag still read "Recommended", which is the contradiction this exists to stop.
	const cardClass = app.match(/input\.closest\('\.([a-z-]+)'\)/)[1];
	const markup = await readFile(new URL('includes/Admin/LabPage.php', root), 'utf8');
	assert.match(markup, new RegExp(`class="${cardClass}[ "]`), `the markup carries no .${cardClass}`);
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
	assert.match(app, /downloadCheckerPdf\(canonicalResult, inspectedContent, checkerSemantics, document, \{ selectedRuleFindings: completedRuleFindings \}\)/);
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
