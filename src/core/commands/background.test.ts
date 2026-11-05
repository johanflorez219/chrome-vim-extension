import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageClient } from '../../messaging/client';
import { BACKGROUND_COMMAND_NAMES, type BackgroundCommandName } from '../../messaging/protocol';

import { createBackgroundCommands } from './background';
import {
  COMMAND_NAMES,
  createCommandRegistry,
  type Command,
  type CommandContext,
} from './registry';

const sendCommand = vi.fn<MessageClient['sendCommand']>(() => Promise.resolve());

function run(name: BackgroundCommandName, ctx: CommandContext): void {
  const command = createBackgroundCommands({ client: { sendCommand } }).find(
    (candidate) => candidate.name === name,
  );
  if (command === undefined) {
    throw new Error(`No command ${name}`);
  }
  command.run(ctx);
}

beforeEach(() => {
  sendCommand.mockClear();
});

describe('createBackgroundCommands', () => {
  it('returns one command per background name, in order', () => {
    const commands = createBackgroundCommands({ client: { sendCommand } });

    expect(commands.map((command) => command.name)).toEqual([...BACKGROUND_COMMAND_NAMES]);
  });

  it.each<readonly [BackgroundCommandName, boolean]>([
    ['tabNext', true],
    ['tabPrevious', true],
    ['tabGoTo', true],
    ['tabFirst', false],
    ['tabLast', false],
    ['tabClose', false],
    ['tabRestore', true],
    ['tabDuplicate', false],
    ['historyBack', true],
    ['historyForward', true],
  ])('marks %s as a background command, count allowed: %s', (name, acceptsCount) => {
    const command = createBackgroundCommands({ client: { sendCommand } }).find(
      (candidate) => candidate.name === name,
    );

    expect(command?.context).toBe('background');
    expect(command?.acceptsCount).toBe(acceptsCount);
    expect(command?.description).not.toBe('');
  });

  it.each(BACKGROUND_COMMAND_NAMES)('%s sends the command and count once', (name) => {
    run(name, { count: 3, repeat: false });

    expect(sendCommand).toHaveBeenCalledOnce();
    expect(sendCommand).toHaveBeenCalledWith(name, 3);
  });

  it.each(BACKGROUND_COMMAND_NAMES)('%s sends undefined when no count was typed', (name) => {
    run(name, { count: undefined, repeat: false });

    expect(sendCommand).toHaveBeenCalledWith(name, undefined);
  });

  it.each(BACKGROUND_COMMAND_NAMES)('%s ignores auto-repeat', (name) => {
    run(name, { count: 1, repeat: true });

    expect(sendCommand).not.toHaveBeenCalled();
  });

  it('drops the count for commands that take none, through a real registry', () => {
    const fakes = COMMAND_NAMES.filter(
      (name) => !BACKGROUND_COMMAND_NAMES.some((background) => background === name),
    ).map((name): Command => ({
      name,
      description: 'fake',
      acceptsCount: true,
      context: 'page',
      run: () => undefined,
    }));
    const registry = createCommandRegistry([
      ...fakes,
      ...createBackgroundCommands({ client: { sendCommand } }),
    ]);

    for (const name of ['tabClose', 'tabFirst', 'tabLast', 'tabDuplicate'] as const) {
      registry.run(name, { count: 4, repeat: false });
      expect(sendCommand).toHaveBeenLastCalledWith(name, undefined);
    }
    registry.run('tabNext', { count: 4, repeat: false });
    expect(sendCommand).toHaveBeenLastCalledWith('tabNext', 4);
  });
});
