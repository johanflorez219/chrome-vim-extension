import type { KeyPress, KeyResult } from '../key-listener';
import type { Mode, ModeMachine } from '../mode-machine';

interface InsertModeDeps {
  readonly machine: Pick<ModeMachine, 'enter' | 'handleKey' | 'isSticky'>;
  /** Removes focus from the focused editable element (R2.6). */
  readonly blurActive: () => void;
  /** True while an editable element has focus. */
  readonly editableFocused: () => boolean;
}

const LEAVE_KEYS: ReadonlySet<string> = new Set(['<Esc>', '<C-[>']);

/**
 * Insert mode lets every key reach the page, except `<Esc>` and `<C-[>`,
 * which blur the field and return to Normal mode.
 */
export function createInsertMode(deps: InsertModeDeps): Mode {
  return {
    name: 'insert',
    handleKey: (press: KeyPress): KeyResult => {
      if (LEAVE_KEYS.has(press.key)) {
        if (deps.editableFocused()) {
          deps.blurActive();
        }
        deps.machine.enter('normal');
        return 'consumed';
      }
      // The field was removed or disabled without a focusout: hand the key to
      // Normal mode, entering it first so the machine doesn't send it back here
      if (!deps.machine.isSticky && !deps.editableFocused()) {
        deps.machine.enter('normal');
        return deps.machine.handleKey(press);
      }
      return 'passed';
    },
  };
}
