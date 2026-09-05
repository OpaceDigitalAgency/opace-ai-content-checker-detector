/** Read-only, keyboard-accessible combobox for saved WordPress content. */
import { sameSiteRouteUrl } from './lab-route.mjs';

export function postPickerUrl(restUrl, pageUrl, path, query = new URLSearchParams()) {
	const url = new URL(sameSiteRouteUrl(restUrl, pageUrl, path));
	for (const [key, value] of query) url.searchParams.set(key, value);
	return url.href;
}

export function mountPostPicker(root, { config, signal, getDraft, canLoad, onLoad }) {
	const find = (id) => root.querySelector('#oaci-post-' + id);
	const search = find('search');
	if (!search) return { open() {} };
	const picker = find('picker'), popup = find('popup'), type = find('type'), status = find('status');
	const results = find('results'), note = find('replace-note'), load = find('load');
	const previous = find('previous'), next = find('next'), message = find('message');
	let page = 1, selected = null, controller, timer, loading = false, generation = 0, active = -1, items = [];
	const listen = (node, event, handler) => node.addEventListener(event, handler, { signal });
	const text = (tag, value) => { const node = document.createElement(tag); node.textContent = value; return node; };
	const title = (item) => item.title || 'Untitled ' + item.type.toLowerCase();
	const clearActive = () => { active = -1; search.removeAttribute('aria-activedescendant'); };
	const close = () => { popup.hidden = true; search.setAttribute('aria-expanded', 'false'); clearActive(); };
	function placePopup() {
		if (popup.hidden) return;
		const bounds = search.getBoundingClientRect();
		const room = window.innerHeight - bounds.bottom - 22;
		const above = room < 210 && bounds.top > room && bounds.top > 260;
		popup.classList.toggle('is-above', above);
		results.style.maxHeight = Math.max(110, Math.min(252, (above ? bounds.top - 22 : room) - 118)) + 'px';
	}
	const open = () => { if (loading) return; popup.hidden = false; search.setAttribute('aria-expanded', 'true'); placePopup(); };
	const selectionCopy = () => {
		const replacing = Boolean(getDraft().trim());
		load.textContent = replacing ? 'Replace draft' : 'Load';
		load.disabled = !selected || loading;
		note.textContent = selected
			? (replacing ? 'Replaces your checker draft. The saved original stays unchanged.' : 'Loads a copy of the saved text. The original stays unchanged.')
			: 'Saved content only. Your original stays unchanged; unsaved editor changes are not included.';
	};
	const clearSelection = () => { selected = null; selectionCopy(); clearActive(); };
	function highlight(index) {
		const options = [...results.children];
		if (!options.length) return;
		active = (index + options.length) % options.length;
		for (let i = 0; i < options.length; i++) options[i].setAttribute('aria-selected', String(i === active));
		search.setAttribute('aria-activedescendant', options[active].id);
		options[active].scrollIntoView({ block: 'nearest' });
	}
	function choose(index) {
		if (!items[index] || loading) return;
		selected = items[index]; search.value = title(selected); selectionCopy(); message.textContent = '';
		close(); search.focus();
	}
	async function request(path, abortSignal, query) {
		const response = await fetch(postPickerUrl(config.restUrl, window.location.href, path, query), {
			credentials: 'same-origin', cache: 'no-store', signal: abortSignal, headers: { 'X-WP-Nonce': config.nonce }
		});
		const body = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(body.message || 'Could not load saved content. Please try again.');
		return body;
	}
	async function refresh() {
		clearTimeout(timer);
		const current = ++generation;
		controller?.abort(); controller = new AbortController();
		clearActive(); items = []; results.replaceChildren(); previous.hidden = true; next.hidden = true;
		status.textContent = 'Searching…'; results.setAttribute('aria-busy', 'true');
		try {
			const query = new URLSearchParams({ search: selected ? '' : search.value.trim(), type: type.value, page: String(page) });
			const body = await request('posts', controller.signal, query);
			if (current !== generation || signal.aborted) return;
			items = body.items || [];
			items.forEach((item, index) => {
				const option = text('li', '');
				option.id = 'oaci-post-option-' + item.id; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false');
				option.append(text('strong', title(item)), text('span', item.type + ' · ' + item.status));
				listen(option, 'mousedown', event => event.preventDefault());
				listen(option, 'click', () => choose(index));
				results.append(option);
			});
			status.textContent = items.length ? (search.value && !selected ? 'Matching content' : 'Recently updated') + ' · Page ' + page : 'No matches. Try another search or filter.';
			previous.hidden = page === 1; next.hidden = !body.has_more || page >= 1000;
			placePopup();
		} catch (error) {
			if (error.name !== 'AbortError' && current === generation) status.textContent = error.message;
		} finally {
			if (current === generation) results.removeAttribute('aria-busy');
		}
	}
	listen(search, 'click', () => { if (popup.hidden) { open(); refresh(); } if (selected) search.select(); });
	listen(search, 'input', () => {
		clearTimeout(timer); controller?.abort(); generation++; clearSelection(); items = []; results.replaceChildren(); open();
		previous.hidden = true; next.hidden = true; status.textContent = 'Searching…';
		page = 1; timer = setTimeout(refresh, 220);
	});
	listen(search, 'keydown', event => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (popup.hidden) { open(); refresh(); }
			else highlight(active < 0 ? (event.key === 'ArrowDown' ? 0 : items.length - 1) : active + (event.key === 'ArrowDown' ? 1 : -1));
		} else if (event.key === 'Enter' && !popup.hidden) {
			event.preventDefault(); if (active >= 0) choose(active);
		}
	});
	listen(picker, 'keydown', event => { if (event.key === 'Escape' && !popup.hidden) { event.preventDefault(); event.stopPropagation(); close(); search.focus(); } });
	listen(picker, 'focusout', event => { if (!picker.contains(event.relatedTarget)) close(); });
	listen(document, 'pointerdown', event => { if (!picker.contains(event.target)) close(); });
	listen(window, 'resize', placePopup);
	listen(type, 'change', () => { page = 1; refresh(); search.focus(); });
	listen(previous, 'click', () => { page--; refresh(); search.focus(); });
	listen(next, 'click', () => { page++; refresh(); search.focus(); });
	listen(load, 'click', async () => {
		if (!selected || loading) return;
		if (!canLoad()) { message.textContent = 'Finish or cancel the current check before loading another draft.'; return; }
		const item = selected, previousDraft = getDraft();
		loading = true; close(); load.disabled = true; search.disabled = true; type.disabled = true;
		load.textContent = 'Loading…'; message.textContent = '';
		try {
			const body = await request('posts/' + item.id, signal);
			if (!String(body.content || '').trim()) throw new Error('No saved text to check. Your checker draft was not changed.');
			if (!canLoad()) throw new Error('A check is running. Your checker draft was not changed; try loading again when it finishes.');
			if (getDraft() !== previousDraft) throw new Error('Your checker draft changed while loading. Nothing was replaced; select Load again if you still want to replace it.');
			onLoad(body); selected = null; search.value = ''; page = 1;
		} catch (error) {
			if (error.name !== 'AbortError') message.textContent = error.message;
		} finally {
			loading = false; search.disabled = false; type.disabled = false; selectionCopy();
		}
	});
	signal.addEventListener('abort', () => { clearTimeout(timer); controller?.abort(); }, { once: true });
	selectionCopy();
	return { open() { selectionCopy(); } };
}
