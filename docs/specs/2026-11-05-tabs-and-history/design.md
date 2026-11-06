# Tabs and history — Design

**Status:** Approved (2026-11-05)
**Requirements:** [requirements.md](requirements.md)

## Overview

M2 adds 15 keys and the first background commands. Every key still goes through the M1 path: key listener → Normal mode → key parser → command registry. What changes is what a command can be. Ten commands (the tab and history ones) are **background commands**: the content script registers a thin proxy for each, which sends one typed message to the service worker, and a router there runs the real handler with the `chrome.tabs`, `chrome.sessions` and `chrome.webNavigation` APIs. The other four (`reload`, `copyUrl`, `urlUp`, `urlRoot`) are **page commands**: they only need `location` and the clipboard, which the page already has, so they skip the round trip. The service worker keeps no state: each handler reads the tab list or the closed-tab list from the browser when it runs, so a stopped worker costs nothing.

## Architecture

```
Content script (every page)                    Service worker
─────────────────────────────                  ───────────────────────────────
Normal mode ─► registry.run(name, ctx)
                  │
   page command ──┤──► location / clipboard / url.ts
                  │
 background cmd ──┘──► proxy: ignore auto-repeat, then
                       client.sendCommand(name, count)
                              │  chrome.runtime.sendMessage({ type: 'runCommand', command, count? })
                              ▼
                        onMessage ─► router.handle(message, sender)
                                         │ sender is our content script, top frame, has a tab?
                                         │ message is in the protocol?
                                         ▼
                                    handlers['runCommand']
                                         │
                                         ▼
                                    commandHandlers[command](count, { tabId, windowId })
                                         │
                                         ▼
                           TabsApi / SessionsApi / HistoryApi
                           (chrome.tabs, chrome.sessions, chrome.webNavigation)
```

New and changed files, following the layout in `PLAN.md`:

```
src/
  messaging/
    protocol.ts           BACKGROUND_COMMAND_NAMES, Message, isMessage   (new)
    client.ts             sendCommand that never throws                   (new)
    router.ts             createRouter, MessageHandlers, HandlerContext   (new)
  background/
    tabs.ts               tab and session handlers                        (new)
    history.ts            back and forward handlers                       (new)
    handlers.ts           wires handlers to the real chrome.* APIs        (new)
  core/
    url.ts                parentUrl, rootUrl: pure URL functions          (new)
    commands/
      registry.ts         COMMAND_NAMES grows; onceOnly helper            (changed)
      background.ts       the ten proxy commands                          (new)
      navigation.ts       reload, copy and URL commands                   (new)
    controller.ts         builds the new commands, new deps               (changed)
  settings/defaults.ts    15 new keymap entries                           (changed)
  entrypoints/
    background.ts         registers onMessage                             (changed)
    content.ts            supplies the real send / location / clipboard   (changed)
wxt.config.ts             adds `sessions` and `webNavigation`             (changed)
```

## Components and interfaces

### Protocol (→ R1.1, R1.2, R1.3, R1.5)

The single source of truth for what the content script may ask. The command names live here, not in the registry, so the registry can import them and `messaging/` never imports `core/`.

```ts
// src/messaging/protocol.ts
export const BACKGROUND_COMMAND_NAMES = [
  'tabNext',
  'tabPrevious',
  'tabGoTo',
  'tabFirst',
  'tabLast',
  'tabClose',
  'tabRestore',
  'tabDuplicate',
  'historyBack',
  'historyForward',
] as const;
export type BackgroundCommandName = (typeof BACKGROUND_COMMAND_NAMES)[number];

/** Every message from a content script to the service worker. Add a member here and the router stops compiling until it has a handler. */
export type Message = {
  readonly type: 'runCommand';
  readonly command: BackgroundCommandName;
  /** Absent when no count was typed (JSON drops `undefined`). */
  readonly count?: number;
};

/** True only for a well-formed Message: known type, known command, count absent or an integer 1–9999 (M1's parser already caps counts at 9999, so a real count is never rejected). */
export function isMessage(value: unknown): value is Message;
```

One message type carries the command name, instead of one message type per command. The mapped types below make the compiler demand a handler for each member of either union.

### Message client (→ R1.3, R1.6, R10.7)

Runs in the content script. It never throws and never rejects, so a stopped worker, an invalidated extension or a closed tab can't surface an error in the page.

```ts
// src/messaging/client.ts
export interface MessageClient {
  /** Fire and forget: resolves when sent or when sending failed. */
  sendCommand(command: BackgroundCommandName, count: number | undefined): Promise<void>;
}

/** `send` is chrome.runtime.sendMessage in the extension. It may throw or reject. */
export function createMessageClient(send: (message: Message) => Promise<unknown>): MessageClient;
```

### Router (→ R1.2, R1.4, R1.5, R1.6, R1.8, R10.5, R10.6, NFR3.3)

Validates the sender and the message, then dispatches to the handler for the message's type. It keeps no state.

```ts
// src/messaging/router.ts
export interface HandlerContext {
  /** The tab and window where the key was pressed (R10.5). */
  readonly tabId: number;
  readonly windowId: number;
}

/** A handler for every Message type, checked by the compiler (R1.2). */
export type MessageHandlers = {
  readonly [T in Message['type']]: (
    message: Extract<Message, { type: T }>,
    ctx: HandlerContext,
  ) => Promise<void>;
};

/** A handler for every background command, checked by the compiler (R1.2). */
export type BackgroundCommandHandlers = {
  readonly [K in BackgroundCommandName]: (
    count: number | undefined,
    ctx: HandlerContext,
  ) => Promise<void>;
};

export interface SenderInfo {
  readonly id?: string | undefined;
  readonly frameId?: number | undefined;
  readonly tab?:
    { readonly id?: number | undefined; readonly windowId?: number | undefined } | undefined;
}

export interface Router {
  /** Never rejects: the whole body, `isMessage` and the sender checks included, runs inside one try/catch. Ignores a sender whose id is not ours, that has no tab, or whose `frameId` is defined and not 0 (R1.4, R10.6), and a message that fails `isMessage` (R1.5). Swallows handler failures (R1.6). */
  handle(message: unknown, sender: SenderInfo): Promise<void>;
}

export function createRouter(deps: {
  readonly handlers: MessageHandlers;
  /** chrome.runtime.id */
  readonly extensionId: string;
}): Router;
```

### Tab handlers (→ R2, R3, R4, R5, R10.5)

The real work of the eight tab commands. Each one reads the tab list when it runs (R1.8) and only uses the tab and window from `HandlerContext`, never "the current window" or "the active tab".

```ts
// src/background/tabs.ts
export interface TabInfo {
  readonly id?: number | undefined;
  readonly index: number;
}

/** chrome.tabs, narrowed to what M2 uses. No "tabs" permission: only ids and indexes are read (NFR3.2). */
export interface TabsApi {
  query(filter: { readonly windowId: number }): Promise<readonly TabInfo[]>;
  update(tabId: number, props: { readonly active: true }): Promise<unknown>;
  remove(tabId: number): Promise<void>;
  duplicate(tabId: number): Promise<TabInfo | undefined>;
}

export interface ClosedEntry {
  readonly tab?: { readonly sessionId?: string | undefined } | undefined;
}

/** chrome.sessions, narrowed. */
export interface SessionsApi {
  getRecentlyClosed(filter: { readonly maxResults: number }): Promise<readonly ClosedEntry[]>;
  restore(sessionId: string): Promise<unknown>;
}

export type TabCommandName = Exclude<BackgroundCommandName, 'historyBack' | 'historyForward'>;

export function createTabHandlers(deps: {
  readonly tabs: TabsApi;
  readonly sessions: SessionsApi;
}): Pick<BackgroundCommandHandlers, TabCommandName>;
```

How each handler decides:

| Command        | Behavior                                                                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabNext`      | `move(+(count ?? 1))`                                                                                                                                                                                                                             |
| `tabPrevious`  | `move(-(count ?? 1))`                                                                                                                                                                                                                             |
| `tabGoTo`      | no count: `move(+1)`; count N: activate the tab at position `min(N, tabs.length)` (1-based) (R2.5, R2.6)                                                                                                                                          |
| `tabFirst`     | activate position 1; nothing if it is the current tab                                                                                                                                                                                             |
| `tabLast`      | activate the last position; nothing if it is the current tab                                                                                                                                                                                      |
| `tabClose`     | `tabs.remove(ctx.tabId)`; closing the last tab of a window is left to the browser (R4.3)                                                                                                                                                          |
| `tabRestore`   | `getRecentlyClosed({ maxResults: 25 })`, keep entries that have `tab.sessionId`, take the first `count ?? 1`, `restore` each in that order, most recent first (R4.4–R4.6). Window entries are skipped. With no tab entries it does nothing (R4.7) |
| `tabDuplicate` | `duplicate(ctx.tabId)`, then `update(copy.id, { active: true })` so the copy is active however the browser leaves it (R5.1)                                                                                                                       |

`move(delta)` queries the tabs of `ctx.windowId`, sorts them by `index`, finds the current tab's position `p`, and activates the tab at `((p + delta) % n + n) % n`. If `n` is 1 or the target is `p` it does nothing (R2.7). It only calls `update(…, { active: true })`, so no tab moves or reorders (R2.8).

### History handlers (→ R6)

`H` and `L` take a count and must go as far as the history allows (R6.4). `history.go(-N)` can't do that, because the browser doesn't say how many entries lie behind the current one, and `chrome.tabs.goBack` moves from the last _committed_ entry, so two calls in a row collapse into one step. The handler therefore steps one entry at a time and waits for each step to commit before taking the next.

```ts
// src/background/history.ts
export interface HistoryApi {
  /** chrome.tabs.goBack / goForward. Rejects when there is no entry in that direction. */
  go(direction: 'back' | 'forward', tabId: number): Promise<void>;
  /**
   * Resolves when the tab commits a navigation in its main frame
   * (chrome.webNavigation.onCommitted), or after `timeoutMs`, whichever comes first.
   * Call it before `go` so the event can't be missed; `cancel` removes the listener.
   */
  expectCommit(tabId: number, timeoutMs: number): { readonly done: Promise<void>; cancel(): void };
}

export function createHistoryHandlers(deps: {
  readonly history: HistoryApi;
}): Pick<BackgroundCommandHandlers, 'historyBack' | 'historyForward'>;
```

For `N = count ?? 1` steps: before every step except the last, `expectCommit(tabId, 1000)`; then `go(direction, tabId)`. If `go` rejects, cancel the pending expectation and stop: the steps already taken stay (R6.4, R6.5). After a successful step that isn't the last, wait for `done`. The state (how many steps are left) lives in the call, not in the worker (R1.8).

### Background command proxies (→ R1.3, R10.3, R10.4)

In the content script, one `Command` per background command name. It carries the metadata (M1 R5) and, when run, hands the work to the message client.

```ts
// src/core/commands/background.ts
export function createBackgroundCommands(deps: {
  readonly client: Pick<MessageClient, 'sendCommand'>;
}): readonly Command[];
```

| Command          | Description                                | `acceptsCount` |
| ---------------- | ------------------------------------------ | -------------- |
| `tabNext`        | Next tab (count: that many tabs forward)   | yes            |
| `tabPrevious`    | Previous tab (count: that many tabs back)  | yes            |
| `tabGoTo`        | Go to tab N, or the next tab without count | yes            |
| `tabFirst`       | First tab                                  | no             |
| `tabLast`        | Last tab                                   | no             |
| `tabClose`       | Close the tab                              | no             |
| `tabRestore`     | Restore closed tabs (count: that many)     | yes            |
| `tabDuplicate`   | Duplicate the tab                          | no             |
| `historyBack`    | Back in history (count: that many entries) | yes            |
| `historyForward` | Forward in history (count: that many)      | yes            |

All use `context: 'background'`. The registry already clears the count for commands that don't accept one (M1 R5.3), which gives R10.4 for free.

### Page commands (→ R7, R8, R9, R10.3)

```ts
// src/core/commands/navigation.ts
export interface PageActions {
  readonly href: () => string;
  /** location.assign */
  readonly navigate: (url: string) => void;
  /** location.reload */
  readonly reload: () => void;
  /** navigator.clipboard.writeText; may reject */
  readonly writeClipboard: (text: string) => Promise<void>;
}

export function createNavigationCommands(actions: PageActions): readonly Command[];
```

| Command   | Behavior                                                                 | `acceptsCount` |
| --------- | ------------------------------------------------------------------------ | -------------- |
| `reload`  | `reload()`                                                               | no             |
| `copyUrl` | `writeClipboard(href())`, rejection swallowed (R8.2)                     | no             |
| `urlUp`   | `target = parentUrl(href(), count ?? 1)`; if defined, `navigate(target)` | yes            |
| `urlRoot` | `target = rootUrl(href())`; if defined, `navigate(target)`               | no             |

### URL functions (→ R9)

Pure, so the rules in R9 are table-tested without a browser.

```ts
// src/core/url.ts

/** The URL with `levels` path levels removed, or undefined when there is nothing to do:
 *  not http(s) (R9.5), or the result equals `href` (R9.4). Drops query and hash (R9.1).
 *  An empty last segment is not a level (R9.7). Stops at the root (R9.2). */
export function parentUrl(href: string, levels: number): string | undefined;

/** `origin + '/'`, or undefined when not http(s) or equal to `href` (R9.3, R9.4, R9.5). */
export function rootUrl(href: string): string | undefined;
```

The result keeps the input's trailing-slash style: `/a/b/c` → `/a/b`, `/a/b/` → `/a/`, and the root is always `/`. Only an empty _last_ segment is not a level; an empty segment in the middle (`/a//b`) counts as one. The origin keeps the port and drops any user name and password. Only `http:` and `https:` pass, so `blob:`, `data:`, `view-source:`, `file:` and `about:` all return `undefined`.

### Registry and keymap (→ R10.3, R10.4, M1 R5)

`COMMAND_NAMES` becomes the scroll names, the four page names (`reload`, `copyUrl`, `urlUp`, `urlRoot`) and `...BACKGROUND_COMMAND_NAMES`. A helper makes a command ignore auto-repeat, used by every M2 command (page and proxy):

```ts
// src/core/commands/registry.ts
/** Wraps a command's `run` so a key held down runs it once (R10.3). */
export function onceOnly(run: (ctx: CommandContext) => void): (ctx: CommandContext) => void;
```

New entries in `DEFAULT_KEYMAP` (`src/settings/defaults.ts`):

| Keys      | Command       | Keys | Command          |
| --------- | ------------- | ---- | ---------------- |
| `J`       | `tabNext`     | `H`  | `historyBack`    |
| `gt`      | `tabGoTo`     | `L`  | `historyForward` |
| `K`, `gT` | `tabPrevious` | `r`  | `reload`         |
| `g0`      | `tabFirst`    | `yy` | `copyUrl`        |
| `g$`      | `tabLast`     | `gu` | `urlUp`          |
| `x`       | `tabClose`    | `gU` | `urlRoot`        |
| `X`       | `tabRestore`  | `yt` | `tabDuplicate`   |

`g` now starts `gg`, `gt`, `gT`, `g0`, `g$`, `gu`, `gU`, and `y` starts `yt` and `yy`. The trie from M1 already rejects clashes, and `0` after `g` is a key, not a count (M1 R4.4).

### Wiring (→ R1.3, R1.4, R1.7, R10.7, NFR3.1)

- `ControllerDeps` gains `client: Pick<MessageClient, 'sendCommand'>` and `page: PageActions`. `content.ts` builds them from `chrome.runtime.sendMessage` and `window`; the controller tests pass fakes.
- `background.ts` registers `chrome.runtime.onMessage.addListener` at the top level of the worker, so the browser can wake a stopped worker for the message (R1.7). The listener calls `router.handle(message, sender)` and returns nothing: the protocol is one-way.
- `background/handlers.ts` builds `createTabHandlers` and `createHistoryHandlers` with the real `chrome.tabs`, `chrome.sessions` and `chrome.webNavigation`, merges them into one `BackgroundCommandHandlers` (the compiler checks none is missing), wraps that as the `runCommand` handler, and exports the router. The existing `reinject` listener stays as it is.
- `wxt.config.ts` permissions become `['scripting', 'sessions', 'webNavigation']`.

## Data and state

| State                                          | Where               | Lifetime                                      |
| ---------------------------------------------- | ------------------- | --------------------------------------------- |
| Pending keys, count, mode                      | Content script (M1) | Discarded on mode change or timeout, as in M1 |
| Tab list, active tab, closed-tab list, history | The browser         | Read when a command runs; never cached        |
| Steps left in a `5H`                           | One handler call    | Ends with the call                            |
| Anything else                                  | Nothing             | The service worker holds none (R1.8)          |

## Error handling

| Situation (→ criterion)                                                             | Handling                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sender is not our content script, has no tab, or is not the top frame (R1.4, R10.6) | Router returns without running anything.                                                                                                                                                                                                                                                                                 |
| Message is not in the protocol (R1.5)                                               | `isMessage` fails; router returns without running anything.                                                                                                                                                                                                                                                              |
| A handler throws or a `chrome.*` promise rejects (R1.6)                             | Router catches it and ends the command. Nothing is logged: a log line could carry a URL or tab id (NFR4.1).                                                                                                                                                                                                              |
| Service worker stopped (R1.7)                                                       | The first message wakes it; the router needs no startup state.                                                                                                                                                                                                                                                           |
| Service worker unreachable, or the extension was invalidated (R10.7)                | `sendCommand` catches the synchronous throw and the rejection, and resolves.                                                                                                                                                                                                                                             |
| Only one tab in the window (R2.7), already on the target tab (R3.3)                 | Handler returns without calling `update`.                                                                                                                                                                                                                                                                                |
| `gt` count above the tab count (R2.6)                                               | Clamped to the last tab.                                                                                                                                                                                                                                                                                                 |
| No closed tab to restore (R4.7), fewer than N (R4.6)                                | Restores what exists, up to 25; with none, does nothing.                                                                                                                                                                                                                                                                 |
| Clipboard refused (R8.2)                                                            | `copyUrl` catches the rejection; the keys are still consumed.                                                                                                                                                                                                                                                            |
| Page is not http(s), or already at the root (R9.4, R9.5)                            | `parentUrl` / `rootUrl` return `undefined`; no navigation.                                                                                                                                                                                                                                                               |
| No entry behind or ahead (R6.4, R6.5)                                               | `goBack` / `goForward` rejects; the handler stops. Steps already taken stay.                                                                                                                                                                                                                                             |
| A step commits no navigation event (same-document entries, restored from cache)     | `expectCommit` times out after 1 s and the next step goes on.                                                                                                                                                                                                                                                            |
| A key is held down (R10.3)                                                          | `onceOnly` ignores a keydown whose `repeat` flag is set. The repeat is still consumed, because M1's Normal mode consumes any key that completes a mapping, whatever the command does. Only the keydown that completes the mapping matters: a held `t` after `g` is a new parse and passes through like any unmapped key. |
| Insert mode (R10.2)                                                                 | Only Normal mode consults the keymap (M1 R2.3), so no command can run.                                                                                                                                                                                                                                                   |

## Testing strategy

Unit tests come first and sit next to the code (`*.test.ts`), with fakes injected through the interfaces above, as the project rules ask.

- **`messaging/protocol.test.ts`**: `isMessage` accepts good messages and rejects wrong types, unknown commands, counts of 0, 10000, 1.5 and non-numbers (R1.1, R1.5).
- **`messaging/router.test.ts`**: wrong extension id, missing tab, a sub-frame sender, a sender without `frameId` (accepted), a bad message and a throwing handler all run nothing wrong and never reject; a good message reaches the handler with the sender's tab and window (R1.2–R1.6, R10.5, R10.6). A router built from handlers only (no stored state) runs a command twice in a row the same way (R1.7, R1.8).
- **`messaging/client.test.ts`**: sends the right message; a throwing and a rejecting `send` both resolve (R1.3, R10.7).
- **`background/tabs.test.ts`**: a fake window of tabs checks `J`/`K` with and without counts and wrap, `gt` with and without counts and clamping, `g0`/`g$`, one-tab windows, `x`, `X` with 0, 1 and N closed tabs, window entries mixed in and more than 25 requested, `yt` activating the copy (R2–R5).
- **`background/history.test.ts`**: a fake `HistoryApi` checks that `3H` takes three steps and waits for a commit between steps but not after the last; that a rejection on step 2 stops the run, cancels the pending wait and leaves step 1 taken; and that `L` goes the other way (R6).
- **`core/commands/background.test.ts`, `navigation.test.ts`**: each command sends or calls the right thing with the right count; the registry clears counts for commands that don't take one; a repeated keydown does nothing (R7, R8, R10.3, R10.4).
- **`core/url.test.ts`**: a table of hrefs → results for `gu` with counts, trailing slashes, query and hash, the root, ports, user names, empty middle segments, `file:`, `about:blank`, `blob:` and `data:` (R9).
- **`settings/defaults.test.ts`**: the keymap still builds without clashes and maps all 25 entries; no key uses `Cmd` (NFR2.2).
- **`core/controller.test.ts`**: real keydowns on a jsdom window reach the fake client and fake page actions; keys typed in a field do nothing (R10.1, R10.2).
- **Manifest test**: imports `wxt.config.ts` and checks the permissions are exactly `scripting`, `sessions` and `webNavigation` (NFR3.1, NFR3.2).

End-to-end tests (`tests/e2e/tabs.spec.ts`, `navigation.spec.ts`, Playwright with the built extension): open several pages in one window; `J`, `K`, `gt` with counts, `g0`, `g$` change the active tab; `x` closes a tab (the window keeps a second one open); `yt` adds a tab; `H`, `L` and `3H` move through history across documents and across hash changes, and `9H` stops at the first entry; `r` reloads; `yy` puts the URL in the clipboard (with clipboard permissions granted); `gu` and `gU` land on the expected URLs. `X` is covered by unit tests and the manual check, because Playwright's Chromium can't be trusted to keep a closed-tab list (NFR5.2).

NFR1.1 (16 ms) and NFR2.3 (Arc's tab order) are checked by hand in the final task, like M1's T19: a Performance recording for the handoff time, and `J`/`K`/`gt` in an Arc window with pinned tabs and several spaces. The same check confirms `yy` works in Arc, `5H` goes as far as it can, and `X` restores in Arc.

The project's 80% coverage target applies to all new files; the pure functions and handlers should sit well above it.

## Decisions and trade-offs

- **`H`/`L` are background commands that step and wait for each commit:** chose this over `history.go(-N)` in the page, which does nothing when N is past the end, so it can't meet R6.4, and over a bare `goBack` loop, which collapses into one step because `goBack` is relative to the last committed entry. The cost is the `webNavigation` permission (and its "read your browsing history" warning, which the user accepted) and up to 1 s per step when the browser fires no commit event, such as for same-document entries.
- **`r` is a page command (`location.reload()`):** chose this over `chrome.tabs.reload`. It needs no round trip and no permission, and does what the browser's reload does.
- **One `runCommand` message with the command name:** chose this over one message type per command. The router stays one function and a new command is one name plus one handler; a mapped type on each union gives the same "forgot a handler" compile error.
- **One-way messages:** chose fire-and-forget over request/response. No command in M2 needs a result in the page, and with no reply there is no timeout or "channel closed" error to handle. When M4's HUD wants to show "copied" or "no closed tab", the protocol grows a reply then.
- **Proxy commands in the registry:** chose to register background commands in the same registry, with `context: 'background'`, over a second dispatch path. The key parser, counts and help (M4) see one list of commands.
- **`onceOnly` per command instead of a global rule:** M1's scroll commands rely on held keys, so auto-repeat is ignored by wrapping each M2 command, not by the Normal mode.
- **`yy` copies from the page with `navigator.clipboard`:** chose this over the `clipboardWrite` permission and an offscreen document. A key press is a user gesture, so no extra permission or document is needed.
- **`yy` has no fallback:** if the copy is refused (for example the document is not focused), it silently fails (R8.2). An `execCommand('copy')` fallback was left out to keep the first version small. The end-to-end test and the manual check in Arc show whether it is needed; if so, that is a fix task.
- **`X` restores tab entries only, from the 25 most recent:** `getRecentlyClosed` caps at 25 and mixes tabs and windows. Restoring a whole window with `X` would surprise a user who pressed a tab key.
- **`X` restores where the browser decides:** `sessions.restore` puts the tab back in the window it came from. R10.5 carries the matching exception.
- **`yt` activates the copy explicitly:** `chrome.tabs.duplicate` doesn't promise which tab ends up active, so the handler asks for it.
- **`parentUrl` keeps the trailing-slash style:** `/a/b/c` → `/a/b`. Adding a slash that wasn't there can trigger a redirect on some sites.
- **Command names live in `messaging/protocol.ts`:** `core/` imports `messaging/`, never the other way round, so the worker bundle doesn't pull in the content-script code.
- **Every export has a consumer in the task that adds it:** Knip rejects unused exports, so the plan adds `BACKGROUND_COMMAND_NAMES`, `HandlerContext` and the rest together with the code that uses them.

## Requirements coverage

| Criterion      | Design element                                                         | Test                                                |
| -------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| R1.1           | `Message` union, `isMessage`                                           | `protocol.test.ts`                                  |
| R1.2           | `MessageHandlers`, `BackgroundCommandHandlers` (mapped types)          | `router.test.ts`; `npm run typecheck`               |
| R1.3           | Proxy commands, `MessageClient`                                        | `background.test.ts`, `client.test.ts`, e2e tabs    |
| R1.4, NFR3.3   | Router sender check                                                    | `router.test.ts`                                    |
| R1.5           | `isMessage` in the router                                              | `router.test.ts`                                    |
| R1.6           | Router catches handler failures                                        | `router.test.ts`                                    |
| R1.7           | Top-level `onMessage`, no startup state                                | `router.test.ts`; manual check                      |
| R1.8           | Handlers read the browser each time                                    | `tabs.test.ts`, `history.test.ts`                   |
| R2.1–R2.4      | `tabNext`, `tabPrevious`, `move`                                       | `tabs.test.ts`, e2e tabs                            |
| R2.5, R2.6     | `tabGoTo`                                                              | `tabs.test.ts`, e2e tabs                            |
| R2.7, R2.8     | `move` guards, `update` only                                           | `tabs.test.ts`                                      |
| R3.1–R3.4      | `tabFirst`, `tabLast`, `acceptsCount: false`                           | `tabs.test.ts`, `background.test.ts`, e2e tabs      |
| R4.1–R4.3      | `tabClose`                                                             | `tabs.test.ts`, `background.test.ts`, e2e tabs      |
| R4.4–R4.8      | `tabRestore`                                                           | `tabs.test.ts`; manual check                        |
| R5.1, R5.2     | `tabDuplicate`                                                         | `tabs.test.ts`, e2e tabs                            |
| R6.1–R6.3      | `historyBack`, `historyForward` stepping                               | `history.test.ts`, e2e navigation                   |
| R6.4, R6.5     | Stop at the first rejected step                                        | `history.test.ts`, e2e navigation                   |
| R7.1, R7.2     | `reload`                                                               | `navigation.test.ts`, e2e navigation                |
| R8.1, R8.3     | `copyUrl`                                                              | `navigation.test.ts`, e2e navigation                |
| R8.2           | `copyUrl` swallows rejection                                           | `navigation.test.ts`                                |
| R8.4, NFR4.1   | `writeText` is the only use of the URL; no logging                     | `navigation.test.ts`; code review                   |
| R9.1–R9.3      | `parentUrl`, `rootUrl`, `urlUp`, `urlRoot`                             | `url.test.ts`, `navigation.test.ts`, e2e navigation |
| R9.4–R9.7      | `undefined` results from `url.ts`                                      | `url.test.ts`                                       |
| R10.1, R10.2   | M1 Normal mode consumes mapped keys; Insert mode ignores the keymap    | `controller.test.ts`                                |
| R10.3          | `onceOnly`                                                             | `background.test.ts`, `navigation.test.ts`          |
| R10.4          | Registry clears counts                                                 | `registry.test.ts` (M1), `controller.test.ts`       |
| R10.5          | `HandlerContext` from the sender; `X` restores where the browser says  | `router.test.ts`, `tabs.test.ts`                    |
| R10.6          | Router rejects a `frameId` other than 0; content script top frame only | `router.test.ts`                                    |
| R10.7          | `createMessageClient` swallows failures                                | `client.test.ts`                                    |
| NFR1.1         | Proxy does one `sendMessage`; no work before it                        | Manual check (Performance recording)                |
| NFR1.2         | No timers, observers or listeners added in the page                    | Code review; manual check                           |
| NFR2.1         | MV3 build in both browsers                                             | Manual check                                        |
| NFR2.2         | Keymap test for `Cmd`                                                  | `defaults.test.ts`                                  |
| NFR2.3         | Tabs sorted by `index`                                                 | `tabs.test.ts`; manual check in Arc                 |
| NFR3.1, NFR3.2 | `wxt.config.ts` permissions                                            | Manifest test                                       |
| NFR5.1, NFR5.2 | Testing strategy above                                                 | `npm run check`, `npm run test:e2e`                 |

## Open questions

- None. Two things are verified in the final manual check rather than decided now: whether `webNavigation` fires for every step of `5H` (a missing event only slows it, by the 1 s timeout), and whether Arc orders tabs and lists closed tabs like Chrome does (a difference becomes a fix task).
