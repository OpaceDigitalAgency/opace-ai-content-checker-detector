/**
 * The smallest DOM that will hold the accordion and the page tint.
 *
 * `packages/astro` ships no test browser, and the public candidate is packed
 * from a staging tree whose `npm ci` installs only this package's own
 * dependencies — so a real DOM cannot be borrowed from the repository root and
 * must not be added as a dependency just to run two tests. What is here is
 * therefore hand-written, and deliberately small: the exact surface
 * `src/sections.ts` and `src/highlight.ts` are allowed to touch, and nothing
 * else. If either module reaches for something a browser has and this does not,
 * the test fails rather than passing on a fiction.
 *
 * It is not a browser. Layout, styling, focus rings and scrolling are not
 * modelled — those are proved in Chromium by the evidence harness. What is
 * modelled is the tree: nodes, text, attributes, class and attribute selectors,
 * and click listeners.
 */

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

class FakeNode {
  constructor(doc) {
    this.ownerDocument = doc;
    this.childNodes = [];
    this.parentNode = null;
  }

  get nextSibling() {
    const siblings = this.parentNode?.childNodes;
    if (!siblings) return null;
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }

  appendChild(node) {
    node.parentNode?.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  insertBefore(node, reference) {
    node.parentNode?.removeChild(node);
    node.parentNode = this;
    const at = reference ? this.childNodes.indexOf(reference) : -1;
    if (at === -1) this.childNodes.push(node);
    else this.childNodes.splice(at, 0, node);
    return node;
  }

  removeChild(node) {
    const at = this.childNodes.indexOf(node);
    if (at !== -1) this.childNodes.splice(at, 1);
    node.parentNode = null;
    return node;
  }

  replaceChild(next, previous) {
    const at = this.childNodes.indexOf(previous);
    if (at === -1) throw new Error('replaceChild: node is not a child');
    next.parentNode?.removeChild(next);
    next.parentNode = this;
    this.childNodes.splice(at, 1, next);
    previous.parentNode = null;
    return previous;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }

  /** Adjacent text nodes merge, exactly as a browser's own normalize does. */
  normalize() {
    for (let index = this.childNodes.length - 1; index > 0; index -= 1) {
      const node = this.childNodes[index];
      const before = this.childNodes[index - 1];
      if (node.nodeType === TEXT_NODE && before.nodeType === TEXT_NODE) {
        before.nodeValue += node.nodeValue;
        this.removeChild(node);
      }
    }
    for (const child of this.childNodes) if (child.nodeType === ELEMENT_NODE) child.normalize();
  }

  get textContent() {
    if (this.nodeType === TEXT_NODE) return this.nodeValue;
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    for (const child of this.childNodes.splice(0)) child.parentNode = null;
    if (value !== '') this.appendChild(this.ownerDocument.createTextNode(String(value)));
  }
}

class FakeText extends FakeNode {
  constructor(doc, value) {
    super(doc);
    this.nodeType = TEXT_NODE;
    this.nodeValue = value;
  }
}

/** One token only: `.class`, `#id`, `[attribute]`, `[attribute=value]` or `tag`. */
function matches(element, selector) {
  const token = selector.trim();
  if (/\s/u.test(token)) throw new Error(`the fake DOM takes one selector token, not "${selector}"`);
  if (token.startsWith('#')) return element.getAttribute('id') === token.slice(1);
  if (token.startsWith('.')) return element.classList.has(token.slice(1));
  if (token.startsWith('[')) {
    const [name, value] = token.slice(1, -1).split('=');
    if (value === undefined) return element.hasAttribute(name);
    return element.getAttribute(name) === value.replace(/^["']|["']$/gu, '');
  }
  return element.tagName === token.toUpperCase();
}

class FakeElement extends FakeNode {
  constructor(doc, tag) {
    super(doc);
    this.nodeType = ELEMENT_NODE;
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = { properties: new Map(), setProperty(name, value) { this.properties.set(name, value); }, getPropertyValue(name) { return this.properties.get(name) ?? ''; } };
    this.disabled = false;
    this.focused = false;
  }

  get classList() { return new Set(String(this.getAttribute('class') ?? '').split(/\s+/u).filter(Boolean)); }
  get className() { return String(this.getAttribute('class') ?? ''); }

  get hidden() { return this.hasAttribute('hidden'); }
  set hidden(value) { if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }

  get isContentEditable() {
    const value = this.getAttribute('contenteditable');
    return value !== null && value !== 'false';
  }

  hasAttribute(name) { return this.attributes.has(name); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  toggleAttribute(name, force) {
    const on = force === undefined ? !this.hasAttribute(name) : Boolean(force);
    if (on) this.setAttribute(name, '');
    else this.removeAttribute(name);
    return on;
  }

  set innerHTML(value) {
    if (value !== '') throw new Error('the fake DOM parses no HTML: build nodes instead');
    for (const child of this.childNodes.splice(0)) child.parentNode = null;
  }

  * walk() {
    for (const child of this.childNodes) {
      if (child.nodeType !== ELEMENT_NODE) continue;
      yield child;
      yield* child.walk();
    }
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  querySelectorAll(selector) { return [...this.walk()].filter((node) => matches(node, selector)); }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  removeEventListener(type, handler) {
    const all = this.listeners.get(type) ?? [];
    const at = all.indexOf(handler);
    if (at !== -1) all.splice(at, 1);
  }

  click() { for (const handler of [...(this.listeners.get('click') ?? [])]) handler({ target: this }); }
  focus() { this.ownerDocument.activeElement = this; this.focused = true; }
}

class FakeDocument {
  constructor() {
    this.head = new FakeElement(this, 'head');
    this.body = new FakeElement(this, 'body');
    this.activeElement = null;
  }

  createElement(tag) { return new FakeElement(this, tag); }
  createTextNode(value) { return new FakeText(this, value); }
}

export function createDocument() { return new FakeDocument(); }

/**
 * Build a subtree from a tiny literal: a string is a text node, an array is
 * `[tag, attributes, ...children]`. Keeps the test fixtures readable.
 */
export function build(doc, spec) {
  if (typeof spec === 'string') return doc.createTextNode(spec);
  const [tag, attributes, ...children] = spec;
  const element = doc.createElement(tag);
  for (const [name, value] of Object.entries(attributes ?? {})) element.setAttribute(name, value);
  for (const child of children) element.appendChild(build(doc, child));
  return element;
}

/** The concatenated text of a subtree, which the tint must never change. */
export const textOf = (node) => node.textContent;
