# requirements.md template

Copy this shape. Drop sections that truly don't apply; don't pad.

```markdown
# <Feature name> — Requirements

**Status:** Draft | Approved (YYYY-MM-DD)
**Source:** brainstorm contract from <date / short reference>

## Introduction

<2–4 sentences: what this feature is, who it serves, and why it matters now.
Carry the "why" from the contract — it guides every small decision.>

## Glossary

- **<Term>:** <meaning in this spec, if a word could be read two ways>

## Requirements

### R1: <Capability title>

**User story:** As a <user>, I want <capability>, so that <benefit>.

**Acceptance criteria**

1. WHEN <trigger> THE <SYSTEM> SHALL <observable response>.
2. WHILE <state> THE <SYSTEM> SHALL <observable response>.
3. IF <unwanted condition> THEN THE <SYSTEM> SHALL <observable response>.

### R2: <Capability title>

...

## Non-functional requirements

### NFR1: <Performance | Accessibility | Compatibility | Security | Privacy>

1. THE <SYSTEM> SHALL <measurable constraint>.

## Out of scope

- <What this spec deliberately does not cover, and where it goes instead
  (a later milestone, a separate spec, never).>

## Decisions made by Claude

- <Minor gaps settled without asking, each with the choice made — so the
  user can reject any of them while reviewing.>

## Open questions

- <Anything still unknown, or "None".>
```

## Example criterion set

```markdown
### R2: Filter hints by typing

**User story:** As a keyboard user, I want to narrow the hints by typing
their labels, so that I can reach a link without looking for it twice.

**Acceptance criteria**

1. WHEN the user types a character that starts one or more labels THE HINT
   MODE SHALL hide every hint whose label does not start with the typed
   characters.
2. WHEN the typed characters match exactly one label THE HINT MODE SHALL
   activate that hint and exit.
3. IF the user types a character that matches no label THEN THE HINT MODE
   SHALL keep the current hints visible and ignore the character.
4. WHEN the user presses `Esc` THE HINT MODE SHALL remove all hints and
   return to Normal mode.
```
