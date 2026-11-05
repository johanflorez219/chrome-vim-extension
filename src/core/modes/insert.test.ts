import { describe, expect, it, vi } from 'vitest';

import type { KeyPress } from '../key-listener';
import type { ModeMachine } from '../mode-machine';

import { createInsertMode } from './insert';

function setup({ sticky = false, focused = true } = {}) {
  const enter = vi.fn<ModeMachine['enter']>();
  const handleKey = vi.fn<ModeMachine['handleKey']>(() => 'consumed');
  const blurActive = vi.fn<() => void>();
  const mode = createInsertMode({
    machine: { enter, handleKey, isSticky: sticky },
    blurActive,
    editableFocused: () => focused,
  });
  return { mode, enter, handleKey, blurActive };
}

function press(key: string, repeat = false): KeyPress {
  return { key, repeat };
}

function firstCall(spy: { mock: { invocationCallOrder: number[] } }): number {
  return spy.mock.invocationCallOrder[0] ?? Number.NaN;
}

describe('createInsertMode', () => {
  it('is named insert', () => {
    expect(setup().mode.name).toBe('insert');
  });

  it.each(['j', '<C-d>', 'G', 'i'])('lets %s reach the page', (key) => {
    const { mode, enter, handleKey, blurActive } = setup();

    expect(mode.handleKey(press(key))).toBe('passed');
    expect(enter).not.toHaveBeenCalled();
    expect(handleKey).not.toHaveBeenCalled();
    expect(blurActive).not.toHaveBeenCalled();
  });

  it.each(['<Esc>', '<C-[>'])('returns to Normal mode on %s and consumes it', (key) => {
    const { mode, enter } = setup();

    expect(mode.handleKey(press(key))).toBe('consumed');
    expect(enter).toHaveBeenCalledTimes(1);
    expect(enter.mock.calls[0]).toEqual(['normal']);
  });

  it('blurs the focused field before returning to Normal mode', () => {
    const { mode, enter, blurActive } = setup({ focused: true });

    mode.handleKey(press('<Esc>'));

    expect(blurActive).toHaveBeenCalledTimes(1);
    expect(firstCall(blurActive)).toBeLessThan(firstCall(enter));
  });

  it('does not blur when no field has focus', () => {
    const { mode, enter, blurActive } = setup({ sticky: true, focused: false });

    expect(mode.handleKey(press('<Esc>'))).toBe('consumed');
    expect(blurActive).not.toHaveBeenCalled();
    expect(enter).toHaveBeenCalledWith('normal');
  });

  it('leaves sticky Insert mode on <Esc> while a field has focus', () => {
    const { mode, enter, blurActive } = setup({ sticky: true, focused: true });

    expect(mode.handleKey(press('<C-[>'))).toBe('consumed');
    expect(blurActive).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledWith('normal');
  });

  it('consumes <Esc> even after the focused field is gone', () => {
    const { mode, enter, handleKey, blurActive } = setup({ sticky: false, focused: false });

    expect(mode.handleKey(press('<Esc>'))).toBe('consumed');
    expect(enter).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledWith('normal');
    expect(handleKey).not.toHaveBeenCalled();
    expect(blurActive).not.toHaveBeenCalled();
  });

  it('drops to Normal mode and hands the key over when no field has focus any more', () => {
    const { mode, enter, handleKey } = setup({ sticky: false, focused: false });
    const held = press('j', true);

    expect(mode.handleKey(held)).toBe('consumed');
    expect(enter).toHaveBeenCalledTimes(1);
    expect(enter.mock.calls[0]).toEqual(['normal']);
    expect(handleKey).toHaveBeenCalledTimes(1);
    expect(handleKey.mock.calls[0]?.[0]).toBe(held);
    expect(firstCall(enter)).toBeLessThan(firstCall(handleKey));
  });

  it('stays in sticky Insert mode when no field has focus', () => {
    const { mode, enter, handleKey } = setup({ sticky: true, focused: false });

    expect(mode.handleKey(press('j'))).toBe('passed');
    expect(enter).not.toHaveBeenCalled();
    expect(handleKey).not.toHaveBeenCalled();
  });
});
