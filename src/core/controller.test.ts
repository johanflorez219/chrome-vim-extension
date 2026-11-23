import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createController, type Controller, type ControllerDeps } from './controller';
import type { MessageClient } from '../messaging/client';

import type { PageActions } from './commands/navigation';
import type { Timer } from './modes/normal';
import type { FrameScheduler } from './scroll/scroller';
import type { Geometry, Rect } from './hints/geometry';
import { HINT_ALPHABET } from '../settings/defaults';

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
const openTab = vi.fn<MessageClient['openTab']>(() => Promise.resolve());
const viewport = vi.fn<Geometry['viewport']>(() => ({ left: 0, top: 0, width: 1000, height: 800 }));
const rects = vi.fn<Geometry['rects']>(() => []);
const isRendered = vi.fn<Geometry['isRendered']>(() => true);
const hitTest = vi.fn<Geometry['hitTest']>(() => null);
const boxes = new Map<Element, Rect>();

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
    client: { sendCommand, openTab },
    geometry: {
      viewport: () => viewport(),
      rects: (element) => rects(element),
      isRendered: (element) => isRendered(element),
      hitTest: (x, y) => hitTest(x, y),
    },
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
    openTab,
    viewport,
    rects,
    isRendered,
    hitTest,
  ]) {
    spy.mockClear();
  }
  rects.mockImplementation((element) => {
    const box = boxes.get(element);
    return box === undefined ? [] : [box];
  });
  hitTest.mockImplementation((x, y) => {
    let hit: Element | null = null;
    for (const [element, box] of boxes) {
      if (x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height) {
        hit = element;
      }
    }
    return hit;
  });
});

afterEach(() => {
  controller?.stop();
  controller = undefined;
  boxes.clear();
  // stop() leaves open hints in place until T13, so a failing test must not leak a host
  document.querySelector('vim-hints')?.remove();
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

describe('Hint mode while off', () => {
  it('reads no layout and shows no hints', () => {
    start();
    for (const key of ['j', 'g', 'g', 'x']) {
      press(key);
    }
    press('Escape');

    for (const spy of [viewport, rects, isRendered, hitTest, openTab]) {
      expect(spy).not.toHaveBeenCalled();
    }
    expect(document.querySelector('vim-hints')).toBeNull();
  });
});

describe('link hints', () => {
  const TOP: Rect = { left: 0, top: 0, width: 100, height: 20 };
  const BELOW: Rect = { left: 0, top: 40, width: 100, height: 20 };
  let clicked: string[] = [];

  beforeEach(() => {
    clicked = [];
  });

  function place(element: Element, box: Rect): Element {
    boxes.set(element, box);
    return element;
  }

  function addField(box: Rect): HTMLInputElement {
    return place(addInput(), box) as HTMLInputElement;
  }

  function addButton(id: string, box: Rect): Element {
    const button = document.body.appendChild(document.createElement('button'));
    button.id = id;
    button.addEventListener('click', () => {
      clicked.push(id);
    });
    return place(button, box);
  }

  function addLink(href: string, box: Rect): Element {
    const link = document.body.appendChild(document.createElement('a'));
    link.setAttribute('href', href);
    link.addEventListener('click', (event) => {
      clicked.push('link');
      event.preventDefault();
    });
    return place(link, box);
  }

  const host = (): Element | null => document.querySelector('vim-hints');

  it('f shows hints and a label clicks its element', () => {
    start();
    addButton('first', TOP);
    addButton('second', BELOW);
    expect(press('f').defaultPrevented).toBe(true);
    expect(host()).not.toBeNull();
    expect(press(HINT_ALPHABET[0] ?? 's').defaultPrevented).toBe(true);
    expect(clicked).toStrictEqual(['first']);
    expect(host()).toBeNull();
  });

  it('f with nothing to hint consumes the key and stays in Normal mode', () => {
    start();
    expect(press('f').defaultPrevented).toBe(true);
    expect(host()).toBeNull();
    expect(press('j').defaultPrevented).toBe(true);
    expect(scrollTop()).toBe(60);
  });

  it('Esc removes the hints without clicking', () => {
    start();
    addButton('first', TOP);
    addButton('second', BELOW);
    press('f');
    expect(press('Escape').defaultPrevented).toBe(true);
    expect(host()).toBeNull();
    expect(clicked).toStrictEqual([]);
  });

  it('a count before f is ignored', () => {
    start();
    addButton('first', TOP);
    addButton('second', BELOW);
    press('3');
    press('f');
    press('s');
    expect(clicked).toStrictEqual(['first']);
  });

  it('a held f starts Hint mode once', () => {
    start();
    addButton('first', TOP);
    press('f');
    press('f', { repeat: true });
    expect(host()).not.toBeNull();
    press('s');
    expect(clicked).toStrictEqual(['first']);
  });

  it('F opens a link in a background tab', () => {
    start();
    addLink('https://x.test/a', TOP);
    press('F');
    press('s');
    expect(openTab).toHaveBeenCalledExactlyOnceWith('https://x.test/a');
    expect(clicked).toStrictEqual([]);
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it('yf copies a link URL', () => {
    start();
    addLink('https://x.test/a', TOP);
    press('y');
    press('f');
    press('s');
    expect(writeClipboard).toHaveBeenCalledExactlyOnceWith('https://x.test/a');
    expect(openTab).not.toHaveBeenCalled();
    expect(clicked).toStrictEqual([]);
  });

  it('gi focuses the first text input and enters Insert mode', () => {
    start();
    const [first] = [addField(TOP), addField(BELOW)];
    press('g');
    press('i');
    expect(document.activeElement).toBe(first);
    expect(press('j').defaultPrevented).toBe(false);
  });

  it('2gi focuses the second text input', () => {
    start();
    const [, second] = [addField(TOP), addField(BELOW)];
    press('2');
    press('g');
    press('i');
    expect(document.activeElement).toBe(second);
  });

  it('gi with no text input consumes the keys and stays in Normal mode', () => {
    start();
    expect(press('g').defaultPrevented).toBe(true);
    expect(press('i').defaultPrevented).toBe(true);
    expect(press('j').defaultPrevented).toBe(true);
    expect(scrollTop()).toBe(60);
  });

  it('keys in Insert mode never start hints', () => {
    addInput().focus();
    start();
    const events = ['f', 'F', 'y', 'f', 'g', 'i'].map((key) => press(key));
    expect(events.every((event) => !event.defaultPrevented)).toBe(true);
    expect(host()).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('input'));
  });

  it('a sticky Insert mode from i keeps f as a letter', () => {
    start();
    addButton('first', TOP);
    press('i');
    expect(press('f').defaultPrevented).toBe(false);
    expect(host()).toBeNull();
  });
});
