import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { mountUiRoot, type UiRoot } from './shadow-root';

let original: PropertyDescriptor | undefined;

function stubShowPopover(value: unknown): void {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    writable: true,
    value,
  });
}

function host(): Element | null {
  return document.querySelector('vim-hints');
}

beforeAll(() => {
  original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover');
});

afterEach(() => {
  document.querySelectorAll('vim-hints').forEach((el) => {
    el.remove();
  });
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original);
  }
});

describe('mountUiRoot', () => {
  it('appends one host with a closed shadow root to documentElement', () => {
    stubShowPopover(undefined);
    const ui: UiRoot = mountUiRoot(document);
    expect(document.querySelectorAll('vim-hints')).toHaveLength(1);
    expect(document.documentElement.lastElementChild).toBe(host());
    expect(host()?.shadowRoot).toBeNull();
    expect(ui.root.host).toBe(host());
    expect(ui.root.mode).toBe('closed');
  });

  it('marks the host as a manual popover hidden from screen readers', () => {
    stubShowPopover(undefined);
    mountUiRoot(document);
    expect(host()?.getAttribute('popover')).toBe('manual');
    expect(host()?.getAttribute('aria-hidden')).toBe('true');
  });

  it.each([
    'all: initial !important',
    'position: fixed !important',
    'inset: 0 !important',
    'margin: 0 !important',
    'padding: 0 !important',
    'border: 0 !important',
    'background: transparent !important',
    'pointer-events: none !important',
    'z-index: 2147483647 !important',
  ])('pins the host with the inline style %s', (declaration) => {
    stubShowPopover(undefined);
    mountUiRoot(document);
    expect(host()?.getAttribute('style')).toContain(declaration);
  });

  it('keeps position as an important inline style', () => {
    stubShowPopover(undefined);
    mountUiRoot(document);
    const element = host() as HTMLElement;
    expect(element.style.getPropertyValue('position')).toBe('fixed');
    expect(element.style.getPropertyPriority('position')).toBe('important');
  });

  it('shows the host as a popover once it is in the page', () => {
    const connected: boolean[] = [];
    const showPopover = vi.fn(function (this: HTMLElement) {
      connected.push(this.isConnected);
    });
    stubShowPopover(showPopover);
    mountUiRoot(document);
    expect(showPopover).toHaveBeenCalledOnce();
    expect(showPopover.mock.contexts[0]).toBe(host());
    expect(connected).toStrictEqual([true]);
  });

  it.each<readonly [string, unknown]>([
    ['missing', undefined],
    [
      'throwing',
      () => {
        throw new DOMException('refused', 'NotSupportedError');
      },
    ],
  ])('mounts when showPopover is %s', (_name, value) => {
    stubShowPopover(value);
    expect(() => mountUiRoot(document)).not.toThrow();
    expect(host()).not.toBeNull();
  });

  it('unmounts once, and is safe to repeat or after the page removed the host', () => {
    stubShowPopover(undefined);
    const ui = mountUiRoot(document);
    ui.unmount();
    expect(host()).toBeNull();
    expect(() => {
      ui.unmount();
    }).not.toThrow();

    const second = mountUiRoot(document);
    host()?.remove();
    expect(() => {
      second.unmount();
    }).not.toThrow();
  });
});
