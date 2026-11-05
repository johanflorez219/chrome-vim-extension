import type { Axis } from './scroller';

export interface ScrollTargetTracker {
  /** The element the next scroll on `axis` should move. */
  targetFor(axis: Axis): Element;
  /** Removes the listeners and forgets the stored path and the cached fallback. */
  stop(): void;
}

function documentOf(doc: Document): Element {
  return doc.scrollingElement ?? doc.documentElement;
}

function overflowStyle(element: Element, axis: Axis): string {
  const style = getComputedStyle(element);
  return axis === 'y' ? style.overflowY : style.overflowX;
}

function overflows(element: Element, axis: Axis): boolean {
  return axis === 'y'
    ? element.scrollHeight > element.clientHeight
    : element.scrollWidth > element.clientWidth;
}

function visibleArea(element: Element, view: Window): number {
  const rect = element.getBoundingClientRect();
  const width = Math.min(rect.right, view.innerWidth) - Math.max(rect.left, 0);
  const height = Math.min(rect.bottom, view.innerHeight) - Math.max(rect.top, 0);
  return Math.max(0, width) * Math.max(0, height);
}

/** Whether `element` can scroll on `axis`; the document's scrolling element follows the document's own rule. */
export function canScroll(element: Element, axis: Axis): boolean {
  const doc = element.ownerDocument;
  if (element === documentOf(doc)) {
    // The root's computed overflow is usually 'visible' even when the page
    // scrolls; only an explicit 'hidden' (a modal locking the page) stops it
    return (
      overflows(element, axis) &&
      overflowStyle(doc.documentElement, axis) !== 'hidden' &&
      overflowStyle(doc.body, axis) !== 'hidden'
    );
  }
  // While html's overflow is 'visible', body's overflow applies to the
  // viewport, so body itself isn't a scrolling container
  if (element === doc.body && overflowStyle(doc.documentElement, axis) === 'visible') {
    return false;
  }
  if (!overflows(element, axis)) {
    return false;
  }
  const style = overflowStyle(element, axis);
  return style === 'auto' || style === 'scroll';
}

function findLargest(doc: Document, view: Window): Element | undefined {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  let best: Element | undefined;
  let bestArea = 0;
  for (let node: Node | null = walker.currentNode; node !== null; node = walker.nextNode()) {
    if (node instanceof Element && canScroll(node, 'y')) {
      const area = visibleArea(node, view);
      if (area > bestArea) {
        best = node;
        bestArea = area;
      }
    }
  }
  return best;
}

/**
 * Remembers where the user last clicked or focused, and picks the element
 * that scroll commands should move: the nearest scrollable ancestor of that
 * point, else the document, else (for up and down on a page whose document
 * can't scroll) the largest visible scrolling container.
 */
export function createScrollTargetTracker(doc: Document): ScrollTargetTracker {
  const view = doc.defaultView ?? window;
  let path: readonly Element[] = [];
  let fallback: Element | undefined;

  const remember = (event: Event): void => {
    path = event.composedPath().filter((node): node is Element => node instanceof Element);
  };
  view.addEventListener('mousedown', remember, { capture: true });
  view.addEventListener('focusin', remember, { capture: true });

  return {
    targetFor: (axis) => {
      const chosen = path.find((element) => element.isConnected && canScroll(element, axis));
      if (chosen !== undefined) {
        return chosen;
      }
      if (axis === 'x' || canScroll(documentOf(doc), 'y')) {
        return documentOf(doc);
      }
      if (fallback?.isConnected === true && canScroll(fallback, 'y')) {
        return fallback;
      }
      // A miss isn't cached, so content that loads later is found next time
      fallback = findLargest(doc, view);
      return fallback ?? documentOf(doc);
    },
    stop: () => {
      view.removeEventListener('mousedown', remember, { capture: true });
      view.removeEventListener('focusin', remember, { capture: true });
      path = [];
      fallback = undefined;
    },
  };
}
