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
  /** The count and keys waiting for a next key, in Vim notation (`5g`), or '' when none (R1.3). */
  pending(): string;
}

interface NormalModeDeps {
  readonly machine: Pick<ModeMachine, 'enter'>;
  readonly trie: KeymapTrie;
  readonly registry: Pick<CommandRegistry, 'run'>;
  readonly timer: Timer;
  readonly editableFocused: () => boolean;
  /** Called when the pending text changes, so the HUD can redraw (R1.4). */
  readonly onPendingChange: () => void;
}

function hasPending(state: ParserState): boolean {
  return state.count !== '' || state.keys.length > 0;
}

function pendingText(state: ParserState): string {
  return `${state.count}${state.keys.join('')}`;
}

interface KeyTimer {
  /** Starts the timeout, replacing any running one. */
  restart(): void;
  clear(): void;
}

/** The timeout that drops pending keys (R4.5). Owns the timer id, so the mode doesn't. */
function createKeyTimer(timer: Timer, onTimeout: () => void): KeyTimer {
  let id: number | undefined;
  const clear = (): void => {
    if (id !== undefined) {
      timer.clear(id);
      id = undefined;
    }
  };
  return {
    clear,
    restart: () => {
      clear();
      id = timer.set(() => {
        id = undefined;
        onTimeout();
      }, KEY_TIMEOUT_MS);
    },
  };
}

/**
 * Feeds one key to the parser. Returns the next parser state and whether the key
 * was used. A run or an unmapped key stops the timeout; a pending key restarts it.
 */
function parsePress(
  deps: Pick<NormalModeDeps, 'trie' | 'registry'>,
  keyTimer: KeyTimer,
  state: ParserState,
  press: KeyPress,
): { readonly state: ParserState; readonly result: KeyResult } {
  const parsed = parseKey(state, press.key, deps.trie);
  switch (parsed.outcome.type) {
    case 'run':
      keyTimer.clear();
      deps.registry.run(parsed.outcome.command, {
        count: parsed.outcome.count,
        repeat: press.repeat,
      });
      return { state: parsed.state, result: 'consumed' };
    case 'pending':
      keyTimer.restart();
      return { state: parsed.state, result: 'consumed' };
    case 'unmapped':
      keyTimer.clear();
      return { state: parsed.state, result: 'passed' };
  }
}

/** True when `key` extends a pending sequence into a mapped one, such as `g` then `i` for `gi`. */
function continuesSequence(state: ParserState, trie: KeymapTrie, key: string): boolean {
  return state.keys.length > 0 && trie.lookup([...state.keys, key]).type !== 'none';
}

/**
 * Normal mode runs mapped commands from key sequences and counts, and lets
 * every other key reach the page. `i` enters sticky Insert mode, unless it continues
 * a pending mapped sequence such as `gi`.
 */
export function createNormalMode(deps: NormalModeDeps): NormalMode {
  let state: ParserState = EMPTY_PARSER_STATE;
  // Runs `change` and tells the callback if the pending text it leaves behind differs
  const changing = <T>(change: () => T): T => {
    const before = pendingText(state);
    const result = change();
    if (pendingText(state) !== before) {
      deps.onPendingChange();
    }
    return result;
  };
  const keyTimer = createKeyTimer(deps.timer, () => {
    changing(() => {
      state = EMPTY_PARSER_STATE;
    });
  });
  const reset = (): void => {
    changing(() => {
      keyTimer.clear();
      state = EMPTY_PARSER_STATE;
    });
  };

  const escape = (): KeyResult => {
    if (!hasPending(state)) {
      return 'passed';
    }
    reset();
    return 'consumed';
  };

  const parse = (press: KeyPress): KeyResult => {
    const next = parsePress(deps, keyTimer, state, press);
    state = next.state;
    return next.result;
  };

  const route = (press: KeyPress): KeyResult => {
    // Focus can reach a field without a focusin we saw (designMode, a move
    // inside one shadow root): step aside and let the key through
    if (deps.editableFocused()) {
      reset();
      deps.machine.enter('insert');
      return 'passed';
    }
    // `i` enters sticky Insert mode unless it continues a mapped sequence (`gi`)
    if (press.key === 'i' && !continuesSequence(state, deps.trie, press.key)) {
      reset();
      deps.machine.enter('insert', { sticky: true });
      return 'consumed';
    }
    return press.key === '<Esc>' ? escape() : parse(press);
  };

  const handleKey = (press: KeyPress): KeyResult => changing(() => route(press));

  return {
    name: 'normal',
    handleKey,
    onExit: reset,
    reset,
    pending: () => pendingText(state),
  };
}
