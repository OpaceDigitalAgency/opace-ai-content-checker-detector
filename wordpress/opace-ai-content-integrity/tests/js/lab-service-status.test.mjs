import assert from 'node:assert/strict';
import test from 'node:test';

import { SERVICE_STATES, applyServiceStatus, fetchServiceStatus, serviceCardCopy, serviceStateFrom } from '../../assets/js/lab-service-status.mjs';

class FakeClassList {
	constructor() { this.names = new Set(); }
	add(name) { this.names.add(name); }
	toggle(name, on) { if (on) this.names.add(name); else this.names.delete(name); }
	contains(name) { return this.names.has(name); }
}

class FakeNode {
	constructor() {
		this.textContent = '';
		this.className = '';
		this.classList = new FakeClassList();
		this.checked = false;
		this.disabled = false;
	}
}

function chooser({ euChecked = false, onDeviceChecked = true, onDeviceDisabled = false, chosen = false, withOnDeviceTag = true } = {}) {
	const nodes = {
		card: new FakeNode(),
		tag: new FakeNode(),
		blurb: new FakeNode(),
		radio: new FakeNode(),
		onDeviceRadio: new FakeNode(),
		onDeviceTag: withOnDeviceTag ? new FakeNode() : null,
		live: new FakeNode(),
		chosen
	};
	nodes.radio.checked = euChecked;
	nodes.radio.disabled = !euChecked;
	nodes.onDeviceRadio.checked = onDeviceChecked;
	nodes.onDeviceRadio.disabled = onDeviceDisabled;
	return nodes;
}

test('every state has its own words, and none of them states a number or a code', () => {
	for (const state of SERVICE_STATES) {
		const copy = serviceCardCopy(state);
		assert.ok(copy.tag && copy.blurb && copy.announcement, state);
		for (const line of [copy.tag, copy.blurb, copy.announcement]) {
			assert.doesNotMatch(line, /\d/, `${state} should not put a figure on the card`);
			assert.doesNotMatch(line, /error|http|timeout|503|429/i, `${state} should not leak a code`);
		}
	}
	// An unrecognised state is treated as still checking rather than as a
	// refusal, because claiming a route is shut on a value we do not understand
	// is the one wrong answer here.
	assert.equal(serviceCardCopy('nonsense'), serviceCardCopy('checking'));
});

test('a page with no remembered answer shows the EU card as being checked, not as unavailable', () => {
	const nodes = chooser();
	const announcement = applyServiceStatus(nodes, 'checking');

	assert.equal(nodes.tag.textContent, 'Checking…');
	assert.equal(nodes.tag.className, 'oaci-route-tag oaci-route-tag--checking');
	assert.ok(nodes.card.classList.contains('is-checking'));
	assert.ok(!nodes.card.classList.contains('is-unavailable'), 'a service being woken is not one that is absent');
	assert.match(nodes.blurb.textContent, /waking the EU service/);
	// On this device is ready the whole time, so there is always something to press.
	assert.equal(nodes.onDeviceRadio.checked, true);
	assert.equal(nodes.onDeviceTag.textContent, 'Recommended');
	assert.equal(nodes.radio.disabled, true);
	assert.equal(announcement, 'Checking whether private EU analysis is available. On this device is ready to run now.');
	assert.equal(nodes.live.textContent, announcement);
});

test('a service that answers yes becomes the recommended card in place', () => {
	const nodes = chooser();
	const announcement = applyServiceStatus(nodes, 'ready');

	assert.equal(nodes.tag.textContent, 'Recommended');
	assert.equal(nodes.tag.className, 'oaci-route-tag oaci-route-tag--recommended');
	assert.equal(nodes.card.classList.contains('is-checking'), false);
	assert.equal(nodes.radio.disabled, false);
	assert.equal(nodes.radio.checked, true);
	assert.equal(nodes.onDeviceRadio.checked, false);
	// On this device keeps its place beside it, and keeps its own reason.
	assert.equal(nodes.onDeviceTag.textContent, 'Private, no limit');
	assert.equal(nodes.onDeviceTag.className, 'oaci-route-tag oaci-route-tag--alternative');
	assert.equal(announcement, 'Private EU analysis is available, and is now the route this page recommends.');
});

test('a service that says no leaves on-device ready and offers a way to ask again', () => {
	const nodes = chooser();
	const announcement = applyServiceStatus(nodes, 'unavailable');

	assert.equal(nodes.tag.textContent, 'Not available right now');
	assert.ok(nodes.card.classList.contains('is-unavailable'));
	assert.equal(nodes.card.classList.contains('is-checking'), false);
	assert.equal(nodes.radio.disabled, true);
	assert.equal(nodes.onDeviceRadio.checked, true);
	assert.equal(nodes.onDeviceTag.textContent, 'Recommended');
	assert.match(nodes.blurb.textContent, /reload to ask the service again/);
	assert.match(nodes.blurb.textContent, /no run limit/);
	assert.equal(announcement, 'Private EU analysis is not available right now. On this device is ready, so use that.');
});

test('an answer that arrives after the reader has chosen relabels the cards and leaves the choice', () => {
	const nodes = chooser({ chosen: true });
	applyServiceStatus(nodes, 'ready');

	assert.equal(nodes.tag.textContent, 'Recommended', 'the card still tells the truth about the route');
	assert.equal(nodes.radio.disabled, false, 'and the reader may now pick it');
	assert.equal(nodes.radio.checked, false, 'but the page does not pick it for them');
	assert.equal(nodes.onDeviceRadio.checked, true);
});

test('a card that stops being selectable does not stay the chosen one', () => {
	const nodes = chooser({ euChecked: true, onDeviceChecked: false });
	applyServiceStatus(nodes, 'unavailable');

	assert.equal(nodes.radio.checked, false);
	assert.equal(nodes.onDeviceRadio.checked, true);
});

test('a page the browser will not let us verify a download on keeps its own on-device tag', () => {
	// On plain HTTP the on-device card already reads "Needs HTTPS". Relabelling
	// it "Recommended" would make one card say two contradictory things, so the
	// caller withholds that node and this leaves it alone.
	const nodes = chooser({ onDeviceDisabled: true, withOnDeviceTag: false });
	applyServiceStatus(nodes, 'ready');
	assert.equal(nodes.onDeviceTag, null);
	assert.equal(nodes.radio.checked, true, 'the EU route runs on the server, so plain HTTP is no obstacle to it');

	const refused = chooser({ euChecked: true, onDeviceChecked: false, onDeviceDisabled: true, withOnDeviceTag: false });
	applyServiceStatus(refused, 'unavailable');
	assert.equal(refused.onDeviceRadio.checked, false, 'a route the browser refuses is not a way out');
});

test('only a plain yes opens the route', () => {
	assert.equal(serviceStateFrom({ available: true }), 'ready');
	assert.equal(serviceStateFrom({ available: 'yes' }), 'unavailable');
	assert.equal(serviceStateFrom({ available: 1 }), 'unavailable');
	assert.equal(serviceStateFrom({}), 'unavailable');
	assert.equal(serviceStateFrom(null), 'unavailable');
	assert.equal(serviceStateFrom('available'), 'unavailable');
});

test('the status request goes to this site, carries the nonce and carries no text', async () => {
	let seen = null;
	const answer = await fetchServiceStatus({
		restUrl: 'https://wordpress.example/wp-json/oaci/v1/',
		pageUrl: 'https://wordpress.example/wp-admin/admin.php?page=oaci-lab',
		nonce: 'nonce-value',
		fetchImpl: async (url, options) => {
			seen = { url, options };
			return { ok: true, json: async () => ({ available: true, state: 'ready' }) };
		}
	});

	assert.equal(seen.url, 'https://wordpress.example/wp-json/oaci/v1/analysis/server/status');
	assert.equal(seen.options.method, 'POST');
	assert.equal(seen.options.credentials, 'same-origin');
	assert.equal(seen.options.headers['X-WP-Nonce'], 'nonce-value');
	assert.equal(seen.options.body, '{}');
	assert.equal(serviceStateFrom(answer), 'ready');
});

test('a site without pretty permalinks asks for the status on its own route', async () => {
	let url = '';
	await fetchServiceStatus({
		restUrl: 'https://wordpress.example/index.php?rest_route=/oaci/v1/',
		pageUrl: 'https://wordpress.example/wp-admin/admin.php?page=oaci-lab',
		nonce: 'nonce-value',
		fetchImpl: async (target) => { url = target; return { ok: true, json: async () => ({ available: true }) }; }
	});
	assert.equal(url, 'https://wordpress.example/index.php?rest_route=%2Foaci%2Fv1%2Fanalysis%2Fserver%2Fstatus');
});

test('the status request never leaves this site', async () => {
	await assert.rejects(
		fetchServiceStatus({
			restUrl: 'https://remote.example/wp-json/oaci/v1/',
			pageUrl: 'https://wordpress.example/wp-admin/admin.php?page=oaci-lab',
			nonce: 'nonce-value',
			fetchImpl: async () => { throw new Error('should never be called'); }
		}),
		(error) => error.code === 'cross_site_rest_url'
	);
});

test('a refused or unreadable answer reads as unavailable rather than as available', async () => {
	const refused = await fetchServiceStatus({
		restUrl: 'https://wordpress.example/wp-json/oaci/v1/',
		pageUrl: 'https://wordpress.example/wp-admin/admin.php',
		nonce: 'n',
		fetchImpl: async () => ({ ok: false, json: async () => ({ available: true }) })
	});
	assert.equal(serviceStateFrom(refused), 'unavailable');

	const unreadable = await fetchServiceStatus({
		restUrl: 'https://wordpress.example/wp-json/oaci/v1/',
		pageUrl: 'https://wordpress.example/wp-admin/admin.php',
		nonce: 'n',
		fetchImpl: async () => ({ ok: true, json: async () => { throw new SyntaxError('not JSON'); } })
	});
	assert.equal(serviceStateFrom(unreadable), 'unavailable');
});
