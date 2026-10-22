import type { CommandName } from './commands/registry';
import type { KeymapTrie } from './keymap-trie';

export interface ParserState {
  /** '' or digits, never starting with '0'. */
  readonly count: string;
  readonly keys: readonly string[];
}

export const EMPTY_PARSER_STATE: ParserState = { count: '', keys: [] };

export type ParseOutcome =
  | { readonly type: 'run'; readonly command: CommandName; readonly count: number | undefined }
  /** Consume the key and wait for more (R4.2). */
  | { readonly type: 'pending' }
  /** Pass the key to the page. */
  | { readonly type: 'unmapped' };

export const MAX_COUNT = 9999;

const FIRST_COUNT_DIGIT = /^[1-9]$/;
const COUNT_DIGIT = /^\d$/;

function isCountDigit(state: ParserState, key: string): boolean {
  if (state.keys.length > 0) {
    return false;
  }
  return state.count === '' ? FIRST_COUNT_DIGIT.test(key) : COUNT_DIGIT.test(key);
}

function isEmpty(state: ParserState): boolean {
  return state.count === '' && state.keys.length === 0;
}

function toCount(count: string): number | undefined {
  return count === '' ? undefined : Math.min(Number(count), MAX_COUNT);
}

/**
 * Feeds one key to the parser. Digits before a mapping are its count
 * (never a leading 0), keys that start a mapping wait for the rest, and a
 * key that breaks a pending sequence drops it and is parsed again on its
 * own. Discarded keys are never replayed to the page.
 */
export function parseKey(
  state: ParserState,
  key: string,
  trie: KeymapTrie,
): { readonly state: ParserState; readonly outcome: ParseOutcome } {
  if (isCountDigit(state, key)) {
    return { state: { count: state.count + key, keys: [] }, outcome: { type: 'pending' } };
  }

  const keys = [...state.keys, key];
  const lookup = trie.lookup(keys);
  switch (lookup.type) {
    case 'complete':
      return {
        state: EMPTY_PARSER_STATE,
        outcome: { type: 'run', command: lookup.command, count: toCount(state.count) },
      };
    case 'prefix':
      return { state: { count: state.count, keys }, outcome: { type: 'pending' } };
    case 'none':
      return isEmpty(state)
        ? { state: EMPTY_PARSER_STATE, outcome: { type: 'unmapped' } }
        : parseKey(EMPTY_PARSER_STATE, key, trie);
  }
}
