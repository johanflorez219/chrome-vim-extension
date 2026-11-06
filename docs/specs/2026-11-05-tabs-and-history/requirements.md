# Tabs and history — Requirements

**Status:** Draft
**Source:** brainstorm contract from 2026-11-05 (milestone M2 in `PLAN.md`)

## Introduction

This is milestone M2: moving between tabs and through history with the keyboard alone, and copying the current URL. In Normal mode, Vim keys switch, close, restore and duplicate tabs, go back and forward, reload, copy the URL and walk up the URL path, with counts as in Vim. It also builds what every later background feature reuses: a typed message protocol and a service-worker router. The point is that a Neovim user keeps their muscle memory without touching the mouse, and that a missed key never gets in the way of the page.

## Glossary

- **Background command:** a command that needs a browser API the page can't call (tabs, sessions, history), so the content script asks the service worker to run it.
- **Page command:** a command that runs inside the page (here: copy the URL, go up the URL path).
- **Current tab:** the tab in which the key was pressed.
- **Current window:** the window that holds the current tab. Tab commands never touch another window.
- **Tab order:** the order of the tabs in the current window's tab strip, first to last. Pinned tabs count.
- **Count:** digits typed before a command (`3` in `3J`), as defined in M1. It is absent when none was typed.
- **Wrap around:** going past the last tab lands on the first, and past the first lands on the last.
- **URL path level:** one segment of the URL path, `/a/b/c` has three.

## Requirements

### R1: Typed messages and a router

**User story:** As the developer of M2 and later milestones, I want every message between the page and the service worker to be one typed protocol with one router, so that a background command can't be added without being handled.

**Acceptance criteria**

1. THE EXTENSION SHALL define every message from a content script to the service worker as one TypeScript union type.
2. THE EXTENSION SHALL route each message type to exactly one handler in the service worker, and fail type-checking when a message type has no handler.
3. WHEN a mapped key runs a background command THE EXTENSION SHALL send a message that carries the command's name and the count, and run the command in the service worker.
4. IF the service worker receives a message whose sender is not this extension's own content script THEN THE EXTENSION SHALL ignore it.
5. IF the service worker receives a message that is not part of the protocol THEN THE EXTENSION SHALL ignore it and leave the page and the browser unaffected.
6. IF a handler fails (a tab was closed meanwhile, an API refuses) THEN THE EXTENSION SHALL end that command without an error shown to the user and without breaking the page.
7. WHEN the service worker was stopped for inactivity THE EXTENSION SHALL run the next background command normally, with no key lost.
8. THE EXTENSION SHALL keep no state in the service worker's memory that a command needs later.

### R2: Switch to the next and previous tab

**User story:** As a Vim user, I want `J` and `K` to move through my tabs the way the sidebar lists them, so that I can change tabs without the mouse.

**Acceptance criteria**

1. WHEN the user presses `J` or `gt` without a count THE EXTENSION SHALL activate the next tab in the current window.
2. WHEN the user presses `K` or `gT` without a count THE EXTENSION SHALL activate the previous tab in the current window.
3. WHEN the user presses `J` or `K` with a count N THE EXTENSION SHALL move N tabs forward or back, wrapping around.
4. WHEN the user presses `gT` with a count N THE EXTENSION SHALL move N tabs back, wrapping around.
5. WHEN the user presses `gt` with a count N THE EXTENSION SHALL activate the tab at position N of the current window, where the first tab is 1.
6. IF the count given to `gt` is larger than the number of tabs THEN THE EXTENSION SHALL activate the last tab.
7. WHEN the current window has only one tab THE EXTENSION SHALL do nothing and still consume the key.
8. WHEN a tab is activated THE EXTENSION SHALL activate it in the current window without moving or reordering any tab.

### R3: Go to the first and last tab

**User story:** As a Vim user, I want `g0` and `g$` to jump to the ends of the tab strip, so that I reach the first and last tab in two keys.

**Acceptance criteria**

1. WHEN the user presses `g0` THE EXTENSION SHALL activate the first tab of the current window.
2. WHEN the user presses `g$` THE EXTENSION SHALL activate the last tab of the current window.
3. IF the current tab is already the one the command targets THEN THE EXTENSION SHALL do nothing and still consume the key.
4. WHEN `g0` or `g$` is typed with a count THE EXTENSION SHALL ignore the count.

### R4: Close and restore tabs

**User story:** As a Vim user, I want `x` to close tabs and `X` to bring back the ones I closed, so that closing is never a risk.

**Acceptance criteria**

1. WHEN the user presses `x` THE EXTENSION SHALL close the current tab.
2. WHEN `x` is typed with a count THE EXTENSION SHALL ignore the count and close only the current tab.
3. WHEN the current tab is the last tab of the window THE EXTENSION SHALL close it and let the browser close the window, as closing it by hand would.
4. WHEN the user presses `X` without a count THE EXTENSION SHALL restore the most recently closed tab.
5. WHEN the user presses `X` with a count N THE EXTENSION SHALL restore the N most recently closed tabs, the most recent first.
6. IF fewer than N closed tabs are available, or N is more than the 25 most recent entries the browser lists, THEN THE EXTENSION SHALL restore the ones that exist.
7. IF no closed tab is available THEN THE EXTENSION SHALL do nothing and still consume the key.
8. WHEN `X` restores a tab THE EXTENSION SHALL restore it as the browser's own "reopen closed tab" does, with its page history.

### R5: Duplicate the tab

**User story:** As a Vim user, I want `yt` to duplicate the current tab, so that I can keep my place and explore from a copy.

**Acceptance criteria**

1. WHEN the user presses `yt` THE EXTENSION SHALL open a copy of the current tab right after it and activate the copy.
2. WHEN `yt` is typed with a count THE EXTENSION SHALL ignore the count.

### R6: Go back and forward in history

**User story:** As a Vim user, I want `H` and `L` to go back and forward, so that I can retrace my steps from the keyboard.

**Acceptance criteria**

1. WHEN the user presses `H` without a count THE EXTENSION SHALL go back one entry in the current tab's history.
2. WHEN the user presses `L` without a count THE EXTENSION SHALL go forward one entry in the current tab's history.
3. WHEN the user presses `H` or `L` with a count N THE EXTENSION SHALL go back or forward N entries.
4. IF the history has fewer than N entries in that direction THEN THE EXTENSION SHALL go as far as it can.
5. IF there is no entry in that direction THEN THE EXTENSION SHALL do nothing and still consume the key.

### R7: Reload the tab

**User story:** As a Vim user, I want `r` to reload the page, so that I refresh without reaching for the mouse.

**Acceptance criteria**

1. WHEN the user presses `r` THE EXTENSION SHALL reload the current tab.
2. WHEN `r` is typed with a count THE EXTENSION SHALL ignore the count.

### R8: Copy the URL

**User story:** As a Vim user, I want `yy` to copy the page's URL, so that I can share or paste it without selecting the address bar.

**Acceptance criteria**

1. WHEN the user presses `yy` THE EXTENSION SHALL copy the full URL of the current page, hash and query included, to the clipboard.
2. IF the browser refuses the copy THEN THE EXTENSION SHALL do nothing visible, show no error, and still consume the keys.
3. WHEN `yy` is typed with a count THE EXTENSION SHALL ignore the count.
4. THE EXTENSION SHALL copy the URL only to the clipboard, never store it or send it anywhere else.

### R9: Go up in the URL

**User story:** As a Vim user, I want `gu` and `gU` to walk up a site's URL, so that I can reach a parent page without editing the address bar.

**Acceptance criteria**

1. WHEN the user presses `gu` on an `http` or `https` page THE EXTENSION SHALL navigate the current tab to the same origin with the last path level removed, dropping the query and the hash.
2. WHEN the user presses `gu` with a count N THE EXTENSION SHALL remove N path levels, stopping at the root.
3. WHEN the user presses `gU` on an `http` or `https` page THE EXTENSION SHALL navigate the current tab to the root of the page's origin.
4. IF the page is already at the root (path `/`) THEN THE EXTENSION SHALL do nothing and still consume the key, apart from a `gu` or `gU` that only has a query or hash to drop, which navigates to the same URL without them.
5. IF the page is not `http` or `https` (for example `file:` or `about:blank`) THEN THE EXTENSION SHALL do nothing and still consume the key.
6. WHEN `gU` is typed with a count THE EXTENSION SHALL ignore the count.
7. WHEN the path ends with a slash THE EXTENSION SHALL treat the empty last segment as no level, so `/a/b/` goes to `/a/`.

### R10: Background and page commands behave the same way

**User story:** As someone typing fast, I want every M2 key to be predictable and safe, so that a held key or a missed target never closes or opens things I didn't mean.

**Acceptance criteria**

1. WHEN a key completes an M2 mapping in Normal mode THE EXTENSION SHALL consume the key, even when the command ends up doing nothing.
2. WHILE in Insert mode THE EXTENSION SHALL NOT run any M2 command and let every key reach the page.
3. WHEN an M2 command's key is held down THE EXTENSION SHALL run the command once and ignore the keyboard auto-repeat.
4. WHEN a command that does not accept a count is typed with one THE EXTENSION SHALL run it once.
5. THE EXTENSION SHALL act only on the tab and window where the key was pressed, apart from the tab a tab command activates and the window a restored tab returns to (R4).
6. THE EXTENSION SHALL handle M2 keys only in the top frame, as M1 does.
7. IF a command needs the service worker and it cannot be reached THEN THE EXTENSION SHALL do nothing and show no error.

## Non-functional requirements

### NFR1: Performance

1. THE EXTENSION SHALL finish handling a key, from `keydown` to handing the command off (a message sent, or the page command started), within 16 ms on a typical page.
2. THE EXTENSION SHALL add no work to the page or the service worker while no key is being pressed.

### NFR2: Compatibility

1. THE EXTENSION SHALL work in the current stable Arc and Chrome on macOS, as a Manifest V3 extension.
2. THE EXTENSION SHALL use no default key that includes `Cmd`.
3. THE EXTENSION SHALL order tabs by their position in the window, which in Arc matches the order the sidebar shows (checked by hand).

### NFR3: Security and permissions

1. THE EXTENSION SHALL add only the `sessions` and `webNavigation` permissions to the manifest. `webNavigation` makes `H` and `L` with a count go as far as the history allows (R6.4) and brings the browser's "read your browsing history" install warning.
2. THE EXTENSION SHALL NOT use the `tabs` permission.
3. THE EXTENSION SHALL accept messages only from its own content scripts (R1.4).

### NFR4: Privacy

1. THE EXTENSION SHALL NOT log, store or send the keys a user presses, the URLs of their pages, or their tab list.

### NFR5: Quality

1. THE EXTENSION SHALL have unit tests for the message router, each background command and each URL transformation, and end-to-end tests for tab switching, closing, duplicating, history, reload, `yy`, `gu` and `gU`, with overall coverage at or above 80%.
2. R4.4–R4.8 (restoring closed tabs) are covered by unit tests with a fake `chrome.sessions` and by the manual check, because an automated browser can't be relied on to keep a closed-tab list.

## Out of scope

- A HUD or any message saying a URL was copied, a tab was closed or nothing happened (M4). Until then, `yy` and the no-op cases give no feedback.
- Remapping, settings and per-site exclusions (M5).
- Moving tabs (`<<`, `>>`), pinning tabs, closing other tabs, switching windows, tab search (a later milestone, if wanted).
- `H`, `L` and `r` variants (hard reload) and `yf`/`gi` (M3).
- Using these keys on pages where browsers forbid content scripts (`chrome://`, the Chrome Web Store, a new-tab page): the key is never seen, so tab keys don't work there either.
- Iframes: only the top frame handles keys, as in M1.
- Incognito windows, unless the user enables the extension there.

## Decisions made by Claude

- `gT` with a count N moves N tabs back, as `{count}gT` does in Vim (R2.4).
- A `gt` count past the last tab goes to the last tab instead of doing nothing (R2.6).
- Pinned tabs count in tab order and `x` closes them like any other (R2, R4.1).
- `X` restores the most recently closed tab, whichever window it came from, as the browser decides; with a count it restores several, most recent first (R4.4–R4.6).
- `yt` activates the copy, the way a browser's "Duplicate tab" does (R5.1).
- `H`/`L` with a count larger than the history go as far as possible, not nowhere (R6.4).
- `gu`/`gU` only act on `http` and `https` pages, because `file:` and `about:` have no meaningful origin (R9.5).
- `gu` drops the query and hash; a URL like `https://x.test/?a=1` at the root still loses them (R9.1, R9.4).
- A trailing slash isn't a path level (R9.7).
- Auto-repeat of a held key is ignored for every M2 command, so holding `x` can't close a row of tabs (R10.3).
- The key is consumed when a command has nothing to do, so a site shortcut never fires by accident, as in M1 (R10.1).
- Failures end quietly: no error to the user, no log with their data (R1.6, R10.7).
- `sessions` and `webNavigation` are added to the manifest; `tabs` is not needed and stays out (NFR3).

## Your decisions

- One spec for all of M2 (brainstorm contract).
- `3gt` goes to tab 3, as in Vim; `J`/`K` with a count move N tabs (R2.3, R2.5).
- `J` and `K` wrap around at the ends (R2.3).
- `5H` with fewer than 5 entries goes as far as it can (R6.4), accepting the `webNavigation` permission and its install warning (NFR3.1).
- `X` restores the tab where the browser decides, and at most 25 per press (R4.6, R10.5).
- `x` takes no count: it closes only the current tab (R4.2). This changes the brainstorm contract's `2x`.

## Open questions

- None. One thing to verify in the manual check rather than decide now: Arc's tab order and its closed-tab list (NFR2.3, R4) may differ from Chrome's; if they do, that becomes a fix task.
