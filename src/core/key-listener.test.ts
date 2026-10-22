import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listenForKeys, type KeyPress, type KeyResult } from './key-listener';

function press(
  target: EventTarget,
  type: 'keydown' | 'keyup',
  init: KeyboardEventInit,
): KeyboardEvent {
  const event = new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

const trusted = (): boolean => true;

describe('listenForKeys', () => {
  let stop: (() => void) | undefined;
  let page: AbortController;

  beforeEach(() => {
    page = new AbortController();
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    page.abort();
  });

  function pageListener(type: 'keydown' | 'keyup'): ReturnType<typeof vi.fn> {
    const spy = vi.fn();
    window.addEventListener(type, spy, { capture: true, signal: page.signal });
    return spy;
  }

  function consumeAll(): ReturnType<typeof vi.fn<(press: KeyPress) => KeyResult>> {
    return vi.fn<(press: KeyPress) => KeyResult>(() => 'consumed');
  }

  function passAll(): ReturnType<typeof vi.fn<(press: KeyPress) => KeyResult>> {
    return vi.fn<(press: KeyPress) => KeyResult>(() => 'passed');
  }

  it('reports each key press in Vim notation with its repeat flag', () => {
    const onKey = passAll();
    stop = listenForKeys(window, onKey, trusted);

    press(document.body, 'keydown', { key: 'j' });
    press(document.body, 'keydown', { key: 'd', ctrlKey: true, repeat: true });

    expect(onKey.mock.calls).toEqual([
      [{ key: 'j', repeat: false }],
      [{ key: '<C-d>', repeat: true }],
    ]);
  });

  it('skips keys that have no notation, such as a lone Shift', () => {
    const onKey = consumeAll();
    stop = listenForKeys(window, onKey, trusted);

    const event = press(document.body, 'keydown', { key: 'Shift', shiftKey: true });

    expect(onKey).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('sees keys before page listeners that stop propagation', () => {
    const onKey = passAll();
    const pageHandler = (event: Event): void => {
      event.stopImmediatePropagation();
    };
    document.addEventListener('keydown', pageHandler, { capture: true, signal: page.signal });
    stop = listenForKeys(window, onKey, trusted);

    press(document.body, 'keydown', { key: 'k' });

    expect(onKey).toHaveBeenCalledWith({ key: 'k', repeat: false });
  });

  it('hides a consumed key from page listeners and prevents its default', () => {
    stop = listenForKeys(window, consumeAll(), trusted);
    const pageKeydown = pageListener('keydown');

    const event = press(document.body, 'keydown', { key: 'j', code: 'KeyJ' });

    expect(pageKeydown).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('lets a passed key reach the page unchanged', () => {
    stop = listenForKeys(window, passAll(), trusted);
    const pageKeydown = pageListener('keydown');

    const event = press(document.body, 'keydown', { key: 'j', code: 'KeyJ' });

    expect(pageKeydown).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it('swallows the keyup of a consumed key', () => {
    stop = listenForKeys(window, consumeAll(), trusted);
    const pageKeyup = pageListener('keyup');

    press(document.body, 'keydown', { key: 'j', code: 'KeyJ' });
    const keyup = press(document.body, 'keyup', { key: 'j', code: 'KeyJ' });

    expect(pageKeyup).not.toHaveBeenCalled();
    expect(keyup.defaultPrevented).toBe(true);

    press(document.body, 'keyup', { key: 'j', code: 'KeyJ' });

    expect(pageKeyup).toHaveBeenCalledTimes(1);
  });

  it('lets the keyup of a passed key through', () => {
    stop = listenForKeys(window, passAll(), trusted);
    const pageKeyup = pageListener('keyup');

    press(document.body, 'keydown', { key: 'j', code: 'KeyJ' });
    const keyup = press(document.body, 'keyup', { key: 'j', code: 'KeyJ' });

    expect(pageKeyup).toHaveBeenCalledTimes(1);
    expect(keyup.defaultPrevented).toBe(false);
  });

  it('lets the keyup through when a later keydown of the same key passed', () => {
    const onKey = passAll().mockReturnValueOnce('consumed');
    stop = listenForKeys(window, onKey, trusted);
    const pageKeyup = pageListener('keyup');

    press(document.body, 'keydown', { key: 'j', code: 'KeyJ' });
    press(document.body, 'keydown', { key: 'j', code: 'KeyJ', repeat: true });
    press(document.body, 'keyup', { key: 'j', code: 'KeyJ' });

    expect(pageKeyup).toHaveBeenCalledTimes(1);
  });

  it('ignores untrusted key events', () => {
    const fakes = new WeakSet<Event>();
    const onKey = consumeAll();
    stop = listenForKeys(window, onKey, (event) => !fakes.has(event));
    const pageKeydown = pageListener('keydown');

    const event = new KeyboardEvent('keydown', {
      key: 'j',
      code: 'KeyJ',
      bubbles: true,
      cancelable: true,
    });
    fakes.add(event);
    document.body.dispatchEvent(event);

    expect(onKey).not.toHaveBeenCalled();
    expect(pageKeydown).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not let an untrusted keyup cancel the swallowing', () => {
    const fakes = new WeakSet<Event>();
    stop = listenForKeys(window, consumeAll(), (event) => !fakes.has(event));
    const pageKeyup = pageListener('keyup');

    press(document.body, 'keydown', { key: 'j', code: 'KeyJ' });
    const fake = new KeyboardEvent('keyup', { key: 'j', code: 'KeyJ', bubbles: true });
    fakes.add(fake);
    document.body.dispatchEvent(fake);
    press(document.body, 'keyup', { key: 'j', code: 'KeyJ' });

    expect(pageKeyup).toHaveBeenCalledTimes(1);
    expect(pageKeyup).toHaveBeenCalledWith(fake);
  });

  it('stops reporting keys and swallowing keyups after the returned function is called', () => {
    const onKey = consumeAll();
    const stopNow = listenForKeys(window, onKey, trusted);
    const pageKeydown = pageListener('keydown');
    const pageKeyup = pageListener('keyup');

    press(document.body, 'keydown', { key: 'j', code: 'KeyJ' });
    stopNow();
    const keyup = press(document.body, 'keyup', { key: 'j', code: 'KeyJ' });
    const keydown = press(document.body, 'keydown', { key: 'j' });

    expect(onKey).toHaveBeenCalledTimes(1);
    expect(pageKeyup).toHaveBeenCalledTimes(1);
    expect(pageKeydown).toHaveBeenCalledTimes(1);
    expect(keyup.defaultPrevented).toBe(false);
    expect(keydown.defaultPrevented).toBe(false);
  });
});
