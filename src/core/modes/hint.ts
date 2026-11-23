import type { HintOverlay } from '../../ui/hints';
import { generateLabels, matchPrefix } from '../hints/labels';
import type { HintAction } from '../hints/actions';
import type { Finder, HintTarget, TargetFilter } from '../hints/finder';
import type { KeyPress, KeyResult } from '../key-listener';
import type { Mode, ModeMachine } from '../mode-machine';

/** Hint mode: type a label to act on its element. State pattern, like the other modes (R3). */
export interface HintMode extends Mode {
  /** Finds targets for `action`. Enters Hint mode if there are any; else does nothing (R3.10). */
  start(action: HintAction): void;
}

interface HintModeDeps {
  readonly machine: Pick<ModeMachine, 'enter'>;
  readonly finder: Pick<Finder, 'find'>;
  readonly overlay: HintOverlay;
  readonly alphabet: string;
  /** Runs the action on the element a full label picked (R3.2). */
  readonly perform: (action: HintAction, element: Element) => void;
  /** Stops any scroll animation, so our own `j` cannot end the hints it just made. */
  readonly stopScrolling: () => void;
  /** Ends Hint mode through `onChange` when the page moves under the hints (R7.2). */
  readonly watchPage: (hinted: readonly Element[], onChange: () => void) => () => void;
}

interface HintState {
  action: HintAction;
  targets: readonly HintTarget[];
  labels: readonly string[];
  /** The letters typed so far, always lower case. */
  typed: string;
  stopWatching: (() => void) | undefined;
}

const LEAVE_KEYS: ReadonlySet<string> = new Set(['<Esc>', '<C-[>']);
// key-notation writes modifiers as C-, A-, S-, D-, so Ctrl, Alt or Meta starts the key like this
const MODIFIED = /^<(?:C-|A-|(?:S-)?D-)/;

function filterFor(action: HintAction): TargetFilter {
  switch (action) {
    case 'click':
    case 'openTab':
      return 'clickable';
    case 'copyUrl':
      return 'copyableLink';
  }
}

type KeyKind = 'modified' | 'repeat' | 'leave' | 'backspace' | 'letter' | 'other';

function keyKind(press: KeyPress): KeyKind {
  if (MODIFIED.test(press.key) && !LEAVE_KEYS.has(press.key)) {
    return 'modified';
  }
  if (press.repeat) {
    return 'repeat';
  }
  if (LEAVE_KEYS.has(press.key)) {
    return 'leave';
  }
  if (press.key === '<BS>') {
    return 'backspace';
  }
  return press.key.length === 1 ? 'letter' : 'other';
}

/** Applies the typed letters: narrows the hints, picks one, or leaves Hint mode. */
function narrow(deps: HintModeDeps, state: HintState, prefix: string): void {
  const match = matchPrefix(state.labels, prefix);
  switch (match.kind) {
    case 'none':
      deps.machine.enter('normal');
      return;
    case 'partial':
      state.typed = prefix.toLowerCase();
      deps.overlay.filter(match.visible, state.typed.length);
      return;
    case 'exact': {
      // Read these before leaving: leaving Hint mode empties the state
      const { action } = state;
      const element = state.targets[match.index]?.element;
      deps.machine.enter('normal');
      if (element !== undefined) {
        deps.perform(action, element);
      }
      return;
    }
  }
}

function routeKey(deps: HintModeDeps, state: HintState, press: KeyPress): KeyResult {
  switch (keyKind(press)) {
    case 'modified':
      deps.machine.enter('normal');
      return 'passed';
    case 'repeat':
      return 'consumed';
    case 'backspace':
      // The shorter prefix of a partial match is always partial, because labels are prefix-free
      if (state.typed !== '') {
        narrow(deps, state, state.typed.slice(0, -1));
      }
      return 'consumed';
    case 'letter':
      narrow(deps, state, state.typed + press.key);
      return 'consumed';
    case 'leave':
    case 'other':
      deps.machine.enter('normal');
      return 'consumed';
  }
}

export function createHintMode(deps: HintModeDeps): HintMode {
  const state: HintState = {
    action: 'click',
    targets: [],
    labels: [],
    typed: '',
    stopWatching: undefined,
  };
  return {
    name: 'hint',
    start: (action) => {
      deps.stopScrolling();
      const targets = deps.finder.find(filterFor(action));
      if (targets.length === 0) {
        return;
      }
      state.action = action;
      state.targets = targets;
      state.labels = generateLabels(targets.length, deps.alphabet);
      state.typed = '';
      deps.machine.enter('hint');
    },
    onEnter: () => {
      // Draw the hints first, so the watcher's two-frame grace starts once they are shown
      deps.overlay.show(
        state.targets.map((target, index) => ({
          label: state.labels[index] ?? '',
          rect: target.rect,
        })),
      );
      state.stopWatching = deps.watchPage(
        state.targets.map((target) => target.element),
        () => {
          deps.machine.enter('normal');
        },
      );
    },
    onExit: () => {
      state.stopWatching?.();
      state.stopWatching = undefined;
      deps.overlay.remove();
      state.targets = [];
      state.labels = [];
      state.typed = '';
    },
    handleKey: (press) => routeKey(deps, state, press),
  };
}
