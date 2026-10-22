# Normal mode and scrolling — Tasks

**Spec:** [requirements.md](requirements.md) · [design.md](design.md)
**Verdict:** READY — pass 2, 2026-10-21

## Status log

### Current status

- **Phase:** executing
- **Next task:** T18 — Restart the content script in open tabs on install and update
- **Blocked by:** nothing
- **Last updated:** 2026-10-21 by T17

### Agreements

- 2026-10-21 — One spec for all of M1; smooth scrolling; `<Esc>` in a text field blurs it and returns to Normal mode (user, brainstorm contract).
- 2026-10-21 — `<C-d>` / `<C-u>` alias `d` / `u`; the task that adds them (T5) also adds them to the M1 key list in `PLAN.md` (user).
- 2026-10-21 — Re-injection into open tabs on install/update is part of M1 and adds the `scripting` permission (user).
- 2026-10-21 — Interface details the design leaves open are fixed in this plan, marked _provisional_ where they extend a design signature: an injected `isTrusted` check for `listenForKeys`, extra `ControllerDeps` fields (`shadowRootOf`, `prefersReducedMotion`, `isTrusted`), Normal mode deps (`trie`, `editableFocused` instead of `parser`), and one animation per (element, axis) in the scroller (planner, pass 1; see _Open questions_).
- 2026-10-21 — The four interface gaps above are no longer provisional: `listenForKeys` takes an `isTrusted` predicate; `ControllerDeps` gains `isTrusted`, `shadowRootOf` and `prefersReducedMotion`; Normal mode takes `trie` and `editableFocused`; the scroller keeps one animation per element and axis. They were folded into `design.md` in `Docs: fill four interface gaps in the M1 design` (user).
- 2026-10-21 — `PLAN.md`'s M1 list gets "Restart in open tabs on install and update", added already ticked by T18 (user).
- 2026-10-21 — The design's testing-strategy check "`DEFAULT_KEYMAP` resolves in the real registry" (R5.5) lives in `src/settings/defaults.test.ts` (T13), not in `registry.test.ts`: T2 has no commands or keymap to check yet (review).
- 2026-10-21 — Every task's commit also flips its marker to `[x] done`, sets _Next task_ and adds a dated _History_ line naming the commit subject. Commit subjects start lowercase after the colon (commitlint `subject-case`) and are imperative (review).

### History

- 2026-10-21 — planner: pass 1, created 19 tasks (T1–T19).
- 2026-10-21 — planner: round 1 of per-task reviews (T1–T19, all READY) integrated as pass 2; recorded the user's answers; plan READY.
- 2026-10-21 — T1 done: `Change: let the key listener consume keys and swallow their keyup`.
- 2026-10-21 — T2 done: `Add: command registry with named commands and metadata`.
- 2026-10-21 — T3 done: `Add: keymap trie that rejects clashing mappings`.
- 2026-10-21 — T4 done: `Add: key parser with counts, sequences and re-handling`.
- 2026-10-21 — T5 done: `Add: default keymap for the M1 scroll commands`.
- 2026-10-21 — T6 done: `Add: editable element detection through shadow roots`.
- 2026-10-21 — T7 done: `Add: focus watcher that reports editable focus changes`.
- 2026-10-21 — T8 done: `Add: mode machine with enter and exit hooks`.
- 2026-10-21 — T9 done: `Add: insert mode that leaves on Esc and Ctrl-[`.
- 2026-10-21 — T10 done: `Add: normal mode that runs commands from key sequences`.
- 2026-10-21 — T11 done: `Add: scroller with smooth, additive scroll animations`.
- 2026-10-21 — T12 done: `Add: scroll-target tracker for inner scrolling panels`.
- 2026-10-21 — T13 done: `Add: scroll commands for j k h l d u gg and G`.
- 2026-10-21 — T14 done: `Add: controller that wires modes, keys and scrolling`.
- 2026-10-21 — T15 done: `Change: run the M1 controller in the content script`.
- 2026-10-21 — T16 done: `Test: add end-to-end tests for normal and insert modes`.
- 2026-10-21 — T17 done: `Test: add end-to-end tests for scrolling and scroll targets`.

## Project state

As of pass 2 (branch `m1-normal-mode-scrolling`, head `b3bf075 Docs: fill four interface gaps in the M1 design`):

- M0 is done and ticked in `PLAN.md`. M1 boxes are all unticked. The M1 key line reads `` - [ ] `j` `k` `h` `l` `d` `u` `gg` `G` ``, and the last M1 line is `- [ ] Scroll the right element (the focused scrollable container, not always `window`)`.
- `design.md` (after b3bf075) contains the `isTrusted` parameter, the full `ControllerDeps`, `createNormalMode({ machine, trie, registry, timer, editableFocused })` and the one-animation-per-element-and-axis rule.
- `src/core/key-notation.ts` exports `toKeyNotation` and `KeyInput` (tested). `toKeyNotation` maps Escape → `<Esc>`, Ctrl+`[` → `<C-[>`, Ctrl+d → `<C-d>`, Shift+g → `G`, uses the modifier prefix order `C-` `A-` `S-` `D-`, and returns `undefined` for lone modifiers and IME composition.
- `src/core/key-listener.ts` exports `listenForKeys(target, onKey: (key: string) => void)`: capture `keydown` on `target`, no consume, no `keyup` handling. Tested in `key-listener.test.ts`.
- `src/entrypoints/content.ts`: `<all_urls>`, `document_start`, logs `[vim] <key>` with `console.debug` (with an eslint-disable comment), `ctx.onInvalidated(stop)`.
- No `src/entrypoints/background.ts`, no `src/background/`, `src/settings/`, `src/core/modes/`, `src/core/commands/`, `src/core/scroll/` yet.
- Built manifest (`.output/chrome-mv3/manifest.json`) has no `permissions`; one content script `content-scripts/content.js`. WXT strips its own logger in production, so the only `console.debug` in `content.js` is the M0 log.
- E2E: `tests/e2e/fixtures.ts` (a `test` fixture launching Chromium with the built extension via `launchPersistentContext`, `channel: 'chromium'`), `tests/e2e/key-logging.spec.ts` (relies on the M0 `console.debug` log). Pages are served with `page.route('https://example.test/...')`. `tests/e2e/tsconfig.json` has `lib: ["ES2023", "DOM"]` and `types: ["node"]` (no `chrome` types). Default viewport 1280 × 720.
- `npm run check` = typecheck (root, `src`, `tests/e2e`) + `eslint . --max-warnings=0` + `prettier --check .` + `vitest run --coverage` (80% on `src/**/*.ts` minus tests and `src/entrypoints/**`) + `knip`. `npm run test:e2e` = `wxt build` + Playwright; CI runs both.
- Tooling facts every task must respect:
  - **Knip** (`entry: src/entrypoints/**/*.ts`, `project: src/**/*.ts`, Vitest plugin makes `*.test.ts` entries, `ignoreExportsUsedInFile` off): every export, **types included**, must be imported by another file at the commit that adds it (its own test counts). Don't export a deps interface or helper that only its own file uses; a later task adds `export` when it first imports a name. `tests/e2e/` is outside `project`, so its exports aren't checked.
  - **ESLint:** `strictTypeChecked` + `stylisticTypeChecked` (type-aware: `unbound-method`, `no-floating-promises`, `no-unnecessary-condition`, `no-confusing-void-expression`, `restrict-template-expressions`, `prefer-const`), SonarJS, `explicit-module-boundary-types`, `consistent-type-imports`, `switch-exhaustiveness-check`, `no-console` (warn/error allowed), complexity 10, cognitive 15, depth 3, 4 params, 60 lines per function, 300 per file. The size exemptions match only `**/*.test.ts`: `tests/e2e/**/*.spec.ts` and `tests/e2e/fixtures/pages.ts` stay under 60 lines per function and 300 per file, so e2e tests sit at top level with no `test.describe`. Pass methods as arrows (`() => { controller.stop(); }`), never as unbound references; assert on `vi.fn` consts held in their own variables, never on a method read off an interface-typed object.
  - **TypeScript:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`, no `declaration` (an exported function may return an unexported interface). `src` sees only DOM + `chrome` types (no Node), so `setTimeout` returns `number`.
  - **jsdom 30.1.3** (checked by the reviewers against the repo's copy):
    - Dispatched events always have `isTrusted === false` (non-configurable, can't be overridden).
    - `Element.prototype.scrollTo` and `window.matchMedia` don't exist; `document.designMode` isn't implemented (`'designMode' in document` is false); `isContentEditable` is `undefined`.
    - `document.scrollingElement` is **`undefined`** (not `null`), so `doc.scrollingElement ?? doc.documentElement` falls back to `documentElement`; tests that need the other branch define it with `Object.defineProperty` and remove it with `Reflect.deleteProperty`.
    - Layout values (`scrollHeight`, `clientHeight`, `getBoundingClientRect`) are 0; `scrollTop` / `scrollLeft` store any value without clamping; `innerWidth` × `innerHeight` is 1024 × 768.
    - The `overflow` shorthand isn't expanded into `overflowX` / `overflowY`: set the longhands. `getComputedStyle` reflects inline longhands and `<style>` sheets.
    - `input.type` lower-cases the attribute and maps a missing or unknown `type` to `'text'`. `:disabled` matches disabled fields and descendants of `<fieldset disabled>`.
    - `document.hasFocus()` is true only while an element has focus, and is **false while `focusout` / `blur` listeners run** (jsdom clears the focused element first): tests that blur stub it with `vi.spyOn(document, 'hasFocus').mockReturnValue(true)`.
    - Focusing an input in a closed shadow root makes `document.activeElement` the host and retargets `focusin` / `relatedTarget` to the host; focus moves inside one shadow root send no event to `window`.
    - Under Vitest, `window === globalThis`, so `vi.spyOn(window, 'getComputedStyle')` catches bare calls. `vi.spyOn(el, 'prop', 'get')` stubs a getter on one element and `restoreMocks: true` removes it; `Object.defineProperty` stubs must be removed by hand (`Reflect.deleteProperty`).
  - `chrome.dom.openOrClosedShadowRoot` takes an `HTMLElement`. `chrome.tabs.Tab.id` is `id?: number | undefined`. WXT's `browser.scripting.executeScript` types `files` as `ScriptPublicPath[]`; `chrome.scripting.executeScript` takes `string[]`.
  - WXT 0.21: `defineContentScript` from `wxt/utils/define-content-script`, `defineBackground` from `wxt/utils/define-background`; `ctx.isValid` is a getter that checks `browser.runtime.id` (reading it when invalid fires `onInvalidated`); a new copy of the script dispatches a start event that invalidates older copies in the same world. `imports: false`, so every import is explicit; `@/` maps to `src/`. In `src/core`, imports are relative.
  - Commit titles (commitlint): `<Type>: <subject>`, 20–80 chars, subject not sentence/start/pascal/upper case (so it starts lowercase), imperative (no leading `…ed` word), no final period; `Why:` and `What:` sections; body lines ≤ 80 chars; no AI attribution.

## Tasks

### T1: Return consume or pass from the key listener — [x] done

- **Requirements:** R1.1, R1.2, R1.3 · **Design:** Key listener (interface exactly as in design.md, including the injected `isTrusted` predicate)
- **Depends on:** —
- **Files:** modify `src/core/key-listener.ts`, `src/core/key-listener.test.ts`, `src/entrypoints/content.ts`, `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface:**

  ```ts
  export type KeyResult = 'consumed' | 'passed';
  export interface KeyPress {
    readonly key: string;
    readonly repeat: boolean;
  }
  export function listenForKeys(
    target: EventTarget,
    onKey: (press: KeyPress) => KeyResult,
    isTrusted: (event: KeyboardEvent) => boolean,
  ): () => void;
  ```

- **Tests first:** in `src/core/key-listener.test.ts`. Rewrite the file's helpers and keep the existing cases, moved to the new signature:
  - Helpers: `press(target: EventTarget, type: 'keydown' | 'keyup', init: KeyboardEventInit): KeyboardEvent`. It creates `new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init })`, dispatches it and returns it. Use `onKey = vi.fn<(press: KeyPress) => KeyResult>(() => 'passed')` (or `'consumed'`), with `import type { KeyPress, KeyResult } from './key-listener'`. That import keeps both exports used for Knip until T8. `const trusted = (): boolean => true`.
  - Page listeners: `let page: AbortController`, created in `beforeEach` and aborted in `afterEach` (next to the existing `stop?.()`). Every page listener is `window.addEventListener(type, spy, { capture: true, signal: page.signal })`, added **after** `listenForKeys`.
  - Cases:
    - `reports each key press in Vim notation with its repeat flag`: `j`, then `{ key: 'd', ctrlKey: true, repeat: true }`. `onKey.mock.calls` is `[[{ key: 'j', repeat: false }], [{ key: '<C-d>', repeat: true }]]`.
    - `skips keys that have no notation, such as a lone Shift` (kept): `onKey` is not called, and the event is not `defaultPrevented`.
    - `sees keys before page listeners that stop propagation` (kept, R1.1): the expectation becomes `toHaveBeenCalledWith({ key: 'k', repeat: false })`.
    - `hides a consumed key from page listeners and prevents its default` (R1.2): `onKey` returns `'consumed'`. Pressing `{ key: 'j', code: 'KeyJ' }` leaves the page `keydown` spy uncalled, and the returned event has `defaultPrevented === true`.
    - `lets a passed key reach the page unchanged` (R1.3): the page `keydown` spy is called once, and `defaultPrevented === false`.
    - `swallows the keyup of a consumed key` (R1.2): after a consumed `keydown` `{ key: 'j', code: 'KeyJ' }`, the page `keyup` spy is not called for `keyup` `{ key: 'j', code: 'KeyJ' }`, and that `keyup` is `defaultPrevented`. A second `keyup` with the same code reaches the spy.
    - `lets the keyup of a passed key through` (R1.3): `onKey` returns `'passed'`. The page `keyup` spy is called, and the `keyup` is not `defaultPrevented`.
    - `lets the keyup through when a later keydown of the same key passed`: `onKey` returns `'consumed'` first, then `'passed'` (`mockReturnValueOnce`), for two `keydown`s with `code: 'KeyJ'` (the second with `repeat: true`). The following `keyup` with `code: 'KeyJ'` reaches the page spy.
    - `ignores untrusted key events`: build a `fakes = new WeakSet<Event>()` and pass `isTrusted: (event) => !fakes.has(event)`. Create a cancelable `keydown` `{ key: 'j', code: 'KeyJ' }`, add it to `fakes` and dispatch it. `onKey` is not called, the page spy is called, and the event is not `defaultPrevented`.
    - `does not let an untrusted keyup cancel the swallowing`: same `fakes` setup with `onKey` returning `'consumed'`. Press a trusted `keydown` `KeyJ`, dispatch an untrusted `keyup` `KeyJ` (the page spy sees it), then press a trusted `keyup` `KeyJ`. The page spy has exactly one call, for the untrusted one.
    - `stops reporting keys and swallowing keyups after the returned function is called`: `onKey` returns `'consumed'`. Press `keydown` `KeyJ`, call the stop function, then press `keyup` `KeyJ` and `keydown` `{ key: 'j' }`. The page spies see both, `onKey` was called only once, and neither event is `defaultPrevented`.
- **Steps:**
  1. Write the tests above. Run `npm test` and see the new ones fail (the old signature doesn't type-check against them either).
  2. In `src/core/key-listener.ts`, export `KeyResult` and `KeyPress` and change the signature as above. Inside `listenForKeys`, keep `const swallowed = new Set<string>()` of `event.code` values.
  3. The `keydown` handler, `(event: Event): void`, registered with `{ capture: true }`: return early unless `event instanceof KeyboardEvent` and `isTrusted(event)`. Compute `toKeyNotation(event)` and return if it is `undefined`. Call `onKey({ key, repeat: event.repeat })`. If the result is `'consumed'`, call `event.preventDefault()` and `event.stopImmediatePropagation()`, then `swallowed.add(event.code)`. Otherwise call `swallowed.delete(event.code)`.
  4. The `keyup` handler, `(event: Event): void`, also registered with `{ capture: true }`: return early unless `event instanceof KeyboardEvent` and `isTrusted(event)`. If `swallowed.delete(event.code)` returns true, call `event.preventDefault()` and `event.stopImmediatePropagation()`.
  5. The returned function removes both listeners (with `{ capture: true }`) and calls `swallowed.clear()`. Update the JSDoc: consumed keys are hidden from the page along with their keyup, passed keys and untrusted events are left alone, and the returned function removes both listeners.
  6. In `src/entrypoints/content.ts`, move to the new signature without changing behavior. `onKey` is ``(press) => { console.debug(`[vim] ${press.key}`); return 'passed'; }`` and keeps the existing eslint-disable comment. Pass `(event) => event.isTrusted` as the third argument and keep `ctx.onInvalidated(stop)`.
  7. In `tasks.md`, flip T1 to `[x] done`, set _Next task_ to T2, and add a dated _History_ line naming this commit's subject.
- **Done when:** the new tests pass; `npm run check` passes (Knip included, since `KeyPress` and `KeyResult` are imported by the test); `npm run test:e2e` still passes with `key-logging.spec.ts` unchanged.
- **Commit:** `Change: let the key listener consume keys and swallow their keyup`

### T2: Add the command registry — [x] done

- **Requirements:** R5.1, R5.2, R5.3 · **Design:** Command registry
- **Depends on:** —
- **Files:** create `src/core/commands/registry.ts`, `src/core/commands/registry.test.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface:** exactly the design's code block, all exported: `COMMAND_NAMES` (the eight scroll names, `as const`), `CommandName`, `CommandContext { readonly count: number | undefined; readonly repeat: boolean }`, `Command { name; description; acceptsCount; context: 'page' | 'background'; run(ctx): void }`, `CommandRegistry { get; run; list }`, `createCommandRegistry(commands: readonly Command[]): CommandRegistry`. Knip runs in this commit, so `registry.test.ts` must import every one of these names (it does, below). T3 imports `CommandName`, T10 `CommandRegistry`, T13 `Command`.
- **Tests first:** in `src/core/commands/registry.test.ts`, importing `{ COMMAND_NAMES, createCommandRegistry, type Command, type CommandContext, type CommandName, type CommandRegistry }` from `./registry`. Helper: `fakeCommand(name: CommandName, acceptsCount = true): { command: Command; run: Mock<(ctx: CommandContext) => void> }`, which creates `run = vi.fn<(ctx: CommandContext) => void>()` and returns it next to `command = { name, description, acceptsCount, context: 'page', run }` with `description` set to `Fake <name>` (a template literal). Assertions always use the returned `run` variable, never `command.run` (`@typescript-eslint/unbound-method`). Import `type Mock` from `vitest`. Second helper: `fakeRegistry(noCount: readonly CommandName[] = [])` builds one fake per `COMMAND_NAMES` entry (`acceptsCount` is false for names in `noCount`) and returns `{ registry, fakes }`, where `registry: CommandRegistry` is typed explicitly and `fakes` is a `Map<CommandName, ReturnType<typeof fakeCommand>>`. The tests that throw or reorder build their own `Command[]` arrays from `fakeCommand`.
  - `runs a command by name with the given context` — `registry.run('scrollDown', { count: undefined, repeat: false })` calls only the `scrollDown` fake's `run`, once, with that object. No other fake's `run` is called (R5.1).
  - `passes the count to commands that accept one` — `run('scrollDown', { count: 3, repeat: true })` → called with `{ count: 3, repeat: true }` (R5.2).
  - `passes an undefined count through to commands that accept one` — `{ count: undefined, repeat: false }` arrives unchanged.
  - `runs a command that does not accept a count once, with count undefined` — `scrollToTop` built with `acceptsCount: false`. `run('scrollToTop', { count: 5, repeat: true })` → `toHaveBeenCalledTimes(1)` and `toHaveBeenCalledWith({ count: undefined, repeat: true })` (R5.3).
  - `returns the registered command by name` — `registry.get('scrollUp')` is (`toBe`) the fake's `command` object, so its description, count flag and context are kept (R5.2).
  - `lists every command in COMMAND_NAMES order with its metadata` — fakes passed in reverse order. `registry.list().map((c) => c.name)` equals `[...COMMAND_NAMES]`, and every listed entry `toBe` its fake's `command` (R5.2).
  - `throws when a command name is registered twice` — all eight fakes plus a second `scrollDown` → `toThrow('Duplicate command: scrollDown')`.
  - `throws when a command in COMMAND_NAMES is missing` — all fakes except `scrollToBottom` → `toThrow('Missing command: scrollToBottom')`.
  - `reports a duplicate before a missing command` — two `scrollDown` fakes and nothing else → `toThrow('Duplicate command: scrollDown')`.
- **Steps:**
  1. Create `src/core/commands/` and write the tests. Run `npm test -- src/core/commands` and watch them fail (the module doesn't exist yet).
  2. In `registry.ts`, add the design's declarations verbatim, with the design's JSDoc on `CommandRegistry.run` and `createCommandRegistry`, plus one line on `context` (M1 runs every command locally; `'background'` is for M2's router).
  3. Add a module-private `indexByName(commands: readonly Command[]): ReadonlyMap<CommandName, Command>`. It loops over `commands` and throws an `Error` with the message `Duplicate command: <name>` if the name is already in the map, then loops over `COMMAND_NAMES` and throws an `Error` with the message `Missing command: <name>` for the first name the map lacks.
  4. `createCommandRegistry` calls `indexByName`, then returns `{ get, run, list }` built from closures. `get(name)` reads the map and throws an `Error` with the message `Unknown command: <name>` on `undefined`. Validation makes that branch unreachable, but it avoids a non-null assertion, so it has no test. `run(name, ctx)` gets the command, then calls `command.run(command.acceptsCount ? ctx : { ...ctx, count: undefined })`. `list()` returns `COMMAND_NAMES.map((name) => get(name))`. No module-level mutable state. Every function stays under complexity 10 and 60 lines.
  5. Run `npm run format`, then `npm run check`.
  6. In `tasks.md`, flip T2 to `[x] done`, set _Current status_ → _Next task_ to the next todo task, and add a dated _History_ line naming the commit subject.
- **Done when:** the nine tests pass; `npm run check` passes, including Knip with no unused exports from `registry.ts` and ESLint with no `unbound-method` reports in the test.
- **Commit:** `Add: command registry with named commands and metadata`

### T3: Add the keymap trie — [x] done

- **Requirements:** R4.1, R4.2 (lookup results the parser builds on), R5.4, R5.5 (clashing defaults fail the build and its test) · **Design:** Key parser and keymap trie (`KeymapEntry`, `KeymapTrie`, `TrieLookup`, `buildKeymapTrie`); Decisions ("Keymap keys as arrays", "Prefix clashes rejected at build time"); Error handling ("Bad default keymap")
- **Depends on:** T2 (`CommandName` in `src/core/commands/registry.ts`)
- **Files:** create `src/core/keymap-trie.ts`, `src/core/keymap-trie.test.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface:** exactly the design's types and function, all four exported:

  ```ts
  import type { CommandName } from './commands/registry';

  export interface KeymapEntry {
    readonly keys: readonly string[];
    readonly command: CommandName;
  }
  export interface KeymapTrie {
    lookup(keys: readonly string[]): TrieLookup;
  }
  export type TrieLookup =
    | { readonly type: 'complete'; readonly command: CommandName }
    | { readonly type: 'prefix' }
    | { readonly type: 'none' };
  /** Throws if a mapping is empty, duplicated, or a prefix of another mapping. */
  export function buildKeymapTrie(entries: readonly KeymapEntry[]): KeymapTrie;
  ```

  Knip: until T4/T5/T10 land, the test is the only importer, so it must import `buildKeymapTrie` and `type KeymapEntry`, `type KeymapTrie`, `type TrieLookup` (see the helper below).

- **Tests first:** in `src/core/keymap-trie.test.ts`, inside `describe('buildKeymapTrie', …)`, with a helper
  `function lookupIn(entries: readonly KeymapEntry[], keys: readonly string[]): TrieLookup { const trie: KeymapTrie = buildKeymapTrie(entries); return trie.lookup(keys); }`
  and entries written inline (e.g. `{ keys: ['j'], command: 'scrollDown' }`):
  - `finds a single-key mapping as complete`: `[j → scrollDown]`, `['j']` → `{ type: 'complete', command: 'scrollDown' }` (R4.1).
  - `reports the start of a multi-key mapping as a prefix`: `[gg → scrollToTop]`, `['g']` → `{ type: 'prefix' }` (R4.2).
  - `finds a multi-key mapping as complete`: same trie, `['g', 'g']` → complete `scrollToTop` (R4.1).
  - `keeps mappings that share a first key apart`: `[gg → scrollToTop, ge → scrollToBottom]`. `['g','g']` → `scrollToTop`, `['g','e']` → `scrollToBottom`, `['g']` → prefix.
  - `treats a key in angle-bracket notation as one key`: `[<C-d> → scrollHalfPageDown]`, `['<C-d>']` → complete; `['<']` → none.
  - `returns none for unmapped keys`: trie `[j → scrollDown, gg → scrollToTop]`. `['x']`, `['g', 'x']` and `['j', 'j']` each → `{ type: 'none' }`.
  - `throws on an empty mapping`: `[{ keys: [], command: 'scrollDown' }]` → throws `'Empty mapping for scrollDown'` (R5.5).
  - `throws on a duplicate mapping`: `[gg → scrollToTop, gg → scrollToBottom]` → throws `'Duplicate mapping: gg'` (R5.5).
  - `throws when an existing mapping is a prefix of a new one`: `[g → scrollToTop, gg → scrollToBottom]` → throws `'Mapping gg starts with mapping g'` (R5.5).
  - `throws when a new mapping is a prefix of an existing one`: `[gg → scrollToTop, g → scrollToBottom]` → throws `'Mapping g is the start of another mapping'` (R5.5).
    Use `expect(() => buildKeymapTrie(entries)).toThrow('<message>')` (substring match) for the four error tests.
- **Steps:**
  1. Write the tests; run `npm test -- keymap-trie` and see them fail (module missing).
  2. In `src/core/keymap-trie.ts`, define an unexported node type `interface TrieNode { command?: CommandName; readonly children: Map<string, TrieNode> }`. Never assign `undefined` to `command`; only set it. Define module constants `const NONE: TrieLookup = { type: 'none' }` and `const PREFIX: TrieLookup = { type: 'prefix' }`.
  3. Add an unexported `insertEntry(root: TrieNode, entry: KeymapEntry): void`, with `name = entry.keys.join('')`:
     1. If `entry.keys.length === 0`, throw ``new Error(`Empty mapping for ${entry.command}`)``.
     2. Walk `for (const [index, key] of entry.keys.entries())`. Before stepping, if the current node has a `command`, throw ``new Error(`Mapping ${name} starts with mapping ${entry.keys.slice(0, index).join('')}`)``. Then step to `node.children.get(key)`, creating and storing `{ children: new Map() }` when it is `undefined`.
     3. At the end node: if it has a `command`, throw ``new Error(`Duplicate mapping: ${name}`)``. If `children.size > 0`, throw ``new Error(`Mapping ${name} is the start of another mapping`)``. Otherwise set `node.command = entry.command`.
  4. `buildKeymapTrie(entries): KeymapTrie` (explicit return type) creates the root `{ children: new Map() }`, calls `insertEntry` for each entry in order, and returns `{ lookup }`. `lookup(keys)` walks from the root. A missing child returns `NONE`. At the end, it returns `{ type: 'complete', command: node.command }` if the node has a command, else `PREFIX`. `lookup([])` therefore returns `PREFIX`; the parser never calls it with `[]`, so it gets no test.
  5. Add JSDoc to `buildKeymapTrie` (the design's one-liner) and to `KeymapEntry.keys` (one key per element in Vim notation, e.g. `['g', 'g']`, `['<C-d>']`).
  6. In `tasks.md`, flip T3 to `[x] done`, set _Current status_ → _Next task_ to T4, and add a dated _History_ line naming this commit's subject, in the same commit.
- **Done when:** the 10 tests pass; `keymap-trie.ts` has 100% line and branch coverage in `npm run test:coverage`; `npm run check` passes (Knip reports no unused export from `keymap-trie.ts`).
- **Commit:** `Add: keymap trie that rejects clashing mappings`

### T4: Add the key parser — [x] done

- **Requirements:** R4.1, R4.2, R4.3, R4.4, R4.6, R4.9 · **Design:** Key parser and keymap trie (`ParserState`, `parseKey`, rules 1–3)
- **Depends on:** T2 (`CommandName`), T3 (`KeymapTrie`, `buildKeymapTrie`)
- **Files:** create `src/core/key-parser.ts`, `src/core/key-parser.test.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface:** exactly the design's `ParserState`, `EMPTY_PARSER_STATE` (`{ count: '', keys: [] }`), `ParseOutcome`, `MAX_COUNT` (`9999`) and `parseKey(state, key, trie)`, all exported. No other export. At this commit only the test imports them, so the test must import all five (Knip counts types). `key-parser.ts` imports `type CommandName` from `./commands/registry` and `type KeymapTrie` from `./keymap-trie`.
- **Behavior** (the design's rules, made exact):
  - A key is a **count digit** only when `state.keys` is empty and either `state.count === ''` and the key matches `/^[1-9]$/`, or `state.count !== ''` and the key matches `/^\d$/`. A count digit returns `{ state: { count: state.count + key, keys: [] }, outcome: { type: 'pending' } }`. It is consumed, and Normal mode (T10) starts the timeout for it. With keys pending, a digit is an ordinary key (`5g3`: the `3` breaks `g`).
  - Any other key is appended to `state.keys`, and `trie.lookup(keys)` decides the result:
    - `complete` returns `run` with `command` and `count: state.count === '' ? undefined : Math.min(Number(state.count), MAX_COUNT)`, and the state `EMPTY_PARSER_STATE`.
    - `prefix` returns `pending` with the state `{ count: state.count, keys }`.
    - `none` from the empty state (`count === ''` and no keys) returns `unmapped` with `EMPTY_PARSER_STATE`. `none` with anything pending returns `parseKey(EMPTY_PARSER_STATE, key, trie)`. That call recurses at most once, because from the empty state `none` is `unmapped`.
  - Never mutate `state`: always return new objects or `EMPTY_PARSER_STATE`.
- **Tests first:** in `src/core/key-parser.test.ts`, in `describe('parseKey')`, with `trie = buildKeymapTrie([...])` from `j → scrollDown`, `g g → scrollToTop`, `G → scrollToBottom`, `0 → scrollLeft` (the last one only proves that `0` can be a key). Add a helper `feed(keys: readonly string[], start: ParserState = EMPTY_PARSER_STATE): { state: ParserState; outcome: ParseOutcome }` that folds `parseKey` over the keys and returns the last result:
  - `runs a single-key mapping without a count`: `j` gives `{ type: 'run', command: 'scrollDown', count: undefined }`, and the state equals `EMPTY_PARSER_STATE` (R4.1).
  - `waits after the first key of a sequence`: `g` gives `pending`, with the state `{ count: '', keys: ['g'] }` (R4.2).
  - `runs a sequence when it completes and clears the state`: `g`,`g` runs `scrollToTop` with count `undefined`, and the state is empty (R4.1).
  - `waits after a count digit`: `5` gives `pending`, with the state `{ count: '5', keys: [] }` (R4.3).
  - `reads digits before a mapping as its count`: `1`,`2`,`j` runs `scrollDown` with count 12 (R4.3).
  - `extends a count with 0`: `1`,`0`,`j` gives count 10 (R4.3).
  - `treats 0 with no count pending as a key`: `0` runs `scrollLeft` with count `undefined` (R4.4).
  - `keeps a count across a pending sequence`: `5`,`g`,`g` runs `scrollToTop` with count 5, and the state is empty (R4.1, R4.3).
  - `caps the count at MAX_COUNT`: `1`,`2`,`3`,`4`,`5`,`j` runs with count `MAX_COUNT`, and `MAX_COUNT` is 9999 (R4.9).
  - `returns unmapped for an unmapped key from the empty state`: `x` gives `unmapped`, and the state is empty (R2.2 support).
  - `re-handles a key that breaks a sequence`: `g`,`j` runs `scrollDown` with count `undefined`, and the state is empty (R4.6).
  - `drops the count when a key breaks a sequence`: `5`,`g`,`j` runs `scrollDown` with count `undefined` (R4.6).
  - `re-handles a key that breaks a count-only state`: `5`,`x` gives `unmapped`, and the state is empty (R4.6).
  - `re-handles a digit that breaks a sequence as the start of a count`: after `g`,`3` the outcome is `pending` and the state is `{ count: '3', keys: [] }`. Then `j` runs `scrollDown` with count 3 (R4.3, R4.6).
  - `re-handles 0 that breaks a sequence as a key`: `g`,`0` runs `scrollLeft` with count `undefined` (R4.4, R4.6).
  - `leaves the given state unchanged`: call `parseKey` on a state object `{ count: '5', keys: ['g'] }` with `g`, then with `x`, and expect the object to still deep-equal `{ count: '5', keys: ['g'] }` (design: pure function).
- **Steps:**
  1. Write the tests and run `npx vitest run src/core/key-parser.test.ts` to see them fail.
  2. In `key-parser.ts`, add the private helpers `isCountDigit(state, key): boolean`, `isEmpty(state): boolean` and `toCount(count: string): number | undefined`. They keep `parseKey` under complexity 10.
  3. Implement `parseKey` as in _Behavior_. It returns early for a count digit, then uses an exhaustive `switch (lookup.type)` with a `return` in every case (`switch-exhaustiveness-check`, no `default`). Give it the explicit return type from the design (`explicit-module-boundary-types`). Add a JSDoc line on `parseKey` that summarizes the rules and says that discarded keys are never replayed.
  4. In `tasks.md`, flip T4 to `[x] done`, set _Current status_ → _Next task_ to T5, and add a dated _History_ line naming this commit's subject, in the same commit.
- **Done when:** the 16 tests pass; `key-parser.ts` has 100% line and branch coverage; `npm run check` passes (including Knip with no unused exports).
- **Commit:** `Add: key parser with counts, sequences and re-handling`

### T5: Add the default keymap — [x] done

- **Requirements:** R5.4, R5.5 (the trie half; the registry half is T13), R6.1–R6.6 (key bindings only), NFR3.2 · **Design:** Default keymap
- **Depends on:** T3 (`KeymapEntry`, `buildKeymapTrie`; `CommandName` comes from T2 through it)
- **Files:** create `src/settings/defaults.ts`, `src/settings/defaults.test.ts`; modify `PLAN.md`, `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface:** in `src/settings/defaults.ts`, with `import type { KeymapEntry } from '@/core/keymap-trie';`:

  ```ts
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
  ```

  Nothing else is exported. `KEY_TIMEOUT_MS` (T10) and `SCROLL_STEP_Y` / `SCROLL_STEP_X` (T13) are added by the tasks that first use them, so Knip never sees an unused export. A misspelled command name fails `npm run check`'s typecheck through the `CommandName` union (R5.5).

- **Tests first:** in `src/settings/defaults.test.ts`, one `describe('DEFAULT_KEYMAP', ...)` block (T13 adds a sibling block later). It imports `DEFAULT_KEYMAP` from `./defaults`, `buildKeymapTrie` from `@/core/keymap-trie`, and `type KeymapEntry` (type-only import, `consistent-type-imports`). It declares an `EXPECTED: readonly KeymapEntry[]` table with the 10 entries above:
  - `builds a keymap trie without clashes` — `expect(() => buildKeymapTrie(DEFAULT_KEYMAP)).not.toThrow()` (R5.5: no duplicate or prefix clash).
  - `maps $keys to $command` — `it.each(EXPECTED)`: `buildKeymapTrie(DEFAULT_KEYMAP).lookup(keys)` equals `{ type: 'complete', command }` (R5.4, R6.1–R6.6 bindings, including the `<C-d>` / `<C-u>` aliases).
  - `has no mappings beyond the M1 keys` — `expect(DEFAULT_KEYMAP).toHaveLength(EXPECTED.length)`. The trie already rejects duplicates, so this check plus the lookups fix the exact set (R5.4).
  - `uses no default key with Cmd` — no key in any entry's `keys` matches `/^<(?:[CAS]-)*D-/`, the `D-` (Cmd) modifier in `toKeyNotation`'s `C-` `A-` `S-` `D-` prefix order (NFR3.2).
- **Steps:**
  1. Write the tests; run `npm test` and see them fail (the `./defaults` module doesn't exist yet).
  2. Create `src/settings/defaults.ts` exactly as in _Interface_, entries in that order, with the JSDoc line shown.
  3. In `PLAN.md`, under `### M1 — Normal mode and scrolling`, replace the line `` - [ ] `j` `k` `h` `l` `d` `u` `gg` `G` `` with `` - [ ] `j` `k` `h` `l` `d` `u` `<C-d>` `<C-u>` `gg` `G` `` (user agreement). Leave the box unticked; T19 ticks it.
  4. In `tasks.md`, flip T5 to `[x] done`, set _Current status_ → _Next task_ to T6, and add a dated _History_ line naming this commit's subject, in the same commit.
- **Done when:** the four tests pass; `PLAN.md`'s M1 key line lists `<C-d>` `<C-u>`; `npm run check` passes (typecheck, lint, Prettier including `PLAN.md`, coverage, Knip).
- **Commit:** `Add: default keymap for the M1 scroll commands`

### T6: Detect editable elements through shadow roots — [x] done

- **Requirements:** R3.1, R3.2, R3.6 · **Design:** Editable detection and focus watcher (`ShadowRootOf`, `isEditable`, `deepActiveElement`, input allow-list, `contenteditable`, `designMode`)
- **Depends on:** —
- **Files:** create `src/core/editable.ts`, `src/core/editable.test.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface** (exactly the design's; all three are imported by the test, so Knip passes before T7 exists):

  ```ts
  /** Reaches open and closed shadow roots: chrome.dom.openOrClosedShadowRoot in the extension. */
  export type ShadowRootOf = (host: Element) => ShadowRoot | null;
  /** text inputs, textarea, select, contenteditable (not "false"), anything when designMode is "on". */
  export function isEditable(element: Element | null): boolean;
  /** document.activeElement, followed down through open and closed shadow roots. */
  export function deepActiveElement(doc: Document, shadowRootOf: ShadowRootOf): Element | null;
  ```

- **Tests first:** in `src/core/editable.test.ts`. Fixtures are built with `document.createElement` and appended to `document.body`. `afterEach` calls `document.body.replaceChildren()` and `Reflect.deleteProperty(document, 'designMode')`. The file does `import type { ShadowRootOf } from './editable'` and declares `const openRoots: ShadowRootOf = (host) => host.shadowRoot;`. Closed-root tests build `const closedRoots = new Map<Element, ShadowRoot>()` and `const lookup: ShadowRootOf = (host) => closedRoots.get(host) ?? null;`.
  - `isEditable`:
    - `treats text-accepting inputs as editable`: `it.each` over `text`, `search`, `email`, `url`, `tel`, `password`, `number`, `date`, `datetime-local`, `month`, `week`, `time`, plus an input with no `type` attribute and one with `type="FOO"` (unknown, so treated as text) (R3.1).
    - `treats inputs that don't take text as not editable`: `it.each` over `checkbox`, `radio`, `button`, `range`, `color`, `file`, `submit`, `reset`, `image`, `hidden`, plus `type="CHECKBOX"` (R3.6).
    - `treats textarea and select as editable` (R3.1).
    - `treats a disabled field as not editable, and a readonly one as editable`: disabled `input`, `textarea` and `select` give false; an input inside `<fieldset disabled>` gives false; a `readonly` input gives true.
    - `treats contenteditable elements and their descendants as editable`: `it.each` over the attribute values `''`, `'true'`, `'plaintext-only'`; a `span` inside a `contenteditable=""` div also gives true (R3.1).
    - `treats contenteditable="false" as not editable`: a `contenteditable="false"` div, a `contenteditable="FALSE"` div, and a `span` inside a `contenteditable="false"` div that is itself inside a `contenteditable=""` div all give false.
    - `treats any element as editable when designMode is on`: after `Object.defineProperty(document, 'designMode', { value: 'on', configurable: true })`, a plain `div` and `document.body` give true (R3.2).
    - `returns false for null and plain elements`: `null`, a `div`, `document.body` and a `button` element.
  - `deepActiveElement`:
    - `returns the document's active element when it has no shadow root`: a focused input returns that input; with nothing focused it returns `document.body`.
    - `follows the active element into an open shadow root`: a host with `attachShadow({ mode: 'open' })` holding an input; after `input.focus()`, `deepActiveElement(document, openRoots)` is the input (R3.2).
    - `follows the active element into a closed shadow root`: a host with `attachShadow({ mode: 'closed' })` (the root is stored in `closedRoots`) holding an input. After `input.focus()`, `deepActiveElement(document, lookup)` is the input, and `deepActiveElement(document, openRoots)` is the host. The second check shows the lookup is what reaches the closed root (R3.2).
    - `follows nested shadow roots`: an open root that contains a host with a closed root that contains a focused input. With a lookup that tries `host.shadowRoot` and then `closedRoots`, the result is the input.
    - `returns null when the document has no active element`: `deepActiveElement(document.implementation.createDocument(null, null), openRoots)` is `null`.
    - `finds a field focused inside a closed shadow root as editable`: `isEditable(deepActiveElement(document, lookup))` is true (R3.2).
- **Steps:**
  1. Write the tests and run `npm test`. They fail because `./editable` doesn't exist.
  2. In `src/core/editable.ts`, add a module constant that isn't exported: `const TEXT_INPUT_TYPES: ReadonlySet<string> = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'datetime-local', 'month', 'week', 'time'])`. The `.type` property lower-cases the attribute and maps a missing or unknown `type` to `'text'`, so this allow-list is the design's rule as written.
  3. Add two helpers that aren't exported:
     - `isTextField(element: Element): boolean`: if `element instanceof HTMLInputElement`, return `TEXT_INPUT_TYPES.has(element.type)`; otherwise return `element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement`.
     - `inContentEditable(element: Element): boolean`: `const host = element.closest('[contenteditable]')`, then return `host !== null && host.getAttribute('contenteditable')?.toLowerCase() !== 'false'`. Use `closest` because jsdom has no `isContentEditable`.
  4. `isEditable(element)`: `null` returns false. `element.ownerDocument.designMode === 'on'` returns true. `element.matches(':disabled')` returns false. Otherwise return `isTextField(element) || inContentEditable(element)`. Add the design's JSDoc.
  5. `deepActiveElement(doc, shadowRootOf)`: `let current = doc.activeElement; while (current !== null) { const inner = shadowRootOf(current)?.activeElement ?? null; if (inner === null) return current; current = inner; } return null;`. Avoid a constant loop condition, because `no-unnecessary-condition` flags it. Add the design's JSDoc.
  6. Run `npm run check`.
  7. In `tasks.md`, flip T6 to `[x] done`, set _Current status_ → _Next task_ to T7, and add a dated _History_ line naming this commit's subject, in the same commit.
- **Done when:** the new tests pass. `editable.ts` has no exports beyond the three in the interface. `npm run check` passes, including Knip with `ShadowRootOf` imported only by the test.
- **Commit:** `Add: editable element detection through shadow roots`

### T7: Watch focus for editable elements — [x] done

- **Requirements:** R3.1, R3.2, R3.4, R3.5, R3.6 · **Design:** Editable detection and focus watcher
- **Depends on:** T6 (`isEditable`, `deepActiveElement`, `ShadowRootOf`)
- **Files:** create `src/core/focus-watcher.ts`, `src/core/focus-watcher.test.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface:** exactly the design's signature, the file's only export:

  ```ts
  export function watchFocus(
    win: Window,
    shadowRootOf: ShadowRootOf,
    onChange: (editableFocused: boolean) => void,
  ): () => void;
  ```

  `onChange` runs on every relevant focus event, with no de-duplication: the same value can be reported twice in a row. The controller (T14) maps it to `enter(...)`, which is a no-op for the current mode (T8).

- **Tests first:** in `src/core/focus-watcher.test.ts`.
  - Setup: `onChange = vi.fn<(editableFocused: boolean) => void>()`. Add a helper `function windowHasFocus(value: boolean): void { vi.spyOn(document, 'hasFocus').mockReturnValue(value); }` and call `windowHasFocus(true)` in `beforeEach`. jsdom clears its focused element before firing `focusout`, so its real `hasFocus()` is always `false` inside `focusout`. Don't use `vi.mocked(document.hasFocus)`, which `unbound-method` rejects. A closed-root lookup: `const closedRoots = new Map<Element, ShadowRoot>()` and `const shadowRootOf: ShadowRootOf = (host) => closedRoots.get(host) ?? host.shadowRoot`. `afterEach` calls the returned stop function (if set), then `closedRoots.clear()` and `document.body.replaceChildren()`. Fixtures are appended to `document.body` and focused with real `focus()` / `blur()`. Unless a test says otherwise, `onChange.mockClear()` runs after the initial focus that sets up the scenario.
  - `reports true when a text input gains focus`: focus an `<input>` with no type → `onChange` calls are `[[true]]` (R3.1).
  - `reports false when a checkbox gains focus`: `<input type="checkbox">` → `[[false]]` (R3.6).
  - `reports true when an input inside a closed shadow root gains focus`: a `div` host with `attachShadow({ mode: 'closed' })` and the root stored in `closedRoots`, with an `<input>` inside. Focus it → `document.activeElement` is the host (proves retargeting), and the calls are `[[true]]` (R3.2).
  - `reports false when an editable element loses focus to nothing`: focus an input, clear, `blur()` → `[[false]]` (R3.4).
  - `stays silent on focusout when focus moves to another editable element`: focus an input, clear, focus a `<textarea>` → `[[true]]`, only the `focusin` report and no `false` (R3.5).
  - `reports false when focus moves from a text field to a checkbox`: focus an input, clear, focus a checkbox → never called with `true`, last called with `false` (R3.4, R3.6).
  - `ends in true when focus moves from a text field into a closed shadow root input`: focus a light-DOM input, clear, focus the closed-root input → last called with `true`. A `false` before it is allowed: `relatedTarget` is retargeted to the host (R3.2, R3.5).
  - `does nothing when the window loses focus`: focus an input, clear, `windowHasFocus(false)`, `blur()` → not called.
  - `stops reporting after the returned function is called`: call the stop function, then focus an input and `blur()` it → not called.
- **Steps:**
  1. Write the tests; run `npm test` and see them fail (the module doesn't exist).
  2. In `src/core/focus-watcher.ts`, import `deepActiveElement` and `isEditable` from `./editable` and `type ShadowRootOf` from `./editable`. Inside `watchFocus`, use `const doc = win.document` and two arrow handlers with explicit return types:
     - `onFocusIn = (): void => { onChange(isEditable(deepActiveElement(doc, shadowRootOf))); }`. Ignore the event target, because a closed shadow root retargets it to the host.
     - `onFocusOut = (event: FocusEvent): void => { … }`: return if `event.relatedTarget instanceof Element && isEditable(event.relatedTarget)` (focus is moving to an editable element, R3.5); return if `!doc.hasFocus()` (the window is losing focus; the next `focusin` decides); otherwise `onChange(false)`.
  3. Register both with `win.addEventListener('focusin' | 'focusout', handler, { capture: true })`. Return `() => { … }`, which removes both with the same `{ capture: true }`.
  4. Add a JSDoc to `watchFocus`. It says that `onChange` may repeat a value, and that focus moving between two elements inside the same shadow root sends no event to `window`, so the modes' per-key `editableFocused()` check (T9, T10) covers that case.
  5. In `tasks.md`, flip T7 to `[x] done`, set _Current status_ → _Next task_ to T8, and add a dated _History_ line naming this commit's subject, in the same commit.
- **Done when:** the new tests pass; `focus-watcher.ts` has 100% line and branch coverage; `npm run check` passes.
- **Commit:** `Add: focus watcher that reports editable focus changes`

### T8: Add the mode machine — [x] done

- **Requirements:** R2.1 (initial mode), R3.7 (sticky flag), R4.10 (exit hook) · **Design:** Mode machine and modes
- **Depends on:** T1 (`KeyPress`, `KeyResult` in `src/core/key-listener.ts`)
- **Files:** create `src/core/mode-machine.ts`, `src/core/mode-machine.test.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface:** exactly the design's types, all exported. Every one of them is imported by the test file (Knip runs with `ignoreExportsUsedInFile: false`, so an export only used in its own file fails `npm run knip`):

  ```ts
  import type { KeyPress, KeyResult } from './key-listener';

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
    enter(name: ModeName, options?: EnterOptions): void;
    handleKey(press: KeyPress): KeyResult;
  }
  export function createModeMachine(modes: readonly Mode[], initial: ModeName): ModeMachine;
  ```

  Semantics (the tests below pin each one):
  - `createModeMachine` throws `Error('Duplicate mode: <name>')` if two modes share a name, and `Error('Missing mode: <name>')` if a name in `MODE_NAMES` has no mode. It starts in `initial` with `isSticky === false` and does **not** call the initial mode's `onEnter`. The controller picks the initial mode (R2.1, R3.3), and no M1 mode needs setup at start.
  - `enter(name, options)`: `sticky = options?.sticky ?? false`. If `name` is the current mode, it only sets `isSticky = sticky` and calls no hooks. This covers both the design's no-op (same stickiness) and a change of stickiness, which no M1 flow triggers. Otherwise it calls the old mode's `onExit?.()` while `current` still names the old mode, then sets `current` and `isSticky`, then calls the new mode's `onEnter?.({ sticky })`. The options passed to `onEnter` are always normalized to `{ sticky: boolean }`. `sticky` is stored for whatever mode is entered; M1 only passes it with `insert`.
  - `handleKey(press)` returns the current mode's `handleKey(press)`, looking up the current mode when it is called. A mode may call `enter` and then `handleKey` from inside its own `handleKey` (T9's hand-over to Normal mode).

- **Tests first:** in `src/core/mode-machine.test.ts`. Imports: `MODE_NAMES`, `createModeMachine` and the types `EnterOptions`, `Mode`, `ModeMachine`, `ModeName` from `./mode-machine`, and the types `KeyPress`, `KeyResult` from `./key-listener`. Helpers (assertions use the returned spies, never `mode.onExit` on a `Mode`-typed object, which `@typescript-eslint/unbound-method` rejects):

  ```ts
  function fakeMode(name: ModeName, result: KeyResult = 'passed') {
    const handleKey = vi.fn<(press: KeyPress) => KeyResult>(() => result);
    const onEnter = vi.fn<(options: EnterOptions) => void>();
    const onExit = vi.fn<() => void>();
    const mode = { name, handleKey, onEnter, onExit } satisfies Mode;
    return { mode, handleKey, onEnter, onExit };
  }
  type FakeMode = ReturnType<typeof fakeMode>;
  function setup(initial: ModeName = 'normal'): {
    machine: ModeMachine;
    normal: FakeMode;
    insert: FakeMode;
  } {
    const normal = fakeMode('normal', 'consumed');
    const insert = fakeMode('insert', 'passed');
    const machine = createModeMachine([normal.mode, insert.mode], initial);
    return { machine, normal, insert };
  }
  const J: KeyPress = { key: 'j', repeat: false };
  ```

  - `starts in the initial mode without calling its onEnter` — `setup('insert')`: `current === 'insert'`, `isSticky === false`, no `onEnter`/`onExit` calls on either fake (R2.1).
  - `sends keys to the current mode and returns its result` — in `normal`, `handleKey(J)` returns `'consumed'` and `normal.handleKey` got `J`. After `enter('insert')` it returns `'passed'` and `insert.handleKey` got `J`.
  - `calls onExit on the old mode and onEnter on the new one` — `enter('insert')`: `normal.onExit` called once, `insert.onEnter` called once with `{ sticky: false }`, `current === 'insert'` (R4.10 relies on `onExit`).
  - `calls onExit before the switch and onEnter after it` — the hooks push `` `exit:${machine.current}` `` and `` `enter:${machine.current}:${String(machine.isSticky)}` `` into a log. `enter('insert', { sticky: true })` produces `['exit:normal', 'enter:insert:true']`.
  - `does nothing when entering the current mode with the same stickiness` — `enter('normal')` from `normal`: no hook calls, `current === 'normal'`, `isSticky === false`.
  - `marks Insert mode sticky when entered with sticky: true` — `enter('insert', { sticky: true })`: `isSticky === true`, `insert.onEnter` got `{ sticky: true }` (R3.7).
  - `clears the sticky flag when entering another mode` — sticky `insert`, then `enter('normal')`: `isSticky === false`, `current === 'normal'` (R3.7).
  - `updates only the sticky flag when re-entering the current mode with different stickiness` — `enter('insert')`, clear the spies (`mockClear`), then `enter('insert', { sticky: true })`: `isSticky === true`, no hook calls on either fake.
  - `lets a mode switch modes and hand the key on during handleKey` — `setup('insert')`, then `insert.handleKey.mockImplementation((press) => { machine.enter('normal'); return machine.handleKey(press); })`. `machine.handleKey(J)` returns `'consumed'`, `normal.handleKey` got `J`, `current === 'normal'` (supports T9).
  - `registers one mode per name in MODE_NAMES` — `createModeMachine(MODE_NAMES.map((name) => fakeMode(name).mode), 'normal')` doesn't throw.
  - `throws when a mode is registered twice` — normal, normal, insert → throws `'Duplicate mode: normal'`.
  - `throws when a mode in MODE_NAMES is missing` — only normal → throws `'Missing mode: insert'`.

- **Steps:**
  1. Write the tests; run `npm test -- src/core/mode-machine.test.ts` and see them fail.
  2. In `src/core/mode-machine.ts`, add the exports above. Add a short JSDoc on `createModeMachine` (State pattern; hooks run only on a real mode change).
  3. Add two unexported helpers. `modeNamed(byName: ReadonlyMap<ModeName, Mode>, name: ModeName): Mode` returns `byName.get(name)` or throws ``Error(`Missing mode: ${name}`)``. `indexModes(modes: readonly Mode[]): ReadonlyMap<ModeName, Mode>` builds a `Map`, throws ``Error(`Duplicate mode: ${name}`)`` on a repeated name, then calls `modeNamed` for every name in `MODE_NAMES` to check none is missing. Using `modeNamed` again in `enter` avoids a non-null assertion, and it adds no unreachable branch: the missing-mode test covers its only `throw`.
  4. `createModeMachine`: `const byName = indexModes(modes)`; `let active = modeNamed(byName, initial)`; `let sticky = false`. Return an object literal typed `ModeMachine` with getters `current` (`active.name`) and `isSticky` (`sticky`), and `enter` and `handleKey` written as the semantics above say. Call hooks as `active.onExit?.()` and `next.onEnter?.({ sticky: nextSticky })`; never pass them as unbound references.
  5. Run `npm run check`.
  6. In `tasks.md`, flip T8 to `[x] done`, set _Current status_ → _Next task_ to T9, and add a dated _History_ line naming this commit's subject, in the same commit.
- **Done when:** the 12 tests pass; `npm run knip` reports nothing for `src/core/mode-machine.ts` (every export is imported by the test); `npm run check` passes.
- **Commit:** `Add: mode machine with enter and exit hooks`

### T9: Add Insert mode — [x] done

- **Requirements:** R2.3, R2.5, R2.6, R3.7 (sticky Insert mode ignores a lost focus) · **Design:** Mode machine and modes (Insert mode); Editable detection and focus watcher (per-key `editableFocused()` check)
- **Depends on:** T1 (`KeyPress`, `KeyResult`), T8 (`Mode`, `ModeMachine`)
- **Files:** create `src/core/modes/insert.ts`, `src/core/modes/insert.test.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface:**

  ```ts
  // src/core/modes/insert.ts — imports with relative paths:
  // `import type { KeyPress, KeyResult } from '../key-listener';`
  // `import type { Mode, ModeMachine } from '../mode-machine';`
  interface InsertModeDeps {
    readonly machine: Pick<ModeMachine, 'enter' | 'handleKey' | 'isSticky'>;
    /** Removes focus from the focused editable element (R2.6). */
    readonly blurActive: () => void;
    /** True while an editable element has focus. */
    readonly editableFocused: () => boolean;
  }
  export function createInsertMode(deps: InsertModeDeps): Mode;
  ```

  `InsertModeDeps` is not exported (Knip). The returned mode has `name: 'insert'` and `handleKey` only, with no `onEnter`/`onExit`. A module constant `LEAVE_KEYS: ReadonlySet<string> = new Set(['<Esc>', '<C-[>'])` (not exported) holds the leave keys.

- **Tests first:** in `src/core/modes/insert.test.ts`. A `setup({ sticky = false, focused = true } = {})` helper creates `enter = vi.fn<ModeMachine['enter']>()`, `handleKey = vi.fn<ModeMachine['handleKey']>(() => 'consumed')` and `blurActive = vi.fn<() => void>()`, and builds the mode with `machine: { enter, handleKey, isSticky: sticky }` and `editableFocused: () => focused`. It returns `{ mode, enter, handleKey, blurActive }`. Assertions always use these variables, never `machine.enter` (`unbound-method`). A `press(key, repeat = false): KeyPress` helper builds key presses.
  - `is named insert` — `mode.name === 'insert'`.
  - `lets every other key reach the page` — `it.each(['j', '<C-d>', 'G', 'i'])`, with a field focused and not sticky: returns `'passed'`; `enter`, `handleKey` and `blurActive` are not called (R2.3).
  - `returns to Normal mode on <Esc> and consumes it` — returns `'consumed'`; `enter` was called once, with exactly `('normal')` (R2.5).
  - `returns to Normal mode on <C-[> and consumes it` — same as above (R2.5).
  - `blurs the focused field before returning to Normal mode` — `focused: true`, `<Esc>`: `blurActive` called once, and its `mock.invocationCallOrder[0]` is lower than `enter`'s (R2.6).
  - `does not blur when no field has focus` — `sticky: true, focused: false`, `<Esc>`: `blurActive` not called; `enter('normal')` called; returns `'consumed'` (R2.5, R2.6).
  - `leaves sticky Insert mode on <Esc> while a field has focus` — `sticky: true, focused: true`, `<C-[>`: `blurActive` called; `enter('normal')` called; `'consumed'` (R2.5, R2.6, R3.7).
  - `consumes <Esc> even after the focused field is gone` — `sticky: false, focused: false`, `<Esc>`: returns `'consumed'`; `enter('normal')` called once; `handleKey` and `blurActive` not called (R2.5 takes precedence over the hand-over).
  - `drops to Normal mode and hands the key over when no field has focus any more` — `sticky: false, focused: false`, `press('j', true)`: `enter` called once with exactly `('normal')`; `handleKey` called once with the same press object (`repeat: true` kept); `enter`'s `mock.invocationCallOrder[0]` is lower than `handleKey`'s; the result is `'consumed'`, the fake `handleKey`'s return value.
  - `stays in sticky Insert mode when no field has focus` — `sticky: true, focused: false`, `j`: returns `'passed'`; `enter` and `handleKey` not called (R3.7).
- **Steps:**
  1. Write the tests above; run `npm test` and see them fail (the module doesn't exist).
  2. Create `src/core/modes/insert.ts` with the interface above and a short JSDoc on `createInsertMode`. `handleKey(press)` runs these branches in order:
     1. `LEAVE_KEYS.has(press.key)`: if `deps.editableFocused()`, call `deps.blurActive()`. Then call `deps.machine.enter('normal')` with no second argument and return `'consumed'`.
     2. `!deps.machine.isSticky && !deps.editableFocused()`: call `deps.machine.enter('normal')`, then `return deps.machine.handleKey(press)`. Call `enter` first, or the machine would send the key back to Insert mode.
     3. Otherwise return `'passed'`.

     Call the machine's methods through `deps.machine.…` and never destructure them (`unbound-method`).

  3. In `tasks.md`, flip T9 to `[x] done`, set _Current status_ → _Next task_ to T10, and add a dated _History_ line naming this commit's subject, in the same commit.
- **Done when:** the new tests pass; `src/core/modes/insert.ts` has 100% line and branch coverage in `npm run test:coverage`; `npm run check` passes.
- **Commit:** `Add: insert mode that leaves on Esc and Ctrl-[`

### T10: Add Normal mode — [x] done

- **Requirements:** R2.2, R2.4, R4.2 (consume wiring), R4.5, R4.7, R4.8, R4.10 · **Design:** Mode machine and modes (Normal mode), Editable detection and focus watcher (per-key `editableFocused()` check), Default keymap (`KEY_TIMEOUT_MS`)
- **Depends on:** T1 (`KeyPress`, `KeyResult`), T2 (`CommandRegistry`), T3 (`KeymapTrie`, `buildKeymapTrie`), T4 (`parseKey`, `EMPTY_PARSER_STATE`, `ParserState`), T5 (creates `src/settings/defaults.ts`), T8 (`Mode`, `ModeMachine`)
- **Files:** create `src/core/modes/normal.ts`, `src/core/modes/normal.test.ts`; modify `src/settings/defaults.ts` (add `export const KEY_TIMEOUT_MS = 1000;` with a one-line comment: the pending-key timeout, R4.5), `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface** (as in the design; `Timer` is exported because `normal.test.ts` and T14 import it):

  ```ts
  export interface Timer {
    set(callback: () => void, ms: number): number;
    clear(id: number): void;
  }
  // Not exported (Knip): T14 gets this type by inference.
  interface NormalMode extends Mode {
    onExit(): void; // required here, so callers need no `?.`
    /** Drops pending keys and clears the timeout timer. */
    reset(): void;
  }
  // Not exported.
  interface NormalModeDeps {
    readonly machine: Pick<ModeMachine, 'enter'>;
    readonly trie: KeymapTrie;
    readonly registry: Pick<CommandRegistry, 'run'>;
    readonly timer: Timer;
    readonly editableFocused: () => boolean;
  }
  export function createNormalMode(deps: NormalModeDeps): NormalMode;
  ```

  Imports in `normal.ts` are relative, like the rest of `src/core`: `../key-listener`, `../key-parser`, `../keymap-trie`, `../mode-machine`, `../commands/registry` (all type-only except `parseKey` and `EMPTY_PARSER_STATE`), and `KEY_TIMEOUT_MS` from `../../settings/defaults`.

- **Tests first:** in `src/core/modes/normal.test.ts`. Use a module-level `setup(options?: { editableFocused?: boolean })` that builds new fakes for each test and returns `{ normal, run, enter, set, clear, fire }`:
  - trie: `buildKeymapTrie([{ keys: ['j'], command: 'scrollDown' }, { keys: ['g', 'g'], command: 'scrollToTop' }])`;
  - `run = vi.fn<CommandRegistry['run']>()`, registry `{ run }`; `enter = vi.fn<ModeMachine['enter']>()`, machine `{ enter }`;
  - fake timer: `set = vi.fn<Timer['set']>((callback) => { … })` stores the callback in a `Map<number, () => void>` under ids 1, 2, 3, … and returns the id; `clear = vi.fn<Timer['clear']>((id) => { map.delete(id); })`; `fire(id)` calls the stored callback and deletes it;
  - `editableFocused: () => options?.editableFocused ?? false`;
  - `press(key, repeat = false)` returns `{ key, repeat }`.

  Assert on the `run`, `enter`, `set` and `clear` consts, never on `registry.run` or `machine.enter` (`unbound-method`). Write void arrows with braces (`no-confusing-void-expression`).

  - `is named normal` — `normal.name === 'normal'`.
  - `runs a mapped command and consumes the key` — `j` → `'consumed'`; `run` called once with `('scrollDown', { count: undefined, repeat: false })` (R2.2).
  - `passes the key repeat flag to the command` — `j` with `repeat: true` → `run` called with `{ count: undefined, repeat: true }`.
  - `passes a count to the command` — `3` → `'consumed'`, then `j` → `run('scrollDown', { count: 3, repeat: false })` (R2.2, R4.3 wiring).
  - `lets an unmapped key reach the page` — `x` → `'passed'`; `run` and `set` not called (R2.2).
  - `consumes the first key of a sequence and waits` — `g` → `'consumed'`; `run` not called; `set` called once with `(expect.any(Function), 1000)` (R4.2, R4.5).
  - `discards pending keys after 1000 ms` — `g`, `fire(1)`, then `g` → `'consumed'` and `run` not called (the first `g` was dropped, so this `g` starts a new sequence) (R4.5).
  - `restarts the timeout on each pending key` — `5` then `g`: `clear` called with 1, `set` called twice, each time with 1000; `fire(2)`, then `g` → `run` not called (R4.5).
  - `clears the timeout when a command runs` — `g`, `g`: `run('scrollToTop', { count: undefined, repeat: false })`, `clear` called with 1, `set` called only once.
  - `clears the timeout when a key breaks the sequence and is unmapped` — `g`, `x` → `'passed'`; `clear` called with 1; then `g` → `run` not called (R4.6 wiring).
  - `enters sticky Insert mode on i and consumes it` — `i` → `'consumed'`; `enter` called once with `('insert', { sticky: true })`; `run` not called (R2.4).
  - `drops pending keys before entering Insert mode on i` — `g`, `i`: `clear` called with 1; then `g` → `'consumed'` and `run` not called (the `enter` fake does nothing, so this checks Normal mode's own reset).
  - `discards pending keys on <Esc> and consumes it` — `g`, `<Esc>` → `'consumed'`, `clear` called with 1, then `g` → `run` not called; and `3`, `<Esc>`, `j` → `run('scrollDown', { count: undefined, repeat: false })` (R4.7).
  - `lets <Esc> reach the page when nothing is pending` — `<Esc>` → `'passed'`; `run`, `set`, `clear` not called (R4.8).
  - `drops pending keys when the mode exits` — `g`, `normal.onExit()`: `clear` called with 1; then `g` → `run` not called (R4.10).
  - `drops pending keys on reset()` — `5`, `normal.reset()`: `clear` called with 1; then `j` → `run` with `count: undefined`.
  - `switches to Insert mode and passes the key when an editable element has focus` — `setup({ editableFocused: true })`; `j` → `'passed'`; `enter` called once with exactly `('insert')` (no options, so not sticky); `run` not called.

- **Steps:**
  1. Write the tests; run `npm test` and see them fail.
  2. Add `KEY_TIMEOUT_MS` to `src/settings/defaults.ts`.
  3. In `createNormalMode`, keep `let state: ParserState = EMPTY_PARSER_STATE` and `let timerId: number | undefined` in the closure.
     - `clearTimer()`: if `timerId !== undefined`, call `deps.timer.clear(timerId)` and set `timerId = undefined`.
     - `reset()`: `clearTimer()`, then `state = EMPTY_PARSER_STATE`.
     - `restartTimer()`: `clearTimer()`, then `timerId = deps.timer.set(() => { timerId = undefined; state = EMPTY_PARSER_STATE; }, KEY_TIMEOUT_MS)`.
     - `onExit`: `reset()`.
  4. `handleKey(press)`, checks in this order:
     1. `deps.editableFocused()` → `reset()`, `deps.machine.enter('insert')` (no options), return `'passed'`.
     2. `press.key === 'i'` → `reset()`, `deps.machine.enter('insert', { sticky: true })`, return `'consumed'`.
     3. `press.key === '<Esc>'` → `escape()`: if `hasPending(state)`, `reset()` and return `'consumed'`, else return `'passed'`.
     4. Otherwise `parse(press)`: `const result = parseKey(state, press.key, deps.trie)`, set `state = result.state` and `const { outcome } = result`, then an exhaustive `switch (outcome.type)` with no `default` (this narrows `outcome`, so `outcome.command` is typed):
        - `'run'`: `clearTimer()`, `deps.registry.run(outcome.command, { count: outcome.count, repeat: press.repeat })`, return `'consumed'`.
        - `'pending'`: `restartTimer()`, return `'consumed'`.
        - `'unmapped'`: `clearTimer()`, return `'passed'`.

     `hasPending(state)` is a module-level function: `state.count !== '' || state.keys.length > 0`.

  5. Return `{ name: 'normal', handleKey, onExit, reset }`. Every closure counts toward `createNormalMode`'s 60-line limit. If it goes over, move the switch into a module-level `resultFor(outcome)` that returns the `KeyResult` plus a timer action (`'clear' | 'restart'`), and keep the side effects in the closure.
  6. In `tasks.md`, flip T10 to `[x] done`, set _Current status_ → _Next task_ to T11, and add a dated _History_ line naming this commit's subject, in the same commit.
- **Done when:** the tests pass; `KEY_TIMEOUT_MS` is exported from `src/settings/defaults.ts` and imported by `normal.ts`; `npm run check` passes (Knip reports no unused export).
- **Commit:** `Add: normal mode that runs commands from key sequences`

### T11: Add the scroller — [x] done

- **Requirements:** R6.7, R6.8, R6.9, R6.10, R7.5, NFR1.2 (no frames once idle), NFR2.1 · **Design:** Scroller (one animation per element and axis, destinations, deadlines, `behavior: 'instant'` writes, drift check, reduced motion)
- **Depends on:** —
- **Files:** create `src/core/scroll/scroller.ts`, `src/core/scroll/scroller.test.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (marker and History)
- **Interface** (the design's, with only what `scroller.test.ts` imports exported, for Knip; T13 exports `Scroller` when it imports it):

  ```ts
  export interface FrameScheduler {
    request(callback: (now: number) => void): number;
    cancel(id: number): void;
  }
  export type Axis = 'x' | 'y';
  interface ScrollerDeps {
    readonly frames: FrameScheduler;
    readonly now: () => number; // same clock as the frame timestamps (performance.now)
    readonly prefersReducedMotion: () => boolean; // read on each scroll
  }
  interface Scroller {
    /** Moves `target` by `delta` px from its current destination. */
    scrollBy(target: Element, axis: Axis, delta: number, options: { repeat: boolean }): void;
    /** Moves `target` to `fraction` (0–1) of its scroll range. */
    scrollToFraction(target: Element, axis: Axis, fraction: number): void;
    stop(): void; // cancels every animation (R1.4)
  }
  export function createScroller(deps: ScrollerDeps): Scroller;
  ```

- **Tests first:** in `src/core/scroll/scroller.test.ts`, with `import { createScroller } from './scroller';` and `import type { Axis, FrameScheduler } from './scroller';`. Module-level helpers (not inside `describe`, to keep function nesting shallow):
  - `makeScrollable({ scrollHeight = 2000, clientHeight = 1000, scrollWidth = 2000, clientWidth = 1000 } = {}, parent: Element = document.body)`: creates a `div` and appends it to `parent`. It defines the four sizes as own properties with `Object.defineProperty(element, name, { value, configurable: true })`, and defines `scrollTo` the same way with `const scrollTo = vi.fn((options: ScrollToOptions) => { … })`, which writes `options.top` to `element.scrollTop` and `options.left` to `element.scrollLeft` when they're defined. jsdom's own `scrollTop` / `scrollLeft` store any value. Returns `{ element, scrollTo }`, so the max is 1000 on both axes and the start is 0.
  - `setup({ reducedMotion = false } = {})`: `let time = 0`. A fake scheduler with `pending = new Map<number, (now: number) => void>()`, ids 1, 2, 3, …, `request = vi.fn<FrameScheduler['request']>((callback) => { … })` and `cancel = vi.fn<FrameScheduler['cancel']>((id) => { pending.delete(id); })`. `reduced = { value: reducedMotion }`. The scroller is `createScroller({ frames: { request, cancel }, now: () => time, prefersReducedMotion: () => reduced.value })`. Returns `{ scroller, request, cancel, reduced, at(ms) { time = ms; }, flush(ms) { time = ms; for (const [id, callback] of [...pending]) { pending.delete(id); callback(ms); } }, pendingFrames: () => pending.size }`.
  - `afterEach(() => { document.body.replaceChildren(); })`.

  Assert on the `scrollTo`, `request` and `cancel` consts, never on `element.scrollTo` (`unbound-method`). The curve is `1 − (1 − t)³`, so 60 px at 40 % of the deadline is 47.04 (`toBeCloseTo`).
  - `reaches the destination 250 ms after a normal press`: `scrollBy(element, 'y', 60, { repeat: false })` at 0. `flush(100)` → `scrollTop` ≈ 47.04. `flush(250)` → `scrollTop === 60`, and `pendingFrames() === 0` (R6.7, NFR1.2).
  - `reaches the destination 100 ms after a key-repeat press`: `{ repeat: true }` at 0. `flush(40)` → ≈ 47.04. `flush(100)` → 60, and no frame is pending (R6.8).
  - `adds a new press to the previous destination, not the current position`: 60 at 0, `flush(50)` (≈ 29.28), `at(50)`, 60 more. `flush(200)` → `0 < scrollTop < 120`. `flush(300)` → `scrollTop === 120` (R6.9).
  - `keeps up with a held key and stops 100 ms after the last press`: one press at 0 with `repeat: false`, then `flush(t)` and `at(t)` before each `repeat: true` press at t = 33, 66, 99 and 132. `flush(165)` → `|scrollTop − 300| ≤ 60`. `flush(232)` → `scrollTop === 300`, and no frame is pending (R6.8).
  - `runs x and y animations on the same element together`: at 0, `scrollBy(element, 'y', 60, …)` and `scrollBy(element, 'x', 40, …)`. `flush(250)` → `scrollTop === 60` and `scrollLeft === 40`. `request` was called once for both, since they share one frame loop.
  - `writes each axis with its own property` (`it.each<{ axis: Axis; property: 'scrollTop' | 'scrollLeft'; option: 'top' | 'left' }>` over `y`/`scrollTop`/`top` and `x`/`scrollLeft`/`left`): `scrollBy(element, axis, 60, …)`, `flush(250)` → `element[property] === 60`, and `scrollTo` was last called with exactly `{ [option]: 60, behavior: 'instant' }`.
  - `clamps the destination to the scroll range`: from 950, +60, `flush(250)` → 1000. From 30, −60 → 0.
  - `does nothing at the edge`: `scrollTop = 1000`, +60 → `scrollTo` and `request` not called. `scrollTop = 0`, −60 → same (R6.10).
  - `does nothing when the content fits`: `makeScrollable({ scrollHeight: 500, clientHeight: 1000 })`, +60 → `scrollTo` and `request` not called (R6.10).
  - `keeps the running deadline when a press adds nothing at the edge`: from 950, +60 at 0, `at(100)`, +60. `flush(250)` → 1000 and no frame is pending (a restarted animation would still be running at 250).
  - `writes with behavior instant on the target only`: a parent from `makeScrollable()` with its own `scrollTo` const, and a child from `makeScrollable({}, parent.element)`. +60 on the child and `flush(250)`: every child `scrollTo` call has `behavior: 'instant'`. Then with the child at 1000, +60 → neither `scrollTo` is called (R7.5).
  - `never moves backwards when the frame time is before the press`: `at(10)`, +60, `flush(5)` → `scrollTop === 0`. `flush(260)` → 60.
  - `writes the destination at once when reduced motion is preferred`: `setup({ reducedMotion: true })`, +60 → `scrollTo` called once with `{ top: 60, behavior: 'instant' }`, `request` not called (NFR2.1).
  - `reads the reduced-motion preference on every scroll`: +60 with motion on, `flush(50)`, then `reduced.value = true` and +60 → `scrollTo` last called with `{ top: 120, behavior: 'instant' }`. `flush(100)` writes nothing more, and no frame is pending.
  - `drops the animation when something else scrolls the element`: +60 at 0, `flush(50)`, add 5 to `scrollTop`, and record the call count. `flush(100)` → no new `scrollTo` call and no frame pending. Then `at(100)`, +60, `flush(350)` → `scrollTop` equals the position after the drift plus 60.
  - `starts from the real position when something else scrolled before the next frame`: +60 at 0, `flush(50)`, set `scrollTop = 500`, `at(50)`, +60. `flush(300)` → 560.
  - `drops the animation when the element leaves the page`: +60 at 0, `flush(50)`, `element.remove()`. `flush(100)` → no new `scrollTo` call and no frame pending.
  - `moves to a fraction of the scroll range`: `scrollToFraction(element, 'y', 0.5)`, `flush(250)` → 500. `at(250)`, `scrollToFraction(element, 'y', 1)`, `flush(500)` → 1000. `at(500)`, fraction `0`, `flush(750)` → 0 (R6.4–R6.6 support).
  - `does nothing when the fraction is the current position`: at 0, `scrollToFraction(element, 'y', 0)` → `scrollTo` and `request` not called (R6.10).
  - `stops every animation`: +60 at 0, `stop()` → `cancel` called with the id `request` returned. `flush(250)` → `scrollTo` not called.

- **Steps:**
  1. Write the tests; run `npm test -- src/core/scroll` and see them fail.
  2. Module level in `scroller.ts`: `NORMAL_DURATION_MS = 250` (R6.7: under 300 ms), `REPEAT_DURATION_MS = 100` (R6.8), and an unexported `interface Animation { readonly element: Element; readonly axis: Axis; from: number; to: number; start: number; duration: number; lastWritten: number }`. Pure helpers:
     - `position(element, axis)`: `scrollTop` for `y`, `scrollLeft` for `x`.
     - `maxScroll(element, axis)`: `Math.max(0, scrollHeight − clientHeight)` for `y`, or the same with the widths for `x`.
     - `write(element, axis, value)`: `element.scrollTo({ top: value, behavior: 'instant' })` for `y`, `{ left: value, behavior: 'instant' }` for `x`.
     - `easeOut(t)`: `1 − (1 − t) ** 3`.
     - `isStale(animation)`: `!element.isConnected || Math.abs(position(…) − lastWritten) > 1`.
     - `advance(animation, now)`: `t = Math.min(1, Math.max(0, (now − start) / duration))`, `value = t === 1 ? to : from + (to − from) × easeOut(t)`. It writes `value`, sets `lastWritten = value` and returns `t === 1`.
  3. In `createScroller(deps): Scroller`, keep `const animations = new Set<Animation>()` and `let frameId: number | undefined` in the closure:
     - `live(element, axis)`: finds the animation for that element and axis. If it `isStale`, deletes it and returns `undefined`.
     - `onFrame(now)`: `frameId = undefined`. For each animation, delete it if `isStale(a) || advance(a, now)`. Then `if (animations.size > 0) frameId = deps.frames.request(onFrame)`.
     - `animateTo(element, axis, target, duration)`: `running = live(…)`, `current = position(…)`, and `to` is `target` clamped to `[0, maxScroll(…)]`. If `to === (running?.to ?? current)`, return (the edge no-op, R6.10). Otherwise delete `running`. If `deps.prefersReducedMotion()`, call `write(element, axis, to)` and return. Otherwise add `{ element, axis, from: current, to, start: deps.now(), duration, lastWritten: current }` and set `frameId ??= deps.frames.request(onFrame)`.
     - `scrollBy`: `animateTo(target, axis, (live(target, axis)?.to ?? position(target, axis)) + delta, repeat ? REPEAT_DURATION_MS : NORMAL_DURATION_MS)`.
     - `scrollToFraction`: `animateTo(target, axis, Math.round(fraction × maxScroll(target, axis)), NORMAL_DURATION_MS)`.
     - `stop()`: if `frameId !== undefined`, call `deps.frames.cancel(frameId)`. Then set `frameId = undefined` and `animations.clear()`.

     Deleting the current item while iterating a `Set` with `for…of` is safe. `createScroller` must stay under 60 lines; `advance` and `isStale` are module-level for that reason.

  4. Run `npm run check` and fix what it reports.
  5. In `tasks.md`, flip T11 to `[x] done`, set _Next task_ to T12, and add a dated _History_ line naming the commit subject, in the same commit.
- **Done when:** every test above passes; `scroller.ts` exports only `createScroller`, `FrameScheduler` and `Axis`, and Knip reports nothing; `npm run check` passes.
- **Commit:** `Add: scroller with smooth, additive scroll animations`

### T12: Add the scroll-target tracker — [x] done

- **Requirements:** R7.1, R7.2, R7.3, R7.4, R7.6, NFR1.1 (cached fallback) · **Design:** Scroll-target tracker (path per axis, the document's own rule, R7.4 search and cache); Error handling (target removed or no longer scrollable, `scrollingElement` null, page with nothing scrollable)
- **Depends on:** T11 (`Axis`, exported from `src/core/scroll/scroller.ts`)
- **Files:** create `src/core/scroll/scroll-target.ts`, `src/core/scroll/scroll-target.test.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status)
- **Interface** (exactly the design's; all three exports are imported by the test, so Knip passes before T13 exists):

  ```ts
  import type { Axis } from './scroller';

  export interface ScrollTargetTracker {
    /** The element the next scroll on `axis` should move. */
    targetFor(axis: Axis): Element;
    /** Removes the listeners and forgets the stored path and the cached fallback. */
    stop(): void;
  }
  export function createScrollTargetTracker(doc: Document): ScrollTargetTracker;
  /** Whether `element` can scroll on `axis`; the document's scrolling element follows the document's own rule. */
  export function canScroll(element: Element, axis: Axis): boolean;
  ```

  "The document" means `doc.scrollingElement ?? doc.documentElement` (jsdom has no `scrollingElement`, so tests see `documentElement`).

- **Tests first:** in `src/core/scroll/scroll-target.test.ts`, importing `{ canScroll, createScrollTargetTracker, type ScrollTargetTracker }` from `./scroll-target`.
  - Fixture helpers (in the test file):
    - `stubSize(element, { scrollHeight, clientHeight, scrollWidth, clientWidth })` calls `vi.spyOn(element, '<prop>', 'get').mockReturnValue(n)` for each given prop. `restoreMocks: true` removes the stubs, including those on `document.documentElement` and `document.body`.
    - `stubRect(element, x, y, width, height)` calls `vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(x, y, width, height))`.
    - `panel({ overflowY?, overflowX?, sizes, rect? }, parent = document.body)` creates a `div`, sets `style.overflowY` / `style.overflowX` (longhands only: jsdom doesn't expand the `overflow` shorthand), appends it to `parent`, then applies `stubSize` and the optional `stubRect`.
    - `stubDocument({ y, x })` stubs `document.documentElement` with `clientHeight 768`, `clientWidth 1024` and `scrollHeight` / `scrollWidth` set to `3000` when that axis should scroll, or equal to the client size when it shouldn't.
    - `click(element)` dispatches `new MouseEvent('mousedown', { bubbles: true, composed: true })`.
  - `let tracker: ScrollTargetTracker | undefined`. `afterEach` does `tracker?.stop()`, `tracker = undefined`, `document.body.replaceChildren()`, `document.documentElement.removeAttribute('style')`, `document.body.removeAttribute('style')`, `Reflect.deleteProperty(document, 'scrollingElement')`.
  - `canScroll`:
    - `treats a container as scrollable when it overflows and its overflow is auto or scroll`: `it.each` over `auto`, `scroll` on `y` (`scrollHeight 1000`, `clientHeight 300`) → `true`.
    - `treats a container with overflow visible or hidden as not scrollable`: `it.each` over `visible`, `hidden` → `false`.
    - `treats a container whose content fits as not scrollable`: `scrollHeight === clientHeight` with `auto` → `false`.
    - `checks each axis on its own`: `overflowX: 'auto'`, wide content, fitting height → `x` true, `y` false.
    - `checks the size before reading the computed style`: a fitting `auto` panel with `const style = vi.spyOn(window, 'getComputedStyle')` → `false`, and `style` not called (NFR1).
    - `treats the document as scrollable when it overflows, even with overflow visible`: `stubDocument({ y: true, x: false })` → `canScroll(document.documentElement, 'y')` true, `'x'` false.
    - `treats the document as not scrollable when html or body sets overflow hidden`: `it.each` over `documentElement`, `body` with `style.overflowY = 'hidden'` → `y` false.
    - `treats body as a container only when html keeps its overflow from the viewport`: `body` has `style.overflowY = 'auto'` and overflowing stubbed sizes. With html's overflow visible → `false`. After `document.documentElement.style.overflowY = 'hidden'` → `true`.
    - `uses document.scrollingElement as the document when the browser provides one`: `Object.defineProperty(document, 'scrollingElement', { configurable: true, value: document.body })`. `body` has overflowing sizes and no overflow style → `canScroll(document.body, 'y')` is `true` (document rule).
  - `createScrollTargetTracker` (`tracker = createScrollTargetTracker(document)`):
    - `targets the nearest scrollable ancestor of a click`: `stubDocument({ y: true })`, an outer `y` panel holding an inner `y` panel holding a `span`; `click(span)` → `targetFor('y')` is the inner panel (R7.1).
    - `targets the nearest scrollable ancestor of a focused element`: an `input` inside a `y` panel; `input.focus()` → the panel (R7.1).
    - `targets the document when nothing was clicked and the document can scroll`: `stubDocument({ y: true })` and a visible `y` panel → `document.documentElement` (design: "at the bottom of an article, `j` must not start scrolling a sidebar").
    - `targets the document after a click with no scrollable ancestor`: `stubDocument({ y: true })`; click a panel first, then a plain `p` outside it → `document.documentElement` (R7.2).
    - `chooses per axis`: `stubDocument({ y: true })`; a `y`-only panel holding an `x`-only block (`overflowX: 'auto'`, wide, fitting height) holding a `span`; click the span → `targetFor('y')` is the panel and `targetFor('x')` is the block.
    - `falls back to the document when the target was removed`: click in a panel, `panel.remove()` → `document.documentElement` (R7.3).
    - `falls back to the document when the target can no longer scroll`: click in a panel, then `panel.style.overflowY = 'hidden'` → `document.documentElement` (R7.3).
    - `scrolls the largest visible vertical container when the document cannot scroll`: `stubDocument({ y: false })`. Panels with rects `(0, 0, 300, 200)`, `(0, 200, 800, 500)` and an off-screen `(0, 2000, 1000, 1000)` → the second (R7.4).
    - `scores visible area clipped to the viewport`: `stubDocument({ y: false })`. A tall panel `(0, 0, 500, 5000)` (clipped area 500 × 768 = 384 000) and a wide one `(0, 0, 1000, 400)` (400 000) → the wide one (R7.4).
    - `uses the largest visible container after a click outside any panel when the document cannot scroll`: `stubDocument({ y: false })`, click a plain `p` → the visible panel (R7.4).
    - `returns the document when nothing can scroll`: `stubDocument({ y: false })`, no panels → `document.documentElement`.
    - `reuses the cached fallback while it stays connected and scrollable`: `stubDocument({ y: false })`, one visible panel, `const walk = vi.spyOn(document, 'createTreeWalker')`. Two `targetFor('y')` calls → both the panel, `walk` called once. Then `panel.remove()` and add a second visible panel → `targetFor('y')` is the new panel, `walk` called twice (NFR1).
    - `keeps the document as the x target when it cannot scroll horizontally`: `stubDocument({ y: false, x: false })` and a visible panel that scrolls on `x` → `targetFor('x')` is `document.documentElement` (R7.6).
    - `stops tracking clicks and focus after stop()`: `stubDocument({ y: true })`; click in a panel, `tracker.stop()`, click and focus inside the panel again → `targetFor('y')` is `document.documentElement`.
- **Steps:**
  1. Write the tests; run `npm test` and see them fail.
  2. In `scroll-target.ts`, add these unexported helpers (each well under complexity 10 and 60 lines):
     - `documentOf(doc): Element` returns `doc.scrollingElement ?? doc.documentElement`.
     - `overflowStyle(element, axis): string` returns `getComputedStyle(element).overflowY` for `y`, or `.overflowX` for `x`.
     - `overflows(element, axis): boolean` checks `scrollHeight > clientHeight` for `y`, or `scrollWidth > clientWidth` for `x`.
     - `visibleArea(element, view: Window): number` takes `getBoundingClientRect()`, clips it to `[0, view.innerWidth] × [0, view.innerHeight]` and returns `max(0, width) × max(0, height)`.
  3. `canScroll(element, axis)`, with `doc = element.ownerDocument`:
     - If `element === documentOf(doc)`, return `overflows(element, axis)` and neither `doc.documentElement` nor `doc.body` has `overflowStyle(…, axis) === 'hidden'`.
     - If `element === doc.body` and `overflowStyle(doc.documentElement, axis) === 'visible'`, return `false`, because body's overflow applies to the viewport.
     - Otherwise return `overflows(element, axis)` and `overflowStyle(element, axis)` is `'auto'` or `'scroll'`, in that order, so the cheap size check runs first.
  4. `findLargest(doc, view): Element | undefined` builds `doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT)` and loops `for (let node: Node | null = walker.currentNode; node !== null; node = walker.nextNode())`, so `body` itself is a candidate. It keeps the element with the largest `visibleArea` among those where `node instanceof Element && canScroll(node, 'y')`. A larger area replaces the best only when strictly greater, so the first in tree order wins ties, and an area of 0 never wins.
  5. `createScrollTargetTracker(doc)`:
     - Setup: `const view = doc.defaultView ?? window`. State is `let path: readonly Element[] = []` and `let fallback: Element | undefined`. One handler, `(event: Event): void => { path = event.composedPath().filter((node): node is Element => node instanceof Element); }`, is added to `view` for `mousedown` and `focusin` with `{ capture: true }`.
     - `targetFor(axis)`:
       1. Return the first element of `path` that is `isConnected` and `canScroll(element, axis)`.
       2. Otherwise, if `axis === 'x'` or `canScroll(documentOf(doc), 'y')`, return `documentOf(doc)` (R7.2, R7.3, R7.6).
       3. Otherwise, if `fallback` is connected and `canScroll(fallback, 'y')`, return it.
       4. Otherwise set `fallback = findLargest(doc, view)` and return `fallback ?? documentOf(doc)`. A miss isn't cached, so content loaded later is found on the next key.
     - `stop()` removes both listeners with the same options and resets `path` and `fallback`.
     - Add JSDoc for the exports and one comment explaining the `body` rule (why, not what).
  6. Run `npm run check`.
  7. In `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md`, flip T12 to `[x] done`, set _Current status_ → _Next task_ to T13, and append to _History_: `- <date> — <name>: T12 done in "Add: scroll-target tracker for inner scrolling panels".`
- **Done when:** the tests above pass; `scroll-target.ts` is under 300 lines with every function within the lint limits; `npm run check` passes (Knip reports nothing for `scroll-target.ts`); the T12 marker and History line are in the same commit.
- **Commit:** `Add: scroll-target tracker for inner scrolling panels`

### T13: Add the scroll commands — [x] done

- **Requirements:** R5.1, R5.2, R5.5 (the registry half; T5 owns the trie half), R6.1–R6.6 (distances and fractions), R6.8 (passes the repeat flag on) · **Design:** Scroller (the scroll-commands paragraph), Command registry, Default keymap (`SCROLL_STEP_Y`, `SCROLL_STEP_X`)
- **Depends on:** T2 (`Command`, `COMMAND_NAMES`, `createCommandRegistry`), T5 (creates `src/settings/defaults.ts` and `defaults.test.ts`), T11 (`Axis`; the `Scroller` interface, which this task exports), T12 (`ScrollTargetTracker`). T10 also appends to `defaults.ts`. The two edits don't touch each other, so T10 and T13 can land in either order.
- **Files:** create `src/core/commands/scroll.ts`, `src/core/commands/scroll.test.ts`; modify `src/core/scroll/scroller.ts` (add `export` to `interface Scroller`, nothing else), `src/settings/defaults.ts`, `src/settings/defaults.test.ts`, `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface:** in `src/settings/defaults.ts`, append:

  ```ts
  /** Pixels per `j` / `k` (R6.1). */
  export const SCROLL_STEP_Y = 60;
  /** Pixels per `h` / `l` (R6.2). */
  export const SCROLL_STEP_X = 40;
  ```

  In `src/core/commands/scroll.ts`, using relative imports (`import type { Command } from './registry'`, `import type { Axis, Scroller } from '../scroll/scroller'`, `import type { ScrollTargetTracker } from '../scroll/scroll-target'`, `import { SCROLL_STEP_X, SCROLL_STEP_Y } from '../../settings/defaults'`):

  ```ts
  interface ScrollCommandDeps {
    readonly scroller: Pick<Scroller, 'scrollBy' | 'scrollToFraction'>;
    readonly targets: Pick<ScrollTargetTracker, 'targetFor'>;
  }
  /** The M1 scroll commands, one per COMMAND_NAMES entry, in that order. */
  export function createScrollCommands(deps: ScrollCommandDeps): readonly Command[];
  ```

  `ScrollCommandDeps` is not exported: no other file needs the name, and Knip would flag it. `createScrollCommands` is the only export. Every command has `acceptsCount: true` and `context: 'page'`, and these exact descriptions:

  | Name                 | Description                                          | `run(ctx)` does                                                                               |
  | -------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
  | `scrollDown`         | `Scroll down`                                        | `scrollBy(targetFor('y'), 'y', SCROLL_STEP_Y × n, { repeat })`                                |
  | `scrollUp`           | `Scroll up`                                          | same with `−SCROLL_STEP_Y × n`                                                                |
  | `scrollLeft`         | `Scroll left`                                        | `scrollBy(targetFor('x'), 'x', −SCROLL_STEP_X × n, { repeat })`                               |
  | `scrollRight`        | `Scroll right`                                       | same with `+SCROLL_STEP_X × n`                                                                |
  | `scrollHalfPageDown` | `Scroll down half a page`                            | `t = targetFor('y')`; `scrollBy(t, 'y', t.clientHeight / 2 × n, { repeat })`                  |
  | `scrollHalfPageUp`   | `Scroll up half a page`                              | same with `−t.clientHeight / 2 × n`                                                           |
  | `scrollToTop`        | `Scroll to the top, or to N percent with a count`    | `scrollToFraction(targetFor('y'), 'y', count === undefined ? 0 : Math.min(count, 100) / 100)` |
  | `scrollToBottom`     | `Scroll to the bottom, or to N percent with a count` | `scrollToFraction(targetFor('y'), 'y', count === undefined ? 1 : Math.min(count, 100) / 100)` |

  Here `n = ctx.count ?? 1` and `repeat = ctx.repeat`. `targetFor` is called on every run, never cached, because the target changes with clicks (R7). The half-page distance is not rounded, as in the design; the scroller handles fractions.

- **Tests first:**
  - In `src/core/commands/scroll.test.ts`, importing `createScrollCommands` from `./scroll`, `COMMAND_NAMES` and `type Command`, `type CommandName` from `./registry`, `type Scroller` from `../scroll/scroller`, `type ScrollTargetTracker` from `../scroll/scroll-target`. Helper `setup()` creates `yTarget` and `xTarget` (two different `div`s; `Object.defineProperty(yTarget, 'clientHeight', { value: 800 })`), `scrollBy = vi.fn<Scroller['scrollBy']>()`, `scrollToFraction = vi.fn<Scroller['scrollToFraction']>()`, and `targetFor = vi.fn<ScrollTargetTracker['targetFor']>((axis) => (axis === 'x' ? xTarget : yTarget))`, each in its own variable. It returns them with `commands = createScrollCommands({ scroller: { scrollBy, scrollToFraction }, targets: { targetFor } })`. Assertions use only these variables, never a method read off an object (`@typescript-eslint/unbound-method`). Helper `commandNamed(commands, name: CommandName): Command` uses `find` and throws an `Error` with the message `No command <name>` (a template literal) when nothing matches (no `!`). Tests call `commandNamed(...).run({ count, repeat })`.
    - `returns one command per command name, in order` — `commands.map((c) => c.name)` equals `[...COMMAND_NAMES]` (R5.1).
    - `describes every command as a page command that accepts a count` — every command has a non-empty `description`, `acceptsCount: true` and `context: 'page'` (R5.2).
    - `scrolls down and up 60 px times the count` — `scrollDown` `{ count: undefined, repeat: false }` → `scrollBy` called with `(yTarget, 'y', 60, { repeat: false })`; `{ count: 3 }` → `180`; `scrollUp` with no count → `-60`; `targetFor` called with `'y'` (R6.1).
    - `scrolls left and right 40 px times the count on the x target` — `scrollRight` → `(xTarget, 'x', 40, …)`; `scrollLeft` count 2 → `(xTarget, 'x', -80, …)`; `targetFor` called with `'x'` (R6.2).
    - `scrolls half the target's visible height times the count` — `scrollHalfPageDown` → `(yTarget, 'y', 400, …)`; count 2 → `800`; `scrollHalfPageUp` → `-400` (R6.3).
    - `measures the half page on the current target` — `targetFor.mockReturnValueOnce(panel)` where `panel` has `clientHeight` 300; `scrollHalfPageDown` → `scrollBy` called with `(panel, 'y', 150, …)`. The next run uses `yTarget` again (R6.3, R7 wiring: the tracker is asked on every run).
    - `passes the repeat flag to the scroller` — `scrollDown` `{ count: undefined, repeat: true }` → last argument `{ repeat: true }`. Same for `scrollHalfPageUp` (R6.8 wiring).
    - `goes to the top or bottom without a count` — `scrollToTop` → `scrollToFraction(yTarget, 'y', 0)`; `scrollToBottom` → `(yTarget, 'y', 1)` (R6.4, R6.5).
    - `goes to N percent with a count, capped at 100` — `scrollToTop` count 50 → `0.5`; `scrollToBottom` count 50 → `0.5`; `scrollToTop` count 100 → `1`; `scrollToBottom` count 250 → `1` (R6.6).
  - In `src/settings/defaults.test.ts`, add a sibling `describe('DEFAULT_KEYMAP in the command registry', ...)` after T5's block, importing `createCommandRegistry` from `@/core/commands/registry`, `createScrollCommands` from `@/core/commands/scroll`, and `type Scroller` / `type ScrollTargetTracker` for typed fakes (`vi.fn<Scroller['scrollBy']>()`, `vi.fn<Scroller['scrollToFraction']>()`, `vi.fn<ScrollTargetTracker['targetFor']>(() => document.documentElement)`):
    - `resolves every default mapping to a registered command` — `createCommandRegistry(createScrollCommands(fakes))` doesn't throw, and for each `DEFAULT_KEYMAP` entry `registry.get(entry.command).name` is `entry.command` (R5.5). This replaces the design's testing-strategy line that puts this check in `registry.test.ts`: T2 has no commands or keymap to check yet.
- **Steps:**
  1. Write both test files' new tests. Run `npm test -- src/core/commands src/settings` and watch them fail (`./scroll` doesn't exist yet).
  2. In `src/core/scroll/scroller.ts`, change `interface Scroller` to `export interface Scroller`. T11 left it unexported because nothing imported it yet (Knip); `scroll.ts` and both tests import it now. Then append `SCROLL_STEP_Y` and `SCROLL_STEP_X` to `src/settings/defaults.ts` as in _Interface_, after `DEFAULT_KEYMAP` and any `KEY_TIMEOUT_MS` from T10.
  3. In `scroll.ts`, add module-private helpers that take options objects, to stay within `max-params` 4 and 60 lines per function:
     - `pageCommand(name, description, run)` returns `{ name, description, acceptsCount: true, context: 'page', run }` typed `Command`.
     - `stepCommand(deps, { name, description, axis, pixels })` (signed `pixels`).
     - `halfPageCommand(deps, { name, description, direction })` (`direction: 1 | -1`).
     - `fractionCommand(deps, { name, description, withoutCount })` (`withoutCount: 0 | 1`).
       `run` bodies call `deps.scroller.scrollBy(...)` / `deps.scroller.scrollToFraction(...)` and `deps.targets.targetFor(...)` directly. Never destructure a method into a variable (`unbound-method`). `createScrollCommands` returns the eight commands in `COMMAND_NAMES` order, built as in the _Interface_ table.
  4. Run `npm run format`, then `npm run check`.
  5. In `tasks.md`, flip T13 to `[x] done`, set _Current status_ → _Next task_ to the next todo task, and add a dated _History_ line naming the commit subject.
- **Done when:** the new tests in `scroll.test.ts` and `defaults.test.ts` pass; `npm run check` passes (Knip: `createScrollCommands`, `SCROLL_STEP_Y`, `SCROLL_STEP_X` and `Scroller` are all imported, and no other new export exists; ESLint: no `unbound-method` reports in either test).
- **Commit:** `Add: scroll commands for j k h l d u gg and G`

### T14: Add the controller — [x] done

- **Requirements:** R1.4, R1.6 (orphan guard), R2.1, R2.6 (wiring), R3.3, R3.7, NFR2 (wiring), NFR4 · **Design:** Controller; Editable detection and focus watcher (controller mapping, initial mode)
- **Depends on:** T1 (`listenForKeys`, `KeyPress`, `KeyResult`), T2 (`createCommandRegistry`), T3 (`buildKeymapTrie`), T5 (`DEFAULT_KEYMAP`), T6 (`isEditable`, `deepActiveElement`, `ShadowRootOf`), T7 (`watchFocus`), T8 (`createModeMachine`, `ModeMachine`), T9 (`createInsertMode`), T10 (`createNormalMode`, `Timer`), T11 (`createScroller`, `FrameScheduler`), T12 (`createScrollTargetTracker`), T13 (`createScrollCommands`)
- **Files:** create `src/core/controller.ts`, `src/core/controller.test.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only)
- **Interface** (exactly the design's; all three exports are imported by `controller.test.ts`, so Knip passes before T15 wires `content.ts`):

  ```ts
  export interface ControllerDeps {
    readonly window: Window;
    readonly timer: Timer;
    readonly frames: FrameScheduler;
    readonly now: () => number;
    readonly isValid: () => boolean;
    readonly isTrusted: (event: KeyboardEvent) => boolean;
    readonly shadowRootOf: ShadowRootOf;
    readonly prefersReducedMotion: () => boolean;
  }
  export interface Controller {
    stop(): void;
  }
  export function createController(deps: ControllerDeps): Controller;
  ```

  Imports in `controller.ts` are relative, like the rest of `src/core`, with inline `type` specifiers for types: `../settings/defaults`, `./commands/registry`, `./commands/scroll`, `./editable`, `./focus-watcher`, `./key-listener`, `./keymap-trie`, `./mode-machine`, `./modes/insert`, `./modes/normal`, `./scroll/scroller`, `./scroll/scroll-target`.

- **Tests first:** in `src/core/controller.test.ts` (imports from `vitest` explicitly, like `key-listener.test.ts`; `import { createController, type Controller, type ControllerDeps } from './controller'`).
  - Setup, rebuilt in `beforeEach`:
    - Document stub: on `document.documentElement`, `Object.defineProperty` getters `scrollHeight` 3000, `clientHeight` 800, `scrollWidth` 1000, `clientWidth` 1000; `scrollTop` and `scrollLeft` as get/set backed by local variables starting at 0; and `scrollTo` as a value, `const scrollTo = vi.fn<(options: ScrollToOptions) => void>((options) => { if (options.top !== undefined) top = options.top; if (options.left !== undefined) left = options.left; })`. All are `configurable: true`. jsdom has no `Element.prototype.scrollTo`, and its `scrollingElement` is `undefined`, so the tracker falls back to `documentElement`.
    - `vi.spyOn(document, 'hasFocus').mockReturnValue(true)`: jsdom reports `false` while `focusout` runs, which would make the focus watcher ignore every blur.
    - Fakes, each in its own const: `set = vi.fn<Timer['set']>(() => ++lastTimerId)` and `clear = vi.fn<Timer['clear']>()`; `request = vi.fn<FrameScheduler['request']>((callback) => { queued.push(callback); return ++lastFrameId; })` and `cancel = vi.fn<FrameScheduler['cancel']>()`; a clock `let time = 0`. `Timer` comes from `./modes/normal` and `FrameScheduler` from `./scroll/scroller`, both as `import type`. Assert on these consts, never on `deps.timer.set` (`unbound-method`).
    - `start(overrides: Partial<ControllerDeps> = {}): Controller` builds `{ window, timer: { set, clear }, frames: { request, cancel }, now: () => time, isValid: () => true, isTrusted: () => true, shadowRootOf: (host) => closedRoots.get(host) ?? host.shadowRoot, prefersReducedMotion: () => true, ...overrides }`, where `closedRoots = new Map<Element, ShadowRoot>()`. It calls `createController` and stores the result in `let controller: Controller | undefined`. jsdom events are never trusted and jsdom has no `matchMedia`, hence the injected `isTrusted` and `prefersReducedMotion`.
    - `press(key: string): KeyboardEvent` creates `new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })`, dispatches it on `document.activeElement ?? document.body` and returns it. Keys are DOM names: `'j'`, `'g'`, `'i'`, `'x'`, `'5'`, `'Escape'`.
    - `flushFrames(at: number)` sets `time = at`, then runs and empties the queued callbacks with `at`.
  - `afterEach`: `controller?.stop()`, `controller = undefined`, `document.body.replaceChildren()`, `closedRoots.clear()`, and `Reflect.deleteProperty(document.documentElement, name)` for each stubbed property.
  - Cases:
    - `starts in Normal mode when no field has focus` — `start()`. `press('Escape')` is not `defaultPrevented` (Normal mode passes it with nothing pending, while Insert mode would consume it). `press('j')` is `defaultPrevented` and `document.documentElement.scrollTop === 60` (R2.1).
    - `starts in Insert mode when a text field already has focus` — append and `focus()` an `<input>`, then `start()`. `press('Escape')` (dispatched on the input) is `defaultPrevented`, and `document.activeElement === document.body` afterwards. In Normal mode `<Esc>` would have passed (R3.3, R2.6).
    - `sees a field in a closed shadow root through shadowRootOf` — a `div` host with `attachShadow({ mode: 'closed' })`, the root stored in `closedRoots`, and an `<input>` inside, focused before `start()`. `press('Escape')` is `defaultPrevented`, then `root.activeElement === null` (the inner input was blurred) (R3.3, R3.2 wiring).
    - `enters Insert mode when a field gains focus` — `start()`, then focus an `<input>`. `press('Escape')` is `defaultPrevented` (R3.1 wiring).
    - `returns to Normal mode when the field loses focus` — `start()`, focus an `<input>`, `blur()` it. `press('Escape')` is not `defaultPrevented`, and `press('j')` is, with `scrollTop === 60` (R3.4 wiring).
    - `keeps sticky Insert mode across focus changes` — `start()`. `press('i')` is `defaultPrevented`. Then focus and `blur()` an `<input>`. `press('j')` is not `defaultPrevented` and `scrollTop === 0`. `press('Escape')` is `defaultPrevented`, then `press('j')` is, and `scrollTop === 60` (R3.7).
    - `blurs the focused field on <Esc> and scrolls afterwards` — `start()`, focus an `<input>`. `press('Escape')` is `defaultPrevented` and `document.activeElement === document.body`. `press('j')` is `defaultPrevented` and `scrollTop === 60` (R2.5, R2.6 wiring).
    - `animates with the injected frames and clock` — `start({ prefersReducedMotion: () => false })`, `press('j')`: `request` was called. `flushFrames(250)` gives `scrollTop === 60` (R6.7, NFR2 wiring).
    - `passes every key and stops once the extension is no longer valid` — `let valid = true`; `start({ isValid: () => valid })`. `press('j')` gives 60. Set `valid = false`; `press('j')` is not `defaultPrevented` and `scrollTop` stays 60. Set `valid = true`; `press('j')` is still not `defaultPrevented` and `scrollTop` stays 60, because the controller stopped itself (R1.4, R1.6).
    - `removes its listeners and clears the key timer on stop()` — `start()`, `press('g')` is `defaultPrevented` and `set` was called once. `controller.stop()`: `clear` was called with the id `set` returned. `press('j')` is not `defaultPrevented` and `scrollTop === 0`. A second `stop()` doesn't throw, and `clear` still has one call (R1.4).
    - `stops a running animation on stop()` — `start({ prefersReducedMotion: () => false })`, `press('j')`, then `controller.stop()`. `cancel` was called with the id `request` returned. `flushFrames(250)` leaves `scrollTop === 0` (R1.4).
    - `never logs keys` — `vi.spyOn(console, m)` for `debug`, `log`, `info`, `warn` and `error`, each spy in its own const. `start()`, then press `j`, `5`, `g`, `g`, `i`, `x`, `Escape`, `j`. No spy was called (NFR4).
- **Steps:**
  1. Write the tests; run `npm test -- src/core/controller.test.ts` and see them fail (the module doesn't exist).
  2. In `src/core/controller.ts`, add the interface above and an unexported `blurElement(element: Element | null): void` that calls `element.blur()` when `element instanceof HTMLElement`.
  3. Add an unexported `createModes(deps: { readonly timer: Timer; readonly registry: CommandRegistry; readonly editableFocused: () => boolean; readonly blurActive: () => void }): { readonly machine: ModeMachine; readonly normal: ReturnType<typeof createNormalMode> }`. The modes need the machine before it exists, so build a forwarding object first and declare `machine` as a `const` after it. The forwarder only reads `machine` at call time:

     ```ts
     const switcher: Pick<ModeMachine, 'enter' | 'handleKey' | 'isSticky'> = {
       enter: (name, options) => {
         machine.enter(name, options);
       },
       handleKey: (press) => machine.handleKey(press),
       get isSticky() {
         return machine.isSticky;
       },
     };
     const normal = createNormalMode({
       machine: switcher,
       trie: buildKeymapTrie(DEFAULT_KEYMAP),
       registry: deps.registry,
       timer: deps.timer,
       editableFocused: deps.editableFocused,
     });
     const insert = createInsertMode({
       machine: switcher,
       blurActive: deps.blurActive,
       editableFocused: deps.editableFocused,
     });
     const machine = createModeMachine(
       [normal, insert],
       deps.editableFocused() ? 'insert' : 'normal',
     );
     return { machine, normal };
     ```

     Don't use `let machine` assigned later: `prefer-const` rejects it. Don't use `machine?.` either: it adds branches that never run. The initial mode comes from `editableFocused()` (R2.1, R3.3). The machine calls no `onEnter` at start (T8).

  4. `createController(deps)`, in this order:
     - `const doc = deps.window.document`; `const activeElement = (): Element | null => deepActiveElement(doc, deps.shadowRootOf)`; `const editableFocused = (): boolean => isEditable(activeElement())`.
     - `const scroller = createScroller({ frames: deps.frames, now: deps.now, prefersReducedMotion: deps.prefersReducedMotion })`; `const tracker = createScrollTargetTracker(doc)`; `const registry = createCommandRegistry(createScrollCommands({ scroller, targets: tracker }))`.
     - `const { machine, normal } = createModes({ timer: deps.timer, registry, editableFocused, blurActive: () => { blurElement(activeElement()); } })`.
     - `const stopFocus = watchFocus(deps.window, deps.shadowRootOf, (editable) => { if (!machine.isSticky) { machine.enter(editable ? 'insert' : 'normal'); } })`. Sticky Insert mode ignores focus changes (R3.7).
     - `let stopped = false`; `const stop = (): void => { if (stopped) { return; } stopped = true; stopKeys(); stopFocus(); tracker.stop(); scroller.stop(); normal.reset(); }`.
     - `const stopKeys = listenForKeys(deps.window, (press) => { if (!deps.isValid()) { stop(); return 'passed'; } return machine.handleKey(press); }, deps.isTrusted)`. `isValid` is checked first on every key, so an orphaned copy passes every key and stops itself (R1.4, R1.6). `stop` reads `stopKeys` only when it is called, which is always after `listenForKeys` has returned.
     - Return `{ stop }`.

     Add JSDoc to `createController`: it is the composition root, and `stop()` removes every listener, clears the key timer and stops animations. Write no `console` call anywhere (NFR4). Each function stays under 60 lines and complexity 10.

  5. Run `npm run check`.
  6. In `tasks.md`, flip T14 to `[x] done`, set _Next task_ to T15, and add a dated _History_ line naming this commit's subject.
- **Done when:** the 12 tests pass; `npm run check` passes (Knip included: `createController`, `Controller` and `ControllerDeps` are imported by the test).
- **Commit:** `Add: controller that wires modes, keys and scrolling`

### T15: Run the controller in the content script — [x] done

- **Requirements:** R1.1, R1.2, R1.3, R1.4 (wiring), R2.2, R4.8, NFR3.3 (`matches: ['<all_urls>']` kept), NFR4 · **Design:** Controller (`content.ts` wiring), Folder layout (`tests/e2e/fixtures/pages.ts`), Testing strategy (pass-through e2e, M0 spec replaced)
- **Depends on:** T14
- **Files:** modify `src/entrypoints/content.ts`; delete `tests/e2e/key-logging.spec.ts`; create `tests/e2e/fixtures/pages.ts`, `tests/e2e/pass-through.spec.ts`; modify `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md` (status only). `tests/e2e/fixtures.ts` stays as it is.
- **Tests first:** in `tests/e2e/pass-through.spec.ts`. Import `{ expect, test }` from `./fixtures` and `{ openPage, readSeen }` from `./fixtures/pages`. Every test opens `recorder` with reduced motion. Its "wait for the page" step presses `x` (unmapped, so it passes) and runs `await expect.poll(() => readSeen(page)).toContain('keyup:x:false')`, which proves every earlier key has been handled. Read `scrollY` with `page.evaluate(() => window.scrollY)`. Each case is its own top-level `test()` (`max-lines-per-function` applies to `.spec.ts`):
  - `hides consumed keys from the page, keyup included`: press `j`, then wait for the page. `readSeen` equals `['keydown:x:false', 'keyup:x:false']`, and `scrollY` is 60 (R1.1, R1.2).
  - `lets unmapped keys reach the page with their default action`: press `x` and wait for `keyup:x:false`. `readSeen` equals `['keydown:x:false', 'keyup:x:false']`, so the page saw both halves and the default was not prevented (R1.3, R2.2).
  - `lets Escape reach the page when nothing is pending`: press `Escape`, then wait for the page. `readSeen` equals `['keydown:Escape:false', 'keyup:Escape:false', 'keydown:x:false', 'keyup:x:false']` (R4.8).
  - `ignores keys the page dispatches itself`: `page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', code: 'KeyJ', bubbles: true, cancelable: true })); })`, then wait for the page. `readSeen` equals `['keydown:j:false', 'keydown:x:false', 'keyup:x:false']`, and `scrollY` is 0 (design: synthetic events pass untouched).
- **Steps:**
  1. Create `tests/e2e/fixtures/pages.ts`:
     - `const PAGES = { article: …, recorder: … } as const;` (not exported; T16 and T17 add pages here). Each value is a full HTML string starting with `<!doctype html>` (standard mode, so `document.scrollingElement` is `<html>`) and `<body style="margin: 0">`; every later page follows the same pattern. Keep each page to a few lines (`pages.ts` is under ESLint's `max-lines: 300`) and use plain strings with no `html` tag, so Prettier leaves them alone.
       - `article`: one `<div style="width: 3000px; height: 5000px">Article</div>`, so the document scrolls both ways.
       - `recorder`: the same 5000 px tall block, plus this in `<head>`: `<script>window.seen = []; for (const type of ['keydown', 'keyup']) { window.addEventListener(type, (event) => { window.seen.push(type + ':' + event.key + ':' + event.defaultPrevented); }, true); }</script>`. A capture listener on `window` runs after the content script's, because the content script registered at `document_start`.
     - `export async function openPage(context: BrowserContext, name: keyof typeof PAGES, { reducedMotion = true }: { readonly reducedMotion?: boolean } = {}): Promise<Page>` (types imported with `import type { BrowserContext, Page } from '@playwright/test'`). It runs `context.newPage()`, then `page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' })`, then `page.route(url, (route) => route.fulfill({ contentType: 'text/html', body: PAGES[name] }))` with `url = 'https://example.test/' + name`, then `page.goto(url)`, and returns the page.
     - The page-global augmentation, which later tasks extend: `declare global { interface Window { seen: string[] } }` (T16 adds `closedInput`). `pages.ts` is a module (it has exports), so `declare global` applies to every file in `tests/e2e`.
     - `export function readSeen(page: Page): Promise<string[]>` returns `page.evaluate(() => window.seen)`. Entries have the form `` `${type}:${key}:${defaultPrevented}` ``, for example `keydown:x:false`.
  2. Write `pass-through.spec.ts` as above and delete `tests/e2e/key-logging.spec.ts`. Run `npm run test:e2e` and see the consume cases fail, because the M0 script passes every key.
  3. Replace the body of `main(ctx)` in `src/entrypoints/content.ts`. Keep `matches` and `runAt`. Import `createController` from `@/core/controller`, and drop the `listenForKeys` import, the `console.debug` call and its eslint-disable comment (NFR4):
     ```ts
     const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
     const controller = createController({
       window,
       timer: {
         set: (callback, ms) => window.setTimeout(callback, ms),
         clear: (id) => {
           window.clearTimeout(id);
         },
       },
       frames: {
         request: (callback) => window.requestAnimationFrame(callback),
         cancel: (id) => {
           window.cancelAnimationFrame(id);
         },
       },
       now: () => performance.now(),
       isValid: () => ctx.isValid,
       isTrusted: (event) => event.isTrusted,
       // chrome.* can throw once the extension is gone; reading ctx.isValid also fires onInvalidated
       shadowRootOf: (host) =>
         host instanceof HTMLElement && ctx.isValid
           ? chrome.dom.openOrClosedShadowRoot(host)
           : host.shadowRoot,
       prefersReducedMotion: () => reducedMotion.matches,
     });
     ctx.onInvalidated(() => {
       controller.stop();
     });
     ```
     Wrap `controller.stop` in an arrow: passing it directly fails `@typescript-eslint/unbound-method`.
  4. Run `npm run test:e2e` (it builds first). All pass-through tests pass. Then `grep -c 'console.debug' .output/chrome-mv3/content-scripts/content.js` prints `0`.
  5. In `tasks.md`, flip T15 to `[x] done`, set _Next task_ to T16, and add the History line `- YYYY-MM-DD — <name>: T15 done in "Change: run the M1 controller in the content script".` Commit everything in one commit.
- **Done when:** `npm run test:e2e` passes and `key-logging.spec.ts` is gone; the built `content.js` has no `console.debug`; `content.ts` has no eslint-disable comment; `npm run check` passes.
- **Commit:** `Change: run the M1 controller in the content script`. The Why says the M0 key log is removed for NFR4, and that the `shadowRootOf` guard exists because an orphaned copy can't call `chrome.*`.

### T16: Add end-to-end tests for modes — [x] done

- **Requirements:** R2.3, R2.4, R2.5, R2.6, R3.1, R3.2, R3.4, R3.5, R3.6, R3.7 · **Design:** Testing strategy (end-to-end, `modes.spec.ts`; fixture pages with an input, a `contenteditable` element, open and closed shadow roots, a `designMode` document)
- **Depends on:** T15 (`tests/e2e/fixtures/pages.ts` with `PAGES`, `openPage`, `readSeen`, the `Window` augmentation and the `recorder` page; the controller running in `content.ts`)
- **Files:** create `tests/e2e/modes.spec.ts`; modify `tests/e2e/fixtures/pages.ts`, `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md`
- **Pages** to add to `PAGES` in `tests/e2e/fixtures/pages.ts`. Each is wrapped like T15's pages (`<!doctype html>`, `<body style="margin: 0">`, the markup below). Keep each to a few lines, since `pages.ts` is under ESLint's `max-lines: 300`. Use no `html` tag or `/* HTML */` comment, so Prettier leaves the strings alone:
  - `form`: `<input id="text"><textarea id="area"></textarea><input id="check" type="checkbox"><div id="editor" contenteditable style="min-height: 2em"></div><div id="filler" style="height: 5000px"></div>`. The fields sit in the top ~120 px, and the point (640, 400) of the default 1280 × 720 viewport falls on the non-focusable `#filler`.
  - `shadow`: `<div id="open-host"></div><div id="closed-host"></div><div style="height: 5000px"></div>`, then an inline `<script>`. It attaches an open root to `#open-host` holding `<input id="open-input">`, and attaches a closed root to `#closed-host`. It appends an `input` to the closed root and stores it as `window.closedInput`.
  - `design`: `<p id="para">Type here</p><div style="height: 5000px"></div><script>document.designMode = 'on';</script>`. The paragraph text has no `j`.
  - `autofocus`: `<input id="auto" autofocus><div style="height: 5000px"></div>`.
  - Add `closedInput: HTMLInputElement;` to the file's `declare global { interface Window { … } }` block, which T15 creates for `seen`.
- **Tests first** (this task is the tests). In `tests/e2e/modes.spec.ts`:
  - Imports: `import type { Page } from '@playwright/test';`, `import { expect, test } from './fixtures';` and `import { openPage, readSeen } from './fixtures/pages';`.
  - Helper (not exported): `function scrollY(page: Page): Promise<number> { return page.evaluate(() => window.scrollY); }`.
  - Every page is opened with `openPage(context, '<name>')`, which defaults to reduced motion, so scrolls are instant and exact.
  - "Scrolls" means `await expect.poll(() => scrollY(page)).toBe(60)`. "Doesn't scroll" is never checked on its own. A test reads `scrollY` only after a positive check has proved the key was handled: the typed text is visible in the field, or a later `j` polls to exactly `60`, which would be 120 or more if an earlier `j` had scrolled.
  - Tests stay at the top level, with no `test.describe`. Each callback stays under 60 lines and the file under 300 (`max-lines-per-function`, `max-lines`; spec files don't get the `*.test.ts` exemption). Arrow functions that call a void method use braces, for example `() => { window.closedInput.focus(); }` (`no-confusing-void-expression`).

  Test cases:
  - `types into a clicked text input instead of scrolling` (`form`): `page.click('#text')`, `page.keyboard.type('jk')`. Then `#text` `toHaveValue('jk')` and `scrollY` is 0 (R3.1, R2.3).
  - `enters Insert mode when Tab focuses a field and stays in it on the next Tab` (`form`): press `Tab`, and `#text` `toBeFocused()`. Type `j`. Press `Tab`, and `#area` `toBeFocused()`. Type `k`. Then `#text` has value `j`, `#area` has value `k`, and `scrollY` is 0 (R3.1 by Tab, R3.5).
  - `leaves Insert mode and blurs the field on ${key}`, generated with `for (const key of ['Escape', 'Control+BracketLeft'])` at the top level (`form`): click `#text`, type `j`, press `key`. Poll `page.evaluate(() => document.activeElement === document.body)` until it is `true`. Press `j`, and `scrollY` polls to 60. `#text` still has value `j` (R2.5, R2.6).
  - `returns to Normal mode when a field loses focus to the page` (`form`): click `#text`, then `page.mouse.click(640, 400)`. `#text` is `not.toBeFocused()`. Press `j`, and `scrollY` polls to 60. `#text` has value `''` (R3.4).
  - `stays in Normal mode when focus moves from a text field to a checkbox` (`form`): click `#text`, then `page.locator('#check').focus()`. Use script focus, because Chrome on macOS may not Tab to or click-focus a checkbox. `#check` `toBeFocused()`. Press `j`, and `scrollY` polls to 60 (R3.4, R3.6).
  - `types into a contenteditable element` (`form`): click `#editor` and type `j`. `#editor` `toHaveText('j')` and `scrollY` is 0 (R3.1).
  - `types into an input inside an open shadow root` (`shadow`): `page.locator('#open-input').click()` (Playwright's CSS selectors reach into open roots) and type `j`. `#open-input` `toHaveValue('j')` and `scrollY` is 0 (R3.2).
  - `types into an input inside a closed shadow root focused by script` (`shadow`): `page.evaluate(() => { window.closedInput.focus(); })` and type `j`. Then `expect.poll(() => page.evaluate(() => window.closedInput.value)).toBe('j')`, and `scrollY` is 0 (R3.1 by script, R3.2).
  - `types into a designMode document` (`design`): click `#para` (places the caret) and press `j`. `#para` `toContainText('j')` and `scrollY` is 0 (R3.2).
  - `types into a field focused by autofocus` (`autofocus`): `#auto` `toBeFocused()` first (this checks the setup), then type `j`. `#auto` `toHaveValue('j')` and `scrollY` is 0 (R3.1 by autofocus).
  - `i enters sticky Insert mode that ignores focus changes until Escape` (`form`): press `i` and `j`. Click `#text`, then `page.mouse.click(640, 400)`, and `#text` is `not.toBeFocused()`. Press `j`, `Escape`, `j`. `scrollY` polls to exactly 60, so only the last `j` scrolled (R2.4, R3.7, R2.5).
  - `consumes i and lets later keys reach the page in sticky Insert mode` (`recorder` from T15): press `i`, then `x`. `expect.poll(() => readSeen(page)).toEqual(['keydown:x:false', 'keyup:x:false'])`, so neither half of the `i` reached the page and `x` reached it with its default intact (R2.4, R2.3).

- **Steps:**
  1. Add the four pages and the `closedInput` declaration to `tests/e2e/fixtures/pages.ts`.
  2. Write `tests/e2e/modes.spec.ts` as above.
  3. Run `npm run test:e2e`. Then run `npm run build && npx playwright test tests/e2e/modes.spec.ts --repeat-each=5` to catch flaky tests.
  4. If a test fails, find out whether the test or the product is wrong. A test or page mistake is fixed here. Two exceptions:
     - Headless Chromium doesn't autofocus, so `#auto` is never focused. Delete that test and the `autofocus` page, and say in the _History_ line that autofocus shares the `focusin` path of the script-focus test.
     - The product code is wrong. Stop, don't commit T16, and report the failing test and its cause. The fix becomes its own task and `Fix:` commit, with a unit test that reproduces it, before T16 resumes.
  5. In `tasks.md`, flip T16 to `[x] done`, set _Current status_ → _Next task_ to T17, and add a _History_ line: `- <date> — <name>: T16 done in "Test: add end-to-end tests for normal and insert modes".` Commit it with the tests.
- **Done when:** `npm run test:e2e` passes; the `--repeat-each=5` run passes; `npm run check` passes (it type-checks and lints `tests/e2e`).
- **Commit:** `Test: add end-to-end tests for normal and insert modes`

### T17: Add end-to-end tests for scrolling — [x] done

- **Requirements:** R2.1, R6.1–R6.8, R7.1–R7.5, NFR2.1 · **Design:** Testing strategy (`scrolling.spec.ts`, fixture pages "fixed-height inner scrolling panel" and "SPA layout", the R6.7 and R6.8 timing tests)
- **Depends on:** T15 (`tests/e2e/fixtures/pages.ts` with `PAGES`, the `article` page overflowing both axes, `openPage(context, name, { reducedMotion })`, the controller running in the content script)
- **Files:** create `tests/e2e/scrolling.spec.ts`; modify `tests/e2e/fixtures/pages.ts`, `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md`
- **Tests first** (this task is the tests). Add two pages to `PAGES` in `tests/e2e/fixtures/pages.ts`, each starting with `<!doctype html>` like T15's pages (the `<style>` below sets the body margin):
  - `panel`: `<style>body { margin: 0 } #panel { height: 300px; width: 400px; overflow-y: auto } #panel-content { height: 3000px } #outside { height: 100px; width: 400px } #rest { height: 5000px }</style><div id="panel"><div id="panel-content">Panel</div></div><div id="outside">Outside</div><div id="rest"></div>`. The document scrolls vertically, and both `#panel` and `#outside` sit inside the 1280 × 720 viewport at load.
  - `spa`: `<style>html, body { height: 100%; margin: 0 } #main { height: 100vh; overflow-y: auto } #main-content { height: 5000px }</style><div id="main"><div id="main-content">App</div></div>`. The document has no overflow, so only `#main` can scroll.

  In `tests/e2e/scrolling.spec.ts`, import `test` and `expect` from `./fixtures`, `openPage` from `./fixtures/pages`, `type CDPSession` and `type Page` from `@playwright/test`, and `setTimeout as sleep` from `node:timers/promises`. Use these module-level helpers, and no `test.describe` wrapper (spec files are not exempt from the 60-lines-per-function and 300-lines-per-file limits):
  - `interface ScrollSample { readonly t: number; readonly y: number }` and `declare global { interface Window { scrollLog: ScrollSample[] } }`.
  - `pageScrollY(page)`, which returns `page.evaluate(() => window.scrollY)`.
  - `scrollTopOf(page, selector)`, which returns `page.locator(selector).evaluate((element) => element.scrollTop)`.
  - `expectNear(read: () => Promise<number>, expected: number)`, which runs `await expect.poll(async () => Math.abs((await read()) - expected)).toBeLessThanOrEqual(1)`.
  - `recordScrolls(page)`: `page.evaluate` sets `window.scrollLog = []` and adds a passive `scroll` listener on `window` that pushes `{ t: performance.now(), y: window.scrollY }`.
  - `holdKey(session: CDPSession, repeats: number)`: sends `Input.dispatchKeyEvent` `{ type: 'keyDown', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74, text: 'j' }`, then `repeats` times `await sleep(33)` and the same event with `autoRepeat: true`, then `await sleep(33)` and `{ type: 'keyUp', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 }`.
  - Constants for the selectors (`'#panel'`, `'#outside'`, `'#main'`).

  Unless a test says otherwise, it opens its page with `openPage(context, name)`, which uses reduced motion, so every scroll is written at once. Exact values are read with `expect.poll(...)`. A "stays" check is read once, right after a positive poll that proves the key was handled (the scroller writes synchronously in the `keydown` handler).
  - `j and k scroll 60 px times the count`: on `article`, `j` → `scrollY` 60; `3`, `j` → 240; `k` → 180 (R6.1, R2.1).
  - `h and l scroll 40 px times the count`: `l` → `scrollX` 40; `3`, `l` → 160; `h` → 120 (R6.2).
  - `d, u, Control+d and Control+u scroll half the visible height`: read `half = document.documentElement.clientHeight / 2` in the page. This is not `innerHeight`, because the horizontal scrollbar takes up height. Then `d`, `Control+d`, `u`, `Control+u`: each moves `scrollY` by `+half`, `+half`, `−half`, `−half` from the position measured just before it, checked with `expectNear`. The last position is within 1 px of 0 (R6.3).
  - `G goes to the bottom and gg to the top`: `Shift+G` → `scrollY === scrollHeight − clientHeight` of `document.documentElement` (read in the page); `g`, `g` → 0 (R6.4, R6.5).
  - `50G goes to half the scroll range`: `5`, `0`, `Shift+G` → `expectNear(pageScrollY, (scrollHeight − clientHeight) / 2)` (R6.6).
  - `scrolls the panel that was clicked`: on `panel`, `page.click('#panel')`, `j` → poll `scrollTopOf('#panel')` 60, then `scrollY` is 0 (R7.1).
  - `scrolls the document after a click outside any panel`: click `#panel`, `j` → panel 60; click `#outside`, `j` → poll `scrollY` 60, then the panel is still 60 (R7.2).
  - `falls back to the document when the panel is removed`: click `#panel`, `page.locator('#panel').evaluate((element) => { element.remove(); })`, `j` → `scrollY` 60 (R7.3).
  - `does not pass the scroll to the document at the panel's edge`: `page.locator('#panel').evaluate((element) => { element.scrollTop = element.scrollHeight; })`, read `bottom = scrollTopOf('#panel')`, click `#panel`, `j`, then `k` → poll the panel at `bottom − 60`, then `scrollY` is 0 (R7.5, R6.10 at the edge).
  - `scrolls the inner panel of an SPA without a click`: on `spa`, `j` → poll `scrollTopOf('#main')` 60; `scrollY` 0 (R7.4).
  - `scrolls instantly when reduced motion is preferred`: on `article`, `recordScrolls`, `5`, `j` → poll `scrollY` 300; `window.scrollLog` is not empty and every sample has `y === 300` (NFR2.1).
  - `animates and arrives within 300 ms`: `openPage(context, 'article', { reducedMotion: false })`, `recordScrolls`, press `5`, `const start = await page.evaluate(() => performance.now())`, press `j`, poll `scrollY` 300. Read the log. It has at least two distinct values strictly between 0 and 300. `(log.find((sample) => sample.y === 300)?.t ?? Number.POSITIVE_INFINITY) − start` is `≤ 300` (R6.7).
  - `keeps up with a held key and stops soon after release`: motion on, `const session = await context.newCDPSession(page)`, `await holdKey(session, 15)` (16 presses in total). Right after it returns, `|scrollY − 960| ≤ 60`. `await sleep(100)` and read `settled`; `await sleep(200)` and read again. Both reads equal `settled`, and `settled === 960`: nothing fell behind and nothing was lost (R6.8).

- **Steps:**
  1. Add the `panel` and `spa` pages to `pages.ts`.
  2. Write `scrolling.spec.ts` as above.
  3. Run `npm run test:e2e`, then `npx playwright test tests/e2e/scrolling.spec.ts --repeat-each=5` on the same build, so the timing tests are known to be stable. If a test fails because of product code, not the test, stop and report it. The fix goes in its own `Fix:` commit before this one, with a unit test that reproduces it and a _History_ line. Don't loosen the spec's numbers (60 px, 300 ms, one step, 100 ms) to make a test pass.
  4. Run `npm run check`. Lint and typecheck cover `tests/e2e`. Run `npm run format` if Prettier complains.
  5. In `tasks.md`, flip T17 to `[x] done`, set _Current status_ → _Next task_ to T18, and append to _History_: `- <date> — <name>: T17 done in "Test: add end-to-end tests for scrolling and scroll targets".`
- **Done when:** `npm run test:e2e` passes; the `--repeat-each=5` run of `scrolling.spec.ts` passes; `npm run check` passes; T17 is marked done in `tasks.md`.
- **Commit:** `Test: add end-to-end tests for scrolling and scroll targets`

### T18: Restart the content script in open tabs on install and update — [ ] todo

- **Requirements:** R1.5, R1.6, R1.7 · **Design:** Re-injection into open tabs; Testing strategy (`reinject` unit tests, `reinject.spec.ts`)
- **Depends on:** T15 (`openPage` and the `article` page in `tests/e2e/fixtures/pages.ts`; the controller running in `content.ts`, with `isValid` and `onInvalidated` wired)
- **Files:** create `src/background/reinject.ts`, `src/background/reinject.test.ts`, `src/entrypoints/background.ts`, `tests/e2e/reinject.spec.ts`; modify `wxt.config.ts`, `PLAN.md`, `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md`
- **Interface** (`src/background/reinject.ts`). This is the design's signature. The tab element type is widened to `| undefined` so that `chrome.tabs.query`'s `Tab[]` is assignable under `exactOptionalPropertyTypes`:
  ```ts
  export interface ReinjectDeps {
    readonly queryTabs: () => Promise<
      readonly { readonly id?: number | undefined; readonly discarded?: boolean | undefined }[]
    >;
    readonly executeScript: (tabId: number, files: readonly string[]) => Promise<unknown>;
    readonly files: readonly string[];
  }
  /** Resolves when every tab was tried; never rejects (R1.7). */
  export async function reinjectContentScript(deps: ReinjectDeps): Promise<void>;
  ```
- **Tests first:** in `src/background/reinject.test.ts`, import `reinjectContentScript` and `type ReinjectDeps` from `./reinject`. Use `const FILES = ['content-scripts/content.js']`. Build deps with a local helper `deps(tabs, executeScript, queryTabs?)` that returns a `ReinjectDeps`. Each fake is its own variable, for example `const executeScript = vi.fn<ReinjectDeps['executeScript']>(() => Promise.resolve())`. Assert on `executeScript.mock.calls`, never on `deps.executeScript`.
  - `injects the content script into every open tab` — tabs `[{ id: 1 }, { id: 2 }]` → `executeScript.mock.calls` equals `[[1, FILES], [2, FILES]]` (R1.5).
  - `skips tabs without an id and discarded tabs` — tabs `[{}, { id: 3, discarded: true }, { id: 4, discarded: false }]` → calls equal `[[4, FILES]]` (R1.7).
  - `resolves when a tab rejects the injection` — tabs 1, 2 and 3. `executeScript` returns `Promise.reject(new Error('Cannot access a chrome:// URL'))` for tab 1 and `Promise.resolve()` otherwise. `await expect(reinjectContentScript(...)).resolves.toBeUndefined()`, and all three ids were called (R1.7).
  - `resolves without injecting when querying tabs fails` — `queryTabs: () => Promise.reject(new Error('no tabs'))` → resolves to `undefined`, and `executeScript` was not called (R1.7).
  - `resolves only after every injection settles` — `executeScript` returns a promise whose `resolve` the test keeps. Start `reinjectContentScript` with `.then(() => { done = true; })`. After `await new Promise((resolve) => setTimeout(resolve, 0))`, `done` is `false`. Call the kept `resolve()`, await the promise, and `done` is `true` (design: "Resolves when every tab was tried").

  In `tests/e2e/reinject.spec.ts`, whose first line is `/// <reference types="chrome" />` (the e2e tsconfig only loads Node types):
  - `starts in an open tab after a reload, handling each key once` (R1.5, R1.6):
    1. `const page = await openPage(context, 'article')` (reduced motion, so scrolls are instant).
    2. `const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))`.
    3. `const restarted = context.waitForEvent('serviceworker', { timeout: 10_000 })` **before** the reload.
    4. `await worker.evaluate(() => { chrome.runtime.reload(); }).catch(() => undefined)`, because the worker dies mid-call. Then `await restarted`.
    5. `await expect.poll(async () => { await page.keyboard.press('j'); return page.evaluate(() => window.scrollY); }, { timeout: 5_000, intervals: [200] }).toBeGreaterThan(0)`. Presses before the new copy is in place pass through and do nothing.
    6. `expect(await page.evaluate(() => window.scrollY)).toBe(60)`. Exactly one copy handled the press.
    7. Press `j` again. `await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120)`.

- **Steps:**
  1. Write `reinject.test.ts`, run `npm test` and see it fail.
  2. Implement `src/background/reinject.ts`:
     - `const tabs = await deps.queryTabs().catch(() => [])`
     - `const tabIds = tabs.flatMap((tab) => (tab.id === undefined || tab.discarded === true ? [] : [tab.id]))`
     - `await Promise.allSettled(tabIds.map((tabId) => deps.executeScript(tabId, deps.files)))`

     The tests pass.

  3. Create `src/entrypoints/background.ts`. Import `defineBackground` from `wxt/utils/define-background` and `reinjectContentScript` from `@/background/reinject`. `export default defineBackground(() => { chrome.runtime.onInstalled.addListener((details) => { if (details.reason === 'install' || details.reason === 'update') { void reinjectContentScript({ queryTabs: () => chrome.tabs.query({}), executeScript: (tabId, files) => chrome.scripting.executeScript({ target: { tabId }, files: [...files] }), files: (chrome.runtime.getManifest().content_scripts ?? []).flatMap((script) => script.js ?? []) }); } }); });`. Use `chrome.*` here, not WXT's `browser`: WXT types `browser.scripting.executeScript`'s `files` as `ScriptPublicPath[]`, which the manifest's `string[]` doesn't satisfy. The design names `browser.*`, and the behavior is identical. Register the listener synchronously inside `main`, as MV3 service workers require.
  4. In `wxt.config.ts`, add `permissions: ['scripting']` to `manifest`. Run `npm run build`. Then check `.output/chrome-mv3/manifest.json`: `"permissions":["scripting"]`, `"background":{"service_worker":"background.js"…}`, and the content script `js` still `["content-scripts/content.js"]`.
  5. Write `reinject.spec.ts` and run `npm run test:e2e`.
     - **If the poll in step 5 of the test times out after the worker restarted**, injection is probably failing for lack of host access. Diagnose it: load `.output/chrome-mv3` unpacked in Chrome with an `https://` tab open. Open the service worker console from `chrome://extensions`. Run `await chrome.scripting.executeScript({ target: { tabId: <id from chrome.tabs.query({})> }, files: ['content-scripts/content.js'] })`. If it throws "Cannot access contents of the page", add `host_permissions: ['<all_urls>']` to `wxt.config.ts`, rebuild and rerun. Say so in the commit's Why and the _History_ line.
     - **Fallback:** if no new `serviceworker` event arrives within 10 s of the reload (Playwright lost the extension across the reload), delete `reinject.spec.ts`. T19's checklist already has the conditional item "reload the extension with a tab open, press `j` once, it moves one step". Say in the _History_ line that the fallback was used.
  6. Permission warning: load the build unpacked in Chrome. On `chrome://extensions` → the extension's **Details** → **Permissions**, the only entry is "Read and change all your data on all websites". The `scripting` permission adds no warning, and `<all_urls>` was already there.
  7. In `PLAN.md`, under `### M1 — Normal mode and scrolling`, add `- [x] Restart in open tabs on install and update` right after the `- [ ] Scroll the right element …` line.
  8. In this `tasks.md`, flip T18's marker to `[x] done`. Set _Current status_ **Next task** to T19 and **Last updated** to today by the executor. Append to _History_: `YYYY-MM-DD — <executor>: T18 done in "Add: restart the content script in open tabs on install and update"`. Add "; e2e fallback used" and/or "; added host_permissions <all_urls>" if either happened.
  9. Run `npm run check`. Run `npm run format` if Prettier flags `PLAN.md` or `tasks.md`, then run the check again.
- **Done when:** the unit tests pass; the built manifest has `permissions: ["scripting"]` and a `background.service_worker`; the Details page shows only "Read and change all your data on all websites"; `npm run test:e2e` passes, or the fallback is recorded in _History_; `PLAN.md` has the ticked line; T18 is `[x] done` with its _History_ line; `npm run check` passes (Knip: `ReinjectDeps` and `reinjectContentScript` are both imported).
- **Commit:** `Add: restart the content script in open tabs on install and update`. Why: after an install or update, open tabs keep running the old copy, which stops handling keys, until the user refreshes. Re-injecting fixes that. It needs the `scripting` permission (CONTRIBUTING.md), which adds no install warning because `<all_urls>` already grants host access. What: `reinjectContentScript` with unit tests; the background entrypoint; the `scripting` permission; the reload e2e test; the ticked `PLAN.md` line; T18 marked done.

### T19: Check M1 by hand and mark it done — [ ] todo

- **Requirements:** NFR1.1, NFR1.2, NFR3.1, NFR3.3, NFR5.1 · **Design:** Testing strategy (manual check), coverage table rows NFR1, NFR3, NFR5
- **Depends on:** T1–T18
- **Files:** modify `PLAN.md`, `docs/specs/2026-10-21-normal-mode-scrolling/tasks.md`
- **Tests first:** none (docs only). The test is the manual checklist below. The **user** runs it: a Claude session can't drive Arc, Chrome or DevTools. The executor prepares the build, gives the user the list and records the answers. Run it in the current stable Arc **and** Chrome on macOS, with `.output/chrome-mv3/` loaded unpacked (`chrome://extensions` → Developer mode → Load unpacked). Each item passes only if what you see matches exactly:
  1. **Long article** (any long Wikipedia article), no click first:
     - `j` / `k` move down / up one step. `5j` moves five steps in one smooth motion.
     - `l` / `h` move right / left on a page that scrolls sideways. If the article doesn't, they do nothing and show no error.
     - `d`, `<C-d>` move down half a screen. `u`, `<C-u>` move up half a screen.
     - `G` goes to the bottom, `gg` to the top. `50G` goes to about the middle.
     - Holding `j` scrolls steadily, and the page stops within about a step of where you let go.
     - With macOS System Settings → Accessibility → Display → Reduce motion on, `j` jumps with no animation (NFR2.1). Turn it back off afterwards.
  2. **GitHub**, a repository file view (for example `https://github.com/microsoft/TypeScript/blob/main/README.md`):
     - `j` scrolls the page or file panel without a click first.
     - `?` opens GitHub's keyboard-shortcuts dialog, so unmapped keys still reach the page. `Esc` then closes it (R4.8).
     - Click the search box at the top and type `jk`: the letters appear and nothing scrolls.
     - The first `Esc` takes focus off the field (the caret is gone) and `j` scrolls again. If GitHub's search dialog is still open, a second `Esc` closes it.
  3. **An SPA with an inner scrolling panel** (for example Gmail's inbox or a Slack channel): right after the page loads, with no click, `j` scrolls the panel (R7.4).
  4. **Forbidden pages** (NFR3.3): on `chrome://extensions` and `https://chromewebstore.google.com`, `j` does nothing and the page keeps its own behavior. Then, on the extension's card in `chrome://extensions`, there is no **Errors** button, or it lists no errors, once every other item has been run.
  5. **Performance** (NFR1.1, NFR1.2), in Chrome DevTools → Performance on the long article, with CPU throttling off:
     - Record while pressing `j` three times, then stop. In the Main track, each `Event: keydown` task is shorter than 16 ms. No red long-task corner points at `content.js`.
     - Record 5 s without touching the keyboard, after any scroll has finished. No `Animation frame fired` or `Timer fired` entries come from `content.js`.
  6. **Only if T18 used its fallback** (its _History_ line says so): with the article open, reload the extension from `chrome://extensions`. Back on the tab, press `j` once. The page moves exactly one step, not two (R1.5, R1.6).
- **Steps:**
  1. Run `npm run build`. Give the user the checklist above and wait for their answer on every item, in both browsers. Ask for the Arc and Chrome version numbers (Arc → About Arc; `chrome://version`).
  2. **If any item fails:** don't tick anything and leave this task `[ ] todo`. Add a _History_ line: `YYYY-MM-DD — <executor>: T19 manual check failed: <item, browser, what happened>`. Add a new task `T20: Fix <problem>` **above** T19 in this list, in the usual task format with its own tests first and a `Fix:` commit. Add T20 to T19's _Depends on_. Stop and report to the user. T19 is retried after T20 is done.
  3. If every item passes: in `PLAN.md`, under `### M1 — Normal mode and scrolling`, change every `- [ ]` to `- [x]`. These are the six original lines, the key line T5 rewrote, and T18's line if it's still open. Leave every other milestone untouched.
  4. In this `tasks.md`:
     - Flip T19's marker to `[x] done`.
     - Set _Current status_ to **Phase:** done, **Next task:** none, **Blocked by:** nothing, **Last updated:** today by the executor.
     - Append the _History_ line: `YYYY-MM-DD — <executor>: T19 done in "Docs: mark milestone M1 as done"; manual check passed in Arc <version> and Chrome <version> (checked by <user>)`.
  5. Run `npm run check` and `npm run test:e2e`. Prettier checks `PLAN.md` and `tasks.md`. Run `npm run format` if it complains, then check again.
- **Done when:** the user confirmed every checklist item in both browsers; `PLAN.md` has no `- [ ]` under M1; T19 is `[x] done` with its _History_ line and _Current status_ done; `npm run test:e2e` passes; `npm run check` passes.
- **Commit:** `Docs: mark milestone M1 as done`. Why: the M1 tasks are done and the manual check passed in Arc and Chrome. What: tick the M1 boxes in `PLAN.md`; record the check and close the plan in `tasks.md`.

## Coverage

| Criterion         | Tasks                 |
| ----------------- | --------------------- |
| R1.1              | T1, T15               |
| R1.2, R1.3        | T1, T15               |
| R1.4              | T14, T15              |
| R1.5              | T18 (T19 if fallback) |
| R1.6              | T14, T18              |
| R1.7              | T18                   |
| R2.1              | T8, T14, T17          |
| R2.2              | T10, T15              |
| R2.3              | T9, T16               |
| R2.4              | T10, T16              |
| R2.5              | T9, T14, T16          |
| R2.6              | T9, T14, T16          |
| R3.1              | T6, T7, T16           |
| R3.2              | T6, T7, T14, T16      |
| R3.3              | T14                   |
| R3.4, R3.5        | T7, T14, T16          |
| R3.6              | T6, T7, T16           |
| R3.7              | T8, T9, T14, T16      |
| R4.1, R4.2        | T3, T4, T10           |
| R4.3              | T4, T10               |
| R4.4, R4.6, R4.9  | T4                    |
| R4.5, R4.7, R4.10 | T10                   |
| R4.8              | T10, T15              |
| R5.1, R5.2        | T2, T13               |
| R5.3              | T2                    |
| R5.4              | T3, T5                |
| R5.5              | T3, T5, T13           |
| R6.1–R6.6         | T5, T13, T17          |
| R6.7              | T11, T17              |
| R6.8              | T11, T13, T17         |
| R6.9, R6.10       | T11                   |
| R7.1–R7.4         | T12, T17              |
| R7.5              | T11, T17              |
| R7.6              | T12                   |
| NFR1.1            | T12 (cache), T19      |
| NFR1.2            | T11, T19              |
| NFR2.1            | T11, T14, T17         |
| NFR3.1            | T19                   |
| NFR3.2            | T5                    |
| NFR3.3            | T15, T19              |
| NFR4.1            | T14, T15              |
| NFR5.1            | every task, T19       |

R5.5 has two halves: the trie rejects clashing defaults (T3, T5), and every default names a registered command (the `CommandName` type plus T13's test in `src/settings/defaults.test.ts`, which stands in for the design's `registry.test.ts` line).

## Open questions

- None. T19's manual check needs the user at the keyboard in Arc and Chrome; executing it pauses for them.

## Review notes

- Pass 1: created the plan, 19 tasks. Checked the repo (M0 code, configs, jsdom 30 and WXT 0.21 behavior) and fixed four interface gaps the design leaves open (see _Open questions_). Constants are added by the tasks that first use them so Knip stays green. Needs deep review, especially T11, T12 (jsdom stubbing), T14 (composition and size limits), T17 (timing tests in CI) and T18 (the reload e2e and the permission check).
- Pass 2 (integrate, round 1): replaced T1–T19 with the task-mode proposals (all READY). Reconciled across tasks:
  - The four interface gaps are in `design.md` (b3bf075), so the "provisional" notes are gone; the `PLAN.md` re-injection line is a user decision (T18 adds it ticked). _Open questions_ is empty.
  - T11 leaves `Scroller` unexported (Knip); T13 now adds the `export` and lists `src/core/scroll/scroller.ts` in its _Files_.
  - jsdom's `document.scrollingElement` is `undefined`, not `null` (T12, T14); the jsdom, Knip, ESLint (`*.spec.ts` not exempt from size rules) and commitlint facts the reviewers checked are now in _Project state_.
  - T4 already has `waits after a count digit` (`5` → `pending`, count `'5'`), which T10's timeout tests rely on.
  - T15 owns `tests/e2e/fixtures/pages.ts`: unexported `PAGES` `as const`, `openPage(context, name, { reducedMotion = true } = {})`, `readSeen`, the `declare global` `Window` block, and the `article` (3000 px wide × 5000 px tall) and `recorder` pages, each starting with `<!doctype html>`. T16 now reads the recorder through `readSeen` with T15's `type:key:defaultPrevented` entries and wraps its pages the same way; T17 and T18 use `article` as defined there.
  - T10's subject is lowercase (`Add: normal mode …`), T16's and T17's start with `add`; T10's _Depends on_ gained T1, T3, T5. Every task's steps now end with the `tasks.md` status update in the same commit.
  - Coverage table refined (R2.5, R3.2, R4.3, R6.8, NFR1.2, NFR2.1, NFR3.3 rows). Checked every dependency points backward.
