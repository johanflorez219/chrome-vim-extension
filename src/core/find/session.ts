import type { Highlighter } from './highlighter';
import { locateMatches, MAX_MATCHES, type MatchSpan, type TextSegment } from './search';

/** Where the current match is among all matches. `current` is 0 when there are none. */
interface FindPosition {
  readonly current: number;
  readonly total: number;
  /** True at the match cap, so the HUD can show "10000+" (design: error handling). */
  readonly capped: boolean;
}

export interface FindSession {
  /** The query, or '' when none is remembered. */
  readonly query: string;
  readonly position: FindPosition;
  /** Searches for `query` and highlights every match. Does not scroll (R3.3). */
  setQuery(query: string): void;
  /** Scrolls the current match into view, for `<CR>` (R3.4). */
  reveal(): void;
  /** Moves `steps` matches forward and scrolls to it, wrapping (R4.1, R4.3, R4.5). */
  next(steps: number): void;
  /** Moves `steps` matches back and scrolls to it, wrapping (R4.2, R4.3, R4.5). */
  previous(steps: number): void;
  /** Forgets the query and removes the highlights (R3.8). */
  clear(): void;
}

export interface FindSessionDeps {
  /** The rendered text of the page now, so a change in the page is seen on the next move (R4.7). */
  readonly collect: () => readonly TextSegment<Text>[];
  readonly toRange: (match: MatchSpan<Text>) => Range;
  readonly highlighter: Highlighter;
  /** Scrolls so the range is visible, nearest position (R4.1). */
  readonly reveal: (range: Range) => void;
  /** Index of the first range that ends at or below the viewport top, or 0 (R3.4). */
  readonly firstAtOrBelowTop: (ranges: readonly Range[]) => number;
}

interface SearchState {
  query: string;
  matches: readonly MatchSpan<Text>[];
  index: number;
}

/** Every match of `query` in the page now; none for an empty query. */
function locate(deps: FindSessionDeps, query: string): readonly MatchSpan<Text>[] {
  return query === '' ? [] : locateMatches(deps.collect(), query);
}

/** Highlights `ranges`, or removes the highlights when there are none. */
function paint(deps: FindSessionDeps, ranges: readonly Range[], index: number): void {
  if (ranges.length === 0) {
    deps.highlighter.clear();
  } else {
    deps.highlighter.show(ranges, index);
  }
}

/** Searches again, then moves by `delta` (wrapping) and scrolls to the new match. */
function moveBy(deps: FindSessionDeps, state: SearchState, delta: number): void {
  // Without a query there is nothing to move through (R4.4)
  if (state.query === '') {
    return;
  }
  state.matches = locate(deps, state.query);
  const count = state.matches.length;
  if (count === 0) {
    state.index = 0;
    paint(deps, [], 0);
    return;
  }
  // The page may have changed, so the old index can be past the new end (R4.7)
  const base = Math.min(state.index, count - 1);
  state.index = (((base + delta) % count) + count) % count;
  const ranges = state.matches.map((match) => deps.toRange(match));
  paint(deps, ranges, state.index);
  const current = ranges[state.index];
  if (current !== undefined) {
    deps.reveal(current);
  }
}

/** Keeps the query, the matches and the current match, across `<CR>` and `n` / `N`. */
export function createFindSession(deps: FindSessionDeps): FindSession {
  const state: SearchState = { query: '', matches: [], index: 0 };
  return {
    get query() {
      return state.query;
    },
    get position(): FindPosition {
      const { matches, index } = state;
      return {
        current: matches.length === 0 ? 0 : index + 1,
        total: matches.length,
        capped: matches.length >= MAX_MATCHES,
      };
    },
    setQuery: (query) => {
      state.query = query;
      state.matches = locate(deps, query);
      const ranges = state.matches.map((match) => deps.toRange(match));
      state.index = ranges.length > 0 ? deps.firstAtOrBelowTop(ranges) : 0;
      paint(deps, ranges, state.index);
    },
    reveal: () => {
      const range = state.matches[state.index];
      if (range !== undefined) {
        deps.reveal(deps.toRange(range));
      }
    },
    next: (steps) => {
      moveBy(deps, state, steps);
    },
    previous: (steps) => {
      moveBy(deps, state, -steps);
    },
    clear: () => {
      state.query = '';
      state.matches = [];
      state.index = 0;
      deps.highlighter.clear();
    },
  };
}
