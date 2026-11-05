import { describe, expect, it } from 'vitest';

import {
  EMPTY_PARSER_STATE,
  MAX_COUNT,
  parseKey,
  type ParseOutcome,
  type ParserState,
} from './key-parser';
import { buildKeymapTrie } from './keymap-trie';

const trie = buildKeymapTrie([
  { keys: ['j'], command: 'scrollDown' },
  { keys: ['g', 'g'], command: 'scrollToTop' },
  { keys: ['G'], command: 'scrollToBottom' },
  // Only proves that 0 can be a key when no count is pending
  { keys: ['0'], command: 'scrollLeft' },
]);

function feed(
  keys: readonly string[],
  start: ParserState = EMPTY_PARSER_STATE,
): { state: ParserState; outcome: ParseOutcome } {
  let result: { state: ParserState; outcome: ParseOutcome } = {
    state: start,
    outcome: { type: 'unmapped' },
  };
  for (const key of keys) {
    result = parseKey(result.state, key, trie);
  }
  return result;
}

describe('parseKey', () => {
  it('runs a single-key mapping without a count', () => {
    const { state, outcome } = feed(['j']);

    expect(outcome).toEqual({ type: 'run', command: 'scrollDown', count: undefined });
    expect(state).toEqual(EMPTY_PARSER_STATE);
  });

  it('waits after the first key of a sequence', () => {
    const { state, outcome } = feed(['g']);

    expect(outcome).toEqual({ type: 'pending' });
    expect(state).toEqual({ count: '', keys: ['g'] });
  });

  it('runs a sequence when it completes and clears the state', () => {
    const { state, outcome } = feed(['g', 'g']);

    expect(outcome).toEqual({ type: 'run', command: 'scrollToTop', count: undefined });
    expect(state).toEqual(EMPTY_PARSER_STATE);
  });

  it('waits after a count digit', () => {
    const { state, outcome } = feed(['5']);

    expect(outcome).toEqual({ type: 'pending' });
    expect(state).toEqual({ count: '5', keys: [] });
  });

  it('reads digits before a mapping as its count', () => {
    expect(feed(['1', '2', 'j']).outcome).toEqual({
      type: 'run',
      command: 'scrollDown',
      count: 12,
    });
  });

  it('extends a count with 0', () => {
    expect(feed(['1', '0', 'j']).outcome).toEqual({
      type: 'run',
      command: 'scrollDown',
      count: 10,
    });
  });

  it('treats 0 with no count pending as a key', () => {
    expect(feed(['0']).outcome).toEqual({ type: 'run', command: 'scrollLeft', count: undefined });
  });

  it('keeps a count across a pending sequence', () => {
    const { state, outcome } = feed(['5', 'g', 'g']);

    expect(outcome).toEqual({ type: 'run', command: 'scrollToTop', count: 5 });
    expect(state).toEqual(EMPTY_PARSER_STATE);
  });

  it('caps the count at MAX_COUNT', () => {
    expect(MAX_COUNT).toBe(9999);
    expect(feed(['1', '2', '3', '4', '5', 'j']).outcome).toEqual({
      type: 'run',
      command: 'scrollDown',
      count: MAX_COUNT,
    });
  });

  it('returns unmapped for an unmapped key from the empty state', () => {
    const { state, outcome } = feed(['x']);

    expect(outcome).toEqual({ type: 'unmapped' });
    expect(state).toEqual(EMPTY_PARSER_STATE);
  });

  it('re-handles a key that breaks a sequence', () => {
    const { state, outcome } = feed(['g', 'j']);

    expect(outcome).toEqual({ type: 'run', command: 'scrollDown', count: undefined });
    expect(state).toEqual(EMPTY_PARSER_STATE);
  });

  it('drops the count when a key breaks a sequence', () => {
    expect(feed(['5', 'g', 'j']).outcome).toEqual({
      type: 'run',
      command: 'scrollDown',
      count: undefined,
    });
  });

  it('re-handles a key that breaks a count-only state', () => {
    const { state, outcome } = feed(['5', 'x']);

    expect(outcome).toEqual({ type: 'unmapped' });
    expect(state).toEqual(EMPTY_PARSER_STATE);
  });

  it('re-handles a digit that breaks a sequence as the start of a count', () => {
    const afterDigit = feed(['g', '3']);

    expect(afterDigit.outcome).toEqual({ type: 'pending' });
    expect(afterDigit.state).toEqual({ count: '3', keys: [] });
    expect(feed(['j'], afterDigit.state).outcome).toEqual({
      type: 'run',
      command: 'scrollDown',
      count: 3,
    });
  });

  it('re-handles 0 that breaks a sequence as a key', () => {
    expect(feed(['g', '0']).outcome).toEqual({
      type: 'run',
      command: 'scrollLeft',
      count: undefined,
    });
  });

  it('leaves the given state unchanged', () => {
    const state: ParserState = { count: '5', keys: ['g'] };

    parseKey(state, 'g', trie);
    parseKey(state, 'x', trie);

    expect(state).toEqual({ count: '5', keys: ['g'] });
  });
});
