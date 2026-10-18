import { describe, expect, it } from 'vitest';

import { toKeyNotation, type KeyInput } from './key-notation';

function press(key: string, overrides: Partial<KeyInput> = {}): KeyInput {
  return {
    key,
    code: '',
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    isComposing: false,
    ...overrides,
  };
}

describe('toKeyNotation', () => {
  it('returns printable characters as they are', () => {
    expect(toKeyNotation(press('j'))).toBe('j');
    expect(toKeyNotation(press('$'))).toBe('$');
    expect(toKeyNotation(press('?'))).toBe('?');
  });

  it('keeps the case that Shift produces instead of adding S-', () => {
    expect(toKeyNotation(press('G', { shiftKey: true }))).toBe('G');
  });

  it('names special keys in angle brackets', () => {
    expect(toKeyNotation(press('Escape'))).toBe('<Esc>');
    expect(toKeyNotation(press('Enter'))).toBe('<CR>');
    expect(toKeyNotation(press(' '))).toBe('<Space>');
    expect(toKeyNotation(press('ArrowDown'))).toBe('<Down>');
    expect(toKeyNotation(press('Backspace'))).toBe('<BS>');
    expect(toKeyNotation(press('F5'))).toBe('<F5>');
  });

  it('escapes a literal < so it cannot be confused with notation', () => {
    expect(toKeyNotation(press('<', { shiftKey: true }))).toBe('<lt>');
  });

  it('prefixes Ctrl, Alt and Cmd in Vim order', () => {
    expect(toKeyNotation(press('d', { ctrlKey: true }))).toBe('<C-d>');
    expect(toKeyNotation(press('d', { metaKey: true }))).toBe('<D-d>');
    expect(toKeyNotation(press('d', { ctrlKey: true, altKey: true, code: 'KeyD' }))).toBe(
      '<C-A-d>',
    );
  });

  it('adds S- to special keys, where Shift is not visible in the key', () => {
    expect(toKeyNotation(press('Tab', { shiftKey: true }))).toBe('<S-Tab>');
    expect(toKeyNotation(press('ArrowUp', { ctrlKey: true, shiftKey: true }))).toBe('<C-S-Up>');
  });

  it('uses the physical key for Alt combos, since macOS turns Alt-j into ∆', () => {
    expect(toKeyNotation(press('∆', { altKey: true, code: 'KeyJ' }))).toBe('<A-j>');
    expect(toKeyNotation(press('Ô', { altKey: true, shiftKey: true, code: 'KeyJ' }))).toBe('<A-J>');
  });

  it('keeps the produced character for Alt combos on keys that are not letters', () => {
    expect(toKeyNotation(press('≤', { altKey: true, code: 'Comma' }))).toBe('<A-≤>');
  });

  it('ignores modifier keys pressed on their own', () => {
    for (const key of ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']) {
      expect(toKeyNotation(press(key))).toBeUndefined();
    }
  });

  it('ignores keys while an input method is composing text', () => {
    expect(toKeyNotation(press('a', { isComposing: true }))).toBeUndefined();
    expect(toKeyNotation(press('Process'))).toBeUndefined();
    expect(toKeyNotation(press('Dead'))).toBeUndefined();
    expect(toKeyNotation(press('Unidentified'))).toBeUndefined();
  });
});
