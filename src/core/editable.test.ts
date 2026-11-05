import { afterEach, describe, expect, it } from 'vitest';

import { deepActiveElement, isEditable, type ShadowRootOf } from './editable';

const openRoots: ShadowRootOf = (host) => host.shadowRoot;

function add<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  parent: Node = document.body,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  parent.appendChild(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
  Reflect.deleteProperty(document, 'designMode');
});

describe('isEditable', () => {
  it.each([
    'text',
    'search',
    'email',
    'url',
    'tel',
    'password',
    'number',
    'date',
    'datetime-local',
    'month',
    'week',
    'time',
    'FOO',
  ])('treats an input of type %s as editable', (type) => {
    expect(isEditable(add('input', { type }))).toBe(true);
  });

  it('treats an input with no type as editable', () => {
    expect(isEditable(add('input'))).toBe(true);
  });

  it.each([
    'checkbox',
    'radio',
    'button',
    'range',
    'color',
    'file',
    'submit',
    'reset',
    'image',
    'hidden',
    'CHECKBOX',
  ])("treats an input of type %s, which doesn't take text, as not editable", (type) => {
    expect(isEditable(add('input', { type }))).toBe(false);
  });

  it('treats textarea and select as editable', () => {
    expect(isEditable(add('textarea'))).toBe(true);
    expect(isEditable(add('select'))).toBe(true);
  });

  it('treats a disabled field as not editable, and a readonly one as editable', () => {
    expect(isEditable(add('input', { disabled: '' }))).toBe(false);
    expect(isEditable(add('textarea', { disabled: '' }))).toBe(false);
    expect(isEditable(add('select', { disabled: '' }))).toBe(false);
    expect(isEditable(add('input', {}, add('fieldset', { disabled: '' })))).toBe(false);
    expect(isEditable(add('input', { readonly: '' }))).toBe(true);
  });

  it.each(['', 'true', 'plaintext-only'])(
    'treats contenteditable="%s" and its descendants as editable',
    (value) => {
      const editor = add('div', { contenteditable: value });

      expect(isEditable(editor)).toBe(true);
      expect(isEditable(add('span', {}, editor))).toBe(true);
    },
  );

  it('treats contenteditable="false" as not editable', () => {
    const outer = add('div', { contenteditable: '' });
    const off = add('div', { contenteditable: 'false' }, outer);

    expect(isEditable(add('div', { contenteditable: 'false' }))).toBe(false);
    expect(isEditable(add('div', { contenteditable: 'FALSE' }))).toBe(false);
    expect(isEditable(add('span', {}, off))).toBe(false);
  });

  it('treats any element as editable when designMode is on', () => {
    Object.defineProperty(document, 'designMode', { value: 'on', configurable: true });

    expect(isEditable(add('div'))).toBe(true);
    expect(isEditable(document.body)).toBe(true);
  });

  it('returns false for null and plain elements', () => {
    expect(isEditable(null)).toBe(false);
    expect(isEditable(add('div'))).toBe(false);
    expect(isEditable(document.body)).toBe(false);
    expect(isEditable(add('button'))).toBe(false);
  });
});

describe('deepActiveElement', () => {
  it("returns the document's active element when it has no shadow root", () => {
    expect(deepActiveElement(document, openRoots)).toBe(document.body);

    const input = add('input');
    input.focus();

    expect(deepActiveElement(document, openRoots)).toBe(input);
  });

  it('follows the active element into an open shadow root', () => {
    const root = add('div').attachShadow({ mode: 'open' });
    const input = add('input', {}, root);
    input.focus();

    expect(deepActiveElement(document, openRoots)).toBe(input);
  });

  it('follows the active element into a closed shadow root', () => {
    const host = add('div');
    const root = host.attachShadow({ mode: 'closed' });
    const closedRoots = new Map<Element, ShadowRoot>([[host, root]]);
    const lookup: ShadowRootOf = (element) => closedRoots.get(element) ?? null;
    const input = add('input', {}, root);
    input.focus();

    expect(deepActiveElement(document, lookup)).toBe(input);
    expect(deepActiveElement(document, openRoots)).toBe(host);
  });

  it('follows nested shadow roots', () => {
    const outer = add('div').attachShadow({ mode: 'open' });
    const innerHost = add('div', {}, outer);
    const inner = innerHost.attachShadow({ mode: 'closed' });
    const closedRoots = new Map<Element, ShadowRoot>([[innerHost, inner]]);
    const lookup: ShadowRootOf = (element) =>
      element.shadowRoot ?? closedRoots.get(element) ?? null;
    const input = add('input', {}, inner);
    input.focus();

    expect(deepActiveElement(document, lookup)).toBe(input);
  });

  it('returns null when the document has no active element', () => {
    const empty = document.implementation.createDocument(null, null);

    expect(deepActiveElement(empty, openRoots)).toBeNull();
  });

  it('finds a field focused inside a closed shadow root as editable', () => {
    const host = add('div');
    const root = host.attachShadow({ mode: 'closed' });
    const closedRoots = new Map<Element, ShadowRoot>([[host, root]]);
    const lookup: ShadowRootOf = (element) => closedRoots.get(element) ?? null;
    add('input', {}, root).focus();

    expect(isEditable(deepActiveElement(document, lookup))).toBe(true);
  });
});
