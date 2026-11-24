import { createHelpCommands } from './commands/help';
import type { Command } from './commands/registry';
import type { HelpEntry } from './help/entries';
import { createHelpMode } from './modes/help';
import type { Mode, ModeMachine } from './mode-machine';
import { createHelpDialog } from '../ui/help-dialog';
import type { UiRoot } from '../ui/shadow-root';

/** The help feature: its mode, the `?` command, and the dialog it opens (R2). */
interface HelpFeature {
  readonly mode: Mode;
  readonly commands: readonly Command[];
}

/**
 * Builds the help feature. The controller passes the machine and the registry's
 * entries lazily, because both are created after this feature.
 */
export function createHelpFeature(deps: {
  readonly machine: Pick<ModeMachine, 'enter'>;
  readonly mount: () => UiRoot;
  readonly entries: () => readonly HelpEntry[];
}): HelpFeature {
  return {
    mode: createHelpMode({
      machine: deps.machine,
      dialog: createHelpDialog({ mount: deps.mount }),
      entries: deps.entries,
    }),
    commands: createHelpCommands({ machine: deps.machine }),
  };
}
