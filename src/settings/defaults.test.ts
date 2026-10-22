import { describe, expect, it } from 'vitest';

import { buildKeymapTrie, type KeymapEntry } from '@/core/keymap-trie';

import { DEFAULT_KEYMAP } from './defaults';

const EXPECTED: readonly KeymapEntry[] = [
  { keys: ['j'], command: 'scrollDown' },
  { keys: ['k'], command: 'scrollUp' },
  { keys: ['h'], command: 'scrollLeft' },
  { keys: ['l'], command: 'scrollRight' },
  { keys: ['d'], command: 'scrollHalfPageDown' },
  { keys: ['<C-d>'], command: 'scrollHalfPageDown' },
  { keys: ['u'], command: 'scrollHalfPageUp' },
  { keys: ['<C-u>'], command: 'scrollHalfPageUp' },
  { keys: ['g', 'g'], command: 'scrollToTop' },
  { keys: ['G'], command: 'scrollToBottom' },
];

describe('DEFAULT_KEYMAP', () => {
  it('builds a keymap trie without clashes', () => {
    expect(() => buildKeymapTrie(DEFAULT_KEYMAP)).not.toThrow();
  });

  it.each(EXPECTED)('maps $keys to $command', ({ keys, command }) => {
    expect(buildKeymapTrie(DEFAULT_KEYMAP).lookup(keys)).toEqual({ type: 'complete', command });
  });

  it('has no mappings beyond the M1 keys', () => {
    expect(DEFAULT_KEYMAP).toHaveLength(EXPECTED.length);
  });

  it('uses no default key with Cmd', () => {
    const keys = DEFAULT_KEYMAP.flatMap((entry) => entry.keys);

    expect(keys.filter((key) => /^<(?:[CAS]-)*D-/.test(key))).toEqual([]);
  });
});
