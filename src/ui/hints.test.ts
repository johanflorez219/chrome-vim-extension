import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Rect } from '@/core/hints/geometry';

import { createHintOverlay, type HintOverlay, type HintView } from './hints';
import type { UiRoot } from './shadow-root';

let root: ShadowRoot;
let unmount: ReturnType<typeof vi.fn<() => void>>;
let mount: ReturnType<typeof vi.fn<() => UiRoot>>;
let overlay: HintOverlay;

const viewport = (): Rect => ({ left: 0, top: 0, width: 800, height: 600 });

function rect(left: number, top: number): Rect {
  return { left, top, width: 40, height: 10 };
}

function hintsIn(shadow: ShadowRoot): HTMLElement[] {
  return Array.from(shadow.querySelectorAll<HTMLElement>('.hint'));
}

let savedWidth: PropertyDescriptor | undefined;
let savedHeight: PropertyDescriptor | undefined;

function stubSizes(width: number, height: number): void {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => height,
  });
}

beforeAll(() => {
  savedWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  savedHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
});

beforeEach(() => {
  unmount = vi.fn<() => void>();
  // Each mount gets a fresh host and root, as the real overlay does
  mount = vi.fn<() => UiRoot>(() => {
    const host = document.body.appendChild(document.createElement('div'));
    root = host.attachShadow({ mode: 'open' });
    return {
      root,
      unmount: () => {
        unmount();
        host.remove();
      },
    };
  });
  overlay = createHintOverlay({ mount, viewport });
});

afterEach(() => {
  if (savedWidth === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'offsetWidth');
  } else {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', savedWidth);
  }
  if (savedHeight === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
  } else {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', savedHeight);
  }
  document.body.replaceChildren();
});

describe('show', () => {
  it('shows one hint per view with the label in upper case', () => {
    const views: readonly HintView[] = [
      { label: 'sa', rect: rect(10, 20) },
      { label: 'd', rect: rect(100, 20) },
    ];
    overlay.show(views);
    const hints = hintsIn(root);
    expect(hints.map((hint) => hint.textContent)).toStrictEqual(['SA', 'D']);
    for (const hint of hints) {
      const typed = hint.querySelectorAll('.typed');
      expect(typed).toHaveLength(1);
      expect(typed[0]?.textContent).toBe('');
    }
    expect(mount).toHaveBeenCalledOnce();
  });

  it("positions each hint at its rect's top-left corner", () => {
    overlay.show([{ label: 'sa', rect: rect(10, 20) }]);
    const [hint] = hintsIn(root);
    expect(hint?.style.left).toBe('10px');
    expect(hint?.style.top).toBe('20px');
  });

  it('clamps a corner outside the viewport', () => {
    overlay.show([{ label: 'sa', rect: { left: -5, top: 900, width: 40, height: 10 } }]);
    const [hint] = hintsIn(root);
    expect(hint?.style.left).toBe('0px');
    expect(hint?.style.top).toBe('599px');
  });

  it('moves a hint that would cross the right or bottom edge back inside', () => {
    stubSizes(30, 16);
    overlay.show([
      { label: 'sa', rect: rect(790, 595) },
      { label: 'sd', rect: rect(10, 20) },
    ]);
    const [edge, inside] = hintsIn(root);
    expect(edge?.style.left).toBe('770px');
    expect(edge?.style.top).toBe('584px');
    expect(inside?.style.left).toBe('10px');
    expect(inside?.style.top).toBe('20px');
  });

  it('reads every size before moving any hint', () => {
    stubSizes(30, 16);
    const reads: string[][] = [];
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        reads.push(hintsIn(root).map((hint) => hint.style.left));
        return 30;
      },
    });
    overlay.show([
      { label: 'sa', rect: rect(790, 10) },
      { label: 'sd', rect: rect(790, 40) },
      { label: 'sf', rect: rect(790, 70) },
    ]);
    expect(reads).toHaveLength(3);
    for (const left of reads) {
      expect(left).toStrictEqual(['790px', '790px', '790px']);
    }
    expect(hintsIn(root).map((hint) => hint.style.left)).toStrictEqual(['770px', '770px', '770px']);
  });

  it('adds its own style with the hint colours', () => {
    overlay.show([{ label: 'sa', rect: rect(10, 20) }]);
    const css = root.querySelector('style')?.textContent ?? '';
    expect(css).toContain('#ffd94a');
    expect(css).toContain('#000');
    expect(css).toContain('#5a4a00');
  });

  it('replaces the previous hints when shown again', () => {
    overlay.show([
      { label: 'sa', rect: rect(10, 20) },
      { label: 'sd', rect: rect(10, 40) },
    ]);
    overlay.show([{ label: 'sf', rect: rect(10, 60) }]);
    expect(unmount).toHaveBeenCalledOnce();
    expect(mount).toHaveBeenCalledTimes(2);
    expect(hintsIn(root).map((hint) => hint.textContent)).toStrictEqual(['SF']);
  });
});

describe('filter', () => {
  it('hides hints that no longer match and marks the typed letters', () => {
    overlay.show([
      { label: 'sa', rect: rect(10, 20) },
      { label: 'sd', rect: rect(10, 40) },
      { label: 'f', rect: rect(10, 60) },
    ]);
    overlay.filter([0, 1], 1);
    const [first, second, third] = hintsIn(root);
    expect(third?.hidden).toBe(true);
    expect(first?.hidden).toBe(false);
    expect(second?.hidden).toBe(false);
    expect(first?.querySelector('.typed')?.textContent).toBe('S');
    expect(second?.querySelector('.typed')?.textContent).toBe('S');
    expect(first?.textContent).toBe('SA');
    expect(second?.textContent).toBe('SD');

    overlay.filter([0, 1, 2], 0);
    const hints = hintsIn(root);
    expect(hints.every((hint) => !hint.hidden)).toBe(true);
    expect(hints.map((hint) => hint.querySelector('.typed')?.textContent)).toStrictEqual([
      '',
      '',
      '',
    ]);
    expect(hints.map((hint) => hint.textContent)).toStrictEqual(['SA', 'SD', 'F']);
  });

  it('keeps the same elements and mounts once', () => {
    overlay.show([
      { label: 'sa', rect: rect(10, 20) },
      { label: 'sd', rect: rect(10, 40) },
    ]);
    const before = hintsIn(root);
    overlay.filter([0], 1);
    overlay.filter([0, 1], 1);
    const after = hintsIn(root);
    expect(after).toHaveLength(2);
    after.forEach((hint, index) => {
      expect(hint).toBe(before[index]);
    });
    expect(mount).toHaveBeenCalledOnce();
  });
});

describe('remove', () => {
  it('unmounts once and is safe to repeat or call before show', () => {
    overlay.remove();
    expect(unmount).not.toHaveBeenCalled();
    overlay.show([{ label: 'sa', rect: rect(10, 20) }]);
    overlay.remove();
    overlay.remove();
    expect(unmount).toHaveBeenCalledOnce();
  });

  it('mounts a fresh root when shown after removal', () => {
    overlay.show([{ label: 'sa', rect: rect(10, 20) }]);
    overlay.remove();
    overlay.show([{ label: 'sd', rect: rect(10, 20) }]);
    expect(mount).toHaveBeenCalledTimes(2);
    expect(unmount).toHaveBeenCalledOnce();
  });

  it('leaves focus and selection alone', () => {
    const input = document.createElement('input');
    input.value = 'hello';
    document.body.appendChild(input);
    input.focus();
    input.setSelectionRange(1, 2);
    overlay.show([{ label: 'sa', rect: rect(10, 20) }]);
    overlay.filter([0], 1);
    overlay.remove();
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(2);
  });
});
