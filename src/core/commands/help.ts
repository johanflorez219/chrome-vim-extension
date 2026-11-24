import type { ModeMachine } from '../mode-machine';

import { onceOnly, type Command } from './registry';

/** `?` opens the key list (R2.1). The key itself closes it, in Help mode. */
export function createHelpCommands(deps: {
  readonly machine: Pick<ModeMachine, 'enter'>;
}): readonly Command[] {
  return [
    {
      name: 'helpOpen',
      description: 'Show every command and its keys',
      acceptsCount: false,
      context: 'page',
      run: onceOnly(() => {
        deps.machine.enter('help');
      }),
    },
  ];
}
