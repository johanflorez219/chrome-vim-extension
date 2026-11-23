import { describe, expect, it } from 'vitest';
import { BACKGROUND_COMMAND_NAMES, isMessage } from './protocol';
import type { Message, OpenTabMessage, RunCommandMessage } from './protocol';

function mustParse(value: unknown): Message {
  if (!isMessage(value)) {
    throw new Error('rejected');
  }
  return value;
}

function summary(message: Message): string {
  switch (message.type) {
    case 'runCommand': {
      const run: RunCommandMessage = message;
      return run.command;
    }
    case 'openTab': {
      const open: OpenTabMessage = message;
      return open.url;
    }
  }
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

  it.each(['https://x.test/a?b#c', 'http://x.test/', 'HTTPS://X.TEST/'])(
    'accepts openTab with %s',
    (url) => {
      expect(isMessage({ type: 'openTab', url })).toBe(true);
    },
  );

  it('accepts an openTab URL of exactly 32,768 characters', () => {
    const url = `https://x.test/${'a'.repeat(32_768 - 'https://x.test/'.length)}`;
    expect(isMessage({ type: 'openTab', url })).toBe(true);
  });

  it('accepts extra properties on an openTab message', () => {
    expect(isMessage({ type: 'openTab', url: 'https://x.test/', extra: 1 })).toBe(true);
  });

  it.each<readonly [string, unknown]>([
    ['a javascript: URL', { type: 'openTab', url: 'javascript:alert(1)' }],
    ['a mailto: URL', { type: 'openTab', url: 'mailto:a@b.test' }],
    ['a file: URL', { type: 'openTab', url: 'file:///etc/hosts' }],
    ['a data: URL', { type: 'openTab', url: 'data:text/html,x' }],
    ['a chrome: URL', { type: 'openTab', url: 'chrome://settings' }],
    ['text that is not a URL', { type: 'openTab', url: 'not a url' }],
    ['an empty string', { type: 'openTab', url: '' }],
    ['a relative URL', { type: 'openTab', url: '/relative' }],
    [
      'a URL of 32,769 characters',
      { type: 'openTab', url: `https://x.test/${'a'.repeat(32_769 - 'https://x.test/'.length)}` },
    ],
    ['a number', { type: 'openTab', url: 7 }],
    ['null', { type: 'openTab', url: null }],
    ['undefined', { type: 'openTab', url: undefined }],
    ['an object', { type: 'openTab', url: {} }],
    ['a missing url', { type: 'openTab' }],
  ])('rejects openTab with %s', (_label, value) => {
    expect(isMessage(value)).toBe(false);
  });

  it('narrows each message type', () => {
    expect(summary(mustParse({ type: 'runCommand', command: 'tabNext' }))).toBe('tabNext');
    expect(summary(mustParse({ type: 'openTab', url: 'https://x.test/' }))).toBe('https://x.test/');
  });
});
