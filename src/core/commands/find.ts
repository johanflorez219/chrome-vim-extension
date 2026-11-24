import type { FindSession } from '../find/session';
import type { ModeMachine } from '../mode-machine';

import { onceOnly, type Command } from './registry';

function pageCommand(
  name: Command['name'],
  description: string,
  acceptsCount: boolean,
  run: (count: number) => void,
): Command {
  return {
    name,
    description,
    acceptsCount,
    context: 'page',
    run: onceOnly((ctx) => {
      run(ctx.count ?? 1);
    }),
  };
}

/** `/` opens the search, and `n` and `N` step through its matches (R3.1, R4.1, R4.2, R4.5). */
export function createFindCommands(deps: {
  readonly machine: Pick<ModeMachine, 'enter'>;
  readonly session: Pick<FindSession, 'next' | 'previous'>;
}): readonly Command[] {
  return [
    pageCommand('findOpen', 'Search the page', false, () => {
      deps.machine.enter('find');
    }),
    pageCommand('findNext', 'Go to the next match', true, (count) => {
      deps.session.next(count);
    }),
    pageCommand('findPrevious', 'Go to the previous match', true, (count) => {
      deps.session.previous(count);
    }),
  ];
}
