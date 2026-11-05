import { describe, expect, it } from 'vitest';
import { BACKGROUND_COMMAND_NAMES, isMessage } from './protocol';
import type { BackgroundCommandName, Message } from './protocol';

function parse(value: unknown): Message | undefined {
  return isMessage(value) ? value : undefined;
}

describe('isMessage', () => {
  it.each(BACKGROUND_COMMAND_NAMES)('accepts %s without a count', (command) => {
    expect(isMessage({ type: 'runCommand', command })).toBe(true);
  });

  it.each([1, 5, 9999])('accepts count %i', (count) => {
    expect(isMessage({ type: 'runCommand', command: 'tabNext', count })).toBe(true);
  });

  it('accepts an explicit count of undefined', () => {
    expect(isMessage({ type: 'runCommand', command: 'tabNext', count: undefined })).toBe(true);
  });

  it('accepts extra properties on an otherwise valid message', () => {
    expect(isMessage({ type: 'runCommand', command: 'tabNext', extra: 1 })).toBe(true);
  });

  it.each([0, 10000, 1.5, -1, NaN, Infinity, null, '3', {}])('rejects count %s', (count) => {
    expect(isMessage({ type: 'runCommand', command: 'tabNext', count })).toBe(false);
  });

  it.each<readonly [string, unknown]>([
    ['an unknown type', { type: 'x', command: 'tabNext' }],
    ['a wrong-case type', { type: 'RunCommand', command: 'tabNext' }],
    ['an unknown command', { type: 'runCommand', command: 'tabTeleport' }],
    ['a wrong-case command', { type: 'runCommand', command: 'TabNext' }],
    ['a non-string command', { type: 'runCommand', command: 7 }],
    ['a missing command', { type: 'runCommand' }],
    ['a missing type', { command: 'tabNext' }],
    ['null', null],
    ['undefined', undefined],
    ['a string', 'runCommand'],
    ['a number', 1],
    ['an array', ['runCommand', 'tabNext']],
    ['an empty object', {}],
  ])('rejects %s', (_label, value) => {
    expect(isMessage(value)).toBe(false);
  });

  it('narrows to Message', () => {
    const name: BackgroundCommandName | undefined = parse({
      type: 'runCommand',
      command: 'tabNext',
    })?.command;
    expect(name).toBe('tabNext');
  });
});
