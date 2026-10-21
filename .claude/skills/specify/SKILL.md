---
name: specify
description: Turn an agreed idea into a written spec — a requirements.md (user stories with EARS acceptance criteria) and a design.md — in docs/specs/YYYY-MM-DD-<topic>/. Use this right after the brainstorm skill settles a project-sized request, and whenever the user asks for a spec, requirements, acceptance criteria, a design doc, or "write it down before we build". It is the second step of the workflow brainstorm → specify → plan → execute; it hunts for missing requirements (edge cases, errors, limits) before any design or code, and gets the requirements approved before writing the design.
---

# Specify

Brainstorm found out what the user wants. This skill pins it down in writing
so that a capable engineer — or a later Claude session with no memory of the
conversation — can plan and build it without going back to the user.

The focus is **requirements**: what the system must do, observably, in every
situation that matters. Most rework comes from requirements nobody wrote
down — the empty page, the second press, the iframe, the error — not from bad
design. So this skill spends its effort finding those gaps and getting the
user to settle them while it is still cheap.

Talk to the user in their language. Write the documents in the project's
language (English for this repo), unless the user asks otherwise.

## Where you start

You should arrive with an approved contract from the brainstorm skill (goal,
why, scope, done-when, decisions, calls). If you don't — the user jumped
straight to "write the spec for X" — run the brainstorm skill first: a spec
built on a guessed intent just writes the guess down neatly.

Then read what already constrains the answer: `PLAN.md` (architecture,
milestones, non-goals), `CONTRIBUTING.md` (patterns, testing rules), existing
specs in `docs/specs/`, and the code the feature touches. Requirements that
contradict the plan should surface now, not in review.

## Step 1: Requirements

Create `docs/specs/YYYY-MM-DD-<topic>/requirements.md` (today's date, a
short kebab-case topic) following `references/requirements-template.md`.

How to write them well:

- **One requirement per user-visible capability**, each with a user story
  ("As a …, I want …, so that …") that carries the _why_ from the contract.
  The why is what lets a builder make the small calls the spec doesn't cover.
- **Acceptance criteria in EARS form** — one behavior per criterion, each
  testable by an automated test or a clear manual check:

  | Pattern    | Shape                                                        | Use for                   |
  | ---------- | ------------------------------------------------------------ | ------------------------- |
  | Event      | WHEN `<trigger>` THE SYSTEM SHALL `<response>`               | something happens         |
  | State      | WHILE `<state>` THE SYSTEM SHALL `<response>`                | ongoing conditions        |
  | Unwanted   | IF `<condition>` THEN THE SYSTEM SHALL `<response>`          | errors, bad input, limits |
  | Optional   | WHERE `<feature/option is on>` THE SYSTEM SHALL `<response>` | settings, variants        |
  | Ubiquitous | THE SYSTEM SHALL `<response>`                                | always-true rules         |

  Name the actual system ("THE EXTENSION", "THE HINT MODE") instead of a
  vague "the system" when it helps.

- **Say what, not how.** "THE EXTENSION SHALL show a label on every visible
  link" — not "use a MutationObserver". Implementation belongs in the design.
- **Make criteria measurable.** "fast" → "within 100 ms of the key press";
  "most links" → "every element matching the clickable list in R1".
- **Number everything** (R1, R1.1, R1.2 …) so the design, plan and tests can
  point at it.
- Also cover **non-functional requirements** that matter here
  (performance, accessibility, compatibility with Arc/Chrome, security,
  privacy) and an explicit **Out of scope** list taken from the contract.

### The gap hunt

Before showing the draft, walk every requirement and ask what happens when:

- there is nothing (empty page, no matches, first run) or far too much
- the user repeats it, cancels it halfway, or does it in an unusual context
  (inputs, iframes, shadow DOM, special pages, another mode active)
- something fails (permission denied, API unavailable, page changes underneath)
- it meets existing behavior (other keys, other features, site shortcuts)

Sort what you find, the same way the brainstorm skill sorts unknowns:

- **Answered** by the contract, the plan or the code → write it in.
- **Minor** → a sensible builder would settle it the same way regardless.
  Decide it and list it under _Decisions made by Claude_ in the document.
- **Theirs** → the answer changes what the user gets. Ask these.

Ask the "theirs" pile in one round with AskUserQuestion (up to 4 questions,
2–4 options each, your recommendation first and marked "(Recommended)",
favoring what the plan already says and the smallest scope). More than four
means the contract was thinner than it looked — ask the four that matter
most and note the rest as open.

### Requirements gate

Show the user a short summary in chat and the file path: the requirement
titles in one line each, then the questions. The full list of your decisions
is in the document; in chat mention only the one or two they're most likely
to disagree with. Aim for something readable in under a minute — the
document carries the detail, the chat message only has to get them to open
it and answer. Ask them to approve or correct it. Don't start the design until they approve: a design
built on the wrong requirements is the most expensive kind of rework, and
reading a list of requirements is cheap for the user.

## Step 2: Design

Once requirements are approved, create `design.md` in the same folder,
following `references/design-template.md`.

- **Fit the existing architecture.** Use the modules, patterns and folder
  layout in `PLAN.md` and `CONTRIBUTING.md`; call out any place you need to
  depart from them and why.
- **Trace every part to requirements.** Each component lists the criteria it
  satisfies (→ R1.2, R3.1). Finish with a coverage table: every acceptance
  criterion maps to a design element and a test. A criterion with no home is
  a gap; a component with no criterion is scope creep.
- **Interfaces over prose.** Give the TypeScript types and function
  signatures that other parts depend on; leave bodies to the builder.
- **Errors and edge cases** from the requirements get a concrete handling
  strategy, not "handle gracefully".
- **Testing strategy** follows the project rules (unit tests first, coverage
  target): which criteria get unit tests, which need end-to-end checks.
- **Decisions and trade-offs:** for each real choice, the alternatives
  considered and why this one, so later readers don't relitigate it.

Keep both documents proportional. A small feature might have three
requirements and a one-page design; don't pad sections to fill the template —
write "None" or drop a section that truly doesn't apply.

## Step 3: Builder check

Before handing over the design, spawn a fresh subagent with the prompt in
`references/builder-check.md` and the folder path. Tell the user a reviewer
is reading the spec first. Sort its questions into answered / minor / theirs,
update the documents, and bring any "theirs" questions to the user in one
round. Without a subagent tool, read the spec as that builder yourself.

## Step 4: Hand off

Give the user the folder path, a two-or-three-line summary of the design,
the decisions most worth a second look (the rest are in the document), any
proposed requirement changes, and ask them to approve it. Keep it short, as
in the requirements gate.

## Step 5: Hand off to plan

Once the user approves the design and you've committed the spec (below),
invoke the **plan** skill with the spec folder path. It runs the planner
subagent to write `tasks.md` and deepen every task until the plan is ready.
If the planner finds spec issues along the way, the plan skill brings them
back; fix them here, with the user's agreement — the planner never edits the
spec itself.

## Committing the spec

The spec is shared through git, so coworkers see the same requirements,
design, plan and status log:

- When the user approves the design, run Prettier on the spec folder and
  commit `requirements.md` and `design.md` as
  `Docs: add the <topic> spec`, following the commit format in
  `CONTRIBUTING.md`.
- The plan skill commits `tasks.md` when the user approves the plan.
- Later changes to the spec (an approved requirement change, a status-log
  update) go in their own `Docs:` commit or in the commit of the task that
  caused them.

Don't write product code, scaffold, or install anything in this skill —
specs only.

**Approved documents are the user's.** Once they approve `requirements.md`,
don't edit it on your own — not even to add notes. If the design or the
builder check turns up something the requirements should say (a new edge
case, a clarification, an open question), put it in `design.md` under
_Decisions and trade-offs_ or _Open questions_, and propose the change to
the requirements in chat. Edit `requirements.md` only after they agree, then
update the affected parts of `design.md` and say what changed. Silent edits
to an approved document break the trust that makes the approval mean
something.

## Red flags

| Thought                                                      | Reality                                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| "I'll write requirements from the request alone"             | Without the brainstorm contract you're writing down a guess. Brainstorm first.     |
| "This criterion is obvious, no need to make it testable"     | If you can't say how to test it, the builder can't tell when it's done.            |
| "I'll describe the implementation in the requirement"        | Requirements say what; the design says how. Mixing them freezes choices too early. |
| "I'll do requirements and design in one go to save time"     | If a requirement is wrong, the design built on it is waste. Gate in between.       |
| "I'll ask about every edge case"                             | Decide the minor ones and list them; ask only what changes the result.             |
| "The template has a section, so I must fill it"              | Proportional beats complete. Drop what doesn't apply.                              |
| "It's just a note, I'll add it to the approved requirements" | Propose it in chat; edit only after they agree.                                    |
