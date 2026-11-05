import { describe, expect, it, vi } from 'vitest';

import { createCommandRegistry } from '@/core/commands/registry';
import { createNavigationCommands, type PageActions } from '@/core/commands/navigation';
import { createScrollCommands } from '@/core/commands/scroll';
import { buildKeymapTrie, type KeymapEntry } from '@/core/keymap-trie';
import type { ScrollTargetTracker } from '@/core/scroll/scroll-target';
import type { Scroller } from '@/core/scroll/scroller';

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
  { keys: ['r'], command: 'reload' },
  { keys: ['y', 'y'], command: 'copyUrl' },
  { keys: ['g', 'u'], command: 'urlUp' },
  { keys: ['g', 'U'], command: 'urlRoot' },
];

describe('DEFAULT_KEYMAP', () => {
  it('builds a keymap trie without clashes', () => {
    expect(() => buildKeymapTrie(DEFAULT_KEYMAP)).not.toThrow();
  });

  it.each(EXPECTED)('maps $keys to $command', ({ keys, command }) => {
    expect(buildKeymapTrie(DEFAULT_KEYMAP).lookup(keys)).toEqual({ type: 'complete', command });
  });

  it('has no mappings beyond the listed keys', () => {
    expect(DEFAULT_KEYMAP).toHaveLength(EXPECTED.length);
  });

  it('uses no default key with Cmd', () => {
    const keys = DEFAULT_KEYMAP.flatMap((entry) => entry.keys);

    expect(keys.filter((key) => /^<(?:[CAS]-)*D-/.test(key))).toEqual([]);
  });
});

describe('DEFAULT_KEYMAP in the command registry', () => {
  it('resolves every default mapping to a registered command', () => {
    const scrollCommands = createScrollCommands({
      scroller: {
        scrollBy: vi.fn<Scroller['scrollBy']>(),
        scrollToFraction: vi.fn<Scroller['scrollToFraction']>(),
      },
      targets: {
        targetFor: vi.fn<ScrollTargetTracker['targetFor']>(() => document.documentElement),
      },
    });
    const pageCommands = createNavigationCommands({
      href: vi.fn<PageActions['href']>(() => 'https://x.test/'),
      navigate: vi.fn<PageActions['navigate']>(),
      reload: vi.fn<PageActions['reload']>(),
      writeClipboard: vi.fn<PageActions['writeClipboard']>(() => Promise.resolve()),
    });
    const registry = createCommandRegistry([...scrollCommands, ...pageCommands]);

    for (const entry of DEFAULT_KEYMAP) {
      expect(registry.get(entry.command).name).toBe(entry.command);
    }
  });
});
