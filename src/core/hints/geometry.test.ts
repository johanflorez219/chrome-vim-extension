import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ShadowRootOf } from '../editable';

import { createDomGeometry, type Geometry, type Rect } from './geometry';

const closedRoots = new Map<Element, ShadowRoot>();
const shadowRootOf: ShadowRootOf = (host) => closedRoots.get(host) ?? host.shadowRoot;
const geometry: Geometry = createDomGeometry(window, shadowRootOf);

function add(tag: string): Element {
  const element = document.createElement(tag);
  document.body.appendChild(element);
  return element;
}

function stub(target: object, name: string, value: unknown): void {
  Object.defineProperty(target, name, { configurable: true, value });
}

let viewWidth = 0;
let viewHeight = 0;
let savedWidth: PropertyDescriptor | undefined;
let savedHeight: PropertyDescriptor | undefined;

function stubViewport(width: number, height: number): void {
  viewWidth = width;
  viewHeight = height;
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    get: () => viewWidth,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    get: () => viewHeight,
  });
}

function restore(name: 'innerWidth' | 'innerHeight', saved: PropertyDescriptor | undefined): void {
  if (saved === undefined) {
    Reflect.deleteProperty(window, name);
  } else {
    Object.defineProperty(window, name, saved);
  }
}

beforeAll(() => {
  savedWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  savedHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
});

afterEach(() => {
  restore('innerWidth', savedWidth);
  restore('innerHeight', savedHeight);
  Reflect.deleteProperty(document, 'elementFromPoint');
  document.body.replaceChildren();
  closedRoots.clear();
});

describe('viewport', () => {
  it('reads the layout viewport on every call', () => {
    stubViewport(800, 600);
    expect(geometry.viewport()).toStrictEqual({ left: 0, top: 0, width: 800, height: 600 });
    stubViewport(400, 300);
    expect(geometry.viewport()).toStrictEqual({ left: 0, top: 0, width: 400, height: 300 });
  });
});

describe('rects', () => {
  it('copies each client rect into a plain Rect, in order', () => {
    const span = add('span');
    stub(span, 'getClientRects', () => [
      { left: 1, top: 2, width: 3, height: 4, right: 4, bottom: 6, x: 1, y: 2 },
      { left: 5, top: 6, width: 7, height: 8, right: 12, bottom: 14, x: 5, y: 6 },
    ]);
    const expected: readonly Rect[] = [
      { left: 1, top: 2, width: 3, height: 4 },
      { left: 5, top: 6, width: 7, height: 8 },
    ];
    expect(geometry.rects(span)).toStrictEqual(expected);
  });

  it('returns no rects for an element without a box', () => {
    expect(geometry.rects(add('span'))).toStrictEqual([]);
  });
});

describe('isRendered', () => {
  it('asks checkVisibility to include opacity and visibility', () => {
    const div = add('div');
    const checkVisibility = vi.fn<Element['checkVisibility']>(() => false);
    stub(div, 'checkVisibility', checkVisibility);
    expect(geometry.isRendered(div)).toBe(false);
    expect(checkVisibility).toHaveBeenCalledExactlyOnceWith({
      opacityProperty: true,
      visibilityProperty: true,
    });
  });

  it('returns true when checkVisibility does', () => {
    const div = add('div');
    stub(div, 'checkVisibility', () => true);
    expect(geometry.isRendered(div)).toBe(true);
  });
});

describe('hitTest', () => {
  it("returns the document's hit when it has no shadow root", () => {
    const button = add('button');
    const fromPoint = vi.fn<Document['elementFromPoint']>(() => button);
    stub(document, 'elementFromPoint', fromPoint);
    expect(geometry.hitTest(5, 6)).toBe(button);
    expect(fromPoint).toHaveBeenCalledExactlyOnceWith(5, 6);
  });

  it('returns null when the document hits nothing', () => {
    stub(document, 'elementFromPoint', () => null);
    expect(geometry.hitTest(5, 6)).toBeNull();
  });

  it('descends into a closed shadow root', () => {
    const host = add('div');
    const root = host.attachShadow({ mode: 'closed' });
    closedRoots.set(host, root);
    const inner = document.createElement('button');
    root.appendChild(inner);
    const rootFromPoint = vi.fn<ShadowRoot['elementFromPoint']>(() => inner);
    stub(root, 'elementFromPoint', rootFromPoint);
    stub(document, 'elementFromPoint', () => host);
    expect(geometry.hitTest(5, 6)).toBe(inner);
    expect(rootFromPoint).toHaveBeenCalledExactlyOnceWith(5, 6);
  });

  it('descends through nested roots', () => {
    const outer = add('div');
    const outerRoot = outer.attachShadow({ mode: 'open' });
    const innerHost = document.createElement('div');
    outerRoot.appendChild(innerHost);
    const innerRoot = innerHost.attachShadow({ mode: 'closed' });
    closedRoots.set(innerHost, innerRoot);
    const button = document.createElement('button');
    innerRoot.appendChild(button);
    stub(outerRoot, 'elementFromPoint', () => innerHost);
    stub(innerRoot, 'elementFromPoint', () => button);
    stub(document, 'elementFromPoint', () => outer);
    expect(geometry.hitTest(5, 6)).toBe(button);
  });

  it('stops at the host when its root hits nothing', () => {
    const host = add('div');
    const root = host.attachShadow({ mode: 'open' });
    stub(root, 'elementFromPoint', () => null);
    stub(document, 'elementFromPoint', () => host);
    expect(geometry.hitTest(5, 6)).toBe(host);
  });

  it.each([
    ['the host itself', 'host'],
    ['an element outside the root', 'outside'],
  ])('stops at the host when its root returns %s', (_name, kind) => {
    const host = add('div');
    const root = host.attachShadow({ mode: 'open' });
    const outside = add('span');
    const rootFromPoint = vi.fn<ShadowRoot['elementFromPoint']>(() =>
      kind === 'host' ? host : outside,
    );
    stub(root, 'elementFromPoint', rootFromPoint);
    stub(document, 'elementFromPoint', () => host);
    expect(geometry.hitTest(5, 6)).toBe(host);
    expect(rootFromPoint).toHaveBeenCalledExactlyOnceWith(5, 6);
  });
});
