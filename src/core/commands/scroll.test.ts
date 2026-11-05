import { describe, expect, it, vi } from 'vitest';

import type { ScrollTargetTracker } from '../scroll/scroll-target';
import type { Scroller } from '../scroll/scroller';

import { SCROLL_COMMAND_NAMES, type Command, type CommandName } from './registry';
import { createScrollCommands } from './scroll';

function setup() {
  const yTarget = document.createElement('div');
  Object.defineProperty(yTarget, 'clientHeight', { value: 800 });
  const xTarget = document.createElement('div');
  const scrollBy = vi.fn<Scroller['scrollBy']>();
  const scrollToFraction = vi.fn<Scroller['scrollToFraction']>();
  const targetFor = vi.fn<ScrollTargetTracker['targetFor']>((axis) =>
    axis === 'x' ? xTarget : yTarget,
  );
  const commands = createScrollCommands({
    scroller: { scrollBy, scrollToFraction },
    targets: { targetFor },
  });
  return { commands, yTarget, xTarget, scrollBy, scrollToFraction, targetFor };
}

function commandNamed(commands: readonly Command[], name: CommandName): Command {
  const command = commands.find((candidate) => candidate.name === name);
  if (command === undefined) {
    throw new Error(`No command ${name}`);
  }
  return command;
}

const ONCE = { count: undefined, repeat: false };

describe('createScrollCommands', () => {
  it('returns one command per command name, in order', () => {
    expect(setup().commands.map((command) => command.name)).toEqual([...SCROLL_COMMAND_NAMES]);
  });

  it('describes every command as a page command that accepts a count', () => {
    for (const command of setup().commands) {
      expect(command.description).not.toBe('');
      expect(command.acceptsCount).toBe(true);
      expect(command.context).toBe('page');
    }
  });

  it('scrolls down and up 60 px times the count', () => {
    const { commands, yTarget, scrollBy, targetFor } = setup();

    commandNamed(commands, 'scrollDown').run(ONCE);
    commandNamed(commands, 'scrollDown').run({ count: 3, repeat: false });
    commandNamed(commands, 'scrollUp').run(ONCE);

    expect(scrollBy.mock.calls).toEqual([
      [yTarget, 'y', 60, { repeat: false }],
      [yTarget, 'y', 180, { repeat: false }],
      [yTarget, 'y', -60, { repeat: false }],
    ]);
    expect(targetFor).toHaveBeenCalledWith('y');
  });

  it('scrolls left and right 40 px times the count on the x target', () => {
    const { commands, xTarget, scrollBy, targetFor } = setup();

    commandNamed(commands, 'scrollRight').run(ONCE);
    commandNamed(commands, 'scrollLeft').run({ count: 2, repeat: false });

    expect(scrollBy.mock.calls).toEqual([
      [xTarget, 'x', 40, { repeat: false }],
      [xTarget, 'x', -80, { repeat: false }],
    ]);
    expect(targetFor).toHaveBeenCalledWith('x');
  });

  it("scrolls half the target's visible height times the count", () => {
    const { commands, yTarget, scrollBy } = setup();

    commandNamed(commands, 'scrollHalfPageDown').run(ONCE);
    commandNamed(commands, 'scrollHalfPageDown').run({ count: 2, repeat: false });
    commandNamed(commands, 'scrollHalfPageUp').run(ONCE);

    expect(scrollBy.mock.calls).toEqual([
      [yTarget, 'y', 400, { repeat: false }],
      [yTarget, 'y', 800, { repeat: false }],
      [yTarget, 'y', -400, { repeat: false }],
    ]);
  });

  it('measures the half page on the current target', () => {
    const { commands, yTarget, scrollBy, targetFor } = setup();
    const panel = document.createElement('div');
    Object.defineProperty(panel, 'clientHeight', { value: 300 });
    targetFor.mockReturnValueOnce(panel);

    commandNamed(commands, 'scrollHalfPageDown').run(ONCE);
    commandNamed(commands, 'scrollHalfPageDown').run(ONCE);

    expect(scrollBy.mock.calls).toEqual([
      [panel, 'y', 150, { repeat: false }],
      [yTarget, 'y', 400, { repeat: false }],
    ]);
  });

  it('passes the repeat flag to the scroller', () => {
    const { commands, scrollBy } = setup();
    const held = { count: undefined, repeat: true };

    commandNamed(commands, 'scrollDown').run(held);
    commandNamed(commands, 'scrollHalfPageUp').run(held);

    expect(scrollBy.mock.calls.map((call) => call[3])).toEqual([
      { repeat: true },
      { repeat: true },
    ]);
  });

  it('goes to the top or bottom without a count', () => {
    const { commands, yTarget, scrollToFraction } = setup();

    commandNamed(commands, 'scrollToTop').run(ONCE);
    commandNamed(commands, 'scrollToBottom').run(ONCE);

    expect(scrollToFraction.mock.calls).toEqual([
      [yTarget, 'y', 0],
      [yTarget, 'y', 1],
    ]);
  });

  it('goes to N percent with a count, capped at 100', () => {
    const { commands, scrollToFraction } = setup();

    commandNamed(commands, 'scrollToTop').run({ count: 50, repeat: false });
    commandNamed(commands, 'scrollToBottom').run({ count: 50, repeat: false });
    commandNamed(commands, 'scrollToTop').run({ count: 100, repeat: false });
    commandNamed(commands, 'scrollToBottom').run({ count: 250, repeat: false });

    expect(scrollToFraction.mock.calls.map((call) => call[2])).toEqual([0.5, 0.5, 1, 1]);
  });
});
