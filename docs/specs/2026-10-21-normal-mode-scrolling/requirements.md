# Normal mode and scrolling — Requirements

**Status:** Approved (2026-10-21)
**Source:** brainstorm contract from 2026-10-21 (milestone M1 in `PLAN.md`)

## Introduction

This is milestone M1: the first behavior a user can feel. In Normal mode,
Vim keys (`j` `k` `h` `l` `d` `u` `<C-d>` `<C-u>` `gg` `G`, with counts) scroll the page or
the container being read. Typing in text fields keeps working as usual. It
also builds the core every later milestone reuses: the mode machine, the key
parser and the command registry. Above all, the extension must never get in
the way of typing or break the pages it runs on.

## Glossary

- **Normal mode:** the default mode. Mapped keys run commands; other keys reach the page.
- **Insert mode:** the extension steps aside. Every key reaches the page except the keys that leave Insert mode.
- **Editable element:** an `input` that accepts text, a `textarea`, a `select`, or an element with `contenteditable`, including any of these inside an open or closed shadow root, or any element of a document whose `designMode` is `on`.
- **Pending keys:** the keys typed so far that start a mapping but don't complete it yet (`g` before `gg`), plus any count.
- **Count:** digits typed before a command (`5` in `5j`). It never starts with `0`.
- **Scroll target:** the element the scroll commands move. It is either a scrollable container or the document.
- **Scrollable container:** an element whose content overflows in the scroll direction and whose CSS allows scrolling (`overflow` set to `auto` or `scroll`).

## Requirements

### R1: See keys before the page does

**User story:** As a Vim user, I want the extension to receive my keys
before the page's own scripts, so that page shortcuts can't swallow my
commands.

**Acceptance criteria**

1. THE EXTENSION SHALL receive every `keydown` in the top frame before the page's own listeners on the window, document or elements do.
2. WHEN the extension consumes a key THE EXTENSION SHALL stop it reaching the page's listeners and prevent its default browser action.
3. WHEN the extension does not consume a key THE EXTENSION SHALL let it reach the page unchanged, default action included.
4. WHEN the extension is reloaded, updated or disabled THE EXTENSION SHALL stop handling keys in pages that are already open.
5. WHEN the extension is installed, updated or reloaded THE EXTENSION SHALL start in every open tab where content scripts are allowed, without the user refreshing the tab.
6. WHEN the extension starts in a tab where an older copy is still running THE EXTENSION SHALL handle each key once, through the new copy only.
7. IF the extension cannot start in an open tab (a forbidden page, a discarded or sleeping tab) THEN THE EXTENSION SHALL skip that tab without showing an error.

### R2: Normal and Insert modes

**User story:** As a Vim user, I want a Normal mode for commands and an
Insert mode for typing, so that the same letter scrolls the page or types
text depending on what I'm doing.

**Acceptance criteria**

1. WHEN a page loads and no editable element has focus THE EXTENSION SHALL start in Normal mode.
2. WHILE in Normal mode THE EXTENSION SHALL consume keys that are part of a mapping (R4) and let every other key reach the page.
3. WHILE in Insert mode THE EXTENSION SHALL let every key reach the page, except `<Esc>` and `<C-[>`.
4. WHEN the user presses `i` in Normal mode THE EXTENSION SHALL enter Insert mode and consume the `i`.
5. WHEN the user presses `<Esc>` or `<C-[>` in Insert mode THE EXTENSION SHALL return to Normal mode and consume the key.
6. WHEN the user leaves Insert mode with `<Esc>` or `<C-[>` while an editable element has focus THE EXTENSION SHALL remove focus from that element.

### R3: Automatic Insert mode in text fields

**User story:** As someone typing in a page, I want the extension to step
aside the moment I'm in a text field, so that my letters go into the field
instead of scrolling.

**Acceptance criteria**

1. WHEN an editable element gains focus by click, tab, script or autofocus THE EXTENSION SHALL enter Insert mode.
2. WHEN an editable element inside an open or closed shadow root, or in a document with `designMode` on, gains focus THE EXTENSION SHALL enter Insert mode.
3. IF focus is already on an editable element when the extension starts on a page THEN THE EXTENSION SHALL start in Insert mode.
4. WHEN an editable element loses focus and focus does not move to another editable element THE EXTENSION SHALL return to Normal mode.
5. WHEN focus moves from one editable element to another THE EXTENSION SHALL stay in Insert mode.
6. IF the focused element is an `input` that does not accept text (checkbox, radio, button, range, color, file, submit, reset, image) THEN THE EXTENSION SHALL stay in Normal mode.
7. IF the user entered Insert mode with `i` THEN THE EXTENSION SHALL stay in Insert mode when focus changes, until the user leaves it with `<Esc>` or `<C-[>`.

### R4: Key sequences, counts and timeout

**User story:** As a Vim user, I want multi-key commands (`gg`) and counts
(`5j`) to work as they do in Neovim, so that my muscle memory carries over.

**Acceptance criteria**

1. WHEN the keys typed in Normal mode complete a mapping THE EXTENSION SHALL run its command once and clear the pending keys.
2. WHEN the keys typed in Normal mode start one or more mappings but complete none THE EXTENSION SHALL consume them and wait for the next key.
3. WHEN the user types digits `1`–`9`, followed by any digits, before a mapping THE EXTENSION SHALL treat them as the count for that command.
4. WHEN no count is pending and the user types `0` THE EXTENSION SHALL treat it as a key, not as the start of a count.
5. IF more than 1000 ms pass between two keys of a pending sequence or count THEN THE EXTENSION SHALL discard the pending keys.
6. IF a key does not continue the pending sequence THEN THE EXTENSION SHALL discard the pending keys and handle that key as if it were typed first.
7. WHEN the user presses `<Esc>` in Normal mode with pending keys THE EXTENSION SHALL discard them and consume the `<Esc>`.
8. WHEN the user presses `<Esc>` in Normal mode with no pending keys THE EXTENSION SHALL let it reach the page.
9. IF a count is larger than 9999 THEN THE EXTENSION SHALL use 9999.
10. IF the mode changes while keys are pending THEN THE EXTENSION SHALL discard the pending keys.

### R5: Commands are named and described

**User story:** As the developer of later milestones, I want every action
to be a named command with metadata, so that keymaps, help (M4) and
remapping (M5) are just data.

**Acceptance criteria**

1. THE EXTENSION SHALL run every mapped action through a named command (for example `scrollDown`), never by binding a key to code directly.
2. THE EXTENSION SHALL store a description for each command, whether it accepts a count, and whether it runs in the page or in the background.
3. WHEN a command that does not accept a count is run with a count THE EXTENSION SHALL run it once.
4. THE EXTENSION SHALL take its default keymap from a single list of key → command name entries.
5. IF a mapping names a command that does not exist THEN THE EXTENSION SHALL fail the unit test suite (the default keymap is validated by a test).

### R6: Scroll commands

**User story:** As a reader, I want to scroll with Vim keys, smoothly, so
that I can read a page without touching the mouse.

**Acceptance criteria**

1. WHEN the user presses `j` / `k` THE EXTENSION SHALL scroll the scroll target 60 px down / up, times the count.
2. WHEN the user presses `h` / `l` THE EXTENSION SHALL scroll the scroll target 40 px left / right, times the count.
3. WHEN the user presses `d` or `<C-d>` / `u` or `<C-u>` THE EXTENSION SHALL scroll the scroll target down / up by half its visible height, times the count.
4. WHEN the user presses `gg` without a count THE EXTENSION SHALL scroll the scroll target to its top.
5. WHEN the user presses `G` without a count THE EXTENSION SHALL scroll the scroll target to its bottom.
6. WHEN the user presses `gg` or `G` with a count N THE EXTENSION SHALL scroll the scroll target to N percent of its scrollable height (100 or more means the bottom).
7. THE EXTENSION SHALL animate scrolls smoothly, reaching the destination within 300 ms of the key press.
8. WHILE the user holds a scroll key down THE EXTENSION SHALL keep scrolling in that direction without the movement falling behind, and stop within 100 ms of the key's release.
9. WHEN a scroll key is pressed while a previous smooth scroll is still moving THE EXTENSION SHALL add the new distance to where that scroll was going, not to where it currently is.
10. IF the scroll target is already at its edge in the scroll direction THEN THE EXTENSION SHALL do nothing and still consume the key.

### R7: Scroll the right element

**User story:** As a reader of apps that scroll an inner panel (chats,
docs, mail), I want the keys to scroll the panel I'm reading, so that the
commands work on more than plain articles.

**Acceptance criteria**

1. WHEN the user clicks inside, or focuses, a scrollable container THE EXTENSION SHALL make the nearest scrollable ancestor of that point the scroll target.
2. WHEN the user clicks somewhere with no scrollable ancestor THE EXTENSION SHALL make the document the scroll target.
3. IF the scroll target has been removed from the page or can no longer scroll THEN THE EXTENSION SHALL fall back to the document.
4. WHEN the user scrolls up or down while no container was chosen and the document cannot scroll vertically THE EXTENSION SHALL scroll the largest vertically scrollable container visible in the viewport.
5. WHEN the scroll target cannot scroll further in the requested direction THE EXTENSION SHALL NOT pass the scroll to its ancestors.
6. IF the user scrolls left or right while no container was chosen and the document cannot scroll horizontally THEN THE EXTENSION SHALL do nothing and still consume the key.

## Non-functional requirements

### NFR1: Performance

1. THE EXTENSION SHALL finish handling a key, from `keydown` to the start of the scroll, within 16 ms on a typical page.
2. THE EXTENSION SHALL add no work to the page while no key is being pressed, apart from listening for keys, focus and clicks.

### NFR2: Accessibility

1. WHERE the user's system asks for reduced motion (`prefers-reduced-motion: reduce`) THE EXTENSION SHALL scroll instantly instead of animating.

### NFR3: Compatibility

1. THE EXTENSION SHALL work in the current stable Arc and Chrome on macOS, as a Manifest V3 extension.
2. THE EXTENSION SHALL use no default key that includes `Cmd`.
3. THE EXTENSION SHALL run on every page a content script is allowed on, and do nothing on pages where the browser forbids content scripts (`chrome://`, the Chrome Web Store).

### NFR4: Privacy

1. THE EXTENSION SHALL NOT log, store or send the keys a user presses. The M0 debug log is removed.

### NFR5: Quality

1. THE EXTENSION SHALL have unit tests for the mode machine, key parser and command registry, and end-to-end tests for R2, R3, R6 and R7, with overall coverage at or above 80%. R3.3 is covered by unit tests only, because a page can't focus a field before the extension starts.

## Out of scope

- Tab and history commands, the message protocol and the service-worker router (M2). M1's background script only restarts the extension in open tabs (R1.5).
- Link hints and `gi` (M3).
- The HUD showing the mode or pending keys, the help dialog, and find (M4).
- Settings, remapping, configurable scroll steps and timeout, and per-site exclusions (M5).
- Visual mode (M6).
- Iframes: only the top frame handles keys. Keys typed while focus is inside an iframe are not seen.
- Vim editing commands inside text fields (`PLAN.md` non-goal).

## Decisions made by Claude

- Scroll steps: `j`/`k` 60 px, `h`/`l` 40 px, `d`/`u` half the scroll target's visible height (R6.1–R6.3).
- `gg`/`G` with a count go to a percentage of the page, as in Vimium, not to a line number (R6.6).
- `<Esc>` in Normal mode with nothing pending passes through, so pages can still close their own dialogs with it (R4.8).
- A key that breaks a pending sequence is handled again on its own: `gj` scrolls down (R4.6).
- Counts are capped at 9999 so a mistyped count can't trigger a huge loop (R4.9).
- Insert mode entered with `i` is "sticky" and ignores focus changes, until `<Esc>` (R3.7).
- Inputs that don't take text (checkboxes, buttons, …) don't trigger Insert mode, so `j` still scrolls after you tick a box (R3.6).
- When nothing was clicked and the document can't scroll, the largest visible scrollable container is used, so SPAs with an inner scrolling panel work right away (R7.4).
- A scroll at the edge is still consumed, so `j` at the bottom of a page never reaches a site shortcut (R6.10).

## Your decisions

- One spec for all of M1; smooth scrolling; `<Esc>` in a text field blurs it and returns to Normal mode (brainstorm contract).
- `<C-d>` / `<C-u>` also scroll half a page, as in Neovim (R6.3). This adds to the `PLAN.md` key list.

## Open questions

- None.
