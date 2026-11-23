import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ShadowRootOf } from '../editable';

import {
  composedContains,
  createFinder,
  type Finder,
  type HintTarget,
  type TargetFilter,
} from './finder';
import type { Geometry, Rect } from './geometry';

const VIEWPORT: Rect = { left: 0, top: 0, width: 800, height: 600 };

const boxes = new Map<Element, readonly Rect[]>();
const notRendered = new Set<Element>();
const closedRoots = new Map<Element, ShadowRoot>();

const shadowRootOf: ShadowRootOf = (host) => closedRoots.get(host) ?? host.shadowRoot;

/** The element placed last whose box holds the point, so later elements cover earlier ones. */
function topmostAt(x: number, y: number): Element | null {
  let hit: Element | null = null;
  for (const [element, rects] of boxes) {
    const covers = rects.some(
      (rect) =>
        x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height,
    );
    if (covers) {
      hit = element;
    }
  }
  return hit;
}

const rects = vi.fn<Geometry['rects']>();
const isRendered = vi.fn<Geometry['isRendered']>();
const hitTest = vi.fn<Geometry['hitTest']>();

const finder: Finder = createFinder({
  document,
  shadowRootOf,
  geometry: {
    viewport: () => VIEWPORT,
    rects: (element) => rects(element),
    isRendered: (element) => isRendered(element),
    hitTest: (x, y) => hitTest(x, y),
  },
});

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

function place(element: Element, ...list: Rect[]): void {
  boxes.set(element, list);
}

/** A box in its own row, so placed elements don't overlap unless a test says so. */
function row(n: number): Rect {
  return { left: 10, top: 10 + 30 * n, width: 100, height: 20 };
}

function elementsOf(targets: readonly HintTarget[]): Element[] {
  return targets.map((target) => target.element);
}

beforeEach(() => {
  rects.mockReset();
  isRendered.mockReset();
  hitTest.mockReset();
  rects.mockImplementation((element) => boxes.get(element) ?? []);
  isRendered.mockImplementation((element) => !notRendered.has(element));
  hitTest.mockImplementation(topmostAt);
});

afterEach(() => {
  document.body.replaceChildren();
  boxes.clear();
  notRendered.clear();
  closedRoots.clear();
});

describe('finder: clickable targets', () => {
  it('finds visible clickable elements in document order', () => {
    const link = add('a', { href: '/x' });
    const button = add('button');
    const input = add('input');
    place(link, row(0));
    place(button, row(1));
    place(input, row(2));
    const targets = finder.find('clickable');
    expect(elementsOf(targets)).toStrictEqual([link, button, input]);
    expect(targets.map((target) => target.rect)).toStrictEqual([row(0), row(1), row(2)]);
  });

  it('skips elements that are not clickable before checking layout', () => {
    const div = add('div');
    const link = add('a');
    place(div, row(0));
    place(link, row(1));
    expect(finder.find('clickable')).toStrictEqual([]);
    expect(isRendered).not.toHaveBeenCalled();
  });

  it('drops elements that are not rendered', () => {
    const link = add('a', { href: '/x' });
    place(link, row(0));
    notRendered.add(link);
    expect(finder.find('clickable')).toStrictEqual([]);
    expect(rects).not.toHaveBeenCalledWith(link);
  });

  it.each([
    ['zero width', { left: 10, top: 10, width: 0, height: 20 }],
    ['zero height', { left: 10, top: 10, width: 100, height: 0 }],
  ])('drops elements with %s', (_name, box) => {
    place(add('a', { href: '/x' }), box);
    expect(finder.find('clickable')).toStrictEqual([]);
  });

  it('drops elements without a box', () => {
    add('a', { href: '/x' });
    expect(finder.find('clickable')).toStrictEqual([]);
  });

  it.each([
    ['below the viewport', { left: 10, top: 600, width: 50, height: 20 }],
    ['right of the viewport', { left: 800, top: 10, width: 50, height: 20 }],
    ['left of the viewport', { left: -60, top: 10, width: 50, height: 20 }],
    ['above the viewport', { left: 10, top: -30, width: 50, height: 20 }],
  ])('drops an element %s without a hit test', (_name, box) => {
    place(add('a', { href: '/x' }), box);
    expect(finder.find('clickable')).toStrictEqual([]);
    expect(hitTest).not.toHaveBeenCalled();
  });

  it('clips a rect that crosses the viewport edge', () => {
    const link = add('a', { href: '/x' });
    place(link, { left: -10, top: 590, width: 50, height: 30 });
    expect(finder.find('clickable')).toStrictEqual([
      { element: link, rect: { left: 0, top: 590, width: 40, height: 10 } },
    ]);
  });

  it('uses the first rect inside the viewport for a wrapped link', () => {
    const link = add('a', { href: '/x' });
    const third = { left: 10, top: 50, width: 80, height: 20 };
    place(
      link,
      { left: 10, top: -40, width: 80, height: 20 },
      { left: 10, top: 10, width: 0, height: 20 },
      third,
    );
    expect(finder.find('clickable')).toStrictEqual([{ element: link, rect: third }]);
  });

  it('drops an element covered at both points', () => {
    const link = add('a', { href: '/x' });
    const cover = add('div');
    place(link, row(0));
    place(cover, row(0));
    expect(finder.find('clickable')).toStrictEqual([]);
  });

  it('drops an element when the hit test finds nothing', () => {
    place(add('a', { href: '/x' }), row(0));
    hitTest.mockReturnValue(null);
    expect(finder.find('clickable')).toStrictEqual([]);
  });

  it('keeps an element whose centre is covered but whose corner is not', () => {
    const link = add('a', { href: '/x' });
    const cover = add('div');
    place(link, row(0));
    place(cover, row(0));
    hitTest.mockReturnValueOnce(cover).mockReturnValueOnce(link);
    expect(elementsOf(finder.find('clickable'))).toStrictEqual([link]);
    expect(hitTest.mock.calls).toStrictEqual([
      [60, 20],
      [12, 12],
    ]);
  });

  it('keeps an element when the hit is its descendant', () => {
    const link = add('a', { href: '/x' });
    const span = add('span', {}, link);
    place(link, row(0));
    hitTest.mockReturnValue(span);
    expect(elementsOf(finder.find('clickable'))).toStrictEqual([link]);
  });

  it('keeps an element when the hit is inside its shadow root', () => {
    const host = add('div', { tabindex: '0' });
    const span = document.createElement('span');
    host.attachShadow({ mode: 'open' }).appendChild(span);
    place(host, row(0));
    hitTest.mockReturnValue(span);
    expect(elementsOf(finder.find('clickable'))).toStrictEqual([host]);
  });

  it.each(['open', 'closed'] as const)(
    'keeps shadow content in document order with a %s root',
    (mode) => {
      const before = add('a', { href: '/before' });
      const host = add('div');
      const root = host.attachShadow({ mode });
      if (mode === 'closed') {
        closedRoots.set(host, root);
      }
      const button = document.createElement('button');
      root.appendChild(button);
      const after = add('a', { href: '/after' });
      place(before, row(0));
      place(button, row(1));
      place(after, row(2));
      expect(elementsOf(finder.find('clickable'))).toStrictEqual([before, button, after]);
    },
  );

  it('walks nested shadow roots', () => {
    const outer = add('div');
    const outerRoot = outer.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    outerRoot.appendChild(inner);
    const innerRoot = inner.attachShadow({ mode: 'open' });
    const button = document.createElement('button');
    innerRoot.appendChild(button);
    place(button, row(0));
    expect(elementsOf(finder.find('clickable'))).toStrictEqual([button]);
  });

  it.each(['iframe', 'iframe with tabindex'])('never hints an %s', (kind) => {
    const attributes = kind.includes('tabindex') ? { tabindex: '0' } : {};
    place(add('iframe', attributes), row(0));
    expect(finder.find('clickable')).toStrictEqual([]);
  });
});

describe('finder: labels around controls', () => {
  it('gives one hint to a label around its control', () => {
    const label = add('label');
    const checkbox = add('input', { type: 'checkbox' }, label);
    place(label, row(0));
    place(checkbox, row(1));
    expect(elementsOf(finder.find('clickable'))).toStrictEqual([checkbox]);
  });

  it('keeps the label when its control is hidden', () => {
    const label = add('label');
    const checkbox = add('input', { type: 'checkbox' }, label);
    place(label, row(0));
    place(checkbox, row(1));
    notRendered.add(checkbox);
    expect(elementsOf(finder.find('clickable'))).toStrictEqual([label]);
  });

  it('keeps the label when it holds another clickable element', () => {
    const label = add('label');
    const checkbox = add('input', { type: 'checkbox' }, label);
    const link = add('a', { href: '/terms' }, label);
    place(label, row(0));
    place(checkbox, row(1));
    place(link, row(2));
    expect(elementsOf(finder.find('clickable'))).toStrictEqual([label, checkbox, link]);
  });

  it('ignores non-clickable content inside the label', () => {
    const label = add('label');
    add('span', {}, label);
    const checkbox = add('input', { type: 'checkbox' }, label);
    place(label, row(0));
    place(checkbox, row(1));
    expect(elementsOf(finder.find('clickable'))).toStrictEqual([checkbox]);
  });

  it('keeps a label whose control is outside it', () => {
    const label = add('label', { for: 'x' });
    const input = add('input', { id: 'x' });
    place(label, row(0));
    place(input, row(1));
    expect(elementsOf(finder.find('clickable'))).toStrictEqual([label, input]);
  });
});

describe('finder: copyable links and text inputs', () => {
  it('filters copyable links', () => {
    const https = add('a', { href: 'https://x.test/a' });
    const mailto = add('a', { href: 'mailto:a@b.test' });
    const file = add('a', { href: 'file:///tmp/a' });
    const javascript = add('a', { href: 'javascript:void(0)' });
    const inert = add('div', { inert: '' });
    const inertLink = add('a', { href: 'https://x.test/inert' }, inert);
    const button = add('button');
    [https, mailto, file, javascript, inertLink, button].forEach((element, index) => {
      place(element, row(index));
    });
    expect(elementsOf(finder.find('copyableLink'))).toStrictEqual([https, mailto, file]);
  });

  it('filters text inputs', () => {
    const input = add('input', { type: 'text' });
    const checkbox = add('input', { type: 'checkbox' });
    const textarea = add('textarea');
    const host = add('div', { contenteditable: '' });
    const paragraph = add('p', {}, host);
    const disabled = add('input', { disabled: '' });
    const button = add('button');
    [input, checkbox, textarea, host, paragraph, disabled, button].forEach((element, index) => {
      place(element, row(index));
    });
    expect(elementsOf(finder.find('textInput'))).toStrictEqual([input, textarea, host]);
  });

  it('finds nothing on an empty page', () => {
    const filters: readonly TargetFilter[] = ['clickable', 'copyableLink', 'textInput'];
    for (const filter of filters) {
      expect(finder.find(filter)).toStrictEqual([]);
    }
  });
});

describe('composedContains', () => {
  it.each<readonly [string, () => readonly [Node, Node], boolean]>([
    [
      'an element and itself',
      () => {
        const element = add('div');
        return [element, element];
      },
      true,
    ],
    [
      'a parent and its child',
      () => {
        const parent = add('div');
        return [parent, add('span', {}, parent)];
      },
      true,
    ],
    [
      'a child and its parent',
      () => {
        const parent = add('div');
        return [add('span', {}, parent), parent];
      },
      false,
    ],
    [
      'two siblings',
      () => {
        add('div');
        const sibling = add('div');
        return [sibling, add('span')];
      },
      false,
    ],
    [
      'a host and an element in its open root',
      () => {
        const host = add('div');
        const span = document.createElement('span');
        host.attachShadow({ mode: 'open' }).appendChild(span);
        return [host, span];
      },
      true,
    ],
    [
      'a host and an element in its closed root',
      () => {
        const host = add('div');
        const span = document.createElement('span');
        host.attachShadow({ mode: 'closed' }).appendChild(span);
        return [host, span];
      },
      true,
    ],
    [
      'a host and an element in another host’s root',
      () => {
        const host = add('div');
        const other = add('div');
        const span = document.createElement('span');
        other.attachShadow({ mode: 'open' }).appendChild(span);
        return [host, span];
      },
      false,
    ],
    ['the document and an element in it', () => [document, add('div')], true],
  ])('is %s: %s', (_name, build, expected) => {
    const [ancestor, node] = build();
    expect(composedContains(ancestor, node)).toBe(expected);
  });
});
