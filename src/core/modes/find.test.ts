import { describe, expect, it, vi } from 'vitest';

import type { FindBar } from '../../ui/find-bar';
import type { FindPosition, FindSession } from '../find/session';
import type { KeyPress } from '../key-listener';
import type { ModeMachine } from '../mode-machine';

import { createFindMode } from './find';

const NONE: FindPosition = { current: 0, total: 0, capped: false };

/** A session that keeps the query in a variable; the mocks are what the tests assert on. */
function fakeSession(initial = '') {
  const state = { query: initial };
  const setQuery = vi.fn((query: string) => {
    state.query = query;
  });
  const clear = vi.fn(() => {
    state.query = '';
  });
  const reveal = vi.fn<() => void>();
  const session: Pick<FindSession, 'query' | 'position' | 'setQuery' | 'clear' | 'reveal'> = {
    get query() {
      return state.query;
    },
    get position(): FindPosition {
      return NONE;
    },
    setQuery,
    clear,
    reveal,
  };
  return { session, state, mocks: { setQuery, clear, reveal } };
}

function setup(initial = '') {
  const enter = vi.fn<ModeMachine['enter']>();
  const bar = { show: vi.fn<FindBar['show']>(), hide: vi.fn<FindBar['hide']>() };
  const { session, state, mocks } = fakeSession(initial);
  const mode = createFindMode({ machine: { enter }, session, bar });
  return { mode, enter, bar, mocks, state };
}

function press(key: string, repeat = false): KeyPress {
  return { key, repeat };
}

describe('createFindMode', () => {
  it('is named find', () => {
    expect(setup().mode.name).toBe('find');
  });

  it('opens with an empty query and shows the bar (R3.1)', () => {
    const { mode, mocks, bar } = setup('old');
    mode.onEnter?.({ sticky: false });
    expect(mocks.setQuery).toHaveBeenCalledWith('');
    expect(bar.show).toHaveBeenCalledWith('', NONE);
  });

  it('appends a typed character to the query and redraws the bar (R3.2, R3.3)', () => {
    const { mode, mocks, bar } = setup();
    expect(mode.handleKey(press('f'))).toBe('consumed');
    expect(mode.handleKey(press('o'))).toBe('consumed');
    expect(mocks.setQuery).toHaveBeenLastCalledWith('fo');
    expect(bar.show).toHaveBeenLastCalledWith('fo', NONE);
  });

  it('types a slash as part of the query (R3.9)', () => {
    const { mode, mocks } = setup();
    mode.handleKey(press('/'));
    expect(mocks.setQuery).toHaveBeenCalledWith('/');
  });

  it('types a space as a space, since it is part of a phrase', () => {
    const { mode, mocks } = setup('a');
    mode.handleKey(press('<Space>'));
    expect(mocks.setQuery).toHaveBeenCalledWith('a ');
  });

  it('removes the last character on <BS>', () => {
    const { mode, mocks } = setup('foo');
    expect(mode.handleKey(press('<BS>'))).toBe('consumed');
    expect(mocks.setQuery).toHaveBeenCalledWith('fo');
  });

  it('does nothing on <BS> with an empty query', () => {
    const { mode, mocks } = setup('');
    expect(mode.handleKey(press('<BS>'))).toBe('consumed');
    expect(mocks.setQuery).not.toHaveBeenCalled();
  });

  it.each(['<Esc>', '<C-[>'])(
    'cancels on %s: clears the search and returns to Normal mode (R3.8)',
    (key) => {
      const { mode, enter, mocks } = setup('foo');
      expect(mode.handleKey(press(key))).toBe('consumed');
      expect(mocks.clear).toHaveBeenCalled();
      expect(enter).toHaveBeenCalledWith('normal');
    },
  );

  it('keeps the search on <CR>: it reveals the match and leaves without clearing (R3.4)', () => {
    const { mode, enter, mocks, state } = setup('foo');
    mode.onEnter?.({ sticky: false });
    mocks.setQuery('foo');
    expect(mode.handleKey(press('<CR>'))).toBe('consumed');
    expect(mocks.reveal).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledWith('normal');
    mode.onExit?.();
    expect(state.query).toBe('foo');
  });

  it('cancels the search when the mode is left another way (R6.3)', () => {
    const { mode, bar, mocks, state } = setup('foo');
    mode.onExit?.();
    expect(mocks.clear).toHaveBeenCalled();
    expect(state.query).toBe('');
    expect(bar.hide).toHaveBeenCalled();
  });

  it('cancels on a modified key and passes that key to the page (R3.2)', () => {
    const { mode, enter, mocks } = setup('foo');
    expect(mode.handleKey(press('<C-x>'))).toBe('passed');
    expect(mocks.clear).toHaveBeenCalled();
    expect(enter).toHaveBeenCalledWith('normal');
  });

  it('consumes and ignores keys that are not characters (arrows, Tab)', () => {
    const { mode, mocks } = setup('foo');
    expect(mode.handleKey(press('<Tab>'))).toBe('consumed');
    expect(mode.handleKey(press('<Left>'))).toBe('consumed');
    expect(mocks.setQuery).not.toHaveBeenCalled();
  });

  it('consumes a repeated character without adding it', () => {
    const { mode, mocks } = setup('');
    expect(mode.handleKey(press('a', true))).toBe('consumed');
    expect(mocks.setQuery).not.toHaveBeenCalled();
  });
});
