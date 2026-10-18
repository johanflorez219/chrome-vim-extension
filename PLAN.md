# Plan

What we are building, how it is structured, and the order we will build it in.

## Goal

A Manifest V3 browser extension that brings Vim-style, keyboard-only navigation to Arc and Chrome. It should feel natural to a Neovim user, stay out of the way while typing, and never break the pages it runs on.

It is also a learning project: each milestone introduces one new browser-extension concept.

### Non-goals (for now)

- Embedding a real Neovim instance in text fields (Firenvim-style).
- Firefox or Safari support.
- Vim editing commands inside text fields (`ciw`, `dd`, …).
- Publishing to the Chrome Web Store before v1.0.

## Tech stack

| Concern    | Choice                         | Why                                                                                   |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| Language   | TypeScript (strict)            | Typed `chrome.*` APIs and a typed message protocol.                                   |
| Framework  | [WXT](https://wxt.dev)         | MV3 manifest generation, hot reload, multi-browser builds.                            |
| UI         | Plain DOM + CSS in Shadow DOM  | Small, fast, and isolated from page styles. No React needed for overlays.             |
| Unit tests | Vitest                         | Fast; the key parser and mode machine are pure logic.                                 |
| E2E tests  | Playwright (Chromium)          | Can load the unpacked extension and drive real pages.                                 |
| Quality    | ESLint, Prettier, Knip, CodeQL | Lint, format, dead code and security. See [CONTRIBUTING.md](CONTRIBUTING.md#tooling). |
| CI         | GitHub Actions                 | Lint, type-check, test, and build on every PR.                                        |

## Architecture

```
┌──────────────────────────── Tab ────────────────────────────┐
│ Content script                                              │
│   KeyListener (capture phase)                               │
│        │                                                    │
│        ▼                                                    │
│   ModeMachine ──► current Mode's key handler                │
│        │              │                                     │
│        │              ▼                                     │
│        │        KeyParser (trie, counts, timeout)           │
│        │              │                                     │
│        │              ▼                                     │
│        │        CommandRegistry ──► local command (scroll,  │
│        │              │              hints, find, focus)    │
│        │              │                                     │
│   UI (Shadow DOM): hints, HUD, help, find bar               │
└───────────────────────┼─────────────────────────────────────┘
                        │ chrome.runtime.sendMessage
                        ▼
┌──────────────────── Service worker ─────────────────────────┐
│   MessageRouter ──► background commands (tabs, windows,     │
│                      sessions, history)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
          chrome.storage.sync  ◄──── Options page
          (keymaps, exclusions, settings)
```

### Folder layout

```
src/
  entrypoints/
    background.ts          service worker entry
    content.ts             content script entry
    options/               options page (index.html, main.ts)
  core/
    modes/                 Normal, Insert, Hint, Find, Visual
    mode-machine.ts
    key-parser.ts          key-sequence trie, counts, timeout
    key-notation.ts        "<C-d>" ⇄ KeyboardEvent
    commands/
      registry.ts
      scroll.ts
      tabs.ts
      history.ts
      hints.ts
      find.ts
      clipboard.ts
  messaging/
    protocol.ts            discriminated union of all messages
    router.ts
  settings/
    defaults.ts            default keymap and options
    store.ts               chrome.storage wrapper + onChanged subscription
  ui/
    shadow-root.ts
    hints.ts
    hud.ts
    help.ts
tests/
  e2e/                     Playwright tests

Unit tests live next to the code: key-parser.ts → key-parser.test.ts
```

### Design decisions

1. **Modal state machine.** Every key goes to the current mode. Each mode decides whether to consume the key or let it reach the page. Transitions are explicit (`machine.enter("insert")`).
2. **Command pattern.** Every action is a named command (`scrollDown`, `tabNext`) with metadata: description, whether it accepts a count, and whether it runs in the page or in the background. Keymaps only refer to command names, so remapping is just data.
3. **Key-sequence trie.** Mappings are stored in a trie. A pending sequence waits up to `timeoutMs` (default 1000 ms) for the next key. Leading digits are a count, except a leading `0`.
4. **Typed message protocol.** All content ⇄ background messages are one TypeScript union type, so adding a command that forgets to handle a message is a compile error.
5. **Stateless service worker.** MV3 workers are killed when idle. Anything that must survive (e.g. closed-tab stack) lives in `chrome.storage.session` or comes from `chrome.sessions`.
6. **Capture-phase listener.** `keydown` is handled with `capture: true` on `window` so we see keys before page scripts. Consumed keys call `preventDefault()` and `stopImmediatePropagation()`; all others pass through untouched.
7. **Auto Insert mode.** Focus on `input`, `textarea`, `select`, or `contenteditable` (including inside shadow roots) switches to Insert mode automatically.
8. **Shadow DOM for all UI.** Hints, the HUD, and the help dialog render inside one closed shadow root so page CSS cannot affect them and ours cannot leak out.
9. **Settings as a single source of truth.** `chrome.storage.sync` holds user settings; every context subscribes to `onChanged` and rebuilds its keymap live — no reload needed.
10. **Arc-aware defaults.** `J`/`K` follow the vertical sidebar (down = next tab). No default uses `Cmd`, which Arc reserves.

## Milestones

Each milestone ends with something working that can be loaded in Arc.

### M0 — Project setup

- [x] TypeScript (strict), ESLint, Prettier, Vitest, Knip, commitlint, Husky configured
- [x] GitHub Actions: commits, type-check, lint, format, test, Knip, audit; CodeQL; Dependabot
- [x] Initialize WXT on top of the existing tooling
- [x] Playwright configured to load the built extension
- [x] `npm run dev` opens Chromium with the extension loaded
- [x] Add build and end-to-end tests to CI
- [x] Content script logs key presses in Vim notation — the "hello world"

_Learn: manifest, entrypoints, loading unpacked extensions._

### M1 — Normal mode and scrolling

- [ ] Capture-phase key listener
- [ ] Mode machine with Normal and Insert modes
- [ ] Auto Insert mode on editable focus; `Esc` / `Ctrl-[` to leave
- [ ] Key parser with trie, counts, and timeout (unit tested)
- [ ] Command registry
- [ ] `j` `k` `h` `l` `d` `u` `gg` `G`
- [ ] Scroll the right element (the focused scrollable container, not always `window`)

_Learn: content scripts, DOM events, testing pure logic._

### M2 — Tabs and history

- [ ] Typed message protocol and router
- [ ] `J`/`gt`, `K`/`gT`, `g0`, `g$`, `x`, `X`, `yt`
- [ ] `H`, `L`, `r`
- [ ] `yy`, `gu`, `gU`
- [ ] Counts work for background commands (`3J`, `2x`)

_Learn: service worker, `chrome.tabs`, `chrome.sessions`, message passing._

### M3 — Link hints

- [ ] Find clickable elements: links, buttons, inputs, `[role=button]`, `[onclick]`, `tabindex`
- [ ] Keep only elements visible in the viewport
- [ ] Generate short, prefix-free labels from the hint alphabet (default `sadfjklewcmpgh`)
- [ ] Render hints in Shadow DOM; filter as the user types
- [ ] `f` (current tab), `F` (new tab), `yf` (copy URL)
- [ ] `gi` — focus the first text input

_Learn: Shadow DOM, `IntersectionObserver`, `getBoundingClientRect`, simulating clicks._

### M4 — Help, HUD, and find

- [ ] HUD showing the current mode and pending keys (e.g. `5g…`)
- [ ] `?` help dialog generated from the command registry
- [ ] `/` find bar, `n` / `N`, match highlighting

_Learn: building UI without a framework, CSS Custom Highlight API._

### M5 — Options and customization

- [ ] Options page
- [ ] `map` / `unmap` text config with validation and error messages
- [ ] Excluded URL patterns
- [ ] Hint alphabet, scroll step, timeout settings
- [ ] Live reload of settings via `storage.onChanged`

_Learn: `chrome.storage`, options pages, cross-context sync._

### M6 — Visual mode (stretch)

- [ ] `v` to start a caret selection
- [ ] `h` `j` `k` `l` `w` `b` `e` `0` `$` to extend the selection
- [ ] `y` to copy the selection

_Learn: the Selection and Range APIs._

### M7 — Release v1.0

- [ ] Icons and store screenshots
- [ ] Privacy policy (we collect nothing)
- [ ] Chrome Web Store listing
- [ ] Tagged release with changelog

## Testing strategy

- **Unit (Vitest):** key parser, key notation, mode transitions, hint label generation, keymap config parsing. These are pure functions and should have high coverage.
- **E2E (Playwright):** load the built extension, open fixture HTML pages, press keys, and assert scroll position, focused element, opened tabs, and visible hints.
- **Manual checklist** before each release, on real sites in Arc: GitHub, Gmail (excluded), YouTube, Google Docs (excluded), a long article, an SPA.

## Risks and open questions

- **Sites with their own shortcuts** (GitHub, YouTube, Gmail) — rely on per-site exclusions at first; maybe a pass-through key list per site later.
- **Iframes** — content scripts run in each frame separately. Hints and scrolling across frames need coordination; start with the top frame only.
- **Arc's future** — Arc is in maintenance mode. Keeping everything standard MV3 means it keeps working in Chrome, Dia, Brave, and Edge.
- **Project name** — `chrome-vim-extension` is a working name.
- **License** — MIT is the likely choice; decide before the first public release.
