import { describe, expect, it } from 'vitest';

import { buildKeymapTrie, type KeymapEntry, type KeymapTrie, type TrieLookup } from './keymap-trie';

function lookupIn(entries: readonly KeymapEntry[], keys: readonly string[]): TrieLookup {
  const trie: KeymapTrie = buildKeymapTrie(entries);
  return trie.lookup(keys);
}

describe('buildKeymapTrie', () => {
  it('finds a single-key mapping as complete', () => {
    expect(lookupIn([{ keys: ['j'], command: 'scrollDown' }], ['j'])).toEqual({
      type: 'complete',
      command: 'scrollDown',
    });
  });

  it('reports the start of a multi-key mapping as a prefix', () => {
    expect(lookupIn([{ keys: ['g', 'g'], command: 'scrollToTop' }], ['g'])).toEqual({
      type: 'prefix',
    });
  });

  it('finds a multi-key mapping as complete', () => {
    expect(lookupIn([{ keys: ['g', 'g'], command: 'scrollToTop' }], ['g', 'g'])).toEqual({
      type: 'complete',
      command: 'scrollToTop',
    });
  });

  it('keeps mappings that share a first key apart', () => {
    const entries: readonly KeymapEntry[] = [
      { keys: ['g', 'g'], command: 'scrollToTop' },
      { keys: ['g', 'e'], command: 'scrollToBottom' },
    ];

    expect(lookupIn(entries, ['g', 'g'])).toEqual({ type: 'complete', command: 'scrollToTop' });
    expect(lookupIn(entries, ['g', 'e'])).toEqual({ type: 'complete', command: 'scrollToBottom' });
    expect(lookupIn(entries, ['g'])).toEqual({ type: 'prefix' });
  });

  it('treats a key in angle-bracket notation as one key', () => {
    const entries: readonly KeymapEntry[] = [{ keys: ['<C-d>'], command: 'scrollHalfPageDown' }];

    expect(lookupIn(entries, ['<C-d>'])).toEqual({
      type: 'complete',
      command: 'scrollHalfPageDown',
    });
    expect(lookupIn(entries, ['<'])).toEqual({ type: 'none' });
  });

  it('returns none for unmapped keys', () => {
    const entries: readonly KeymapEntry[] = [
      { keys: ['j'], command: 'scrollDown' },
      { keys: ['g', 'g'], command: 'scrollToTop' },
    ];

    expect(lookupIn(entries, ['x'])).toEqual({ type: 'none' });
    expect(lookupIn(entries, ['g', 'x'])).toEqual({ type: 'none' });
    expect(lookupIn(entries, ['j', 'j'])).toEqual({ type: 'none' });
  });

  it('throws on an empty mapping', () => {
    expect(() => buildKeymapTrie([{ keys: [], command: 'scrollDown' }])).toThrow(
      'Empty mapping for scrollDown',
    );
  });

  it('throws on a duplicate mapping', () => {
    const entries: readonly KeymapEntry[] = [
      { keys: ['g', 'g'], command: 'scrollToTop' },
      { keys: ['g', 'g'], command: 'scrollToBottom' },
    ];

    expect(() => buildKeymapTrie(entries)).toThrow('Duplicate mapping: gg');
  });

  it('throws when an existing mapping is a prefix of a new one', () => {
    const entries: readonly KeymapEntry[] = [
      { keys: ['g'], command: 'scrollToTop' },
      { keys: ['g', 'g'], command: 'scrollToBottom' },
    ];

    expect(() => buildKeymapTrie(entries)).toThrow('Mapping gg starts with mapping g');
  });

  it('throws when a new mapping is a prefix of an existing one', () => {
    const entries: readonly KeymapEntry[] = [
      { keys: ['g', 'g'], command: 'scrollToTop' },
      { keys: ['g'], command: 'scrollToBottom' },
    ];

    expect(() => buildKeymapTrie(entries)).toThrow('Mapping g is the start of another mapping');
  });
});
