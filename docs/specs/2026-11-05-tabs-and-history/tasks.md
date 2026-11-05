# Tabs and history — Tasks

**Spec:** [requirements.md](requirements.md) · [design.md](design.md)
**Verdict:** READY — pass 3, 2026-11-05

## Status log

### Current status

- **Phase:** executing
- **Next task:** T7 — Add the history adapter over the browser events
- **Blocked by:** nothing
- **Last updated:** 2026-11-05 by executor

### Agreements

- 2026-11-05 — One spec for all of M2; `3gt` goes to tab 3; `J`/`K` wrap; `5H` goes as far as it can with the `webNavigation` permission; `x` takes no count (user, spec).
- 2026-11-05 — Every task's commit also flips its marker to `[x] done`, sets _Next task_ and adds a dated _History_ line naming the commit subject. Commit subjects start lowercase after the colon and are imperative (CONTRIBUTING, commitlint).
- 2026-11-05 — Provisional (planner, user not asked): T9 stays one commit (the scope critic's split is rejected, see Review notes); the `pass-through.spec.ts` sentinel moves from `x` to `q` inside T9; T10's three negative checks use a fixed 300 ms `settle` wait.
- 2026-11-05 — Provisional (planner's recommended answers, user not asked): `src/manifest.test.ts` imports `../wxt.config` and falls back to an e2e check of the built manifest if that breaks; T10 reads the active tab from `document.visibilityState`, with the service worker `chrome.tabs.query` as fallback; the manual check in T12 is run by the user, who reports each result in chat.

### History

- 2026-11-05 — planner: pass 1, created 12 tasks (T1–T12).
- 2026-11-05 — planner: pass 2, integrated the task-mode proposals for T1–T12; split T7 into T7 (history adapter) and T7b (router wiring and permissions); restored NFR2.1 on T12.
- 2026-11-05 — planner: pass 3, integrated the task-mode proposals for T7, T7b, T8, T9, T10 and T11; kept T9 as one commit; moved the `press(key, init)` change from T9 to T8 and the pass-through sentinel fix into T9.
- 2026-11-05 — executor: T1 done, commit `Add: pure URL functions for going up a path`.
- 2026-11-05 — executor: T2 done, commit `Add: message protocol for background commands` (the planned subject "typed message protocol" failed commitlint: "typed" reads as past tense). `Message` is an interface, not the design's type alias, because lint (consistent-type-definitions) requires it for one variant.
- 2026-11-05 — executor: T3 done, commit `Add: message client that never throws`.
- 2026-11-05 — executor: T4 done, commit `Add: message router with sender and message checks`. `BackgroundCommandHandlers` is `Readonly<Record<...>>` instead of a mapped type literal (lint: consistent-indexed-object-style); same compile-time check.
- 2026-11-05 — executor: T5 done, commit `Add: tab and session handlers for the background commands`. `tabFirst`/`tabLast` also skip the update in a one-tab window (same result as the target being current).
- 2026-11-05 — executor: T6 done, commit `Add: history handlers that step back and forward`.

## Project state

As of pass 2 (branch `m2-tabs-and-history`, head `cc885ff Docs: add the tabs and history spec`):

- M0 and M1 are done and ticked in `PLAN.md`; M2's five boxes are unticked. Its last line reads "Counts work for background commands (`3J`, `2x`)": `x` takes no count (R4.2), so T12 rewrites it.
- Exists: `src/core/commands/registry.ts` (`COMMAND_NAMES` is the 8 scroll names; `Command.context` is already `'page' | 'background'`; `createCommandRegistry` throws "Missing command" if a name has no command, and clears the count for commands with `acceptsCount: false`; `CommandContext` is `{ count, repeat }`), `scroll.ts` (its test compares with `COMMAND_NAMES`, fixed in T8), `controller.ts` (`ControllerDeps` has window, timer, frames, now, isValid, isTrusted, shadowRootOf, prefersReducedMotion; builds `createCommandRegistry(createScrollCommands(...))`), `src/settings/defaults.ts` (10 `DEFAULT_KEYMAP` entries; `defaults.test.ts` has `EXPECTED`, asserts `toHaveLength(EXPECTED.length)` and builds a registry from scroll commands only), `src/background/reinject.ts`, `src/entrypoints/background.ts` (only `onInstalled`) and `content.ts`, `wxt.config.ts` (`permissions: ['scripting']`).
- Missing: `src/messaging/`, `src/core/url.ts`, `src/core/commands/background.ts` and `navigation.ts`, `src/background/{tabs,history,history-api,handlers}.ts`, any manifest test, e2e specs for M2. `tests/e2e/fixtures/pages.ts` serves named pages at `https://example.test/<name>` with `openPage(context, name)`; `tests/e2e/fixtures.ts` launches Chromium with the built extension and exports `test`/`expect`.
- Tooling facts every task must respect (same as M1):
  - **Knip** (`entry: src/entrypoints/**/*.ts`, `project: src/**/*.ts`): every export, types included, must be imported by another file (its own test counts) at the commit that adds it. Don't export what only its own file uses.
  - **ESLint** `strictTypeChecked` + `stylisticTypeChecked`, SonarJS, `explicit-module-boundary-types`, `consistent-type-imports`, `switch-exhaustiveness-check`, `no-restricted-exports` default exports (not in entrypoints), complexity 10, cognitive 15, depth 3, 4 params, 60 lines per function, 300 per file. Size exemptions apply only to `*.test.ts`; `tests/e2e/**/*.spec.ts` and `tests/e2e/fixtures/pages.ts` stay under the limits, so e2e tests sit at top level. Pass methods as arrows; keep `vi.fn` mocks in their own variables.
  - **TypeScript:** strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` (optional props that can hold `undefined` are typed `?: T | undefined`), `verbatimModuleSyntax`, no Node types in `src`.
  - In `src/core` imports are relative; elsewhere `@/` maps to `src/`. `imports: false`, so every import is explicit.
  - Vitest includes only `src/**/*.test.ts`; coverage (80%, global) includes all `src/**/*.ts` except tests and `src/entrypoints/**`. jsdom keyboard events dispatched in tests have `isTrusted === false` (the controller tests already pass `isTrusted: () => true`).
  - Commit titles: `<Type>: <subject>`, 20–80 chars, lowercase subject, imperative, no final period; `Why:` and `What:` sections; body lines ≤ 80 chars; no AI attribution.

## Tasks

### T1: Add pure URL functions for going up a path — [x] done

- **Requirements:** R9.1–R9.7 · **Design:** URL functions
- **Depends on:** —
- **Files:** create `src/core/url.ts`, `src/core/url.test.ts`
- **Tests first:** in `src/core/url.test.ts`, two `it.each` tables, one for `parentUrl` (`[href, levels, expected]`) and one for `rootUrl` (`[href, expected]`). Use `string | undefined` for `expected`.
  - `parentUrl` rows:
    - `https://x.test/a/b/c`, 1 → `https://x.test/a/b` (R9.1)
    - `https://x.test/a/b/c`, 2 → `https://x.test/a` (R9.1)
    - `https://x.test/a/b/c`, 3 → `https://x.test/` (R9.2)
    - `https://x.test/a/b/c`, 9 → `https://x.test/` (R9.2, stops at the root)
    - `https://x.test/a/b/`, 1 → `https://x.test/a/` (R9.7, trailing slash is not a level, style kept)
    - `https://x.test/a/b/`, 2 → `https://x.test/` (R9.7)
    - `https://x.test/a//b`, 1 → `https://x.test/a/` (an empty middle segment counts as a level)
    - `https://x.test/a/b?q=1#h`, 1 → `https://x.test/a` (R9.1, query and hash dropped)
    - `https://x.test/a`, 1 → `https://x.test/`
    - `https://x.test/?a=1`, 1 → `https://x.test/` (R9.4 exception: the result differs from the input)
    - `https://x.test/#h`, 1 → `https://x.test/`
    - `https://x.test/`, 1 → `undefined` (R9.4)
    - `https://x.test`, 1 → `undefined` (R9.4; the input is normalized before comparing)
    - `https://x.test/a/b`, 0 → `undefined` (nothing to remove, result equals input)
    - `http://x.test:8080/a/b`, 1 → `http://x.test:8080/a` (port kept)
    - `https://u:p@x.test/a/b`, 1 → `https://x.test/a` (user and password dropped)
    - `https://x.test/a%20b/c`, 1 → `https://x.test/a%20b` (encoding left as is)
    - `undefined` expected (R9.5) for `file:///a/b`, `about:blank`, `blob:https://x.test/uuid`, `data:text/plain,hi`, `view-source:https://x.test/a`, `chrome://extensions`, `not a url`, and the empty string `''`.
  - `rootUrl` rows:
    - `https://x.test/a/b?q#h` → `https://x.test/` (R9.3)
    - `https://x.test:8080/a` → `https://x.test:8080/`
    - `https://u:p@x.test/a` → `https://x.test/`
    - `https://x.test/?a=1` → `https://x.test/` (R9.4 exception)
    - `https://x.test/#h` → `https://x.test/`
    - `https://x.test/` → `undefined` (R9.4)
    - `https://x.test` → `undefined`
    - the same non-http(s) and invalid inputs as above → `undefined` (R9.5)
- **Steps:**
  1. Write the tests above; they fail (the module doesn't exist).
  2. Create `src/core/url.ts` with a private helper `parseHttp(href: string): URL | undefined` (`new URL(href)` in try/catch; return `undefined` when invalid or when `protocol` is not `http:` or `https:`). The catch block is empty apart from a comment, with no logging.
  3. Implement `export function rootUrl(href: string): string | undefined`. It calls `parseHttp`, builds `` `${url.protocol}//${url.host}/` `` (this drops user, password, path, query and hash), and returns `undefined` when the result equals `url.href`.
  4. Implement `export function parentUrl(href: string, levels: number): string | undefined`. It calls `parseHttp`, then:
     - Take `segments = url.pathname.slice(1).split('/')`. Drop the last element if it is `''`; this covers both the root `''` and a trailing slash.
     - Set `trailing = url.pathname.length > 1 && url.pathname.endsWith('/')`.
     - Set `remaining = segments.slice(0, Math.max(0, segments.length - levels))`. Removing more levels than there are segments leaves an empty array, which stops at the root.
     - Build the path: `'/'` when `remaining` is empty, else `'/' + remaining.join('/') + (trailing ? '/' : '')`.
     - Return `` `${url.protocol}//${url.host}${path}` ``, or `undefined` when that equals `url.href`.
  5. Keep both exported functions with explicit return types. Keep `parseHttp` unexported. Add a short doc comment on each export quoting the R9 rules it implements.
- **Done when:** both tables pass; `npm run check` passes (Knip is satisfied because `url.test.ts` imports both exports and T8 will too).
- **Commit:** `Add: pure URL functions for going up a path`

### T2: Add the message protocol — [x] done

- **Requirements:** R1.1, R1.5 · **Design:** Protocol
- **Depends on:** —
- **Files:** create `src/messaging/protocol.ts`, `src/messaging/protocol.test.ts`
- **Tests first:** in `src/messaging/protocol.test.ts` (imports `BACKGROUND_COMMAND_NAMES`, `isMessage`, and the types `BackgroundCommandName` and `Message` with `import type`):
  - `it.each(BACKGROUND_COMMAND_NAMES)('accepts %s without a count')` — `isMessage({ type: 'runCommand', command })` is `true` (R1.1).
  - `it.each([1, 5, 9999])('accepts count %i')` — with command `'tabNext'` (R1.1).
  - `accepts an explicit count of undefined` — `{ type: 'runCommand', command: 'tabNext', count: undefined }` is `true`, because JSON drops it (R1.1).
  - `accepts extra properties on an otherwise valid message` — `{ type: 'runCommand', command: 'tabNext', extra: 1 }` is `true` (the protocol checks only type, command and count).
  - `it.each([0, 10000, 1.5, -1, NaN, Infinity, null, '3', {}])('rejects count %s')` — with command `'tabNext'` (R1.5).
  - `it.each` over named cases `[label, value]` — `isMessage(value)` is `false` (R1.5): unknown type `{ type: 'x', command: 'tabNext' }`; wrong-case type `{ type: 'RunCommand', command: 'tabNext' }`; unknown command `{ type: 'runCommand', command: 'tabTeleport' }`; wrong-case command `{ type: 'runCommand', command: 'TabNext' }`; non-string command `{ type: 'runCommand', command: 7 }`; missing command `{ type: 'runCommand' }`; missing type `{ command: 'tabNext' }`; `null`; `undefined`; a string `'runCommand'`; a number `1`; an array `['runCommand', 'tabNext']`; an empty object `{}`.
  - `narrows to Message` — a helper `function parse(value: unknown): Message | undefined { return isMessage(value) ? value : undefined; }`; `const name: BackgroundCommandName | undefined = parse({ type: 'runCommand', command: 'tabNext' })?.command; expect(name).toBe('tabNext')`. This keeps the type exports used (Knip) with no conditional assertion.
- **Steps:**
  1. Write the tests; they fail (the module doesn't exist).
  2. Create `src/messaging/protocol.ts` as in the design, with four exports: `BACKGROUND_COMMAND_NAMES` (the ten names, in the design's order, `as const`), `BackgroundCommandName`, `Message` (`readonly type: 'runCommand'`, `readonly command: BackgroundCommandName`, `readonly count?: number`) and `isMessage(value: unknown): value is Message`.
  3. Implement `isMessage` with a private `const MAX_COUNT = 9999` and a private `isCount(value: unknown): boolean` (`value === undefined || (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_COUNT)`). In `isMessage`: return `false` unless `typeof value === 'object' && value !== null && !Array.isArray(value)`; read `const { type, command, count } = value as Record<string, unknown>` (if the lint rejects the assertion, use `Reflect.get(value, 'type')` and so on); then `return type === 'runCommand' && typeof command === 'string' && BACKGROUND_COMMAND_NAMES.some((name) => name === command) && isCount(count)`. Use `.some`, not `.includes`, because `includes` on a readonly tuple rejects a `string` argument.
  4. Do not import anything from `src/core`: `messaging/` must not depend on `core/`.
- **Done when:** the tests pass; `npm run check` passes. Knip is satisfied because the test imports all four exports, and T3, T4 and T9 import them later.
- **Commit:** `Add: typed message protocol for background commands`

### T3: Add the message client — [x] done

- **Requirements:** R1.3, R1.6, R10.7, NFR4.1 · **Design:** Message client
- **Depends on:** T2
- **Files:** create `src/messaging/client.ts`, `src/messaging/client.test.ts`
- **Tests first:** in `src/messaging/client.test.ts`, with `const send = vi.fn<(message: Message) => Promise<unknown>>()` kept in its own variable and `const client: MessageClient = createMessageClient((message) => send(message))` (the annotation keeps the `MessageClient` export used for Knip). Imports use `@/messaging/protocol` for types and `./client` for the client:
  - `sends a runCommand message with the command and count` — `sendCommand('tabNext', 3)` calls `send` once with `{ type: 'runCommand', command: 'tabNext', count: 3 }` (R1.3).
  - `omits count when none was typed` — `sendCommand('tabNext', undefined)` calls `send` with `toStrictEqual({ type: 'runCommand', command: 'tabNext' })`, so no `count` key exists (R1.3).
  - `resolves when send throws synchronously` — `send.mockImplementation(() => { throw new Error('gone'); })`; `await expect(client.sendCommand('tabNext', undefined)).resolves.toBeUndefined()` (R10.7).
  - `resolves when send rejects` — `send.mockRejectedValue(new Error('Extension context invalidated.'))`; same assertion (R10.7, R1.6).
  - `resolves when send resolves with a response` — `send.mockResolvedValue('ignored')`; resolves to `undefined`.
- **Steps:**
  1. Write the tests; they fail (the module does not exist).
  2. Create `src/messaging/client.ts`. Import `type { BackgroundCommandName, Message } from '@/messaging/protocol'`.
  3. Export `interface MessageClient { sendCommand(command: BackgroundCommandName, count: number | undefined): Promise<void>; }` with the design's doc comment, and `function createMessageClient(send: (message: Message) => Promise<unknown>): MessageClient`.
  4. `sendCommand` is `async`: build `const message: Message = count === undefined ? { type: 'runCommand', command } : { type: 'runCommand', command, count };` (conditional because of `exactOptionalPropertyTypes`), then `try { await send(message); } catch { /* A stopped worker, an invalidated extension or a closed tab must not surface in the page (R10.7); nothing is logged (NFR4.1). */ }`. A synchronous throw is caught too, because the call sits inside `try`.
  5. Give the method an explicit `Promise<void>` return type (`explicit-module-boundary-types`).
- **Done when:** the five tests pass; no `console` use; `npm run check` passes (`MessageClient` and `createMessageClient` are imported by the test, `createMessageClient` by T9 later).
- **Commit:** `Add: message client that never throws`

### T4: Add the service-worker message router — [x] done

- **Requirements:** R1.2, R1.3, R1.4, R1.5, R1.6, R1.8, R10.5, R10.6, NFR3.3 · **Design:** Router
- **Depends on:** T2
- **Files:** create `src/messaging/router.ts`, `src/messaging/router.test.ts`
- **Tests first:** in `src/messaging/router.test.ts`. Import `createRouter` plus the types `Router`, `HandlerContext`, `MessageHandlers`, `BackgroundCommandHandlers`, `SenderInfo` from `./router` (`import type` / inline `type`) and use each one in a declaration, so Knip sees every export used. Helpers: `EXTENSION_ID = 'ext-id'`; `const runCommand = vi.fn<MessageHandlers['runCommand']>(() => Promise.resolve())` kept in its own variable and passed as `{ runCommand }`; `goodSender: SenderInfo = { id: EXTENSION_ID, frameId: 0, tab: { id: 7, windowId: 3 } }`; `goodMessage = { type: 'runCommand', command: 'tabNext', count: 2 }`. Build `createRouter({ handlers: { runCommand }, extensionId: EXTENSION_ID })` in a `beforeEach`. Messages that don't conform are typed `unknown`, no casts; no test builds `count: undefined`.
  - `runs the handler with the message and the sender's tab and window` — `handle(goodMessage, goodSender)` calls `runCommand` once with `(goodMessage, { tabId: 7, windowId: 3 })`; the context has exactly those two keys (R1.3, R10.5).
  - `passes a message without count unchanged` — `{ type: 'runCommand', command: 'historyBack' }` reaches the handler with no `count` key (R1.3).
  - `ignores a sender with another extension id` and `ignores a sender with no id` — handler not called, `handle` resolves (R1.4, NFR3.3).
  - `ignores a sender without a tab`, `ignores a tab without id`, `ignores a tab without windowId` — handler not called (R1.4).
  - `ignores a sub-frame sender` (`frameId: 3`) and `accepts frameId 0 and an undefined frameId` — the second case runs the handler in both variants (R10.6).
  - `ignores messages outside the protocol` — `it.each` over: unknown type, unknown command, `null`, a string, an object without type; handler not called, resolves (R1.5).
  - `resolves when the handler rejects` and `resolves when the handler throws synchronously` — `mockRejectedValueOnce(new Error('x'))` and `mockImplementationOnce(() => { throw new Error('x'); })`; `await expect(router.handle(...)).resolves.toBeUndefined()` (R1.6).
  - `resolves when the sender getter throws` — a `SenderInfo` whose `tab` is a getter that throws; proves the guards sit inside the try/catch (R1.6).
  - `keeps no state between calls` — send the same message twice through one router, then once through a second router built from the same handlers; all three handler calls have equal arguments (R1.8).
  - `requires a handler for every message type` — `// @ts-expect-error missing handler for runCommand` on the line above `const missingHandlers = (): Router => createRouter({ handlers: {}, extensionId: EXTENSION_ID });` (never called), then `expect(missingHandlers).toBeTypeOf('function')` (R1.2, proved by `npm run typecheck`, since `tsc -p src` includes tests).
  - `requires a handler for every background command` — one case builds a full `BackgroundCommandHandlers` literal with all ten names (each `noop = (): Promise<void> => Promise.resolve()`) and asserts it has ten keys; a second case has `// @ts-expect-error missing commands` above `const partial: BackgroundCommandHandlers = { tabNext: noop };` followed by `expect(partial).toBeDefined();` (R1.2).
- **Steps:**
  1. Write the tests; they fail because `router.ts` doesn't exist.
  2. Create `src/messaging/router.ts` with the types exactly as in the design (`HandlerContext`, `MessageHandlers`, `BackgroundCommandHandlers`, `SenderInfo`, `Router`) and `createRouter(deps)`. Imports: `import type { BackgroundCommandName, Message } from './protocol'; import { isMessage } from './protocol';`.
  3. `handle` is `async` and its whole body is in one `try { ... } catch { /* never surface an error, never log (NFR4.1) */ }`. Inside, in this order: return if `sender.id !== deps.extensionId`; read `const tab = sender.tab`; return if `tab?.id === undefined || tab.windowId === undefined`; return if `sender.frameId !== undefined && sender.frameId !== 0`; return if `!isMessage(message)`; then `await deps.handlers[message.type](message, { tabId: tab.id, windowId: tab.windowId })`. The context holds only those two fields. Move the guards to a small helper if complexity nears 10.
  4. No module state, no logging, no default export.
- **Done when:** tests pass; `npm run typecheck` fails if either `@ts-expect-error` line stops being an error (check once by hand); `npm run check` passes, including Knip: all six exports are imported by `router.test.ts`.
- **Commit:** `Add: message router with sender and message checks`

### T5: Add the tab and session handlers — [x] done

- **Requirements:** R2.1–R2.8, R3.1–R3.4, R4.1, R4.3–R4.8, R5.1, R10.5, NFR2.3 · **Design:** Tab handlers
- **Depends on:** T4 (`HandlerContext`, `BackgroundCommandHandlers`), T2 (`BackgroundCommandName`)
- **Files:** create `src/background/tabs.ts`, `src/background/tabs.test.ts`
- **Tests first:** in `src/background/tabs.test.ts`. Imports: `createTabHandlers` plus the types `TabInfo`, `TabsApi`, `ClosedEntry`, `SessionsApi` (this keeps them Knip-clean), and `HandlerContext` from `@/messaging/router`. Build a helper `createFakes(count, activeIndex)` that returns: a mutable list of tabs with ids 10, 11, … in window 1 and indexes 0..n-1; a `TabsApi` whose `query` is a `vi.fn` returning the tabs in reversed order (proves sorting by `index`); `update`, `remove`, `duplicate` as separate `vi.fn` variables; a `SessionsApi` with `getRecentlyClosed` and `restore` `vi.fn`s. `ctx = { tabId: <id of the active tab>, windowId: 1 }`. Cases:
  - `tabNext` / `tabPrevious`, 5 tabs: next from the middle activates the following tab; next from the last wraps to the first; previous from the first wraps to the last; `tabNext` count 2 from index 4 lands on index 1; `tabPrevious` count 7 from index 1 lands on index 4 (modulo wrap). `update` is called once with `(id, { active: true })`; `remove`, `duplicate` and `restore` are not called (R2.1–R2.4, R2.8).
  - `tabGoTo`: count `undefined` behaves like next; count 3 activates the tab at index 2; count 99 on 4 tabs activates the last; count 1 activates the first (R2.5, R2.6).
  - One-tab window: `update` is not called for `tabNext`, `tabPrevious`, `tabGoTo` with and without a count (R2.7). Also `tabGoTo` count 3 when the target is already the current tab: no `update`.
  - Current tab missing from the query result: no `update`.
  - `tabFirst` / `tabLast`: activate the first / last tab; no `update` when the current tab is already there; a count passed (e.g. 4) changes nothing (R3.1–R3.4).
  - Window scoping: `query` is called with exactly `{ windowId: 1 }` for each moving command, and with another `ctx.windowId` (e.g. 7) the call uses 7 (R10.5).
  - `tabClose`: `remove` called once with `ctx.tabId`; `query` not called (R4.1, R4.3).
  - `tabRestore`: `getRecentlyClosed` called with `{ maxResults: 25 }`. Entries mix tabs, a window entry (no `tab`) and a tab entry without `sessionId`. No count restores only the first valid sessionId; count 3 restores three in list order (assert call order and that the next `restore` starts after the previous promise resolves, using a deferred promise); fewer valid entries than N restore only those; no valid entry means `restore` is never called and the handler resolves; a count of 40 with 30 valid entries restores at most the 25 the fake returns (the fake honors `maxResults`); `restore` is called with the sessionId only (`toHaveBeenCalledWith('s1')`) so no window targeting is passed (R4.4–R4.8).
  - `tabDuplicate`: `duplicate(ctx.tabId)` then `update(copy.id, { active: true })`; when `duplicate` resolves `undefined`, or a tab without `id`, no `update` (R5.1).
- **Steps:**
  1. Write the tests; they fail (module missing).
  2. Create `src/background/tabs.ts`. Export the interfaces `TabInfo`, `TabsApi`, `ClosedEntry`, `SessionsApi` as in the design and `createTabHandlers(deps: { tabs: TabsApi; sessions: SessionsApi }): Pick<BackgroundCommandHandlers, TabCommandName>`. Declare `type TabCommandName = Exclude<BackgroundCommandName, 'historyBack' | 'historyForward'>` without `export`. Import `BackgroundCommandHandlers`, `HandlerContext` from `@/messaging/router` and `BackgroundCommandName` from `@/messaging/protocol` with `import type`.
  3. Private helpers, each small: `sortedTabs(tabs, ctx)` queries `{ windowId: ctx.windowId }` and returns a copy sorted by `index`; `positionOf(list, ctx.tabId)` returns the index or -1; `activate(tabs, list, target, current)` calls `tabs.update(id, { active: true })` only when `target !== current`, the target exists and has a numeric `id`; `move(deps, ctx, delta)` returns without acting when the list has fewer than 2 tabs or the current position is -1, else activates `((p + delta) % n + n) % n`; `goTo(deps, ctx, count)` for `tabGoTo` (`count === undefined` → `move(+1)`, else target `min(count, n) - 1`); `restoreClosed(sessions, count)` fetches 25, keeps entries with a string `tab.sessionId`, slices `count ?? 1`, and awaits `restore` in a `for…of` loop (sequential on purpose; `no-await-in-loop` is not enabled).
  4. Handlers: `tabNext: (count, ctx) => move(deps, ctx, count ?? 1)`, `tabPrevious: … -(count ?? 1)`, `tabGoTo`, `tabFirst` (target 0), `tabLast` (target n-1; both ignore the count), `tabClose: async (_count, ctx) => { await tabs.remove(ctx.tabId); }`, `tabRestore`, `tabDuplicate` (`const copy = await tabs.duplicate(ctx.tabId); if (copy?.id !== undefined) await tabs.update(copy.id, { active: true });`). No logging, no `try/catch`: the router swallows failures (R1.6).
  5. The module takes only the narrow interfaces, so no `chrome` global is used.
- **Done when:** the tests pass; `npm run check` passes (Knip: every export is imported by `tabs.test.ts`; `TabCommandName` is not exported).
- **Commit:** `Add: tab and session handlers for the background commands`

### T6: Add the history handlers — [x] done

- **Requirements:** R6.1–R6.5, R1.6, R1.8 · **Design:** History handlers
- **Depends on:** T4 (type-only import of `BackgroundCommandHandlers` and `HandlerContext` from `src/messaging/router.ts`)
- **Files:** create `src/background/history.ts`, `src/background/history.test.ts`
- **Tests first:** in `history.test.ts`, import `createHistoryHandlers` and `type HistoryApi`. Build a fake `HistoryApi` from separate `vi.fn` variables (`go`, `expectCommit`, `cancel`) and one shared ordered `events: string[]` log (`'expect'`, `'go:back'`, `'go:forward'`, `'wait'`, `'cancel'`). `expectCommit` returns `{ done, cancel }`; `done` is a promise the test resolves itself when it needs control. `ctx = { tabId: 7, windowId: 1 }`. Call `handlers.historyBack(count, ctx)` and `handlers.historyForward(count, ctx)`:
  - `historyBack without a count goes back once` — `go` called once with `('back', 7)`; `expectCommit` never called (R6.1).
  - `historyForward without a count goes forward once` — `go` called once with `('forward', 7)`; no `expectCommit` (R6.2).
  - `count 3 takes three steps` — three `go` calls; `expectCommit` called exactly twice, each with `(7, 1000)`; event order is `expect, go, wait, expect, go, wait, go` (R6.3).
  - `waits for each commit before the next step` — hold step 1's `done` unresolved; flush microtasks; assert `go` was called once; resolve `done`; assert the second `go` then runs (R6.3).
  - `a go that rejects on step 2 of 3 stops the run` — `go` rejects on its 2nd call; the pending expectation of step 2 is cancelled (`cancel` called once), no third `go`, step 1 was taken; the returned promise resolves (R6.4).
  - `a go that rejects on step 1 of 3 cancels and stops` — one `go`, `cancel` once, no further `expectCommit`; resolves (R6.4).
  - `a rejection with count 1 does nothing and resolves` — `go` rejects; no `expectCommit`, no `cancel`; promise resolves (R6.5, R1.6).
  - `a rejection on the last step of a counted run resolves` — count 2, `go` rejects on call 2; steps already taken stay; resolves (R6.4).
  - `uses the tab of the context` — a second `ctx` with `tabId: 9` reaches `go` and `expectCommit` (R10.5).
  - `keeps no state between calls` — two sequential `historyBack(2, ctx)` calls produce the same event log twice (R1.8).
- **Steps:**
  1. Write the tests; they fail (module missing).
  2. Create `src/background/history.ts`. `import type { BackgroundCommandHandlers, HandlerContext } from '@/messaging/router'`. Export `interface HistoryApi` exactly as in the design and `function createHistoryHandlers(deps: { readonly history: HistoryApi }): Pick<BackgroundCommandHandlers, 'historyBack' | 'historyForward'>`. Nothing else is exported.
  3. Private `const COMMIT_TIMEOUT_MS = 1000`.
  4. Private `async function step(history: HistoryApi, direction: 'back' | 'forward', tabId: number, last: boolean): Promise<boolean>`: `const pending = last ? undefined : history.expectCommit(tabId, COMMIT_TIMEOUT_MS); try { await history.go(direction, tabId); } catch { pending?.cancel(); return false; } await pending?.done; return true;` (add a comment that the failure is expected at the end of history and is not logged, NFR4.1).
  5. Private `function createStepper(history, direction)` returning `async (count: number | undefined, ctx: HandlerContext): Promise<void>`: `const total = count ?? 1; for (let i = 1; i <= total; i++) { if (!(await step(history, direction, ctx.tabId, i === total))) return; }`. Sequential awaits in the loop are intended.
  6. `createHistoryHandlers` returns `{ historyBack: createStepper(deps.history, 'back'), historyForward: createStepper(deps.history, 'forward') }`. No module-level mutable state (R1.8).
- **Done when:** the tests pass; the file is under the lint limits; Knip passes (`createHistoryHandlers` and `HistoryApi` are imported by the test, T7 and T7b import `HistoryApi` later); `npm run check` passes.
- **Commit:** `Add: history handlers that step back and forward`

### T7: Add the history adapter over the browser events — [ ] todo

- **Requirements:** R6.3, R6.4 · **Design:** History handlers (`HistoryApi`)
- **Depends on:** T6 (type-only import of `HistoryApi`)
- **Files:** create `src/background/history-api.ts`, `src/background/history-api.test.ts`
- **Tests first:** in `src/background/history-api.test.ts`. Imports: `createHistoryApi` and `type CommitEvent` from `./history-api`. Fakes:
  - `goBack` and `goForward` are `vi.fn<(tabId: number) => Promise<void>>(() => Promise.resolve())`, each in its own variable.
  - `type Details = { readonly tabId: number; readonly frameId: number }` and `type Listener = (details: Details) => void`.
  - A `Set<Listener>` named `listeners`.
  - `addListener = vi.fn<(listener: Listener) => void>((l) => { listeners.add(l); })` and `removeListener = vi.fn<(listener: Listener) => void>((l) => { listeners.delete(l); })`, each in its own variable.
  - `const onCommitted: CommitEvent = { addListener, removeListener }`.
  - `emit(details: Details)` calls every listener in `[...listeners]`.
  - `beforeEach` calls `vi.useFakeTimers()` and clears all mocks and `listeners`; `afterEach` calls `vi.useRealTimers()`.
  - `track(done: Promise<void>): { settled: boolean }` sets `settled` in `done.then`, so no test needs a conditional assertion.
  - Build `const api = createHistoryApi({ goBack, goForward, onCommitted })`. Cases:
  - `go back calls goBack with the tab` — `await api.go('back', 5)`; `goBack` called once with `5`; `goForward` not called (R6.3).
  - `go forward calls goForward with the tab` — the mirror case (R6.3).
  - `go rejects when goBack rejects` — `goBack.mockRejectedValueOnce(new Error('no entry'))`; `await expect(api.go('back', 5)).rejects.toThrow('no entry')`; the same for `forward` (R6.4: T6 relies on this).
  - `go rejects when goBack throws synchronously` — `mockImplementationOnce(() => { throw new Error('x'); })`; `await expect(api.go('back', 5)).rejects.toThrow('x')` (`go` is `async`, so it never throws synchronously).
  - `expectCommit registers a listener before any event` — right after `api.expectCommit(7, 1000)`, `addListener` has been called once and `listeners.size` is 1.
  - `done resolves on a main-frame commit of the tab and removes the listener` — `emit({ tabId: 7, frameId: 0 })`; `await done` resolves; `removeListener` called once with the function `addListener` received; `listeners.size` is 0.
  - `ignores other tabs and sub-frames` — `emit({ tabId: 8, frameId: 0 })` and `emit({ tabId: 7, frameId: 2 })`; `await vi.advanceTimersByTimeAsync(999)`; `track(done).settled` is false; `removeListener` not called.
  - `resolves after the timeout and removes the listener` — advance 999 ms: not settled; advance 1 more ms: settled; `removeListener` called once (R6.3: a step with no commit event must not hang).
  - `ignores events after it finished` — resolve through an event, then `emit` again and advance 5000 ms; `removeListener` is still called once.
  - `cancel removes the listener and clears the timer` — `cancel()`; `listeners.size` is 0; advance 5000 ms; `removeListener` called once in total; `vi.getTimerCount()` is 0.
  - `cancel after done is a no-op` — resolve through an event, call `cancel()` twice; `removeListener` called once.
  - `two expectations are independent` — create two (tabs 7 and 9); `emit` for tab 9 only resolves the second; the first stays pending.
- **Steps:**
  1. Write the tests; they fail because the module doesn't exist.
  2. Create `src/background/history-api.ts`. Imports: `import type { HistoryApi } from './history'`.
  3. Export `interface CommitEvent { addListener(listener: (details: { readonly tabId: number; readonly frameId: number }) => void): void; removeListener(listener: (details: { readonly tabId: number; readonly frameId: number }) => void): void; }`. Add a doc comment saying it is `chrome.webNavigation.onCommitted` narrowed.
  4. Export `function createHistoryApi(deps: { readonly goBack: (tabId: number) => Promise<void>; readonly goForward: (tabId: number) => Promise<void>; readonly onCommitted: CommitEvent }): HistoryApi`.
  5. `go` is `async (direction, tabId)`: `return direction === 'back' ? deps.goBack(tabId) : deps.goForward(tabId)`. It has no try/catch, so a rejection reaches T6's `step` (R6.4). Its return type is explicit.
  6. `expectCommit(tabId, timeoutMs)`:
     - Declare `let settled = false` and `let resolveDone: () => void = () => undefined`.
     - `const done = new Promise<void>((resolve) => { resolveDone = resolve; })`.
     - Declare `const listener = (details: { readonly tabId: number; readonly frameId: number }): void => { if (details.tabId === tabId && details.frameId === 0) { finish(); } }`.
     - Declare `const timer = setTimeout(finish, timeoutMs)` with the global timer, before `deps.onCommitted.addListener(listener)`. Both run synchronously in the same call, with no await before either. This order means a listener fired synchronously by `addListener` can't hit the timer's temporal dead zone. `finish` is a function declaration, so it is hoisted.
     - `function finish(): void { if (settled) { return; } settled = true; clearTimeout(timer); deps.onCommitted.removeListener(listener); resolveDone(); }`.
     - Return `{ done, cancel: finish }`. A comment says `cancel` also resolves `done`, which T6 never awaits after cancelling.
  7. No module-level state, no logging (NFR4.1), no default export. Keep only `createHistoryApi` and `CommitEvent` exported.
- **Done when:** the tests pass; `npm run check` passes. Knip is satisfied: the test imports `createHistoryApi` and `CommitEvent`, and T7b imports `createHistoryApi` later. `HistoryApi` is already exported by T6 and imported here.
- **Commit:** `Add: history adapter that waits for navigation commits`

### T7b: Wire the router into the service worker and add permissions — [ ] todo

- **Requirements:** R1.2, R1.3, R1.6, R1.7, NFR3.1, NFR3.2 · **Design:** Wiring
- **Depends on:** T4 (`createRouter`, `Router`, `BackgroundCommandHandlers`, `MessageHandlers`, `SenderInfo`), T5 (`createTabHandlers`, `TabsApi`, `SessionsApi`), T6 (`createHistoryHandlers`, `HistoryApi`), T7 (`createHistoryApi`)
- **Files:** create `src/background/handlers.ts`, `src/background/handlers.test.ts`, `src/manifest.test.ts`; modify `src/entrypoints/background.ts`, `wxt.config.ts`
- **Tests first:**
  - `src/background/handlers.test.ts` (fakes only, no `chrome` global). Imports: `createBackgroundRouter` from `./handlers`; `BACKGROUND_COMMAND_NAMES` from `@/messaging/protocol`; `type SenderInfo` from `@/messaging/router`; `type TabsApi`, `type SessionsApi` from `./tabs`; `type HistoryApi` from `./history`. A `createFakes()` function, called in `beforeEach`, builds fresh `vi.fn` variables (own variables, never inline): `query` (`vi.fn<TabsApi['query']>`, resolves `[{ id: 10, index: 0 }, { id: 11, index: 1 }]`), `update` (resolves `undefined`), `remove` (resolves), `duplicate` (resolves `{ id: 12, index: 2 }`), `getRecentlyClosed` (resolves `[]`), `restore` (resolves), `go` (resolves), `expectCommit` (returns `{ done: Promise.resolve(), cancel: vi.fn() }`). The router is `createBackgroundRouter({ tabs: { query, update, remove, duplicate }, sessions: { getRecentlyClosed, restore }, history: { go, expectCommit }, extensionId: 'ext' })`. `sender: SenderInfo = { id: 'ext', frameId: 0, tab: { id: 10, windowId: 1 } }`. Cases:
    - `runs tabNext in the sender's window` — `handle({ type: 'runCommand', command: 'tabNext' }, sender)` calls `query` once with `{ windowId: 1 }` and `update` once with `(11, { active: true })` (R1.3).
    - `forwards the count` — `tabGoTo` with `count: 2` calls `update` with `(11, { active: true })`; `tabGoTo` with `count: 1` from tab 10 (already there) calls no `update` (R1.3).
    - `reaches the history handlers with the sender's tab` — `historyBack` calls `go` once with `('back', 10)` and `historyForward` with `('forward', 10)`; neither calls `expectCommit` (count absent) (R1.3).
    - `every background command reaches its API` — `it.each` over a table `[command, expected fake]`: `tabNext`, `tabPrevious`, `tabGoTo`, `tabFirst`, `tabLast` → `query`; `tabClose` → `remove`; `tabRestore` → `getRecentlyClosed`; `tabDuplicate` → `duplicate`; `historyBack`, `historyForward` → `go`. After `handle(...)`, that fake has been called once. A final guard in the same file: `expect(rows.map(([command]) => command)).toStrictEqual([...BACKGROUND_COMMAND_NAMES])` so a new command name forces a new row (R1.2, R1.3).
    - `ignores a sender from another extension` — `sender` with `id: 'other'`: no fake is called (smoke check; details live in `router.test.ts`) (R1.4).
    - `resolves when the API rejects` — `query.mockRejectedValueOnce(new Error('closed'))`; `await expect(router.handle({ type: 'runCommand', command: 'tabNext' }, sender)).resolves.toBeUndefined()`; `update` not called (R1.6).
  - `src/manifest.test.ts`: `import config from '../wxt.config'`; `expect(config).toMatchObject({ manifest: { permissions: ['scripting', 'sessions', 'webNavigation'] } })` (`toMatchObject` matches arrays exactly, so an extra permission fails) and a second case that the permissions array does not contain `'tabs'` (read it through `config.manifest`, narrowing with a `typeof ... === 'object'` check, not a cast) (NFR3.1, NFR3.2). Provisional: if the import breaks `npm run typecheck` (the `src` project has `types: ['chrome']` and no Node types) or Vitest, delete this file and assert the built `.output/chrome-mv3/manifest.json` in a top-level e2e test instead (see Open questions). Record the fallback in the History line.
- **Steps:**
  1. Write the tests; they fail (`handlers.ts` does not exist; the manifest test fails on the old permissions).
  2. Create `src/background/handlers.ts`: `export function createBackgroundRouter(deps: { readonly tabs: TabsApi; readonly sessions: SessionsApi; readonly history: HistoryApi; readonly extensionId: string }): Router`. Imports use `@/` (`import type` for the types): `createRouter`, `BackgroundCommandHandlers`, `MessageHandlers`, `Router` from `@/messaging/router`; `createTabHandlers`, `TabsApi`, `SessionsApi` from `@/background/tabs`; `createHistoryHandlers`, `HistoryApi` from `@/background/history`. Body: `const commandHandlers: BackgroundCommandHandlers = { ...createTabHandlers({ tabs: deps.tabs, sessions: deps.sessions }), ...createHistoryHandlers({ history: deps.history }) };` (the annotation makes the compiler flag a missing command), `const runCommand: MessageHandlers['runCommand'] = (message, ctx) => commandHandlers[message.command](message.count, ctx);`, `return createRouter({ handlers: { runCommand }, extensionId: deps.extensionId });`. Narrow interfaces only, no `chrome` global, no logging, no module state, no default export. Deliberate difference from the design's wording: the real `chrome.*` objects are supplied by `background.ts` (an entrypoint, excluded from coverage), so `handlers.ts` stays fully unit-testable.
  3. `src/entrypoints/background.ts`: add imports `createBackgroundRouter` (`@/background/handlers`) and `createHistoryApi` (`@/background/history-api`). Inside `defineBackground`, synchronously at the top level of the callback (not inside another callback, not after an `await`, so the browser can wake a stopped worker for the message, R1.7), build `const router = createBackgroundRouter({ tabs: { query: (filter) => chrome.tabs.query(filter), update: (id, props) => chrome.tabs.update(id, props), remove: (id) => chrome.tabs.remove(id), duplicate: (id) => chrome.tabs.duplicate(id) }, sessions: { getRecentlyClosed: (filter) => chrome.sessions.getRecentlyClosed(filter), restore: (id) => chrome.sessions.restore(id) }, history: createHistoryApi({ goBack: (id) => chrome.tabs.goBack(id), goForward: (id) => chrome.tabs.goForward(id), onCommitted: chrome.webNavigation.onCommitted }), extensionId: chrome.runtime.id })`. Then `chrome.runtime.onMessage.addListener((message: unknown, sender) => { void router.handle(message, sender); });`, a block body that returns nothing, so no response channel is held open (R1.7). Arrows everywhere, never unbound `chrome.*` methods; `onCommitted` is passed as the object so its methods keep `this`. Leave the `onInstalled` listener and its comment untouched. If `tsc` rejects an adapter (for example `duplicate` returning `Tab` where `TabInfo | undefined` is expected, or `onCommitted` because of chrome's optional filters argument), adjust the arrow (or wrap `onCommitted` in two arrow methods), not the interface.
  4. `wxt.config.ts`: `permissions: ['scripting', 'sessions', 'webNavigation']`; replace the comment above it with one line per permission: `scripting` restarts the content script in open tabs on install and update (R1.5); `sessions` restores closed tabs (`X`); `webNavigation` lets `H`/`L` with a count wait for each history step to commit (R6.3, R6.4) and brings the "read your browsing history" install warning (NFR3.1). Do not add `tabs` (NFR3.2).
  5. Run `npm run build` and read `.output/chrome-mv3/manifest.json`: `permissions` is exactly the three names.
- **Done when:** the new tests pass; `npm run build` succeeds and `.output/chrome-mv3/manifest.json` lists exactly `scripting`, `sessions` and `webNavigation`, no `tabs`; `npm run check` passes (Knip: `createBackgroundRouter` is imported by `background.ts`; `createHistoryApi` by `background.ts`; `TabsApi`, `SessionsApi`, `HistoryApi` and `Router` by `handlers.ts`; nothing new is exported without a consumer).
- **Commit:** `Add: service worker router, tab and history wiring and permissions`

### T8: Add the page commands (reload, copy URL, go up) — [ ] todo

- **Requirements:** R7.1, R7.2, R8.1–R8.4, R9.1–R9.7 (through T1's functions), R10.1–R10.4, NFR2.2, NFR4.1 · **Design:** Page commands, Registry and keymap, Wiring
- **Depends on:** T1
- **Why one commit:** growing `COMMAND_NAMES` makes `createCommandRegistry` throw `Missing command` wherever a registry is built, so the names, the commands, the controller wiring, the keymap and `content.ts` have to land together.
- **Files:** create `src/core/commands/navigation.ts`, `src/core/commands/navigation.test.ts`; modify `src/core/commands/registry.ts`, `src/core/commands/registry.test.ts`, `src/core/commands/scroll.test.ts`, `src/core/controller.ts`, `src/core/controller.test.ts`, `src/settings/defaults.ts`, `src/settings/defaults.test.ts`, `src/entrypoints/content.ts`
- **Tests first:**
  - `registry.test.ts` (import `onceOnly`; the wrapped function is `vi.fn<(ctx: CommandContext) => void>()` in its own variable):
    - `onceOnly runs the wrapped function for repeat false` — called once with the same ctx object (`toHaveBeenCalledWith(ctx)`) (R10.3).
    - `onceOnly skips the wrapped function for repeat true` — not called (R10.3).
  - `scroll.test.ts`: change the assertion on line 37 to `toEqual([...SCROLL_COMMAND_NAMES])`, importing `SCROLL_COMMAND_NAMES` from `./registry` in place of `COMMAND_NAMES` (nothing else in that file uses `COMMAND_NAMES`, so drop that import).
  - `navigation.test.ts`: a fake `PageActions` built from separate `vi.fn` variables (`href = vi.fn<PageActions['href']>()`, `navigate`, `reload`, `writeClipboard = vi.fn<PageActions['writeClipboard']>(() => Promise.resolve())`), all cleared in `beforeEach`; each test sets `href.mockReturnValue(...)`. Helper `run(name: CommandName, ctx: CommandContext)` finds the command in `createNavigationCommands(actions)` (throws if absent) and calls `run(ctx)`. `const ONCE = { count: undefined, repeat: false }`.
    - `returns the four page commands` — names `['reload', 'copyUrl', 'urlUp', 'urlRoot']` in that order; every `context` is `'page'`; every description non-empty; `acceptsCount` false for `reload`, `copyUrl`, `urlRoot` and true for `urlUp`.
    - `reload calls reload once` (R7.1); `reload ignores a repeated keydown` — `repeat: true`, `reload` not called (R10.3).
    - `copyUrl writes the full href` — `href` is `https://x.test/a?q=1#h`; `writeClipboard` called once with exactly that string (R8.1, R8.4).
    - `copyUrl does not reject when writeClipboard rejects` — `writeClipboard.mockRejectedValue(new Error('denied'))`; `expect(() => run('copyUrl', ONCE)).not.toThrow()`; then `await new Promise((resolve) => setTimeout(resolve, 0))`; Vitest fails the run on an unhandled rejection (R8.2).
    - `copyUrl does not throw when writeClipboard throws synchronously` — `mockImplementation(() => { throw new TypeError('no clipboard'); })`; `expect(() => run(...)).not.toThrow()` (R8.2).
    - `copyUrl ignores a repeated keydown` — `writeClipboard` not called (R10.3).
    - `urlUp without a count goes one level up` — `href` `https://x.test/a/b/c?q#h`; `navigate` called once with `https://x.test/a/b` (R9.1).
    - `urlUp with count 2 goes two levels up` — `https://x.test/a` (R9.1, R9.2).
    - `urlUp does nothing at the root` (`https://x.test/`) and `urlUp does nothing for a non-http page` (`about:blank`) — `navigate` not called (R9.4, R9.5).
    - `urlUp ignores a repeated keydown` (R10.3).
    - `urlRoot goes to the root` — `https://x.test/a/b` navigates to `https://x.test/`; `urlRoot does nothing at the root`; `urlRoot ignores a repeated keydown` (R9.3, R9.4, R10.3).
    - `a typed count does not reach reload, copyUrl or urlRoot` — build `createCommandRegistry([...createNavigationCommands(actions), ...others])`, where `others` are fake `Command`s (a small local `stub(name)` returning a `page` command with a `vi.fn` run) for every `COMMAND_NAMES` entry that is not among `createNavigationCommands(actions).map((c) => c.name)`. Then `registry.run('urlRoot', { count: 5, repeat: false })` navigates once to the root, exactly as without a count; `registry.run('reload', { count: 5, repeat: false })` calls `reload` once; `registry.run('copyUrl', { count: 5, repeat: false })` calls `writeClipboard` once (R7.2, R8.3, R9.6, R10.4).
  - `defaults.test.ts`: `EXPECTED` gains `{ keys: ['r'], command: 'reload' }`, `{ keys: ['y', 'y'], command: 'copyUrl' }`, `{ keys: ['g', 'u'], command: 'urlUp' }`, `{ keys: ['g', 'U'], command: 'urlRoot' }` (14 entries). Rename the length test to `has no mappings beyond the listed keys`. In `resolves every default mapping to a registered command`, build the registry from `[...createScrollCommands(...), ...createNavigationCommands({ href: vi.fn<PageActions['href']>(() => 'https://x.test/'), navigate: vi.fn<PageActions['navigate']>(), reload: vi.fn<PageActions['reload']>(), writeClipboard: vi.fn<PageActions['writeClipboard']>(() => Promise.resolve()) })]`, so every mapping resolves. The no-clash and no-`Cmd` tests stay (NFR2.2).
  - `controller.test.ts`:
    - Module-level `vi.fn` variables: `href = vi.fn<PageActions['href']>(() => 'https://x.test/a/b/c')`, `navigate`, `reload`, `writeClipboard` (resolving). Clear them in the existing `beforeEach` loop with `mockClear`. `start()` passes `page: { href, navigate, reload, writeClipboard }` before `...overrides`.
    - Extend `press(key: string, init: KeyboardEventInit = {})` to build `new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })` (T9 reuses this).
    - `r reloads the page and consumes the key` — `press('r').defaultPrevented` is true; `reload` called once (R10.1).
    - `yy copies the URL and consumes both keys` — both `press('y')` events have `defaultPrevented` true; `writeClipboard` called once with `https://x.test/a/b/c` (R8.1, R10.1).
    - `gu goes up a level` — `navigate` called with `https://x.test/a/b` (R9.1); `3gu goes three levels` — `3`, `g`, `u` → `https://x.test/` (R9.2, R10.4).
    - `gU goes to the root` and `3gU still goes to the root` — `navigate` called once with `https://x.test/` in each (R9.3, R9.6, R10.4).
    - `keys typed in a focused field run no page command` — `addInput().focus()`, then `start()`, press `r`, `y`, `y`: `reload` and `writeClipboard` not called, every `defaultPrevented` false (R10.2).
    - `a held r reloads once` — `press('r')`, then `press('r', { repeat: true })`: `reload` called once in total (R10.3).
- **Steps:**
  1. Write the tests above; they fail (no `navigation.ts`, no `onceOnly`, no `page` dep).
  2. `registry.ts`: rename the current array to `export const SCROLL_COMMAND_NAMES` (same eight names, same order); add `const PAGE_COMMAND_NAMES = ['reload', 'copyUrl', 'urlUp', 'urlRoot'] as const` (not exported); set `export const COMMAND_NAMES = [...SCROLL_COMMAND_NAMES, ...PAGE_COMMAND_NAMES] as const`. Reword the `context` doc comment: `'page'` commands run in the page, `'background'` commands run through the service worker (added in T9). Add `export function onceOnly(run: (ctx: CommandContext) => void): (ctx: CommandContext) => void` returning `(ctx) => { if (!ctx.repeat) { run(ctx); } }`, with a doc comment citing R10.3.
  3. `navigation.ts`: `import type { Command, CommandContext, CommandName } from './registry'`, `import { onceOnly } from './registry'`, `import { parentUrl, rootUrl } from '../url'`. Export `interface PageActions` exactly as in the design and `function createNavigationCommands(actions: PageActions): readonly Command[]`. One private helper `pageCommand(name: CommandName, description: string, acceptsCount: boolean, run: (ctx: CommandContext) => void): Command` returns `{ name, description, acceptsCount, context: 'page', run: onceOnly(run) }` (4 params, the limit). Private `async function copy(actions: PageActions): Promise<void> { try { await actions.writeClipboard(actions.href()); } catch { /* clipboard refused or missing: the key is still consumed (R8.2); not logged (NFR4.1) */ } }`; the synchronous throw is caught because the call sits inside `try`. Commands, in order: `reload` (`() => { actions.reload(); }`), `copyUrl` (`() => { void copy(actions); }`), `urlUp` (`const target = parentUrl(actions.href(), ctx.count ?? 1); if (target !== undefined) { actions.navigate(target); }`), `urlRoot` (same with `rootUrl(actions.href())`). Descriptions: `Reload the page`, `Copy the page URL`, `Go up in the URL (count: that many levels)`, `Go to the root of the site`. `acceptsCount`: false, false, true, false. No logging.
  4. `controller.ts`: `import { createNavigationCommands, type PageActions } from './commands/navigation'`; add `/** location and the clipboard in the extension (R7, R8, R9). */ readonly page: PageActions;` to `ControllerDeps`; the registry becomes `createCommandRegistry([...createScrollCommands({ scroller, targets: tracker }), ...createNavigationCommands(deps.page)])`.
  5. `defaults.ts`: append `{ keys: ['r'], command: 'reload' }`, `{ keys: ['y', 'y'], command: 'copyUrl' }`, `{ keys: ['g', 'u'], command: 'urlUp' }`, `{ keys: ['g', 'U'], command: 'urlRoot' }` after the M1 entries.
  6. `content.ts`: add to the `createController` call `page: { href: () => location.href, navigate: (url) => { location.assign(url); }, reload: () => { location.reload(); }, writeClipboard: (text) => navigator.clipboard.writeText(text) }` (braced arrows for void calls, no unbound methods).
  7. Run `npm run build` to confirm the content script still bundles.
- **Done when:** the new and changed tests pass; no M1 e2e spec is affected by the new keys `r`, `y`, `u`, `U` (they press only `j`, `k`, `h`, `l`, `g`, `G`, `i`, `x`, digits, `Tab`, `Escape`; `x` is handled in T9); `npm run build` succeeds; `npm run check` passes (Knip: `SCROLL_COMMAND_NAMES` is imported by `scroll.test.ts`, `onceOnly` by `navigation.ts`, `PageActions` and `createNavigationCommands` by `controller.ts`; `PAGE_COMMAND_NAMES` is not exported).
- **Commit:** `Add: page commands for reload, copying the URL and going up`

### T9: Add the background command proxies and their keys — [ ] todo

- **Requirements:** R1.3, R2.1–R2.5, R3.1–R3.4, R4.1–R4.4, R5.1, R5.2, R6.1–R6.3, R10.1–R10.4, R10.7, NFR2.2 · **Design:** Background command proxies, Registry and keymap, Wiring
- **Depends on:** T3 (`MessageClient`, `createMessageClient`), T7b (the worker handles every command, so no key sends a message nobody handles), T8 (`onceOnly`, `SCROLL_COMMAND_NAMES`, `createNavigationCommands`, `page` dep, `press(key, init)`)
- **Why one commit:** adding the background names to `COMMAND_NAMES` makes `createCommandRegistry` throw `Missing command` in `controller.ts`, `controller.test.ts` and `defaults.test.ts` until the proxies are built and passed in, so the proxies, the registry change, the controller `client` dep, `content.ts` and the keys cannot be separated without a red intermediate commit. Mapping `x` also breaks the M1 pass-through e2e spec, so its sentinel fix lands here too. (Scope critic suggested a split into proxies and wiring; rejected for this reason.)
- **Files:** create `src/core/commands/background.ts`, `src/core/commands/background.test.ts`; modify `src/core/commands/registry.ts`, `src/core/controller.ts`, `src/core/controller.test.ts`, `src/settings/defaults.ts`, `src/settings/defaults.test.ts`, `src/entrypoints/content.ts`, `tests/e2e/pass-through.spec.ts`
- **Tests first:**
  - `src/core/commands/background.test.ts`, with `const sendCommand = vi.fn<MessageClient['sendCommand']>(() => Promise.resolve())` in its own variable (cleared in `beforeEach`), `import type { MessageClient } from '../../messaging/client'`, and a helper `run(name, ctx)` that finds the command in `createBackgroundCommands({ client: { sendCommand } })`:
    - `returns one command per background name, in order` — the names equal `[...BACKGROUND_COMMAND_NAMES]`.
    - `marks every command as a background command with the right count flag` — `it.each` over the design table rows `[name, acceptsCount]`: `acceptsCount` true for `tabNext`, `tabPrevious`, `tabGoTo`, `tabRestore`, `historyBack`, `historyForward`; false for `tabFirst`, `tabLast`, `tabClose`, `tabDuplicate`. Each has `context: 'background'` and a non-empty description.
    - `sends the command and count once` — `it.each(BACKGROUND_COMMAND_NAMES)`: `run(name, { count: 3, repeat: false })` → `sendCommand` called once with `(name, 3)` (R1.3).
    - `sends undefined when no count was typed` — `{ count: undefined, repeat: false }` → `(name, undefined)`.
    - `ignores auto-repeat` — `{ count: 1, repeat: true }` sends nothing (R10.3).
    - `drops the count for commands that take none, through a real registry` — build `createCommandRegistry([...fakes, ...createBackgroundCommands({ client: { sendCommand } })])`, where `fakes` is `COMMAND_NAMES.filter((n) => !BACKGROUND_COMMAND_NAMES.some((b) => b === n)).map((name): Command => ({ name, description: 'fake', acceptsCount: true, context: 'page', run: () => undefined }))`. `registry.run('tabClose', { count: 4, repeat: false })` → `(tabClose, undefined)`; same for `tabFirst`, `tabLast`, `tabDuplicate` (R3.4, R4.2, R5.2, R10.4). A counted case: `registry.run('tabNext', { count: 4, repeat: false })` → `(tabNext, 4)`.
  - `src/settings/defaults.test.ts`:
    - `EXPECTED` gains `J`→`tabNext`, `g t`→`tabGoTo`, `K`→`tabPrevious`, `g T`→`tabPrevious`, `g 0`→`tabFirst`, `g $`→`tabLast`, `x`→`tabClose`, `X`→`tabRestore`, `H`→`historyBack`, `L`→`historyForward`, `y t`→`tabDuplicate` (with T8's four, 25 entries; the length test keeps T8's name `has no mappings beyond the listed keys`).
    - `treats g and y as prefixes` — `buildKeymapTrie(DEFAULT_KEYMAP).lookup(['g'])` and `lookup(['y'])` both `toEqual({ type: 'prefix' })`.
    - `resolves every default mapping to a registered command`: build the registry from `createScrollCommands(...)`, `createNavigationCommands(<T8's fake PageActions>)` and `createBackgroundCommands({ client: { sendCommand: vi.fn<MessageClient['sendCommand']>() } })`; without the last, the registry throws `Missing command`. The no-clash and no-`Cmd` tests stay (NFR2.2).
  - `src/core/controller.test.ts`:
    - Add a module-level `const sendCommand = vi.fn<MessageClient['sendCommand']>(() => Promise.resolve())` (type import from `../messaging/client`), added to the `mockClear` list in `beforeEach`; `start()` passes `client: { sendCommand }` by default (still overridable). `press(key, init)` already takes the optional `KeyboardEventInit` from T8.
    - `sends each background key and consumes it` — `it.each` over `[keys, command]`: `['J', 'tabNext']`, `['gt', 'tabGoTo']`, `['K', 'tabPrevious']`, `['gT', 'tabPrevious']`, `['g0', 'tabFirst']`, `['g$', 'tabLast']`, `['x', 'tabClose']`, `['X', 'tabRestore']`, `['H', 'historyBack']`, `['L', 'historyForward']`, `['yt', 'tabDuplicate']`. Press each character in turn; `sendCommand` is called once with `(command, undefined)`; the last key's event has `defaultPrevented === true` (R10.1, R2.1–R2.5, R3.1, R3.2, R4.1, R4.4, R5.1, R6.1, R6.2).
    - `passes a typed count to a counting command` — `3`,`K` → `(tabPrevious, 3)`; `3`,`g`,`t` → `(tabGoTo, 3)`; `2`,`H` → `(historyBack, 2)`; `3`,`X` → `(tabRestore, 3)`.
    - `drops the count for x, g0 and yt` — `2`,`x` → `(tabClose, undefined)`; `2`,`g`,`0` → `(tabFirst, undefined)`; `2`,`y`,`t` → `(tabDuplicate, undefined)` (R3.4, R4.2, R5.2, R10.4).
    - `g0 is a key, not a count` — `g`,`0` → `(tabFirst, undefined)` and no scroll happens.
    - `sends once for a held x` — `press('x')` then `press('x', { repeat: true })` → `sendCommand` called once (R10.3).
    - `sends nothing for keys typed in a field` — focus an input, press `J`, `x`, `H`: `sendCommand` not called and `defaultPrevented` false (R10.2).
    - `keeps working while sendCommand never settles` — `sendCommand.mockReturnValue(new Promise<void>(() => undefined))`; press `J`, then `j`: `scrollTop()` is 60 (the proxy doesn't await).
  - `tests/e2e/pass-through.spec.ts`: an existing spec that uses `x` as its unmapped key. No new case: replace every `x` key press and every `keydown:x:false` / `keyup:x:false` string with `q` (still unmapped), keeping the assertions otherwise as they are.
- **Steps:**
  1. Write the tests; they fail.
  2. `registry.ts`: `import { BACKGROUND_COMMAND_NAMES } from '../../messaging/protocol'`; `COMMAND_NAMES` becomes `[...SCROLL_COMMAND_NAMES, ...PAGE_COMMAND_NAMES, ...BACKGROUND_COMMAND_NAMES] as const`. Update the `context` doc comment: `'page'` runs in the page, `'background'` runs through the service worker. `onceOnly`, `SCROLL_COMMAND_NAMES` and `PAGE_COMMAND_NAMES` already exist from T8; do not redefine them.
  3. `background.ts`: `import type { MessageClient } from '../../messaging/client'`, `import { BACKGROUND_COMMAND_NAMES, type BackgroundCommandName } from '../../messaging/protocol'`, `import { onceOnly, type Command } from './registry'`. Keep one unexported table `const COMMANDS: Record<BackgroundCommandName, { readonly description: string; readonly acceptsCount: boolean }>` with the design's ten rows (descriptions as in the design table). Export `createBackgroundCommands(deps: { readonly client: Pick<MessageClient, 'sendCommand'> }): readonly Command[]` returning `BACKGROUND_COMMAND_NAMES.map((name): Command => ({ name, ...COMMANDS[name], context: 'background', run: onceOnly((ctx) => { void deps.client.sendCommand(name, ctx.count); }) }))`. The `void` is safe because `sendCommand` never rejects (T3).
  4. `controller.ts`: add `readonly client: Pick<MessageClient, 'sendCommand'>;` to `ControllerDeps` with a one-line doc (type import from `../messaging/client`); the registry list becomes `[...createScrollCommands({ scroller, targets: tracker }), ...createNavigationCommands(deps.page), ...createBackgroundCommands({ client: deps.client })]`.
  5. `defaults.ts`: append the eleven entries `J`, `g t`, `K`, `g T`, `g 0`, `g $`, `x`, `X`, `H`, `L`, `y t` (`K` and `gT` are two entries for `tabPrevious`).
  6. `content.ts`: add `client: createMessageClient((message) => chrome.runtime.sendMessage(message))` to the `createController` call, importing `createMessageClient` from `@/messaging/client`. It stays an arrow: `chrome.runtime` is read inside the client's try/catch, so an invalidated extension can't throw in the page (R10.7).
  7. `tests/e2e/pass-through.spec.ts`: swap the sentinel `x` for `q` as described above.
  8. Run `npm run build` and `npm run test:e2e`; the M1 specs, including the pass-through spec, must still pass.
- **Done when:** the new and changed tests pass; `npm run build` succeeds; `npm run test:e2e` passes (M1 specs unaffected by the mapped `x`); `npm run check` passes (Knip: `createBackgroundCommands` is imported by `controller.ts` and the tests, `createMessageClient` by `content.ts`; `BACKGROUND_COMMAND_NAMES` by `registry.ts`).
- **Commit:** `Add: tab and history commands that message the service worker`

### T10: Add end-to-end tests for tabs — [ ] todo

- **Requirements:** R1.3, R2.1–R2.8, R3.1–R3.4, R4.1, R4.2, R5.1, R10.1 · **Design:** Testing strategy (end-to-end)
- **Depends on:** T9 (which also frees `x` from the pass-through spec)
- **Files:** create `tests/e2e/tabs.spec.ts`. Don't modify `tests/e2e/fixtures/pages.ts` or `fixtures.ts`.
- **Tests first:** in `tabs.spec.ts`. Imports: `import type { BrowserContext, Page } from '@playwright/test';`, `import { expect, test } from './fixtures';`, `import { openPage, readSeen } from './fixtures/pages';`. Local helpers above the tests (not exported; e2e files stay under the lint limits: 60 lines per function, 300 per file, no `!` assertions):
  - `pageAt(pages: readonly Page[], index: number): Page` — returns `pages[index]`, throws `new Error(`no page at ${index}`)` when undefined (`noUncheckedIndexedAccess`).
  - `openTabs(context, count): Promise<Page[]>` — opens `count` pages one after another with `openPage(context, 'recorder')` (all share one URL; the route is per page, which is fine). Then closes the initial `about:blank` page (the `context.pages()` entry whose `url()` is `about:blank`) only after the others exist, so the window survives. Returns the opened pages in tab-strip order (creation order); the last one opened is the active tab.
  - `activeIndex(pages: readonly Page[]): Promise<number>` — `Promise.all` of `page.evaluate(() => document.visibilityState)`; returns the index of the `'visible'` page (`-1` if none). Assertions use `await expect.poll(() => activeIndex(pages)).toBe(n)`.
  - `activate(pages, index): Promise<void>` — `await pageAt(pages, index).bringToFront()`, then polls `activeIndex(pages)` to equal `index`. Every test calls it for its starting tab before typing.
  - `press(pages, from, keys): Promise<void>` — `await activate(pages, from)`, then `await pageAt(pages, from).keyboard.type(keys)`. If an uppercase letter doesn't arrive as `key: 'J'` through `type`, send it with `keyboard.press('Shift+J')` (as `scrolling.spec.ts` does with `Shift+G`); decide once in the helper and record it in the History line.
  - `settle(page): Promise<void>` — `await page.waitForTimeout(300)`, with a comment: used only to prove that nothing happened, which polling cannot do.
  - Top-level tests (no `describe`), four tabs unless noted:
    - `J moves to the next tab` — start 0, `J` → 1 (R2.1).
    - `K moves to the previous tab` — start 2, `K` → 1 (R2.2).
    - `J on the last tab wraps to the first and K on the first wraps to the last` — start 3, `J` → 0; then `K` → 3 (R2.1, R2.2).
    - `2J skips one tab` — start 0, `2J` → 2 (R2.3).
    - `3gt goes to the third tab and 99gt to the last` — start 0, `3gt` → 2; then `99gt` → 3 (R2.5, R2.6).
    - `gt without a count goes to the next tab` — start 0 → 1 (R2.5).
    - `g0 goes to the first tab and g$ to the last` — start 2, `g0` → 0; then `g$` → 3 (R3.1, R3.2).
    - `g0 on the first tab keeps it active and the key is consumed` — start 0, `g0`; poll `readSeen(page)` toContain `keydown:0:true`; `settle`; active index still 0 (R3.3, R10.1).
    - `2g0 ignores the count` — start 2, `2g0` → 0, not an error and not a count-driven move (R3.4).
    - `J in a window with one tab does nothing but is consumed` — `openTabs(context, 1)`, `J`; poll `readSeen` toContain `keydown:J:true`; `settle`; active index 0 (R2.7, R10.1).
    - `x closes the current tab and keeps the others` — start 1: poll `pageAt(pages, 1).isClosed()` true and `context.pages().length` 3 (R4.1).
    - `2x closes only one tab` — same, with `2x`; after the poll `settle` and re-assert length 3 (R4.2).
    - `yt adds one tab and activates it` — start 0; `const before = context.pages()`; `yt`; poll `context.pages().length` 5; `const copy = context.pages().find((p) => !before.includes(p))` (fail if undefined); poll that `activeIndex(context.pages())` equals the index of `copy` in `context.pages()`. The copy loads an error page because `page.route` is per page: assert nothing about its content (R5.1).
- **Steps:**
  1. Write the tests; run `npm run test:e2e` (it builds first). They fail only if T9 is missing.
  2. If `visibilityState` is not reliable in headless Chromium, read the active tab from the service worker: `const [worker] = context.serviceWorkers()` (or `await context.waitForEvent('serviceworker')`), `worker.evaluate(async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.index)`. Never use `currentWindow` from the worker. If `context.pages()` order does not match the strip, sort by `index` read the same way. Record the fallback used in the History line.
  3. Keep each test function under 60 lines and the file under 300 lines; no `console`, no `!`, no `any`.
  4. Run `npm run test:e2e` three times in a row to check for flakiness before committing.
- **Done when:** `npm run test:e2e` passes (all specs, including the existing ones), three times in a row; `npm run check` passes.
- **Commit:** `Test: add end-to-end tests for tab commands`

### T11: Add end-to-end tests for history, reload, copy and go up — [ ] todo

- **Requirements:** R6.1–R6.5, R7.1, R8.1, R9.1–R9.4, R10.1 · **Design:** Testing strategy (end-to-end)
- **Depends on:** T9 (every key it presses is mapped and handled by then)
- **Files:** create `tests/e2e/navigation.spec.ts`; modify `tests/e2e/fixtures/pages.ts` (add `openAt` and the `marker` global)
- **Tests first:** the helper first, then `tests/e2e/navigation.spec.ts` with top-level tests (no `describe`; imports `test` and `expect` from `./fixtures`, `openAt` from `./fixtures/pages`, `type { Page }` from `@playwright/test`).
  - In `pages.ts`: add `marker?: number;` to the existing `Window` global. Add `export async function openAt(context: BrowserContext, path: string): Promise<Page>`: `const page = await context.newPage()`, `await page.emulateMedia({ reducedMotion: 'reduce' })`, `await page.route(/^https:\/\/example\.test\//, (route) => route.fulfill({ contentType: 'text/html', body: PAGES.article }))` (a regex, so every path and query matches; the hash is never sent), `await page.goto('https://example.test' + path)`, `return page`. Leave `openPage` unchanged. Every later `page.goto` in the spec uses a full `https://example.test/...` URL (there is no `baseURL`).
  - Local helpers in the spec (not exported): `pathOf(page: Page): string` returns `new URL(page.url()).pathname + search + hash`, and tests poll it with `expect.poll(() => pathOf(page), { timeout: 10_000 })`; `press(page: Page, keys: string[]): Promise<void>` runs `await page.bringToFront()` then `await page.keyboard.press(key)` for each key in order (`'Shift+H'` for `H`, `'Shift+L'` for `L`, `'Shift+U'` for `U`, plain digits and letters otherwise); `openHistory(context): Promise<Page>` opens `/p1`, then `page.goto('https://example.test/p2')`, `page.evaluate(() => { location.hash = 'a'; })`, `page.goto('https://example.test/p3')`, then asserts `await expect(page.evaluate(() => history.length)).resolves.toBe(4)` (entries: p1, p2, p2#a, p3, which confirms the first navigation replaced the initial blank entry; if it is 5, fix the setup, do not adapt the assertions).
  - `H goes back and L goes forward across two documents` — `openAt('/p1')`, `page.goto('https://example.test/p2')`; `press(['Shift+H'])`, poll `pathOf` is `/p1`; `press(['Shift+L'])`, poll is `/p2` (R6.1, R6.2, R10.1).
  - `3H steps back across documents and hash changes` — `openHistory`; `press(['3', 'Shift+H'])`; poll is `/p1` (R6.3).
  - `9H stops at the first entry` — `openHistory`; `press(['9', 'Shift+H'])`; poll is `/p1` (R6.4).
  - `H on the first entry does nothing` — `openAt('/p1')`, `page.evaluate(() => { window.marker = 1; })`; `press(['Shift+H'])`; assert the path is still `/p1`, `window.marker` is still `1` and `history.length` is unchanged. This check can't prove timing (the command is asynchronous); it only catches a wrongly navigating handler (R6.5).
  - `r reloads the page` — `openAt('/p1')`, set `window.marker = 1`; `await Promise.all([page.waitForEvent('load'), press(page, ['r'])])`; then `expect(await page.evaluate(() => window.marker)).toBeUndefined()` (R7.1). Don't poll `evaluate` across a navigation.
  - `yy copies the full URL` — `context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://example.test' })`, `openAt('/a/b?q=1#h')`, `press(['y', 'y'])`, `expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('https://example.test/a/b?q=1#h')` (R8.1).
  - `gu goes up one level` — `openAt('/a/b/c?q#h')`; `press(['g', 'u'])`; poll `/a/b` (R9.1). `2gu goes up two levels` — `press(['2', 'g', 'u'])`; poll `/a` (R9.2). `gU goes to the root` — `press(['g', 'Shift+U'])`; poll `/` (R9.3). `gu at the root does nothing` — `openAt('/')`, set `window.marker = 1`, `press(['g', 'u'])`; the marker is still `1` and the path is still `/` (R9.4; `urlUp` is synchronous in the page, so the check right after the awaited key press is meaningful).
- **Steps:**
  1. Add `openAt` and the `marker` global; write the tests; run `npm run build` then `npm run test:e2e`.
  2. Every wait is an `expect.poll` (or the `load` event for the reload); no fixed sleeps. Same-document steps may cost up to the 1000 ms commit timeout per step, so use poll timeouts of several seconds (10 s for the `3H` and `9H` tests).
  3. If headless Chromium refuses the clipboard even with permissions granted, record it in the History line and open a fix task instead of weakening the test silently.
  4. Keep each test under 60 lines, the spec under 300 lines, and `pages.ts` under its limits.
- **Done when:** `npm run test:e2e` passes; `npm run check` passes (Knip: `openAt` is imported by the spec).
- **Commit:** `Test: add end-to-end tests for history, reload, copy and go up`

### T12: Run the manual check and mark milestone M2 done — [ ] todo

- **Requirements:** R1.7, R4.4–R4.8, R6.4, R8.1, NFR1.1, NFR1.2, NFR2.1, NFR2.3, NFR3.1 · **Design:** Testing strategy (manual check)
- **Depends on:** T10, T11 (and so all of T1–T9)
- **Files:** modify `PLAN.md`, `docs/specs/2026-11-05-tabs-and-history/tasks.md`
- **Tests first:** none (documentation and manual check). Before asking the user to check, run `npm run check`, `npm run build` and `npm run test:e2e`; all must pass. Read the History lines of T10 and T11 for any fallback they used (tab order, clipboard).
- **Steps:**
  1. Ask the user to load `.output/chrome-mv3` in Arc and in Chrome and run this checklist, reporting each numbered result. The executor cannot run Arc and must not assume a pass.
     1. The build loads and works in both Arc and Chrome (NFR2.1), and the install warning lists browsing history (NFR3.1).
     2. In Arc with pinned tabs and several spaces: `J`, `K` and `gt` follow the sidebar order (NFR2.3).
     3. `X` restores the last closed tab with its history; `3X` restores three; with none closed it does nothing (R4.4–R4.8).
     4. Stop the service worker from `chrome://extensions`, then press `J`: the tab still changes (R1.7).
     5. `5H` on a tab with fewer than five entries goes as far as it can (R6.4); `yy` puts the URL in the clipboard in Arc (R8.1).
     6. Performance recording of one keypress: the handoff to `sendMessage` takes under 16 ms (NFR1.1), and no timers, observers or listeners appear in the page while idle (NFR1.2).
  2. If any check fails, stop: add a fix task before T12 (call it T12a) and set _Blocked by_ to it. Do not tick anything.
  3. When all pass, in `PLAN.md` under `### M2 — Tabs and history` tick the five boxes. Replace the last item's text `Counts work for background commands (`3J`, `2x`)` with ``Counts work for background commands (`3J`, `3H`, `3X`); `x` takes no count``.
  4. In `tasks.md`: set this task to `[x] done`; status log Phase `done`, Next task `none`, Last updated; add a History line naming the commit subject `Docs: mark milestone M2 as done` and summarising the manual results (browsers, Arc findings, any fallback).
- **Done when:** the user has confirmed every manual check and the results are in the History line; the five M2 boxes are ticked; `npx prettier --check PLAN.md docs/specs/2026-11-05-tabs-and-history/tasks.md` and `npm run check` pass.
- **Commit:** `Docs: mark milestone M2 as done`

## Coverage

| Criterion      | Tasks                   |
| -------------- | ----------------------- |
| R1.1           | T2                      |
| R1.2           | T4, T7b                 |
| R1.3           | T3, T4, T7b, T9, T10    |
| R1.4           | T4                      |
| R1.5           | T2, T4                  |
| R1.6           | T3, T4, T6, T7b         |
| R1.7           | T7b, T12                |
| R1.8           | T4, T6                  |
| R2.1–R2.8      | T5, T9, T10             |
| R3.1–R3.4      | T5, T9, T10             |
| R4.1–R4.3      | T5, T9, T10             |
| R4.4–R4.8      | T5, T12                 |
| R5.1, R5.2     | T5, T9, T10             |
| R6.1–R6.5      | T6, T7, T9, T11, T12    |
| R7.1, R7.2     | T8, T11                 |
| R8.1–R8.4      | T8, T11, T12            |
| R9.1–R9.7      | T1, T8, T11             |
| R10.1–R10.4    | T8, T9, T10             |
| R10.5          | T4, T5, T6              |
| R10.6          | T4                      |
| R10.7          | T3, T9                  |
| NFR1.1, NFR1.2 | T12                     |
| NFR2.1         | T12                     |
| NFR2.2         | T8, T9                  |
| NFR2.3         | T5, T12                 |
| NFR3.1, NFR3.2 | T7b, T12                |
| NFR3.3         | T4                      |
| NFR4.1         | T3, T4, T8              |
| NFR5.1, NFR5.2 | every task (check), T12 |

## Open questions

- Can `src/manifest.test.ts` import `../wxt.config` under `tsc -p src` and Vitest? Provisional: try it; if not, check the built manifest in an e2e test (T7b).
- T12's manual check needs the user to run Arc and Chrome. Provisional: the user reports each numbered result in chat.

## Review notes

- Pass 1: created 12 tasks. Split the registry/controller/keymap work into two vertical slices (T8 page commands, T9 background proxies) because the registry throws when a name in `COMMAND_NAMES` has no command. The service-worker side lands before the proxies, so no key sends a message nobody handles.
- Pass 2: merged the twelve task-mode proposals. Accepted the scope critic on T7 and split it into T7 (`createHistoryApi` and its fake-timer test, depends on T6) and T7b (router wiring, permissions, manifest test); T9 now depends on T7b; the `T7b` name avoids renumbering. Accepted the critic on T12 and restored NFR2.1 in its requirements, the coverage table and checklist item 1. Fixed the coverage table: R1.7 no longer lists T4, R8.1 adds T12, NFR2.1 maps to T12. Cross-task notes applied: T8 exports `SCROLL_COMMAND_NAMES` and `onceOnly`, fixes `scroll.test.ts` and the `defaults.test.ts` registry; T9 reuses them and adds the `client` fakes; T5/T6 use `@/` imports. T8's commit subject changed to `Add: page commands for reload, copying the URL and going up`. Needs a look: T7, T7b (new split), T8 and T9 (shared test helpers), T10 and T11 (e2e feasibility).
- Pass 3: merged six proposals (T7, T7b, T8, T9, T10, T11), all READY. Rejected the scope critic's T9 split: adding the background names to `COMMAND_NAMES` makes `createCommandRegistry` throw `Missing command` in `controller.ts`, `controller.test.ts` and `defaults.test.ts` unless the proxies are built and passed in the same commit, so a "proxies + registry" T9a would leave the suite red; the commit is large but one logical change (T8 is shaped the same way). Cross-task notes applied: `press(key, init)` is added in T8 and only used in T9; R10.6 dropped from T9 (coverage row is T4 only); T9 now also edits `tests/e2e/pass-through.spec.ts` (sentinel `x` to `q`) because mapping `x` would break it, and runs `npm run test:e2e`; T10 and T11 depend on T9 as before. T11 uses a regex route and full URLs (no `baseURL`). No task needs a deeper look.
