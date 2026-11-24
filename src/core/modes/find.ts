import type { FindBar } from '../../ui/find-bar';
import type { FindSession } from '../find/session';
import type { KeyPress, KeyResult } from '../key-listener';
import type { Mode, ModeMachine } from '../mode-machine';

interface FindModeDeps {
  readonly machine: Pick<ModeMachine, 'enter'>;
  readonly session: Pick<FindSession, 'query' | 'position' | 'setQuery' | 'clear' | 'reveal'>;
  readonly bar: FindBar;
}

type KeyKind = 'escape' | 'enter' | 'backspace' | 'modified' | 'repeat' | 'character' | 'other';

// key-notation writes modifiers as C-, A-, S-, D-, so Ctrl, Alt or Meta starts the key like this
const MODIFIED = /^<(?:C-|A-|(?:S-)?D-)/;

function keyKind(press: KeyPress): KeyKind {
  if (press.key === '<Esc>' || press.key === '<C-[>') {
    return 'escape';
  }
  if (press.key === '<CR>') {
    return 'enter';
  }
  if (press.key === '<BS>') {
    return 'backspace';
  }
  if (MODIFIED.test(press.key)) {
    return 'modified';
  }
  if (press.repeat) {
    return 'repeat';
  }
  return press.key.length === 1 || press.key === '<Space>' ? 'character' : 'other';
}

function characterOf(key: string): string {
  return key === '<Space>' ? ' ' : key;
}

/**
 * Find mode takes the query as typed keys. The bar has no real input, so focus never
 * leaves the page (design: find mode). `<CR>` keeps the search and `<Esc>` cancels it;
 * leaving the mode any other way cancels too, so no search runs on the way out (R6.3).
 */
export function createFindMode(deps: FindModeDeps): Mode {
  // Set by <CR> just before leaving, so onExit keeps the query for n and N
  let keep = false;

  const redraw = (): void => {
    deps.bar.show(deps.session.query, deps.session.position);
  };

  const leave = (keepQuery: boolean): void => {
    keep = keepQuery;
    deps.machine.enter('normal');
  };

  const handleKey = (press: KeyPress): KeyResult => {
    switch (keyKind(press)) {
      case 'escape':
        deps.session.clear();
        leave(false);
        return 'consumed';
      case 'enter':
        deps.session.reveal();
        leave(true);
        return 'consumed';
      case 'backspace':
        if (deps.session.query !== '') {
          deps.session.setQuery(deps.session.query.slice(0, -1));
          redraw();
        }
        return 'consumed';
      case 'modified':
        deps.session.clear();
        leave(false);
        return 'passed';
      case 'character':
        deps.session.setQuery(deps.session.query + characterOf(press.key));
        redraw();
        return 'consumed';
      case 'repeat':
      case 'other':
        return 'consumed';
    }
  };

  return {
    name: 'find',
    handleKey,
    onEnter: () => {
      // Each `/` starts a new search with an empty query, as in Vim
      deps.session.setQuery('');
      redraw();
    },
    onExit: () => {
      deps.bar.hide();
      if (keep) {
        keep = false;
      } else {
        deps.session.clear();
      }
    },
  };
}
