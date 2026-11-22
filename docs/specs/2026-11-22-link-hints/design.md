# Link hints — Design

**Status:** Approved (2026-11-22)
**Requirements:** [requirements.md](requirements.md)

## Overview

M3 adds a third mode, **Hint mode**, and four page commands that use it: `hintClick` (`f`), `hintOpenTab` (`F`), `hintCopyUrl` (`yf`) and `focusInput` (`gi`). A hint command asks a **finder** for the visible targets, gives them labels from a pure **label generator**, and enters Hint mode. Hint mode draws the labels with the **hint overlay** in a closed shadow root, narrows them as letters are typed, and, on a full label, returns to Normal mode before running the **hint action** on the element: a simulated mouse click, a focus, a clipboard write, or a new `openTab` message to the service worker. `gi` uses the same finder without Hint mode. Everything follows the M1/M2 shape: the State pattern for the mode, the Command pattern for the keys, pure logic with injected browser pieces so it can be unit-tested in jsdom, and one more member in the typed message union, which the compiler forces the router to handle.

## Architecture

```
Normal mode ─► registry.run('hintClick' | 'hintOpenTab' | 'hintCopyUrl' | 'focusInput')
                  │
                  ▼
           commands/hints.ts
             │  focusInput: finder.find('textInput')[count-1]?.focus()
             │  hint*:      hintMode.start(action)
             ▼
        modes/hint.ts (Hint mode)
          start(action):  scroller.stop()
                          targets = finder.find(filterFor(action))   ── hints/finder.ts
                          labels  = generateLabels(targets.length)   ── hints/labels.ts
                          none? stay in Normal (R3.10)
                          machine.enter('hint')
          onEnter:        overlay.show(...)  + watchPage(end)         ── ui/hints.ts, ui/shadow-root.ts
          handleKey:      matchPrefix(labels, typed)                  ── hints/labels.ts
                          exact ─► machine.enter('normal') ─► perform(action, element)
          onExit:         overlay.remove() + stop watching
                                                       │
                                     hints/actions.ts ─┤ click: simulateClick / focus
                                                       │ copyUrl: page.writeClipboard
                                                       │ openTab: client.openTab(url) ──► service worker
                                                                                            router ─► tabs.create
```

New and changed files, following the layout in `PLAN.md`:

```
src/
  core/
    hints/
      clickable.ts        isClickable, isTextInput, linkUrl, isCopyableUrl     (new)
      labels.ts           generateLabels, matchPrefix                          (new)
      geometry.ts         Geometry interface, createDomGeometry                (new)
      finder.ts           createFinder: walk, filter, visibility               (new)
      actions.ts          simulateClick, createHintActions                     (new)
    modes/hint.ts         Hint mode                                            (new)
    commands/hints.ts     hintClick, hintOpenTab, hintCopyUrl, focusInput      (new)
    commands/registry.ts  COMMAND_NAMES gains the four names                   (changed)
    mode-machine.ts       MODE_NAMES gains 'hint'                              (changed)
    controller.ts         builds finder, overlay, Hint mode; stop() ends it    (changed)
  ui/
    shadow-root.ts        mountUiRoot: top-layer host + closed shadow root     (new)
    hints.ts              createHintOverlay: render, filter, remove            (new)
  messaging/
    protocol.ts           Message becomes a union with OpenTabMessage          (changed)
    client.ts             openTab(url)                                         (changed)
  background/
    tabs.ts               TabsApi gains create; openTab handler                (changed)
    handlers.ts           wires openTab                                        (changed)
  settings/defaults.ts    f, F, yf, gi                                         (changed)
  entrypoints/
    background.ts         passes chrome.tabs.create                            (changed)
    content.ts            passes the real Geometry pieces                      (changed)
tests/e2e/hints.spec.ts   end-to-end tests                                     (new)
```

`messaging/` still never imports `core/`, and `core/` never calls `chrome.*` directly.

## Components and interfaces

### Clickable rules (→ R1.1, R1.2, R1.4, R1.6, R4.3, R5.2, R5.3, R5.5, R6.1)

Pure predicates over one element, no layout.

```ts
// src/core/hints/clickable.ts
/** The glossary's clickable list, as one selector, plus the checks a selector can't express. */
export const CLICKABLE_SELECTOR: string;

/** Matches CLICKABLE_SELECTOR, isn't disabled (`:disabled`, `aria-disabled="true"`, or inside `[inert]`), isn't `input[type=hidden]`, a `tabindex` parses to ≥ 0, and a `label` has a `control`. Never true for `iframe`. */
export function isClickable(element: Element): boolean;

/** A text-like input, a textarea, or a contenteditable host (an editable element whose parent isn't editable). Not `select`, not elements inside an editor. */
export function isTextInput(element: Element): boolean;

/** The absolute URL of an `a` (HTML or SVG) with an `href`, resolved against `baseURI`; undefined for any other element or an unparseable href. */
export function linkUrl(element: Element): URL | undefined;

/** http, https, mailto, file (R5.3). */
export function isCopyableUrl(url: URL): boolean;
/** http, https (R5.2, NFR3.2). */
export function isOpenableUrl(url: URL): boolean;
```

`CLICKABLE_SELECTOR` is `a[href], button, input, textarea, select, summary, label, [role=button], [role=link], [role=checkbox], [role=radio], [role=tab], [role=menuitem], [role=option], [role=switch], [onclick], [tabindex], [contenteditable]` (contenteditable hosts only, not `"false"`). `isClickable` adds the checks that need code: not disabled, not hidden input, valid tabindex, `label.control !== null`. `area` is left out: it has no layout box (Out of scope).

### Labels (→ R2.1–R2.4, R3.1–R3.3)

Pure functions, the heart of the unit tests.

```ts
// src/core/hints/labels.ts
export const HINT_ALPHABET = 'sadfjklewcmpgh'; // lives in settings/defaults.ts, re-exported for M5

/** `count` distinct, prefix-free labels, shortest first, in the order targets are given. */
export function generateLabels(count: number, alphabet: string): readonly string[];

export type PrefixMatch =
  | { readonly kind: 'none' }
  | { readonly kind: 'partial'; readonly visible: readonly number[] }
  | { readonly kind: 'exact'; readonly index: number };

/** Matches lower-case `prefix` against `labels`. An empty prefix is `partial` with every index. */
export function matchPrefix(labels: readonly string[], prefix: string): PrefixMatch;
```

`generateLabels` uses Vimium's breadth-first expansion: start with `['']`, and while fewer than `count` unexpanded labels remain, replace the first label with itself followed by each letter. Take the first `count` labels. This gives one-letter labels to the first targets and two-letter labels to the rest, is prefix-free by construction, and never exceeds the smallest `L` with `A^L ≥ N` (R2.3). Targets get labels in document order, which also makes the labels predictable in end-to-end tests.

### Geometry (→ R1.1–R1.3, R2.6)

Everything that needs layout, behind one interface so the finder runs in jsdom with fakes. jsdom has no layout, no `checkVisibility` and no `elementFromPoint`.

```ts
// src/core/hints/geometry.ts
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface Geometry {
  /** The layout viewport: 0, 0, innerWidth, innerHeight. */
  viewport(): Rect;
  /** element.getClientRects(): several for a link that wraps lines. */
  rects(element: Element): readonly Rect[];
  /** element.checkVisibility({ opacityProperty: true, visibilityProperty: true }). */
  isRendered(element: Element): boolean;
  /** The deepest element at a viewport point, descending through open and closed shadow roots. */
  hitTest(x: number, y: number): Element | null;
}

export function createDomGeometry(win: Window, shadowRootOf: ShadowRootOf): Geometry;
```

### Finder (→ R1.1–R1.6, R6.1, NFR1.1)

```ts
// src/core/hints/finder.ts
export type TargetFilter = 'clickable' | 'copyableLink' | 'textInput';

export interface HintTarget {
  readonly element: Element;
  /** The part of the element's first in-viewport rect that is inside the viewport. */
  readonly rect: Rect;
}

export interface Finder {
  /** Visible targets in document order, shadow content in place of its host. */
  find(filter: TargetFilter): readonly HintTarget[];
}

export function createFinder(deps: {
  readonly document: Document;
  readonly shadowRootOf: ShadowRootOf;
  readonly geometry: Geometry;
}): Finder;
```

How `find` works:

1. **Walk** the document with one `TreeWalker` over elements. For each element: test the filter, and if `shadowRootOf(element)` returns a root, walk it right there, so shadow content stays in document order (R1.1). `iframe` contents are never entered (R1.5). The filter per kind: `clickable` → `isClickable`; `copyableLink` → `linkUrl` defined and `isCopyableUrl` (R1.6); `textInput` → `isTextInput`.
2. **Labels around their control** (R1.4): a `label` whose `control` is a descendant, and which holds no other clickable element, is dropped when the control itself is a visible target, and kept otherwise. That covers the common "invisible checkbox inside a styled label" pattern. A label that also holds, say, a "terms" link keeps its own hint. Nested elements sharing a top-left corner may get overlapping labels; that's accepted for M3 and checked by hand.
3. **Visibility**, cheapest check first: `isRendered`, then the first rect from `rects` that has non-zero size and intersects the viewport, clipped to the viewport (R1.2). Elements outside the viewport stop here, so the expensive check only runs on the few hundred on screen.
4. **Covered** (R1.3): `hitTest` at the clipped rect's centre, then at its top-left corner inset by 2 px. The element is visible if either hit is the element or inside it (a composed `contains` that crosses shadow roots). Otherwise it's covered and dropped.

### Hint overlay (→ R2.5, R2.6, R3.1, R7.1, R7.5, NFR5)

```ts
// src/ui/shadow-root.ts
export interface UiRoot {
  readonly root: ShadowRoot;
  /** Removes the host from the page. Safe to call twice or after the page removed it. */
  unmount(): void;
}

/** Appends one host to documentElement with a closed shadow root, shown in the top layer. */
export function mountUiRoot(doc: Document): UiRoot;

// src/ui/hints.ts
export interface HintView {
  readonly label: string;
  readonly rect: Rect;
}

export interface HintOverlay {
  show(hints: readonly HintView[]): void;
  /** Hides hints not in `visible` and marks the first `typed` letters of the others. */
  filter(visible: readonly number[], typed: number): void;
  remove(): void;
}

export function createHintOverlay(deps: {
  readonly mount: () => UiRoot;
  readonly viewport: () => Rect;
}): HintOverlay;
```

- **Host:** a custom element `<vim-hints>` with `popover="manual"` and `aria-hidden="true"` (NFR5.2), shown with `showPopover()`. The top layer puts it above the page's own `z-index` and modal `<dialog>`s. Its inline style sets `all: initial`, `position: fixed`, `inset: 0`, `margin: 0`, `padding: 0`, `border: 0`, `background: transparent` and `pointer-events: none`, each `!important`. An inline `!important` beats any author rule, so page CSS can't move it or make it catch clicks (R2.6, R7.5). jsdom lacks `showPopover`, so the call is skipped when it isn't a function.
- **Hints:** one `<span>` per hint, absolutely positioned at the rect's top-left, clamped to the viewport. After inserting them, the overlay reads each span's `offsetWidth` once, in a single batch, and moves any span that crosses the right or bottom edge back inside (R2.6). The text is the label in upper case (R2.5). Typed letters are in a nested span with a dimmer colour.
- **Style:** a `<style>` inside the shadow root with black text (`#000`) on yellow (`#ffd94a`), a contrast of about 15:1, and dark grey typed letters (`#5a4a00`, about 6.8:1) (NFR5.1). The font is `12px/1.2 ui-monospace, monospace`, bold, with a 1 px border and 3 px radius.
- `remove()` unmounts the host. No element, style or listener of ours stays in the page (R7.1).

### Hint mode (→ R3, R4.1, R5.1, R5.3, R7.1–R7.4, R7.7)

```ts
// src/core/modes/hint.ts
export type HintAction = 'click' | 'openTab' | 'copyUrl';

export interface HintMode extends Mode {
  /** Finds targets for `action`. Enters Hint mode if there are any; else does nothing (R3.10). */
  start(action: HintAction): void;
}

export function createHintMode(deps: {
  readonly machine: Pick<ModeMachine, 'enter'>;
  readonly finder: Pick<Finder, 'find'>;
  readonly overlay: HintOverlay;
  readonly alphabet: string;
  readonly perform: (action: HintAction, element: Element) => void;
  /** Stops any scroll animation, so our own `j` doesn't end the hints it just made. */
  readonly stopScrolling: () => void;
  /** Calls `onChange` once on a relevant scroll, resize, window blur or visibilitychange; returns stop. See "Ending on page changes". */
  readonly watchPage: (onChange: () => void) => () => void;
}): HintMode;
```

State, set by `start` and cleared by `onExit`: the action, the targets, their labels and the typed prefix.

`handleKey(press)`, in this order:

| Key                                         | Result                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| contains `C-`, `A-` or `D-` (e.g. `<C-t>`)  | `enter('normal')`, `'passed'` (R3.7)                                                                              |
| `press.repeat`                              | `'consumed'`, nothing else (R3.9)                                                                                 |
| `<Esc>`, `<C-[>`                            | `enter('normal')`, `'consumed'` (R3.5). `<C-[>` is checked before the modifier rule.                              |
| `<BS>`                                      | drop the last typed letter if any, `overlay.filter(...)`, `'consumed'` (R3.3, R3.4)                               |
| one character, lower-cased, gives `partial` | `overlay.filter(visible, typed.length)`, `'consumed'` (R3.1)                                                      |
| gives `exact`                               | remember the element, `enter('normal')` (removes the hints), then `perform(action, element)`, `'consumed'` (R3.2) |
| anything else (`none`, `<CR>`, `<Space>`…)  | `enter('normal')`, `'consumed'` (R3.6)                                                                            |

`onEnter` shows the overlay and starts `watchPage(() => machine.enter('normal'))` (R7.2).

**Ending on page changes (R7.2).** `watchPage` listens on the window in the capture phase. A scroll ends Hint mode only when the scrolled thing is the document, or an element that contains a hinted element (`target.contains(hinted)`). A carousel or ticker scrolling elsewhere leaves the hints alone. Scroll events in the first two animation frames after the hints are shown are ignored, so the last frame of our own `j` animation or trackpad momentum doesn't cancel `f`. Scrolls inside shadow roots don't reach the window (scroll isn't composed), so those hints can go stale. That's a known gap, covered by the manual check. Resize, `blur` and `visibilitychange` always end it.

**Focus while hints are up (R7.3).** The controller's focus watcher callback ignores non-editable focus changes while `machine.current === 'hint'`. Only an editable getting focus ends Hint mode (by entering Insert). Pages that move focus between buttons don't cancel the hints. `onExit` stops watching, removes the overlay and clears the state (R7.1). An editable getting focus already goes through the controller's focus watcher, which calls `machine.enter('insert')`, and that runs `onExit` (R7.3). A new `start` always runs the finder again (R7.4).

### Hint actions (→ R4.2–R4.6, R5.2, R5.4–R5.6, R5.8)

```ts
// src/core/hints/actions.ts
/** pointerover, pointerenter, mouseover, mouseenter, pointerdown, mousedown, (focus), pointerup, mouseup, click, at the centre of the element's first visible rect. Every event: bubbling (enter events don't), composed, cancelable, `view`, `clientX/Y`, `button: 0`, `detail: 1`; pointer events add `pointerType: 'mouse'`, `isPrimary: true`, `pointerId: 1`; `buttons` is 1 while pressed and 0 otherwise. After mousedown, a focusable element (`tabIndex >= 0` or natively focusable) gets `focus({ preventScroll: true })`, as a real press does. All events are dispatched even if the page cancels one. The dispatched `click` runs the browser's own activation behaviour (links follow, checkboxes toggle, target=_blank opens). */
export function simulateClick(element: Element, geometry: Pick<Geometry, 'rects'>): void;

export function createHintActions(deps: {
  readonly geometry: Pick<Geometry, 'rects'>;
  readonly writeClipboard: (text: string) => Promise<void>;
  readonly client: Pick<MessageClient, 'openTab'>;
}): (action: HintAction, element: Element) => void;
```

- **Every action** first checks `element.isConnected` and `!element.matches(':disabled')`, and does nothing otherwise (R4.6).
- **click:** if `isTextInput(element)` or it is a `select`, call `focus()`. Links inside an editor aren't text inputs, so they're clicked. The focus watcher then enters Insert mode (R4.3, R4.4). Otherwise, call `simulateClick`. Synthetic mouse events are dispatched with `dispatchEvent`, and a dispatched `click` runs the element's activation behaviour. The keydown still gives the page transient user activation, so `target=_blank` and `window.open` from click handlers aren't blocked (R4.5).
- **openTab:** if `linkUrl` gives an openable URL, call `client.openTab(url.href)`. Otherwise, run the click action (R5.5).
- **copyUrl:** `writeClipboard(linkUrl(element).href)`, swallowing a rejection as `yy` does (R5.4, R5.6).

### Commands (→ R4.1, R4.7, R5.1, R5.3, R5.7, R6)

```ts
// src/core/commands/hints.ts
export const HINT_COMMAND_NAMES = [
  'hintClick',
  'hintOpenTab',
  'hintCopyUrl',
  'focusInput',
] as const;

export function createHintCommands(deps: {
  readonly hints: Pick<HintMode, 'start'>;
  readonly finder: Pick<Finder, 'find'>;
}): readonly Command[];
```

These are all page commands wrapped in `onceOnly`, so auto-repeat runs them once. `hintClick`, `hintOpenTab` and `hintCopyUrl` set `acceptsCount: false` (R4.7, R5.7). `focusInput` sets `acceptsCount: true` and focuses `targets[min(count ?? 1, length) - 1]` from `finder.find('textInput')`, or does nothing on an empty list (R6.1–R6.3). It uses a plain `focus()`, which keeps the value and lets the browser place the caret (R6.4). The focus watcher enters Insert mode.

Keymap additions: `f` → `hintClick`, `F` → `hintOpenTab`, `y f` → `hintCopyUrl`, `g i` → `focusInput`. None of them clashes with M1/M2 sequences.

### Messages and the service worker (→ R5.2, R5.6, NFR3)

```ts
// src/messaging/protocol.ts
export interface RunCommandMessage {
  readonly type: 'runCommand';
  readonly command: BackgroundCommandName;
  readonly count?: number;
}
export interface OpenTabMessage {
  readonly type: 'openTab';
  /** An absolute http or https URL. */
  readonly url: string;
}
export type Message = RunCommandMessage | OpenTabMessage;

// isMessage also accepts openTab whose url is a string of at most 32,768 characters that parses with URL.canParse and has an http: or https: protocol (NFR3.2).

// src/messaging/client.ts — MessageClient gains:
openTab(url: string): Promise<void>; // never rejects

// src/background/tabs.ts — TabInfo gains `openerTabId?: number`; TabsApi gains:
create(props: {
  readonly url: string;
  readonly active: false;
  readonly index: number;
  readonly windowId: number;
  readonly openerTabId: number;
}): Promise<unknown>;
export function createOpenTabHandler(deps: { readonly tabs: TabsApi }): MessageHandlers['openTab'];
```

The handler reads the window's tabs (`tabs.query({ windowId })`, sorted by index), finds the current tab, then walks forward while the next tab's `openerTabId` is the current tab. It creates the new tab at the index after the last one found: `tabs.create({ url, active: false, index, windowId, openerTabId: ctx.tabId })`. Several `F` presses keep their order, as Ctrl/Cmd-click does, and the worker stays stateless (R5.2). `openerTabId` and `index` are readable without the `tabs` permission. If the current tab isn't in the list, the tab is created without `index`. The manual check confirms that Arc keeps `openerTabId`; if it doesn't, each tab lands right after the current one. `chrome.tabs.create` needs no permission (NFR3.1). Adding `OpenTabMessage` to the union makes `MessageHandlers` demand the handler at compile time. The router's existing sender checks cover NFR3.3, and its try/catch covers R5.6.

### Controller wiring (→ R7.6, R7.7)

`createModes` builds Hint mode next to Normal and Insert, and `createModeMachine` gets all three. Insert mode passes every key, so `f`, `F`, `y`, `g` never start hints there (R7.6). `stop()` calls `machine.enter('normal')` before removing listeners, so an invalidated extension removes its hints (R7.7). `stop()` runs on WXT's `ctx.onInvalidated` (fired when a reloaded extension's new script starts) or on the next key that finds `isValid()` false. A plain disable with hints up removes them at the next key press, not instantly: polling would break NFR1.3. `ControllerDeps` gains `geometry: Geometry`, which `content.ts` builds with `createDomGeometry(window, shadowRootOf)`, and `client` widens to `Pick<MessageClient, 'sendCommand' | 'openTab'>`. `watchPage` is built in the controller from `deps.window`.

## Data and state

- **Hint mode state** (content script, in memory): the action, the targets, labels and typed prefix. It's created by `start`, and cleared by `onExit` whatever the reason (picked, cancelled, page change, Insert mode, `stop()`).
- **Overlay:** the shadow host exists only while Hint mode is on.
- **Service worker:** no new state. `openTab` reads everything from the message and the sender.

## Error handling

| Situation (→ criterion)                                                 | Handling                                                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| No targets for `f`/`F`/`yf` (R3.10)                                     | `start` returns without entering Hint mode; the key was already consumed by Normal mode. |
| No text input for `gi` (R6.3)                                           | `focusInput` does nothing.                                                               |
| Element removed or disabled before picking (R4.6)                       | The `isConnected` / `:disabled` check in the actions; nothing happens.                   |
| Page removes our host while hints are up                                | `unmount` is a no-op on a detached host; the mode still ends normally on the next key.   |
| Clipboard refused (R5.6)                                                | The rejection is swallowed; no log (NFR4.1).                                             |
| `openTab` fails: worker unreachable, tab closed, `create` throws (R5.6) | The client swallows send errors; the router swallows handler errors.                     |
| Forged or malformed `openTab` (NFR3.2, NFR3.3)                          | `isMessage` rejects non-http(s) and oversize URLs; the router rejects foreign senders.   |
| Page or our own animation scrolls while hints are up (R7.2)             | `stopScrolling()` before showing; any later scroll ends Hint mode.                       |
| `showPopover` missing or throws (old engine, jsdom)                     | Caught; the host still shows as a fixed element at the top `z-index`.                    |
| Extension invalidated with hints up (R7.7)                              | `controller.stop()` enters Normal mode first, which removes the overlay.                 |

## Testing strategy

Tests first, as `CONTRIBUTING.md` requires. Coverage stays ≥ 80%.

- **Unit (Vitest, jsdom):**
  - `labels.test.ts`:
    - counts 0, 1, 14, 15, 196, 197 and 2,744.
    - labels are prefix-free, distinct and alphabet-only, and the length bound holds.
    - `matchPrefix`: none, partial, exact, empty prefix, upper case.
  - `clickable.test.ts`:
    - every selector entry.
    - disabled elements, hidden inputs, `tabindex=-1`, labels without a control, iframes.
    - `linkUrl` for HTML and SVG links, relative and bad hrefs, and the URL schemes.
  - `finder.test.ts`, with a fake `Geometry` keyed by element:
    - off-screen, zero-size, not rendered and covered elements are dropped.
    - the second hit-test point is used.
    - clipping to the viewport; wrapped links use their first visible rect.
    - shadow-root content stays in document order (open root and fake closed root).
    - iframes are skipped; the label-around-control rule; each filter.
  - `geometry.test.ts`: `createDomGeometry` with stubbed `getClientRects` / `checkVisibility` / `elementFromPoint`, including the shadow-root descent.
  - `actions.test.ts`:
    - the event order and properties `simulateClick` dispatches.
    - an editable is focused instead of clicked.
    - detached and disabled elements do nothing.
    - `openTab` with an http(s) link vs. a `javascript:` link (falls back to click).
    - the copy path, including a rejected copy.
  - `hint.test.ts`, with fakes for finder, overlay, machine and `watchPage`:
    - every row of the key table.
    - `start` with no targets, then `start` again (finds again).
    - `onExit` cleans up; `watchPage` ends the mode.
    - `stopScrolling` is called before finding.
  - `ui/hints.test.ts`: show, filter, upper case, typed marking, clamping (with stubbed `offsetWidth`), `aria-hidden`, remove; `mountUiRoot` and a double `unmount`.
  - `commands/hints.test.ts`: the four commands, counts on `gi`, and that repeat is ignored.
  - Protocol, client, router and `tabs.ts` tests are extended: `isMessage` for `openTab` (bad scheme, oversize, non-string), `client.openTab` never rejects, the `openTab` handler's `create` arguments (first tab, several in a row keeping their order, an unrelated tab after the current one, current tab missing).
  - `controller.test.ts`: `stop()` removes an open overlay.
- **End-to-end (Playwright, `tests/e2e/hints.spec.ts`):** a fixture page with fewer than 14 targets, so labels are the single letters `s`, `a`, `d`, … in document order. It also has a hidden link, an off-screen link, a link covered by an overlay, an iframe with a link, a button inside a closed shadow root, a text input, a checkbox inside a label and a `target=_blank` link. Tests:
  - `f` + label follows a link and clicks a button (the page records the click).
  - `f` on the input enters Insert mode (the next letters are typed into it).
  - `F` opens a background tab right after the current one; the service worker's `chrome.tabs.query` shows it inactive.
  - `yf` copies (clipboard permission granted, as in M2's `yy` test).
  - `gi` and `2gi`.
  - `Esc`, a non-label key (the page sees neither) and `<C-…>` cancel.
  - scrolling cancels; a page with no targets does nothing.
  - the hidden, off-screen, covered and iframe links get no label: the label count is checked through the order of the others.
  - the `<vim-hints>` host is gone after every exit.

  The shadow root is closed, so tests check behaviour and the host's presence, not the label DOM.

- **Performance:** no timed automated test, which would be flaky in CI. An untimed e2e smoke test opens a generated fixture with 1,000 clickables among about 10,000 elements and checks that `f` + a two-letter label works. NFR1.1 and NFR1.2 are checked by hand in the DevTools Performance panel, on that fixture and on a big real page (a GitHub diff).
- **Manual check (Arc and Chrome):**
  - Hints look right and stay on top on GitHub, YouTube, a long article and a page with a modal.
  - `F` places the tab next to the current one in Arc's sidebar.
  - Timing: the DevTools Performance panel shows `f` to painted hints under 100 ms on a big page (NFR1.1).
  - Labels are readable in light and dark pages.

## Decisions and trade-offs

- **Hint mode is a real mode in the machine,** not a flag in Normal mode. That's the State pattern `CONTRIBUTING.md` asks for, and leaving it through `enter()` gives every exit path the same cleanup (`onExit`).
- **`start()` lives on the mode, outside `enter()`:** the mode machine's `enter` has no payload, and the targets must be found before deciding to enter at all (R3.10). Adding the action to `EnterOptions` would mix a Hint-only field into every mode.
- **One `TreeWalker` pass with `matches()`** rather than `querySelectorAll` per root plus a separate host search. One pass keeps document order across shadow roots for free and visits each element once. The cost is a `matches` and a `shadowRootOf` call per element, about 10 ms per 10,000 elements. The manual check verifies NFR1.1 on large pages.
- **Hit-testing two points** rather than one point or the whole rect. The centre alone misses links half under a sticky header. Sampling many points costs more for little gain.
- **Top-layer popover host** rather than only `z-index: 2147483647`. The top layer is the only way above a page's modal `<dialog>` and fullscreen-like overlays. It needs Chrome 114+, which current Arc and Chrome meet, with a fixed-position fallback.
- **End Hint mode on scroll and resize** instead of repositioning (requirements decision). Fixed positions are then always right, and there's no observer running while hints are up.
- **Simulated mouse events, not `element.click()` alone:** menus and React handlers often listen to `mousedown`/`pointerdown`. `dispatchEvent` of a `click` still runs the native activation, so links and checkboxes behave as with `click()`.
- **The tab position comes from the window's tab list and `openerTabId`,** not from remembering the last index: it keeps `F` order with no service-worker state (M2's R1.8). Using `sender.tab.index + 1` alone would put the tabs in reverse.
- **Layout viewport only:** visibility and positions use `innerWidth`/`innerHeight`, not `visualViewport`. Under pinch-zoom, hints may land outside what's on screen. Pinch-zoom is out of scope for M3.
- **`aria-disabled` and `inert` count as disabled:** they're how ARIA widgets and non-modal overlays say "not clickable now", and the same check backs R4.6.
- **`file:` is copyable but not openable:** a content script can't make the service worker open `file:` URLs without extra permission, and copying one is harmless.

## Requirements coverage

| Criterion | Design element                                     | Test                                                         |
| --------- | -------------------------------------------------- | ------------------------------------------------------------ |
| R1.1      | finder walk + shadow descent; `isClickable`        | `finder.test.ts`, `clickable.test.ts`; e2e shadow button     |
| R1.2      | finder visibility steps; `isClickable` disabled    | `finder.test.ts`; e2e hidden / off-screen links              |
| R1.3      | finder covered check; `Geometry.hitTest`           | `finder.test.ts`, `geometry.test.ts`; e2e covered link       |
| R1.4      | finder label-around-control rule                   | `finder.test.ts`; e2e label + checkbox                       |
| R1.5      | walker skips iframe; `isClickable` excludes iframe | `finder.test.ts`; e2e iframe link                            |
| R1.6      | `copyableLink` filter                              | `finder.test.ts`; e2e `yf`                                   |
| R2.1–R2.4 | `generateLabels`                                   | `labels.test.ts`                                             |
| R2.5      | overlay upper case; `matchPrefix` lower-cases      | `ui/hints.test.ts`, `labels.test.ts`, `hint.test.ts`         |
| R2.6      | overlay positioning, clamping, top-layer host      | `ui/hints.test.ts`; manual check                             |
| R3.1      | Hint mode `partial` row; `overlay.filter`          | `hint.test.ts`, `ui/hints.test.ts`                           |
| R3.2      | Hint mode `exact` row                              | `hint.test.ts`; e2e `f`                                      |
| R3.3–R3.4 | Hint mode `<BS>` row                               | `hint.test.ts`                                               |
| R3.5      | Hint mode `<Esc>` row                              | `hint.test.ts`; e2e Esc                                      |
| R3.6      | Hint mode "anything else" row                      | `hint.test.ts`; e2e non-label key                            |
| R3.7      | Hint mode modifier row                             | `hint.test.ts`; e2e `<C-…>`                                  |
| R3.8      | key table returns `'consumed'` except R3.7         | `hint.test.ts`                                               |
| R3.9      | Hint mode repeat row; `onceOnly` on commands       | `hint.test.ts`, `commands/hints.test.ts`                     |
| R3.10     | `start` with no targets                            | `hint.test.ts`; e2e empty page                               |
| R4.1      | `hintClick` + keymap `f`                           | `commands/hints.test.ts`; e2e                                |
| R4.2      | `simulateClick`                                    | `actions.test.ts`; e2e button click                          |
| R4.3–R4.4 | click action focuses editables; focus watcher      | `actions.test.ts`; e2e input                                 |
| R4.5      | native activation of dispatched click              | e2e `target=_blank`                                          |
| R4.6      | `isConnected` / `:disabled` check                  | `actions.test.ts`                                            |
| R4.7      | `acceptsCount: false`                              | `commands/hints.test.ts`                                     |
| R5.1      | `hintOpenTab` + keymap `F`                         | `commands/hints.test.ts`; e2e                                |
| R5.2      | openTab action, message, handler `create` args     | `actions.test.ts`, `tabs.test.ts`; e2e `F`; manual Arc check |
| R5.3      | `hintCopyUrl` + `copyableLink` filter              | `commands/hints.test.ts`, `finder.test.ts`                   |
| R5.4      | copyUrl action                                     | `actions.test.ts`; e2e `yf`                                  |
| R5.5      | openTab action falls back to click                 | `actions.test.ts`                                            |
| R5.6      | swallowed rejections in actions, client, router    | `actions.test.ts`, `client.test.ts`, `router.test.ts`        |
| R5.7      | `acceptsCount: false`                              | `commands/hints.test.ts`                                     |
| R5.8      | actions only call clipboard / `openTab`            | `actions.test.ts`; code review                               |
| R6.1–R6.3 | `focusInput`                                       | `commands/hints.test.ts`; e2e `gi`, `2gi`                    |
| R6.4      | plain `focus()`                                    | `commands/hints.test.ts`; e2e value unchanged                |
| R7.1      | `onExit` + `overlay.remove` + `unmount`            | `hint.test.ts`, `ui/hints.test.ts`; e2e host gone            |
| R7.2      | `watchPage`, `stopScrolling`                       | `hint.test.ts`, `controller.test.ts`; e2e scroll             |
| R7.3      | focus watcher → `enter('insert')` → `onExit`       | `controller.test.ts`                                         |
| R7.4      | `start` always runs the finder                     | `hint.test.ts`                                               |
| R7.5      | fixed top-layer host, no focus or selection change | `ui/hints.test.ts`; manual check                             |
| R7.6      | Insert mode passes keys                            | existing Insert mode tests; e2e                              |
| R7.7      | `controller.stop()` enters Normal first            | `controller.test.ts`                                         |
| NFR1.1    | cheap-first finder, batched layout reads           | manual DevTools check; e2e large fixture smoke               |
| NFR1.2    | `overlay.filter` toggles `hidden` only             | `ui/hints.test.ts`                                           |
| NFR1.3    | listeners only while in Hint mode                  | `hint.test.ts`                                               |
| NFR2      | no `Cmd` default; standard MV3 APIs                | keymap test; manual check                                    |
| NFR3.1    | `tabs.create` needs no permission                  | `manifest.test.ts` unchanged                                 |
| NFR3.2    | `isMessage` URL check                              | `protocol.test.ts`                                           |
| NFR3.3    | existing router sender check                       | `router.test.ts`                                             |
| NFR4.1    | no logging anywhere in the new code                | code review                                                  |
| NFR5.1    | overlay colours                                    | manual check                                                 |
| NFR5.2    | `aria-hidden` host                                 | `ui/hints.test.ts`                                           |
| NFR6.1    | this strategy                                      | `npm run check`, `npm run test:e2e`                          |

## Open questions

- None.
