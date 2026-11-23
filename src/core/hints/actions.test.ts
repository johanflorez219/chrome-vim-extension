import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageClient } from '../../messaging/client';

import { createHintActions, simulateClick, type HintAction } from './actions';
import type { Geometry, Rect } from './geometry';

const BOX: Rect = { left: 10, top: 20, width: 40, height: 10 };

const rects = vi.fn<Geometry['rects']>(() => [BOX]);
const writeClipboard = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
const openTab = vi.fn<MessageClient['openTab']>(() => Promise.resolve());

const geometry = { rects: (element: Element) => rects(element) };
const perform = createHintActions({
  geometry,
  writeClipboard: (text) => writeClipboard(text),
  client: { openTab: (url) => openTab(url) },
});

const MOUSE_TYPES = [
  'pointerover',
  'pointerenter',
  'mouseover',
  'mouseenter',
  'pointerdown',
  'mousedown',
  'pointerup',
  'mouseup',
  'click',
] as const;

function add(
  tag: string,
  attributes: Record<string, string> = {},
  parent: Node = document.body,
): HTMLElement {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  parent.appendChild(element);
  return element;
}

function record(target: EventTarget, types: readonly string[]): Event[] {
  const events: Event[] = [];
  for (const type of types) {
    target.addEventListener(type, (event) => {
      events.push(event);
    });
  }
  return events;
}

/** A click listener that records the event and cancels it, so jsdom does not navigate. */
function cancelClicks(link: Element): Event[] {
  const events: Event[] = [];
  link.addEventListener('click', (event) => {
    events.push(event);
    event.preventDefault();
  });
  return events;
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  rects.mockReset();
  rects.mockReturnValue([BOX]);
  writeClipboard.mockReset();
  writeClipboard.mockResolvedValue(undefined);
  openTab.mockReset();
  openTab.mockResolvedValue(undefined);
  const base = document.createElement('base');
  base.setAttribute('href', 'https://x.test/dir/');
  document.head.appendChild(base);
});

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe('simulateClick', () => {
  it('dispatches the mouse sequence in order, with focus after mousedown', () => {
    const button = add('button');
    const events = record(button, [...MOUSE_TYPES, 'focus']);

    simulateClick(button, geometry);

    expect(events.map((event) => event.type)).toStrictEqual([
      'pointerover',
      'pointerenter',
      'mouseover',
      'mouseenter',
      'pointerdown',
      'mousedown',
      'focus',
      'pointerup',
      'mouseup',
      'click',
    ]);
    expect(rects).toHaveBeenCalledWith(button);
  });

  it('sets the event properties a real click has', () => {
    const button = add('button');
    const events = record(button, MOUSE_TYPES);

    simulateClick(button, geometry);

    for (const event of events) {
      expect(event).toBeInstanceOf(MouseEvent);
      const mouse = event as MouseEvent;
      expect(mouse.clientX).toBe(30);
      expect(mouse.clientY).toBe(25);
      expect(mouse.button).toBe(0);
      expect(mouse.detail).toBe(1);
      expect(mouse.composed).toBe(true);
      expect(mouse.cancelable).toBe(true);
      const enter = event.type === 'pointerenter' || event.type === 'mouseenter';
      expect(event.bubbles).toBe(!enter);
      const pressed = event.type === 'pointerdown' || event.type === 'mousedown';
      expect(mouse.buttons).toBe(pressed ? 1 : 0);
      if (event.type.startsWith('pointer')) {
        expect(event).toBeInstanceOf(PointerEvent);
        const pointer = event as PointerEvent;
        expect(pointer.pointerType).toBe('mouse');
        expect(pointer.isPrimary).toBe(true);
        expect(pointer.pointerId).toBe(1);
      }
    }
  });

  it('clicks at the centre of the first non-empty rect', () => {
    rects.mockReturnValue([
      { left: 5, top: 5, width: 0, height: 8 },
      { left: 100, top: 0, width: 20, height: 20 },
    ]);
    const button = add('button');
    const events = record(button, ['click']);

    simulateClick(button, geometry);

    const click = events[0] as MouseEvent;
    expect(click.clientX).toBe(110);
    expect(click.clientY).toBe(10);
  });

  it('clicks at 0, 0 when the element has no rect', () => {
    rects.mockReturnValue([]);
    const button = add('button');
    const events = record(button, ['click']);

    simulateClick(button, geometry);

    const click = events[0] as MouseEvent;
    expect(click.clientX).toBe(0);
    expect(click.clientY).toBe(0);
  });

  it.each<readonly [string, () => Element]>([
    ['a button', () => add('button')],
    ['a button with tabindex -1', () => add('button', { tabindex: '-1' })],
    ['a div with tabindex -1', () => add('div', { tabindex: '-1' })],
    [
      'a link',
      () => {
        const link = add('a', { href: '/x' });
        cancelClicks(link);
        return link;
      },
    ],
  ])('focuses %s without scrolling', (_name, build) => {
    const element = build();
    const focus = vi.spyOn(element as HTMLElement, 'focus');

    simulateClick(element, geometry);

    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  });

  it("doesn't focus an element that can't take focus", () => {
    const div = add('div', { role: 'button' });
    const focus = vi.spyOn(div, 'focus');

    simulateClick(div, geometry);

    expect(focus).not.toHaveBeenCalled();
  });

  it('keeps dispatching but skips focus when the page cancels mousedown', () => {
    const button = add('button');
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    const events = record(button, ['click']);
    const focus = vi.spyOn(button, 'focus');

    simulateClick(button, geometry);

    expect(events).toHaveLength(1);
    expect(focus).not.toHaveBeenCalled();
  });

  it('runs the native activation of the dispatched click', () => {
    const checkbox = add('input', { type: 'checkbox' });

    simulateClick(checkbox, geometry);

    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });
});

describe('createHintActions', () => {
  it('click clicks a button', () => {
    const button = add('button');
    const events = record(button, ['click']);

    perform('click', button);

    expect(events).toHaveLength(1);
  });

  it.each<readonly [string, () => Element]>([
    ['a text input', () => add('input')],
    ['a textarea', () => add('textarea')],
    ['a contenteditable host', () => add('div', { contenteditable: 'true' })],
    ['a select', () => add('select')],
  ])('click focuses %s instead of clicking it', (_name, build) => {
    const element = build();
    const events = record(element, MOUSE_TYPES);
    const focus = vi.spyOn(element as HTMLElement, 'focus');

    perform('click', element);

    expect(events).toHaveLength(0);
    expect(focus).toHaveBeenCalledOnce();
  });

  it("click moves the document's focus to a text input", () => {
    const input = add('input');

    perform('click', input);

    expect(document.activeElement).toBe(input);
  });

  it('click clicks a link inside an editor', () => {
    const host = add('div', { contenteditable: 'true' });
    const link = add('a', { href: '/e' }, host);
    const events = cancelClicks(link);

    perform('click', link);

    expect(events).toHaveLength(1);
  });

  it.each<HintAction>(['click', 'openTab', 'copyUrl'])(
    'does nothing to a detached link for %s',
    (action) => {
      const link = document.createElement('a');
      link.setAttribute('href', '/x');
      const events = record(link, MOUSE_TYPES);

      perform(action, link);

      expect(events).toHaveLength(0);
      expect(writeClipboard).not.toHaveBeenCalled();
      expect(openTab).not.toHaveBeenCalled();
    },
  );

  it.each<HintAction>(['click', 'openTab', 'copyUrl'])(
    'does nothing to a disabled button for %s',
    (action) => {
      const button = add('button', { disabled: '' });
      const events = record(button, MOUSE_TYPES);

      perform(action, button);

      expect(events).toHaveLength(0);
      expect(openTab).not.toHaveBeenCalled();
    },
  );

  it('does nothing to an aria-disabled button or one inside inert', () => {
    const ariaButton = add('button', { 'aria-disabled': 'true' });
    const inert = add('div', { inert: '' });
    const inertButton = add('button', {}, inert);
    const ariaEvents = record(ariaButton, MOUSE_TYPES);
    const inertEvents = record(inertButton, MOUSE_TYPES);

    perform('click', ariaButton);
    perform('click', inertButton);

    expect(ariaEvents).toHaveLength(0);
    expect(inertEvents).toHaveLength(0);
  });

  it('does nothing to a disabled text input', () => {
    const input = add('input', { disabled: '' });
    const focus = vi.spyOn(input, 'focus');

    perform('click', input);

    expect(focus).not.toHaveBeenCalled();
  });

  it('openTab opens an http(s) link in a background tab', () => {
    const link = add('a', { href: '/b' });
    const events = cancelClicks(link);

    perform('openTab', link);

    expect(openTab).toHaveBeenCalledExactlyOnceWith('https://x.test/b');
    expect(events).toHaveLength(0);
  });

  it.each(['javascript:void(0)', 'mailto:a@b.test'])(
    'openTab clicks a link it cannot open: %s',
    (href) => {
      const link = add('a', { href });
      const events = cancelClicks(link);

      perform('openTab', link);

      expect(openTab).not.toHaveBeenCalled();
      expect(events).toHaveLength(1);
    },
  );

  it('openTab clicks a button', () => {
    const button = add('button');
    const events = record(button, ['click']);

    perform('openTab', button);

    expect(events).toHaveLength(1);
    expect(openTab).not.toHaveBeenCalled();
  });

  it('openTab focuses a text input', () => {
    const input = add('input');
    const focus = vi.spyOn(input, 'focus');

    perform('openTab', input);

    expect(focus).toHaveBeenCalledOnce();
    expect(openTab).not.toHaveBeenCalled();
  });

  it("copyUrl writes the link's absolute URL", () => {
    const link = add('a', { href: 'c?q=1' });

    perform('copyUrl', link);

    expect(writeClipboard).toHaveBeenCalledExactlyOnceWith('https://x.test/dir/c?q=1');
  });

  it('copyUrl swallows a rejected copy', async () => {
    writeClipboard.mockRejectedValue(new Error('denied'));
    const link = add('a', { href: '/x' });

    expect(() => {
      perform('copyUrl', link);
    }).not.toThrow();
    await flush();
  });

  it('copyUrl swallows a synchronous throw', async () => {
    writeClipboard.mockImplementation(() => {
      throw new TypeError('no clipboard');
    });
    const link = add('a', { href: '/x' });

    expect(() => {
      perform('copyUrl', link);
    }).not.toThrow();
    await flush();
  });

  it('copyUrl does nothing for an element without a URL', () => {
    const button = add('button');
    const events = record(button, ['click']);

    perform('copyUrl', button);

    expect(writeClipboard).not.toHaveBeenCalled();
    expect(events).toHaveLength(0);
  });

  it('uses the URL only for its own action', () => {
    const link = add('a', { href: '/u' });
    cancelClicks(link);

    perform('click', link);
    expect(writeClipboard).not.toHaveBeenCalled();
    expect(openTab).not.toHaveBeenCalled();

    perform('copyUrl', link);
    expect(writeClipboard).toHaveBeenCalledOnce();
    expect(openTab).not.toHaveBeenCalled();

    perform('openTab', link);
    expect(openTab).toHaveBeenCalledOnce();
    expect(writeClipboard).toHaveBeenCalledOnce();
  });
});
