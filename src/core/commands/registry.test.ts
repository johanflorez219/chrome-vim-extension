import { describe, expect, it, vi, type Mock } from 'vitest';

import {
  COMMAND_NAMES,
  createCommandRegistry,
  type Command,
  type CommandContext,
  type CommandName,
  type CommandRegistry,
} from './registry';

function fakeCommand(
  name: CommandName,
  acceptsCount = true,
): { command: Command; run: Mock<(ctx: CommandContext) => void> } {
  const run = vi.fn<(ctx: CommandContext) => void>();
  const command: Command = {
    name,
    description: `Fake ${name}`,
    acceptsCount,
    context: 'page',
    run,
  };
  return { command, run };
}

function fakeRegistry(noCount: readonly CommandName[] = []): {
  registry: CommandRegistry;
  fakes: Map<CommandName, ReturnType<typeof fakeCommand>>;
} {
  const fakes = new Map(
    COMMAND_NAMES.map((name) => [name, fakeCommand(name, !noCount.includes(name))] as const),
  );
  const registry: CommandRegistry = createCommandRegistry(
    [...fakes.values()].map((fake) => fake.command),
  );
  return { registry, fakes };
}

function runOf(
  fakes: Map<CommandName, ReturnType<typeof fakeCommand>>,
  name: CommandName,
): Mock<(ctx: CommandContext) => void> {
  const fake = fakes.get(name);
  if (fake === undefined) {
    throw new Error(`No fake for ${name}`);
  }
  return fake.run;
}

describe('createCommandRegistry', () => {
  it('runs a command by name with the given context', () => {
    const { registry, fakes } = fakeRegistry();

    registry.run('scrollDown', { count: undefined, repeat: false });

    expect(runOf(fakes, 'scrollDown')).toHaveBeenCalledTimes(1);
    expect(runOf(fakes, 'scrollDown')).toHaveBeenCalledWith({ count: undefined, repeat: false });
    for (const name of COMMAND_NAMES.filter((other) => other !== 'scrollDown')) {
      expect(runOf(fakes, name)).not.toHaveBeenCalled();
    }
  });

  it('passes the count to commands that accept one', () => {
    const { registry, fakes } = fakeRegistry();

    registry.run('scrollDown', { count: 3, repeat: true });

    expect(runOf(fakes, 'scrollDown')).toHaveBeenCalledWith({ count: 3, repeat: true });
  });

  it('passes an undefined count through to commands that accept one', () => {
    const { registry, fakes } = fakeRegistry();

    registry.run('scrollUp', { count: undefined, repeat: false });

    expect(runOf(fakes, 'scrollUp')).toHaveBeenCalledWith({ count: undefined, repeat: false });
  });

  it('runs a command that does not accept a count once, with count undefined', () => {
    const { registry, fakes } = fakeRegistry(['scrollToTop']);

    registry.run('scrollToTop', { count: 5, repeat: true });

    expect(runOf(fakes, 'scrollToTop')).toHaveBeenCalledTimes(1);
    expect(runOf(fakes, 'scrollToTop')).toHaveBeenCalledWith({ count: undefined, repeat: true });
  });

  it('returns the registered command by name', () => {
    const { registry, fakes } = fakeRegistry();

    expect(registry.get('scrollUp')).toBe(fakes.get('scrollUp')?.command);
  });

  it('lists every command in COMMAND_NAMES order with its metadata', () => {
    const commands = COMMAND_NAMES.map((name) => fakeCommand(name).command).reverse();

    const listed = createCommandRegistry(commands).list();

    expect(listed.map((command) => command.name)).toEqual([...COMMAND_NAMES]);
    for (const command of listed) {
      expect(command).toBe(commands.find((other) => other.name === command.name));
    }
  });

  it('throws when a command name is registered twice', () => {
    const commands = [
      ...COMMAND_NAMES.map((name) => fakeCommand(name).command),
      fakeCommand('scrollDown').command,
    ];

    expect(() => createCommandRegistry(commands)).toThrow('Duplicate command: scrollDown');
  });

  it('throws when a command in COMMAND_NAMES is missing', () => {
    const commands = COMMAND_NAMES.filter((name) => name !== 'scrollToBottom').map(
      (name) => fakeCommand(name).command,
    );

    expect(() => createCommandRegistry(commands)).toThrow('Missing command: scrollToBottom');
  });

  it('reports a duplicate before a missing command', () => {
    const commands = [fakeCommand('scrollDown').command, fakeCommand('scrollDown').command];

    expect(() => createCommandRegistry(commands)).toThrow('Duplicate command: scrollDown');
  });
});
