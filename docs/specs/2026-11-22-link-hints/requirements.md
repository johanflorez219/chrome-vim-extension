# Link hints — Requirements

**Status:** Approved (2026-11-22)
**Source:** brainstorm contract from 2026-11-22 (milestone M3 in `PLAN.md`)

## Introduction

This is milestone M3: reaching links, buttons and fields with the keyboard alone. Pressing `f` puts a short label on every clickable element on screen; typing a label clicks that element. `F` opens a link in a background tab, `yf` copies a link's URL, and `gi` jumps to a text field. This is what makes the extension usable without a mouse, Vimium-style. The hints must be quick to read, must never change how the page looks once they're gone, and a mistyped key must never click something the user didn't mean.

## Glossary

- **Clickable element:** an element the user could click or focus on purpose: links with an `href`, buttons, `input` (not `type=hidden`), `textarea`, `select`, `summary`, `label` with a control, elements with `role` `button`, `link`, `checkbox`, `radio`, `tab`, `menuitem`, `option` or `switch`, elements with an `onclick` attribute, elements with a `tabindex` of 0 or more, and contenteditable hosts (see _Text input_). Disabled elements are not clickable.
- **Visible:** at least part of the element's box is inside the viewport, its box has a non-zero width and height, it is not `visibility: hidden`, `display: none` or `opacity: 0` (on itself or an ancestor), and it is not entirely covered by another element.
- **Hint:** a small label drawn over a visible clickable element while Hint mode is on.
- **Label:** the letters of a hint, taken from the hint alphabet.
- **Hint alphabet:** the letters labels are made of. M3 uses `sadfjklewcmpgh`; settings come in M5.
- **Typed prefix:** the letters typed since the hints appeared.
- **Hint mode:** the mode that is on while hints are shown. It has three actions: _click_ (`f`), _open in a new tab_ (`F`) and _copy the URL_ (`yf`).
- **Link:** an `a` element with an `href`.
- **Text input:** a text-like `input`, a `textarea`, or a contenteditable host: an editable element whose parent isn't editable. A rich-text editor is one text input; the paragraphs and links inside it are not text inputs.

## Requirements

### R1: Find the elements to hint

**User story:** As a keyboard user, I want a hint on everything I could click on screen and on nothing else, so that what I see is what I can reach.

**Acceptance criteria**

1. WHEN Hint mode starts THE EXTENSION SHALL give a hint to every visible clickable element in the top frame's document, including elements inside open and closed shadow roots.
2. THE EXTENSION SHALL NOT give a hint to an element that is not visible, is disabled, or is outside the viewport.
3. IF an element is entirely covered by another element (for example a modal backdrop or a sticky header) THEN THE EXTENSION SHALL NOT give it a hint.
4. IF a clickable element contains another clickable element THEN THE EXTENSION SHALL give each its own hint, except a `label` whose only clickable content is its own control, which gets one hint.
5. THE EXTENSION SHALL NOT give hints to elements inside iframes, and SHALL NOT hint the iframe itself.
6. WHEN the action is _copy the URL_ (`yf`) THE EXTENSION SHALL give hints only to visible links whose URL can be copied (R5.3).

### R2: Label the hints

**User story:** As a keyboard user, I want labels short enough to type in one or two keys, so that following a link is about as fast as pointing at it.

**Acceptance criteria**

1. THE EXTENSION SHALL make every label from the hint alphabet only.
2. THE EXTENSION SHALL make the labels prefix-free: no label is the start of another.
3. THE EXTENSION SHALL use the shortest labels that fit: with N hints and an alphabet of A letters, no label is longer than the smallest L where A^L ≥ N, and when N ≤ A every label is one letter.
4. THE EXTENSION SHALL give each hint a different label.
5. THE EXTENSION SHALL draw labels in uppercase and match typed letters regardless of case.
6. THE EXTENSION SHALL draw each hint next to the top-left corner of its element, inside the viewport, above the page's content, in a style the page's CSS cannot change.

### R3: Type to pick a hint

**User story:** As a keyboard user, I want the hints to narrow as I type and act as soon as a label is complete, so that I never have to confirm with Enter.

**Acceptance criteria**

1. WHEN the user types a letter that, added to the typed prefix, starts one or more labels THE HINT MODE SHALL hide every hint whose label does not start with the new typed prefix and mark the typed letters on the remaining hints.
2. WHEN the typed prefix equals a label THE HINT MODE SHALL remove all hints, return to Normal mode and run its action on that hint's element.
3. WHEN the user presses `<BS>` with a non-empty typed prefix THE HINT MODE SHALL remove its last letter and show again the hints that match the shorter prefix.
4. WHEN the user presses `<BS>` with an empty typed prefix THE HINT MODE SHALL do nothing.
5. WHEN the user presses `<Esc>` or `<C-[>` THE HINT MODE SHALL remove all hints and return to Normal mode without running any action.
6. IF the user types a key without Ctrl, Alt or Meta that matches no label THEN THE HINT MODE SHALL remove all hints, return to Normal mode, run no action, and keep the key from the page.
7. IF the user presses a key with Ctrl, Alt or Meta THEN THE HINT MODE SHALL remove all hints, return to Normal mode and let the key reach the page and the browser.
8. WHILE in Hint mode THE EXTENSION SHALL keep every key it handles from the page, apart from R3.7.
9. WHILE in Hint mode THE EXTENSION SHALL ignore auto-repeated keys.
10. IF there are no hints to show THEN THE EXTENSION SHALL stay in Normal mode, show nothing and still consume the keys.

### R4: Click with `f`

**User story:** As a Vim user, I want `f` and a label to click that element, so that I can follow links and press buttons without the mouse.

**Acceptance criteria**

1. WHEN the user presses `f` in Normal mode THE EXTENSION SHALL start Hint mode with the _click_ action.
2. WHEN a hint is picked with the _click_ action on an element that is not a text input THE EXTENSION SHALL activate it as a mouse click on it would, including the hover, press and release events the page listens for.
3. WHEN a hint is picked with the _click_ action on a text input THE EXTENSION SHALL focus it and enter Insert mode, so the user can type right away.
4. WHEN a hint is picked with the _click_ action on a `select` THE EXTENSION SHALL focus it, as M1's auto Insert mode already handles.
5. WHEN a link with `target=_blank` is clicked THE EXTENSION SHALL let the page open it as a mouse click would.
6. IF the element was removed from the page or disabled before the hint is picked THEN THE EXTENSION SHALL do nothing.
7. WHEN `f` is typed with a count THE EXTENSION SHALL ignore the count.

### R5: Open in a new tab with `F`, copy with `yf`

**User story:** As a Vim user, I want `F` to open links in the background and `yf` to copy them, so that I can collect links without leaving the page.

**Acceptance criteria**

1. WHEN the user presses `F` in Normal mode THE EXTENSION SHALL start Hint mode with the _open in a new tab_ action.
2. WHEN a hint is picked with _open in a new tab_ on a link to an `http` or `https` URL THE EXTENSION SHALL open that URL in a new tab in the current window without activating it, placed right after the current tab and after any tabs already opened from it that directly follow it, so several `F` presses keep their order.
3. WHEN the user presses `yf` in Normal mode THE EXTENSION SHALL start Hint mode with the _copy the URL_ action, on links to an `http`, `https`, `mailto` or `file` URL.
4. WHEN a hint is picked with _copy the URL_ THE EXTENSION SHALL copy the link's absolute URL to the clipboard.
5. IF the element picked with _open in a new tab_ is not a link, or its URL is not `http` or `https` (for example `javascript:` or `mailto:`), THEN THE EXTENSION SHALL click it as `f` does (R4.2–R4.6).
6. IF the browser refuses the copy or the new tab can't be opened THEN THE EXTENSION SHALL do nothing visible and show no error.
7. WHEN `F` or `yf` is typed with a count THE EXTENSION SHALL ignore the count.
8. THE EXTENSION SHALL copy a URL only to the clipboard, never store it or send it anywhere else, and send a URL to the service worker only to open it.

### R6: Focus a text input with `gi`

**User story:** As a Vim user, I want `gi` to jump to a text field, so that I can start typing in a search box without hunting for it.

**Acceptance criteria**

1. WHEN the user presses `gi` in Normal mode THE EXTENSION SHALL focus the first visible text input in document order and enter Insert mode.
2. WHEN `gi` is typed with a count N THE EXTENSION SHALL focus the Nth visible text input, or the last one if there are fewer than N.
3. IF there is no visible text input THEN THE EXTENSION SHALL do nothing and still consume the keys.
4. WHEN `gi` focuses a text input THE EXTENSION SHALL leave its value unchanged and put the caret where the browser puts it on focus.

### R7: Hints leave the page as they found it

**User story:** As someone browsing any site, I want hints to vanish cleanly whatever happens, so that the page never ends up broken or covered.

**Acceptance criteria**

1. WHEN Hint mode ends, for any reason, THE EXTENSION SHALL remove every hint and leave no element, style or listener of its own in the page beyond what Normal mode already had.
2. WHEN the document, or an element that contains a hinted element, scrolls, or the window is resized, the tab is hidden, or the window loses focus while in Hint mode THE EXTENSION SHALL end Hint mode without running any action.
3. WHEN an editable element gets focus while in Hint mode THE EXTENSION SHALL end Hint mode and enter Insert mode.
4. WHEN the user presses `f`, `F` or `yf` again after Hint mode ended THE EXTENSION SHALL find the elements and make the labels again from the page as it is then.
5. THE EXTENSION SHALL NOT change the page's layout, scroll position, focus or selection by showing hints.
6. WHILE in Insert mode THE EXTENSION SHALL NOT start Hint mode and let `f`, `F`, `y` and `g` reach the page.
7. IF the extension is reloaded or disabled while hints are shown THEN THE EXTENSION SHALL remove the hints.

## Non-functional requirements

### NFR1: Performance

1. THE EXTENSION SHALL show the hints within 100 ms of the key press on a page with up to 1,000 clickable elements in the document, of which up to 300 are visible.
2. THE EXTENSION SHALL update the hints within 16 ms of each typed letter.
3. THE EXTENSION SHALL add no work to the page while Hint mode is off.

### NFR2: Compatibility

1. THE EXTENSION SHALL work in the current stable Arc and Chrome on macOS, as a Manifest V3 extension.
2. THE EXTENSION SHALL use no default key that includes `Cmd`.

### NFR3: Security and permissions

1. THE EXTENSION SHALL add no permission to the manifest.
2. THE EXTENSION SHALL open a new tab only for an `http` or `https` URL, and the service worker SHALL check the URL before opening it.
3. THE EXTENSION SHALL accept the new-tab message only from its own content scripts, as M2 does.

### NFR4: Privacy

1. THE EXTENSION SHALL NOT log, store or send the page's links, its text or the keys typed.

### NFR5: Accessibility

1. THE EXTENSION SHALL draw labels with a contrast ratio of at least 4.5:1 against their own background.
2. THE EXTENSION SHALL hide the hints from screen readers, since they are only shown while the keyboard is in use.

### NFR6: Quality

1. THE EXTENSION SHALL have unit tests for finding elements, label generation, filtering and each action, and end-to-end tests for `f`, `F`, `yf`, `gi`, cancelling and the no-hint cases, with overall coverage at or above 80%.

## Out of scope

- Matching typed text against link text (user decision).
- Hints inside iframes, and hinting the iframes themselves (top frame only, as in `PLAN.md`).
- Changing the hint alphabet or any hint setting (M5).
- Counts on `f`, `F` and `yf`, and opening several links in one Hint mode.
- A HUD or a "copied" message (M4).
- Hover-only actions, right-click, downloading a link, and opening in a new window.
- Re-positioning the hints while the page moves: Hint mode ends instead (R7.2).
- Image-map `area` links: they have no box to put a label on.
- Pinch-zoom: hints follow the layout viewport.

## Decisions made by Claude

- Labels are drawn in uppercase; typed letters match regardless of case (R2.5).
- `F` on an element that isn't an `http`/`https` link clicks it, the same as `f` (R5.5).
- `yf` shows hints only on links it can copy, so nothing is hinted that does nothing (R1.6, R5.3).
- The new tab from `F` opens right after the current tab, in the background (R5.2). The service worker opens it through a new message; no permission is needed.
- A key that matches no label cancels Hint mode and is kept from the page. A key with Ctrl, Alt or Meta cancels and goes through, so browser shortcuts keep working (R3.6, R3.7).
- `<BS>` removes the last typed letter (R3.3).
- A scroll of the document or of a container of hinted elements ends Hint mode; other scrolling (a carousel elsewhere) doesn't (R7.2).
- Scrolling, resizing, hiding the tab or losing focus ends Hint mode instead of moving the hints (R7.2).
- `gi` with a count N focuses the Nth text input, as in Vimium; without visible inputs it does nothing (R6.2, R6.3).
- Elements covered entirely by another element get no hint (R1.3).
- Nested clickable elements each get a hint, apart from a label around its own control (R1.4).
- `f` on a text input focuses it and enters Insert mode instead of sending a click (R4.3).

## Your decisions

- One spec for all of M3 (brainstorm contract).
- `F` opens the link in a background tab (R5.2).
- Typing matches labels only, not link text (Out of scope).
- Several `F` presses keep their opening order, as Ctrl/Cmd-click does (R5.2, after the builder check).
- `area` links are dropped, a rich-text editor counts as one text input that `f` can hint, and R7.2 ends on scrolls that move hinted elements (after the builder check).

## Open questions

- None.
