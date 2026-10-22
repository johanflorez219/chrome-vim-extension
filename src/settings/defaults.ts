import type { KeymapEntry } from '@/core/keymap-trie';

/** The default key → command list. M5 turns this into user data. */
export const DEFAULT_KEYMAP: readonly KeymapEntry[] = [
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

/** How long pending keys wait for the next key before they are dropped (R4.5). */
export const KEY_TIMEOUT_MS = 1000;
