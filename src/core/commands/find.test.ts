import { describe, expect, it, vi } from 'vitest';

import type { FindSession } from '../find/session';
import type { ModeMachine } from '../mode-machine';

import { createFindCommands } from './find';

function setup() {
  const enter = vi.fn<ModeMachine['enter']>();
  const next = vi.fn<FindSession['next']>();
  const previous = vi.fn<FindSession['previous']>();
  const commands = createFindCommands({
    machine: { enter },
    session: { next, previous },
  });
  const byName = (name: string) => commands.find((command) => command.name === name);
  return { commands, byName, enter, next, previous };
}

describe('createFindCommands', () => {
  it('registers findOpen, findNext and findPrevious', () => {
    expect(setup().commands.map((command) => command.name)).toEqual([
      'findOpen',
      'findNext',
      'findPrevious',
    ]);
  });

  it('findOpen enters Find mode and ignores counts (R3.1)', () => {
    const { byName, enter } = setup();
    const open = byName('findOpen');
    expect(open?.acceptsCount).toBe(false);
    open?.run({ count: 4, repeat: false });
    expect(enter).toHaveBeenCalledWith('find');
  });

  it('findNext moves one match when no count is typed (R4.1)', () => {
    const { byName, next } = setup();
    byName('findNext')?.run({ count: undefined, repeat: false });
    expect(next).toHaveBeenCalledWith(1);
  });

  it('findNext moves the number of matches it is given (R4.5)', () => {
    const { byName, next } = setup();
    byName('findNext')?.run({ count: 3, repeat: false });
    expect(next).toHaveBeenCalledWith(3);
  });

  it('findPrevious moves back by the count (R4.2, R4.5)', () => {
    const { byName, previous } = setup();
    byName('findPrevious')?.run({ count: 2, repeat: false });
    expect(previous).toHaveBeenCalledWith(2);
  });

  it('ignores a repeated key, so holding n moves once', () => {
    const { byName, next } = setup();
    byName('findNext')?.run({ count: undefined, repeat: true });
    expect(next).not.toHaveBeenCalled();
  });
});
