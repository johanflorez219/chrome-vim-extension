import { KEY_TIMEOUT_MS } from '../../settings/defaults';
import type { CommandRegistry } from '../commands/registry';
import { EMPTY_PARSER_STATE, parseKey, type ParserState } from '../key-parser';
import type { KeyPress, KeyResult } from '../key-listener';
import type { KeymapTrie } from '../keymap-trie';
import type { Mode, ModeMachine } from '../mode-machine';

export interface Timer {
  set(callback: () => void, ms: number): number;
  clear(id: number): void;
}

interface NormalMode extends Mode {
  onExit(): void;
  /** Drops pending keys and clears the timeout timer. */
  reset(): void;
}

interface NormalModeDeps {
  readonly machine: Pick<ModeMachine, 'enter'>;
  readonly trie: KeymapTrie;
  readonly registry: Pick<CommandRegistry, 'run'>;
  readonly timer: Timer;
  readonly editableFocused: () => boolean;
}

function hasPending(state: ParserState): boolean {
  return state.count !== '' || state.keys.length > 0;
}

/**
 * Normal mode runs mapped commands from key sequences and counts, and lets
 * every other key reach the page. `i` enters sticky Insert mode.
 */
export function createNormalMode(deps: NormalModeDeps): NormalMode {
  let state: ParserState = EMPTY_PARSER_STATE;
  let timerId: number | undefined;

  const clearTimer = (): void => {
    if (timerId !== undefined) {
      deps.timer.clear(timerId);
      timerId = undefined;
    }
  };
  const reset = (): void => {
    clearTimer();
    state = EMPTY_PARSER_STATE;
  };
  const restartTimer = (): void => {
    clearTimer();
    timerId = deps.timer.set(() => {
      timerId = undefined;
      state = EMPTY_PARSER_STATE;
    }, KEY_TIMEOUT_MS);
  };

  const escape = (): KeyResult => {
    if (!hasPending(state)) {
      return 'passed';
    }
    reset();
    return 'consumed';
  };

  const parse = (press: KeyPress): KeyResult => {
    const result = parseKey(state, press.key, deps.trie);
    state = result.state;
    const { outcome } = result;
    switch (outcome.type) {
      case 'run':
        clearTimer();
        deps.registry.run(outcome.command, { count: outcome.count, repeat: press.repeat });
        return 'consumed';
      case 'pending':
        restartTimer();
        return 'consumed';
      case 'unmapped':
        clearTimer();
        return 'passed';
    }
  };

  const handleKey = (press: KeyPress): KeyResult => {
    // Focus can reach a field without a focusin we saw (designMode, a move
    // inside one shadow root): step aside and let the key through
    if (deps.editableFocused()) {
      reset();
      deps.machine.enter('insert');
      return 'passed';
    }
    if (press.key === 'i') {
      reset();
      deps.machine.enter('insert', { sticky: true });
      return 'consumed';
    }
    return press.key === '<Esc>' ? escape() : parse(press);
  };

  return { name: 'normal', handleKey, onExit: reset, reset };
}
