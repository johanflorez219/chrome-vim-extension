import type { ShadowRootOf } from '../editable';

import { isClickable, isCopyableUrl, isTextInput, linkUrl } from './clickable';
import type { Geometry, Rect } from './geometry';

/** Which elements a hint command wants: clickable ones, copyable links, or text inputs. */
export type TargetFilter = 'clickable' | 'copyableLink' | 'textInput';

/** An element that will get a hint, with the part of its box that is on screen. */
export interface HintTarget {
  readonly element: Element;
  /** The part of the element's first in-viewport rect that is inside the viewport. */
  readonly rect: Rect;
}

export interface Finder {
  /** Visible targets in document order, shadow content in place of its host. */
  find(filter: TargetFilter): readonly HintTarget[];
}

interface FinderDeps {
  readonly document: Document;
  readonly shadowRootOf: ShadowRootOf;
  readonly geometry: Geometry;
}

/** True when `node` is `ancestor` or inside it, crossing shadow roots through their hosts. */
export function composedContains(ancestor: Node, node: Node): boolean {
  let current: Node | null = node;
  while (current !== null) {
    if (current === ancestor) {
      return true;
    }
    current = current instanceof ShadowRoot ? current.host : current.parentNode;
  }
  return false;
}

function matchesFilter(filter: TargetFilter, element: Element): boolean {
  switch (filter) {
    case 'clickable':
      return isClickable(element);
    case 'copyableLink': {
      // isClickable keeps disabled and inert links out (R1.2)
      if (!isClickable(element)) {
        return false;
      }
      const url = linkUrl(element);
      return url !== undefined && isCopyableUrl(url);
    }
    case 'textInput':
      return isTextInput(element);
  }
}

/**
 * Walks elements in document order. A shadow root is walked right where its host
 * is, so its content keeps its place (R1.1). A TreeWalker never enters iframes (R1.5).
 */
function collect(
  deps: FinderDeps,
  root: Document | ShadowRoot,
  filter: TargetFilter,
  out: Element[],
): void {
  const walker = deps.document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (!(node instanceof Element)) {
      continue;
    }
    if (matchesFilter(filter, node)) {
      out.push(node);
    }
    const shadow = deps.shadowRootOf(node);
    if (shadow !== null) {
      collect(deps, shadow, filter, out);
    }
  }
}

/** The intersection of a rect with the viewport, or undefined when it has no area (R1.2, R2.6). */
function clip(rect: Rect, viewport: Rect): Rect | undefined {
  const left = Math.max(rect.left, viewport.left);
  const top = Math.max(rect.top, viewport.top);
  const right = Math.min(rect.left + rect.width, viewport.left + viewport.width);
  const bottom = Math.min(rect.top + rect.height, viewport.top + viewport.height);
  if (right <= left || bottom <= top) {
    return undefined;
  }
  return { left, top, width: right - left, height: bottom - top };
}

/** The first on-screen part of a rendered element's boxes, or undefined when none is visible. */
function visibleRect(geometry: Geometry, viewport: Rect, element: Element): Rect | undefined {
  if (!geometry.isRendered(element)) {
    return undefined;
  }
  for (const rect of geometry.rects(element)) {
    const clipped = clip(rect, viewport);
    if (clipped !== undefined) {
      return clipped;
    }
  }
  return undefined;
}

/**
 * True when the element is the topmost thing at its centre, or at a point near its
 * corner (R1.3). The corner is only tested when the centre is covered.
 */
function isHitInside(geometry: Geometry, element: Element, rect: Rect): boolean {
  const points: readonly (readonly [number, number])[] = [
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
    [rect.left + 2, rect.top + 2],
  ];
  return points.some(([x, y]) => {
    const hit = geometry.hitTest(x, y);
    return hit !== null && composedContains(element, hit);
  });
}

/**
 * The control a label wraps, when the candidates are [label, control, …] and no
 * other clickable element is inside the label (R1.4). Candidates are in document
 * order, so a label's clickable descendants come right after it.
 */
function wrappedControl(candidates: readonly Element[], index: number): Element | undefined {
  const label = candidates[index];
  const control = label instanceof HTMLLabelElement ? label.control : null;
  const next = candidates[index + 1];
  const after = candidates[index + 2];
  if (label === undefined || control === null || next !== control || !label.contains(control)) {
    return undefined;
  }
  return after !== undefined && composedContains(label, after) ? undefined : control;
}

function wrappingLabels(candidates: readonly Element[]): Map<Element, Element> {
  const controls = new Map<Element, Element>();
  candidates.forEach((label, index) => {
    const control = wrappedControl(candidates, index);
    if (control !== undefined) {
      controls.set(label, control);
    }
  });
  return controls;
}

export function createFinder(deps: FinderDeps): Finder {
  return {
    find: (filter) => {
      const candidates: Element[] = [];
      collect(deps, deps.document, filter, candidates);
      // Read once per find, so every element is clipped against the same viewport
      const viewport = deps.geometry.viewport();
      // Layout runs only for elements that passed the filter, and hit tests only for
      // elements on screen (NFR1.1)
      const targets = candidates.flatMap((element): HintTarget[] => {
        const rect = visibleRect(deps.geometry, viewport, element);
        return rect !== undefined && isHitInside(deps.geometry, element, rect)
          ? [{ element, rect }]
          : [];
      });
      const controls = wrappingLabels(candidates);
      const shown = new Set(targets.map((target) => target.element));
      return targets.filter((target) => {
        const control = controls.get(target.element);
        return control === undefined || !shown.has(control);
      });
    },
  };
}
