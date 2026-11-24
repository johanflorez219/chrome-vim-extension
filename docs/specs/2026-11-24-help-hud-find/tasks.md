# Help, HUD and find — Tasks

**Spec:** [requirements.md](requirements.md) · [design.md](design.md)
**Verdict:** ITERATE — pass 1, 2026-11-24 (drafted by hand; the plan-tasks workflow was not available in this session, so the read-only planner and scope-critic reviews did not run)

## Status log

### Current status

- **Phase:** planning
- **Next task:** T1 — Add: match search over text segments
- **Blocked by:** the user's approval of this plan
- **Last updated:** 2026-11-24 by planner (pass 1)

### Agreements

- 2026-11-24 — The requirements (R1–R6, NFR1–NFR3) are approved. The HUD shows `HELP` while the help dialog is open, so R1.1 lists `HELP` (user).
- 2026-11-24 — The design is approved as written: find and help are modes, the find bar has no real input, highlights use one adopted stylesheet, Esc cancels and Enter keeps the search (user).
- 2026-11-24 — Provisional (planner, user not asked): the design's `Highlighter` gets a `dispose()` method that removes the adopted stylesheet. `stop()` calls it. The design named only `show` and `clear`, so this is a small addition (T3).
- 2026-11-24 — Provisional (planner, user not asked): `HelpEntry` carries `context` (`'page' | 'background'`) from `Command.context`, so the dialog can group its rows without a second lookup (T5).
- 2026-11-24 — Provisional (planner, user not asked): `ModeMachine` gets `subscribe(listener)`. The HUD listens to it, so it also updates when a watcher ends Hint mode with no key press (T6).
- 2026-11-24 — Provisional (planner, user not asked): the mode names are added one at a time, `help` (T10) before `find` (T11), because `createModeMachine` throws `Missing mode` for any name in `MODE_NAMES` that has no mode. Each commit keeps the tree green.
- 2026-11-24 — Provisional (planner, user not asked): controller wiring for the new features moves to `src/core/features.ts`, so `controller.ts` stays under the 300-line file limit (it is 234 lines today).
- 2026-11-24 — Provisional (planner, user not asked): the HUD and the controller wiring are covered by the e2e tests (T12, T13), not by a controller unit test, because the controller mounts UI through `mountUiRoot` with no seam for a fake (the hint overlay is covered the same way).
- 2026-11-24 — Provisional (planner, user not asked): the Arc check for highlights is not a task. Arc was dropped from M3 at the user's request, and the design lists it as non-blocking. Ask before M4 is marked done.

### History

- 2026-11-24 — planner: pass 1, drafted T1–T14 by hand (the Workflow tool was not available).

## Project state

As of pass 1 (branch `m4-help-hud-find` to be created from `m3-link-hints`; the spec is committed on `m3-link-hints` at `727b0fd`):

- M0–M3 are done. `PLAN.md` ticks them; M4's three boxes are unticked.
- `src/core/mode-machine.ts`: `MODE_NAMES = ['normal', 'insert', 'hint']`. `createModeMachine` throws `Missing mode: <name>` when a name has no mode, and `Duplicate mode` on repeats.
- `src/core/modes/normal.ts`: `createNormalMode({ machine, trie, registry, timer, editableFocused })`; `reset()`, `onExit`, `handleKey`. The `i` check runs before parsing. Timeout clears the parser state in a timer callback.
- `src/core/modes/hint.ts`: the closest model for find and help. Modified keys leave and pass; repeats are consumed; `LEAVE_KEYS` are `<Esc>` and `<C-[>`.
- `src/core/commands/registry.ts`: `COMMAND_NAMES` = scroll + `PAGE_COMMAND_NAMES` (private) + `HINT_COMMAND_NAMES` (private) + background names. `createCommandRegistry` throws `Missing command` or `Duplicate command`. `Command` has `name`, `description`, `acceptsCount`, `context`, `run`. `onceOnly` wraps `run`.
- `src/core/commands/hints.ts`: the factory pattern to copy (`pageCommand` helper, `createHintCommands(deps)`).
- `src/settings/defaults.ts`: `DEFAULT_KEYMAP` has 29 entries; `?`, `/`, `n` and `N` are unbound. `defaults.test.ts` pins the list and the `g`/`y` prefix rule.
- `src/core/controller.ts` (234 lines): `createHints`, `createRegistry`, `followFocus` (ignores non-editable focus only while Hint mode is on), `createModes`, `stop()`.
- `src/ui/shadow-root.ts`: `mountUiRoot(doc)` returns `{ root, unmount }`; the host has `pointer-events: none` and `popover="manual"`.
- `src/ui/hints.ts`: the overlay pattern (`createHintOverlay`) to copy for the find bar and dialog.
- `src/core/hints/geometry.ts`: `Geometry.isRendered(element)` and `viewport()`. The find session takes these through injection.
- `tests/e2e/fixtures/pages.ts` and `tests/e2e/fixtures.ts`: the e2e harness. `hints.ts` and `hint-actions.ts` specs show the pattern.
- Tooling facts every task must respect (from the configs):
  - **Knip:** every export must be imported by another file at the commit that adds it (its own test counts). Don't export what only its own file uses.
  - **ESLint:** complexity 10, cognitive 15, depth 3, 4 params, 60 lines per function, 300 per file (off for `*.test.ts`), `no-unsanitized` (build DOM with `createElement` and `textContent`), `strictTypeChecked`, `switch-exhaustiveness-check`.
  - **TypeScript:** strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
  - **Coverage:** 80% minimum (`npm run test:coverage`).

## Tasks

Each task is one commit. It flips its marker below to `[x] done` and adds a dated line to the history when it lands. Tests are written first.

### T1 — `Add: match search over text segments`

- [ ] done

**Traces:** R3.3, R3.5, R3.6, R3.7 (empty query), design _Search (pure)_.
**Files:** create `src/core/find/search.ts`, `src/core/find/search.test.ts`.
**Depends on:** nothing.

**Tests first** (in `search.test.ts`, with plain objects as nodes):

1. `isCaseSensitive` is false for `'foo'` and `''`, true for `'Foo'`, `'FOO'` and a query with one uppercase letter anywhere.
2. `locateMatches` finds every non-overlapping match in document order: `'aa'` in `'aaaa'` gives two matches, at offsets 0 and 2.
3. A query with no uppercase matches any case; a query with an uppercase letter matches only that case.
4. A match that spans two segments gives a start in the first node and an end in the second, with correct offsets.
5. Offsets stay right when a segment contains characters whose case changes (fold per UTF-16 unit, never change length).
6. An empty query and a query with no hits both return `[]`.
7. Results are capped at `MAX_MATCHES` (10,000) and the cap is reached on a list longer than that.

**Implementation shape:** `export const MAX_MATCHES = 10_000`, `export interface TextSegment<N>`, `export interface MatchSpan<N>`, `export function isCaseSensitive(query: string): boolean`, `export function locateMatches<N>(segments, query)`. Join the segment texts into one string, record each segment's start offset, search with `indexOf` on the folded text, then map each hit back to nodes. No DOM types.

**Done when:** `npx vitest run src/core/find/search.test.ts` passes; `npm run check` passes.

### T2 — `Add: page text segments and match ranges`

- [ ] done

**Traces:** R3.7 (hidden text is not searched), NFR1.1 (one walk), design _Page text (DOM)_; the shadow-root exclusion from the requirements' _Out of scope_.
**Files:** create `src/core/find/page-text.ts`, `src/core/find/page-text.test.ts`.
**Depends on:** T1 (the types).

**Tests first** (jsdom, with `isRendered` injected as a fake):

1. Text nodes are returned in document order across nested elements.
2. Text inside `script`, `style`, `noscript` and `textarea` is skipped.
3. Text whose parent element `isRendered` reports as not rendered is skipped; rendered siblings are kept.
4. Whitespace-only and empty text nodes are skipped.
5. Text inside an open shadow root is not returned.
6. `toRange` builds a `Range` whose `toString()` equals the matched text, for a match that spans two text nodes.

**Implementation shape:** `collectSegments(doc, isRendered)` runs one `TreeWalker` with `SHOW_TEXT` and a filter that rejects the skipped ancestors. Use `isRendered(parent)` once per text node. `toRange(doc, match)` calls `setStart` and `setEnd` on a new Range.

**Done when:** `npx vitest run src/core/find/page-text.test.ts` passes; `npm run check` passes.

### T3 — `Add: highlighter for find matches in the page`

- [ ] done

**Traces:** R5.1–R5.4, design _Highlighter_, Agreements (`dispose()`).
**Files:** create `src/core/find/highlighter.ts`, `src/core/find/highlighter.test.ts`.
**Depends on:** T2 (the `Range` type only; the file takes `readonly Range[]`).

**Tests first** (fake `CSS.highlights` with `set`/`delete`, a fake `Highlight` class, and a fake `adoptedStyleSheets` array on a fake document):

1. `show(ranges, current)` sets the highlight `vim-find` with all ranges and `vim-find-current` with the one at index `current`.
2. `show` with `current` out of range sets only `vim-find`.
3. `clear()` deletes both highlights and leaves the page's DOM untouched (the fake document's `body` children are unchanged).
4. When `CSS.highlights` is missing, `show` and `clear` do nothing and do not throw (R5.3).
5. The `::highlight()` rules are added to `adoptedStyleSheets` once, in `createHighlighter`, and `dispose()` removes that sheet and no other.
6. When `adoptedStyleSheets` is missing, creation still works and the highlights still apply.

**Implementation shape:** `createHighlighter(doc)` reads `CSS.highlights` once and returns `{ show, clear, dispose }`. The sheet's text is a constant: `::highlight(vim-find) { background: #ffe98a; color: #000 }` and `::highlight(vim-find-current) { background: #ff9632; color: #000 }`. Use `new CSSStyleSheet()` with `replaceSync`.

**Done when:** `npx vitest run src/core/find/highlighter.test.ts` passes; `npm run check` passes.

### T4 — `Add: find session that remembers the query and position`

- [ ] done

**Traces:** R3.3, R3.4 (position rule), R3.7, R3.8, R4.1–R4.3, R4.5, R4.7, design _Find session_.
**Files:** create `src/core/find/session.ts`, `src/core/find/session.test.ts`.
**Depends on:** T1, T2, T3 (the types only; the tests use fakes).

**Tests first** (fake `collect`, a fake highlighter, a fake `reveal` and a fake `firstAtOrBelowTop`):

1. `setQuery('foo')` on a page with three matches gives `position` `{ current: 1, total: 3 }` when `firstAtOrBelowTop` returns 0, and highlights all three with `current` 0.
2. `firstAtOrBelowTop` is called only when a non-empty query is set, and its index is used as the current match (R3.4).
3. `next(1)` moves to the next match and calls `reveal` with it; from the last match it wraps to the first (R4.1, R4.3).
4. `next(3)` with two matches moves three steps (wrapping), and `previous(1)` from the first match wraps to the last (R4.2, R4.3, R4.5).
5. `next` and `previous` with no query do nothing and call neither `reveal` nor the highlighter (R4.4).
6. `setQuery('')` clears the highlights, sets `position` to `{ current: 0, total: 0 }`, and does not call `reveal` (R3.7).
7. `clear()` sets `query` to `''`, clears the highlights and forgets the matches (R3.8).
8. When the page changes, `next` calls `collect` again and uses the new matches; `position.total` reflects them (R4.7).
9. When the current index no longer exists after a recompute, it is clamped to the last match (or 0/0 when there are none).

**Implementation shape:** `createFindSession(deps)` keeps `query`, `matches` (from `locateMatches(collect(), query)`), and `index`. `position` is derived from `index` and `matches.length`. Each `next` or `previous` recomputes from `collect()` before moving (R4.7), using the query.

**Done when:** `npx vitest run src/core/find/session.test.ts` passes; `npm run check` passes.

### T5 — `Add: help entries from the command registry`

- [ ] done

**Traces:** R2.2, R2.5, R2.7, design _Help entries (pure)_, Agreements (`context` on `HelpEntry`).
**Files:** create `src/core/help/entries.ts`, `src/core/help/entries.test.ts`.
**Depends on:** nothing (it takes `Command` and `KeymapEntry` by type).

**Tests first** (plain fake commands and a small keymap):

1. One entry per command that has at least one key, in the order the commands are given (R2.7).
2. A command bound to two keys (for example `tabPrevious` on `K` and `gT`) lists both, in keymap order.
3. A command with no keys is omitted (R2.5).
4. Each entry copies `name`, `description` and `context` from its command.
5. A keymap entry for a command that is not in the list is ignored, and an empty list returns `[]`.

**Implementation shape:** `export interface HelpEntry { name; description; context; keys }` and `export function helpEntries(commands, keymap)`. Keys come from `keymap.filter(entry.command === name)` and keep keymap order. Keys are already in Vim notation; the function does not reformat them.

**Done when:** `npx vitest run src/core/help/entries.test.ts` passes; `npm run check` passes.

### T6 — `Add: mode change subscriptions and pending keys in normal mode`

- [ ] done

**Traces:** R1.2 (the update trigger), R1.3, R1.4, design _Architecture_ (`subscribe`, `pending()`, `onPendingChange`).
**Files:** modify `src/core/mode-machine.ts` and `src/core/mode-machine.test.ts`; modify `src/core/modes/normal.ts` and `src/core/modes/normal.test.ts`.
**Depends on:** nothing.

**Tests first:**

1. `mode-machine`: a listener gets the new mode name after a real change, and is not called for a no-op `enter` of the current mode (the existing rule).
2. `mode-machine`: the function `subscribe` returns removes the listener.
3. `normal`: `pending()` is `''` when idle; after `5` then `g` it is `'5g'`; after an unmapped key it is `''`.
4. `normal`: `onPendingChange` is called when a key starts a sequence, when a sequence completes, and when the timeout drops it; it is not called for an idle key that passes through.
5. `normal`: the existing timeout tests still pass unchanged.

**Implementation shape:** `ModeMachine` gains `subscribe(listener: (name: ModeName) => void): () => void`, and `enter` calls every listener after `next.onEnter`. `NormalModeDeps` gains `readonly onPendingChange?: () => void` (optional, so the `exactOptionalPropertyTypes` rule applies). `NormalMode` gains `pending(): string`, built from `count` and `keys` in notation.

**Done when:** `npx vitest run src/core/mode-machine.test.ts src/core/modes/normal.test.ts` passes; `npm run check` passes.

### T7 — `Add: status HUD with the mode and pending keys`

- [ ] done

**Traces:** R1.1–R1.6, R4.6 (the position text), design _HUD_.
**Files:** create `src/core/hud.ts`, `src/core/hud.test.ts`, `src/ui/hud.ts`, `src/ui/hud.test.ts`; modify `src/core/controller.ts`, and `src/core/controller.test.ts` only if an existing assertion changes.
**Depends on:** T4 (the `FindPosition` type), T6.

**Tests first:**

1. `hudView('normal', '', undefined)` gives mode `NORMAL`, empty pending and empty position (R1.1).
2. `hudView('insert', '5g', undefined)` gives pending `5g`; `hudView('hint', '', undefined)` gives mode `HINT` (R1.3).
3. `hudView('normal', '', { current: 2, total: 7 })` gives position `2/7`; `{ current: 0, total: 0 }` gives `0/0` (R4.6).
4. `ui/hud`: `update` writes the mode and pending text with `textContent`, and reuses one host across updates (R1.2).
5. `ui/hud`: the host it mounts comes from `mountUiRoot`, so the test checks it is mounted once and `unmount` removes it (R1.5, R1.6).

**Implementation shape:** `hudView` is pure. `modeLabel(mode: ModeName)` is an exhaustive switch, so T10 and T11 add their cases when they add the names. `createHud({ mount })` mounts once and updates two spans. In the controller, `createHud({ mount: () => mountUiRoot(doc) })` is built at start. It subscribes to the machine and redraws after each key and on pending changes. `stop()` unmounts it. HUD position comes from the find session, which is `undefined` until T11.

**Done when:** `npx vitest run src/core/hud.test.ts src/ui/hud.test.ts` passes; `npm run check` passes. The HUD is visible in a built extension (checked by hand; the e2e test is T12).

### T8 — `Add: help dialog that lists commands and keys`

- [ ] done

**Traces:** R2.2, R2.6 (the dialog's content), NFR3.1, design _Help dialog_.
**Files:** create `src/ui/help-dialog.ts`, `src/ui/help-dialog.test.ts`.
**Depends on:** T5 (`HelpEntry`).

**Tests first** (jsdom; `mount` is a fake returning a fake `UiRoot`):

1. `show(entries)` writes one row per entry, each with its keys joined by a space and its description, using `textContent` (R2.2).
2. Entries are grouped under `In the page` and `Browser` by `context`; a heading appears only when its group has rows.
3. `show` called again replaces the dialog without leaving the old rows behind.
4. `hide()` unmounts it, and calling `hide()` when nothing is shown does nothing.
5. Pointer events are off on the dialog panel as well as the host (R6.2's requirement that clicks reach the page).

**Implementation shape:** `createHelpDialog({ mount })` returns `{ show(entries), hide() }`. It builds with `createElement` and `textContent` only (NFR3.1). The style is a constant string inside the shadow root, as in `ui/hints.ts`.

**Done when:** `npx vitest run src/ui/help-dialog.test.ts` passes; `npm run check` passes.

### T9 — `Add: find bar that shows the query and position`

- [ ] done

**Traces:** R3.1 (the bar's look), R3.6 (`0/0`), R4.6, design _Find bar_.
**Files:** create `src/ui/find-bar.ts`, `src/ui/find-bar.test.ts`.
**Depends on:** T4 (the `FindPosition` type).

**Tests first** (jsdom, fake `mount`):

1. `show('', { current: 0, total: 0 })` shows `/` with no count.
2. `show('foo', { current: 2, total: 7 })` shows `/foo` and `2/7`.
3. `show('foo', { current: 0, total: 0 })` shows `0/0` (R3.6).
4. `hide()` unmounts; `hide()` with nothing shown does nothing; `show` after `hide` mounts again.
5. The query is drawn with `textContent`, so a query such as `<b>x</b>` shows literally (NFR3.1).

**Implementation shape:** `createFindBar({ mount }) => FindBar` (the interface from the design, with `show(query, position)` and `hide()`). The bar sits bottom-left, so it does not cover the HUD.

**Done when:** `npx vitest run src/ui/find-bar.test.ts` passes; `npm run check` passes.

### T10 — `Add: help mode and the ? key that opens the dialog`

- [ ] done

**Traces:** R2.1, R2.3, R2.4, R6.2 (help part), design _Help mode_, _Commands_, _Architecture_ (`followFocus`).
**Files:** create `src/core/modes/help.ts`, `src/core/modes/help.test.ts`, `src/core/commands/help.ts`, `src/core/commands/help.test.ts`, `src/core/features.ts`; modify `src/core/mode-machine.ts` (`MODE_NAMES` gains `help`), `src/core/commands/registry.ts` (`COMMAND_NAMES` gains `helpOpen`), `src/settings/defaults.ts` (`?` → `helpOpen`), `src/settings/defaults.test.ts`, `src/core/controller.ts`, `src/core/controller.test.ts`, `src/core/hud.ts` and its test (the `help` label).
**Depends on:** T5, T6, T7, T8.

**Tests first:**

1. `modes/help`: `?`, `<Esc>` and `<C-[>` leave to Normal mode and are consumed (R2.3).
2. `modes/help`: every other key is consumed and is not passed to the page, including repeats and modified keys (R2.4).
3. `commands/help`: `helpOpen` enters `help` and is not counted (R2.1).
4. `defaults.test.ts`: `?` maps to `helpOpen`; the keymap length is now 30; the no-`Cmd` rule still holds.
5. `controller.test.ts`: while help is open, focusing a button does not leave help, so a following `j` is consumed and not passed (R6.2 for help).
6. `hud.test.ts`: `hudView('help', ...)` gives `HELP` (R1.1).

**Implementation shape:** `src/core/features.ts` exports `createHelpFeature(deps)` returning `{ mode, commands }`. It builds the help dialog with `helpEntries(registry.list(), DEFAULT_KEYMAP)`, opens it in `onEnter`, and hides it in `onExit`. The controller calls it from `createModes` and `createRegistry`. `followFocus` ignores non-editable focus when the current mode is `hint` or `help`. `MODE_NAMES` now lists `help`, so `createModeMachine` requires the mode, and that lands in this commit.

**Done when:** `npx vitest run src/core src/settings` passes; `npm run check` passes.

### T11 — `Add: find mode, / n and N, and the find bar`

- [ ] done

**Traces:** R3.1–R3.9, R4.1–R4.7, R5, R6.1–R6.3, design _Find mode_, _Commands_, _Architecture_, _Error handling_.
**Files:** create `src/core/modes/find.ts`, `src/core/modes/find.test.ts`, `src/core/commands/find.ts`, `src/core/commands/find.test.ts`; modify `src/core/features.ts` (find wiring), `src/core/mode-machine.ts` (`MODE_NAMES` gains `find`), `src/core/commands/registry.ts` (`findOpen`, `findNext`, `findPrevious`), `src/settings/defaults.ts` (`/`, `n`, `N`), `src/settings/defaults.test.ts`, `src/core/controller.ts` (`followFocus` ignores non-editable focus for `find`; `stop()` disposes the highlighter and clears the session), `src/core/controller.test.ts`, `src/core/hud.ts` and its test (`FIND` label, position from the session).
**Depends on:** T1–T4, T9.

This is one commit, not two. `MODE_NAMES` can't gain `find` until a `find` mode is registered, and the mode is useless without its commands, so the mode, its commands and the wiring land together.

**Tests first:**

1. `modes/find`: each row of the design's key table. `<Esc>` and `<C-[>` clear the session and leave; `<CR>` leaves and keeps the query (R3.4, R3.8); `<BS>` removes the last character and recomputes, and does nothing on an empty query.
2. `modes/find`: a single character is appended and recomputed, and `/` is typed like any other character (R3.2, R3.9).
3. `modes/find`: modified keys (`<C-x>`) cancel the search and pass the key, as Hint mode does; other keys (arrows, `<Tab>`) are consumed and ignored; repeats are consumed.
4. `modes/find`: a forced exit through `onExit` (focus moves to Insert, for example) clears the query and does not search (R6.3). After `<CR>`, `onExit` keeps the query.
5. `modes/find`: `onEnter` shows the bar with the current query and position, and every query change redraws it (R3.1, R3.6).
6. `commands/find`: `findOpen` enters `find` and is not counted (R3.1).
7. `commands/find`: `findNext` with count `3` moves three matches; with no count it moves one (R4.5). `findPrevious` works the same way (R4.2).
8. `commands/find`: `findNext` and `findPrevious` do nothing when the session has no query (R4.4).
9. `defaults.test.ts`: `/` → `findOpen`, `n` → `findNext`, `N` → `findPrevious`; the keymap length is now 33; the no-`Cmd` rule still holds.
10. `controller.test.ts`: while find is open, a click that moves focus keeps the bar open, so a following key is consumed by find mode (R6.2).
11. `hud.test.ts`: `hudView('find', '', { current: 1, total: 4 })` gives `FIND` and `1/4` (R4.6).

**Implementation shape:** `createFindMode(deps)` returns a `Mode` named `find`. It keeps a `keep` flag that `<CR>` sets just before it calls `machine.enter('normal')`; `onExit` clears the session unless `keep` is set. `features.ts` builds the real `FindSession`: `collect: () => collectSegments(doc, geometry.isRendered)`, `highlighter: createHighlighter(doc)`, `reveal` scrolls the match's start element into view with `block: 'nearest'`, and `firstAtOrBelowTop` returns the first index whose range `getBoundingClientRect().bottom` is at or below 0, or 0. `createFindFeature` returns `{ mode, commands, session }`. The HUD gets `session.position` after each key. The e2e tests are T13.

**Done when:** `npx vitest run src/core src/settings src/ui` passes; `npm run check` passes.

### T12 — `Test: end-to-end checks for the HUD and the help dialog`

- [ ] done

**Traces:** R1.1, R1.3, R1.4, R2.1, R2.2, R2.4, R6.1, design _Testing strategy_ (e2e list).
**Files:** create `tests/e2e/help-hud.spec.ts`, `tests/e2e/fixtures/help.ts` (a page with a few links, a text input and a button; use `pages.ts` for the shared `openPage`).
**Depends on:** T10, T11.

**Tests first** (the spec is the test):

1. The HUD shows `NORMAL` on load (R1.1).
2. `5` then `g` shows `5g` in the HUD; after 1 second the HUD shows nothing pending (R1.3, R1.4).
3. `?` opens the dialog, which lists `scrollDown` and every other command with its keys; the HUD shows `HELP` (R2.1, R2.2, R1.1).
4. While the dialog is open, `j` does not scroll the page (R2.4).
5. `?` or `Esc` closes the dialog and returns the HUD to `NORMAL` (R2.3).
6. Typing `?` in a text input inserts `?` and opens nothing (R6.1).
7. Clicking a button while the dialog is open keeps it open (R6.2).

**Done when:** `npm run test:e2e -- help-hud` passes; `npm run check` passes.

### T13 — `Test: end-to-end checks for find and a large page`

- [ ] done

**Traces:** R3.1–R3.9, R4.1–R4.7, R5.1, R6.2, NFR1.1, NFR1.2, design _Testing strategy_.
**Files:** create `tests/e2e/find.spec.ts`, `tests/e2e/fixtures/find.ts` (a page with repeated text, a hidden copy, a textarea and a generated 10,000 text-node page for the timing test).
**Depends on:** T11, T12.

**Tests first** (the spec is the test):

1. `/` `foo` `<CR>` highlights matches and the HUD shows `1/N` (R3.1, R3.3, R3.4, R4.6).
2. `n` moves to the next match and wraps from the last to the first; `N` goes back (R4.1–R4.3).
3. `3n` moves three matches (R4.5).
4. `/` `Foo` matches only the capitalised text (smart case, R3.5).
5. A query with no match shows `0/0` and `n` does nothing visible (R3.6, R4.4).
6. `<Esc>` in the bar clears the highlights and the query (R3.8; checked with `CSS.highlights.size`).
7. Hidden text is not counted (R3.7).
8. Clicking a button while the bar is open keeps the bar; the next key is typed into the query (R6.2).
9. Typing `/` inside a text input inserts `/` and opens nothing (R6.1).
10. On the 10,000 text-node page, highlights update within 100 ms of a keystroke, and `n` scrolls to the match within 100 ms (NFR1.1, NFR1.2), timed with `performance.now()`.
11. The find bar's text and the highlight count still work when the page has no `CSS.highlights` (R5.3): the test removes `CSS.highlights` with `addInitScript`, then checks the count and scrolling.

**Done when:** `npm run test:e2e -- find` passes; `npm run check` passes.

### T14 — `Docs: mark milestone M4 as done`

- [ ] done

**Traces:** the status log, `PLAN.md` M4 boxes.
**Files:** modify `PLAN.md` (tick the three M4 boxes), `docs/specs/2026-11-24-help-hud-find/tasks.md` (status log: phase done, next task none, history line).
**Depends on:** T1–T13.

**Done when:** `npm run check` passes; the user has run the manual Chrome check (the HUD, the help dialog and a find on a real article). Arc is checked only if the user asks, as with M3.

## Open questions

- None blocking. The Arc check for highlights (design, _Open questions_) is not a task; ask before T14 if you want it.
