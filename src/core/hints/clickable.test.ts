import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  isClickable,
  isCopyableUrl,
  isDisabled,
  isOpenableUrl,
  isTextInput,
  linkUrl,
} from './clickable';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

function add(
  tag: string,
  attributes: Record<string, string> = {},
  parent: Node = document.body,
): Element {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  parent.appendChild(element);
  return element;
}

function addNs(
  namespace: string,
  tag: string,
  attributes: Record<string, string> = {},
  parent: Node = document.body,
): Element {
  const element = document.createElementNS(namespace, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  parent.appendChild(element);
  return element;
}

type Build = () => Element;

describe('isClickable', () => {
  beforeEach(() => {
    document.head
      .appendChild(document.createElement('base'))
      .setAttribute('href', 'https://x.test/dir/page');
  });

  afterEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  const clickable: readonly (readonly [string, Build])[] = [
    ['a with href', () => add('a', { href: '/x' })],
    ['svg a with href', () => addNs(SVG_NS, 'a', { href: '/x' })],
    ['button', () => add('button')],
    ['input without type', () => add('input')],
    ['checkbox input', () => add('input', { type: 'checkbox' })],
    ['textarea', () => add('textarea')],
    ['select', () => add('select')],
    ['summary', () => add('summary')],
    ['div role=button', () => add('div', { role: 'button' })],
    ['div role=link', () => add('div', { role: 'link' })],
    ['div role=checkbox', () => add('div', { role: 'checkbox' })],
    ['div role=radio', () => add('div', { role: 'radio' })],
    ['div role=tab', () => add('div', { role: 'tab' })],
    ['div role=menuitem', () => add('div', { role: 'menuitem' })],
    ['div role=option', () => add('div', { role: 'option' })],
    ['div role=switch', () => add('div', { role: 'switch' })],
    ['div with onclick', () => add('div', { onclick: 'x' })],
    ['div tabindex=0', () => add('div', { tabindex: '0' })],
    ['span tabindex=3', () => add('span', { tabindex: '3' })],
    ['button tabindex=-1', () => add('button', { tabindex: '-1' })],
    ['contenteditable host', () => add('div', { contenteditable: '' })],
    ['contenteditable=true host', () => add('div', { contenteditable: 'true' })],
    ['plaintext-only host', () => add('div', { contenteditable: 'plaintext-only' })],
    [
      'link inside an editor',
      () => {
        const host = add('div', { contenteditable: 'true' });
        return add('a', { href: '/x' }, host);
      },
    ],
    [
      'label wrapping an input',
      () => {
        const label = add('label');
        add('input', { type: 'checkbox' }, label);
        return label;
      },
    ],
    [
      'label for an input elsewhere',
      () => {
        add('input', { id: 'x', type: 'checkbox' });
        return add('label', { for: 'x' });
      },
    ],
    ['label with onclick and no control', () => add('label', { onclick: 'x' })],
  ];

  it.each(clickable)('is true for %s', (_name, build) => {
    expect(isClickable(build())).toBe(true);
  });

  const notClickable: readonly (readonly [string, Build])[] = [
    ['a without href', () => add('a')],
    ['MathML a with href', () => addNs(MATHML_NS, 'a', { href: '/x' })],
    ['plain div', () => add('div')],
    ['plain span', () => add('span')],
    ['hidden input', () => add('input', { type: 'hidden' })],
    ['HIDDEN input', () => add('input', { type: 'HIDDEN' })],
    ['disabled button', () => add('button', { disabled: '' })],
    ['disabled input', () => add('input', { disabled: '' })],
    [
      'input inside a disabled fieldset',
      () => {
        const fieldset = add('fieldset', { disabled: '' });
        return add('input', {}, fieldset);
      },
    ],
    ['button aria-disabled=true', () => add('button', { 'aria-disabled': 'true' })],
    [
      'link inside inert',
      () => {
        const inert = add('div', { inert: '' });
        return add('a', { href: '/x' }, inert);
      },
    ],
    ['div tabindex=-1', () => add('div', { tabindex: '-1' })],
    ['div tabindex=abc', () => add('div', { tabindex: 'abc' })],
    ['div tabindex empty', () => add('div', { tabindex: '' })],
    ['label with text only', () => add('label')],
    ['label for a missing id', () => add('label', { for: 'missing' })],
    [
      'label wrapping a disabled input',
      () => {
        const label = add('label');
        add('input', { disabled: '' }, label);
        return label;
      },
    ],
    ['iframe', () => add('iframe')],
    ['iframe with tabindex=0', () => add('iframe', { tabindex: '0' })],
    ['contenteditable=false', () => add('div', { contenteditable: 'false' })],
    ['contenteditable=FALSE', () => add('div', { contenteditable: 'FALSE' })],
    [
      'p inside an editor',
      () => {
        const host = add('div', { contenteditable: 'true' });
        return add('p', {}, host);
      },
    ],
    [
      'nested contenteditable inside an editor',
      () => {
        const host = add('div', { contenteditable: 'true' });
        return add('span', { contenteditable: 'true' }, host);
      },
    ],
  ];

  it.each(notClickable)('is false for %s', (_name, build) => {
    expect(isClickable(build())).toBe(false);
  });
});

describe('isDisabled', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it.each<readonly [string, Build, boolean]>([
    ['disabled button', () => add('button', { disabled: '' }), true],
    [
      'input in a disabled fieldset',
      () => {
        const fieldset = add('fieldset', { disabled: '' });
        return add('input', {}, fieldset);
      },
      true,
    ],
    ['aria-disabled div', () => add('div', { 'aria-disabled': 'true' }), true],
    [
      'span inside inert',
      () => {
        const inert = add('div', { inert: '' });
        return add('span', {}, inert);
      },
      true,
    ],
    ['plain button', () => add('button'), false],
    ['aria-disabled=false div', () => add('div', { 'aria-disabled': 'false' }), false],
    ['link', () => add('a', { href: '/x' }), false],
  ])('%s is disabled: %s', (_name, build, expected) => {
    expect(isDisabled(build())).toBe(expected);
  });
});

describe('isTextInput', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const textInputs: readonly (readonly [string, Build])[] = [
    ['input without type', () => add('input')],
    ['input type=text', () => add('input', { type: 'text' })],
    ['input type=search', () => add('input', { type: 'search' })],
    ['input type=email', () => add('input', { type: 'email' })],
    ['input type=url', () => add('input', { type: 'url' })],
    ['input type=tel', () => add('input', { type: 'tel' })],
    ['input type=password', () => add('input', { type: 'password' })],
    ['input type=number', () => add('input', { type: 'number' })],
    ['input type=date', () => add('input', { type: 'date' })],
    ['input with an unknown type', () => add('input', { type: 'FOO' })],
    ['textarea', () => add('textarea')],
    ['contenteditable host', () => add('div', { contenteditable: '' })],
    [
      'editable host in an open shadow root',
      () => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = host.attachShadow({ mode: 'open' });
        const editor = document.createElement('div');
        editor.setAttribute('contenteditable', 'true');
        root.appendChild(editor);
        return editor;
      },
    ],
    [
      'editable island inside a non-editable block',
      () => {
        const editor = add('div', { contenteditable: 'true' });
        const block = add('div', { contenteditable: 'false' }, editor);
        return add('span', { contenteditable: 'true' }, block);
      },
    ],
  ];

  it.each(textInputs)('is true for %s', (_name, build) => {
    expect(isTextInput(build())).toBe(true);
  });

  const notTextInputs: readonly (readonly [string, Build])[] = [
    ['checkbox', () => add('input', { type: 'checkbox' })],
    ['radio', () => add('input', { type: 'radio' })],
    ['button input', () => add('input', { type: 'button' })],
    ['submit input', () => add('input', { type: 'submit' })],
    ['hidden input', () => add('input', { type: 'hidden' })],
    ['select', () => add('select')],
    ['div', () => add('div')],
    [
      'p inside an editor',
      () => {
        const host = add('div', { contenteditable: 'true' });
        return add('p', {}, host);
      },
    ],
    [
      'nested editable inside an editor',
      () => {
        const host = add('div', { contenteditable: 'true' });
        return add('span', { contenteditable: 'true' }, host);
      },
    ],
    ['disabled input', () => add('input', { disabled: '' })],
    ['disabled textarea', () => add('textarea', { disabled: '' })],
    [
      'aria-disabled editor host',
      () => add('div', { contenteditable: '', 'aria-disabled': 'true' }),
    ],
    ['contenteditable=false', () => add('div', { contenteditable: 'false' })],
  ];

  it.each(notTextInputs)('is false for %s', (_name, build) => {
    expect(isTextInput(build())).toBe(false);
  });
});

describe('linkUrl', () => {
  beforeEach(() => {
    document.head
      .appendChild(document.createElement('base'))
      .setAttribute('href', 'https://x.test/dir/page');
  });

  afterEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it.each<readonly [string, Build, string | undefined]>([
    ['relative href', () => add('a', { href: 'other?q=1' }), 'https://x.test/dir/other?q=1'],
    ['absolute href', () => add('a', { href: 'https://y.test/a' }), 'https://y.test/a'],
    ['empty href', () => add('a', { href: '' }), 'https://x.test/dir/page'],
    ['mailto href', () => add('a', { href: 'mailto:a@b.test' }), 'mailto:a@b.test'],
    ['svg link', () => addNs(SVG_NS, 'a', { href: '/svg' }), 'https://x.test/svg'],
    ['MathML link', () => addNs(MATHML_NS, 'a', { href: '/m' }), undefined],
    ['a without href', () => add('a'), undefined],
    ['button', () => add('button'), undefined],
    ['unparseable href', () => add('a', { href: 'https://[' }), undefined],
  ])('%s', (_name, build, expected) => {
    expect(linkUrl(build())?.href).toBe(expected);
  });
});

describe('isCopyableUrl', () => {
  it.each([
    ['http://x.test/', true],
    ['https://x.test/', true],
    ['mailto:a@b.test', true],
    ['file:///tmp/a', true],
    ['javascript:void(0)', false],
    ['data:text/plain,x', false],
    ['ftp://x.test/', false],
    ['about:blank', false],
    ['chrome://settings', false],
  ])('%s copyable: %s', (href, expected) => {
    expect(isCopyableUrl(new URL(href))).toBe(expected);
  });
});

describe('isOpenableUrl', () => {
  it.each([
    ['http://x.test/', true],
    ['https://x.test/', true],
    ['mailto:a@b.test', false],
    ['file:///tmp/a', false],
    ['javascript:void(0)', false],
  ])('%s openable: %s', (href, expected) => {
    expect(isOpenableUrl(new URL(href))).toBe(expected);
  });
});
