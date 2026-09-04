/**
 * Just enough of a DOM to drive `shared/highlight-dom.mjs` without a browser.
 *
 * It is deliberately small and dumb: text nodes carry `data` and can split,
 * elements carry children and attributes, and nothing else exists. If the
 * highlighter needs something this does not have, that is worth knowing.
 */

let sequence = 0;

class FakeNode {
  constructor(nodeType, nodeName) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.parentNode = null;
    this.childNodes = [];
    this.id = (sequence += 1);
  }

  get textContent() {
    if (this.nodeType === 3) return this.data;
    return this.childNodes.map((child) => child.textContent).join('');
  }

  appendChild(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  insertBefore(node, reference) {
    if (node.parentNode) node.parentNode.removeChild(node);
    const at = this.childNodes.indexOf(reference);
    node.parentNode = this;
    this.childNodes.splice(at === -1 ? this.childNodes.length : at, 0, node);
    return node;
  }

  removeChild(node) {
    const at = this.childNodes.indexOf(node);
    if (at !== -1) this.childNodes.splice(at, 1);
    node.parentNode = null;
    return node;
  }

  replaceChild(next, current) {
    const at = this.childNodes.indexOf(current);
    if (at === -1) throw new Error('replaceChild: not a child');
    if (next.parentNode) next.parentNode.removeChild(next);
    this.childNodes[at] = next;
    next.parentNode = this;
    current.parentNode = null;
    return current;
  }
}

class FakeText extends FakeNode {
  constructor(data) {
    super(3, '#text');
    this.data = data;
  }

  splitText(offset) {
    const tail = new FakeText(this.data.slice(offset));
    this.data = this.data.slice(0, offset);
    if (this.parentNode) {
      const at = this.parentNode.childNodes.indexOf(this);
      tail.parentNode = this.parentNode;
      this.parentNode.childNodes.splice(at + 1, 0, tail);
    }
    return tail;
  }
}

class FakeElement extends FakeNode {
  constructor(tag) {
    super(1, String(tag).toUpperCase());
    this.attributes = new Map();
    this.scrolled = 0;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  scrollIntoView() {
    this.scrolled += 1;
  }
}

export const fakeDocument = {
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (data) => new FakeText(data),
};

/**
 * Build a tree from a nested description: a string becomes a text node, and
 * `['p', child, child]` becomes an element.
 */
export function build(description) {
  if (typeof description === 'string') return new FakeText(description);
  const [tag, ...children] = description;
  const element = new FakeElement(tag);
  for (const child of children) element.appendChild(build(child));
  return element;
}

export { FakeElement, FakeText };
