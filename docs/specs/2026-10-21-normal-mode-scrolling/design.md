# Normal mode and scrolling — Design

**Status:** Approved (2026-10-21)
**Requirements:** [requirements.md](requirements.md)

## Overview

The content script turns each `keydown` into Vim notation (M0's
`toKeyNotation`) and hands it to a **mode machine**. The current mode decides
whether to consume the key. Normal mode feeds keys to a pure **key parser**
that walks a **keymap trie**. When a mapping completes, the parser names a
command and a count, and the **command registry** runs it. M1's commands
are all scroll commands. They go through a **scroller**, which animates
scrolls itself (instead of the browser's `behavior: 'smooth'`) so that
repeated presses add up and held keys don't lag. A **focus watcher** switches
to Insert mode when an editable element gets focus. A **scroll-target
tracker** remembers which container the user is reading.

This follows the `PLAN.md` architecture (decisions 1, 2, 3, 6, 7) and the
`CONTRIBUTING.md` patterns: State for modes, Command for actions, a
functional core (parser, trie, scroll math) with an imperative shell (DOM
listeners, animation frames), and dependency injection for `window`, the
clock, timers and animation frames.

## Architecture

```
content.ts ── createController(deps) ─────────────────────────────────┐
  │                                                                    │
  │  listenForKeys(window) ── key, repeat ──► ModeMachine              │
  │     (capture; consume ⇒ preventDefault        │                    │
  │      + stopImmediatePropagation)              ▼                    │
  │                                    current Mode.handleKey()        │
  │                                     │                 │            │
  │                              Normal mode         Insert mode       │
  │                                     │           (Esc/C-[ only)     │
  │                                     ▼                              │
  │                     KeyParser (pure) + KeymapTrie                  │
  │                         │ { command, count }                       │
  │                         ▼                                          │
  │                   CommandRegistry.run()                            │
  │                         │                                          │
  │                         ▼                                          │
  │                 Scroller ◄── ScrollTargetTracker                   │
  │                 (rAF animation)   (mousedown / focusin)            │
  │                                                                    │
  │  FocusWatcher (focusin/focusout) ──► ModeMachine.enter()           │
  └── ctx.onInvalidated(controller.stop)  (R1.4) ──────────────────────┘

background.ts ── runtime.onInstalled ──► reinjectContentScript(deps)
                   (install / update)      scripting.executeScript into
                                           every open tab (R1.5–R1.7)
```

### Folder layout

New and changed files, following `PLAN.md`:

```
src/
  entrypoints/content.ts        wiring only: createController(...) + onInvalidated
  entrypoints/background.ts     wiring only: onInstalled → reinjectContentScript
  background/reinject.ts        inject the content script into open tabs
  core/
    controller.ts               composition root: builds and connects everything
    key-listener.ts             changed: the handler returns 'consumed' | 'passed'
    key-parser.ts               pure parser: counts, sequences, re-handling
    keymap-trie.ts              build the trie and check it for conflicts
    mode-machine.ts
    modes/normal.ts
    modes/insert.ts
    editable.ts                 isEditable, deepActiveElement
    focus-watcher.ts
    commands/registry.ts
    commands/scroll.ts          the scroll command definitions
    scroll/scroller.ts          animation and clamping
    scroll/scroll-target.ts     picks the element to scroll
  settings/defaults.ts          DEFAULT_KEYMAP and the scroll constants
tests/e2e/
  fixtures/pages.ts             HTML fixture pages served with page.route
  modes.spec.ts, scrolling.spec.ts, pass-through.spec.ts, reinject.spec.ts
```

`core/scroll/` is new in the layout. The scroll mechanics are bigger than
one command file, and keeping them out of `commands/` keeps each file under
the 300-line limit.

## Components and interfaces

### Key listener (→ R1.1–R1.3)

The listener is registered on `window` in the capture phase at
`document_start`, so it runs before any listener the page adds. When the
handler says `'consumed'`, it calls `preventDefault()` and
`stopImmediatePropagation()`, and it also swallows the matching `keyup`
(tracked by `event.code`), so pages never see half a key press. Keys that
`toKeyNotation` ignores (lone modifiers, IME composition) never reach the
handler and always pass. So do synthetic events a page dispatches itself
(`isTrusted === false`): only the user's real key presses run commands.

```ts
export type KeyResult = 'consumed' | 'passed';
export interface KeyPress {
  readonly key: string; // Vim notation, e.g. "j", "<C-d>"
  readonly repeat: boolean; // KeyboardEvent.repeat (held key)
}
export function listenForKeys(
  target: EventTarget,
  onKey: (press: KeyPress) => KeyResult,
  isTrusted: (event: KeyboardEvent) => boolean, // event.isTrusted; injected because jsdom can't make trusted events
): () => void;
```

### Mode machine and modes (→ R2.1–R2.6, R3.7, R4.10)

This uses the State pattern. Each mode is an object with its own key handler
and enter/exit hooks. The machine holds the current mode and runs the
transitions. When Normal mode exits, it resets its parser (R4.10).

```ts
export const MODE_NAMES = ['normal', 'insert'] as const;
export type ModeName = (typeof MODE_NAMES)[number];

export interface EnterOptions {
  /** Insert mode entered with `i`: it ignores focus changes until Esc (R3.7). */
  readonly sticky?: boolean;
}

export interface Mode {
  readonly name: ModeName;
  handleKey(press: KeyPress): KeyResult;
  onEnter?(options: EnterOptions): void;
  onExit?(): void;
}

export interface ModeMachine {
  readonly current: ModeName;
  readonly isSticky: boolean;
  enter(name: ModeName, options?: EnterOptions): void; // no-op if already in that mode with the same stickiness
  handleKey(press: KeyPress): KeyResult;
}

export function createModeMachine(modes: readonly Mode[], initial: ModeName): ModeMachine;
```

- **Insert mode** (`createInsertMode({ machine, blurActive, editableFocused })`):
  `<Esc>` and `<C-[>` call `blurActive()` if an editable element has focus
  (R2.6), then `machine.enter('normal')`, and return `'consumed'` (R2.5).
  Every other key returns `'passed'` (R2.3). Chrome doesn't always fire
  `focusout` when a focused field is removed or disabled, so in non-sticky
  Insert mode each key first checks `editableFocused()`
  (`isEditable(deepActiveElement(document))`). If no field has focus any
  more, it switches to Normal mode and hands that key to Normal mode.
- **Normal mode** (`createNormalMode({ machine, trie, registry, timer, editableFocused })`):
  `i` enters sticky Insert mode (R2.4). If keys are pending (`5i`, `gi`
  before M3 maps it), they are dropped first, as R4.6 says for any key that
  breaks a sequence. `i` is a
  mode-switch key handled by the mode itself, not a registry command, because
  the mode machine is not a command dependency. `<Esc>` drops pending keys
  if there are any (R4.7) and passes otherwise (R4.8). Everything else goes
  to the parser, and the mode starts or clears the 1000 ms timeout timer
  based on the result (R4.5).

```ts
export interface Timer {
  set(callback: () => void, ms: number): number;
  clear(id: number): void;
}
```

### Key parser and keymap trie (→ R4.1–R4.6, R4.9, R5.4, R5.5)

The parser is a pure function from (state, key) to (new state, outcome), so
every rule in R4 is a plain unit test.

```ts
export interface KeymapEntry {
  readonly keys: readonly string[]; // ['g', 'g'], ['<C-d>']
  readonly command: CommandName;
}
export interface KeymapTrie {
  /** 'complete' with the command, 'prefix' if more keys can follow, 'none'. */
  lookup(keys: readonly string[]): TrieLookup;
}
export type TrieLookup =
  | { readonly type: 'complete'; readonly command: CommandName }
  | { readonly type: 'prefix' }
  | { readonly type: 'none' };

/** Throws if a mapping is empty, duplicated, or a prefix of another mapping. */
export function buildKeymapTrie(entries: readonly KeymapEntry[]): KeymapTrie;

export interface ParserState {
  readonly count: string; // '' or digits, never starting with '0'
  readonly keys: readonly string[];
}
export const EMPTY_PARSER_STATE: ParserState;

export type ParseOutcome =
  | { readonly type: 'run'; readonly command: CommandName; readonly count: number | undefined }
  | { readonly type: 'pending' } // consume, wait for more (R4.2)
  | { readonly type: 'unmapped' }; // pass the key to the page

export const MAX_COUNT = 9999;

export function parseKey(
  state: ParserState,
  key: string,
  trie: KeymapTrie,
): { readonly state: ParserState; readonly outcome: ParseOutcome };
```

Rules, in order:

1. With no keys pending: `1`–`9` start a count. With a count pending: `0`–`9`
   extend it. Otherwise `0` is an ordinary key (R4.3, R4.4).
2. Append the key and look up the pending keys. `complete` returns `run`
   with `min(count, 9999)` and resets the state (R4.1, R4.9). `prefix`
   returns `pending` (R4.2).
3. `none` with something pending: reset and parse the key again from the
   empty state, once (R4.6). `none` from the empty state returns `unmapped`.
   If the discarded count was the only thing pending, the key that broke it
   is still parsed fresh.

When rule 3 discards keys that the extension already consumed, they are lost.
That matches Vim, and it's why `gx` doesn't type an `x` into the page later.

### Command registry (→ R5.1–R5.3)

```ts
export const COMMAND_NAMES = [
  'scrollDown',
  'scrollUp',
  'scrollLeft',
  'scrollRight',
  'scrollHalfPageDown',
  'scrollHalfPageUp',
  'scrollToTop',
  'scrollToBottom',
] as const;
export type CommandName = (typeof COMMAND_NAMES)[number];

export interface CommandContext {
  readonly count: number | undefined; // undefined when no count was typed
  readonly repeat: boolean;
}

export interface Command {
  readonly name: CommandName;
  readonly description: string;
  readonly acceptsCount: boolean;
  readonly context: 'page' | 'background';
  run(ctx: CommandContext): void;
}

export interface CommandRegistry {
  get(name: CommandName): Command;
  /** Passes `count: undefined` to commands that don't accept a count (R5.3). */
  run(name: CommandName, ctx: CommandContext): void;
  list(): readonly Command[];
}

/** Throws if a name is registered twice or a name in COMMAND_NAMES is missing. */
export function createCommandRegistry(commands: readonly Command[]): CommandRegistry;
```

The `CommandName` union makes a keymap entry with a misspelled command a
compile error. A unit test also checks that every `DEFAULT_KEYMAP` entry
resolves in the real registry and that the trie builds (R5.5). M1 has no
`'background'` commands. That field exists for M2's router, and the registry
runs every command locally for now.

### Default keymap (→ R5.4, R6.1–R6.6)

The default keymap lives in `src/settings/defaults.ts`, because M5 makes it
user data:

| Keys         | Command                | Count |
| ------------ | ---------------------- | ----- |
| `j` / `k`    | `scrollDown` / `Up`    | ×N    |
| `h` / `l`    | `scrollLeft` / `Right` | ×N    |
| `d`, `<C-d>` | `scrollHalfPageDown`   | ×N    |
| `u`, `<C-u>` | `scrollHalfPageUp`     | ×N    |
| `gg`         | `scrollToTop`          | N %   |
| `G`          | `scrollToBottom`       | N %   |

`SCROLL_STEP_Y = 60`, `SCROLL_STEP_X = 40` and `KEY_TIMEOUT_MS = 1000` are
also defined here.

### Scroller (→ R6.7–R6.10, R7.5, NFR2)

The scroller keeps one animation for each element and axis, so `j` and `l`
pressed together don't cancel each other. Each animation stores
its **destination**, so a new scroll adds to where the last one was going
(R6.9). Every new scroll restarts the animation from the current position
to the new destination, with an ease-out curve and a deadline: 250 ms for a
normal press (R6.7), and 100 ms for a key-repeat press, so a held key never
builds up a backlog (R6.8). Destinations are clamped to the element's
scroll range. A scroll that clamps to the current position does nothing,
and the key is still consumed (R6.10). The scroller writes the position on the target element directly, with
`element.scrollTo({ top | left, behavior: 'instant' })`, so a scroll never
chains to ancestors (R7.5) and pages that set CSS `scroll-behavior: smooth`
can't turn each frame into a native animation of its own (R6.7, NFR2). Each
frame, the scroller first compares the element's position with the one it
wrote last. If they differ by more than 1 px, something else scrolled it
(the wheel, a trackpad, the page), so the animation is dropped and the next
key starts from the real position. This needs no extra listener (NFR1.2).
Scroll snapping is left to the browser in M1. When the user prefers reduced motion, the destination is
written at once (NFR2).

```ts
export interface FrameScheduler {
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
}
export interface ScrollerDeps {
  readonly frames: FrameScheduler;
  readonly now: () => number;
  readonly prefersReducedMotion: () => boolean; // matchMedia, read on each scroll
}
export type Axis = 'x' | 'y';
export interface Scroller {
  /** Moves `target` by `delta` px from its current destination. */
  scrollBy(target: Element, axis: Axis, delta: number, options: { repeat: boolean }): void;
  /** Moves `target` to `fraction` (0–1) of its scroll range. */
  scrollToFraction(target: Element, axis: Axis, fraction: number): void;
  stop(): void; // cancels every animation (R1.4)
}
export function createScroller(deps: ScrollerDeps): Scroller;
```

The scroll commands (`commands/scroll.ts`) turn counts into distances:

- **Step:** `j` moves `count ?? 1` × 60 px.
- **Half page:** `clientHeight / 2` of the target, where the document's
  `scrollingElement.clientHeight` is the viewport height.
- **`gg` / `G`:** `scrollToFraction(min(N, 100) / 100)`. With no count,
  `gg` goes to 0 and `G` to 1.

### Scroll-target tracker (→ R7.1–R7.4, R7.6)

```ts
export interface ScrollTargetTracker {
  /** The element the next scroll on `axis` should move. */
  targetFor(axis: Axis): Element;
  stop(): void;
}
export function createScrollTargetTracker(doc: Document): ScrollTargetTracker;
export function canScroll(element: Element, axis: Axis): boolean;
```

- On `mousedown` and `focusin` (capture, on `window`), the tracker stores
  the event's `composedPath()` elements (R7.1, R7.2).
- `targetFor(axis)` walks the stored path and returns the first element
  that is still connected and `canScroll(axis)`. A container counts when
  its content overflows on that axis (`scrollHeight > clientHeight`, or the
  width equivalent) and its computed `overflow-y`/`overflow-x` is `auto` or
  `scroll`. The choice is per axis, so after a click in a code block that
  only scrolls sideways, `j` still scrolls the panel around it. With no
  such element, the target is the document (`document.scrollingElement`)
  (R7.2, R7.3).
- **The document's own rule:** the root's computed overflow is usually
  `visible`, so `canScroll` treats the document separately. It can scroll
  when its content overflows the viewport on that axis and neither `html`
  nor `body` sets `overflow: hidden` on it. A page that locked scrolling
  for an open modal is respected.
- When the target would be the document and the document can't scroll on
  that axis: for `x`, the target stays the document and the scroll clamps
  to a no-op, with the key still consumed (R7.6). For `y`, the tracker
  falls through to R7.4. This also happens after a
  click outside any panel, or after the chosen panel was removed, because
  the document isn't a container. "Can't scroll" means no overflow or
  locked, not "at its edge": at the bottom of an article, `j` must not
  start scrolling a sidebar. R7.4 searches for the largest visible
  vertically scrollable container, scoring each by visible area. It walks elements with a `TreeWalker`,
  checks the cheap overflow test before calling `getComputedStyle`, and
  caches the result while it stays connected and scrollable, so the search
  runs once per page (NFR1).

### Editable detection and focus watcher (→ R3.1–R3.6)

```ts
/** Reaches open and closed shadow roots: chrome.dom.openOrClosedShadowRoot in the extension. */
export type ShadowRootOf = (host: Element) => ShadowRoot | null;
/** text inputs, textarea, select, contenteditable (not "false"), anything when designMode is "on". */
export function isEditable(element: Element | null): boolean;
/** document.activeElement, followed down through open and closed shadow roots. */
export function deepActiveElement(doc: Document, shadowRootOf: ShadowRootOf): Element | null;
export function watchFocus(
  win: Window,
  shadowRootOf: ShadowRootOf,
  onChange: (editableFocused: boolean) => void,
): () => void;
```

- Text-accepting `input` types are the allow-list `text`, `search`, `email`,
  `url`, `tel`, `password`, `number`, `date`, `datetime-local`, `month`,
  `week` and `time`. An unknown or missing `type` counts as `text`, the way
  the browser treats it. All other types stay in Normal mode (R3.6). A
  disabled element isn't editable, but `readonly` text fields are, because
  their caret keys still matter.
- `contenteditable` is found with `closest('[contenteditable]')` and its
  value checked, because `isContentEditable` is not available in jsdom.
- An element whose `ownerDocument.designMode` is `'on'` is editable (R3.2).
- `chrome.dom.openOrClosedShadowRoot` lets a content script see inside
  closed shadow roots without any permission. It is injected as
  `shadowRootOf`; tests pass `(host) => host.shadowRoot` or a lookup table
  of closed roots created in the test.
- `watchFocus` listens to `focusin` and `focusout` on `window` in the
  capture phase. On `focusin` it doesn't trust the event target, because a
  closed shadow root retargets it to the host. It asks
  `isEditable(deepActiveElement(document, shadowRootOf))` instead, so fields
  inside open and closed shadow roots count (R3.2). On `focusout` it looks at
  `relatedTarget`: if focus is moving to another editable element, it does
  nothing (R3.5). If the window itself is losing focus
  (`!document.hasFocus()`), it also does nothing, and the next `focusin`
  decides.
- The controller maps `onChange(true)` to `enter('insert')` and
  `onChange(false)` to `enter('normal')`. Both are skipped while Insert
  mode is sticky (R3.7). At start, the controller checks
  `isEditable(deepActiveElement(document, shadowRootOf))` to pick the
  initial mode (R2.1, R3.3).
- Focus events don't cover every case: turning on `designMode` fires no
  `focusin`. So non-sticky modes also check `editableFocused()` on each
  key: Normal mode switches to Insert mode and passes the key when it is
  true, and Insert mode drops to Normal when it is false (see the modes
  above). The check costs one `activeElement` walk per key (NFR1).

### Controller (→ R1.4, NFR4)

```ts
export interface ControllerDeps {
  readonly window: Window;
  readonly timer: Timer;
  readonly frames: FrameScheduler;
  readonly now: () => number;
  readonly isValid: () => boolean; // false once the extension is reloaded or disabled (R1.4)
  readonly isTrusted: (event: KeyboardEvent) => boolean; // event.isTrusted in the extension
  readonly shadowRootOf: ShadowRootOf; // chrome.dom.openOrClosedShadowRoot (R3.2)
  readonly prefersReducedMotion: () => boolean; // matchMedia, which jsdom lacks (NFR2)
}
export interface Controller {
  stop(): void; // removes every listener, clears the timer, stops animations
}
export function createController(deps: ControllerDeps): Controller;
```

`content.ts` builds the deps from `window`, `setTimeout`,
`requestAnimationFrame` and `performance.now`. It calls `createController`
and registers `ctx.onInvalidated(controller.stop)`. That alone isn't
enough for R1.4: WXT fires `onInvalidated` only when a newer copy of the
script starts in the same page, or when `ctx.isInvalid` is read, and Chrome
doesn't inject the new version into tabs already open. So `ControllerDeps`
gets an `isValid: () => boolean` (wired to `ctx.isValid`, which checks
`browser.runtime.id`). The key handler calls it first on every key. Once it
returns false, the controller stops itself and passes the key. When the
extension is disabled, open tabs stop handling keys this way. When it is
reloaded or updated, the background script starts the new version in them
(below). The M0 `console.debug` log is removed (NFR4).

### Re-injection into open tabs (→ R1.5–R1.7)

```ts
export interface ReinjectDeps {
  /** chrome.tabs.query({}) — only ids and discarded flags are read, so no "tabs" permission. */
  readonly queryTabs: () => Promise<readonly { id?: number; discarded?: boolean }[]>;
  /** chrome.scripting.executeScript({ target: { tabId }, files }) */
  readonly executeScript: (tabId: number, files: readonly string[]) => Promise<unknown>;
  readonly files: readonly string[]; // the built content script, from the manifest
}
/** Resolves when every tab was tried; never rejects (R1.7). */
export function reinjectContentScript(deps: ReinjectDeps): Promise<void>;
```

- `background.ts` registers `browser.runtime.onInstalled`. For the reasons
  `install` and `update` it calls `reinjectContentScript`. Reloading the
  unpacked extension during development counts as `update`. Browser
  startup doesn't fire `onInstalled`, and tabs load the content script
  normally then.
- The content script's file list comes from
  `browser.runtime.getManifest().content_scripts`, so it never drifts from
  WXT's build output.
- Every tab is tried in parallel with `Promise.allSettled`. Tabs without an
  `id` and discarded tabs are skipped. A rejection, from `chrome://` pages,
  the Web Store, or a tab closed meanwhile, is ignored (R1.7). Only the top
  frame is injected, matching the content script.
- **One copy handles keys (R1.6):** the new copy's WXT context announces
  itself when it starts, and older copies of the same script call
  `onInvalidated`, which stops their controller. As a second guard, an
  orphaned older copy already sees `isValid() === false` on its next key,
  because its `runtime.id` is gone, and passes the key. Both copies listen
  on `window` in the capture phase, and the old one runs first, so it must
  pass the key, never consume it. The new copy starts in a page that has
  already loaded, so its initial mode check (R3.3) matters here.
- **Permissions:** this adds `scripting`. `executeScript` also needs host
  access. The manifest's `<all_urls>` content script match already grants
  it, so the install warning shouldn't change. The task that adds this
  confirms that in the built manifest and in Chrome's permission warning.
  If it isn't so, it adds `host_permissions: ['<all_urls>']`, which shows
  the same warning. The commit's Why gives the reason for the permission,
  as `CONTRIBUTING.md` asks.

## Data and state

All state lives in the content script of the top frame and is lost when the
page reloads:

| State                                     | Owner        | Reset by                                       |
| ----------------------------------------- | ------------ | ---------------------------------------------- |
| Current mode, sticky flag                 | Mode machine | page load; focus changes; Esc                  |
| Parser state (count, keys)                | Normal mode  | command run, mismatch, timeout, Esc, mode exit |
| Timeout timer id                          | Normal mode  | each key; mode exit                            |
| Swallowed `keyup` codes                   | Key listener | the matching `keyup`; stop                     |
| Animations by element                     | Scroller     | reaching the destination; stop                 |
| Remembered scroll target, cached fallback | Tracker      | next click/focus; disconnect                   |

Nothing goes to `chrome.storage` or the service worker in M1, and nothing
about keys is logged (NFR4).

## Error handling

| Situation (→ criterion)                                             | Handling                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Extension reloaded or disabled (R1.4)                               | `isValid()` checked on every key, plus `onInvalidated` → `controller.stop()`; afterwards every key passes |
| Tab can't take the script: forbidden, discarded, closed (R1.7)      | skipped or rejection ignored in `reinjectContentScript`; nothing is shown                                 |
| Old and new copies both in a tab (R1.6)                             | WXT start event invalidates the old one; `isValid()` makes an orphan pass every key                       |
| Focused field removed or disabled without `focusout`                | non-sticky Insert mode checks `editableFocused()` on each key and drops to Normal                         |
| Wheel or page scroll during our animation                           | per-frame position check drops the animation                                                              |
| Page sets `scroll-behavior: smooth`                                 | writes use `behavior: 'instant'`                                                                          |
| Synthetic `keydown` from the page (`isTrusted === false`)           | ignored: passes untouched                                                                                 |
| Bad default keymap: prefix clash, duplicate, unknown command (R5.5) | `buildKeymapTrie` / `createCommandRegistry` throw; a unit test builds the real defaults                   |
| Count over 9999 (R4.9)                                              | clamped in `parseKey`                                                                                     |
| Target removed from the DOM or no longer scrollable (R7.3)          | `targetFor` checks `isConnected` and `canScroll` on every use, then falls back to the document            |
| Target at its edge (R6.10)                                          | clamped destination equals the current one → no animation, key consumed                                   |
| Element removed mid-animation                                       | the next frame sees `!isConnected` and drops the animation                                                |
| Page with no scrollable element at all                              | `targetFor` returns `scrollingElement`; the scroll clamps to a no-op (R6.10)                              |
| `document.scrollingElement` is null (very early `document_start`)   | fall back to `document.documentElement`                                                                   |
| Forbidden pages (NFR3.3)                                            | the content script is never injected; nothing to handle                                                   |
| Focus inside an iframe                                              | out of scope: the top-frame listener doesn't see those keys                                               |

## Testing strategy

Tests are written first for every component (`CONTRIBUTING.md`). Coverage
stays at or above 80%; `entrypoints/` is excluded, which is why
`content.ts` holds only wiring.

- **Unit tests (Vitest, jsdom):**
  - `key-parser`: every R4 rule, counts with `0`, the cap, `gj` re-handling.
  - `keymap-trie`: prefix clash, duplicates.
  - `registry`: R5.3, duplicate or missing names, and a check that
    `DEFAULT_KEYMAP` resolves (R5.5).
  - `mode-machine` and modes: R2, R3.7, the timeout with a fake `Timer`,
    and R4.10.
  - `editable`: input types, `contenteditable`, shadow roots.
  - `focus-watcher`: R3.1–R3.5, using dispatched focus events with
    `relatedTarget`.
  - `key-listener`: consume, pass, `keyup` swallowing, stop (R1.2–R1.4),
    using dispatched `KeyboardEvent`s and a page listener added after ours.
  - `scroller`: a fake `FrameScheduler` and clock check the deadlines
    (R6.7, R6.8), destinations adding up (R6.9), clamping (R6.10) and
    reduced motion. jsdom has no layout, so `scrollHeight`,
    `clientHeight`, `scrollTop` and computed overflow are stubbed with
    `Object.defineProperty` on fixture elements. The tracker is tested the
    same way.
  - `reinject`: fake `queryTabs` and `executeScript` check the skipped
    tabs and that a rejection never escapes (R1.5, R1.7).
  - `controller`: an integration test in jsdom checks that pressing `j`
    calls the scroller, and that `stop()` removes the listeners.
- **End-to-end tests (Playwright, real Chromium with the built extension):**
  - Fixture pages: a long article, a page with a fixed-height inner
    scrolling panel, a page with only an inner panel (an SPA layout), an
    input, a `contenteditable` element, inputs inside an open and a closed
    shadow root, a `designMode` document, and a page whose `keydown` listener records the keys it sees.
  - Most tests use `page.emulateMedia({ reducedMotion: 'reduce' })` for
    exact `scrollY` assertions. One test keeps motion on and polls until
    `scrollY` stops changing within 300 ms (R6.7). Another holds `j` (R6.8). Playwright's `keyboard.down` sends
    no auto-repeat, so the test sends raw CDP `Input.dispatchKeyEvent`
    events with `autoRepeat: true` every 33 ms. It checks that at release
    the position is within one step (60 px) of repeats × 60, and that
    scrolling stops within 100 ms.
  - `reinject.spec.ts` opens a long page, calls `chrome.runtime.reload()`
    from the service worker, presses `j` without refreshing, and checks
    the page moved exactly 60 px: the new copy ran, and only once (R1.5,
    R1.6). If Playwright loses the extension's service worker across the
    reload, this falls back to unit tests plus the manual check, and the
    plan says so.
  - The M0 `key-logging.spec.ts` is replaced, since the log is removed.
- **Manual check** on a real site in Arc before closing M1: a long
  article, GitHub (an inner panel and site shortcuts), and an SPA with an
  inner scrolling panel. This also covers NFR1 (the Performance panel shows
  no long task on a key press) and NFR3.

## Decisions and trade-offs

- **Our own animation over `behavior: 'smooth'`:** native smooth scrolling
  restarts from the current position on every call and has no deadline
  control, which breaks R6.8 and R6.9. A `requestAnimationFrame` loop of
  about 40 lines is testable with a fake scheduler.
- **Keymap keys as arrays (`['g','g']`), not strings (`'gg'`):** this avoids
  writing a tokenizer for `<C-d>`-style strings now. M5 needs that
  tokenizer for the text config and can add it then.
- **Prefix clashes rejected at build time:** Vim resolves `g` against `gg`
  with a timeout. Rejecting clashes keeps the parser simple and the default
  keymap has none. M5 can revisit this if users map one.
- **`i` handled by Normal mode, not the registry:** commands don't get the
  mode machine as a dependency, which keeps the Command interface
  free of mode logic. M4's help dialog will list `i` from a static entry.
- **Consumed keys also swallow their `keyup`:** some sites act on `keyup`
  (for example, closing a menu). Swallowing both halves means the page sees
  nothing of a consumed key, instead of a stray `keyup` with no `keydown`.
- **R7.4 means "the document has no overflow", not "the document is at
  its edge":** otherwise `j` at the end of an article would start scrolling
  some other panel.
- **Swallowed keys are dropped on a mismatch (R4.6):** a key already consumed
  as part of a sequence is never replayed to the page. Replaying synthetic
  events is unreliable (`isTrusted` is false) and Vim doesn't do it either.
- **Capture listener on `window` at `document_start`:** a page script that
  registers its own capture listener on `window` runs after ours, because
  ours was registered first. That's enough for R1.1, and no
  `MutationObserver` or event-hijacking tricks are needed.

## Requirements coverage

| Criterion              | Design element                                  | Test                                                         |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| R1.1                   | key listener (capture, `document_start`)        | `pass-through.spec.ts`                                       |
| R1.2                   | key listener: consume + `keyup` swallow         | `key-listener.test.ts`, `pass-through.spec.ts`               |
| R1.3                   | key listener: pass                              | `key-listener.test.ts`, `pass-through.spec.ts`               |
| R1.4                   | `controller.stop` via `onInvalidated`           | `controller.test.ts`                                         |
| R1.5, R1.7             | `reinjectContentScript`, `background.ts`        | `reinject.test.ts`, `reinject.spec.ts`                       |
| R1.6                   | WXT start event, `isValid()` guard              | `controller.test.ts`, `reinject.spec.ts`                     |
| R2.1                   | controller initial mode                         | `controller.test.ts`                                         |
| R2.2                   | Normal mode + parser `unmapped`                 | `normal.test.ts`, `pass-through.spec.ts`                     |
| R2.3, R2.5             | Insert mode                                     | `insert.test.ts`, `modes.spec.ts`                            |
| R2.4                   | Normal mode `i` (sticky)                        | `normal.test.ts`                                             |
| R2.6                   | Insert mode `blurActive`                        | `insert.test.ts`, `modes.spec.ts`                            |
| R3.1, R3.2, R3.4, R3.5 | `watchFocus`, `isEditable`, `deepActiveElement` | `focus-watcher.test.ts`, `editable.test.ts`, `modes.spec.ts` |
| R3.3                   | controller initial mode                         | `controller.test.ts` (unit only, per NFR5)                   |
| R3.6                   | `isEditable` input allow-list                   | `editable.test.ts`                                           |
| R3.7                   | mode machine sticky flag + controller           | `mode-machine.test.ts`, `controller.test.ts`                 |
| R4.1–R4.4, R4.6, R4.9  | `parseKey`                                      | `key-parser.test.ts`                                         |
| R4.5                   | Normal mode timer                               | `normal.test.ts`                                             |
| R4.7, R4.8             | Normal mode `<Esc>`                             | `normal.test.ts`                                             |
| R4.10                  | Normal mode `onExit` resets parser              | `normal.test.ts`                                             |
| R5.1, R5.2             | `Command`, `createCommandRegistry`              | `registry.test.ts`                                           |
| R5.3                   | `registry.run`                                  | `registry.test.ts`                                           |
| R5.4, R5.5             | `DEFAULT_KEYMAP`, `buildKeymapTrie`             | `defaults.test.ts`, `keymap-trie.test.ts`                    |
| R6.1–R6.6              | scroll commands                                 | `scroll.test.ts`, `scrolling.spec.ts`                        |
| R6.7–R6.9              | scroller deadlines and destinations             | `scroller.test.ts`, `scrolling.spec.ts`                      |
| R6.10                  | scroller clamping                               | `scroller.test.ts`                                           |
| R7.1–R7.4, R7.6        | scroll-target tracker                           | `scroll-target.test.ts`, `scrolling.spec.ts`                 |
| R7.5                   | scroller writes to the target only              | `scroller.test.ts`, `scrolling.spec.ts`                      |
| NFR1                   | trie lookup, cached fallback                    | manual check (Performance panel)                             |
| NFR2                   | scroller `prefersReducedMotion`                 | `scroller.test.ts`, e2e via `emulateMedia`                   |
| NFR3                   | no `Cmd` defaults; MV3                          | `defaults.test.ts` (no `<D-…>`), manual in Arc               |
| NFR4                   | M0 log removed                                  | `controller.test.ts` (no `console` calls)                    |
| NFR5                   | test plan above                                 | `npm run check`, CI                                          |

## Open questions

- None.
