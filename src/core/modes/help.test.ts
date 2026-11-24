import { describe, expect, it, vi } from 'vitest';

import type { HelpEntry } from '../help/entries';
import type { KeyPress } from '../key-listener';
import type { ModeMachine } from '../mode-machine';

import { createHelpMode } from './help';

const ENTRY: HelpEntry = {
  name: 'scrollDown',
  description: 'Scroll down',
  context: 'page',
  keys: ['j'],
};

function setup() {
  const enter = vi.fn<ModeMachine['enter']>();
  const show = vi.fn<(entries: readonly HelpEntry[]) => void>();
  const hide = vi.fn<() => void>();
  const mode = createHelpMode({
    machine: { enter },
    dialog: { show, hide },
    entries: () => [ENTRY],
  });
  return { mode, enter, show, hide };
}

function press(key: string, repeat = false): KeyPress {
  return { key, repeat };
}

describe('createHelpMode', () => {
  it('is named help', () => {
    expect(setup().mode.name).toBe('help');
  });

  it.each(['?', '<Esc>', '<C-[>'])('leaves to Normal mode on %s and consumes it', (key) => {
    const { mode, enter } = setup();
    expect(mode.handleKey(press(key))).toBe('consumed');
    expect(enter).toHaveBeenCalledWith('normal');
  });

  it.each(['j', '<C-d>', 'z', '<Tab>'])(
    'consumes %s without leaving or passing it on (R2.4)',
    (key) => {
      const { mode, enter } = setup();
      expect(mode.handleKey(press(key))).toBe('consumed');
      expect(enter).not.toHaveBeenCalled();
    },
  );

  it('consumes a repeated key', () => {
    const { mode, enter } = setup();
    expect(mode.handleKey(press('j', true))).toBe('consumed');
    expect(enter).not.toHaveBeenCalled();
  });

  it('shows the dialog with the entries when entered, and hides it when left (R2.1)', () => {
    const { mode, show, hide } = setup();
    mode.onEnter?.({ sticky: false });
    expect(show).toHaveBeenCalledWith([ENTRY]);
    mode.onExit?.();
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
