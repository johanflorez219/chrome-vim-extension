import type { MessageClient } from '../../messaging/client';

import { isDisabled, isOpenableUrl, isTextInput, linkUrl } from './clickable';
import type { Geometry } from './geometry';

/**
 * What a picked hint does: click it, open its link in a background tab, or copy its
 * URL. It lives here because hints/actions.ts lands before modes/hint.ts, which imports it.
 */
export type HintAction = 'click' | 'openTab' | 'copyUrl';

interface EventRow {
  readonly type: string;
  readonly pointer: boolean;
  readonly bubbles: boolean;
  readonly pressed: boolean;
}

/** The mouse events a real click sends, in order (R4.2). */
const EVENTS: readonly EventRow[] = [
  { type: 'pointerover', pointer: true, bubbles: true, pressed: false },
  { type: 'pointerenter', pointer: true, bubbles: false, pressed: false },
  { type: 'mouseover', pointer: false, bubbles: true, pressed: false },
  { type: 'mouseenter', pointer: false, bubbles: false, pressed: false },
  { type: 'pointerdown', pointer: true, bubbles: true, pressed: true },
  { type: 'mousedown', pointer: false, bubbles: true, pressed: true },
  { type: 'pointerup', pointer: true, bubbles: true, pressed: false },
  { type: 'mouseup', pointer: false, bubbles: true, pressed: false },
  { type: 'click', pointer: false, bubbles: true, pressed: false },
];

/** The centre of the first rect with an area, or the origin when there is none. */
function pointOf(element: Element, geometry: Pick<Geometry, 'rects'>): { x: number; y: number } {
  const box = geometry.rects(element).find((rect) => rect.width > 0 && rect.height > 0);
  return box === undefined
    ? { x: 0, y: 0 }
    : { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

// No `view`: jsdom rejects a Window there, and page code does not depend on it
function createEvent(row: EventRow, point: { readonly x: number; readonly y: number }): MouseEvent {
  const init: MouseEventInit = {
    bubbles: row.bubbles,
    cancelable: true,
    composed: true,
    clientX: point.x,
    clientY: point.y,
    button: 0,
    buttons: row.pressed ? 1 : 0,
    detail: 1,
  };
  return row.pointer
    ? new PointerEvent(row.type, { ...init, pointerType: 'mouse', isPrimary: true, pointerId: 1 })
    : new MouseEvent(row.type, init);
}

/**
 * Elements a mouse press focuses: those the browser focuses natively (tabIndex 0 or
 * more) and any element with a tabindex attribute, as a real press does. The DOM
 * reports -1 for elements that are not focusable by default.
 */
function canTakeFocus(element: Element): element is HTMLElement | SVGElement {
  return (
    (element instanceof HTMLElement || element instanceof SVGElement) &&
    (element.tabIndex >= 0 || element.hasAttribute('tabindex'))
  );
}

/**
 * Dispatches the mouse events of a real click on the element's centre (R4.2). The
 * click runs the browser's own activation, so links follow and checkboxes toggle.
 * Every event is sent even when the page cancels one; a cancelled mousedown skips
 * the focus, as a real press does.
 */
export function simulateClick(element: Element, geometry: Pick<Geometry, 'rects'>): void {
  const point = pointOf(element, geometry);
  for (const row of EVENTS) {
    const notCancelled = element.dispatchEvent(createEvent(row, point));
    if (row.type === 'mousedown' && notCancelled && canTakeFocus(element)) {
      element.focus({ preventScroll: true });
    }
  }
}

interface HintActionDeps {
  readonly geometry: Pick<Geometry, 'rects'>;
  readonly writeClipboard: (text: string) => Promise<void>;
  readonly client: Pick<MessageClient, 'openTab'>;
}

/** Text fields and selects take focus instead of a click, so the focus watcher enters Insert mode (R4.3, R4.4). */
function click(element: Element, geometry: Pick<Geometry, 'rects'>): void {
  if (
    element instanceof HTMLElement &&
    (isTextInput(element) || element instanceof HTMLSelectElement)
  ) {
    element.focus();
    return;
  }
  simulateClick(element, geometry);
}

async function copy(writeClipboard: (text: string) => Promise<void>, text: string): Promise<void> {
  try {
    await writeClipboard(text);
  } catch {
    // Clipboard refused or missing: nothing visible and nothing logged (R5.6, NFR4.1)
  }
}

/**
 * The three hint actions. Nothing happens to a detached or disabled element (R4.6),
 * where isDisabled covers `:disabled`, `aria-disabled="true"` and `[inert]`. The URL
 * is used only by the action that needs it (R5.8). Nothing is logged (NFR4.1).
 */
export function createHintActions(
  deps: HintActionDeps,
): (action: HintAction, element: Element) => void {
  return (action, element) => {
    if (!element.isConnected || isDisabled(element)) {
      return;
    }
    switch (action) {
      case 'click':
        click(element, deps.geometry);
        return;
      case 'openTab': {
        const url = linkUrl(element);
        if (url !== undefined && isOpenableUrl(url)) {
          // openTab never rejects (T7)
          void deps.client.openTab(url.href);
        } else {
          click(element, deps.geometry);
        }
        return;
      }
      case 'copyUrl': {
        const url = linkUrl(element);
        if (url !== undefined) {
          void copy(deps.writeClipboard, url.href);
        }
        return;
      }
    }
  };
}
