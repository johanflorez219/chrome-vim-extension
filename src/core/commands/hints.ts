import type { Finder } from '../hints/finder';
import type { HintMode } from '../modes/hint';

import { onceOnly, type Command, type CommandContext, type CommandName } from './registry';

function pageCommand(
  name: CommandName,
  description: string,
  acceptsCount: boolean,
  run: (ctx: CommandContext) => void,
): Command {
  return { name, description, acceptsCount, context: 'page', run: onceOnly(run) };
}

/**
 * Focuses the Nth text input, or the last one when N is larger. The plain focus()
 * keeps the value and caret (R6.4); the focus watcher then enters Insert mode (R6.1).
 */
function focusInput(finder: Pick<Finder, 'find'>, count: number | undefined): void {
  const inputs = finder.find('textInput');
  const target = inputs[Math.min(count ?? 1, inputs.length) - 1]?.element;
  if (target instanceof HTMLElement) {
    target.focus();
  }
}

/** The hint commands (R4.1, R5.1, R5.3, R6): each one starts Hint mode or focuses a field. */
export function createHintCommands(deps: {
  readonly hints: Pick<HintMode, 'start'>;
  readonly finder: Pick<Finder, 'find'>;
}): readonly Command[] {
  return [
    pageCommand('hintClick', 'Click a hinted element', false, () => {
      deps.hints.start('click');
    }),
    pageCommand('hintOpenTab', 'Open a hinted link in a background tab', false, () => {
      deps.hints.start('openTab');
    }),
    pageCommand('hintCopyUrl', "Copy a hinted link's URL", false, () => {
      deps.hints.start('copyUrl');
    }),
    pageCommand('focusInput', 'Focus the first text input (count: the Nth)', true, (ctx) => {
      focusInput(deps.finder, ctx.count);
    }),
  ];
}
