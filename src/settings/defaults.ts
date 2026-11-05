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
  { keys: ['r'], command: 'reload' },
  { keys: ['y', 'y'], command: 'copyUrl' },
  { keys: ['g', 'u'], command: 'urlUp' },
  { keys: ['g', 'U'], command: 'urlRoot' },
  { keys: ['J'], command: 'tabNext' },
  { keys: ['g', 't'], command: 'tabGoTo' },
  { keys: ['K'], command: 'tabPrevious' },
  { keys: ['g', 'T'], command: 'tabPrevious' },
  { keys: ['g', '0'], command: 'tabFirst' },
  { keys: ['g', '$'], command: 'tabLast' },
  { keys: ['x'], command: 'tabClose' },
  { keys: ['X'], command: 'tabRestore' },
  { keys: ['H'], command: 'historyBack' },
  { keys: ['L'], command: 'historyForward' },
  { keys: ['y', 't'], command: 'tabDuplicate' },
];

/** How long pending keys wait for the next key before they are dropped (R4.5). */
export const KEY_TIMEOUT_MS = 1000;

/** Pixels per `j` / `k` (R6.1). */
export const SCROLL_STEP_Y = 60;
/** Pixels per `h` / `l` (R6.2). */
export const SCROLL_STEP_X = 40;
