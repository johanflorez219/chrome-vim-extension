import type { HelpEntry } from '../help/entries';
import type { KeyPress, KeyResult } from '../key-listener';
import type { Mode, ModeMachine } from '../mode-machine';

interface HelpModeDeps {
  readonly machine: Pick<ModeMachine, 'enter'>;
  readonly dialog: {
    show(entries: readonly HelpEntry[]): void;
    hide(): void;
  };
  /** The entries the dialog lists, read when the dialog opens (R2.2). */
  readonly entries: () => readonly HelpEntry[];
}

// `?` toggles the dialog and `<Esc>` closes it; every other key stays with the dialog
const LEAVE_KEYS: ReadonlySet<string> = new Set(['?', '<Esc>', '<C-[>']);

/**
 * Help mode shows the key list and swallows every key while it is open, so `j`
 * cannot scroll the page behind the dialog (R2.4). Only `?`, `<Esc>` and `<C-[>` close it.
 */
export function createHelpMode(deps: HelpModeDeps): Mode {
  return {
    name: 'help',
    onEnter: () => {
      deps.dialog.show(deps.entries());
    },
    onExit: () => {
      deps.dialog.hide();
    },
    handleKey: (press: KeyPress): KeyResult => {
      if (LEAVE_KEYS.has(press.key)) {
        deps.machine.enter('normal');
      }
      return 'consumed';
    },
  };
}
