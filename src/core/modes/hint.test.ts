import { describe, expect, it, vi } from 'vitest';

import type { HintOverlay } from '../../ui/hints';
import type { HintAction } from '../hints/actions';
import type { Finder, HintTarget } from '../hints/finder';
import type { Rect } from '../hints/geometry';
import type { KeyPress, KeyResult } from '../key-listener';
import { createModeMachine } from '../mode-machine';

import { createHintMode, type HintMode } from './hint';

const R1: Rect = { left: 10, top: 10, width: 40, height: 10 };
const R2: Rect = { left: 60, top: 10, width: 40, height: 10 };
const R3: Rect = { left: 110, top: 10, width: 40, height: 10 };

// Vitest compares DOM nodes with isEqualNode, so the three buttons need different ids
function button(id: string): HTMLElement {
  const element = document.createElement('button');
  element.id = id;
  return element;
}

const EL1 = button('one');
const EL2 = button('two');
const EL3 = button('three');
const TARGETS: readonly HintTarget[] = [
  { element: EL1, rect: R1 },
  { element: EL2, rect: R2 },
  { element: EL3, rect: R3 },
];

function setup() {
  const log: string[] = [];
  const find = vi.fn<Finder['find']>(() => {
    log.push('find');
    return TARGETS;
  });
  const show = vi.fn<HintOverlay['show']>();
  const filter = vi.fn<HintOverlay['filter']>();
  const remove = vi.fn<HintOverlay['remove']>(() => {
    log.push('remove');
  });
  const perform = vi.fn<(action: HintAction, element: Element) => void>((action) => {
    log.push(`perform:${action}:${machine.current}`);
  });
  const stopScrolling = vi.fn<() => void>(() => {
    log.push('stopScrolling');
  });
  const stopWatch = vi.fn<() => void>();
  const watchPage = vi.fn<(hinted: readonly Element[], onChange: () => void) => () => void>(
    () => stopWatch,
  );
  const normalKey = vi.fn<(press: KeyPress) => KeyResult>(() => 'passed');
  const hint: HintMode = createHintMode({
    machine: {
      enter: (name, options) => {
        machine.enter(name, options);
      },
    },
    finder: { find: (filter) => find(filter) },
    overlay: {
      show: (views) => {
        show(views);
      },
      filter: (visible, typed) => {
        filter(visible, typed);
      },
      remove: () => {
        remove();
      },
    },
    alphabet: 'ab',
    perform: (action, element) => {
      perform(action, element);
    },
    stopScrolling: () => {
      stopScrolling();
    },
    watchPage: (hinted, onChange) => watchPage(hinted, onChange),
  });
  const machine = createModeMachine(
    [
      { name: 'normal', handleKey: (press) => normalKey(press) },
      { name: 'insert', handleKey: () => 'passed' },
      hint,
      { name: 'help', handleKey: () => 'consumed' },
      { name: 'find', handleKey: () => 'consumed' },
    ],
    'normal',
  );
  const key = (name: string, repeat = false): KeyResult => machine.handleKey({ key: name, repeat });
  return {
    hint,
    machine,
    log,
    find,
    show,
    filter,
    remove,
    perform,
    stopScrolling,
    stopWatch,
    watchPage,
    normalKey,
    key,
  };
}

describe('HintMode.start', () => {
  it('stops scrolling before finding targets', () => {
    const { hint, log } = setup();
    hint.start('click');
    expect(log.slice(0, 2)).toStrictEqual(['stopScrolling', 'find']);
  });

  it.each<readonly [HintAction, string]>([
    ['click', 'clickable'],
    ['openTab', 'clickable'],
    ['copyUrl', 'copyableLink'],
  ])('finds %s targets with the %s filter', (action, filter) => {
    const { hint, find } = setup();
    hint.start(action);
    expect(find).toHaveBeenCalledExactlyOnceWith(filter);
  });

  it('enters Hint mode and shows one labelled hint per target', () => {
    const { hint, machine, show } = setup();
    hint.start('click');
    expect(machine.current).toBe('hint');
    expect(show).toHaveBeenCalledExactlyOnceWith([
      { label: 'b', rect: R1 },
      { label: 'aa', rect: R2 },
      { label: 'ab', rect: R3 },
    ]);
  });

  it('stays in Normal mode and shows nothing when there are no targets', () => {
    const { hint, machine, find, show, watchPage, stopScrolling } = setup();
    find.mockReturnValueOnce([]);
    hint.start('click');
    expect(machine.current).toBe('normal');
    expect(show).not.toHaveBeenCalled();
    expect(watchPage).not.toHaveBeenCalled();
    expect(stopScrolling).toHaveBeenCalledOnce();
  });

  it('finds and labels again each time it starts', () => {
    const { hint, key, find, show, perform } = setup();
    hint.start('click');
    key('<Esc>');
    find.mockReturnValueOnce([{ element: EL2, rect: R2 }]);
    hint.start('click');
    expect(find).toHaveBeenCalledTimes(2);
    expect(show.mock.calls[1]?.[0]).toStrictEqual([{ label: 'a', rect: R2 }]);
    expect(key('a')).toBe('consumed');
    expect(perform).toHaveBeenCalledExactlyOnceWith('click', EL2);
  });

  it('watches the page with the hinted elements and ends on a change', () => {
    const { hint, machine, watchPage, remove, stopWatch, perform } = setup();
    hint.start('click');
    expect(watchPage).toHaveBeenCalledOnce();
    expect(watchPage.mock.calls[0]?.[0]).toStrictEqual([EL1, EL2, EL3]);
    watchPage.mock.calls[0]?.[1]?.();
    expect(machine.current).toBe('normal');
    expect(remove).toHaveBeenCalledOnce();
    expect(stopWatch).toHaveBeenCalledOnce();
    expect(perform).not.toHaveBeenCalled();
  });
});

describe('Hint mode keys', () => {
  it.each(['<C-t>', '<A-x>', '<D-c>', '<C-S-Tab>', '<S-D-Tab>', '<C-lt>'])(
    'ends on %s and passes it on to the page',
    (name) => {
      const { hint, machine, key, remove, perform } = setup();
      hint.start('click');
      expect(key(name)).toBe('passed');
      expect(machine.current).toBe('normal');
      expect(remove).toHaveBeenCalledOnce();
      expect(perform).not.toHaveBeenCalled();
    },
  );

  it.each(['<Esc>', '<C-[>'])('ends on %s without an action', (name) => {
    const { hint, machine, key, remove, perform } = setup();
    hint.start('click');
    expect(key(name)).toBe('consumed');
    expect(machine.current).toBe('normal');
    expect(remove).toHaveBeenCalledOnce();
    expect(perform).not.toHaveBeenCalled();
  });

  it('ignores auto-repeated keys', () => {
    const { hint, machine, key, filter, remove, perform } = setup();
    hint.start('click');
    expect(key('b', true)).toBe('consumed');
    expect(key('<Esc>', true)).toBe('consumed');
    expect(machine.current).toBe('hint');
    expect(filter).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(perform).not.toHaveBeenCalled();
  });

  it('narrows the hints as letters are typed', () => {
    const { hint, machine, key, filter } = setup();
    hint.start('click');
    expect(key('a')).toBe('consumed');
    expect(machine.current).toBe('hint');
    expect(filter).toHaveBeenCalledExactlyOnceWith([1, 2], 1);
  });

  it('matches upper-case letters too', () => {
    const { hint, key, filter } = setup();
    hint.start('click');
    expect(key('A')).toBe('consumed');
    expect(filter).toHaveBeenCalledExactlyOnceWith([1, 2], 1);
  });

  it('<BS> removes the last typed letter', () => {
    const { hint, machine, key, filter } = setup();
    hint.start('click');
    key('a');
    expect(key('<BS>')).toBe('consumed');
    expect(machine.current).toBe('hint');
    expect(filter.mock.lastCall).toStrictEqual([[0, 1, 2], 0]);
  });

  it('<BS> with nothing typed does nothing', () => {
    const { hint, machine, key, filter } = setup();
    hint.start('click');
    expect(key('<BS>')).toBe('consumed');
    expect(machine.current).toBe('hint');
    expect(filter).not.toHaveBeenCalled();
  });

  it('a full label removes the hints, returns to Normal mode, then runs the action', () => {
    const { hint, key, perform, log } = setup();
    hint.start('click');
    expect(key('b')).toBe('consumed');
    expect(perform).toHaveBeenCalledExactlyOnceWith('click', EL1);
    expect(log.slice(-2)).toStrictEqual(['remove', 'perform:click:normal']);
  });

  it('runs the action of the start that is in effect', () => {
    const first = setup();
    first.hint.start('click');
    first.key('a');
    first.key('b');
    expect(first.perform).toHaveBeenCalledExactlyOnceWith('click', EL3);

    const copy = setup();
    copy.hint.start('copyUrl');
    copy.key('b');
    expect(copy.perform).toHaveBeenCalledExactlyOnceWith('copyUrl', EL1);

    const open = setup();
    open.hint.start('openTab');
    open.key('B');
    expect(open.perform).toHaveBeenCalledExactlyOnceWith('openTab', EL1);
  });

  it.each(['x', '1', '<CR>', '<Space>', '<S-Tab>', '<lt>', '<F5>'])(
    'ends on %s without an action and consumes it',
    (name) => {
      const { hint, machine, key, remove, perform } = setup();
      hint.start('click');
      expect(key(name)).toBe('consumed');
      expect(machine.current).toBe('normal');
      expect(remove).toHaveBeenCalledOnce();
      expect(perform).not.toHaveBeenCalled();
    },
  );

  it('leaving Hint mode stops watching, removes the hints and hands keys back', () => {
    const { hint, key, stopWatch, remove, normalKey, perform } = setup();
    hint.start('click');
    key('<Esc>');
    expect(stopWatch).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(key('b')).toBe('passed');
    expect(normalKey).toHaveBeenCalledWith({ key: 'b', repeat: false });
    expect(perform).not.toHaveBeenCalled();
  });

  it('leaves Hint mode when Insert mode is entered', () => {
    const { hint, machine, stopWatch, remove } = setup();
    hint.start('click');
    machine.enter('insert');
    expect(stopWatch).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });

  it('starts no watcher while Hint mode is off', () => {
    const { hint, watchPage, find } = setup();
    expect(watchPage).not.toHaveBeenCalled();
    find.mockReturnValueOnce([]);
    hint.start('click');
    expect(watchPage).not.toHaveBeenCalled();
    hint.start('click');
    expect(watchPage).toHaveBeenCalledOnce();
  });
});
