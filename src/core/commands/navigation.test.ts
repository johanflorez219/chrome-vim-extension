import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNavigationCommands, type PageActions } from './navigation';
import {
  COMMAND_NAMES,
  createCommandRegistry,
  type Command,
  type CommandContext,
  type CommandName,
} from './registry';

const href = vi.fn<PageActions['href']>();
const navigate = vi.fn<PageActions['navigate']>();
const reload = vi.fn<PageActions['reload']>();
const writeClipboard = vi.fn<PageActions['writeClipboard']>(() => Promise.resolve());

const actions: PageActions = {
  href: () => href(),
  navigate: (url) => {
    navigate(url);
  },
  reload: () => {
    reload();
  },
  writeClipboard: (text) => writeClipboard(text),
};

const ONCE = { count: undefined, repeat: false };

function run(name: CommandName, ctx: CommandContext): void {
  const command = createNavigationCommands(actions).find((candidate) => candidate.name === name);
  if (command === undefined) {
    throw new Error(`No command ${name}`);
  }
  command.run(ctx);
}

function stub(name: CommandName): Command {
  return {
    name,
    description: 'stub',
    acceptsCount: true,
    context: 'page',
    run: vi.fn<(ctx: CommandContext) => void>(),
  };
}

beforeEach(() => {
  for (const mock of [href, navigate, reload, writeClipboard]) {
    mock.mockReset();
  }
  writeClipboard.mockResolvedValue(undefined);
});

describe('createNavigationCommands', () => {
  it('returns the four page commands', () => {
    const commands = createNavigationCommands(actions);

    expect(commands.map((command) => command.name)).toEqual([
      'reload',
      'copyUrl',
      'urlUp',
      'urlRoot',
    ]);
    expect(commands.map((command) => command.acceptsCount)).toEqual([false, false, true, false]);
    for (const command of commands) {
      expect(command.context).toBe('page');
      expect(command.description).not.toBe('');
    }
  });

  it('reload calls reload once', () => {
    run('reload', ONCE);

    expect(reload).toHaveBeenCalledOnce();
  });

  it('reload ignores a repeated keydown', () => {
    run('reload', { count: undefined, repeat: true });

    expect(reload).not.toHaveBeenCalled();
  });

  it('copyUrl writes the full href', () => {
    href.mockReturnValue('https://x.test/a?q=1#h');

    run('copyUrl', ONCE);

    expect(writeClipboard).toHaveBeenCalledOnce();
    expect(writeClipboard).toHaveBeenCalledWith('https://x.test/a?q=1#h');
  });

  it('copyUrl does not reject when writeClipboard rejects', async () => {
    href.mockReturnValue('https://x.test/');
    writeClipboard.mockRejectedValue(new Error('denied'));

    expect(() => {
      run('copyUrl', ONCE);
    }).not.toThrow();
    // Vitest fails the run on an unhandled rejection
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('copyUrl does not throw when writeClipboard throws synchronously', () => {
    href.mockReturnValue('https://x.test/');
    writeClipboard.mockImplementation(() => {
      throw new TypeError('no clipboard');
    });

    expect(() => {
      run('copyUrl', ONCE);
    }).not.toThrow();
  });

  it('copyUrl ignores a repeated keydown', () => {
    run('copyUrl', { count: undefined, repeat: true });

    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it('urlUp without a count goes one level up', () => {
    href.mockReturnValue('https://x.test/a/b/c?q#h');

    run('urlUp', ONCE);

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('https://x.test/a/b');
  });

  it('urlUp with count 2 goes two levels up', () => {
    href.mockReturnValue('https://x.test/a/b/c?q#h');

    run('urlUp', { count: 2, repeat: false });

    expect(navigate).toHaveBeenCalledWith('https://x.test/a');
  });

  it.each(['https://x.test/', 'about:blank'])('urlUp does nothing for %s', (url) => {
    href.mockReturnValue(url);

    run('urlUp', ONCE);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('urlUp ignores a repeated keydown', () => {
    href.mockReturnValue('https://x.test/a/b');

    run('urlUp', { count: undefined, repeat: true });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('urlRoot goes to the root', () => {
    href.mockReturnValue('https://x.test/a/b');

    run('urlRoot', ONCE);

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('https://x.test/');
  });

  it('urlRoot does nothing at the root', () => {
    href.mockReturnValue('https://x.test/');

    run('urlRoot', ONCE);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('urlRoot ignores a repeated keydown', () => {
    href.mockReturnValue('https://x.test/a/b');

    run('urlRoot', { count: undefined, repeat: true });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not pass a typed count to reload, copyUrl or urlRoot', () => {
    const own = createNavigationCommands(actions);
    const ownNames = own.map((command) => command.name);
    const others = COMMAND_NAMES.filter((name) => !ownNames.includes(name)).map(stub);
    const registry = createCommandRegistry([...own, ...others]);
    href.mockReturnValue('https://x.test/a/b/c');

    registry.run('urlRoot', { count: 5, repeat: false });
    registry.run('reload', { count: 5, repeat: false });
    registry.run('copyUrl', { count: 5, repeat: false });

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('https://x.test/');
    expect(reload).toHaveBeenCalledOnce();
    expect(writeClipboard).toHaveBeenCalledOnce();
  });
});
