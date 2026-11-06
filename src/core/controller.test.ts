import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createController, type Controller, type ControllerDeps } from './controller';
import type { MessageClient } from '../messaging/client';

import type { PageActions } from './commands/navigation';
import type { Timer } from './modes/normal';
import type { FrameScheduler } from './scroll/scroller';

const STUBBED = [
  'scrollHeight',
  'clientHeight',
  'scrollWidth',
  'clientWidth',
  'scrollTop',
  'scrollLeft',
  'scrollTo',
] as const;

const closedRoots = new Map<Element, ShadowRoot>();
let controller: Controller | undefined;
let time = 0;
let lastTimerId = 0;
let lastFrameId = 0;
let queued: ((now: number) => void)[] = [];

const set = vi.fn<Timer['set']>(() => ++lastTimerId);
const clear = vi.fn<Timer['clear']>();
const request = vi.fn<FrameScheduler['request']>((callback) => {
  queued.push(callback);
  return ++lastFrameId;
});
const cancel = vi.fn<FrameScheduler['cancel']>();
const href = vi.fn<PageActions['href']>(() => 'https://x.test/a/b/c');
const navigate = vi.fn<PageActions['navigate']>();
const reload = vi.fn<PageActions['reload']>();
const writeClipboard = vi.fn<PageActions['writeClipboard']>(() => Promise.resolve());
const sendCommand = vi.fn<MessageClient['sendCommand']>(() => Promise.resolve());

function stubDocument(): void {
  const root = document.documentElement;
  let top = 0;
  let left = 0;
  const sizes = { scrollHeight: 3000, clientHeight: 800, scrollWidth: 1000, clientWidth: 1000 };
  for (const [name, value] of Object.entries(sizes)) {
    Object.defineProperty(root, name, { get: () => value, configurable: true });
  }
  Object.defineProperty(root, 'scrollTop', {
    get: () => top,
    set: (value: number) => {
      top = value;
    },
    configurable: true,
  });
  Object.defineProperty(root, 'scrollLeft', {
    get: () => left,
    set: (value: number) => {
      left = value;
    },
    configurable: true,
  });
  // jsdom has no Element.prototype.scrollTo
  const scrollTo = vi.fn<(options: ScrollToOptions) => void>((options) => {
    if (options.top !== undefined) {
      top = options.top;
    }
    if (options.left !== undefined) {
      left = options.left;
    }
  });
  Object.defineProperty(root, 'scrollTo', { value: scrollTo, configurable: true });
}

function start(overrides: Partial<ControllerDeps> = {}): Controller {
  controller = createController({
    window,
    timer: { set, clear },
    frames: { request, cancel },
    now: () => time,
    isValid: () => true,
    isTrusted: () => true,
    shadowRootOf: (host) => closedRoots.get(host) ?? host.shadowRoot,
    prefersReducedMotion: () => true,
    page: { href, navigate, reload, writeClipboard },
    client: { sendCommand },
    ...overrides,
  });
  return controller;
}

function press(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event;
}

function flushFrames(at: number): void {
  time = at;
  const callbacks = queued;
  queued = [];
  for (const callback of callbacks) {
    callback(at);
  }
}

function addInput(): HTMLInputElement {
  return document.body.appendChild(document.createElement('input'));
}

const scrollTop = (): number => document.documentElement.scrollTop;

beforeEach(() => {
  stubDocument();
  // jsdom reports false while focusout runs, which would hide every blur
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  time = 0;
  lastTimerId = 0;
  lastFrameId = 0;
  queued = [];
  for (const spy of [
    set,
    clear,
    request,
    cancel,
    href,
    navigate,
    reload,
    writeClipboard,
    sendCommand,
  ]) {
    spy.mockClear();
  }
});

afterEach(() => {
  controller?.stop();
  controller = undefined;
  document.body.replaceChildren();
  closedRoots.clear();
  for (const name of STUBBED) {
    Reflect.deleteProperty(document.documentElement, name);
  }
});

describe('createController', () => {
  it('starts in Normal mode when no field has focus', () => {
    start();

    expect(press('Escape').defaultPrevented).toBe(false);
    expect(press('j').defaultPrevented).toBe(true);
    expect(scrollTop()).toBe(60);
  });

  it('starts in Insert mode when a text field already has focus', () => {
    addInput().focus();
    start();

    expect(press('Escape').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(document.body);
  });

  it('sees a field in a closed shadow root through shadowRootOf', () => {
    const host = document.body.appendChild(document.createElement('div'));
    const root = host.attachShadow({ mode: 'closed' });
    closedRoots.set(host, root);
    root.appendChild(document.createElement('input')).focus();
    start();

    expect(press('Escape').defaultPrevented).toBe(true);
    expect(root.activeElement).toBeNull();
  });

  it('enters Insert mode when a field gains focus', () => {
    start();

    addInput().focus();

    expect(press('Escape').defaultPrevented).toBe(true);
  });

  it('returns to Normal mode when the field loses focus', () => {
    start();
    const input = addInput();
    input.focus();

    input.blur();

    expect(press('Escape').defaultPrevented).toBe(false);
    expect(press('j').defaultPrevented).toBe(true);
    expect(scrollTop()).toBe(60);
  });

  it('keeps sticky Insert mode across focus changes', () => {
    start();

    expect(press('i').defaultPrevented).toBe(true);

    const input = addInput();
    input.focus();
    input.blur();

    expect(press('j').defaultPrevented).toBe(false);
    expect(scrollTop()).toBe(0);
    expect(press('Escape').defaultPrevented).toBe(true);
    expect(press('j').defaultPrevented).toBe(true);
    expect(scrollTop()).toBe(60);
  });

  it('blurs the focused field on <Esc> and scrolls afterwards', () => {
    start();
    addInput().focus();

    expect(press('Escape').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(document.body);
    expect(press('j').defaultPrevented).toBe(true);
    expect(scrollTop()).toBe(60);
  });

  it('animates with the injected frames and clock', () => {
    start({ prefersReducedMotion: () => false });

    press('j');

    expect(request).toHaveBeenCalled();

    flushFrames(250);

    expect(scrollTop()).toBe(60);
  });

  it('passes every key and stops once the extension is no longer valid', () => {
    let valid = true;
    start({ isValid: () => valid });

    press('j');

    expect(scrollTop()).toBe(60);

    valid = false;

    expect(press('j').defaultPrevented).toBe(false);
    expect(scrollTop()).toBe(60);

    valid = true;

    expect(press('j').defaultPrevented).toBe(false);
    expect(scrollTop()).toBe(60);
  });

  it('removes its listeners and clears the key timer on stop()', () => {
    const started = start();

    expect(press('g').defaultPrevented).toBe(true);
    expect(set).toHaveBeenCalledTimes(1);

    started.stop();

    expect(clear).toHaveBeenCalledWith(set.mock.results[0]?.value);
    expect(press('j').defaultPrevented).toBe(false);
    expect(scrollTop()).toBe(0);
    expect(() => {
      started.stop();
    }).not.toThrow();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('stops a running animation on stop()', () => {
    const started = start({ prefersReducedMotion: () => false });
    press('j');

    started.stop();

    expect(cancel).toHaveBeenCalledWith(request.mock.results[0]?.value);

    flushFrames(250);

    expect(scrollTop()).toBe(0);
  });

  it('never logs keys', () => {
    const debug = vi.spyOn(console, 'debug');
    const log = vi.spyOn(console, 'log');
    const info = vi.spyOn(console, 'info');
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    start();

    for (const key of ['j', '5', 'g', 'g', 'i', 'x', 'Escape', 'j']) {
      press(key);
    }

    for (const spy of [debug, log, info, warn, error]) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
  describe('page commands', () => {
    it('r reloads the page and consumes the key', () => {
      start();

      expect(press('r').defaultPrevented).toBe(true);
      expect(reload).toHaveBeenCalledOnce();
    });

    it('yy copies the URL and consumes both keys', () => {
      start();

      expect(press('y').defaultPrevented).toBe(true);
      expect(press('y').defaultPrevented).toBe(true);
      expect(writeClipboard).toHaveBeenCalledOnce();
      expect(writeClipboard).toHaveBeenCalledWith('https://x.test/a/b/c');
    });

    it('gu goes up a level', () => {
      start();

      press('g');
      press('u');

      expect(navigate).toHaveBeenCalledWith('https://x.test/a/b');
    });

    it('3gu goes three levels', () => {
      start();

      for (const key of ['3', 'g', 'u']) {
        press(key);
      }

      expect(navigate).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith('https://x.test/');
    });

    it.each([['gU'], ['3gU']])('%s goes to the root', (keys) => {
      start();

      for (const key of keys) {
        press(key);
      }

      expect(navigate).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith('https://x.test/');
    });

    it('runs no page command for keys typed in a focused field', () => {
      addInput().focus();
      start();

      const events = ['r', 'y', 'y'].map((key) => press(key));

      expect(reload).not.toHaveBeenCalled();
      expect(writeClipboard).not.toHaveBeenCalled();
      expect(events.map((event) => event.defaultPrevented)).toEqual([false, false, false]);
    });

    it('reloads once for a held r', () => {
      start();

      press('r');
      press('r', { repeat: true });

      expect(reload).toHaveBeenCalledOnce();
    });
  });
  describe('background commands', () => {
    it.each([
      ['J', 'tabNext'],
      ['gt', 'tabGoTo'],
      ['K', 'tabPrevious'],
      ['gT', 'tabPrevious'],
      ['g0', 'tabFirst'],
      ['g$', 'tabLast'],
      ['x', 'tabClose'],
      ['X', 'tabRestore'],
      ['H', 'historyBack'],
      ['L', 'historyForward'],
      ['yt', 'tabDuplicate'],
    ] as const)('sends %s as %s and consumes it', (keys, command) => {
      start();

      const events = keys.split('').map((key) => press(key));

      expect(sendCommand).toHaveBeenCalledOnce();
      expect(sendCommand).toHaveBeenCalledWith(command, undefined);
      expect(events.at(-1)?.defaultPrevented).toBe(true);
    });

    it.each([
      ['3K', 'tabPrevious', 3],
      ['3gt', 'tabGoTo', 3],
      ['2H', 'historyBack', 2],
      ['3X', 'tabRestore', 3],
    ] as const)('passes the count in %s to %s', (keys, command, count) => {
      start();

      for (const key of keys) {
        press(key);
      }

      expect(sendCommand).toHaveBeenCalledOnce();
      expect(sendCommand).toHaveBeenCalledWith(command, count);
    });

    it.each([
      ['2x', 'tabClose'],
      ['2g0', 'tabFirst'],
      ['2yt', 'tabDuplicate'],
    ] as const)('drops the count in %s for %s', (keys, command) => {
      start();

      for (const key of keys) {
        press(key);
      }

      expect(sendCommand).toHaveBeenCalledWith(command, undefined);
    });

    it('treats the 0 in g0 as a key, not a count', () => {
      start();

      press('g');
      press('0');

      expect(sendCommand).toHaveBeenCalledWith('tabFirst', undefined);
      expect(scrollTop()).toBe(0);
    });

    it('sends once for a held x', () => {
      start();

      press('x');
      press('x', { repeat: true });

      expect(sendCommand).toHaveBeenCalledOnce();
    });

    it('sends nothing for keys typed in a field', () => {
      addInput().focus();
      start();

      const events = ['J', 'x', 'H'].map((key) => press(key));

      expect(sendCommand).not.toHaveBeenCalled();
      expect(events.map((event) => event.defaultPrevented)).toEqual([false, false, false]);
    });

    it('keeps working while sendCommand never settles', () => {
      sendCommand.mockReturnValue(new Promise<void>(() => undefined));
      start();

      press('J');
      press('j');

      expect(scrollTop()).toBe(60);
    });
  });
});
