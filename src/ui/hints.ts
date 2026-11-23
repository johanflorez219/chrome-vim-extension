import type { Rect } from '@/core/hints/geometry';
import type { UiRoot } from '@/ui/shadow-root';

/** One hint to draw: its label and the element's top-left corner in viewport pixels. */
export interface HintView {
  readonly label: string;
  readonly rect: Rect;
}

/** Draws hints in the UI root and filters them as the user types. */
export interface HintOverlay {
  /** Replaces any hints on screen with `views`, mounting a fresh root (R7.4). */
  show(views: readonly HintView[]): void;
  /** Hides hints not in `visible` and marks the first `typed` letters of the others. */
  filter(visible: readonly number[], typed: number): void;
  /** Removes every hint and the root. Safe to call with nothing shown. */
  remove(): void;
}

// Contrast: black on yellow is about 15:1 and dark olive on yellow about 6.8:1 (NFR5.1)
const STYLE = [
  '.hint { position: absolute; box-sizing: border-box; padding: 0 3px;',
  'font: bold 12px/1.2 ui-monospace, monospace; color: #000; background: #ffd94a;',
  'border: 1px solid #5a4a00; border-radius: 3px; white-space: nowrap; }',
  '.hint[hidden] { display: none; }',
  '.typed { color: #5a4a00; }',
].join(' ');

interface HintElements {
  readonly label: string;
  readonly span: HTMLSpanElement;
  readonly typed: HTMLSpanElement;
  readonly rest: Text;
}

function px(value: number): string {
  return `${String(value)}px`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createHintElements(doc: Document, view: HintView, viewport: Rect): HintElements {
  const span = doc.createElement('span');
  span.className = 'hint';
  const typed = doc.createElement('span');
  typed.className = 'typed';
  const rest = doc.createTextNode(view.label.toUpperCase());
  span.append(typed, rest);
  span.style.left = px(clamp(view.rect.left, 0, viewport.width - 1));
  span.style.top = px(clamp(view.rect.top, 0, viewport.height - 1));
  return { label: view.label, span, typed, rest };
}

/**
 * Moves hints that would cross the right or bottom edge back inside. All sizes are
 * read in one batch before any hint moves, so the browser lays out once (NFR1.1).
 */
function fitInside(hints: readonly HintElements[], viewport: Rect): void {
  const measured = hints.map((hint) => ({
    span: hint.span,
    width: hint.span.offsetWidth,
    height: hint.span.offsetHeight,
  }));
  for (const { span, width, height } of measured) {
    const left = Number.parseFloat(span.style.left);
    if (left + width > viewport.width) {
      span.style.left = px(Math.max(0, viewport.width - width));
    }
    const top = Number.parseFloat(span.style.top);
    if (top + height > viewport.height) {
      span.style.top = px(Math.max(0, viewport.height - height));
    }
  }
}

export function createHintOverlay(deps: {
  readonly mount: () => UiRoot;
  readonly viewport: () => Rect;
}): HintOverlay {
  let ui: UiRoot | undefined;
  let hints: readonly HintElements[] = [];

  const remove = (): void => {
    ui?.unmount();
    ui = undefined;
    hints = [];
  };

  return {
    show: (views) => {
      remove();
      const mounted = deps.mount();
      ui = mounted;
      const doc = mounted.root.ownerDocument;
      const style = doc.createElement('style');
      style.textContent = STYLE;
      const viewport = deps.viewport();
      hints = views.map((view) => createHintElements(doc, view, viewport));
      mounted.root.append(style, ...hints.map(({ span }) => span));
      fitInside(hints, viewport);
    },
    filter: (visible, typed) => {
      const shown = new Set(visible);
      hints.forEach((hint, index) => {
        hint.span.hidden = !shown.has(index);
        if (shown.has(index)) {
          hint.typed.textContent = hint.label.slice(0, typed).toUpperCase();
          hint.rest.data = hint.label.slice(typed).toUpperCase();
        }
      });
    },
    remove,
  };
}
