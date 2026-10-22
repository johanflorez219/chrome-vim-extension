import { afterEach, describe, expect, it, vi } from 'vitest';

import { canScroll, createScrollTargetTracker, type ScrollTargetTracker } from './scroll-target';

interface Sizes {
  readonly scrollHeight?: number;
  readonly clientHeight?: number;
  readonly scrollWidth?: number;
  readonly clientWidth?: number;
}

function stubSize(element: Element, sizes: Sizes): void {
  for (const [name, value] of Object.entries(sizes) as [keyof Sizes, number][]) {
    vi.spyOn(element, name, 'get').mockReturnValue(value);
  }
}

type Rect = readonly [x: number, y: number, width: number, height: number];

function stubRect(element: Element, rect: Rect): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(...rect));
}

const TALL: Sizes = { scrollHeight: 1000, clientHeight: 300 };
const WIDE: Sizes = { scrollWidth: 1000, clientWidth: 300, scrollHeight: 300, clientHeight: 300 };

function panel(
  options: {
    overflowY?: string;
    overflowX?: string;
    sizes: Sizes;
    rect?: Rect;
  },
  parent: Node = document.body,
): HTMLDivElement {
  const element = document.createElement('div');
  if (options.overflowY !== undefined) {
    element.style.overflowY = options.overflowY;
  }
  if (options.overflowX !== undefined) {
    element.style.overflowX = options.overflowX;
  }
  parent.appendChild(element);
  stubSize(element, options.sizes);
  if (options.rect !== undefined) {
    stubRect(element, options.rect);
  }
  return element;
}

function stubDocument({ y = false, x = false }: { y?: boolean; x?: boolean }): void {
  stubSize(document.documentElement, {
    clientHeight: 768,
    clientWidth: 1024,
    scrollHeight: y ? 3000 : 768,
    scrollWidth: x ? 3000 : 1024,
  });
}

function click(element: Element): void {
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
}

function add<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  parent: Node = document.body,
): HTMLElementTagNameMap[K] {
  return parent.appendChild(document.createElement(tag));
}

let tracker: ScrollTargetTracker | undefined;

function track(): ScrollTargetTracker {
  tracker = createScrollTargetTracker(document);
  return tracker;
}

afterEach(() => {
  tracker?.stop();
  tracker = undefined;
  document.body.replaceChildren();
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
  Reflect.deleteProperty(document, 'scrollingElement');
});

describe('canScroll', () => {
  it.each(['auto', 'scroll'])(
    'treats a container as scrollable when it overflows with overflow %s',
    (overflowY) => {
      expect(canScroll(panel({ overflowY, sizes: TALL }), 'y')).toBe(true);
    },
  );

  it.each(['visible', 'hidden'])(
    'treats a container with overflow %s as not scrollable',
    (overflowY) => {
      expect(canScroll(panel({ overflowY, sizes: TALL }), 'y')).toBe(false);
    },
  );

  it('treats a container whose content fits as not scrollable', () => {
    const fits = panel({ overflowY: 'auto', sizes: { scrollHeight: 300, clientHeight: 300 } });

    expect(canScroll(fits, 'y')).toBe(false);
  });

  it('checks each axis on its own', () => {
    const block = panel({ overflowX: 'auto', sizes: WIDE });

    expect(canScroll(block, 'x')).toBe(true);
    expect(canScroll(block, 'y')).toBe(false);
  });

  it('checks the size before reading the computed style', () => {
    const fits = panel({ overflowY: 'auto', sizes: { scrollHeight: 300, clientHeight: 300 } });
    const style = vi.spyOn(window, 'getComputedStyle');

    expect(canScroll(fits, 'y')).toBe(false);
    expect(style).not.toHaveBeenCalled();
  });

  it('treats the document as scrollable when it overflows, even with overflow visible', () => {
    stubDocument({ y: true, x: false });

    expect(canScroll(document.documentElement, 'y')).toBe(true);
    expect(canScroll(document.documentElement, 'x')).toBe(false);
  });

  it.each(['documentElement', 'body'] as const)(
    'treats the document as not scrollable when %s sets overflow hidden',
    (name) => {
      stubDocument({ y: true });
      document[name].style.overflowY = 'hidden';

      expect(canScroll(document.documentElement, 'y')).toBe(false);
    },
  );

  it('treats body as a container only when html keeps its overflow from the viewport', () => {
    document.body.style.overflowY = 'auto';
    stubSize(document.body, TALL);

    expect(canScroll(document.body, 'y')).toBe(false);

    document.documentElement.style.overflowY = 'hidden';

    expect(canScroll(document.body, 'y')).toBe(true);
  });

  it('uses document.scrollingElement as the document when the browser provides one', () => {
    Object.defineProperty(document, 'scrollingElement', {
      configurable: true,
      value: document.body,
    });
    stubSize(document.body, TALL);

    expect(canScroll(document.body, 'y')).toBe(true);
  });
});

describe('createScrollTargetTracker', () => {
  it('targets the nearest scrollable ancestor of a click', () => {
    stubDocument({ y: true });
    const outer = panel({ overflowY: 'auto', sizes: TALL });
    const inner = panel({ overflowY: 'auto', sizes: TALL }, outer);
    const span = add('span', inner);
    track();

    click(span);

    expect(tracker?.targetFor('y')).toBe(inner);
  });

  it('targets the nearest scrollable ancestor of a focused element', () => {
    stubDocument({ y: true });
    const scroller = panel({ overflowY: 'auto', sizes: TALL });
    const input = add('input', scroller);
    track();

    input.focus();

    expect(tracker?.targetFor('y')).toBe(scroller);
  });

  it('targets the document when nothing was clicked and the document can scroll', () => {
    stubDocument({ y: true });
    panel({ overflowY: 'auto', sizes: TALL, rect: [0, 0, 300, 300] });

    expect(track().targetFor('y')).toBe(document.documentElement);
  });

  it('targets the document after a click with no scrollable ancestor', () => {
    stubDocument({ y: true });
    const scroller = panel({ overflowY: 'auto', sizes: TALL });
    const paragraph = add('p');
    track();

    click(add('span', scroller));
    click(paragraph);

    expect(tracker?.targetFor('y')).toBe(document.documentElement);
  });

  it('chooses per axis', () => {
    stubDocument({ y: true });
    const vertical = panel({ overflowY: 'auto', sizes: TALL });
    const sideways = panel({ overflowX: 'auto', sizes: WIDE }, vertical);
    const span = add('span', sideways);
    track();

    click(span);

    expect(tracker?.targetFor('y')).toBe(vertical);
    expect(tracker?.targetFor('x')).toBe(sideways);
  });

  it('falls back to the document when the target was removed', () => {
    stubDocument({ y: true });
    const scroller = panel({ overflowY: 'auto', sizes: TALL });
    track();

    click(add('span', scroller));
    scroller.remove();

    expect(tracker?.targetFor('y')).toBe(document.documentElement);
  });

  it('falls back to the document when the target can no longer scroll', () => {
    stubDocument({ y: true });
    const scroller = panel({ overflowY: 'auto', sizes: TALL });
    track();

    click(add('span', scroller));
    scroller.style.overflowY = 'hidden';

    expect(tracker?.targetFor('y')).toBe(document.documentElement);
  });

  it('scrolls the largest visible vertical container when the document cannot scroll', () => {
    stubDocument({ y: false });
    panel({ overflowY: 'auto', sizes: TALL, rect: [0, 0, 300, 200] });
    const largest = panel({ overflowY: 'auto', sizes: TALL, rect: [0, 200, 800, 500] });
    panel({ overflowY: 'auto', sizes: TALL, rect: [0, 2000, 1000, 1000] });

    expect(track().targetFor('y')).toBe(largest);
  });

  it('scores visible area clipped to the viewport', () => {
    stubDocument({ y: false });
    panel({ overflowY: 'auto', sizes: TALL, rect: [0, 0, 500, 5000] });
    const wide = panel({ overflowY: 'auto', sizes: TALL, rect: [0, 0, 1000, 400] });

    expect(track().targetFor('y')).toBe(wide);
  });

  it('uses the largest visible container after a click outside any panel when the document cannot scroll', () => {
    stubDocument({ y: false });
    const visible = panel({ overflowY: 'auto', sizes: TALL, rect: [0, 0, 800, 500] });
    const paragraph = add('p');
    track();

    click(paragraph);

    expect(tracker?.targetFor('y')).toBe(visible);
  });

  it('returns the document when nothing can scroll', () => {
    stubDocument({ y: false });

    expect(track().targetFor('y')).toBe(document.documentElement);
  });

  it('reuses the cached fallback while it stays connected and scrollable', () => {
    stubDocument({ y: false });
    const first = panel({ overflowY: 'auto', sizes: TALL, rect: [0, 0, 800, 500] });
    const walk = vi.spyOn(document, 'createTreeWalker');
    track();

    expect(tracker?.targetFor('y')).toBe(first);
    expect(tracker?.targetFor('y')).toBe(first);
    expect(walk).toHaveBeenCalledTimes(1);

    first.remove();
    const second = panel({ overflowY: 'auto', sizes: TALL, rect: [0, 0, 800, 500] });

    expect(tracker?.targetFor('y')).toBe(second);
    expect(walk).toHaveBeenCalledTimes(2);
  });

  it('keeps the document as the x target when it cannot scroll horizontally', () => {
    stubDocument({ y: false, x: false });
    panel({ overflowX: 'auto', sizes: WIDE, rect: [0, 0, 800, 500] });

    expect(track().targetFor('x')).toBe(document.documentElement);
  });

  it('stops tracking clicks and focus after stop()', () => {
    stubDocument({ y: true });
    const scroller = panel({ overflowY: 'auto', sizes: TALL });
    const input = add('input', scroller);
    const stopped = track();

    click(add('span', scroller));
    stopped.stop();
    click(add('span', scroller));
    input.focus();

    expect(stopped.targetFor('y')).toBe(document.documentElement);
  });
});
