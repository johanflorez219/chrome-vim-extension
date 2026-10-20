(Earlier in the conversation, the brainstorm skill ran and the user approved this contract.)

**Goal:** Link hints (`f`, `F`) that work like Vimium but don't cover the text you're reading.
**Why:** In Vimium the labels pile up on top of dense text (news sites, GitHub file lists) and I lose track of which label is which link.
**In scope:** `f` opens in current tab, `F` in new background tab; labels from the `sadfjklewcmpgh` alphabet with no shared prefixes; filter as you type; labels placed so they don't overlap each other or cover the link text when there's room; top frame only.
**Out of scope:** iframes, `yf`, `gi`, text filtering by link text, custom styling options (all later).
**Done when:** on github.com file lists and news.ycombinator.com I can press `f`, read every label without overlap, and open any link in 2 keystrokes or fewer for pages with < 200 links.
**Your decisions:** build it after M1 as PLAN.md says; Esc cancels.
**My calls:** labels rendered in Shadow DOM; only elements in the viewport get labels; shortest labels go to links nearest the top-left.
**Open:** nothing.
