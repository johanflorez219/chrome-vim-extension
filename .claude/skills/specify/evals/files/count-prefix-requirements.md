# Count prefix — Requirements

**Status:** Approved (2026-10-20)

## Introduction

Vim users expect a number before a motion to repeat it ("5j" scrolls down five steps). Without counts every repeated motion needs one key press per step.

## Requirements

### R1: Parse a count before a command

**User story:** As a Vim user, I want to type a number before a command, so that I can repeat it without pressing the key many times.

**Acceptance criteria**

1. WHEN the user types one or more digits followed by a command key THE KEY PARSER SHALL emit the command with the digits as its count.
2. IF the first digit typed is `0` THEN THE KEY PARSER SHALL treat it as a command key, not as the start of a count.
3. WHEN no digits precede a command THE KEY PARSER SHALL emit the command with a count of 1.
4. IF the count exceeds 999 THEN THE KEY PARSER SHALL cap it at 999.
5. WHEN the user presses `Esc` while a count is pending THE KEY PARSER SHALL discard the count.
6. IF the key timeout passes while a count is pending THEN THE KEY PARSER SHALL discard the count.

### R2: Commands honor the count

**User story:** As a Vim user, I want counted commands to repeat, so that `5j` scrolls five steps.

**Acceptance criteria**

1. WHEN a command that accepts a count receives count N THE EXTENSION SHALL perform it N times as a single smooth scroll.
2. WHEN a command that does not accept a count receives a count THE EXTENSION SHALL perform it once and ignore the count.

## Out of scope

- Counts for tab commands (M2).
- Showing the pending count in the HUD (M4).

## Decisions made by Claude

- Cap of 999 to avoid runaway scrolls.

## Open questions

- None.
