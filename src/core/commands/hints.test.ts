import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Finder, HintTarget } from '../hints/finder';
import type { HintMode } from '../modes/hint';

import { createHintCommands } from './hints';
import {
  COMMAND_NAMES,
  createCommandRegistry,
  type Command,
  type CommandContext,
  type CommandName,
} from './registry';

const start = vi.fn<HintMode['start']>();
const find = vi.fn<Finder['find']>(() => []);
const commands = createHintCommands({
  hints: {
    start: (action) => {
      start(action);
    },
  },
  finder: { find: (filter) => find(filter) },
});

function run(name: CommandName, ctx: CommandContext): void {
  const command = commands.find((candidate) => candidate.name === name);
  if (command === undefined) {
    throw new Error(`No command ${name}`);
  }
  command.run(ctx);
}

function inputs(count: number): HTMLInputElement[] {
  return Array.from({ length: count }, () =>
    document.body.appendChild(document.createElement('input')),
  );
}

function targetsOf(elements: readonly Element[]): HintTarget[] {
  return elements.map((element) => ({
    element,
    rect: { left: 0, top: 0, width: 10, height: 10 },
  }));
}

beforeEach(() => {
  start.mockClear();
  find.mockReset();
  find.mockReturnValue([]);
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('createHintCommands', () => {
  it('returns the four hint commands in order', () => {
    expect(commands.map((command) => command.name)).toStrictEqual([
      'hintClick',
      'hintOpenTab',
      'hintCopyUrl',
      'focusInput',
    ]);
    expect(commands.every((command) => command.context === 'page')).toBe(true);
    expect(commands.every((command) => command.description.length > 0)).toBe(true);
    expect(commands.map((command) => command.acceptsCount)).toStrictEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it.each([
    ['hintClick', 'click'],
    ['hintOpenTab', 'openTab'],
    ['hintCopyUrl', 'copyUrl'],
  ] as const)('%s starts Hint mode with %s', (name, action) => {
    run(name, { count: undefined, repeat: false });
    expect(start).toHaveBeenCalledExactlyOnceWith(action);
    expect(find).not.toHaveBeenCalled();
  });

  it.each(['hintClick', 'hintOpenTab', 'hintCopyUrl', 'focusInput'] as const)(
    '%s ignores auto-repeat',
    (name) => {
      run(name, { count: undefined, repeat: true });
      expect(start).not.toHaveBeenCalled();
      expect(find).not.toHaveBeenCalled();
    },
  );

  it('drops a count on the hint keys and keeps it on focusInput through the registry', () => {
    const others: Command[] = COMMAND_NAMES.filter(
      (name) => !['hintClick', 'hintOpenTab', 'hintCopyUrl', 'focusInput'].includes(name),
    ).map((name) => ({
      name,
      description: name,
      acceptsCount: true,
      context: 'page',
      run: vi.fn<(ctx: CommandContext) => void>(),
    }));
    const registry = createCommandRegistry([...others, ...commands]);
    const fields = inputs(3);
    find.mockReturnValue(targetsOf(fields));

    registry.run('hintClick', { count: 5, repeat: false });
    expect(start.mock.calls).toStrictEqual([['click']]);

    registry.run('focusInput', { count: 2, repeat: false });
    expect(document.activeElement).toBe(fields[1]);
  });

  it('focusInput focuses the first text input', () => {
    const fields = inputs(3);
    find.mockReturnValue(targetsOf(fields));

    run('focusInput', { count: undefined, repeat: false });

    expect(document.activeElement).toBe(fields[0]);
    expect(find).toHaveBeenCalledExactlyOnceWith('textInput');
  });

  it.each([
    [1, 0],
    [2, 1],
    [3, 2],
    [9, 2],
  ])('focusInput with count %i focuses input %i', (count, index) => {
    const fields = inputs(3);
    find.mockReturnValue(targetsOf(fields));

    run('focusInput', { count, repeat: false });

    expect(document.activeElement).toBe(fields[index]);
  });

  it('focusInput does nothing without text inputs', () => {
    run('focusInput', { count: undefined, repeat: false });
    expect(document.activeElement).toBe(document.body);
  });

  it('focusInput keeps the value and uses a plain focus', () => {
    const [first] = inputs(1);
    if (first === undefined) {
      throw new Error('no input');
    }
    first.value = 'hello';
    find.mockReturnValue(targetsOf([first]));
    const focus = vi.spyOn(first, 'focus');

    run('focusInput', { count: undefined, repeat: false });

    expect(focus).toHaveBeenCalledExactlyOnceWith();
    expect(first.value).toBe('hello');
  });
});
