import { describe, expect, it } from 'vitest';

import type { Command, CommandName } from '../commands/registry';

import { helpEntries } from './entries';

function command(name: CommandName, context: Command['context'] = 'page'): Command {
  return {
    name,
    description: `does ${name}`,
    acceptsCount: false,
    context,
    run: () => undefined,
  };
}

describe('helpEntries', () => {
  it('lists one entry per command, in the order the commands are given', () => {
    const entries = helpEntries(
      [command('scrollUp'), command('scrollDown')],
      [
        { keys: ['j'], command: 'scrollDown' },
        { keys: ['k'], command: 'scrollUp' },
      ],
    );
    expect(entries.map((entry) => entry.name)).toEqual(['scrollUp', 'scrollDown']);
  });

  it('lists every key of a command, in keymap order', () => {
    const entries = helpEntries(
      [command('tabPrevious')],
      [
        { keys: ['K'], command: 'tabPrevious' },
        { keys: ['g', 'T'], command: 'tabPrevious' },
      ],
    );
    expect(entries[0]?.keys).toEqual(['K', 'gT']);
  });

  it('joins a key sequence into one string and leaves a single key as it is', () => {
    const entries = helpEntries(
      [command('scrollToTop'), command('scrollHalfPageDown')],
      [
        { keys: ['g', 'g'], command: 'scrollToTop' },
        { keys: ['<C-d>'], command: 'scrollHalfPageDown' },
      ],
    );
    expect(entries.map((entry) => entry.keys)).toEqual([['gg'], ['<C-d>']]);
  });

  it('omits a command that has no keys (R2.5)', () => {
    const entries = helpEntries(
      [command('reload'), command('scrollDown')],
      [{ keys: ['j'], command: 'scrollDown' }],
    );
    expect(entries.map((entry) => entry.name)).toEqual(['scrollDown']);
  });

  it('copies the description and context from the command', () => {
    const entries = helpEntries(
      [command('hintClick', 'page')],
      [{ keys: ['f'], command: 'hintClick' }],
    );
    expect(entries[0]).toEqual({
      name: 'hintClick',
      description: 'does hintClick',
      context: 'page',
      keys: ['f'],
    });
  });

  it('keeps the context of background commands', () => {
    const entries = helpEntries(
      [command('tabClose', 'background')],
      [{ keys: ['x'], command: 'tabClose' }],
    );
    expect(entries[0]?.context).toBe('background');
  });

  it('ignores keymap entries for commands that are not listed, and returns nothing for no commands', () => {
    expect(helpEntries([], [{ keys: ['j'], command: 'scrollDown' }])).toEqual([]);
  });
});
