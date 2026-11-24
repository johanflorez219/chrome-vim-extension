import { describe, expect, it, vi } from 'vitest';

import type { CommandRegistry } from '../commands/registry';
import type { KeyPress } from '../key-listener';
import { buildKeymapTrie, type KeymapEntry } from '../keymap-trie';
import type { ModeMachine } from '../mode-machine';

import { createNormalMode, type Timer } from './normal';

// `g i` is a stand-in for focusInput until T12 maps it
const WITH_GI: readonly KeymapEntry[] = [
  { keys: ['g', 'g'], command: 'scrollToTop' },
  { keys: ['g', 'i'], command: 'scrollToBottom' },
];

function setup(options?: {
  editableFocused?: boolean;
  keymap?: readonly KeymapEntry[];
  onPendingChange?: () => void;
}) {
  const callbacks = new Map<number, () => void>();
  let lastId = 0;
  const set = vi.fn<Timer['set']>((callback) => {
    lastId += 1;
    callbacks.set(lastId, callback);
    return lastId;
  });
  const clear = vi.fn<Timer['clear']>((id) => {
    callbacks.delete(id);
  });
  const fire = (id: number): void => {
    const callback = callbacks.get(id);
    callbacks.delete(id);
    callback?.();
  };
  const run = vi.fn<CommandRegistry['run']>();
  const enter = vi.fn<ModeMachine['enter']>();
  const normal = createNormalMode({
    machine: { enter },
    trie: buildKeymapTrie(
      options?.keymap ?? [
        { keys: ['j'], command: 'scrollDown' },
        { keys: ['g', 'g'], command: 'scrollToTop' },
      ],
    ),
    registry: { run },
    timer: { set, clear },
    editableFocused: () => options?.editableFocused ?? false,
    onPendingChange: options?.onPendingChange ?? (() => undefined),
  });
  return { normal, run, enter, set, clear, fire };
}

function press(key: string, repeat = false): KeyPress {
  return { key, repeat };
}

describe('createNormalMode', () => {
  it('is named normal', () => {
    expect(setup().normal.name).toBe('normal');
  });

  it('runs a mapped command and consumes the key', () => {
    const { normal, run } = setup();

    expect(normal.handleKey(press('j'))).toBe('consumed');
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('scrollDown', { count: undefined, repeat: false });
  });

  it('passes the key repeat flag to the command', () => {
    const { normal, run } = setup();

    normal.handleKey(press('j', true));

    expect(run).toHaveBeenCalledWith('scrollDown', { count: undefined, repeat: true });
  });

  it('passes a count to the command', () => {
    const { normal, run } = setup();

    expect(normal.handleKey(press('3'))).toBe('consumed');
    normal.handleKey(press('j'));

    expect(run).toHaveBeenCalledWith('scrollDown', { count: 3, repeat: false });
  });

  it('lets an unmapped key reach the page', () => {
    const { normal, run, set } = setup();

    expect(normal.handleKey(press('x'))).toBe('passed');
    expect(run).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('consumes the first key of a sequence and waits', () => {
    const { normal, run, set } = setup();

    expect(normal.handleKey(press('g'))).toBe('consumed');
    expect(run).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it('discards pending keys after 1000 ms', () => {
    const { normal, run, fire } = setup();

    normal.handleKey(press('g'));
    fire(1);

    expect(normal.handleKey(press('g'))).toBe('consumed');
    expect(run).not.toHaveBeenCalled();
  });

  it('restarts the timeout on each pending key', () => {
    const { normal, run, set, clear, fire } = setup();

    normal.handleKey(press('5'));
    normal.handleKey(press('g'));

    expect(clear).toHaveBeenCalledWith(1);
    expect(set).toHaveBeenCalledTimes(2);
    expect(set.mock.calls.map((call) => call[1])).toEqual([1000, 1000]);

    fire(2);
    normal.handleKey(press('g'));

    expect(run).not.toHaveBeenCalled();
  });

  it('clears the timeout when a command runs', () => {
    const { normal, run, set, clear } = setup();

    normal.handleKey(press('g'));
    normal.handleKey(press('g'));

    expect(run).toHaveBeenCalledWith('scrollToTop', { count: undefined, repeat: false });
    expect(clear).toHaveBeenCalledWith(1);
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('clears the timeout when a key breaks the sequence and is unmapped', () => {
    const { normal, run, clear } = setup();

    normal.handleKey(press('g'));

    expect(normal.handleKey(press('x'))).toBe('passed');
    expect(clear).toHaveBeenCalledWith(1);

    normal.handleKey(press('g'));

    expect(run).not.toHaveBeenCalled();
  });

  it('enters sticky Insert mode on i and consumes it', () => {
    const { normal, run, enter } = setup();

    expect(normal.handleKey(press('i'))).toBe('consumed');
    expect(enter).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledWith('insert', { sticky: true });
    expect(run).not.toHaveBeenCalled();
  });

  it('drops pending keys before entering Insert mode on i', () => {
    const { normal, run, clear } = setup();

    normal.handleKey(press('g'));
    normal.handleKey(press('i'));

    expect(clear).toHaveBeenCalledWith(1);
    expect(normal.handleKey(press('g'))).toBe('consumed');
    expect(run).not.toHaveBeenCalled();
  });

  it('discards pending keys on <Esc> and consumes it', () => {
    const { normal, run, clear } = setup();

    normal.handleKey(press('g'));

    expect(normal.handleKey(press('<Esc>'))).toBe('consumed');
    expect(clear).toHaveBeenCalledWith(1);

    normal.handleKey(press('g'));

    expect(run).not.toHaveBeenCalled();

    const counted = setup();
    counted.normal.handleKey(press('3'));
    counted.normal.handleKey(press('<Esc>'));
    counted.normal.handleKey(press('j'));

    expect(counted.run).toHaveBeenCalledWith('scrollDown', { count: undefined, repeat: false });
  });

  it('lets <Esc> reach the page when nothing is pending', () => {
    const { normal, run, set, clear } = setup();

    expect(normal.handleKey(press('<Esc>'))).toBe('passed');
    expect(run).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });

  it('drops pending keys when the mode exits', () => {
    const { normal, run, clear } = setup();

    normal.handleKey(press('g'));
    normal.onExit();

    expect(clear).toHaveBeenCalledWith(1);

    normal.handleKey(press('g'));

    expect(run).not.toHaveBeenCalled();
  });

  it('drops pending keys on reset()', () => {
    const { normal, run, clear } = setup();

    normal.handleKey(press('5'));
    normal.reset();

    expect(clear).toHaveBeenCalledWith(1);

    normal.handleKey(press('j'));

    expect(run).toHaveBeenCalledWith('scrollDown', { count: undefined, repeat: false });
  });

  it('switches to Insert mode and passes the key when an editable element has focus', () => {
    const { normal, run, enter } = setup({ editableFocused: true });

    expect(normal.handleKey(press('j'))).toBe('passed');
    expect(enter).toHaveBeenCalledTimes(1);
    expect(enter.mock.calls[0]).toEqual(['insert']);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('createNormalMode and i', () => {
  it('lets i finish a mapped sequence instead of entering Insert mode', () => {
    const { normal, run, enter } = setup({ keymap: WITH_GI });
    expect(normal.handleKey(press('g'))).toBe('consumed');
    expect(normal.handleKey(press('i'))).toBe('consumed');
    expect(run).toHaveBeenCalledExactlyOnceWith('scrollToBottom', {
      count: undefined,
      repeat: false,
    });
    expect(enter).not.toHaveBeenCalled();
  });

  it('passes the count to a sequence that ends in i', () => {
    const { normal, run, enter } = setup({ keymap: WITH_GI });
    normal.handleKey(press('2'));
    normal.handleKey(press('g'));
    normal.handleKey(press('i'));
    expect(run).toHaveBeenCalledExactlyOnceWith('scrollToBottom', { count: 2, repeat: false });
    expect(enter).not.toHaveBeenCalled();
  });

  it('still enters sticky Insert mode on i after a count', () => {
    const { normal, run, enter } = setup({ keymap: WITH_GI });
    normal.handleKey(press('3'));
    expect(normal.handleKey(press('i'))).toBe('consumed');
    expect(enter).toHaveBeenCalledExactlyOnceWith('insert', { sticky: true });
    expect(run).not.toHaveBeenCalled();
  });

  it('enters sticky Insert mode on i once a pending sequence timed out', () => {
    const { normal, run, enter, fire } = setup({ keymap: WITH_GI });
    normal.handleKey(press('g'));
    fire(1);
    normal.handleKey(press('i'));
    expect(enter).toHaveBeenCalledExactlyOnceWith('insert', { sticky: true });
    expect(run).not.toHaveBeenCalled();
  });

  it('enters sticky Insert mode on i after a prefix with no i continuation', () => {
    const { normal, run, enter } = setup({
      keymap: [...WITH_GI, { keys: ['z', 'z'], command: 'scrollDown' }],
    });
    normal.handleKey(press('z'));
    normal.handleKey(press('i'));
    expect(enter).toHaveBeenCalledExactlyOnceWith('insert', { sticky: true });
    expect(run).not.toHaveBeenCalled();
  });
});

describe('pending keys', () => {
  it('shows nothing pending while idle', () => {
    expect(setup().normal.pending()).toBe('');
  });

  it('shows the count and the first key of a sequence that is waiting', () => {
    const { normal } = setup();
    normal.handleKey(press('5'));
    normal.handleKey(press('g'));
    expect(normal.pending()).toBe('5g');
  });

  it('shows nothing after a key that breaks no sequence and is unmapped', () => {
    const { normal } = setup();
    normal.handleKey(press('x'));
    expect(normal.pending()).toBe('');
  });

  it('tells the callback when a key starts a sequence and when it completes', () => {
    const onPendingChange = vi.fn();
    const { normal } = setup({ onPendingChange });
    normal.handleKey(press('g'));
    expect(onPendingChange).toHaveBeenCalledTimes(1);
    normal.handleKey(press('g'));
    expect(onPendingChange).toHaveBeenCalledTimes(2);
    expect(normal.pending()).toBe('');
  });

  it('tells the callback when the timeout drops the pending keys', () => {
    const onPendingChange = vi.fn();
    const { normal, fire, set } = setup({ onPendingChange });
    normal.handleKey(press('g'));
    fire(set.mock.results.at(-1)?.value as number);
    expect(normal.pending()).toBe('');
    expect(onPendingChange).toHaveBeenCalledTimes(2);
  });

  it('does not tell the callback about an unmapped key that passes through while idle', () => {
    const onPendingChange = vi.fn();
    const { normal } = setup({ onPendingChange });
    normal.handleKey(press('x'));
    expect(onPendingChange).not.toHaveBeenCalled();
  });
});
