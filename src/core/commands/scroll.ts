import { SCROLL_STEP_X, SCROLL_STEP_Y } from '../../settings/defaults';
import type { ScrollTargetTracker } from '../scroll/scroll-target';
import type { Axis, Scroller } from '../scroll/scroller';

import type { Command, CommandContext, CommandName } from './registry';

interface ScrollCommandDeps {
  readonly scroller: Pick<Scroller, 'scrollBy' | 'scrollToFraction'>;
  readonly targets: Pick<ScrollTargetTracker, 'targetFor'>;
}

interface Described {
  readonly name: CommandName;
  readonly description: string;
}

function pageCommand(
  { name, description }: Described,
  run: (ctx: CommandContext) => void,
): Command {
  return { name, description, acceptsCount: true, context: 'page', run };
}

function stepCommand(
  deps: ScrollCommandDeps,
  options: Described & { readonly axis: Axis; readonly pixels: number },
): Command {
  return pageCommand(options, (ctx) => {
    const target = deps.targets.targetFor(options.axis);
    deps.scroller.scrollBy(target, options.axis, options.pixels * (ctx.count ?? 1), {
      repeat: ctx.repeat,
    });
  });
}

function halfPageCommand(
  deps: ScrollCommandDeps,
  options: Described & { readonly direction: 1 | -1 },
): Command {
  return pageCommand(options, (ctx) => {
    // Measured on each run: the target changes with clicks (R7)
    const target = deps.targets.targetFor('y');
    const distance = (target.clientHeight / 2) * options.direction * (ctx.count ?? 1);
    deps.scroller.scrollBy(target, 'y', distance, { repeat: ctx.repeat });
  });
}

function fractionCommand(
  deps: ScrollCommandDeps,
  options: Described & { readonly withoutCount: 0 | 1 },
): Command {
  return pageCommand(options, (ctx) => {
    const fraction =
      ctx.count === undefined ? options.withoutCount : Math.min(ctx.count, 100) / 100;
    deps.scroller.scrollToFraction(deps.targets.targetFor('y'), 'y', fraction);
  });
}

/** The M1 scroll commands, one per COMMAND_NAMES entry, in that order. */
export function createScrollCommands(deps: ScrollCommandDeps): readonly Command[] {
  return [
    stepCommand(deps, {
      name: 'scrollDown',
      description: 'Scroll down',
      axis: 'y',
      pixels: SCROLL_STEP_Y,
    }),
    stepCommand(deps, {
      name: 'scrollUp',
      description: 'Scroll up',
      axis: 'y',
      pixels: -SCROLL_STEP_Y,
    }),
    stepCommand(deps, {
      name: 'scrollLeft',
      description: 'Scroll left',
      axis: 'x',
      pixels: -SCROLL_STEP_X,
    }),
    stepCommand(deps, {
      name: 'scrollRight',
      description: 'Scroll right',
      axis: 'x',
      pixels: SCROLL_STEP_X,
    }),
    halfPageCommand(deps, {
      name: 'scrollHalfPageDown',
      description: 'Scroll down half a page',
      direction: 1,
    }),
    halfPageCommand(deps, {
      name: 'scrollHalfPageUp',
      description: 'Scroll up half a page',
      direction: -1,
    }),
    fractionCommand(deps, {
      name: 'scrollToTop',
      description: 'Scroll to the top, or to N percent with a count',
      withoutCount: 0,
    }),
    fractionCommand(deps, {
      name: 'scrollToBottom',
      description: 'Scroll to the bottom, or to N percent with a count',
      withoutCount: 1,
    }),
  ];
}
