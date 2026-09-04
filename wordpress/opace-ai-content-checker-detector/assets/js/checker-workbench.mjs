/**
 * The workbench behaviour: the draft the reader can see a section in, and the
 * section rows that open in place.
 *
 * `shared/presentation/` is frozen and owned by another lane. It draws the
 * section score rows and the deep dives as two sibling blocks, with every dive
 * open. The owner's requirement is one open at a time, opened inside its own
 * row, with the row pinned and a strip that steps between sections — so this
 * file rearranges what the shared renderer produced rather than re-rendering it
 * or forking the renderer. Nothing here draws a score, a level or a passage;
 * those all still come from the shared component.
 *
 * The pure functions at the top take no DOM and are what the unit tests hold.
 */

/** The five band ids the renderer uses, so a level can never arrive as a class. */
export const BAND_LEVELS = Object.freeze([
	'signal-likely-human',
	'signal-unclear',
	'signal-potentially-ai',
	'signal-likely-ai',
	'signal-strongly-ai'
]);

/**
 * Where a scored section sits in the draft the reader is looking at.
 *
 * The contract records UTF-16 offsets against the text that was scored. For a
 * plain-text draft those are the draft's own offsets and are used directly,
 * after checking that the characters at them really are the section's passage —
 * an offset that lands on the wrong words is worse than no tint at all. For
 * Markdown and HTML the checked projection is not the draft, so the passage is
 * found by its own text instead. Where neither works, nothing is returned and
 * nothing is claimed.
 *
 * @param {object} section a canonical result section
 * @param {string} draft the text now in the draft box
 * @returns {{start: number, end: number, exact: boolean}|null}
 */
export function locateSection(section, draft) {
	if (!section || typeof draft !== 'string' || draft.length === 0) return null;
	const start = Number(section.start_utf16);
	const end = Number(section.end_utf16);
	const passage = typeof section.passage === 'string' ? section.passage : '';
	const offsetsUsable = Number.isInteger(start) && Number.isInteger(end)
		&& start >= 0 && end > start && end <= draft.length;
	if (offsetsUsable && (!passage || draft.slice(start, end) === passage)) {
		return { start, end, exact: true };
	}
	if (!passage) return null;
	const found = draft.indexOf(passage);
	if (found < 0) return null;
	return { start: found, end: found + passage.length, exact: false };
}

/**
 * The draft split around the passage to tint. Returned as three strings rather
 * than markup so nothing here can produce HTML, and so the test can assert the
 * split by character offsets alone.
 *
 * @param {string} draft
 * @param {{start: number, end: number}|null} span
 * @returns {{before: string, marked: string, after: string}}
 */
export function draftMirrorParts(draft, span) {
	const text = typeof draft === 'string' ? draft : '';
	if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end)) {
		return { before: text, marked: '', after: '' };
	}
	const start = Math.max(0, Math.min(text.length, span.start));
	const end = Math.max(start, Math.min(text.length, span.end));
	return { before: text.slice(0, start), marked: text.slice(start, end), after: text.slice(end) };
}

/**
 * The sticky strip's line: which section this is, what it read as, and its
 * score. One sentence, in the order the owner asked for.
 *
 * @param {number} index zero-based section index
 * @param {number} total how many sections there are
 * @param {string} levelName the band's own name
 * @param {string} displayScore the contract's score string, never re-rounded
 * @returns {string}
 */
export function stepLabel(index, total, levelName, displayScore) {
	const parts = [`Section ${index + 1} of ${total}`];
	if (levelName) parts.push(String(levelName));
	if (displayScore) parts.push(`Score ${displayScore}`);
	return parts.join(' · ');
}

/**
 * Which row an arrow key moves to. Separated out so the wrap-stops are tested
 * without a keyboard: the list is a list, not a carousel, so the ends hold.
 *
 * @param {string} key the KeyboardEvent key
 * @param {number} current the row that has focus
 * @param {number} total how many rows there are
 * @returns {number|null} the row to move to, or null for a key that does nothing
 */
export function nextRowForKey(key, current, total) {
	if (total < 1) return null;
	if (key === 'ArrowDown' || key === 'ArrowRight') return Math.min(total - 1, current + 1);
	if (key === 'ArrowUp' || key === 'ArrowLeft') return Math.max(0, current - 1);
	if (key === 'Home') return 0;
	if (key === 'End') return total - 1;
	return null;
}

/* --------------------------------------------------------------- the draft */

/**
 * The read-only mirror that stands in for the draft box while a reading is on
 * screen.
 *
 * @param {object} parts { field, textarea, mirror, mirrorText, mirrorState, editButton }
 * @param {{onEdit?: Function}} options
 */
export function createDraftMirror(parts, options = {}) {
	const { textarea, mirror, mirrorText, mirrorState, editButton } = parts || {};
	if (!textarea || !mirror || !mirrorText) return null;
	const documentRef = mirror.ownerDocument || (typeof document !== 'undefined' ? document : null);
	const idle = mirrorState ? mirrorState.textContent : '';
	let shown = false;
	let text = '';

	const toPlain = (focus = false) => {
		if (!shown) return;
		shown = false;
		mirror.hidden = true;
		textarea.hidden = false;
		mirrorText.replaceChildren();
		if (mirrorState) mirrorState.textContent = idle;
		if (typeof options.onEdit === 'function') options.onEdit();
		if (focus && typeof textarea.focus === 'function') textarea.focus();
	};

	const paint = (span, level) => {
		const { before, marked, after } = draftMirrorParts(text, span);
		mirrorText.replaceChildren();
		if (before) mirrorText.append(documentRef.createTextNode(before));
		let mark = null;
		if (marked) {
			mark = documentRef.createElement('mark');
			mark.className = 'oaci-draft-mirror__mark';
			if (level) mark.dataset.level = level;
			mark.textContent = marked;
			mirrorText.append(mark);
		}
		if (after) mirrorText.append(documentRef.createTextNode(after));
		return mark;
	};

	if (editButton) editButton.addEventListener('click', () => toPlain(true));
	// A click or a keystroke in the mirrored text is a reader trying to write.
	mirrorText.addEventListener('mousedown', () => toPlain(true));
	mirrorText.addEventListener('keydown', (event) => {
		if (event.key === 'Tab' || event.key === 'Escape' || event.key.startsWith('Arrow')) return;
		if (event.metaKey || event.ctrlKey) return;
		toPlain(true);
	});

	return {
		get shown() { return shown; },
		/** Put the mirror in the box's place, holding exactly the text that was read. */
		show(draft) {
			text = typeof draft === 'string' ? draft : '';
			if (!text) return false;
			shown = true;
			textarea.hidden = true;
			mirror.hidden = false;
			paint(null, '');
			return true;
		},
		/**
		 * Tint one passage and bring it into view inside the mirror's own scroll
		 * area. Returns false when the passage could not be placed, so the caller
		 * never says a section is selected without a tint to point at.
		 */
		highlight(span, level, message) {
			if (!shown || !span) return false;
			const mark = paint(span, level);
			if (!mark) return false;
			if (mirrorState && message) mirrorState.textContent = message;
			if (typeof mark.scrollIntoView === 'function') {
				mark.scrollIntoView({ block: 'center', behavior: 'auto' });
			}
			return true;
		},
		clearHighlight() {
			if (!shown) return;
			paint(null, '');
			if (mirrorState) mirrorState.textContent = idle;
		},
		toPlain
	};
}

/* ------------------------------------------------------------ the sections */

const MOVE_GLYPH = { previous: '‹', next: '›' };

/**
 * Move every deep dive into its own score row and wire the accordion.
 *
 * The shared `mount()` has already attached its own click handler to each row
 * button; it flips `aria-expanded` and the dive's `hidden`. This runs after it,
 * so it reads the state the shared handler has just set and does the rest:
 * closes whichever other row was open, pins the row, shows the step strip, and
 * tells the caller which section is now open.
 *
 * @param {Element} root the element the result was drawn into
 * @param {object} options { sections, levelLabels, onOpen(index), onClose() }
 * @returns {{open(index): void, close(): void, destroy(): void, rows: number}|null}
 */
export function createSectionAccordion(root, options = {}) {
	if (!root || typeof root.querySelector !== 'function') return null;
	const list = root.querySelector('.oaci-strip__list');
	if (!list) return null;
	list.dataset.oaciAccordion = 'true';
	const documentRef = root.ownerDocument || (typeof document !== 'undefined' ? document : null);
	const sections = Array.isArray(options.sections) ? options.sections : [];
	const labels = options.levelLabels || {};
	const listeners = new AbortController();
	const rows = [];

	const items = [...list.children];
	items.forEach((item, position) => {
		const button = item.querySelector('[data-oaci-section-toggle]');
		if (!button) return;
		const index = Number(button.dataset.oaciSectionToggle);
		const dive = root.querySelector(`.oaci-dive[data-oaci-section="${index}"]`);
		if (!dive) return;

		const pin = documentRef.createElement('div');
		pin.className = 'oaci-dive__pin';
		pin.hidden = true;
		const previous = documentRef.createElement('button');
		previous.type = 'button';
		previous.className = 'oaci-dive__move';
		previous.dataset.oaciDiveMove = 'previous';
		previous.textContent = `${MOVE_GLYPH.previous} Previous`;
		const step = documentRef.createElement('span');
		step.className = 'oaci-dive__step';
		const section = sections[index];
		step.textContent = stepLabel(
			index,
			sections.length || items.length,
			labels[section?.level] || '',
			section?.display_score || ''
		);
		const next = documentRef.createElement('button');
		next.type = 'button';
		next.className = 'oaci-dive__move';
		next.dataset.oaciDiveMove = 'next';
		next.textContent = `Next ${MOVE_GLYPH.next}`;
		pin.append(previous, step, next);

		// Moving the dive keeps its id, so the row button's aria-controls and the
		// shared renderer's own hidden handling both keep working.
		item.append(pin, dive);
		// The row and its bar take the plugin's own class names. Every rule for
		// the accordion is written against these, so this file's stylesheet never
		// restyles the shared renderer's own classes.
		item.classList.add('oaci-dive__row');
		button.classList.add('oaci-dive__rowbar');
		item.dataset.oaciSectionRow = String(index);
		button.setAttribute('aria-expanded', 'false');
		dive.hidden = true;
		item.dataset.oaciOpen = 'false';
		rows.push({ index, position, item, button, dive, pin, previous, next });
	});

	if (!rows.length) return null;

	// The renderer's introduction to the dives belongs with the rows now that the
	// dives live in them; the empty wrapper it was in does not.
	const dives = root.querySelector('.oaci-dives');
	if (dives) {
		const intro = dives.querySelector('.oaci-dives__intro');
		const head = root.querySelector('.oaci-strip__head');
		if (intro && head) head.append(intro);
		dives.remove();
	}

	const rowFor = (index) => rows.find((row) => row.index === index) || null;
	let openIndex = null;

	const measure = (row) => {
		const height = row.button.offsetHeight || 0;
		if (height > 0) row.item.style.setProperty('--oaci-strip-bar-h', `${height}px`);
	};

	const paint = () => {
		for (const row of rows) {
			const isOpen = row.index === openIndex;
			row.item.dataset.oaciOpen = String(isOpen);
			row.pin.hidden = !isOpen;
			row.button.setAttribute('aria-expanded', String(isOpen));
			row.dive.hidden = !isOpen;
			if (isOpen) {
				measure(row);
				row.previous.disabled = row.position === 0;
				row.next.disabled = row.position === rows.length - 1;
			}
		}
	};

	const open = (index, { focus = false, notify = true } = {}) => {
		const row = rowFor(index);
		if (!row) return;
		openIndex = index;
		paint();
		if (focus && typeof row.button.focus === 'function') row.button.focus();
		if (notify && typeof options.onOpen === 'function') options.onOpen(index, sections[index] || null);
	};

	const close = ({ focus = false, notify = true } = {}) => {
		const row = openIndex === null ? null : rowFor(openIndex);
		openIndex = null;
		paint();
		if (focus && row && typeof row.button.focus === 'function') row.button.focus();
		if (notify && typeof options.onClose === 'function') options.onClose();
	};

	const step = (from, delta) => {
		const row = rowFor(from);
		if (!row) return;
		const target = rows[row.position + delta];
		if (!target) return;
		open(target.index, { focus: true });
	};

	for (const row of rows) {
		// The shared handler runs first and has already flipped aria-expanded.
		row.button.addEventListener('click', () => {
			if (row.button.getAttribute('aria-expanded') === 'true') open(row.index);
			else close();
		}, { signal: listeners.signal });
		row.previous.addEventListener('click', () => step(row.index, -1), { signal: listeners.signal });
		row.next.addEventListener('click', () => step(row.index, 1), { signal: listeners.signal });
	}

	list.addEventListener('keydown', (event) => {
		const button = event.target.closest ? event.target.closest('[data-oaci-section-toggle]') : null;
		if (!button) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			close({ focus: true });
			return;
		}
		const row = rowFor(Number(button.dataset.oaciSectionToggle));
		if (!row) return;
		const target = nextRowForKey(event.key, row.position, rows.length);
		if (target === null) return;
		event.preventDefault();
		const destination = rows[target];
		if (openIndex !== null) open(destination.index, { focus: true });
		else if (typeof destination.button.focus === 'function') destination.button.focus();
	}, { signal: listeners.signal });

	// Escape anywhere in the result clears the selection, including from inside
	// an open dive, where the reader is furthest from the row that opened it.
	root.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape' || openIndex === null) return;
		if (event.target.closest && event.target.closest('[data-oaci-share-sheet]')) return;
		event.preventDefault();
		close({ focus: true });
	}, { signal: listeners.signal });

	paint();
	return {
		get openIndex() { return openIndex; },
		rows: rows.length,
		open,
		close,
		destroy() { listeners.abort(); }
	};
}
