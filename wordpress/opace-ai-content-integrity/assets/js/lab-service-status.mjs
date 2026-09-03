/**
 * Whether private EU analysis is available, asked for after the page is drawn.
 *
 * The EU service scales to zero. A container that has been idle takes several
 * seconds to answer its first request, and measurements from inside the test
 * containers on 3 September 2026 were 0.39 s warm against 9.51 s and 14.03 s
 * cold. Waiting for that while rendering an admin screen is not an option, and
 * giving up on it early is worse than not asking: a healthy service reads as a
 * closed one and the route the checker should recommend disappears.
 *
 * So the screen is drawn from the answer the site already holds, and the
 * browser asks for a fresh one through the site's own authenticated route while
 * the reader is already reading. There are three states and no fourth:
 *
 *   checking     the route is on, nothing has asked the service yet
 *   ready        the service says the WordPress channel is accepting runs
 *   unavailable  it said no, or could not be reached
 *
 * Whichever it turns out to be, on this device is ready the whole time, so the
 * reader is never left with nothing to press.
 */

import { sameSiteRouteUrl } from './lab-route.mjs';

export const SERVICE_STATES = Object.freeze(['checking', 'ready', 'unavailable']);

const COPY = Object.freeze({
	checking: Object.freeze({
		tag: 'Checking…',
		tagClass: 'checking',
		blurb: 'We are waking the EU service and asking whether it is accepting runs. That takes a few seconds when it has been idle. On this device is ready now, so you can start there.',
		announcement: 'Checking whether private EU analysis is available. On this device is ready to run now.'
	}),
	ready: Object.freeze({
		tag: 'Recommended',
		tagClass: 'recommended',
		blurb: 'Nothing to download and an answer in about a second. Local checks run here, then the draft goes once to our EU server for the AI reading and is not kept there. It has an allowance; on this device does not.',
		announcement: 'Private EU analysis is available, and is now the route this page recommends.'
	}),
	unavailable: Object.freeze({
		tag: 'Not available right now',
		tagClass: 'unavailable',
		blurb: 'Private EU analysis is not available right now. On this device is ready, reads the draft with the same model and has no run limit. Reload this screen to ask the service again.',
		announcement: 'Private EU analysis is not available right now. On this device is ready, so use that.'
	})
});

/**
 * The words for one state.
 *
 * @param {string} state One of SERVICE_STATES.
 * @returns {{tag: string, tagClass: string, blurb: string, announcement: string}}
 */
export function serviceCardCopy(state) {
	return COPY[state] || COPY.checking;
}

/**
 * What the status route's answer means. Anything that is not a plain yes is
 * read as unavailable, so a malformed reply cannot open the route.
 *
 * @param {unknown} payload The decoded answer.
 * @returns {'ready'|'unavailable'}
 */
export function serviceStateFrom(payload) {
	return payload && typeof payload === 'object' && payload.available === true ? 'ready' : 'unavailable';
}

/**
 * Moves the chooser to the state given, in place.
 *
 * The nodes are passed in rather than looked up so the caller decides what may
 * be touched. On a page served over plain HTTP the on-device card already says
 * "Needs HTTPS", and relabelling it "Recommended" would contradict that, so the
 * caller withholds that node instead of this function guessing.
 *
 * @param {object} nodes    card, tag, blurb, radio, onDeviceRadio, onDeviceTag, live, and chosen.
 * @param {string} state    One of SERVICE_STATES.
 * @returns {string} The sentence announced, so a caller can assert on it.
 */
export function applyServiceStatus(nodes = {}, state = 'checking') {
	const settled = SERVICE_STATES.includes(state) ? state : 'checking';
	const copy = serviceCardCopy(settled);
	const ready = settled === 'ready';
	if (nodes.tag) {
		nodes.tag.textContent = copy.tag;
		nodes.tag.className = `oaci-route-tag oaci-route-tag--${copy.tagClass}`;
	}
	if (nodes.blurb) nodes.blurb.textContent = copy.blurb;
	if (nodes.card?.classList) {
		nodes.card.classList.toggle('is-checking', settled === 'checking');
		nodes.card.classList.toggle('is-unavailable', settled === 'unavailable');
	}
	// A card nobody can choose yet is not selectable, but it is never removed:
	// the reader can see the route exists and what is happening to it.
	if (nodes.radio) nodes.radio.disabled = !ready;
	// The chooser only moves itself while nobody has moved it. Once a reader has
	// picked a card, a late answer relabels the cards and leaves their choice.
	if (ready && nodes.radio && !nodes.chosen) {
		nodes.radio.checked = true;
		if (nodes.onDeviceRadio) nodes.onDeviceRadio.checked = false;
	}
	// A card that has just stopped being selectable cannot stay the chosen one,
	// so the selection falls back to the route that is ready — unless the
	// browser will not let that one run either, in which case nothing is moved
	// and the reader picks for themselves.
	if (!ready && nodes.radio?.checked && nodes.onDeviceRadio && !nodes.onDeviceRadio.disabled) {
		nodes.radio.checked = false;
		nodes.onDeviceRadio.checked = true;
	}
	if (nodes.onDeviceTag) {
		nodes.onDeviceTag.textContent = ready ? 'Private, no limit' : 'Recommended';
		nodes.onDeviceTag.className = `oaci-route-tag oaci-route-tag--${ready ? 'alternative' : 'recommended'}`;
	}
	if (nodes.live) nodes.live.textContent = copy.announcement;
	return copy.announcement;
}

/**
 * Asks this site whether the EU service is accepting runs. The draft is not
 * involved: this carries nothing but the nonce.
 *
 * @param {object} options restUrl, pageUrl, nonce, fetchImpl and signal.
 * @returns {Promise<object>} The decoded answer.
 */
export async function fetchServiceStatus(options) {
	const { restUrl, pageUrl, nonce, fetchImpl = fetch, signal } = options;
	const response = await fetchImpl(sameSiteRouteUrl(restUrl, pageUrl, 'analysis/server/status'), {
		method: 'POST',
		credentials: 'same-origin',
		cache: 'no-store',
		headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
		body: '{}',
		signal
	});
	if (!response.ok) return { available: false, state: 'channel_unavailable' };
	return response.json().catch(() => ({ available: false, state: 'channel_unavailable' }));
}
