# Link hints — Tasks

**Spec:** [requirements.md](requirements.md) · [design.md](design.md)
**Verdict:** ITERATE — pass 3, 2026-11-23

## Status log

### Current status

- **Phase:** executing (T10 done)
- **Next task:** T11 — Let i finish a mapped key sequence in Normal mode
- **Blocked by:** nothing
- **Last updated:** 2026-11-23 by executor (T10)

### Agreements

- 2026-11-22 — One spec for all of M3; `F` opens the link in a background tab; typing matches labels only, not link text; several `F` presses keep their order; `area` links are dropped; a rich-text editor is one text input that `f` can hint; R7.2 ends Hint mode only on scrolls that move hinted elements (user, requirements.md "Your decisions").
- 2026-11-22 — Every task's commit also flips its marker to `[x] done`, sets _Next task_ and adds a dated _History_ line naming the commit subject. Commit subjects start lowercase after the colon, are imperative and 20–80 characters long (CONTRIBUTING, commitlint) (review).
- 2026-11-23 — Provisional (planner, user not asked): `watchPage` takes the hinted elements, `(deps, hinted, onChange) => stop`, because the design's `(onChange) => stop` can't tell whether a scrolled element contains a hinted one (R7.2). It lives in `src/core/hints/page-watch.ts`, and its scroll rule is `hinted.some((element) => composedContains(target, element))`, not `target.contains(hinted)`, so it crosses shadow roots. `createHintMode`'s deps also differ from the design's signature (`stopScrolling`, `watchPage`, `perform`, and `machine: Pick<ModeMachine, 'enter'>`).
- 2026-11-23 — Provisional (planner, user not asked): placements that differ from the design's file list so the gates pass. `HINT_COMMAND_NAMES` stays private in `registry.ts` (an import cycle with `commands/hints.ts` would hit the TDZ at module load). `HintAction` lives in `hints/actions.ts`, because it lands before `modes/hint.ts`. `HINT_ALPHABET` lives only in `settings/defaults.ts`; a re-export from `labels.ts` would be an unused export for Knip. `CLICKABLE_SELECTOR` is private to `clickable.ts` (a[href], label, `[tabindex]` and `[contenteditable]` are checked in code, not through the selector). `isDisabled` (`:disabled`, `aria-disabled="true"`, inside `[inert]`) is exported from `clickable.ts` as the one disabled check, and T8 uses it instead of the design's actions text `:disabled`.
- 2026-11-23 — Provisional (planner, user not asked): `TabsApi.create`'s `index` is optional (`index?: number`), because the design types it as required but also creates the tab without an index (T6).
- 2026-11-23 — Provisional (planner, user not asked): `copyableLink` also requires `isClickable`, so disabled and inert links get no `yf` hint (R1.2); this goes beyond the design's wording (T4).
- 2026-11-23 — Provisional (planner, user not asked): `generateLabels` throws `RangeError` for an alphabet of fewer than 2 letters (T1). If the user declines, remove the guard, its test and the step-5 sentence, and document `alphabet.length >= 2` as a precondition.
- 2026-11-23 — Provisional (planner, user not asked): `i` in Normal mode finishes a pending mapped sequence (only `gi` today) and still enters sticky Insert mode in every other case (`i`, `3i`, `yi`, an unmapped `gx` then `i`), because Normal mode checks `i` before parsing keys and `gi` would otherwise never reach `focusInput` (T11).
- 2026-11-23 — Provisional (planner, user not asked): Arc reversing the order of several `F` tabs (it drops `openerTabId`) is a known Arc limitation, not a failure; Chrome must keep the order (T16 item 3).
- 2026-11-23 — Provisional (planner, user not asked): NFR1.1 and NFR1.2 are timed by hand on a real GitHub pull request diff only. The Playwright-only `many` fixture can't be loaded by hand, so it keeps an untimed smoke test (T15). The user runs the T16 manual check and reports each result in chat.
- 2026-11-23 — Provisional (planner, user not asked): if full-suite e2e runs hang on Chromium launch on this machine (as in M2), run the new spec alone with `npx playwright test <name> --workers=1` and record that in _History_.
- 2026-11-23 — Provisional (planner, user not asked): the e2e tests are split across `hints.spec.ts` (T14) and `hint-actions.spec.ts` (T15) because of the 300-line file limit, against the design's single file. Their shared helpers (`openHints`, `press`, `hintHost`, `readEvents`, `readClicks`, `expectOnlySentinel`, `nextFrames`, `pageState`) live in `tests/e2e/fixtures/hints.ts`, created by T14; page markup, `HINTS_URL` and `OPENED_URL` stay in `fixtures/pages.ts`.
- 2026-11-23 — Provisional (planner, user not asked): T10 stays one commit (the plan's largest) because every split leaves the tree red; the focus watcher and `stop()` guard are a separate task, T13, after the commands task T12.
- 2026-11-23 — Provisional (executor, T8): simulated mouse events carry no `view`, because jsdom rejects a Window as the view of any mouse or pointer event. Page code does not depend on `view`, so the design's `view` property is left out.

### History

- 2026-11-22 — planner: pass 1, created 14 tasks (T1–T14).
- 2026-11-23 — planner: pass 2, integrated the task-mode proposals for T1–T14 (round 1, run by hand because the Workflow tool was unavailable); split T11 into T11 (`i` finishes a mapped sequence) and T12 (the hint commands) and renumbered the old T12–T14 to T13–T15; 15 tasks.
- 2026-11-23 — planner: pass 3, round 2 re-reviewed T10–T14; merged the five proposals; kept T10 as one commit; split T12 into T12 (commands) and new T13 (`followFocus`, `stop()` guard, R7.2/R7.3/R7.7/NFR4.1 tests); renumbered the e2e tasks to T14 and T15 and the manual check to T16; 16 tasks.
- 2026-11-23 — executor: T1 done in "Add: hint label generator and prefix matching". Deviations: `generateLabels` expands with a `for…of` loop over the queue instead of an index, so the unreachable `?? ''` fallback doesn't count against the 100% branch target for `labels.ts`; the test helper uses `Array.from` and `localeCompare` to satisfy lint.
- 2026-11-23 — executor: T2 done in "Add: rules for clickable elements, text inputs and link URLs". `linkUrl` keeps a `?? ''` fallback that `isLink` makes unreachable (branch 97.7% in `clickable.ts`; the global 80% target holds).
- 2026-11-23 — executor: T3 done in "Add: geometry adapter for layout reads and hit tests". `deepestAt` tests `!root` before reading the inner element, and uses `inner?.getRootNode()` to satisfy lint; behaviour is unchanged.
- 2026-11-23 — executor: T4 done in "Add: finder for visible hint targets". The `instanceof Element` guard in `collect` is unreachable (the walker shows elements only); kept for the types, global coverage holds.
- 2026-11-23 — executor: T5 done in "Add: hint overlay in a closed shadow root". Template literals take `px()` strings (lint `restrict-template-expressions`); sizes are read in one batch of `measured` entries, not a separate array index.
- 2026-11-23 — executor: T6 done in "Add: openTab message that opens a background tab". The router dispatches with an exhaustive switch (`dispatch`), and `createOpenTabHandler` returns the handler through a typed const. `npm run build` keeps the permissions at scripting, sessions and webNavigation.
- 2026-11-23 — executor: T7 done in "Add: openTab in the message client that never throws". `sendCommand` and `openTab` share one `deliver` helper, so the existing tests cover the refactor.
- 2026-11-23 — executor: T8 done in "Add: hint actions that click, open in a tab or copy a link". Deviation: no `view` on the simulated events (see Agreements). `canTakeFocus` reads "natively focusable" as tabIndex 0 or more, or any element with a tabindex attribute.
- 2026-11-23 — executor: T9 done in "Add: page watcher that ends hints on scroll, resize and blur". The window blur is recognised by a non-Node target, because the window object seen by the listener is not identical to the global `window` in jsdom.
- 2026-11-23 — executor: T10 done in "Add: hint mode that narrows and picks hints as labels are typed". Hint mode is registered but nothing starts it until T12 adds the keys, so the controller hint wiring (overlay, actions, watcher) has no unit coverage yet (controller.ts 84% lines, global threshold holds); T12 covers it through `f`.

## Project state

As of pass 3 (branch `m3-link-hints`, head `8789e70 Docs: add the link hints spec`, clean tree):

- M0, M1 and M2 are done and ticked in `PLAN.md`; M3's six boxes are unticked.
- `node_modules/` and `.wxt/` don't exist yet. `src/tsconfig.json` extends `../.wxt/tsconfig.json`, which `npm install` creates through `postinstall` (`wxt prepare`). T1 starts with `npm install`. The e2e tasks may also need `npx playwright install chromium`.
- Exists and is relied on:
  - `src/core/mode-machine.ts`: `MODE_NAMES = ['normal', 'insert']`; `createModeMachine` throws `Missing mode: <name>` when a name has no mode, so adding `'hint'` and registering Hint mode must land together (T10). `mode-machine.test.ts`'s `setup()` builds a machine from fake `normal` and `insert` modes only.
  - `src/core/commands/registry.ts`: `SCROLL_COMMAND_NAMES` (exported), `PAGE_COMMAND_NAMES` (private), `COMMAND_NAMES = [...SCROLL, ...PAGE, ...BACKGROUND_COMMAND_NAMES]`, `onceOnly`, `createCommandRegistry` (throws `Missing command`, clears the count when `acceptsCount` is false). Every test that builds a full registry either derives fakes from `COMMAND_NAMES` (`registry.test.ts`, `navigation.test.ts`, `background.test.ts`) or lists the factories (`defaults.test.ts`, `controller.ts`).
  - `src/core/controller.ts` (144 lines): `ControllerDeps` has `window`, `timer`, `frames`, `now`, `isValid`, `isTrusted`, `shadowRootOf`, `prefersReducedMotion`, `page: PageActions`, `client: Pick<MessageClient, 'sendCommand'>`. `createModes` builds a forwarding `switcher` to the machine declared later; the focus watcher callback calls `machine.enter(editable ? 'insert' : 'normal')` unless sticky; `stop()` removes listeners, stops the tracker and scroller and resets Normal mode.
  - `src/core/controller.test.ts` (456 lines): module-level `vi.fn` fakes cleared in `beforeEach`, `start(overrides)`, `press(key, init)`, `flushFrames(at)` over a fake frame queue, `addInput()`; `afterEach` stops the controller and empties `document.body`.
  - `src/core/editable.ts`: `ShadowRootOf`, `isEditable`, `deepActiveElement`; the text input type set `TEXT_INPUT_TYPES` is private today (T2 exports it for `clickable.ts`). `src/core/focus-watcher.ts`: `watchFocus(win, shadowRootOf, onChange)`.
  - `src/core/key-notation.ts`: modifiers are written in the order `C-`, `A-`, `S-` (special keys only), `D-`; `Escape` → `<Esc>`, `Backspace` → `<BS>`, `Enter` → `<CR>`, space → `<Space>`, `<` → `<lt>`; `Ctrl+[` → `<C-[>`.
  - `src/core/scroll/scroller.ts`: `FrameScheduler`, `Scroller.stop()`.
  - `src/messaging/protocol.ts`: `Message` is one interface (`type: 'runCommand'`); `isMessage` reads `value as Record<string, unknown>`. `src/messaging/router.ts`: `MessageHandlers` is a mapped type over `Message['type']`, and `handle` calls `deps.handlers[message.type](message, ctx)`, which won't type-check once `Message` is a union, so T6 switches on `message.type`. `router.test.ts` has a never-called `@ts-expect-error` arrow for `handlers: {}`. `src/messaging/client.ts`: `MessageClient.sendCommand` only.
  - `src/background/tabs.ts`: `TabInfo { id?, index }`, `TabsApi { query, update, remove, duplicate }`, private `sortedTabs` and `positionOf`; `tabs.test.ts` and `handlers.test.ts` build full `TabsApi` literals, so adding `create` updates both. `src/background/handlers.ts`: `createBackgroundRouter` builds `{ runCommand }`. `src/entrypoints/background.ts` passes `chrome.*` arrows.
  - `src/settings/defaults.ts`: 25 `DEFAULT_KEYMAP` entries; `defaults.test.ts` keeps `EXPECTED`, a length check, the `g`/`y` prefix test, the no-`Cmd` test (`/^<(?:[CAS]-)*D-/`) and a registry built from the scroll, navigation and background factories.
  - `src/entrypoints/content.ts`: builds the controller with an inline `shadowRootOf` (`chrome.dom.openOrClosedShadowRoot` while `ctx.isValid`), calls `controller.stop()` on `ctx.onInvalidated`.
  - `src/manifest.test.ts` asserts permissions are exactly `scripting`, `sessions`, `webNavigation`.
  - e2e: `tests/e2e/fixtures.ts` (persistent Chromium context with the built extension; exports `test`, `expect`); `tests/e2e/fixtures/pages.ts` (80 lines: `PAGES` record with `RECORDER` script, `openPage(context, name)` routes `https://example.test/<name>` per page, `readSeen`, `openAt`; `Window` global has `seen`, `closedInput`, `marker?`). `tabs.spec.ts` reads tabs from the service worker with a local `declare const chrome`. No existing e2e spec presses `f`, `F` or `gi`; `q` and `z` are unmapped.
- `src/core/modes/normal.ts` checks `press.key === 'i'` before it parses the key, so today `g` then `i` drops the `g` and enters sticky Insert mode (pinned by `normal.test.ts`). `gi` is unreachable until T11.
- Missing (created by this plan): `src/core/hints/` (labels, clickable, geometry, finder, actions, page-watch), `src/core/modes/hint.ts`, `src/core/commands/hints.ts`, `src/ui/` (shadow-root, hints), `tests/e2e/hints.spec.ts`, `tests/e2e/hint-actions.spec.ts`, `tests/e2e/fixtures/hints.ts`.
- Tooling facts every task must respect (checked in the configs):
  - **Knip** (`entry: src/entrypoints/**/*.ts`, `project: src/**/*.ts`): every export, types included, must be imported by another file (its own test counts) at the commit that adds it. Don't export what only its own file uses.
  - **ESLint:** `strictTypeChecked` + `stylisticTypeChecked`, SonarJS recommended, `no-unsanitized` (no `innerHTML`; build DOM with `createElement`/`textContent`), `explicit-module-boundary-types`, `consistent-type-imports`, `switch-exhaustiveness-check`, no default exports outside entrypoints, `no-console` (except warn/error, and none is used), complexity 10, cognitive 15, depth 3, 4 params, 60 lines per function, 300 per file. Size limits are off only for `*.test.ts`; e2e specs and `tests/e2e/fixtures/pages.ts` must stay under them. Keep `vi.fn` mocks in their own variables and pass methods as arrows.
  - **TypeScript:** strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` (optional props that may hold `undefined` are `?: T | undefined`), `verbatimModuleSyntax`, `noUnusedLocals`/`noUnusedParameters`, `src` has DOM + `chrome` types and no Node types. `tsc -p src` includes the tests, so `@ts-expect-error` lines are checked by `npm run typecheck`.
  - Imports in `src/core` are relative; elsewhere `@/` maps to `src/`. WXT `imports: false`, so every import is explicit.
  - **Vitest:** jsdom, `restoreMocks: true`, includes `src/**/*.test.ts`; coverage (80% lines, functions, branches, statements, global) over `src/**/*.ts` except tests and `src/entrypoints/**`. jsdom has no layout (`getClientRects` is empty, `offsetWidth` is 0), no `checkVisibility`, no `elementFromPoint`, no `showPopover`; it does have `attachShadow`, `TreeWalker`, `HTMLLabelElement.control`, `:disabled`, and checkbox click activation.
  - **Prettier:** `singleQuote`, `printWidth: 100`; it also checks Markdown, so tables in docs stay aligned.
  - Commit titles: `<Type>: <subject>`, 20–80 chars, lowercase imperative subject (commitlint rejects a first word ending in "ed"), no final period; `Why:` and `What:` sections; body lines ≤ 80 chars; no AI attribution.

## Tasks

### T1: Add the hint label generator and prefix matching — [x] done

- **Requirements:** R2.1–R2.5, R3.1–R3.3 (matching only) · **Design:** Labels
- **Depends on:** —
- **Files:** create `src/core/hints/labels.ts`, `src/core/hints/labels.test.ts`; modify `src/settings/defaults.ts`, `docs/specs/2026-11-22-link-hints/tasks.md` (status log only)
- **Tests first:** in `src/core/hints/labels.test.ts`, importing `describe`, `expect`, `it` from `vitest`; `generateLabels`, `matchPrefix`, `type PrefixMatch` from `./labels`; `HINT_ALPHABET` from `../../settings/defaults`. A module-level helper `labelProblems(labels: readonly string[], count: number, alphabet: string): string[]` contains no `expect`. It returns one message per broken rule, and every test asserts `expect(labelProblems(...)).toStrictEqual([])` itself, so SonarJS `assertions-in-tests` sees an assertion. Rules:
  - `labels.length !== count` → `'count'`.
  - `new Set(labels).size !== labels.length` → `'duplicate'` (R2.4).
  - a label holding a character that isn't in `alphabet` → `'alphabet: <label>'` (R2.1).
  - prefix-free: sort a copy (`[...labels].sort()`); for each neighbour pair where `next.startsWith(current)` → `'prefix: <current> <next>'` (R2.2). In sorted order a prefix always sits right before some label that starts with it, so neighbours are enough.
  - length bound: `let max = 1; while (alphabet.length ** max < count) max += 1;`. Any label longer than `max` → `'too long: <label>'`. When `count <= alphabet.length`, any label longer than 1 → `'not one letter: <label>'` (R2.3). The bound starts at 1, so count 1 isn't held to length 0.

  Test cases:
  - `uses the M3 hint alphabet` — `HINT_ALPHABET` is `'sadfjklewcmpgh'` (R2.1).
  - `gives no labels for no targets` — `generateLabels(0, HINT_ALPHABET)` and `generateLabels(-1, HINT_ALPHABET)` are `[]`.
  - `gives one letter per target up to the alphabet size` — count 1 is `['s']`; count 14 is `[...HINT_ALPHABET]` (R2.3).
  - `expands the first letter when one more label is needed` — count 15 is `['a', 'd', 'f', 'j', 'k', 'l', 'e', 'w', 'c', 'm', 'p', 'g', 'h', 'ss', 'sa']` (R2.3).
  - `uses only two letters for 196 targets` — `generateLabels(196, HINT_ALPHABET).filter((label) => label.length !== 2)` is `[]` (R2.3).
  - `uses three letters only where needed for 197 targets` — the labels of count 197 with length 3 are exactly `['sss', 'ssa']` (R2.3).
  - `uses three letters for 2,744 targets` — the labels of count 2744 with a length other than 3 are `[]` (R2.3).
  - `keeps %i labels short, distinct and prefix-free` — `it.each([1, 2, 13, 14, 15, 100, 196, 197, 300, 2744])`: `labelProblems(generateLabels(count, HINT_ALPHABET), count, HINT_ALPHABET)` is `[]` (R2.1–R2.4).
  - `works with a small alphabet` — `generateLabels(3, 'ab')` is `['b', 'aa', 'ab']` and `generateLabels(5, 'ab')` is `['ab', 'ba', 'bb', 'aaa', 'aab']`; `labelProblems` is `[]` for both.
  - `rejects an alphabet with fewer than two letters` — `expect(() => generateLabels(2, 'a')).toThrow(RangeError)` and `expect(() => generateLabels(1, '')).toThrow(RangeError)` (provisional, see Open questions).
  - `matchPrefix(labels, %j)` — `it.each<readonly [string, PrefixMatch]>` over the labels `['a', 'd', 'ss', 'sa']`, compared with `toStrictEqual`:
    - `''` → `{ kind: 'partial', visible: [0, 1, 2, 3] }`
    - `'s'` → `{ kind: 'partial', visible: [2, 3] }` (R3.1)
    - `'S'` → `{ kind: 'partial', visible: [2, 3] }` (R2.5)
    - `'sa'` → `{ kind: 'exact', index: 3 }` (R3.2)
    - `'SA'` → `{ kind: 'exact', index: 3 }` (R2.5)
    - `'a'` → `{ kind: 'exact', index: 0 }` (R3.2)
    - `'x'`, `'sx'` and `'ssa'` → `{ kind: 'none' }`

    The `<BS>` re-match of R3.3 is `matchPrefix` on the shorter prefix, so it is covered by the `''` and `'s'` rows.

- **Steps:**
  1. Run `npm install` (it creates `node_modules/` and `.wxt/`), then run `npm run check` on the clean tree to confirm the baseline passes.
  2. Write the tests. They fail because `./labels` doesn't exist.
  3. In `src/settings/defaults.ts`, after `SCROLL_STEP_X`, add:
     `/** The letters hint labels are made of (R2.1). M5 makes it a setting. */`
     `export const HINT_ALPHABET = 'sadfjklewcmpgh';`
  4. Create `src/core/hints/labels.ts`. It imports nothing and has exactly three exports: the design's `PrefixMatch` union (each member's fields `readonly`), `generateLabels(count: number, alphabet: string): readonly string[]` and `matchPrefix(labels: readonly string[], prefix: string): PrefixMatch`. Each has a doc comment.
  5. `generateLabels`:
     - If `count <= 0`, return `[]`.
     - If `alphabet.length < 2`, throw `new RangeError('The hint alphabet needs at least two letters')`. With fewer letters the expansion never grows. The doc comment says that the letters must be distinct.
     - `const queue: string[] = [...alphabet]; let next = 0;`
     - `while (queue.length - next < count)`: take `const head = queue[next] ?? ''`, do `next += 1`, then `for (const letter of alphabet) queue.push(head + letter);`.
     - Return `queue.slice(next, next + count)`.

     This is the design's breadth-first expansion. It starts from the letters instead of `['']`, which gives the same output, and it skips `shift()`. A comment says the result is prefix-free because only unexpanded labels are returned.

  6. `matchPrefix`:
     - `const typed = prefix.toLowerCase(); const exact = labels.indexOf(typed);`
     - If `exact !== -1`, return `{ kind: 'exact', index: exact }`.
     - Otherwise `const visible = labels.flatMap((label, index) => (label.startsWith(typed) ? [index] : []));`. Return `visible.length === 0 ? { kind: 'none' } : { kind: 'partial', visible }`.

     No label is `''`, so an empty prefix is always `partial` with every index.

  7. Run `npm run check`. Then, in `tasks.md`, flip this marker to `[x] done`, set _Next task_ to T2 and _Last updated_, and add a dated _History_ line naming the commit subject. Run `npx prettier --check docs/specs/2026-11-22-link-hints/tasks.md`.
- **Done when:** the new tests pass, `labels.ts` has 100% line and branch coverage, and `npm run check` passes. Knip passes because the test imports all three `labels.ts` exports and `HINT_ALPHABET`. T10 imports `generateLabels`, `matchPrefix` and `HINT_ALPHABET` in product code later.
- **Commit:** `Add: hint label generator and prefix matching`. Body: `Why:` hint mode needs short, prefix-free labels and case-insensitive matching (R2, R3). `What:` one bullet each for `HINT_ALPHABET` in defaults, `generateLabels`, `matchPrefix` with its tests, and the tasks.md status update.

### T2: Add the clickable, text input and link URL rules — [x] done

- **Requirements:** R1.1, R1.2 (disabled), R1.4 (label control), R1.5 (iframe), R1.6, R4.3, R4.6 (disabled check), R5.2, R5.3, R5.5, R6.1, NFR3.2 · **Design:** Clickable rules; decision "`aria-disabled` and `inert` count as disabled"
- **Depends on:** —
- **Files:** create `src/core/hints/clickable.ts`, `src/core/hints/clickable.test.ts`; modify `src/core/editable.ts` (export `TEXT_INPUT_TYPES`)
- **Tests first:** in `src/core/hints/clickable.test.ts`, import `{ isClickable, isCopyableUrl, isDisabled, isOpenableUrl, isTextInput, linkUrl }` from `./clickable`. Helpers:
  - `add(tag, attributes = {}, parent: Node = document.body)`: copy `editable.test.ts`'s generic helper (createElement, setAttribute, appendChild, no `innerHTML`).
  - `addNs(namespace: string, tag: string, attributes: Record<string, string> = {}, parent: Node = document.body): Element`: the same with `createElementNS`.
  - constants `SVG_NS = 'http://www.w3.org/2000/svg'` and `MATHML_NS = 'http://www.w3.org/1998/Math/MathML'`.
  - Tables are typed `const rows: readonly (readonly [string, () => Element])[]` and run with `it.each(rows)('… %s', (_name, build) => { … })`.
  - `beforeEach` appends a `base` element with `href="https://x.test/dir/page"` to `document.head`. `afterEach` removes it and calls `document.body.replaceChildren()`.
  - `isClickable` is true for (R1.1):
    - `a href="/x"`; an SVG `a href="/x"` inside an SVG `svg` (via `addNs`);
    - `button`; `input` with no type; `input type=checkbox`; `textarea`; `select`; `summary`;
    - a `div` with each role `button`, `link`, `checkbox`, `radio`, `tab`, `menuitem`, `option`, `switch`;
    - `div onclick="x"`; `div tabindex="0"`; `span tabindex="3"`; `button tabindex="-1"` (still a button);
    - `div contenteditable=""`, `"true"` and `"plaintext-only"`; an `a href` inside a contenteditable host;
    - a `label` wrapping an `input`; a `label for="x"` with an `input id="x"` elsewhere in the body (R1.4);
    - a `label onclick="x"` with no control (it falls through to the general rules).
  - `isClickable` is false for (R1.2, R1.5):
    - `a` without `href`; a MathML `a href="/x"` (via `addNs`); plain `div` and `span`;
    - `input type=hidden` and `type=HIDDEN`;
    - `button disabled`; `input disabled`; an `input` inside a `fieldset disabled`; `button aria-disabled="true"`; an `a href` inside a `div inert`;
    - `div tabindex="-1"`, `tabindex="abc"` and `tabindex=""`;
    - a `label` with text only; a `label for="missing"`; a `label` wrapping a disabled `input`;
    - `iframe`; `iframe tabindex="0"`;
    - `div contenteditable="false"` and `"FALSE"`; a `p` inside a contenteditable host; a `span contenteditable="true"` inside a contenteditable host (not a host).
  - `isTextInput` is true for (R6.1, R4.3):
    - `input` with no type, and with each type `text`, `search`, `email`, `url`, `tel`, `password`, `number`, `date`, `FOO` (an unknown type is text, as in M1's `isEditable`);
    - `textarea`; a `div contenteditable=""` host;
    - a `div contenteditable="true"` appended straight to an open shadow root (no parent element);
    - a `span contenteditable="true"` inside a `div contenteditable="false"` inside an editor (an editable island is its own host).
  - `isTextInput` is false for:
    - `input` types `checkbox`, `radio`, `button`, `submit`, `hidden`; `select`; `div`;
    - a `p` inside an editor; a nested `contenteditable="true"` element inside an editor;
    - `input disabled`; `textarea disabled`; a `div contenteditable=""` with `aria-disabled="true"`; `div contenteditable="false"`.
  - `isDisabled` is true for `button disabled`, an `input` inside a `fieldset disabled`, `div aria-disabled="true"`, and a `span` inside a `div inert`. It is false for a plain `button`, `div aria-disabled="false"` and `a href` (R1.2, R4.6).
  - `linkUrl` takes a table `readonly (readonly [string, () => Element, string | undefined])[]` and asserts `expect(linkUrl(build())?.href).toBe(expected)`:
    - relative `a href="other?q=1"` → `'https://x.test/dir/other?q=1'`;
    - absolute `a href="https://y.test/a"` → `'https://y.test/a'`;
    - `a href=""` → `'https://x.test/dir/page'`;
    - `a href="mailto:a@b.test"` → `'mailto:a@b.test'`;
    - SVG `a href="/svg"` → `'https://x.test/svg'`;
    - MathML `a href="/m"` → `undefined`; `a` without `href` → `undefined`; `button` → `undefined`;
    - `a href="https://["` → `undefined` (unparseable, no throw).
  - `isCopyableUrl` (R5.3): true for `new URL('http://x.test/')`, `https://x.test/`, `mailto:a@b.test` and `file:///tmp/a`. False for `javascript:void(0)`, `data:text/plain,x`, `ftp://x.test/`, `about:blank` and `chrome://settings`.
  - `isOpenableUrl` (R5.2, R5.5, NFR3.2): true for `http://x.test/` and `https://x.test/`. False for `mailto:a@b.test`, `file:///tmp/a` and `javascript:void(0)`.
- **Steps:**
  1. Write the tests. They fail because `./clickable` doesn't exist.
  2. `src/core/editable.ts`: add `export` to `const TEXT_INPUT_TYPES` and change nothing else. `editable.test.ts` is unchanged.
  3. Create `src/core/hints/clickable.ts` with `import { TEXT_INPUT_TYPES } from '../editable';`. Add these private constants:
     - `HTML_NS = 'http://www.w3.org/1999/xhtml'` and `SVG_NS = 'http://www.w3.org/2000/svg'`;
     - `CLICKABLE_SELECTOR = 'button, input, textarea, select, summary, [role=button], [role=link], [role=checkbox], [role=radio], [role=tab], [role=menuitem], [role=option], [role=switch], [onclick]'`. Its comment says the design's `a[href]`, `label`, `[tabindex]` and `[contenteditable]` entries need code and are checked by `isLink`, the label rule, `hasTabStop` and `isEditorHost`;
     - `COPYABLE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:', 'mailto:', 'file:'])` and `OPENABLE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:'])`.
  4. Private helpers, each with an explicit return type:
     - `isLink(element: Element): boolean`: `element.localName === 'a' && (element.namespaceURI === HTML_NS || element.namespaceURI === SVG_NS) && element.hasAttribute('href')`. Don't check `SVGAElement`, which jsdom may lack.
     - `isEditableValue(value: string | null): boolean`: `value !== null && value.toLowerCase() !== 'false'`.
     - `isEditorHost(element: Element): boolean`: `isEditableValue(element.getAttribute('contenteditable'))`, and the nearest editable ancestor is missing or `'false'`. Compute it as `const outer = element.parentElement?.closest('[contenteditable]') ?? null;` then `outer === null || !isEditableValue(outer.getAttribute('contenteditable'))`. A comment says `isContentEditable` isn't in jsdom (as in `editable.ts`).
     - `hasTabStop(element: Element): boolean`: `const value = element.getAttribute('tabindex'); return value !== null && Number.parseInt(value, 10) >= 0;`. `NaN` fails the comparison.
  5. `export function isDisabled(element: Element): boolean`. Its doc comment says: `:disabled`, `aria-disabled="true"`, or inside `[inert]` (design decision, R1.2, R4.6), and that `closest` doesn't cross shadow roots, which is accepted for M3. Body: `element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true' || element.closest('[inert]') !== null`.
  6. `export function isClickable(element: Element): boolean`, with the design's doc comment. Checks, in order:
     1. `element.localName === 'iframe'` → `false` (R1.5).
     2. `isDisabled(element)` → `false`.
     3. `element instanceof HTMLInputElement && element.type === 'hidden'` → `false`.
     4. `element instanceof HTMLLabelElement && element.control !== null && !isDisabled(element.control)` → `true` (R1.4).
     5. Otherwise return `isLink(element) || element.matches(CLICKABLE_SELECTOR) || hasTabStop(element) || isEditorHost(element)`.
  7. `export function isTextInput(element: Element): boolean`, with the design's doc comment. Checks, in order:
     1. `isDisabled(element)` → `false`.
     2. An `HTMLInputElement` → `TEXT_INPUT_TYPES.has(element.type)`.
     3. An `HTMLTextAreaElement` → `true`.
     4. Otherwise → `isEditorHost(element)`.
  8. `export function linkUrl(element: Element): URL | undefined`, with the design's doc comment.
     - Return `undefined` unless `isLink(element)`.
     - `const href = element.getAttribute('href') ?? '';`. `isLink` already checked the attribute, and `?? ''` keeps the types narrow without a non-null assertion.
     - `try { return new URL(href, element.baseURI); } catch { /* A page's bad href is not an error: there is just no URL. */ return undefined; }`, the same pattern as `src/core/url.ts`.
  9. `export function isCopyableUrl(url: URL): boolean` → `COPYABLE_PROTOCOLS.has(url.protocol)`, doc comment R5.3. `export function isOpenableUrl(url: URL): boolean` → `OPENABLE_PROTOCOLS.has(url.protocol)`, doc comment R5.2, NFR3.2.
  10. Run `npm run test -- src/core/hints/clickable.test.ts`, then `npm run check`.
- **Done when:**
  - the new tests pass and `editable.test.ts` still passes;
  - `npm run check` passes. Knip: the test imports all six exports of `clickable.ts`, and `clickable.ts` imports `TEXT_INPUT_TYPES`. T4 later imports `isClickable`, `isTextInput`, `linkUrl` and `isCopyableUrl`; T8 imports `isDisabled`, `isTextInput`, `linkUrl` and `isOpenableUrl`.
- **Commit:** `Add: rules for clickable elements, text inputs and link URLs`. In the same commit, flip this marker to `[x] done`, set _Next task_ to T3 and add a dated _History_ line naming the subject.

### T3: Add the geometry adapter — [x] done

- **Requirements:** R1.1 (shadow descent of the hit test), R1.2 (`isRendered`, rects, viewport), R1.3 (`hitTest`), R2.6 (viewport for clipping and clamping) · **Design:** Geometry
- **Depends on:** —
- **Files:** create `src/core/hints/geometry.ts`, `src/core/hints/geometry.test.ts`
- **Tests first:** in `src/core/hints/geometry.test.ts`:
  - Imports: `afterEach, beforeAll, describe, expect, it, vi` from `vitest`; `createDomGeometry, type Geometry, type Rect` from `./geometry`; `type ShadowRootOf` from `../editable`.
  - Setup at module level:
    - `const closedRoots = new Map<Element, ShadowRoot>()`, `const shadowRootOf: ShadowRootOf = (host) => closedRoots.get(host) ?? host.shadowRoot`, `const geometry: Geometry = createDomGeometry(window, shadowRootOf)`.
    - `add(tag)` appends a new element to `document.body` and returns it.
    - `stub(target: object, name: string, value: unknown)` calls `Object.defineProperty(target, name, { configurable: true, value })`.
    - Viewport: `let viewWidth = 0; let viewHeight = 0`. `beforeAll` saves `Object.getOwnPropertyDescriptor(window, 'innerWidth')` and the same for `'innerHeight'`. `stubViewport(width, height)` sets both variables and defines `innerWidth` / `innerHeight` on `window` as configurable getters that return them.
    - `afterEach`: restore each saved descriptor with `Object.defineProperty`, or `Reflect.deleteProperty(window, name)` when none was saved. Then `Reflect.deleteProperty(document, 'elementFromPoint')`, `document.body.replaceChildren()`, `closedRoots.clear()`. Stubs on elements and roots go away with the elements.
  - `describe('viewport')`:
    - `reads the layout viewport on every call`: `stubViewport(800, 600)`, then `viewport()` `toStrictEqual({ left: 0, top: 0, width: 800, height: 600 })`. `stubViewport(400, 300)`, then the next `viewport()` returns width 400, height 300 (R1.2, R2.6).
  - `describe('rects')`:
    - `copies each client rect into a plain Rect, in order`: a `span` whose `getClientRects` is stubbed with `() => [{ left: 1, top: 2, width: 3, height: 4, right: 4, bottom: 6, x: 1, y: 2 }, { left: 5, top: 6, width: 7, height: 8, right: 12, bottom: 14, x: 5, y: 6 }]`. `rects(span)` `toStrictEqual` `const expected: readonly Rect[] = [{ left: 1, top: 2, width: 3, height: 4 }, { left: 5, top: 6, width: 7, height: 8 }]`. This means no extra keys (R1.2).
    - `returns no rects for an element without a box`: an unstubbed `span` (jsdom's `getClientRects` is empty) gives `[]`.
  - `describe('isRendered')`:
    - `asks checkVisibility to include opacity and visibility`: `const checkVisibility = vi.fn<Element['checkVisibility']>(() => false)` stubbed on a `div`. `isRendered(div)` is `false`, and `checkVisibility` was called once with `{ opacityProperty: true, visibilityProperty: true }` (R1.2).
    - `returns true when checkVisibility does`: a stub `() => true` gives `true`.
  - `describe('hitTest')`, each test using `const fromPoint = vi.fn<Document['elementFromPoint']>(...)` stubbed on `document`:
    - `returns the document's hit when it has no shadow root`: the stub returns a `button`. `hitTest(5, 6)` is the button, and `fromPoint` was called with `(5, 6)` (R1.3).
    - `returns null when the document hits nothing`: the stub returns `null`, so `hitTest(5, 6)` is `null`.
    - `descends into a closed shadow root`: a host `div` with `attachShadow({ mode: 'closed' })` registered in `closedRoots`, an inner `button` appended to the root, and `const rootFromPoint = vi.fn<ShadowRoot['elementFromPoint']>(() => inner)` stubbed on the root. The document stub returns the host. The result is the inner button, and `rootFromPoint` was called with `(5, 6)` (R1.1, R1.3).
    - `descends through nested roots`: an outer host with an open root holding an inner host, and the inner host with a closed root (registered in `closedRoots`) holding a `button`. The document returns the outer host, the outer root returns the inner host, and the inner root returns the button. The result is the button.
    - `stops at the host when its root hits nothing`: the root stub returns `null`, so the result is the host.
    - `stops at the host when its root returns an element outside it`: `it.each` with two rows. The root stub returns the host itself, or a `span` in `document.body`. The result is the host both times, and the root stub was called exactly once (so the loop ends).
- **Steps:**
  1. Write the tests and run `npx vitest run src/core/hints/geometry.test.ts`. They fail because `./geometry` doesn't exist yet.
  2. Create `src/core/hints/geometry.ts`. `import type { ShadowRootOf } from '../editable'`. Export `Rect` and `Geometry` exactly as in the design, with the design's doc comments, and `export function createDomGeometry(win: Window, shadowRootOf: ShadowRootOf): Geometry` with a one-line JSDoc ("Reads layout from the live DOM; jsdom tests use a fake Geometry instead.").
  3. Return an object literal:
     - `viewport: () => ({ left: 0, top: 0, width: win.innerWidth, height: win.innerHeight })`.
     - `rects: (element) => Array.from(element.getClientRects(), (rect) => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }))`.
     - `isRendered: (element) => element.checkVisibility({ opacityProperty: true, visibilityProperty: true })`.
     - `hitTest: (x, y) => deepestAt(win.document, shadowRootOf, x, y)`.
  4. Add a private `function deepestAt(doc: Document, shadowRootOf: ShadowRootOf, x: number, y: number): Element | null`:
     - `let hit = doc.elementFromPoint(x, y)`.
     - `while (hit !== null)`: `const root = shadowRootOf(hit)` and `const inner = root?.elementFromPoint(x, y) ?? null`. If `inner === null || inner.getRootNode() !== root`, return `hit`. Otherwise `hit = inner`.
     - After the loop, `return null`.
     - Add a comment explaining why: a root retargets hits outside itself to its host (or returns an outer element), and descending only into the root's own tree means every step goes one level deeper, so the loop always ends.
  5. Run `npm run check`. It passes, and coverage for `geometry.ts` is 100%.
- **Done when:** the 12 test cases pass; `npm run check` passes (lint, typecheck, Prettier, Knip, tests with coverage). For Knip, the test imports `createDomGeometry`, `Geometry` and `Rect`; T4, T5, T8 and T10 import them later.
- **Commit:** `Add: geometry adapter for layout reads and hit tests`

### T4: Add the finder for visible hint targets — [x] done

- **Requirements:** R1.1–R1.6, R2.6 (clipping), R5.3, R6.1, NFR1.1 · **Design:** Finder
- **Depends on:** T2 (`isClickable`, `isTextInput`, `linkUrl`, `isCopyableUrl`), T3 (`Geometry`, `Rect`)
- **Files:** create `src/core/hints/finder.ts`, `src/core/hints/finder.test.ts`
- **Tests first:** in `src/core/hints/finder.test.ts`, importing `afterEach`, `beforeEach`, `describe`, `expect`, `it`, `vi` from `vitest`; `composedContains`, `createFinder`, `type Finder`, `type HintTarget`, `type TargetFilter` from `./finder`; `type Geometry`, `type Rect` from `./geometry`; `type ShadowRootOf` from `../editable`.
  - **Fixtures** (module level):
    - `const VIEWPORT: Rect = { left: 0, top: 0, width: 800, height: 600 }`.
    - `const boxes = new Map<Element, readonly Rect[]>()`, `const notRendered = new Set<Element>()`, `const closedRoots = new Map<Element, ShadowRoot>()`.
    - `const shadowRootOf: ShadowRootOf = (host) => closedRoots.get(host) ?? host.shadowRoot`.
    - `topmostAt(x, y): Element | null` returns the element placed last in `boxes` that has any rect with `left <= x < left + width` and `top <= y < top + height`, or `null`. Later elements cover earlier ones.
    - Three fakes, each in its own variable: `const rects = vi.fn<Geometry['rects']>()`, `const isRendered = vi.fn<Geometry['isRendered']>()`, `const hitTest = vi.fn<Geometry['hitTest']>()`.
    - `const finder: Finder = createFinder({ document, shadowRootOf, geometry: { viewport: () => VIEWPORT, rects: (element) => rects(element), isRendered: (element) => isRendered(element), hitTest: (x, y) => hitTest(x, y) } })`.
    - `add(tag, attributes = {}, parent: Node = document.body)` uses `createElement` and `setAttribute`, as in `editable.test.ts` (no `innerHTML`).
    - `place(element, ...list: Rect[])` sets `boxes`.
    - `row(n): Rect` is `{ left: 10, top: 10 + 30 * n, width: 100, height: 20 }`, so placed elements don't overlap unless a test says so.
    - `elementsOf(targets: readonly HintTarget[])` maps the targets to their elements.
  - **Reset:** `beforeEach` calls `mockReset()` on the three fakes, then sets their defaults: `rects.mockImplementation((element) => boxes.get(element) ?? [])`, `isRendered.mockImplementation((element) => !notRendered.has(element))` and `hitTest.mockImplementation(topmostAt)`. Vitest's `restoreMocks` doesn't reset `vi.fn`. `afterEach` runs `document.body.replaceChildren()` and clears `boxes`, `notRendered` and `closedRoots`.
  - **Test cases**, all through `finder.find('clickable')` unless named. Expected elements are compared with `toStrictEqual` on `elementsOf(...)`.
    - `finds visible clickable elements in document order` — an `a href`, a `button` and an `input` at rows 0–2 → `[link, button, input]`, and each target's `rect` `toStrictEqual`s its row (R1.1).
    - `skips elements that are not clickable` — a placed `div` and a placed `a` without `href` → `[]`, and `isRendered` was never called with either (the filter runs first, NFR1.1).
    - `drops elements that are not rendered` — a placed link in `notRendered` → `[]`, and `rects` was never called with it (R1.2, NFR1.1).
    - `drops zero-size elements and elements without a box` — `it.each` over the rects `{ left: 10, top: 10, width: 0, height: 20 }` and `{ left: 10, top: 10, width: 100, height: 0 }`, plus an unplaced link → `[]` (R1.2).
    - `drops elements outside the viewport` — `it.each` over `{ left: 10, top: 600, width: 50, height: 20 }`, `{ left: 800, top: 10, width: 50, height: 20 }`, `{ left: -60, top: 10, width: 50, height: 20 }` and `{ left: 10, top: -30, width: 50, height: 20 }` → `[]`, and `hitTest` was not called (R1.2, NFR1.1).
    - `clips a rect that crosses the viewport edge` — `{ left: -10, top: 590, width: 50, height: 30 }` → rect `{ left: 0, top: 590, width: 40, height: 10 }` (R2.6).
    - `uses the first rect inside the viewport for a wrapped link` — `place(link, { left: 10, top: -40, width: 80, height: 20 }, { left: 10, top: 10, width: 0, height: 20 }, { left: 10, top: 50, width: 80, height: 20 })` → one target whose rect is the third one.
    - `drops an element covered at both points` — a non-clickable `div` placed after the link with the same row → `[]` (R1.3).
    - `drops an element when the hit test finds nothing` — `hitTest.mockReturnValue(null)` → `[]` (R1.3).
    - `keeps an element whose centre is covered but whose corner is not` — the link at row 0 and a `cover` div. `hitTest.mockReturnValueOnce(cover).mockReturnValueOnce(link)` → `[link]`, and `hitTest.mock.calls` `toStrictEqual([[60, 20], [12, 12]])`: the centre, then `(left + 2, top + 2)` (R1.3).
    - `keeps an element when the hit is its descendant` — a link with a child `span`; `hitTest.mockReturnValue(span)` → `[link]` (R1.3).
    - `keeps an element when the hit is inside its shadow root` — a `div tabindex="0"` host with an open root holding a `span`; the host is placed; `hitTest.mockReturnValue(span)` → `[host]`.
    - `keeps shadow content in document order` — `it.each(['open', 'closed'] as const)`: a `before` link, a `div` host whose root (`attachShadow({ mode })`, added to `closedRoots` when closed) holds a `button`, then an `after` link, all placed in rows 0–2 → `[before, button, after]` (R1.1).
    - `walks nested shadow roots` — host A's open root holds host B, whose open root holds a placed `button` → `[button]`.
    - `never hints an iframe` — a placed `iframe` and a placed `iframe tabindex="0"` → `[]` (R1.5).
    - Label rule (R1.4), every element in its own row:
      - `gives one hint to a label around its control` — `label > input[type=checkbox]`, both placed → `[checkbox]`.
      - `keeps the label when its control is hidden` — the same with the checkbox in `notRendered` → `[label]`.
      - `keeps the label when it holds another clickable element` — `label > (checkbox, a href)` → `[label, checkbox, link]`.
      - `ignores non-clickable content in the label` — `label > (span, checkbox)` → `[checkbox]`.
      - `keeps a label whose control is outside it` — `label for="x"` with text only, followed directly by its sibling `input id="x"` → `[label, input]`.
    - `filters copyable links` — `find('copyableLink')` over links to `https://x.test/a`, `mailto:a@b.test`, `file:///tmp/a`, `javascript:void(0)`, an `https:` link inside a `div inert`, and a button, each placed in its own row → `[https link, mailto link, file link]` (R1.6, R5.3).
    - `filters text inputs` — `find('textInput')` over a text `input`, a checkbox, a `textarea`, a `div contenteditable=""` host holding a placed `p`, a disabled `input` and a button, each placed in its own row → `[input, textarea, host]` (R6.1).
    - `finds nothing on an empty page` — `const filters: readonly TargetFilter[] = ['clickable', 'copyableLink', 'textInput']` drives an `it.each`, and `find(filter)` is `[]`.
    - `composedContains` — `it.each` rows built by functions that return `[ancestor, node, expected]`: an element and itself → true; parent and child → true; child and parent → false; two siblings → false; the parent of an open-root host and a `span` inside that root → true; the same across a closed root → true; the host and an element in another host's root → false.
- **Steps:**
  1. Write the tests; they fail (the module doesn't exist).
  2. Create `src/core/hints/finder.ts`. Imports: `isClickable`, `isTextInput`, `linkUrl`, `isCopyableUrl` from `./clickable`; `type Geometry`, `type Rect` from `./geometry`; `type ShadowRootOf` from `../editable`. Exports (each with a doc comment from the design):
     - `type TargetFilter`, `interface HintTarget` and `interface Finder`, as in the design.
     - `function createFinder(deps: FinderDeps): Finder`. `FinderDeps` is a private interface `{ readonly document: Document; readonly shadowRootOf: ShadowRootOf; readonly geometry: Geometry }`.
     - `function composedContains(ancestor: Node, node: Node): boolean`. It walks from `node` up with `current = current instanceof ShadowRoot ? current.host : current.parentNode` and returns `true` when it reaches `ancestor`, or `false` at `null`. T9 imports it.
  3. Private helpers, each under complexity 10 and depth 3:
     - `matchesFilter(filter: TargetFilter, element: Element): boolean` is an exhaustive `switch` with no `default`:
       - `clickable` → `isClickable(element)`.
       - `copyableLink` → `isClickable(element)`, then `const url = linkUrl(element)`, then `url !== undefined && isCopyableUrl(url)`. The `isClickable` guard keeps disabled and inert links out (R1.2; see Review notes).
       - `textInput` → `isTextInput(element)`.
     - `collect(deps, root: Document | ShadowRoot, filter, out: Element[]): void`. `const walker = deps.document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)`, then `for (let node = walker.nextNode(); node !== null; node = walker.nextNode())`. For each node that is an `Element`:
       - push it to `out` when `matchesFilter` is true;
       - then, when `deps.shadowRootOf(node)` is not null, call `collect` on that root right away, so shadow content stays in document order (R1.1).
       - A `TreeWalker` never enters iframe documents (R1.5).
     - `clip(rect: Rect, viewport: Rect): Rect | undefined` returns the intersection, or `undefined` when its width or height is ≤ 0. This one check drops zero-size and off-screen rects (R1.2, R2.6).
     - `visibleRect(geometry, viewport, element): Rect | undefined` returns `undefined` unless `geometry.isRendered(element)`. Otherwise it returns the first defined `clip(rect, viewport)` over `geometry.rects(element)`.
     - `isUncovered(geometry, element, rect): boolean` returns `true` when `hitAt(rect.left + rect.width / 2, rect.top + rect.height / 2)` or `hitAt(rect.left + 2, rect.top + 2)` is non-null and `composedContains(element, hit)` (R1.3). The second point is only tested when the first fails.
     - `wrappingLabels(candidates: readonly Element[]): Map<Element, Element>` maps a label to its control when all of these hold:
       - the candidate is an `HTMLLabelElement` and its `control` is not null;
       - `candidates[index + 1] === control`;
       - `candidate.contains(control)`;
       - `candidates[index + 2]` is `undefined` or not `composedContains(candidate, …)`.
         A doc comment says candidates are in document order, so a label's clickable descendants come right after it (R1.4).
  4. `find(filter)`:
     1. `const candidates: Element[] = []` and `collect(deps, deps.document, filter, candidates)`.
     2. `const viewport = deps.geometry.viewport()`, read once per call.
     3. For each candidate in order, keep `{ element, rect }` when `visibleRect` returns a rect and `isUncovered` is true. The hit test runs only for on-screen elements (NFR1.1).
     4. `const wrapping = wrappingLabels(candidates)` and `const shown = new Set(targets.map((target) => target.element))`.
     5. Return the targets without any label whose mapped control is in `shown`.
  5. Run `npm run check`.
- **Done when:** the tests pass; `npm run check` passes. Knip: the test imports `createFinder`, `composedContains`, `Finder`, `HintTarget` and `TargetFilter`. Later, T9 imports `composedContains`, and T10 imports `createFinder`, `Finder`, `HintTarget` and `TargetFilter`.
- **Commit:** `Add: finder for visible hint targets`

### T5: Add the hint overlay in a closed shadow root — [x] done

- **Requirements:** R2.5, R2.6, R3.1 and R3.3 (overlay side: it filters what the mode tells it), R7.1, R7.4 (overlay side: it draws what it is given), R7.5, NFR1.1 (batched reads), NFR1.2, NFR5.1, NFR5.2 · **Design:** Hint overlay
- **Depends on:** T3 (`Rect`)
- **Files:** create `src/ui/shadow-root.ts`, `src/ui/shadow-root.test.ts`, `src/ui/hints.ts`, `src/ui/hints.test.ts`
- **Tests first:**
  - `src/ui/shadow-root.test.ts`, importing `mountUiRoot`, `type UiRoot` from `./shadow-root`. `beforeAll` saves `const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')`. `afterEach` removes every `vim-hints` element (`document.querySelectorAll('vim-hints').forEach((el) => { el.remove(); })`), then restores `showPopover`: `Object.defineProperty(HTMLElement.prototype, 'showPopover', original)` when `original` is defined, else `Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')`. Stubs are set with `Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, writable: true, value })`. `host()` is `document.querySelector('vim-hints')`.
    - `appends one host with a closed shadow root to documentElement` — `const ui: UiRoot = mountUiRoot(document)`; `document.documentElement.lastElementChild` is the only `vim-hints` element; its `shadowRoot` is `null`; `ui.root.host` is it; `ui.root.mode` is `'closed'`.
    - `marks the host as a manual popover hidden from screen readers` — `getAttribute('popover')` is `'manual'`, `getAttribute('aria-hidden')` is `'true'` (NFR5.2).
    - `pins the host with important inline styles` — `getAttribute('style')` contains each of `all: initial !important`, `position: fixed !important`, `inset: 0 !important`, `margin: 0 !important`, `padding: 0 !important`, `border: 0 !important`, `background: transparent !important`, `pointer-events: none !important`, `z-index: 2147483647 !important` (`it.each` over the fragments); and `host.style.getPropertyValue('position')` is `'fixed'` with `getPropertyPriority('position')` `'important'` (R2.6, R7.5).
    - `shows the host as a popover once it is in the page` — `const connected: boolean[] = []`; `const showPopover = vi.fn(function (this: HTMLElement) { connected.push(this.isConnected); })` set as the stub; after `mountUiRoot(document)`: called once, `showPopover.mock.contexts[0]` is `host()`, `connected` is `[true]`.
    - `mounts when showPopover is missing or throws` — `it.each` over two stubs: `undefined` and `() => { throw new DOMException('no', 'NotSupportedError'); }`. `mountUiRoot(document)` doesn't throw and `host()` is not null.
    - `unmount removes the host and is safe twice or after the page removed it` — `unmount()` → `host()` null; `unmount()` again doesn't throw; a second mount whose host the test removes with `host()?.remove()` → `unmount()` doesn't throw.
  - `src/ui/hints.test.ts`, importing `createHintOverlay`, `type HintOverlay`, `type HintView` from `./hints` and `type Rect` from `@/core/hints/geometry`. The test owns the root: `const host = document.body.appendChild(document.createElement('div'))`, `const root = host.attachShadow({ mode: 'open' })`, `const unmount = vi.fn(() => { host.remove(); })`, `const mount = vi.fn(() => ({ root, unmount }))` (all rebuilt in `beforeEach`), `const viewport = (): Rect => ({ left: 0, top: 0, width: 800, height: 600 })`, and `const overlay: HintOverlay = createHintOverlay({ mount, viewport })`. A helper `rect(left, top): Rect` returns `{ left, top, width: 40, height: 10 }`. `hintsIn(root)` returns `Array.from(root.querySelectorAll<HTMLElement>('.hint'))`. `beforeAll` saves the `offsetWidth` and `offsetHeight` descriptors of `HTMLElement.prototype`. `afterEach` restores both with `Object.defineProperty`, and empties `document.body`. Getter stubs use `Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 30 })`.
    - `shows one hint per view with the label in upper case` — `const views: readonly HintView[] = [{ label: 'sa', rect: rect(10, 20) }, { label: 'd', rect: rect(100, 20) }]`; `show(views)` → two `.hint` spans with `textContent` `SA` and `D`, each holding one `.typed` span with empty text; `mount` called once (R2.5).
    - `positions each hint at its rect's top-left corner` — `rect(10, 20)` → `style.left` `10px`, `style.top` `20px` (R2.6).
    - `clamps a corner outside the viewport` — `{ left: -5, top: 900, width: 40, height: 10 }` → `0px`, `599px` (jsdom sizes are 0, so no edge move) (R2.6).
    - `moves a hint that would cross the right or bottom edge back inside` — `offsetWidth` getter 30, `offsetHeight` getter 16; `rect(790, 595)` → `770px`, `584px`; `rect(10, 20)` in the same `show` stays at `10px`, `20px` (R2.6).
    - `reads every size before moving any hint` — the `offsetWidth` getter (30) pushes `hintsIn(root).map((hint) => hint.style.left)` to a `reads` list at each call. After `show` with three views at `rect(790, 10)`, `rect(790, 40)` and `rect(790, 70)`: `reads` has three entries, each `toStrictEqual(['790px', '790px', '790px'])`, and every hint ends at `770px`. This shows one batch of reads after all hints are inserted and before any write (NFR1.1).
    - `adds its own style with the hint colours` — `root.querySelector('style')?.textContent` contains `#ffd94a`, `#000` and `#5a4a00` (NFR5.1).
    - `filter hides hints that no longer match and marks the typed letters` — views `sa`, `sd`, `f`; `filter([0, 1], 1)`: hint 2 has `hidden === true`, hints 0 and 1 `false`; their `.typed` text is `S`, and their full `textContent` is still `SA`/`SD`. Then `filter([0, 1, 2], 0)`: all shown, every `.typed` text empty, full text `SA`, `SD`, `F` (R3.1, R3.3).
    - `filter keeps the same elements` — the `hintsIn(root)` array before and after two `filter` calls holds the same objects (`toBe` per index), and `mount` was called once (NFR1.2).
    - `remove unmounts once and is safe to repeat or call before show` — `remove()` before `show`: `unmount` not called; `show`, `remove`, `remove` → `unmount` called once (R7.1).
    - `show after remove mounts a fresh root` — `show`, `remove`, `show` → `mount` called twice, `unmount` once (R7.4).
    - `show again replaces the previous hints` — `show` with two views, then `show` with one: `unmount` called once, `mount` twice (R7.4).
    - `leaves focus and selection alone` — an `input` with value `hello` in the body is focused and `setSelectionRange(1, 2)`; after `show`, `filter([0], 1)` and `remove`: `document.activeElement` is the input, and `selectionStart`/`selectionEnd` are 1 and 2 (R7.5).
- **Steps:**
  1. Write the tests; they fail (the modules don't exist).
  2. Create `src/ui/shadow-root.ts`, which imports nothing. Export `UiRoot` with the design's doc comments, and `mountUiRoot(doc: Document): UiRoot` with the design's doc comment. Add a private `const HOST_STYLE`: the declarations `all: initial`, `position: fixed`, `inset: 0`, `margin: 0`, `padding: 0`, `border: 0`, `background: transparent`, `pointer-events: none`, `z-index: 2147483647`, each with ` !important`, joined by `'; '`. Write it out as one string literal, or as an array mapped and joined at module load. A comment explains that inline `!important` beats any page rule (R2.6, R7.5), that `all: initial` also overrides the UA popover style, so the host still shows when `showPopover` fails, and that `z-index` is the fallback when the top layer isn't available.
  3. `mountUiRoot`: `const host = doc.createElement('vim-hints')`; `setAttribute('popover', 'manual')`, `setAttribute('aria-hidden', 'true')`, `setAttribute('style', HOST_STYLE)`; `const root = host.attachShadow({ mode: 'closed' })`; `doc.documentElement.append(host)`; then `try { host.showPopover(); } catch { /* No popover API (jsdom, an old engine) or the call was refused: the fixed host still sits on top. */ }`. Return `{ root, unmount: () => { host.remove(); } }` (`remove()` on a detached node is a no-op). Never `innerHTML`.
  4. Create `src/ui/hints.ts` (`import type { Rect } from '@/core/hints/geometry'`, `import type { UiRoot } from '@/ui/shadow-root'`). Export `HintView` and `HintOverlay` with the design's doc comments, and `createHintOverlay(deps: { readonly mount: () => UiRoot; readonly viewport: () => Rect }): HintOverlay`. Private pieces:
     - `const STYLE` = `.hint { position: absolute; box-sizing: border-box; padding: 0 3px; font: bold 12px/1.2 ui-monospace, monospace; color: #000; background: #ffd94a; border: 1px solid #5a4a00; border-radius: 3px; white-space: nowrap; } .hint[hidden] { display: none; } .typed { color: #5a4a00; }`. A comment gives the contrast ratios, about 15:1 and 6.8:1 (NFR5.1).
     - `interface HintElements { readonly label: string; readonly span: HTMLSpanElement; readonly typed: HTMLSpanElement; readonly rest: Text }`.
     - `createHintElements(doc: Document, view: HintView, viewport: Rect): HintElements`: a `span` with `className = 'hint'`, holding an empty `span` with `className = 'typed'` and then `doc.createTextNode(view.label.toUpperCase())`. `style.left` is `${clamp(view.rect.left, 0, viewport.width - 1)}px` and `style.top` is `${clamp(view.rect.top, 0, viewport.height - 1)}px`, with a private `clamp(value, min, max)`. Viewport `left`/`top` are always 0 (Geometry's contract).
     - `fitInside(hints: readonly HintElements[], viewport: Rect): void`: first `const sizes = hints.map(({ span }) => ({ width: span.offsetWidth, height: span.offsetHeight }))`, the only layout reads, in one batch (NFR1.1). Then, for each hint and its size, read the clamped corner back with `const left = Number.parseFloat(span.style.left)` (an inline style read, not a layout read); when `left + width > viewport.width`, set `style.left` to `${Math.max(0, viewport.width - width)}px`. Do the same for `top`/`height`.
  5. `createHintOverlay` keeps `let ui: UiRoot | undefined` and `let hints: readonly HintElements[] = []` in its closure and returns:
     - `show(views)`: call `remove()`; `const mounted = deps.mount()`; `ui = mounted`; `const doc = mounted.root.ownerDocument`; append a `style` element whose `textContent` is `STYLE`; `const viewport = deps.viewport()`; `hints = views.map((view) => createHintElements(doc, view, viewport))`; `mounted.root.append(...hints.map(({ span }) => span))`; then `fitInside(hints, viewport)`.
     - `filter(visible, typed)`: `const shown = new Set(visible)`; for each hint and index, set `span.hidden = !shown.has(index)`. For shown hints only, set `typed.textContent = label.slice(0, typed).toUpperCase()` and `rest.data = label.slice(typed).toUpperCase()`. Hidden hints are left as they are; they are rewritten when shown again.
     - `remove()`: `ui?.unmount()`; `ui = undefined`; `hints = []`.
       No focus, selection or scroll call anywhere (R7.5). No listener is added.
- **Done when:** the tests pass; `npm run check` passes (Knip: the two tests import every export of both files: `mountUiRoot`, `UiRoot`, `createHintOverlay`, `HintOverlay`, `HintView`; T10 imports `mountUiRoot`, `createHintOverlay` and `HintOverlay`); every branch of both files is covered, including the `catch`, which the throwing stub reaches. The commit flips this marker to `[x] done`, sets _Next task_ to T6 and adds a dated _History_ line naming the commit subject.
- **Commit:** `Add: hint overlay in a closed shadow root`

### T6: Add the openTab message and the background tab handler — [x] done

- **Requirements:** R5.2, R5.6, NFR3.1–NFR3.3, NFR4.1 · **Design:** Messages and the service worker
- **Depends on:** — (T1 has run `npm install`, so `.wxt/` and `node_modules/` exist)
- **Why one commit:** making `Message` a union makes `MessageHandlers` demand an `openTab` handler, so `router.test.ts` and `handlers.ts` stop compiling until the handler exists. The indexed call in `router.ts` and `protocol.test.ts`'s `.command` read also stop compiling. Adding `create` to `TabsApi` breaks every `TabsApi` literal (`tabs.test.ts`, `handlers.test.ts`, `src/entrypoints/background.ts`) until each one passes it.
- **Files:** modify `src/messaging/protocol.ts`, `src/messaging/protocol.test.ts`, `src/messaging/router.ts`, `src/messaging/router.test.ts`, `src/background/tabs.ts`, `src/background/tabs.test.ts`, `src/background/handlers.ts`, `src/background/handlers.test.ts`, `src/entrypoints/background.ts`, `docs/specs/2026-11-22-link-hints/tasks.md`. `src/messaging/client.ts`, `client.test.ts` and `src/manifest.test.ts` are not touched and must still pass.
- **Tests first:**
  - `src/messaging/protocol.test.ts` (the type import becomes `import type { Message, OpenTabMessage, RunCommandMessage } from './protocol';`):
    - `accepts openTab with an http or https URL`: `it.each(['https://x.test/a?b#c', 'http://x.test/', 'HTTPS://X.TEST/'])` → `isMessage({ type: 'openTab', url })` is `true` (NFR3.2).
    - `accepts a URL of exactly 32,768 characters`: `const url = 'https://x.test/' + 'a'.repeat(32_768 - 'https://x.test/'.length)` → `true`.
    - `accepts extra properties on an openTab message`: `{ type: 'openTab', url: 'https://x.test/', extra: 1 }` → `true` (same rule as runCommand).
    - `rejects openTab with %s`: `it.each<readonly [string, unknown]>` over `{ type: 'openTab', url }`, with labels: `a javascript: URL` (`'javascript:alert(1)'`), `a mailto: URL`, `a file: URL` (`'file:///etc/hosts'`), `a data: URL` (`'data:text/html,x'`), `a chrome: URL` (`'chrome://settings'`), `text that is not a URL` (`'not a url'`), `an empty string`, `a relative URL` (`'/relative'`), `a URL of 32,769 characters` (the accepted URL plus `'a'`), `a number` (`7`), `null`, `undefined`, `an object` (`{}`). There is one more row, `a missing url`, whose value is `{ type: 'openTab' }`. Each gives `false` (NFR3.2).
    - Replace `narrows to Message` (its `?.command` read no longer type-checks on the union) with `narrows each message type`. The test declares a local `function summary(message: Message): string` with `switch (message.type)`. In the `'runCommand'` case it runs `const run: RunCommandMessage = message;` and returns `run.command`. In the `'openTab'` case it runs `const open: OpenTabMessage = message;` and returns `open.url`. There is no `default`. Replace the file's `parse` helper, which only that old test used (if it were left unused, `noUnusedLocals` would fail), with `function mustParse(value: unknown): Message { if (!isMessage(value)) { throw new Error('rejected'); } return value; }`. The test asserts that `summary(mustParse({ type: 'runCommand', command: 'tabNext' }))` is `'tabNext'` and that `summary(mustParse({ type: 'openTab', url: 'https://x.test/' }))` is `'https://x.test/'`. The `BackgroundCommandName` type import is then unused: remove it.
  - `src/messaging/router.test.ts`:
    - Add `const openTab = vi.fn<MessageHandlers['openTab']>(() => Promise.resolve());` next to `runCommand`. Reset it in `beforeEach` the way `runCommand` is reset (`mockReset()` then `mockResolvedValue(undefined)`). Both `createRouter` calls (in `beforeEach` and in `keeps no state between calls`) pass `handlers: { runCommand, openTab }`. Add `const openMessage = { type: 'openTab', url: 'https://x.test/' };`.
    - In the existing `runs the handler with the message and the sender's tab and window`, also assert `expect(openTab).not.toHaveBeenCalled()`.
    - `runs the openTab handler with the message and the sender's tab`: `openMessage` from `goodSender` → `openTab` is called once with `(openMessage, { tabId: 7, windowId: 3 })`, and `runCommand` is not called.
    - `ignores openTab from another extension or a sub-frame`: `{ ...goodSender, id: 'other' }`, then `{ ...goodSender, frameId: 3 }`. `openTab` is not called (NFR3.3).
    - `ignores openTab with a javascript: URL`: `{ type: 'openTab', url: 'javascript:alert(1)' }` → `openTab` is not called (NFR3.2).
    - `resolves when the openTab handler rejects`: `openTab.mockRejectedValueOnce(new Error('x'))`, then `await expect(router.handle(openMessage, goodSender)).resolves.toBeUndefined()` (R5.6).
    - `requires an openTab handler`: put `// @ts-expect-error missing handler for openTab` above a never-called `const noOpenTab = (): Router => createRouter({ handlers: { runCommand }, extensionId: EXTENSION_ID });`, then `expect(noOpenTab).toBeTypeOf('function')`. Keep the existing `handlers: {}` case unchanged.
  - `src/background/tabs.test.ts`:
    - Imports: `createOpenTabHandler` joins `createTabHandlers`, and `import type { OpenTabMessage } from '@/messaging/protocol';` is added.
    - `createFakes` gains `const create = vi.fn<TabsApi['create']>(() => Promise.resolve(undefined));`. It is passed in the `tabs` literal as `create: (props) => create(props)` and returned with the other fakes.
    - Add a new `describe('createOpenTabHandler')` with a local helper `setupOpen(initial: readonly TabInfo[], currentId: number)`:
      - It sets `let list: readonly TabInfo[] = initial;` and `let nextId = 100;`.
      - `query = vi.fn<TabsApi['query']>(() => Promise.resolve([...list].reverse()))`.
      - `create = vi.fn<TabsApi['create']>((props) => { const at = props.index ?? list.length; list = [...list.map((tab) => (tab.index >= at ? { ...tab, index: tab.index + 1 } : tab)), { id: nextId, index: at, openerTabId: props.openerTabId }]; nextId += 1; return Promise.resolve(undefined); })`. Consecutive calls therefore see the tabs opened before them.
      - It builds a full `TabsApi` from `query` and `create` (as arrows), plus `update: () => Promise.resolve(undefined)`, `remove: () => Promise.resolve()` and `duplicate: () => Promise.resolve(undefined)`.
      - It returns `{ open: createOpenTabHandler({ tabs }), ctx: { tabId: currentId, windowId: 1 } satisfies HandlerContext, query, create }`.
      - Message used by every case: `const message: OpenTabMessage = { type: 'openTab', url: 'https://x.test/a' };`.
    - `opens the URL in the background right after the current tab`: tabs `{ id: 10, index: 0 }`, `{ id: 11, index: 1 }`, `{ id: 12, index: 2 }`, current 11 → `create` is called once, and its first argument `toStrictEqual({ url: 'https://x.test/a', active: false, index: 2, windowId: 1, openerTabId: 11 })` (R5.2).
    - `goes after the tabs already opened from the current tab`: 10@0 (current), 20@1 and 21@2 both with `openerTabId: 10`, 30@3 → `index: 3`.
    - `keeps the order of several opens`: 10@0 (current), 30@1. Two `await open(message, ctx)` in a row → the `create` calls have `index` 1 and then 2 (R5.2).
    - `stops at an unrelated tab`: 10@0 (current), 30@1 (no opener), 20@2 with `openerTabId: 10` → `index: 1`.
    - `opens without an index when the current tab is missing`: tabs 10@0, 11@1, current 99 → `create`'s argument `toStrictEqual({ url: 'https://x.test/a', active: false, windowId: 1, openerTabId: 99 })`, with no `index` key.
    - `queries only the sender's window`: `query` is called once with `{ windowId: 1 }`.
    - `lets a create failure reach the router`: `create.mockRejectedValueOnce(new Error('closed'))` → `await expect(open(message, ctx)).rejects.toThrow('closed')`. The router swallows it (R5.6).
  - `src/background/handlers.test.ts`:
    - `createFakes` gains `const create = vi.fn<TabsApi['create']>(() => Promise.resolve(undefined));`. It is passed as `create: (props) => create(props)` in the `tabs` object and returned.
    - `routes openTab to tabs.create`: `{ type: 'openTab', url: 'https://x.test/' }` from `sender` (tab 10; the fake's tabs are 10@0 and 11@1) → `create` is called once with `{ url: 'https://x.test/', active: false, index: 1, windowId: 1, openerTabId: 10 }`.
    - `ignores openTab with a mailto URL`: `{ type: 'openTab', url: 'mailto:a@b.test' }` → `create` and `query` are not called.
  - `src/manifest.test.ts` is unchanged and must still pass (NFR3.1).
- **Steps:**
  1. Write the tests. `npm test` fails: the types and `createOpenTabHandler` are missing.
  2. `src/messaging/protocol.ts`:
     - Rename the interface to `export interface RunCommandMessage`, keeping its fields and the `count` doc comment.
     - Add `export interface OpenTabMessage { readonly type: 'openTab'; /** An absolute http or https URL (NFR3.2). */ readonly url: string; }`.
     - Add `export type Message = RunCommandMessage | OpenTabMessage;` and move the existing "Every message from a content script…" doc comment onto it.
     - Add private `const MAX_URL_LENGTH = 32_768;` and `function isWebUrl(value: unknown): boolean { return typeof value === 'string' && value.length <= MAX_URL_LENGTH && URL.canParse(value) && ['http:', 'https:'].includes(new URL(value).protocol); }`. A `canParse` with no base rejects relative URLs and `''`.
     - Move the current command and count checks into a private `function isRunCommand(record: Record<string, unknown>): boolean`.
     - `isMessage` keeps its object guard, then runs `const record = value as Record<string, unknown>;` and `return (record.type === 'runCommand' && isRunCommand(record)) || (record.type === 'openTab' && isWebUrl(record.url));`.
     - Update its doc comment: "…or an openTab whose url is an http(s) URL of at most 32,768 characters".
     - `messaging/` still imports nothing from `core/`.
  3. `src/messaging/router.ts`: add a private `function dispatch(handlers: MessageHandlers, message: Message, ctx: HandlerContext): Promise<void>`. Its body is `switch (message.type) { case 'runCommand': return handlers.runCommand(message, ctx); case 'openTab': return handlers.openTab(message, ctx); }` with no `default`: the lint config sets `considerDefaultExhaustiveForUnions: false`, and TS accepts the exhaustive switch as the function's return. In `handle`, replace `await deps.handlers[message.type](message, ctx);` with `await dispatch(deps.handlers, message, ctx);`. The indexed call can't type-check on a union, because its parameter becomes the intersection of both message types. A handler that throws synchronously still throws inside `handle`'s try.
  4. `src/background/tabs.ts`:
     - `TabInfo` gains `readonly openerTabId?: number | undefined;`.
     - `TabsApi` gains `create(props: { readonly url: string; readonly active: false; readonly index?: number; readonly windowId: number; readonly openerTabId: number }): Promise<unknown>;`. `index` is optional for the design's "created without `index`" case.
     - Rewrite the `TabsApi` doc comment as: `chrome.tabs, narrowed to what M2 and M3 use. No "tabs" permission: only ids, indexes and opener ids are read, and create needs none (NFR3.1).`
     - The `HandlerContext` import gains `MessageHandlers` (same `@/messaging/router` type import).
     - Add a private `function insertionIndex(list: readonly TabInfo[], tabId: number): number | undefined`. It sets `const position = positionOf(list, tabId); const current = list[position];` and returns `undefined` when `current` is `undefined` (the position is -1). Otherwise it sets `let last = current.index;`, then loops `for (const tab of list.slice(position + 1)) { if (tab.openerTabId !== tabId) { break; } last = tab.index; }` and returns `last + 1`.
     - Add `/** Opens the URL in the background after the current tab and the tabs already opened from it (R5.2). Failures reach the router, which swallows them (R5.6). */ export function createOpenTabHandler(deps: { readonly tabs: TabsApi }): MessageHandlers['openTab']`. Its body is `const open: MessageHandlers['openTab'] = async (message, ctx) => { const index = insertionIndex(await sortedTabs(deps.tabs, ctx), ctx.tabId); const props = { url: message.url, active: false, windowId: ctx.windowId, openerTabId: ctx.tabId } as const; await deps.tabs.create(index === undefined ? props : { ...props, index }); }; return open;`. The typed `const` keeps `explicit-module-boundary-types` satisfied. There is no try/catch and no logging.
  5. `src/background/handlers.ts`: import `createOpenTabHandler` next to `createTabHandlers`, then add `const openTab = createOpenTabHandler({ tabs: deps.tabs });` and pass `handlers: { runCommand, openTab }`.
  6. `src/entrypoints/background.ts`: add `create: (props) => chrome.tabs.create(props),` after `duplicate` in the `tabs` object. Readonly props can be assigned to `chrome.tabs.CreateProperties`, and its `Promise<Tab>` satisfies `Promise<unknown>`.
  7. Run `npx prettier --write` on the changed files, then `npm run build`. The permissions in `.output/chrome-mv3/manifest.json` must still be exactly `scripting`, `sessions` and `webNavigation`.
  8. In `docs/specs/2026-11-22-link-hints/tasks.md`: set T6 to `[x] done`, set _Next task_ to T7, update _Last updated_, and add a dated _History_ line naming `Add: openTab message that opens a background tab`.
- **Done when:** the new and existing tests pass. `npm run build` succeeds with unchanged permissions. `npm run check` passes. For Knip: `protocol.test.ts` imports `RunCommandMessage` and `OpenTabMessage`, `tabs.test.ts` also imports `OpenTabMessage`, and `handlers.ts` and `tabs.test.ts` import `createOpenTabHandler`.
- **Commit:** `Add: openTab message that opens a background tab`

### T7: Add openTab to the message client — [x] done

- **Requirements:** R5.2, R5.6, NFR4.1 · **Design:** Messages and the service worker (`client.openTab`)
- **Depends on:** T6 (`Message` is `RunCommandMessage | OpenTabMessage`)
- **Files:** modify `src/messaging/client.ts`, `src/messaging/client.test.ts`
- **Tests first:** in `src/messaging/client.test.ts`, inside the existing `describe('createMessageClient')`, reusing the module-level `send` fake and `client` (reset in `beforeEach` to resolve `undefined`):
  - `openTab sends an openTab message with the URL`: `await client.openTab('https://x.test/a')`; `send` called once; `send.mock.calls[0]?.[0]` `toStrictEqual({ type: 'openTab', url: 'https://x.test/a' })` (R5.2).
  - `openTab resolves when send throws synchronously`: `send.mockImplementation(() => { throw new Error('gone'); })`; `await expect(client.openTab('https://x.test/a')).resolves.toBeUndefined()` (R5.6).
  - `openTab resolves when send rejects`: `send.mockRejectedValue(new Error('Extension context invalidated.'))`; same assertion (R5.6).
  - `openTab resolves when send resolves with a response`: `send.mockResolvedValue('ignored')`; same assertion.
  - The existing five `sendCommand` tests stay unchanged and must still pass (they cover the refactor into `deliver`).
- **Steps:**
  1. Write the tests. They fail: `openTab` doesn't exist on `MessageClient` (`npm run typecheck` fails, and Vitest reports `client.openTab is not a function`).
  2. In `src/messaging/client.ts`, add this member to `MessageClient` after `sendCommand`: `/** Fire and forget: resolves when sent or when sending failed; never rejects. The worker checks the URL (NFR3.2). */ openTab(url: string): Promise<void>;`.
  3. Add a private (not exported) `async function deliver(send: (message: Message) => Promise<unknown>, message: Message): Promise<void>` above `createMessageClient`. Its body is `try { await send(message); } catch { … }`, with the existing comment moved into the `catch` and reworded: a stopped worker, an invalidated extension or a closed tab must not surface in the page (M2's R10.7, R5.6); nothing is logged (NFR4.1). The `await` inside `try` is what also catches a synchronous throw from `send`.
  4. Rewrite the returned object with two non-`async` arrows. `sendCommand: (command, count): Promise<void> => deliver(send, count === undefined ? { type: 'runCommand', command } : { type: 'runCommand', command, count })` (keep the existing ternary). `openTab: (url): Promise<void> => deliver(send, { type: 'openTab', url })`. Don't mark them `async`: an `async` arrow with no `await` fails `@typescript-eslint/require-await`. The client doesn't validate the URL.
  5. Update `tasks.md` in the same commit: flip T7 to `[x] done`, set _Next task_ to T8, and add the _History_ line `2026-MM-DD — <name>: T7 done in "Add: openTab in the message client that never throws"`.
- **Done when:** all tests in `client.test.ts` pass; `npm run check` passes. ESLint has no `require-await` or `explicit-module-boundary-types` errors, and Knip reports nothing new (`deliver` isn't exported; interface members aren't tracked).
- **Commit:** `Add: openTab in the message client that never throws`

### T8: Add the hint actions — [x] done

- **Requirements:** R4.2–R4.6, R5.2, R5.4–R5.6, R5.8, NFR4.1 · **Design:** Hint actions (`simulateClick`, `createHintActions`)
- **Depends on:** T2 (`isDisabled`, `isTextInput`, `linkUrl`, `isOpenableUrl`), T3 (`Geometry`, `Rect`), T7 (`MessageClient.openTab`)
- **Files:** create `src/core/hints/actions.ts`, `src/core/hints/actions.test.ts`; modify `docs/specs/2026-11-22-link-hints/tasks.md` (status only)
- **Tests first:** in `src/core/hints/actions.test.ts`. Imports: `{ afterEach, beforeEach, describe, expect, it, vi }` from `vitest`; `{ createHintActions, simulateClick, type HintAction }` from `./actions`; `import type { Geometry, Rect } from './geometry'`; `import type { MessageClient } from '../../messaging/client'` (`import type`, not inline `type`, so `consistent-type-imports` and `verbatimModuleSyntax` pass).
  - Module-level fakes, each in its own variable: `const BOX: Rect = { left: 10, top: 20, width: 40, height: 10 }`; `const rects = vi.fn<Geometry['rects']>(() => [BOX])`; `const writeClipboard = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())`; `const openTab = vi.fn<MessageClient['openTab']>(() => Promise.resolve())`; `const geometry = { rects: (element: Element) => rects(element) }`; `const perform = createHintActions({ geometry, writeClipboard: (text) => writeClipboard(text), client: { openTab: (url) => openTab(url) } })`.
  - Module-level helpers (not nested in `describe`, to stay under SonarJS nesting): `add(tag, attributes = {}, parent: Node = document.body)` like `editable.test.ts`'s (createElement + setAttribute + appendChild, no `innerHTML`); `const MOUSE_TYPES = ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'] as const`; `record(target: EventTarget, types: readonly string[]): Event[]` adds one listener per type that pushes the event and returns the array; `cancelClicks(link: Element): Event[]` adds a `click` listener that pushes the event and calls `preventDefault()`, so jsdom doesn't try to navigate. Every test that clicks a link uses `cancelClicks`.
  - `beforeEach`: `rects.mockReset(); rects.mockReturnValue([BOX]); writeClipboard.mockReset(); writeClipboard.mockResolvedValue(undefined); openTab.mockReset(); openTab.mockResolvedValue(undefined);` (`restoreMocks` only restores `vi.spyOn` spies). Then append `<base href="https://x.test/dir/">`, built with `createElement('base')` + `setAttribute`, to `document.head`. `afterEach`: remove the base and `document.body.replaceChildren()`.
  - `describe('simulateClick')`:
    - `dispatches the mouse sequence in order, with focus after mousedown` — a button; `record(button, [...MOUSE_TYPES, 'focus'])`; `simulateClick(button, geometry)`; `events.map((event) => event.type)` `toEqual(['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointerdown', 'mousedown', 'focus', 'pointerup', 'mouseup', 'click'])`; `rects` was called with the button (R4.2).
    - `sets the event properties a real click has` — `record(button, MOUSE_TYPES)`; for each event: it is a `MouseEvent`, `clientX` 30, `clientY` 25, `button` 0, `detail` 1, `composed` and `cancelable` true, `view` is `window`; `bubbles` is false for `pointerenter` and `mouseenter` and true otherwise; `buttons` is 1 for `pointerdown` and `mousedown` and 0 otherwise; for the four `pointer*` types it is a `PointerEvent` with `pointerType` `'mouse'`, `isPrimary` true, `pointerId` 1, and the other five are not `PointerEvent`s. jsdom 30 has `PointerEvent`; don't polyfill it in product code.
    - `clicks at the centre of the first non-empty rect` — `rects.mockReturnValue([{ left: 5, top: 5, width: 0, height: 8 }, { left: 100, top: 0, width: 20, height: 20 }])` → the `click` event has `clientX` 110 and `clientY` 10.
    - `clicks at 0, 0 when the element has no rect` — `rects.mockReturnValue([])` → `clientX` 0, `clientY` 0.
    - `focuses a focusable element without scrolling` — `it.each` over named builders: `button`, `button tabindex="-1"`, `div tabindex="-1"`, `a href="/x"` (with `cancelClicks`). For each, `const focus = vi.spyOn(element, 'focus')`, then `focus` is called once with `{ preventScroll: true }`.
    - `doesn't focus an element that can't take focus` — `div role="button"` with no tabindex: `vi.spyOn(div, 'focus')` not called.
    - `keeps dispatching but skips focus when the page cancels mousedown` — a button with a `mousedown` listener that calls `preventDefault()`, `record(button, ['click'])` and a `focus` spy: one click is recorded and `focus` is not called (a real press doesn't focus then).
    - `runs the native activation of the dispatched click` — `input type=checkbox` → `checked` is true afterwards (R4.2).
  - `describe('createHintActions')`:
    - `click clicks a button` — `record(button, ['click'])`, `perform('click', button)` → one event (R4.2).
    - `click focuses a text field or select instead of clicking it` — `it.each` over named builders: `input` (no type), `textarea`, `div contenteditable="true"`, `select`. `record(element, MOUSE_TYPES)` stays empty, and `vi.spyOn(element, 'focus')` is called once (R4.3, R4.4). This uses a spy because jsdom doesn't make contenteditable hosts focusable.
    - `click moves the document's focus to a text input` — `perform('click', input)` → `document.activeElement` is the input (R4.3).
    - `click clicks a link inside an editor` — `div contenteditable="true"` holding `a href="/e"`; `cancelClicks(link)` has one event (not a text input, R4.2).
    - `does nothing for a detached element` — `it.each<HintAction>(['click', 'openTab', 'copyUrl'])` with `a href="/x"`, created but not appended: `record(link, MOUSE_TYPES)` stays empty, and `writeClipboard` and `openTab` are not called (R4.6).
    - `does nothing for a disabled button` — `it.each<HintAction>` over the three actions with `button disabled`: `record(button, MOUSE_TYPES)` stays empty and `openTab` is not called (R4.6).
    - `does nothing for an aria-disabled or inert element` — `perform('click', element)` for `button aria-disabled="true"` and for a `button` inside `div inert` (built with `add`): `record(element, MOUSE_TYPES)` stays empty (R4.6, R1.2).
    - `does nothing for a disabled text input` — `input disabled` with `perform('click', input)`: the `focus` spy is not called (R4.6).
    - `openTab opens an http(s) link in a background tab` — `a href="/b"` with `cancelClicks` → `openTab` called once with `'https://x.test/b'`; no click recorded (R5.2).
    - `openTab clicks a link it can't open` — `it.each(['javascript:void(0)', 'mailto:a@b.test'])` → `openTab` not called, one click recorded (R5.5).
    - `openTab clicks a button` — `record(button, ['click'])` has one event; `openTab` not called (R5.5).
    - `openTab focuses a text input` — the `focus` spy is called once; `openTab` not called (R5.5, R4.3).
    - `copyUrl writes the link's absolute URL` — `a href="c?q=1"` → `writeClipboard` called once with `'https://x.test/dir/c?q=1'` (R5.4).
    - `copyUrl swallows a rejected copy` — `writeClipboard.mockRejectedValue(new Error('denied'))`; `expect(() => { perform('copyUrl', link); }).not.toThrow()`; then `await new Promise((resolve) => setTimeout(resolve, 0))`, because Vitest fails the run on an unhandled rejection (R5.6).
    - `copyUrl swallows a synchronous throw` — `writeClipboard.mockImplementation(() => { throw new TypeError('no clipboard'); })`; same block-bodied `not.toThrow()` and flush (R5.6).
    - `copyUrl does nothing for an element without a URL` — a button: `writeClipboard` not called, no click recorded.
    - `uses the URL only for its own action` — on one `a href="/u"` with `cancelClicks`: `perform('click', link)` calls neither `writeClipboard` nor `openTab`; `perform('copyUrl', link)` doesn't call `openTab`; `perform('openTab', link)` doesn't call `writeClipboard` (R5.8).
- **Steps:**
  1. Write the tests; they fail (the module is missing).
  2. Create `src/core/hints/actions.ts`. Imports: `import type { MessageClient } from '../../messaging/client'`, `{ isDisabled, isOpenableUrl, isTextInput, linkUrl }` from `./clickable`, `import type { Geometry } from './geometry'`. Add `export type HintAction = 'click' | 'openTab' | 'copyUrl';` with a doc comment saying it lives here because `modes/hint.ts` lands later and imports it.
  3. Private `interface EventRow { readonly type: string; readonly pointer: boolean; readonly bubbles: boolean; readonly pressed: boolean }` and `const EVENTS: readonly EventRow[]` with nine rows in this order: `pointerover` (pointer), `pointerenter` (pointer, no bubbles), `mouseover`, `mouseenter` (no bubbles), `pointerdown` (pointer, pressed), `mousedown` (pressed), `pointerup` (pointer), `mouseup`, `click`. All other flags are false, except `bubbles`, which is true.
  4. Private `pointOf(element: Element, geometry: Pick<Geometry, 'rects'>): { readonly x: number; readonly y: number }` gives the centre (`left + width / 2`, `top + height / 2`) of the first rect with `width > 0 && height > 0`, else `{ x: 0, y: 0 }`. Private `createEvent(row: EventRow, view: Window | null, point): MouseEvent` builds `const init: MouseEventInit = { bubbles: row.bubbles, cancelable: true, composed: true, view, clientX: point.x, clientY: point.y, button: 0, buttons: row.pressed ? 1 : 0, detail: 1 }` and returns `new PointerEvent(row.type, { ...init, pointerType: 'mouse', isPrimary: true, pointerId: 1 })` for pointer rows, else `new MouseEvent(row.type, init)`. Private `canTakeFocus(element): element is HTMLElement | SVGElement` returns `(element instanceof HTMLElement || element instanceof SVGElement) && (element.tabIndex >= 0 || element.hasAttribute('tabindex'))`: natively focusable elements, or any element with a tabindex, as a mouse press focuses them. Its doc comment says how that is read: through `tabIndex` (the DOM reports `0` for natively focusable elements and `-1` for the rest) plus the `tabindex` attribute.
  5. `export function simulateClick(element: Element, geometry: Pick<Geometry, 'rects'>): void`, with the design's doc comment. Read `view = element.ownerDocument.defaultView` and the point once. For each row, `const notCancelled = element.dispatchEvent(createEvent(row, view, point))`. Right after the `mousedown` row, when `notCancelled && canTakeFocus(element)`, call `element.focus({ preventScroll: true })`. Ignore the other rows' results, so every event is dispatched even if the page cancels one.
  6. Private `interface HintActionDeps` holds the design's three deps (`geometry: Pick<Geometry, 'rects'>`, `writeClipboard: (text: string) => Promise<void>`, `client: Pick<MessageClient, 'openTab'>`). It is not exported, so Knip sees no unused type. Private `click(element, geometry)`: if `element instanceof HTMLElement && (isTextInput(element) || element instanceof HTMLSelectElement)`, call `element.focus()` (plain, as the design says; the focus watcher then enters Insert mode, R4.3, R4.4); else call `simulateClick(element, geometry)`. Private `async function copy(writeClipboard, text: string): Promise<void>` awaits `writeClipboard(text)` inside `try { } catch { /* Clipboard refused or missing: nothing visible, nothing logged (R5.6, NFR4.1). */ }`.
  7. `export function createHintActions(deps: HintActionDeps): (action: HintAction, element: Element) => void`, with a doc comment citing R4.6 and R5.8. The returned arrow first returns when `!element.isConnected || isDisabled(element)` (R4.6; T2's `isDisabled` covers `:disabled`, `aria-disabled="true"` and `[inert]`, as the design's decision says, not `:disabled` alone). Then it uses an exhaustive `switch (action)` with no `default`:
     - `click`: `click(element, deps.geometry)`.
     - `openTab`: `const url = linkUrl(element)`. If `url !== undefined && isOpenableUrl(url)`, run `void deps.client.openTab(url.href)` (it never rejects, T7). Otherwise run `click(element, deps.geometry)` (R5.5).
     - `copyUrl`: `const url = linkUrl(element)`. If defined, run `void copy(deps.writeClipboard, url.href)` (R5.4).
       No logging anywhere (NFR4.1). Keep every function under the complexity and size limits.
  8. In `tasks.md`: flip T8 to `[x] done`, set _Next task_ to T9, and add a dated _History_ line naming the commit subject.
- **Done when:** the tests pass (R4.5, a `target="_blank"` link clicked like any link, can't be observed in jsdom, which opens no windows; T14's `f on a target=_blank link opens it` proves it); `npm run check` passes (Knip: the test imports `simulateClick`, `createHintActions` and `HintAction`, and T10 imports `createHintActions` and `HintAction` later; `isDisabled`, `isTextInput`, `linkUrl` and `isOpenableUrl` from T2 are now used in product code).
- **Commit:** `Add: hint actions that click, open in a tab or copy a link`

### T9: Add the page watcher that ends Hint mode — [x] done

- **Requirements:** R7.2, R7.3 (element blur must not end it), NFR1.3 · **Design:** Hint mode ("Ending on page changes"); `watchPage` takes the hinted elements (see Agreements)
- **Depends on:** T4 (`composedContains`); existing `FrameScheduler` in `src/core/scroll/scroller.ts`
- **Files:** create `src/core/hints/page-watch.ts`, `src/core/hints/page-watch.test.ts`
- **Tests first:** in `src/core/hints/page-watch.test.ts`, importing `afterEach, beforeEach, describe, expect, it, vi` from `vitest`, `watchPage` from `./page-watch` and `type FrameScheduler` from `../scroll/scroller`. Module-level fakes, each `vi.fn` in its own variable:
  - `const queue = new Map<number, (now: number) => void>()`, `let lastFrameId = 0`;
  - `const request = vi.fn<FrameScheduler['request']>((callback) => { lastFrameId += 1; queue.set(lastFrameId, callback); return lastFrameId; })`;
  - `const cancel = vi.fn<FrameScheduler['cancel']>((id) => { queue.delete(id); })` (like the browser, a cancelled frame never runs);
  - `function flushFrame(): void` copies `[...queue.values()]`, clears `queue`, then runs each copied callback with `0` (so a callback that requests a frame queues it for the next flush);
  - `const onChange = vi.fn<() => void>()`;
  - `let stop: (() => void) | undefined`; `function watch(hinted: readonly Element[]): void { stop = watchPage({ window, frames: { request, cancel } }, hinted, onChange); }`; `function armed(): void { flushFrame(); flushFrame(); }`.
  - `beforeEach`: `queue.clear()`, `lastFrameId = 0`, `mockClear()` on `request`, `cancel`, `onChange`; build `container` (a `div` holding a hinted `link`, an `a href="https://x.test/"`) and a sibling `carousel` `div`, both appended to `document.body`. `afterEach`: `stop?.()`, `stop = undefined`, `document.body.replaceChildren()`.
  - Cases:
    - `ignores scrolls during the first two animation frames` — `watch([link])`; `document.dispatchEvent(new Event('scroll'))` before any flush and again after one `flushFrame()`: `onChange` not called; after the second `flushFrame()` the same event calls it once (R7.2).
    - `requests the second frame only after the first ran` — after `watch`, `request` called once; after one flush, twice; after two, still twice.
    - `ends on a scroll that moves a hinted element` — `it.each` with rows `['the document', () => document]`, `['an element containing it', () => container]`, `['the hinted element itself', () => link]`; after `armed()`, dispatch `new Event('scroll')` on the target → `onChange` called once (R7.2). (Scroll events don't bubble. The window's capture listener sees them anyway.)
    - `ends on a scroll around a hinted element in a shadow root` — a `div` host in `container` with `attachShadow({ mode: 'open' })` holding a `button`; `watch([button])`, `armed()`, `container` scroll → called (R7.2, through `composedContains`).
    - `ignores a scroll elsewhere` — `watch([link])`, `armed()`, `carousel.dispatchEvent(new Event('scroll'))` → not called (R7.2).
    - `ends on resize, window blur and visibilitychange, even in the first frames` — `it.each` over `['resize', () => window.dispatchEvent(new Event('resize'))]`, `['blur', () => window.dispatchEvent(new FocusEvent('blur'))]`, `['visibilitychange', () => document.dispatchEvent(new Event('visibilitychange'))]`; with no flush → called once (R7.2).
    - `ignores an element losing focus` — two `button`s in the body; focus the first, `watch([link])`, `armed()`, focus the second: the first's `blur` reaches the capture listener with `target !== window`; not called (R7.3).
    - `calls onChange once and stops listening` — two resizes, then (after `armed()`) a document scroll → called once in total.
    - `stop before the first frame cancels it and removes the listeners` — `watch([link])`, `stop()`: `cancel` called with `1`; then resize, window blur, visibilitychange, two flushes and a document scroll → `onChange` not called, `request` called once in total (NFR1.3).
    - `stop between the frames cancels the second one` — one flush, `stop()` → `cancel` called with `2`; a further flush runs nothing.
    - `stop after both frames cancels nothing` — `armed()`, `stop()` → `cancel` not called.
    - `stop twice is safe` — `stop()`, `stop()` → no throw, `cancel` called once.
- **Steps:**
  1. Write the tests; they fail (the module doesn't exist).
  2. Create `src/core/hints/page-watch.ts` with `import type { FrameScheduler } from '../scroll/scroller';` and `import { composedContains } from './finder';`, a private `interface PageWatchDeps { readonly window: Window; readonly frames: FrameScheduler; }` and a private `const CAPTURE = { capture: true } as const;`.
  3. Export `function watchPage(deps: PageWatchDeps, hinted: readonly Element[], onChange: () => void): () => void` with a doc comment: it calls `onChange` once, and removes its listeners, on a resize, window blur or visibilitychange, or on a scroll of anything that is a composed ancestor of a hinted element (the document included), unless that scroll comes in the first two animation frames (our own `j` animation's last frame, trackpad momentum). Scrolls inside shadow roots aren't composed and never reach the window, so those hints can go stale (known gap, manual check). Cite R7.2 and NFR1.3. It returns `stop`, which is safe to call more than once.
  4. Body, in this order:
     - `let armed = false;` `let frameId: number | undefined;`
     - `function stop(): void`: `deps.window.removeEventListener(type, handler, CAPTURE)` for each of the four pairs below; `if (frameId !== undefined) { deps.frames.cancel(frameId); frameId = undefined; }`.
     - `function end(): void { stop(); onChange(); }`.
     - `const onScroll = (event: Event): void => { const target = event.target; if (armed && target instanceof Node && hinted.some((element) => composedContains(target, element))) { end(); } };`
     - `const onBlur = (event: FocusEvent): void => { if (event.target === deps.window) { end(); } };` (element blurs are captured too and must not end Hint mode, R7.3)
     - `deps.window.addEventListener` with `CAPTURE` for `'scroll'` → `onScroll`, `'resize'` → `end`, `'visibilitychange'` → `end`, `'blur'` → `onBlur`.
     - `frameId = deps.frames.request(() => { frameId = deps.frames.request(() => { frameId = undefined; armed = true; }); });`
     - `return stop;`
  5. Export nothing else.
- **Done when:** the tests pass; `npm run check` passes (Knip: `watchPage` is imported by its test now, and by T10's controller later; nothing else is exported).
- **Commit:** `Add: page watcher that ends hints on scroll, resize and blur`

### T10: Add Hint mode and register it in the controller — [x] done

- **Requirements:** R1.6, R2.5, R3.1–R3.9, R3.10 (stays in Normal mode), R5.3 (filter), R7.1–R7.4, NFR1.3 · **Design:** Hint mode, Controller wiring
- **Depends on:** T1 (`generateLabels`, `matchPrefix`, `HINT_ALPHABET`), T3 (`Geometry`, `createDomGeometry`), T4 (`createFinder`, `Finder`, `HintTarget`, `TargetFilter`), T5 (`createHintOverlay`, `HintOverlay`, `mountUiRoot`), T7 (`MessageClient.openTab`), T8 (`createHintActions`, `HintAction`), T9 (`watchPage`)
- **Why one commit (decision, round 2):** the scope critic proposed T10a (hint.ts, `MODE_NAMES`, controller registration) and T10b (content.ts, `ControllerDeps.geometry`, client widening). It doesn't stay green: registration builds the finder and actions from `deps.geometry` and `deps.client.openTab`, so the dependency and its `content.ts` supplier must land with it. T10 is accepted as the plan's largest commit; `followFocus` and the `stop()` guard were kept out of it (T13).
- **Why the pieces are together:** `Mode.name` is a `ModeName`, so `modes/hint.ts` needs `'hint'` in `MODE_NAMES`. Once it is there, `createModeMachine` throws `Missing mode: hint` in the controller and in `mode-machine.test.ts` until Hint mode is registered in both. Nothing starts Hint mode until T12 adds the keys.
- **Files:** create `src/core/modes/hint.ts`, `src/core/modes/hint.test.ts`; modify `src/core/mode-machine.ts`, `src/core/mode-machine.test.ts`, `src/core/controller.ts`, `src/core/controller.test.ts`, `src/entrypoints/content.ts`, `docs/specs/2026-11-22-link-hints/tasks.md` (status only)
- **Tests first:**
  - `src/core/modes/hint.test.ts`.
    - Imports:
      - `afterEach`, `describe`, `expect`, `it`, `vi` from `vitest` (drop any that end up unused)
      - `createHintMode`, `type HintMode` from `./hint`
      - `createModeMachine` from `../mode-machine`
      - `type KeyPress`, `type KeyResult` from `../key-listener`
      - `type HintOverlay` from `../../ui/hints`
      - `type Finder`, `type HintTarget` from `../hints/finder`
      - `type HintAction` from `../hints/actions`
      - `type Rect` from `../hints/geometry`
    - Module constants: `R1`, `R2`, `R3: Rect` with different values. Three detached `button`s `EL1`, `EL2`, `EL3`, built by a helper `button(id)` with ids `one`, `two`, `three` (Vitest compares DOM nodes with `isEqualNode`, so they must differ). `TARGETS: readonly HintTarget[]` pairs each element with its rect.
    - A `setup()` called in each test builds fresh fakes, each `vi.fn` in its own variable, and returns them all with `hint`, `machine`, `log` and `key`. `perform` and the `hint` deps read `machine` only when called, so `machine` may be declared after them; `hint` is annotated `HintMode`, which keeps TypeScript from seeing a circular inference:
      - `log: string[]`
      - `find = vi.fn<Finder['find']>(() => { log.push('find'); return TARGETS; })`
      - `show = vi.fn<HintOverlay['show']>()`
      - `filter = vi.fn<HintOverlay['filter']>()`
      - `remove = vi.fn<HintOverlay['remove']>(() => { log.push('remove'); })`
      - `perform = vi.fn<(action: HintAction, element: Element) => void>((action) => { log.push(\`perform:${action}:${machine.current}\`); })`
      - `stopScrolling = vi.fn<() => void>(() => { log.push('stopScrolling'); })`
      - `stopWatch = vi.fn<() => void>()`
      - `watchPage = vi.fn<(hinted: readonly Element[], onChange: () => void) => () => void>(() => stopWatch)`
      - `normalKey = vi.fn<(press: KeyPress) => KeyResult>(() => 'passed')`
      - `const hint: HintMode = createHintMode({ machine: { enter: (name, options) => { machine.enter(name, options); } }, finder: { find }, overlay: { show, filter, remove }, alphabet: 'ab', perform, stopScrolling, watchPage })` (pass the mocks as arrows if `unbound-method` complains; test files are linted too)
      - `const machine = createModeMachine([{ name: 'normal', handleKey: (press) => normalKey(press) }, { name: 'insert', handleKey: () => 'passed' }, hint], 'normal')`
      - `key(name: string, repeat = false): KeyResult` returns `machine.handleKey({ key: name, repeat })`
    - With alphabet `'ab'`, three targets get labels `['b', 'aa', 'ab']` and one target gets `['a']` (T1's algorithm).
    - Read call arguments as `mock.calls[0]?.[n]` and compare them with `toStrictEqual`. Don't use `expect.any`.
    - Test cases (all call `hint.start(...)` first unless named):
    - `start stops scrolling before finding` — after `hint.start('click')`, `log` starts with `['stopScrolling', 'find']` (design: Error handling).
    - `start finds targets for the action` — `it.each<readonly [HintAction, string]>([['click', 'clickable'], ['openTab', 'clickable'], ['copyUrl', 'copyableLink']])`: `find` called once with the filter (R1.6, R5.3).
    - `start enters Hint mode and shows one labelled hint per target` — `machine.current` is `'hint'`; `show` called once; its argument `toStrictEqual([{ label: 'b', rect: R1 }, { label: 'aa', rect: R2 }, { label: 'ab', rect: R3 }])`.
    - `start with no targets stays in Normal mode and shows nothing` — `find.mockReturnValueOnce([])`: `machine.current` is `'normal'`; `show` and `watchPage` not called; `stopScrolling` still called once (R3.10).
    - `start finds and labels again each time` — `start('click')`, `key('<Esc>')`, then `find.mockReturnValueOnce([{ element: EL2, rect: R2 }])` and `start('click')`. `find` called twice; the second `show` argument is `[{ label: 'a', rect: R2 }]`. `key('a')` then calls `perform` with `('click', EL2)`, though `'a'` was only a prefix in the first set of labels (R7.4).
    - `watches the page with the hinted elements and ends on a change` — after `start('click')`: `watchPage` called once; `watchPage.mock.calls[0]?.[0]` `toStrictEqual([EL1, EL2, EL3])`. Calling `watchPage.mock.calls[0]?.[1]?.()` gives current `'normal'`, `remove` and `stopWatch` called once, and `perform` not called (R7.2).
    - `a key with Ctrl, Alt or Meta ends Hint mode and passes` — `it.each(['<C-t>', '<A-x>', '<D-c>', '<C-S-Tab>', '<S-D-Tab>', '<C-lt>'])`: `key(k)` is `'passed'`; current `'normal'`; `remove` called; no `perform` (R3.7).
    - `<Esc> and <C-[> end without an action` — `it.each(['<Esc>', '<C-[>'])`: `'consumed'`, current `'normal'`, `remove` called, no `perform` (R3.5).
    - `ignores auto-repeated keys` — `key('b', true)` and `key('<Esc>', true)` are both `'consumed'`; still `'hint'`; no `perform`, `filter` or `remove` (R3.9; the design table checks repeat before `<Esc>`).
    - `narrows the hints as letters are typed` — `key('a')` is `'consumed'`; still `'hint'`; `filter` called once with `([1, 2], 1)` (R3.1). A second `setup()` with `key('A')` gives the same result (R2.5).
    - `<BS> removes the last typed letter` — `key('a')`, then `key('<BS>')` is `'consumed'`; still `'hint'`; `filter` last called with `([0, 1, 2], 0)` (R3.3).
    - `<BS> with nothing typed does nothing` — `'consumed'`; still `'hint'`; `filter` not called (R3.4).
    - `a full label removes the hints, returns to Normal mode, then runs the action` — `key('b')` is `'consumed'`; `perform` called once with `('click', EL1)`; `log` ends with `['remove', 'perform:click:normal']` (R3.2). Separate `setup()` runs: `a`, `b` after `start('click')` → `perform('click', EL3)`; `start('copyUrl')` then `b` → `perform('copyUrl', EL1)`; `start('openTab')` then `B` → `perform('openTab', EL1)`.
    - `any other key ends without an action and is consumed` — `it.each(['x', '1', '<CR>', '<Space>', '<S-Tab>', '<lt>', '<F5>'])`: `'consumed'`, current `'normal'`, `remove` called, no `perform` (R3.6, R3.8).
    - `leaving Hint mode stops watching, removes the hints and hands keys back` — after `<Esc>`: `stopWatch` and `remove` each called once; a later `key('b')` is `'passed'`; `normalKey` got `{ key: 'b', repeat: false }`; `perform` not called. The same through `machine.enter('insert')`, which is how the focus watcher ends Hint mode when an editable gets focus (R7.1, R7.3).
    - `starts no watcher while Hint mode is off` — `watchPage` not called before `start`, nor by a `start` that finds nothing. After `start` and an exit, `watchPage` and `stopWatch` have each been called exactly once (NFR1.3).
  - `src/core/mode-machine.test.ts`:
    - `setup()` passes `[normal.mode, insert.mode, fakeMode('hint').mode]`.
    - Add `throws when Hint mode is missing`: `createModeMachine([fakeMode('normal').mode, fakeMode('insert').mode], 'normal')` throws `'Missing mode: hint'`.
    - The existing `Missing mode: insert` (it registers only `normal`; `MODE_NAMES` is checked in order, so it still reports `insert`), duplicate and `MODE_NAMES` cases stay unchanged and still pass.
  - `src/core/controller.test.ts`:
    - Add module-level fakes, each in its own variable, all added to the `mockClear` list in `beforeEach`:
      - `viewport = vi.fn<Geometry['viewport']>(() => ({ left: 0, top: 0, width: 1000, height: 800 }))`
      - `rects = vi.fn<Geometry['rects']>(() => [])`
      - `isRendered = vi.fn<Geometry['isRendered']>(() => true)`
      - `hitTest = vi.fn<Geometry['hitTest']>(() => null)`
      - `openTab = vi.fn<MessageClient['openTab']>(() => Promise.resolve())`
    - Import `type Geometry` from `./hints/geometry`.
    - `start()` passes `geometry: { viewport: () => viewport(), rects: (element) => rects(element), isRendered: (element) => isRendered(element), hitTest: (x, y) => hitTest(x, y) }` (arrows, `unbound-method`) and `client: { sendCommand, openTab }`.
    - Add `reads no layout and shows no hints while Hint mode is off` — after `start()` and pressing `j`, `g`, `g`, `x`, `Escape`: none of the four geometry fakes and not `openTab` was called; `document.querySelector('vim-hints')` is `null` (NFR1.3).
    - Every existing test passes unchanged.
- **Steps:**
  1. Write the tests; they fail.
  2. `src/core/mode-machine.ts`: `export const MODE_NAMES = ['normal', 'insert', 'hint'] as const;`. Nothing else changes.
  3. Create `src/core/modes/hint.ts`.
     - Imports:
       - `generateLabels`, `matchPrefix` from `../hints/labels`
       - `type HintAction` from `../hints/actions`
       - `type Finder`, `type HintTarget`, `type TargetFilter` from `../hints/finder`
       - `type HintOverlay` from `../../ui/hints`
       - `type KeyPress`, `type KeyResult` from `../key-listener`
       - `type Mode`, `type ModeMachine` from `../mode-machine`
     - Exports: `export interface HintMode extends Mode { /** Finds targets for `action`. Enters Hint mode if there are any; else does nothing (R3.10). */ start(action: HintAction): void; }` and `export function createHintMode(deps: HintModeDeps): HintMode`. Doc comment: State pattern; every exit goes through `onExit` (R7.1).
     - Private `interface HintModeDeps` holds the design's deps, with doc comments: `machine: Pick<ModeMachine, 'enter'>`, `finder: Pick<Finder, 'find'>`, `overlay: HintOverlay`, `alphabet: string`, `perform: (action: HintAction, element: Element) => void`, `stopScrolling: () => void`, and `watchPage: (hinted: readonly Element[], onChange: () => void) => () => void` (the provisional signature in Agreements).
     - Private `interface HintState` with mutable fields: `action: HintAction`, `targets: readonly HintTarget[]`, `labels: readonly string[]`, `typed: string` (always lower case), `stopWatching: (() => void) | undefined`.
  4. Private constants and pure helpers in `hint.ts`:
     - `const LEAVE_KEYS: ReadonlySet<string> = new Set(['<Esc>', '<C-[>']);`
     - `const MODIFIED = /^<(?:C-|A-|(?:S-)?D-)/;` with a comment: key-notation writes modifiers in the order `C-`, `A-`, `S-`, `D-`, so a key has Ctrl, Alt or Meta exactly when it starts like this. `<S-Tab>` doesn't match.
     - `filterFor(action: HintAction): TargetFilter` — an exhaustive `switch`: `click` and `openTab` → `'clickable'`, `copyUrl` → `'copyableLink'` (R1.6).
     - `type KeyKind = 'modified' | 'repeat' | 'leave' | 'backspace' | 'letter' | 'other'` and `keyKind(press: KeyPress): KeyKind`. Checks, in order:
       1. `MODIFIED.test(press.key) && !LEAVE_KEYS.has(press.key)` → `'modified'` (R3.7; `<C-[>` is checked before the modifier rule)
       2. `press.repeat` → `'repeat'` (R3.9)
       3. `LEAVE_KEYS.has(press.key)` → `'leave'`
       4. `press.key === '<BS>'` → `'backspace'`
       5. `press.key.length === 1` → `'letter'`
       6. else `'other'`
  5. Private `narrow(deps: HintModeDeps, state: HintState, prefix: string): void` — `const match = matchPrefix(state.labels, prefix)`, then an exhaustive `switch (match.kind)`:
     - `none` → `deps.machine.enter('normal')` (R3.6).
     - `partial` → `state.typed = prefix.toLowerCase()`; `deps.overlay.filter(match.visible, state.typed.length)` (R3.1, R3.3).
     - `exact` → `const { action } = state; const element = state.targets[match.index]?.element;`, then `deps.machine.enter('normal')`, whose `onExit` removes the hints and clears the state. Then `if (element !== undefined) { deps.perform(action, element); }` (R3.2). Read both before entering Normal mode, because `onExit` empties the state. The `undefined` branch can't be reached through `matchPrefix`; it only satisfies `noUncheckedIndexedAccess`, and the 80% global coverage absorbs it.
  6. Private `routeKey(deps: HintModeDeps, state: HintState, press: KeyPress): KeyResult` — an exhaustive `switch (keyKind(press))`:
     - `modified` → `enter('normal')`, return `'passed'`.
     - `repeat` → `'consumed'`.
     - `backspace` → if `state.typed !== ''`, `narrow(deps, state, state.typed.slice(0, -1))`, with a comment: the shorter prefix of a partial match is always partial, because labels are prefix-free (R3.3, R3.4). Return `'consumed'`.
     - `letter` → `narrow(deps, state, state.typed + press.key)`, return `'consumed'` (R2.5 through `matchPrefix`).
     - `leave` and `other` (grouped) → `enter('normal')`, return `'consumed'` (R3.5, R3.6, R3.8).
  7. `createHintMode(deps)` holds one `const state: HintState = { action: 'click', targets: [], labels: [], typed: '', stopWatching: undefined }` and returns:
     - `name: 'hint'`.
     - `start(action)` — `deps.stopScrolling()`; `const targets = deps.finder.find(filterFor(action))`; return if `targets.length === 0` (R3.10). Otherwise set `state.action`, `state.targets`, `state.labels = generateLabels(targets.length, deps.alphabet)`, `state.typed = ''`, then `deps.machine.enter('hint')`.
     - `onEnter()` — `deps.overlay.show(state.targets.map((target, index) => ({ label: state.labels[index] ?? '', rect: target.rect })))`, then `state.stopWatching = deps.watchPage(state.targets.map((target) => target.element), () => { deps.machine.enter('normal'); })` (R7.2). `show` comes before `watchPage` so the watcher's two-frame grace starts once the hints are drawn.
     - `onExit()` — `state.stopWatching?.()`, `state.stopWatching = undefined`, `deps.overlay.remove()`, then `targets = []`, `labels = []`, `typed = ''` (R7.1, R7.3). `stopWatching` is safe to call after the watcher itself ended (T9's `stop` is idempotent).
     - `handleKey: (press) => routeKey(deps, state, press)`.

     Every function stays under the 60-line, complexity 10 and depth 3 limits. The file is about 130 lines.

  8. `src/core/controller.ts` (every count below is non-blank, non-comment lines, which is what `max-lines-per-function` counts, `skipBlankLines` and `skipComments` are on):
     - `ControllerDeps` gains `/** Layout reads and hit tests: createDomGeometry in the extension (R1.2, R1.3). */ readonly geometry: Geometry;`.
     - `client` widens to `Pick<MessageClient, 'sendCommand' | 'openTab'>`, with its doc comment extended: "and opens links in a new tab (R5.2)".
     - Add a private `createHints(deps: ControllerDeps, parts: { readonly scroller: Pick<Scroller, 'stop'>; readonly machine: () => Pick<ModeMachine, 'enter'> }): HintMode`, placed above `createModes`. Doc comment: `machine` is read only when Hint mode switches modes, after the machine exists. It returns a bare `HintMode`: `createHintMode({ … })` with the finder built inline (T12 hoists it into a `const finder` and returns `{ hint, finder }`):
       - `machine: { enter: (name, options) => { parts.machine().enter(name, options); } }`
       - `finder: createFinder({ document: deps.window.document, shadowRootOf: deps.shadowRootOf, geometry: deps.geometry })`
       - `overlay: createHintOverlay({ mount: () => mountUiRoot(deps.window.document), viewport: () => deps.geometry.viewport() })`
       - `alphabet: HINT_ALPHABET`
       - `perform: createHintActions({ geometry: deps.geometry, writeClipboard: (text) => deps.page.writeClipboard(text), client: deps.client })`
       - `stopScrolling: () => { parts.scroller.stop(); }`
       - `watchPage: (hinted, onChange) => watchPage({ window: deps.window, frames: deps.frames }, hinted, onChange)`
         It is about 25 counted lines. Building these objects reads no layout and touches no DOM (NFR1.3).
     - Methods are always called through arrows, never passed unbound (`unbound-method`).
     - `createModes`' deps gain `readonly hint: HintMode`, and it builds `createModeMachine([normal, insert, deps.hint], …)`.
     - In `createController`, add `const hint = createHints(deps, { scroller, machine: () => machine });` right after `createScroller(...)`, and pass `hint` to `createModes`. `machine` is declared by the later destructuring; reading it inside the arrow is legal, because the arrow only runs after `createModes` returns. Size check: `createController` is 53 counted lines today and these two additions make it 55 of 60. Don't inline the forwarder object here. T12 moves the registry out (and hoists the finder), and T13 moves the focus watcher out, which brings it down.
     - Imports, keeping the two existing groups:
       - `HINT_ALPHABET` added to the `../settings/defaults` import
       - `createHintOverlay` from `../ui/hints`
       - `mountUiRoot` from `../ui/shadow-root`
       - `createHintActions` from `./hints/actions`
       - `createFinder` from `./hints/finder`
       - `type Geometry` from `./hints/geometry`
       - `watchPage` from `./hints/page-watch`
       - `createHintMode`, `type HintMode` from `./modes/hint`
       - `type Scroller` added to the `./scroll/scroller` import
     - The file stays under 300 lines (about 190).
     - The existing focus watcher is not changed here. Until T12 adds the keys nothing starts Hint mode, so its "ends Hint mode when a non-editable gets focus" behaviour can't be seen; T13 makes Hint mode ignore non-editable focus (R7.3).
  9. `src/entrypoints/content.ts`:
     - Inside `main`, hoist the inline `shadowRootOf` arrow into `const shadowRootOf: ShadowRootOf = (host) => …`, placed before `createController` and keeping its comment. Let Prettier lay out the ternary.
     - Pass `shadowRootOf` and `geometry: createDomGeometry(window, shadowRootOf)`.
     - Imports: `import type { ShadowRootOf } from '@/core/editable'` and `import { createDomGeometry } from '@/core/hints/geometry'`.
     - `client: createMessageClient(...)` already has `openTab` after T7.
     - `main` is about 40 counted lines today, so it stays under 60. `src/entrypoints/**` is outside coverage and Knip's entry set.
  10. Run `npm run build`.
  11. In `tasks.md`: flip T10 to `[x] done`, set _Next task_ to T11, and add a dated _History_ line naming the commit subject.
- **Done when:** the new and changed tests pass; `npm run build` succeeds; `npm run check` passes. For Knip, `createHintMode` and `HintMode` are imported by `controller.ts` and `hint.test.ts`. Every product export from T1–T9 now has a product consumer. `createController` is at or under 60 counted lines (about 55).
- **Commit:** `Add: hint mode that narrows and picks hints as labels are typed`

### T11: Let i finish a mapped key sequence in Normal mode — [ ] todo

- **Requirements:** R6.1, R6.2 (makes `gi` reachable); keeps M1's R3.4 (`i` enters Insert mode) and R4.6 (a key that breaks a sequence is handled on its own) for every other case · **Design:** Commands ("Keymap additions"); see _Open questions_: the design's "none of them clashes" misses that Normal mode handles `i` before the keymap
- **Depends on:** — (lands before T12, which maps `g i`)
- **Files:** modify `src/core/modes/normal.ts`, `src/core/modes/normal.test.ts`
- **Tests first:** in `src/core/modes/normal.test.ts`:
  - Change `setup(options?: { editableFocused?: boolean; keymap?: readonly KeymapEntry[] })`: the trie is `buildKeymapTrie(options?.keymap ?? [{ keys: ['j'], command: 'scrollDown' }, { keys: ['g', 'g'], command: 'scrollToTop' }])`, so existing tests keep their trie. Change the import to `import { buildKeymapTrie, type KeymapEntry } from '../keymap-trie';`. Add a module-level `const WITH_GI: readonly KeymapEntry[] = [{ keys: ['g', 'g'], command: 'scrollToTop' }, { keys: ['g', 'i'], command: 'scrollToBottom' }];` with a comment that the command is a stand-in until T12 maps `focusInput`.
  - `lets i finish a mapped sequence instead of entering Insert mode`: `WITH_GI`; `g` then `i` both return `'consumed'`; `run` called once with `('scrollToBottom', { count: undefined, repeat: false })`; `enter` not called.
  - `passes the count to a sequence that ends in i`: `WITH_GI`; `2`, `g`, `i` → `run` called with `('scrollToBottom', { count: 2, repeat: false })`; `enter` not called.
  - `still enters sticky Insert mode on i after a count`: `WITH_GI`; `3`, `i` → `'consumed'`, `enter` called with `('insert', { sticky: true })`, `run` not called (a count alone leaves `state.keys` empty).
  - `enters sticky Insert mode on i once a pending sequence timed out`: `WITH_GI`; `g`, `fire(1)`, `i` → `enter` called with `('insert', { sticky: true })`, `run` not called (the timeout cleared the state, R4.5).
  - `enters Insert mode on i after a prefix that has no i continuation`: `WITH_GI` plus `{ keys: ['z', 'z'], command: 'scrollDown' }`; `z`, `i` → `enter` called with `('insert', { sticky: true })`, `run` not called (`z i` is `none`).
  - Existing `enters sticky Insert mode on i and consumes it` and `drops pending keys before entering Insert mode on i` stay unchanged (default trie has no `g i`, so `i` still drops the `g` and enters Insert mode).
- **Steps:**
  1. Write the tests; the first two fail (they enter Insert mode). The others pass already and guard the boundary.
  2. `normal.ts`: inside `createNormalMode`, add `const continuesSequence = (key: string): boolean => state.keys.length > 0 && deps.trie.lookup([...state.keys, key]).type !== 'none';`. In `handleKey` change the check to `if (press.key === 'i' && !continuesSequence(press.key))`, with the comment `// `i` enters sticky Insert mode unless it continues a mapped sequence (`gi`)`. Otherwise the key falls through to `parse`, which already runs or waits. The `editableFocused` check above it is untouched.
  3. Update the `createNormalMode` doc comment: "`i` enters sticky Insert mode, unless it continues a pending mapped sequence such as `gi`."
- **Done when:** the new tests pass; existing `normal.test.ts` and `controller.test.ts` tests pass unchanged (`gg` then `i` in `never logs keys` still enters Insert mode, because nothing is pending after `gg`); `npm run check` passes.
- **Commit:** `Change: let i finish a mapped key sequence in Normal mode`

### T12: Add the f, F, yf and gi commands — [ ] todo

- **Requirements:** R3.2, R3.5, R3.9, R3.10, R4.1, R4.2, R4.7, R5.1–R5.4, R5.7, R5.8, R6.1–R6.4, R7.6, NFR2.2 · **Design:** Commands, Controller wiring
- **Depends on:** T10 (Hint mode, `createHints`, and the geometry and `openTab` fakes in `controller.test.ts`), T11 (`i` finishes `g i`)
- **Why one commit:** adding the hint names to `COMMAND_NAMES` makes `createCommandRegistry` throw `Missing command` in `controller.ts` and `defaults.test.ts` until the commands are built and passed in. The keys and the controller tests that press them belong with them. The focus watcher and `stop()` changes (R7.3, R7.7, NFR4.1) are a separate task, T13, because they can be tested and reviewed on their own; until then `stop()` leaves open hints to the test's `afterEach` clean-up.
- **Files:** create `src/core/commands/hints.ts`, `src/core/commands/hints.test.ts`; modify `src/core/commands/registry.ts`, `src/core/controller.ts`, `src/core/controller.test.ts`, `src/settings/defaults.ts`, `src/settings/defaults.test.ts`
- **Tests first:**
  - `src/core/commands/hints.test.ts`. Imports: `createHintCommands` from `./hints`; `COMMAND_NAMES`, `createCommandRegistry`, `type Command`, `type CommandContext`, `type CommandName` from `./registry`; `type HintMode` from `../modes/hint`; `type Finder`, `type HintTarget` from `../hints/finder`.
    - Fakes, each in its own variable: `const start = vi.fn<HintMode['start']>()` and `const find = vi.fn<Finder['find']>(() => [])`, passed as arrows: `const commands = createHintCommands({ hints: { start: (action) => { start(action); } }, finder: { find: (filter) => find(filter) } })`.
    - `beforeEach`: `start.mockClear()`, `find.mockReset()` (back to `() => []`; Vitest's `restoreMocks` only restores `spyOn` spies). `afterEach`: `document.body.replaceChildren()`.
    - Helpers: `run(name: CommandName, ctx: CommandContext)` finds the command by name in `commands` (throws `No command <name>` if absent) and runs it. `inputs(n)` appends `n` `input` elements to the body and returns them. `targetsOf(elements)` maps them to `HintTarget`s with `rect: { left: 0, top: 0, width: 10, height: 10 }`.
    - `returns the four hint commands in order`: names `['hintClick', 'hintOpenTab', 'hintCopyUrl', 'focusInput']`; every `context` is `'page'`; every description is non-empty; `acceptsCount` is `[false, false, false, true]` (R4.7, R5.7).
    - `starts Hint mode with the action of each key`: `it.each([['hintClick', 'click'], ['hintOpenTab', 'openTab'], ['hintCopyUrl', 'copyUrl']] as const)` → `start` called once with the action; `find` not called (R4.1, R5.1, R5.3).
    - `ignores auto-repeat`: `it.each(['hintClick', 'hintOpenTab', 'hintCopyUrl', 'focusInput'] as const)` with `{ count: undefined, repeat: true }` → `start` and `find` not called (R3.9).
    - `drops a count on the hint keys and keeps it on focusInput through the registry`: a registry of `commands` plus a stub `Command` (`acceptsCount: true`, `context: 'page'`, `run: vi.fn<(ctx: CommandContext) => void>()`) for every other `COMMAND_NAMES` entry. `registry.run('hintClick', { count: 5, repeat: false })` → `start.mock.calls` is `[['click']]`. With three inputs as targets, `registry.run('focusInput', { count: 2, repeat: false })` → `document.activeElement` is the second (R4.7, R6.2).
    - `focusInput focuses the first text input`: three inputs as targets, `{ count: undefined, repeat: false }` → `document.activeElement` is the first; `find` called once with `'textInput'` (R6.1).
    - `focusInput with a count focuses the Nth or the last`: `it.each([[1, 0], [2, 1], [3, 2], [9, 2]])` → the input at that index is active (R6.2).
    - `focusInput does nothing without text inputs`: `find` returns `[]`; running doesn't throw and `document.activeElement` is still `document.body` (R6.3).
    - `focusInput keeps the value and uses a plain focus`: the first input has `value = 'hello'`; `const focus = vi.spyOn(first, 'focus')`; after running, `focus` was called once with no arguments (`toHaveBeenCalledWith()`), and the value is still `'hello'` (R6.4).
  - `src/settings/defaults.test.ts`:
    - `EXPECTED` gains, at the end, `{ keys: ['f'], command: 'hintClick' }`, `{ keys: ['F'], command: 'hintOpenTab' }`, `{ keys: ['y', 'f'], command: 'hintCopyUrl' }`, `{ keys: ['g', 'i'], command: 'focusInput' }` (29 entries).
    - The registry test adds `...createHintCommands({ hints: { start: vi.fn<HintMode['start']>() }, finder: { find: vi.fn<Finder['find']>(() => []) } })`, with imports `createHintCommands` from `@/core/commands/hints`, `type Finder` from `@/core/hints/finder`, `type HintMode` from `@/core/modes/hint`.
    - The no-clash, prefix and no-`Cmd` tests stay as they are (NFR2.2).
  - `src/core/controller.test.ts`: a `describe('link hints')`. This task creates the box map; T10 left `rects` and `hitTest` as plain `vi.fn`s returning `[]` and `null`.
    - Module-level `const boxes = new Map<Element, Rect>()` (import `type Rect` from `./hints/geometry`). In `beforeEach`, after the `mockClear` calls, `rects.mockImplementation((element) => { const box = boxes.get(element); return box === undefined ? [] : [box]; })` and `hitTest.mockImplementation((x, y) => …)` returning the last element of `boxes` whose box contains the point `(x, y)`, else `null`. In `afterEach`, after the existing `controller?.stop()`, call `boxes.clear()` and `document.querySelector('vim-hints')?.remove()`. The host sits under `documentElement`, so `document.body.replaceChildren()` doesn't remove it; `stop()` doesn't remove open hints until T13, so the explicit removal is needed here and stays as a safety net so one failing test can't leak a host into the next test's `host()` checks.
    - Module-level in the describe: `let clicked: string[] = []`, reset in its `beforeEach`.
    - Helpers:
      - `place(element, box: Rect)` sets `boxes` and returns the element.
      - `addField(box: Rect)` appends an `input` with `addInput()` and places it, returning it. `addButton(id: string, box: Rect)` appends a `button` with that `id` and a `click` listener pushing `id` to `clicked`, then places it.
      - `addLink(href: string, box: Rect)` appends an `a` with that `href` and a `click` listener that pushes `'link'` and calls `preventDefault()` (jsdom would otherwise log "Not implemented: navigation"), then places it.
      - `host()` returns `document.querySelector('vim-hints')`.
      - `keys(list: readonly string[])` presses each key in turn and returns the events.
    - Boxes: `TOP = { left: 0, top: 0, width: 100, height: 20 }` and `BELOW = { left: 0, top: 40, width: 100, height: 20 }`. With `HINT_ALPHABET` the first target's label is `s` and the second's is `a`.
    - `f shows hints and a label clicks its element`: `addButton('first', TOP)`, `addButton('second', BELOW)`; `press('f').defaultPrevented` true; `host()` not null; `press('s').defaultPrevented` true → `clicked` is `['first']`, `host()` null (R4.1, R4.2, R3.2).
    - `f with nothing to hint consumes the key and stays in Normal mode`: `press('f').defaultPrevented` true; `host()` null; `press('j').defaultPrevented` true and `scrollTop()` is 60 (R3.10).
    - `Esc removes the hints without clicking`: two buttons; `f`; `press('Escape').defaultPrevented` true; `host()` null; `clicked` is `[]` (R3.5).
    - `a count before f is ignored`: two buttons; `3`, `f`, `s` → `clicked` is `['first']` (R4.7).
    - `a held f starts Hint mode once`: one button; `press('f')`, `press('f', { repeat: true })` → `host()` not null; `press('s')` → `clicked` is `['first']` (R3.9).
    - `F opens a link in a background tab`: only `addLink('https://x.test/a', TOP)`; `F`, `s` → `openTab` called once with `'https://x.test/a'`; `clicked` is `[]`; `writeClipboard` not called (R5.1, R5.2, R5.8).
    - `yf copies a link's URL`: the same link; `y`, `f`, `s` → `writeClipboard` called once with `'https://x.test/a'`; `openTab` not called; `clicked` is `[]` (R5.3, R5.4, R5.8).
    - `gi focuses the first text input and enters Insert mode`: `addField(TOP)` and `addField(BELOW)`; `g`, `i` → `document.activeElement` is the first; `press('j').defaultPrevented` false (R6.1).
    - `2gi focuses the second text input`: the same inputs; `2`, `g`, `i` → the second is active (R6.2).
    - `gi with no text input consumes the keys and stays in Normal mode`: `press('g')` and `press('i')` both prevented; `press('j').defaultPrevented` true and `scrollTop()` is 60 (R6.3; a missing T11 would enter Insert mode here).
    - `keys in Insert mode never start hints`: a focused `addInput()` before `start()`; `keys(['f', 'F', 'y', 'f', 'g', 'i'])` are all not prevented; `host()` null; `document.activeElement` is still the input. A second test: no field, sticky `i`, then `press('f').defaultPrevented` false and `host()` null (R7.6).
- **Steps:**
  1. Write the tests; they fail.
  2. `registry.ts`: add a private `const HINT_COMMAND_NAMES = ['hintClick', 'hintOpenTab', 'hintCopyUrl', 'focusInput'] as const;` after `PAGE_COMMAND_NAMES`. Set `COMMAND_NAMES = [...SCROLL_COMMAND_NAMES, ...PAGE_COMMAND_NAMES, ...HINT_COMMAND_NAMES, ...BACKGROUND_COMMAND_NAMES] as const`. It stays here, not in `commands/hints.ts`: `hints.ts` imports `onceOnly` from `registry.ts`, and the cycle would leave `HINT_COMMAND_NAMES` in the TDZ when `hints.ts` loads first (see _Agreements_). `registry.test.ts`, `navigation.test.ts` and `background.test.ts` derive their fakes from `COMMAND_NAMES` and need no change.
  3. Create `src/core/commands/hints.ts`:
     - Imports: `import type { Finder } from '../hints/finder'`, `import type { HintMode } from '../modes/hint'`, `import { onceOnly, type Command, type CommandContext, type CommandName } from './registry'`.
     - A private `pageCommand(name, description, acceptsCount, run)` like `navigation.ts`'s (`context: 'page'`, `run: onceOnly(run)`).
     - A private `focusInput(finder: Pick<Finder, 'find'>, count: number | undefined): void`: `const inputs = finder.find('textInput'); const target = inputs[Math.min(count ?? 1, inputs.length) - 1]?.element; if (target instanceof HTMLElement) { target.focus(); }`. Add a comment that the plain `focus()` keeps the value and caret (R6.4) and that the focus watcher enters Insert mode (R6.1).
     - `export function createHintCommands(deps: { readonly hints: Pick<HintMode, 'start'>; readonly finder: Pick<Finder, 'find'> }): readonly Command[]`, with a doc comment citing R4.1, R5.1, R5.3 and R6. It returns, in order:
       - `hintClick`, "Click a hinted element", `false`, `start('click')`.
       - `hintOpenTab`, "Open a hinted link in a background tab", `false`, `start('openTab')`.
       - `hintCopyUrl`, "Copy a hinted link's URL", `false`, `start('copyUrl')`.
       - `focusInput`, "Focus the first text input (count: the Nth)", `true`, `focusInput(deps.finder, ctx.count)`.
  4. `controller.ts`:
     - Hoist the finder inside `createHints`: `const finder = createFinder({ document: deps.window.document, shadowRootOf: deps.shadowRootOf, geometry: deps.geometry });`, pass `finder` to `createHintMode` (replacing the inline `createFinder` call), and change the return type to `{ readonly hint: HintMode; readonly finder: Finder }`, returning `{ hint, finder }` where `hint` is the `createHintMode(...)` result. T10 returns a bare `HintMode`; this task updates its one call site.
     - The registry moves out of `createController` (T10 leaves it inline, with that function at about 55 of 60 lines) into a new private `createRegistry(deps: ControllerDeps, parts: { readonly scroller: Scroller; readonly tracker: ScrollTargetTracker; readonly hint: Pick<HintMode, 'start'>; readonly finder: Pick<Finder, 'find'> }): CommandRegistry`. It returns `createCommandRegistry([...createScrollCommands({ scroller: parts.scroller, targets: parts.tracker }), ...createNavigationCommands(deps.page), ...createHintCommands({ hints: parts.hint, finder: parts.finder }), ...createBackgroundCommands({ client: deps.client })])`.
     - In `createController`, build `const { hint, finder } = createHints(deps, { … })` after the scroller and tracker (unchanged arguments), then `const registry = createRegistry(deps, { scroller, tracker, hint, finder })`, then `createModes` as in T10. The focus watcher and `stop()` are unchanged here (T13).
     - New imports: `createHintCommands` from `./commands/hints`; `type Finder` added to the `./hints/finder` import; `type ScrollTargetTracker` added to the `./scroll/scroll-target` import. `createController` counts about 53 lines today (blank and comment lines skipped, as ESLint does) and about 55 after T10; T12 moves the registry (5 lines to 1) out, leaving about 51 of 60. T13 then brings it to about 50. The file stays under 300 (about 205).
  5. `defaults.ts`: append `{ keys: ['f'], command: 'hintClick' }`, `{ keys: ['F'], command: 'hintOpenTab' }`, `{ keys: ['y', 'f'], command: 'hintCopyUrl' }`, `{ keys: ['g', 'i'], command: 'focusInput' }` to `DEFAULT_KEYMAP`.
  6. Run `npm run build` and `npm run test:e2e`. No M1 or M2 spec presses `f`, `F`, `yf` or `g` then `i`, so they must still pass. If the full run hangs on Chromium launch, as in M2, run each spec alone with `npx playwright test <name> --workers=1` and record that in _History_ (see _Agreements_).
- **Done when:** the tests pass; `npm run build` succeeds; the M1 and M2 e2e specs pass; `npm run check` passes. Knip: `createHintCommands` is imported by the controller and both tests, and `HINT_COMMAND_NAMES` is not exported. ESLint: `createController` is within 60 lines (about 51).
- **Commit:** `Add: f, F, yf and gi commands for link hints`

### T13: End Hint mode on focus and on stop, and prove it never logs — [ ] todo

- **Requirements:** R7.2, R7.3, R7.7, NFR4.1 · **Design:** Hint mode ("Focus while hints are up"), Controller wiring (R7.7)
- **Depends on:** T12 (the `f` key, the `boxes` map and the link-hints helpers in `controller.test.ts`)
- **Why separate:** split out of T12 by the round-2 scope critic. These two controller changes (`followFocus`, the `stop()` guard) don't affect the commands commit, which must stay together; each is observable only through `f`.
- **Files:** modify `src/core/controller.ts`, `src/core/controller.test.ts`, `docs/specs/2026-11-22-link-hints/tasks.md` (status only)
- **Tests first:** in the `describe('link hints')` of `src/core/controller.test.ts`, reusing T12's `place`, `addButton`, `addInput`, `host`, `keys`, `boxes` and `flushFrames`:
  - `an editable getting focus ends Hint mode and enters Insert mode`: two buttons; `f`; `addInput().focus()` (not placed) → `host()` null; `press('j').defaultPrevented` false (R7.3).
  - `focus moving to a button keeps the hints`: two buttons; `f`; the second button gets `focus()` → `host()` not null; `press('s')` → `clicked` is `['first']` (R7.3). This fails before the task: today any non-editable focus enters Normal mode and ends Hint mode.
  - `a scroll ends Hint mode`: two buttons; `f`; `flushFrames(16)`, `flushFrames(32)` (T9 arms after two frames); `document.dispatchEvent(new Event('scroll'))` → `host()` null; `press('s').defaultPrevented` false; `clicked` is `[]` (R7.2). It already passes through T9's watcher; it guards the wiring.
  - `stop() removes open hints`: `const started = start()`; two buttons; `f`; `started.stop()` → `host()` null (R7.7). T12's `afterEach` safety net stays.
  - `never logs while hints are up`: create the five console spies exactly as `never logs keys` does (`vi.spyOn(console, 'debug' | 'log' | 'info' | 'warn' | 'error')`); two buttons; `keys(['f', 'Backspace', 'Escape', 'f', 's', '3', 'f', 'x'])`. That covers `<BS>` with nothing typed, cancel, a pick, an ignored count and a non-label key. No spy is called (NFR4.1).
- **Steps:**
  1. Write the tests; the focus and `stop()` tests fail.
  2. `controller.ts`: replace the inline focus watcher with a private `followFocus(deps: ControllerDeps, machine: Pick<ModeMachine, 'current' | 'isSticky' | 'enter'>): () => void` that returns `watchFocus(deps.window, deps.shadowRootOf, (editable) => { if (machine.isSticky || (machine.current === 'hint' && !editable)) { return; } machine.enter(editable ? 'insert' : 'normal'); })`. Its comment: "Sticky Insert mode ignores focus changes (R3.7); Hint mode ignores all but an editable getting focus (R7.3)". `createController` calls `const stopFocus = followFocus(deps, machine)`.
  3. `stop()`: after `stopped = true` and before `stopKeys()`, add `if (machine.current === 'hint') { machine.enter('normal'); }` with the comment `// Ends Hint mode: removes its hints and watchers (R7.7)`. The guard keeps `stop()` from touching Insert mode or its sticky flag; the Hint branch is covered by the `stop() removes open hints` test and the other branch by every other `stop()`. `Hint.onExit` calls `overlay.remove()` and the page watcher's stop, both safe after the page's extension context is gone.
  4. Run `npm run check`.
  5. In `tasks.md`: flip T13 to `[x] done`, set _Next task_ to T14 and add a dated _History_ line naming the commit subject.
- **Done when:** the new tests pass and every existing controller test passes unchanged; `createController` is about 50 counted lines (at most 60) and `followFocus` is under complexity 10; `npm run check` passes.
- **Commit:** `Add: end hint mode on editable focus and on stop`

### T14: Add end-to-end tests for f and cancelling — [ ] todo

- **Requirements:** R1.1–R1.5, R2.6, R3.2, R3.5–R3.8, R3.10, R4.1–R4.5, R7.1, R7.2, R7.5, R7.6, NFR5.2, NFR6.1 · **Design:** Testing strategy (end-to-end)
- **Depends on:** T13 (and through it T1–T12)
- **Files:** create `tests/e2e/hints.spec.ts`, `tests/e2e/fixtures/hints.ts`; modify `tests/e2e/fixtures/pages.ts`, `docs/specs/2026-11-22-link-hints/tasks.md` (marker, _Next task_ and _History_ only)
- **Tests first:** this task adds only tests, against the code of T1–T13. If one fails, see step 5.
  - `tests/e2e/fixtures/pages.ts` (stays under 300 lines, about 115):
    - `Window` global gains `events: string[]`.
    - Exported `HINTS_URL = 'https://example.test/hints'` and `OPENED_URL = 'https://example.test/opened'`.
    - Private `HINTS_HEAD = RECORDER + '<style>vim-hints { display: none !important; position: static !important; pointer-events: auto !important; }</style>'`: a page rule that tries to hide the host and make it catch clicks. The host's inline `!important` styles must win (R2.6).
    - Private `HINTS_BODY`, an array of strings joined with `''`, one element per line, in this order (write any element that mixes quotes as a template literal, like `form`'s body, so Prettier leaves it alone):
      1. `<a id="first" href="https://example.test/opened">First</a>`
      2. `<a id="hidden" href="https://example.test/hidden" style="display: none">Hidden</a>`
      3. `<button id="button">Button</button>`
      4. `<input id="text">`
      5. `<textarea id="area"></textarea>`
      6. `<select id="pick"><option>One</option><option>Two</option></select>`
      7. `<label id="check-label"><input id="check" type="checkbox"> Check</label>`
      8. `<a id="blank" href="https://example.test/opened" target="_blank">Blank</a>`
      9. `<div id="shadow-host"></div>`
      10. `<a id="covered" href="https://example.test/covered" style="position: absolute; top: 300px; left: 0">Covered</a>`
      11. `<div id="cover" style="position: absolute; top: 290px; left: 0; width: 400px; height: 60px; background: #fff"></div>`
      12. `<iframe id="frame" srcdoc="<a href='https://example.test/framed'>Framed</a>" style="position: absolute; top: 400px; left: 0"></iframe>`
      13. `<a id="last" href="#last">Last</a>`
      14. `<a id="offscreen" href="https://example.test/offscreen" style="position: absolute; top: 3000px; left: 0">Off</a>`
      15. `FILLER`
      16. A `<script>` that sets `window.events = []`; adds one capture listener on `document` for each of `pointerdown`, `mousedown`, `pointerup`, `mouseup` and `click` that pushes `event.type + ':' + id`, where `id` is the `id` of `event.composedPath()[0]` when that is an `Element`, else `''`; then attaches a closed shadow root to `#shadow-host` holding `<button id="shadow-button">Shadow</button>`, built with `createElement` and `textContent`. For an event from inside the closed root, `composedPath()[0]` seen from the document is the host, so the recorded id is `shadow-host`.
    - `PAGES` gains `hints: page(HINTS_BODY, HINTS_HEAD)` and `empty: page('<p>No links here</p>', RECORDER)`.
    - Expected `f` labels, with the alphabet `sadfjklewcmpgh` (T1's queue order `s a d f j k l e w c …`), in document order:

      | Element                             | Label |
      | ----------------------------------- | ----- |
      | `first`                             | `s`   |
      | `button`                            | `a`   |
      | `text`                              | `d`   |
      | `area`                              | `f`   |
      | `pick`                              | `j`   |
      | `check` (its label gets none, R1.4) | `k`   |
      | `blank`                             | `l`   |
      | the shadow button                   | `e`   |
      | `last`                              | `w`   |

      Nine labels in all. An off-screen target would get `c`. In `yf` order (copyable links only) the labels are `first` s, `blank` a, `last` d; T15 relies on that.
  - `tests/e2e/fixtures/hints.ts` (new): the helpers shared with `hint-actions.spec.ts` (T15). They live here, not in `pages.ts` (page markup and `openPage` only) and not in a spec, because Playwright would register a spec's tests twice if another spec imported it. Imports: `expect`, `type BrowserContext`, `type Locator`, `type Page` from `@playwright/test` (not from `../fixtures`, which would resolve to `fixtures.ts`); `OPENED_URL`, `openPage`, `readSeen` from `./pages`. Each export has an explicit return type and a one-line JSDoc:
    - `openHints(context: BrowserContext): Promise<Page>`:
      1. `await context.route(OPENED_URL, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><p>Opened</p>' }))` (`page()` in `pages.ts` is private).
      2. `const hints = await openPage(context, 'hints')`.
      3. Close every page in `context.pages()` whose URL is `about:blank`, as `tabs.spec.ts` does (after opening, so the window survives).
      4. `await hints.bringToFront()` and return it.
    - `press(page: Page, keys: readonly string[]): Promise<void>` awaits `page.keyboard.press` for each key in turn. `F` is always `'F'`, never `'Shift+F'` (a lone Shift reaches the page).
    - `hintHost(page: Page): Locator` is `page.locator('vim-hints')`.
    - `readEvents(page: Page): Promise<string[]>` returns `page.evaluate(() => window.events)`.
    - `readClicks(page: Page): Promise<string[]>` returns the ids of the `click:` entries of `readEvents`: filter `startsWith('click:')`, then `slice('click:'.length)`.
    - `expectOnlySentinel(page: Page): Promise<void>`:
      1. Press `z`.
      2. `await expect.poll(() => readSeen(page)).toContain('keyup:z:false')`.
      3. `expect(await readSeen(page)).toEqual(['keydown:z:false', 'keyup:z:false'])`.

      It proves every earlier key was handled and none reached the page.

    - `nextFrames(page: Page): Promise<void>` runs `page.evaluate(async () => { for (let i = 0; i < 3; i += 1) { await new Promise<void>((resolve) => { requestAnimationFrame(() => { resolve(); }); }); } })`: three frames one after the other, one more than T9's two-frame grace. Every arrow body is in braces (`no-confusing-void-expression`).
    - `pageState(page: Page): Promise<string>` evaluates, in the page, `const last = document.getElementById('last')?.getBoundingClientRect();` and returns `[scrollX, scrollY, documentElement.scrollWidth, documentElement.scrollHeight, last?.left ?? '', last?.top ?? '', document.activeElement?.tagName ?? '', getSelection()?.toString() ?? ''].join(',')`.
  - `tests/e2e/hints.spec.ts` (about 250 lines; the 300-line limit applies to e2e files):
    - Top-level `test`s, no `describe`. Imports: `type Page` from `@playwright/test`; `expect` and `test` from `./fixtures`; `HINTS_URL`, `OPENED_URL`, `openPage` and `readSeen` from `./fixtures/pages`; `expectOnlySentinel`, `hintHost`, `nextFrames`, `openHints`, `pageState`, `press`, `readClicks` and `readEvents` from `./fixtures/hints`.
    - Constants for every string of 10 or more characters used 3 or more times (`sonarjs/no-duplicate-string` is on for e2e specs).
    - One local helper, `scrollY(page: Page): Promise<number>` returning `page.evaluate(() => window.scrollY)`.
    - Tests:
      - `f and a label follow a link`: `openHints`; press `f`, `s`; `await page.waitForURL(OPENED_URL)` (R4.1, R3.2).
      - `f and a label click a button with press and release events, and the hints go away`:
        - `f`, then `hintHost` `toHaveCount(1)`.
        - `a`, then `expect.poll(() => readEvents(page))` `toEqual(['pointerdown:button', 'mousedown:button', 'pointerup:button', 'mouseup:button', 'click:button'])`, then `hintHost` `toHaveCount(0)`.
        - `a` being the button proves the hidden link got no label (R4.2, R1.2, R7.1).
      - `the host keeps its own style against the page's CSS`:
        - `f`, then `hintHost` `toHaveCount(1)`.
        - `hintHost(page).evaluate` returns `{ position, pointerEvents, display }` from `getComputedStyle`, `getAttribute('aria-hidden')` and `matches(':popover-open')`.
        - Expect `position` `fixed`, `pointerEvents` `none`, `display` not `none`, `aria-hidden` `'true'`, `:popover-open` `true` (top layer, above the page).
        - Then `Escape` and `hintHost` `toHaveCount(0)` (R2.6, NFR5.2).
      - `showing hints leaves layout, scroll, focus and selection alone`:
        - Select the contents of `#first` with `page.evaluate` (a `Range` and `getSelection()?.addRange`).
        - `const before = await pageState(page)`; `f`; `hintHost` `toHaveCount(1)`; `expect(await pageState(page)).toBe(before)`.
        - `Escape`; `hintHost` `toHaveCount(0)`; `pageState` still equals `before` (R7.5, R7.1).
      - `f on a text input focuses it and enters Insert mode`:
        - `f`, `d`, then `page.keyboard.type('xj')`.
        - `#text` `toHaveValue('xj')`; `scrollY` is 0; `readClicks` is `[]`.
        - `x` and `j` would close the tab and scroll in Normal mode, and the field is focused, not clicked (R4.3).
      - `f on a select focuses it and enters Insert mode`:
        - `f`, `j`; `#pick` `toBeFocused()`.
        - Press `j`, then `expect.poll(() => readSeen(page)).toContain('keydown:j:false')`.
        - `scrollY` is 0; `readClicks` is `[]` (R4.4).
      - `a checkbox inside its label gets one hint`:
        - `f`, `k`; `#check` `toBeChecked()`.
        - `expect.poll(() => readClicks(page)).toEqual(['check'])`. A hinted label would make `k` click `check-label` first (R1.4).
      - `f on a target=_blank link opens it`:
        - `const [opened] = await Promise.all([context.waitForEvent('page'), press(page, ['f', 'l'])])`.
        - `await opened.waitForURL(OPENED_URL)`, since the new page starts at `about:blank`.
        - `expect(page).toHaveURL(HINTS_URL)` (R4.5).
      - `f reaches a button in a closed shadow root`:
        - `f`, `e`, then `expect.poll(() => readClicks(page)).toEqual(['shadow-host'])`.
        - The closed root retargets the path to its host (R1.1).
      - `off-screen, hidden, covered and iframe links get no label`:
        - First, on the unscrolled page: `f`; `hintHost` `toHaveCount(1)`; `c`; `hintHost` `toHaveCount(0)`; `expectOnlySentinel`; `expect(page).toHaveURL(HINTS_URL)`; `readClicks` is `[]`. `c` would be the off-screen link's label (R1.2, R3.6).
        - Then: `f`, `w`; `expect(page).toHaveURL(HINTS_URL + '#last')`; `readClicks` is `['last']`. `w` is the 9th label, so the hidden, covered and iframe links, which all come before `last`, got none (R1.2, R1.3, R1.5).
        - This order matters: following `#last` scrolls the page.
      - `Esc and a non-label key cancel without reaching the page`:
        - `f`; count 1; `Escape`; count 0.
        - `f`; count 1; `q`; count 0.
        - `expectOnlySentinel`; `readClicks` is `[]` (R3.5, R3.6, R3.8, R7.1).
      - `Ctrl+[ cancels without reaching the page`:
        - `f`; count 1; `Control+BracketLeft`; count 0.
        - Press `z` and poll `readSeen` to contain `'keyup:z:false'`.
        - No `readSeen` entry starts with `keydown:[`; `readClicks` is `[]` (R3.5).
        - A lone `Control` keydown reaches the page, so `expectOnlySentinel` can't be used here.
      - `a key with Ctrl cancels and reaches the page`:
        - `f`; count 1; `Control+b`; count 0.
        - `expect.poll(() => readSeen(page)).toContain('keydown:b:false')` (R3.7).
      - `scrolling cancels the hints`:
        - `f`; count 1; `nextFrames(page)`; `page.mouse.wheel(0, 200)`.
        - `expect.poll(() => scrollY(page)).toBeGreaterThan(0)`; `hintHost` `toHaveCount(0)`.
        - Press `a`, then poll `readSeen` to contain `'keydown:a:false'`, which means Hint mode was off and the unmapped `a` reached the page; `readClicks` is `[]` (R7.2, R7.1).
      - `a page with nothing to hint shows nothing and consumes f`: `openPage(context, 'empty')`; `f`; `hintHost` `toHaveCount(0)`; `expectOnlySentinel` (R3.10).
      - `typing in a field never starts hints`:
        - `openHints`; `await page.focus('#text')`; `page.keyboard.type('fFyg')`.
        - `#text` `toHaveValue('fFyg')`; `hintHost` `toHaveCount(0)` (R7.6).
- **Steps:**
  1. Run `npm run test:e2e` once before changing anything; the M1 and M2 specs must pass. If Chromium is missing, run `npx playwright install chromium` once.
  2. Add the pages to `pages.ts`, create `fixtures/hints.ts`, write `hints.spec.ts`, and run `npm run test:e2e`, which builds first.
  3. Every wait is an `expect.poll`, a locator assertion, `waitForURL` or a Playwright event. No `waitForTimeout`, no `!`, no `any`, no `console`. Keep each function and test under 60 lines and each file under 300 (size limits apply to e2e files); check with `wc -l`.
  4. Run `npm run check` (it type-checks and lints `tests/e2e` and runs Prettier on them).
  5. If a test fails:
     - When the fixture's own layout is the cause, fix the fixture, not the assertion, and say why in the _History_ line. For example, an element wraps off-screen at 1280x720, or the cover doesn't cover.
     - When the product breaks the spec (a hidden element gets a label, a key reaches the page), stop. Add a fix task before T14, set _Blocked by_ to it, and leave T14 `[ ] todo`.
  6. In `tasks.md`, flip T14 to `[x] done`, set _Next task_ to T15, and add a dated _History_ line naming the commit subject.
- **Done when:** `npm run test:e2e` passes. If the full suite hangs on Chromium launch, as in M2, `npm run build && npx playwright test hints.spec --workers=1` passes instead, and _History_ records that. `npm run check` passes.
- **Commit:** `Test: add end-to-end tests for link hints with f`

### T15: Add end-to-end tests for F, yf, gi and a large page — [ ] todo

- **Requirements:** R1.6, R5.1–R5.5, R6.1–R6.4, R7.1, NFR1.1 (smoke), NFR6.1 · **Design:** Testing strategy (end-to-end, performance)
- **Depends on:** T14 (the `hints` and `empty` pages, `window.events`, `HINTS_URL` and `OPENED_URL` in `pages.ts`, the `OPENED_URL` route set by `openHints`, and the helpers in `tests/e2e/fixtures/hints.ts`)
- **Files:** create `tests/e2e/hint-actions.spec.ts`; modify `tests/e2e/fixtures/pages.ts`, `docs/specs/2026-11-22-link-hints/tasks.md` (marker and _History_)
- **Tests first:** this task adds only tests, against the code of T1–T14.
  - `pages.ts`: add a private `MANY_SCRIPT` constant and a `many` entry to `PAGES`. The entry is `page('<div id="grid"></div><div style="height: 5000px"></div><div id="rest"></div>' + MANY_SCRIPT)`, with no `RECORDER`. The script builds everything with `createElement`, never `innerHTML`:
    - 100 links appended to `#grid`, `id` `link-<i>`, `href` `#link-<i>`, `style.cssText = 'display: inline-block; width: 40px; height: 20px'`. They take 4 rows at 1280 px wide.
    - 9,000 `div`s appended to `#rest`, every tenth holding a `button` with the text `Off`. That makes 900 off-screen buttons, so the page has 1,000 clickables among about 10,000 elements.
    - With exactly 100 visible targets and the alphabet `sadfjklewcmpgh`, links 0–6 get `e w c m p g h` and link 7 gets `ss`.
  - Labels on the `hints` page, from T14's table (`F` uses the same targets as `f`): `first` `s`, `button` `a`, `text` `d`, `area` `f`, `pick` `j`, `check` `k`, `blank` `l`, the shadow button `e`, `last` `w`. For `yf`, which hints only copyable links: `first` `s`, `blank` `a`, `last` `d`.
  - `hint-actions.spec.ts`: top-level tests, no `describe`.
    - Imports: `test`, `expect` from `./fixtures`; `type BrowserContext`, `type Page` from `@playwright/test`; `HINTS_URL`, `OPENED_URL`, `openPage` from `./fixtures/pages`; `expectOnlySentinel`, `hintHost`, `openHints`, `press`, `readClicks` from `./fixtures/hints`. Do not import `readSeen` (nothing here uses it).
    - Module-level `const ORIGIN = 'https://example.test'`.
    - Local declarations, each with an explicit return type:
      - `declare const chrome` with the comment from `tabs.spec.ts` (the tests' tsconfig has no chrome types). Its only method is `tabs.query(filter: { readonly lastFocusedWindow: boolean }): Promise<readonly WorkerTab[]>`, where `interface WorkerTab { readonly id?: number | undefined; readonly index: number; readonly active: boolean; readonly openerTabId?: number | undefined }`.
      - A private `interface TabRow { readonly id: number; readonly index: number; readonly active: boolean; readonly openerTabId?: number | undefined }`.
      - `workerTabs(context: BrowserContext): Promise<TabRow[]>`: takes `context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))` and evaluates `chrome.tabs.query({ lastFocusedWindow: true })` in the worker, mapping each tab to `{ id: tab.id ?? -1, index, active, openerTabId }`. In Node it returns the rows `toSorted((a, b) => a.index - b.index)`.
      - `tabCount(context: BrowserContext): Promise<number>`: `(await workerTabs(context)).length`, used with `expect.poll`.
      - `grantClipboard(context: BrowserContext, page: Page): Promise<void>`: `context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN })`, then `page.evaluate(() => navigator.clipboard.writeText('unset'))`, so a stale clipboard can't pass.
      - `clipboardText(page: Page): Promise<string>`: `page.evaluate(() => navigator.clipboard.readText())`.
  - Tests. Every key goes through `press(page, [...])`, and `F` is always `'F'`, never `'Shift+F'` (a lone Shift reaches the page and would break the sentinel).
    - `F opens a link in a background tab right after the current one`:
      - `const page = await openHints(context)`, then `const [opened] = await Promise.all([context.waitForEvent('page'), press(page, ['F', 's'])])`, then `await opened.waitForURL(OPENED_URL)`.
      - `await expect.poll(() => tabCount(context)).toBe(2)`, then `const [current, next] = await workerTabs(context)`.
      - `expect(current?.id).toBeDefined()` and `expect(current).toMatchObject({ index: 0, active: true })`. Then `expect(next).toMatchObject({ index: 1, active: false, openerTabId: current?.id })`.
      - `expect(page).toHaveURL(HINTS_URL)` and `hintHost(page)` `toHaveCount(0)` (R5.1, R5.2, R7.1).
    - `F twice keeps the order of the new tabs`:
      - `openHints`, then `press(page, ['F', 's'])`, then poll `tabCount` until 2. Waiting here makes the worker see the first tab before the second `F`.
      - `press(page, ['F', 'l'])` (the `blank` link; `k` is the checkbox, which `F` would click and not open), then poll `tabCount` until 3.
      - `const [current, ...opened] = await workerTabs(context)`; `expect(current?.id).toBeDefined()`; `opened.map((tab) => tab.index)` `toEqual([1, 2])`; `opened.map((tab) => tab.openerTabId)` `toEqual([current?.id, current?.id])`; `opened.map((tab) => tab.active)` `toEqual([false, false])`.
      - `opened.map((tab) => tab.id)` `toEqual` the same ids `toSorted((a, b) => a - b)`. A comment says Chromium hands out tab ids in creation order, so the first `F`'s tab sits at index 1 (R5.2).
    - `F on a button clicks it`: `openHints`, `press(page, ['F', 'a'])`; `expect.poll(() => readClicks(page)).toEqual(['button'])`; `expectOnlySentinel(page)`; `context.pages()` has length 1 and `tabCount(context)` is 1 (R5.5).
    - `yf hints only copyable links and copies a link's URL`:
      - `openHints`, `grantClipboard`, `press(page, ['y', 'f', 'a'])`.
      - `expect.poll(() => clipboardText(page)).toBe(OPENED_URL)`. If the button were hinted, `a` would click it and nothing would be copied.
      - `hintHost(page)` `toHaveCount(0)` (R1.6, R5.3, R5.4).
    - `yf copies the absolute URL of a relative link`: `openHints`, `grantClipboard`, `press(page, ['y', 'f', 'd'])`; poll `clipboardText` until it is `` `${HINTS_URL}#last` ``. In `f` order `d` is the text input, so this also shows inputs get no `yf` hint (R1.6, R5.4).
    - `gi focuses the first text input and enters Insert mode`: `openHints`, `press(page, ['g', 'i'])`; `#text` `toBeFocused()`; `page.keyboard.type('jk')`; `#text` `toHaveValue('jk')`, `#area` `toHaveValue('')`, and `window.scrollY` is 0 (`j` would scroll in Normal mode) (R6.1).
    - `2gi focuses the second text input`: `openHints`, `press(page, ['2', 'g', 'i'])`, type `c`; `#area` `toHaveValue('c')` and `#text` `toHaveValue('')` (R6.2).
    - `9gi focuses the last text input when there are fewer`: `openHints`, `press(page, ['9', 'g', 'i'])`; `#area` `toBeFocused()`; type `d`; `#area` `toHaveValue('d')` (R6.2).
    - `gi keeps the field's value`: `openHints`, then `page.locator('#text').evaluate((input: HTMLInputElement) => { input.value = 'hello'; })` (no `fill`, which would focus the field first). `press(page, ['g', 'i'])`, type `x`. `const value = await page.locator('#text').inputValue()`; `expect(value).toHaveLength(6)` and `expect(value).toContain('hello')`, so the text was not selected and replaced (R6.4).
    - `gi without text inputs does nothing and consumes the keys`: `openPage(context, 'empty')`, `press(page, ['g', 'i'])`, `expectOnlySentinel(page)`; `page.evaluate(() => document.activeElement === document.body)` is `true` (R6.3).
    - `f works on a page with 1,000 clickables`: `openPage(context, 'many')`, `press(page, ['f'])`, `hintHost(page)` `toHaveCount(1)`; `press(page, ['s', 's'])`; `expect(page).toHaveURL(/#link-7$/)`; `hintHost(page)` `toHaveCount(0)` (NFR1.1 smoke, untimed).
- **Steps:**
  1. Import the shared helpers from `tests/e2e/fixtures/hints.ts` and the URLs from `pages.ts`; don't copy them and don't edit `hints.spec.ts`.
  2. Add the `many` page and write the spec, then run `npm run test:e2e`, which builds first. If Chromium is missing, run `npx playwright install chromium` once.
  3. Every wait is an `expect.poll`, a locator or page assertion, `waitForURL` or a Playwright event. No `waitForTimeout`, no `!`, no `any`, no `console`. Keep each test under 60 lines and the spec and `pages.ts` under 300 non-blank, non-comment lines; if the spec passes 280, move `workerTabs`, `tabCount`, `grantClipboard` and `clipboardText` to a new `tests/e2e/fixtures/browser.ts`. Strings of 10 or more characters used three or more times become constants.
  4. If a label lands somewhere other than listed, the finder sees something the plan didn't expect: fix the fixture, not the assertions, and record why in _History_. If the tab index or opener assertions fail in Chromium, stop and report; don't weaken the test.
  5. In `tasks.md`: set T15 to `[x] done`, set _Next task_ to T16, update _Last updated_, and add a _History_ line naming the commit subject (and the fallback, if used).
- **Done when:** `npm run test:e2e` passes. If the full suite hangs on Chromium launch as in M2, `npm run build && npx playwright test hint-actions --workers=1` passes instead and that is recorded in _History_. `npm run check` also passes, including the typecheck of `tests/e2e`, lint and Prettier.
- **Commit:** `Test: add end-to-end tests for F, yf, gi and a large page`

### T16: Run the manual check and mark milestone M3 done — [ ] todo

- **Requirements:** R2.6, R5.2, R7.1, R7.5, R7.7, NFR1.1–NFR1.3, NFR2.1, NFR3.1, NFR4.1, NFR5.1 · **Design:** Testing strategy (manual check, performance); Controller wiring (R7.7); Ending on page changes (the shadow-root scroll gap)
- **Depends on:** T1–T15 (all `[x] done`)
- **Files:** modify `PLAN.md`, `docs/specs/2026-11-22-link-hints/tasks.md`
- **Tests first:** none (docs only). The test is the manual checklist below. The **user** runs it, because a Claude session can't drive Arc, Chrome or DevTools. Before asking, the executor:
  - checks that T1–T15 are `[x] done` and `git status` is clean;
  - reads T14's and T15's _History_ lines for fixture changes or fallbacks and passes them on to the user;
  - runs `npm run check` and `npm run test:e2e`, and both must pass. If the full e2e suite hangs on Chromium launch, as in M2, it runs `npx playwright test hints --workers=1` and `npx playwright test hint-actions --workers=1` instead and records that.

  The checklist runs in the current stable Arc **and** Chrome on macOS, with `.output/chrome-mv3/` loaded unpacked (`chrome://extensions` → Developer mode → Load unpacked; in Arc, `arc://extensions`). Items 1–4, 6 and 8 run in both browsers. Item 5 runs in Chrome only. Item 7 is a note, never a failure. Before item 1, reload the extension and click **Clear all** in its Errors view.
  1. **Loads, works, no new permission** (NFR2.1, NFR3.1): on a long Wikipedia article, `f`, `F`, `yf` and `gi` each show hints or focus the search field. In Chrome, `chrome://extensions` → the extension's **Details** → **Permissions** lists the same entries as before M3 ("Read and change all your data on all websites" and "Read your browsing history"), and nothing new.
  2. **Placement and page untouched** (R2.6, R7.5), with `f` then `Esc` on each page: a GitHub repository page, a YouTube watch page, the Wikipedia article, and a modal dialog. For the modal, on the article, run this in the DevTools Console: `const d = document.createElement('dialog'); d.append(Object.assign(document.createElement('a'), { href: 'https://example.com', textContent: 'In dialog' })); document.body.append(d); d.showModal();`.
     - Every label sits at the top-left corner of its element and is drawn above the page.
     - With the dialog open, the dialog's link has a label drawn above the dialog, and nothing behind the dialog gets one.
     - Scroll the article so a link is cut off by the top edge, then press `f`: its label is fully inside the viewport.
     - Nothing on the page moves when the hints appear or go away, and the scroll position stays the same.
     - Select a word, press `f`, then `Esc`: the word is still selected. Click into the search field, press `Esc` to leave Insert mode, press `f`, then `Esc`: no other element took focus.
  3. **`F` tab order** (R5.2): on the article, press `F` and pick three different links one after another (A, then B, then C). The current tab stays active. The three new tabs sit right after it in the order A, B, C: in Chrome's tab strip, and in Arc's sidebar. In Chrome, any other order fails. In Arc, if the order is C, B, A (Arc dropped `openerTabId`, the design's fallback), record it and let the user decide. That doesn't fail by itself.
  4. **Readable labels** (NFR5.1): labels are readable on a light page (the article) and on a dark page (GitHub with its dark theme, or YouTube in dark mode).
  5. **Performance** (NFR1.1–NFR1.3, R7.1), in Chrome DevTools → Performance with CPU throttling off, on a GitHub pull request's **Files changed** page. (The spec said to time the large fixture page; the Playwright-only `many` page from T15 can't be loaded by hand, so it keeps an untimed smoke test and the timing is done on a real diff.)
     - First run this in the Console: `document.querySelectorAll('a[href], button, input, textarea, select, [role], [tabindex], [onclick]').length`. It must be at most 1,000. If it is more, pick a smaller PR.
     - Record while pressing `f` and then the first letter of a two-letter label, then stop. In the **Interactions** track, the `f` keydown interaction (key press to next paint) is under 100 ms. In the Main track, the `Event: keydown` task for the typed letter is under 16 ms.
     - Press `Esc`, wait for any scroll to finish, then record 5 s without touching anything. No `Timer fired`, `Animation frame fired`, observer callback or event task comes from `content.js`.
  6. **Reload and disable with hints up** (R7.7, R7.1): on the article, press `f`. With the hints showing, reload the extension from the extensions page and go back to the tab. The hints are gone, or go at the first key press. Then press `f`: one set of labels appears, not two. Pick a link: it opens once. Next, press `f` again, turn the extension off with its toggle on the extensions page, go back, and press `j`. The hints are gone. Turn the extension back on.
  7. **Known gap, note only** (R7.2, design: scrolls inside shadow roots don't reach the window): during items 2–4, if a page has a scrolling area inside a web component (for example a YouTube side panel), press `f`, scroll that area with the trackpad, and record whether the hints stayed in place (stale) or went away. Either result passes.
  8. **No logs, no errors** (NFR4.1), last: with the DevTools Console set to **Verbose**, use `f`, `F`, `yf` and `gi` on the article. No output mentions a link, page text or a key. The extension's card on the extensions page has no **Errors** button, or lists no new errors since it was cleared.

- **Steps:**
  1. Run `npm run build`. Set T16 to `[~] in progress` in this file while waiting (not committed alone). Give the user the checklist, together with any T14/T15 fallbacks. Wait for an answer on every item in both browsers. Ask for the Arc version (Arc → About Arc) and the Chrome version (`chrome://version`).
  2. **If any item fails** (item 3 in Arc and item 7 excepted):
     - Tick nothing and set T16 back to `[ ] todo`.
     - Append the _History_ line `YYYY-MM-DD — executor: T16 manual check failed: <item, browser, what happened>`.
     - Add `### T16a: Fix <problem> — [ ] todo` above T16, in the usual task format: unit tests first that reproduce the failure, and a `Fix: <subject>` commit.
     - Add T16a to T16's _Depends on_ and set _Blocked by_ and _Next task_ to T16a.
     - Stop and report to the user. T16 runs again, in full, after T16a is done.
  3. **If Arc reversed the `F` order (item 3):** report it to the user. If they accept it, append an _Agreements_ line: `YYYY-MM-DD — Arc drops openerTabId, so several F tabs land in reverse order in Arc; accepted as a known limitation (user)`, and go on. If not, treat it as a failure (step 2).
  4. When every item passes: in `PLAN.md`, under `### M3 — Link hints`, change the six `- [ ]` lines to `- [x]`, and change no text. Check that no `- [ ]` is left between `### M3 — Link hints` and `### M4`, for example with `awk '/^### M3/,/^### M4/' PLAN.md | grep -c '\- \[ \]'`, which prints `0`. Leave every other milestone untouched.
  5. In this file:
     - Flip T16 to `[x] done`.
     - Set _Current status_ to **Phase:** done, **Next task:** none, **Blocked by:** nothing, **Last updated:** today by executor.
     - Append the _History_ line: `YYYY-MM-DD — executor: T16 done in "Docs: mark milestone M3 as done"; manual check passed in Arc <version> and Chrome <version> (checked by the user)`. Add the `f` timing and the clickable count from item 5, the Arc `F` order from item 3, the item 7 note, and any e2e fallback used.
  6. Run `npm run check` (its `format:check` covers `PLAN.md` and this file). If Prettier complains, run `npx prettier --write PLAN.md docs/specs/2026-11-22-link-hints/tasks.md` and check again. Commit only when it passes.
- **Done when:** the user has confirmed items 1–6 and 8 in both browsers (item 5 in Chrome), with Arc's item 3 either passed or accepted in _Agreements_; the results are in _History_; the six M3 boxes in `PLAN.md` are ticked and nothing else in it changed; T16 is `[x] done` with _Current status_ done; `npm run test:e2e` (or its recorded fallback) and `npm run check` pass.
- **Commit:** `Docs: mark milestone M3 as done`. Why: the M3 tasks are done and the manual check passed in Arc <version> and Chrome <version>. What: tick the M3 boxes in `PLAN.md`; record the check and close the plan in `tasks.md`.

## Coverage

| Criterion      | Tasks                      |
| -------------- | -------------------------- |
| R1.1           | T2, T4, T14                |
| R1.2           | T2, T4, T14                |
| R1.3           | T3, T4, T14                |
| R1.4           | T4, T14                    |
| R1.5           | T2, T4, T14                |
| R1.6           | T4, T10, T15               |
| R2.1–R2.4      | T1                         |
| R2.5           | T1, T5, T10                |
| R2.6           | T4, T5, T14, T16           |
| R3.1           | T5, T10                    |
| R3.2           | T10, T12, T14              |
| R3.3, R3.4     | T10                        |
| R3.5           | T10, T12, T14              |
| R3.6–R3.8      | T10, T14                   |
| R3.9           | T10, T12                   |
| R3.10          | T10, T12, T14              |
| R4.1           | T12, T14                   |
| R4.2           | T8, T12, T14               |
| R4.3, R4.4     | T8, T14                    |
| R4.5           | T8, T14                    |
| R4.6           | T8                         |
| R4.7           | T12                        |
| R5.1           | T12, T15                   |
| R5.2           | T6, T7, T8, T12, T15, T16  |
| R5.3           | T4, T10, T12, T15          |
| R5.4           | T8, T12, T15               |
| R5.5           | T8, T15                    |
| R5.6           | T6, T7, T8                 |
| R5.7           | T12                        |
| R5.8           | T8                         |
| R6.1, R6.2     | T11, T12, T15              |
| R6.3, R6.4     | T12, T15                   |
| R7.1           | T5, T10, T14, T15, T16     |
| R7.2           | T9, T10, T13, T14          |
| R7.3           | T9, T10, T13               |
| R7.4           | T5, T10                    |
| R7.5           | T5, T14, T16               |
| R7.6           | T12, T14                   |
| R7.7           | T13, T16                   |
| NFR1.1         | T4, T5, T15, T16           |
| NFR1.2         | T5, T16                    |
| NFR1.3         | T9, T10, T16               |
| NFR2.1         | T16                        |
| NFR2.2         | T12                        |
| NFR3.1         | T6, T16                    |
| NFR3.2, NFR3.3 | T6                         |
| NFR4.1         | T6, T7, T8, T13, T16       |
| NFR5.1         | T5, T16                    |
| NFR5.2         | T5, T14                    |
| NFR6.1         | every task; T14, T15 (e2e) |

## Open questions

All provisional answers are recorded in _Agreements_; each one stands unless the user says otherwise.

- Does the user accept `generateLabels` throwing `RangeError` for alphabets of fewer than 2 letters? Recommended: yes (T1).
- May `i` finish a pending mapped sequence (`gi`) and enter Insert mode otherwise? Recommended: yes; it is the only way to meet R6.1 without changing M1's `i` anywhere else (T11).
- Is Arc reversing the order of several `F` tabs an accepted known limitation, with Chrome required to keep the order? Recommended: yes (T15).
- Are NFR1.1 and NFR1.2 timed by hand on a GitHub PR diff only, with the `many` fixture untimed? Recommended: yes (T14, T15).
- Does the user run the T15 manual check and report the results in chat? Recommended: yes.
- If full e2e runs hang on Chromium launch, may each new spec run alone with `--workers=1`, recorded in _History_? Recommended: yes.
- Spec deviations the user may want to accept or reject (see _Agreements_ and _Review notes_): `watchPage(deps, hinted, onChange)` and `createHintMode`'s deps; T12/T13 split of the focus and `stop()` work out of the commands commit; optional `TabsApi.create` index; private `CLICKABLE_SELECTOR`, exported `isDisabled`, `HINT_ALPHABET` only in `defaults.ts`; `HintAction` in `actions.ts`; the `copyableLink` `isClickable` guard; `composedContains` for the scroll rule; two e2e spec files.

## Review notes

- Pass 1: created 14 tasks. Order: pure logic first (T1 labels, T2 clickable rules, T3 geometry, T4 finder, T5 overlay), then the service-worker side (T6 protocol, router, handler and wiring; T7 client), then the actions and page watcher (T8, T9), then Hint mode with its machine registration (T10) and the commands and keys, then e2e and the manual check. Forced bundles: T6 (the `MessageHandlers` mapped type and every `TabsApi` literal), T10 (`MODE_NAMES` vs `createModeMachine`), the commands task (`COMMAND_NAMES` vs `createCommandRegistry`).
- Pass 2 (integration of round 1, one task-mode review plus one scope critic per task; all tasks READY except T11, which was split). Every task section was replaced by its reviewed proposal. Changes across tasks:
  - Renumbering: the old T11 became T11 (Normal mode `i`) and T12 (commands); the old T12, T13 and T14 became T13, T14 and T15. Every _Depends on_, cross-reference and coverage row was updated. Both e2e tasks depend on T12.
  - e2e helper location (reviewers conflicted): `tests/e2e/fixtures/hints.ts` holds the shared helpers and is created by T14; T14 only imports them and never edits `hints.spec.ts`. `pages.ts` keeps page markup, `HINTS_URL` and `OPENED_URL`. Renames for consistency: `host` is `hintHost`, `clicks` is `readClicks`. `window.events` is the one recorder.
  - `createController` size (reviewers conflicted): T10 calls `createHints(deps, { scroller, machine: () => machine })` and leaves `createController` at about 55 of 60 lines without extracting anything; T12 extracts `createRegistry` and `followFocus` unconditionally (about 54 lines after). The conditional wording in T12 was removed. T12 creates the `boxes` map and its `rects`/`hitTest` implementations in `controller.test.ts` and removes any `vim-hints` host in `afterEach`.
  - T8 uses T2's `isDisabled` (aria-disabled, inert) for its guard and gains a test for it; the design's `:disabled` text contradicted its own aria-disabled/inert decision.
  - Fixed on integration: T14's second `F` now presses `l` (the `blank` link), since `k` is the checkbox in `F` order; T13's dependency range and its stale "T11 specs" wording; T14 `window.clicks` became `window.events`.
  - Scope findings accepted: RangeError, `i`/`gi`, Arc order and hand-timing questions are in _Agreements_ and _Open questions_; T5's Requirements mark R3.1, R3.3 and R7.4 as overlay side; T7's test count was replaced by "all tests pass" and its R10.7 marked as M2's; T8's `canTakeFocus` comment and the jsdom note for R4.5 were added; T9 is on the R7.3 coverage row; T14's several-`F` order is now e2e-tested, so the old open question is narrowed to Arc (T15 item 3). No scope finding was rejected.
- Spec issues found (requirements.md and design.md are approved and untouched): (1) the design says no new key clashes with M1/M2, which is wrong for `gi`, and it leaves `normal.ts` out of its file list; (2) `watchPage`'s signature cannot implement R7.2; (3) `TabsApi.create` typed with a required `index` is also called without one; (4) the design's `:disabled` text for actions contradicts its aria-disabled/inert decision; (5) the design puts the e2e tests in one file and times NFR1.1 on a Playwright-only fixture, neither of which fits the lint limits and manual timing.
- Not re-checked in this pass: Prettier formatting (`node_modules` is not installed), so wrapped Markdown and the coverage table should be checked by the first `npm run check`. Needs another look: T10 and T12 (controller wiring and the 60-line limit, checked by counting only), T13 and T14 (Chromium behaviour and fixture labels), T11 (new task from the split).
- Pass 3 (integration of round 2: one task-mode review plus one scope critic each for T10–T14; all five READY). Decisions:
  - T10 scope finding (too_big, borderline) -- accepted as one commit, the plan's largest. A split into hint.ts plus registration (T10a) and `ControllerDeps.geometry` plus `content.ts` (T10b) can't stay green: registration needs the finder, actions and overlay, which need `deps.geometry` and `deps.client.openTab`, and `content.ts` must supply them. The reason is recorded in T10's _Why one commit_. Provisional (planner, user not asked).
  - T12 scope finding (too_big) -- split. T12 keeps the commands, `COMMAND_NAMES`, default keys, `createRegistry` wiring and the controller tests for `f`/`F`/`yf`/`gi` (R7.6 stays there). New T13 holds `followFocus` (R7.3), the `stop()` guard (R7.7) and the R7.2, R7.3, R7.7 and NFR4.1 controller tests. Folding them into T10 was rejected (T10's critic: it breaks its size and line budget). The old T13, T14 and T15 are now T14, T15 and T16; every _Depends on_, cross-reference, coverage row and the helper-list Agreement were updated. Until T13 lands, a non-editable focus ends Hint mode and `stop()` leaves hints to the test clean-up; nothing ships between the two commits.
  - `createController` line count made consistent: about 55 of 60 after T10, about 51 after T12 (registry out), about 50 after T13 (focus watcher out, `stop()` guard in).
  - T12 hoists `const finder = createFinder(...)` inside `createHints` and returns `{ hint, finder }`; T10's `createHints` returns a bare `HintMode` and says so.
  - T13 (now T14) and T14 (now T15) kept as proposed: `HINTS_URL` and `OPENED_URL` come from `pages.ts`, the helpers from `fixtures/hints.ts`; `nextFrames` and `pageState` joined that helper list (Agreements). T14's `readSeen` import was dropped (unused).
  - T11 kept as proposed (`continuesSequence` in `normal.ts`).
  - Not re-checked: Prettier formatting (`node_modules` is not installed), so wrapped Markdown and the coverage table should be checked by the first `npm run check`.
