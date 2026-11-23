import type { ShadowRootOf } from '../editable';

/** A box in viewport pixels. */
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Everything that needs layout, behind one interface so the finder runs in jsdom with fakes. */
export interface Geometry {
  /** The layout viewport: 0, 0, innerWidth, innerHeight. */
  viewport(): Rect;
  /** element.getClientRects(): several for a link that wraps lines. */
  rects(element: Element): readonly Rect[];
  /** element.checkVisibility({ opacityProperty: true, visibilityProperty: true }). */
  isRendered(element: Element): boolean;
  /** The deepest element at a viewport point, descending through open and closed shadow roots. */
  hitTest(x: number, y: number): Element | null;
}

/**
 * The deepest element at a point. A shadow root retargets hits outside itself to
 * its host (or returns an outer element), so descend only into a root's own tree.
 * Every step then goes one shadow level deeper, which makes the loop end.
 */
function deepestAt(
  doc: Document,
  shadowRootOf: ShadowRootOf,
  x: number,
  y: number,
): Element | null {
  let hit = doc.elementFromPoint(x, y);
  while (hit !== null) {
    const root = shadowRootOf(hit);
    if (!root) {
      return hit;
    }
    const inner = root.elementFromPoint(x, y);
    if (inner?.getRootNode() !== root) {
      return hit;
    }
    hit = inner;
  }
  return null;
}

/** Reads layout from the live DOM; jsdom tests use a fake Geometry instead. */
export function createDomGeometry(win: Window, shadowRootOf: ShadowRootOf): Geometry {
  return {
    viewport: () => ({ left: 0, top: 0, width: win.innerWidth, height: win.innerHeight }),
    rects: (element) =>
      Array.from(element.getClientRects(), (rect) => ({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      })),
    isRendered: (element) =>
      element.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
    hitTest: (x, y) => deepestAt(win.document, shadowRootOf, x, y),
  };
}
