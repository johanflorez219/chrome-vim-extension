---
name: plan
description: Turn an approved spec into a deep, ready-to-execute tasks.md by orchestrating the planner subagent — one planner drafts the plan, then one planner per task digs into each task in parallel, and an integrating planner merges the results, round after round, until no task needs another pass. Use this right after the specify skill finishes (design approved), and whenever the user asks to plan, break down, or create or refine the tasks for a spec in docs/specs/. It is the third step of the workflow brainstorm → specify → plan → execute.
---

# Plan

A design says how the feature works; a plan says which commits make it real,
in what order, with which tests. A shallow plan pushes the hard thinking into
execution, where it is expensive: half-done commits, failing checks,
surprises about what the code base already has. This skill makes the
thinking happen up front by giving every task its own focused, fresh-context
review until each one is unambiguous.

You (the main session) orchestrate. The **planner** subagent
(`.claude/agents/planner.md`) does the planning work in three modes —
_plan_, _task_ and _integrate_ — described in its own instructions. You
launch it, collect its verdicts, bring the user any questions only they can
answer, and decide when to stop.

Talk to the user in their language. Keep them posted with one short line per
round ("Round 2: deepening T2, T5 — 2 planners running").

## Before you start

- You need a spec folder `docs/specs/YYYY-MM-DD-<topic>/` with an approved
  `requirements.md` and `design.md`. If the design isn't approved yet, go
  back to the specify skill — planning an unapproved design is guesswork.
- The spec should already be committed (the specify skill does this when the
  design is approved). If it isn't, ask whether to commit it first.
- If `tasks.md` already exists, this is a re-plan: skip the draft step and
  start with a deepening round on every task that isn't done.

## Step 1: Draft

Launch the planner in **plan mode** with the spec folder path. It reads the
spec and the project, writes `tasks.md`, and reports a verdict, the task
list, and any questions for the user.

If it reports questions, ask them now (AskUserQuestion, its recommended
answer first) before going deeper — every task review afterward builds on
those answers. If it reports spec issues, fix them in the spec with the
user's agreement before continuing; the planner never edits the spec.

## Step 2: Deepen, round by round

Each round has two parts.

**Fan out.** Launch one planner in **task mode** per task that needs a look,
all in the same message so they run in parallel. Give each one the spec
folder and its task ID. Task-mode planners leave `tasks.md` alone; each
writes its proposal to `.proposals/T<n>.md` in the spec folder — the
rewritten task, a verdict for that task, cross-task notes (dependencies
that should change, a task that should be split or added), and questions —
and returns the same report to you.

- Round 1 covers every task not yet marked done.
- Later rounds cover only the tasks whose last verdict was ITERATE, plus any
  task the integrator flagged as affected by the last merge.
- Stay under the concurrent subagent limit: launch at most 10 at a time and
  start the next batch when those finish.
- A task gets at most **5** deep reviews. If it still says ITERATE after its
  fifth, stop reviewing it and report it as still weak.

**Collect questions.** Before integrating, gather every question from the
round, drop duplicates, and ask the user in one AskUserQuestion round (up
to 4 questions, the most important first; queue the rest for the next
round). Questions that block a task shouldn't hold up the others.

**Integrate.** Once every planner of the round has finished, launch one
planner in **integrate mode** with the spec folder and the user's answers.
It reads the proposals from `.proposals/`, applies them to `tasks.md`,
reconciles conflicts between tasks, re-checks dependencies and coverage,
updates the status log, deletes `.proposals/`, and reports the overall
verdict plus which tasks still need a look. Check that every task you
launched left a proposal file before integrating; relaunch any that didn't.

Run the next round with the tasks the integrator lists. Stop when:

- the integrator returns **READY** and no task is ITERATE — the plan is done;
- every remaining ITERATE task has used its 5 reviews — stop and report them;
- the integrator returns **BLOCKED** — ask the user, then continue.

## Step 3: Hand off

Give the user, briefly:

- the path to `tasks.md`, the number of tasks and the first one;
- how many rounds it took and any task still marked weak;
- the agreements made along the way and anything flagged about the spec.

Ask them to approve the plan. When they do, run Prettier on `tasks.md` and
commit it as `Docs: add the <topic> task plan` following `CONTRIBUTING.md`.
Execution — working through the tasks one commit at a time — starts only
after that.

## Things to keep in mind

- **Costs scale with tasks.** Each planner run takes a few minutes and tens
  of thousands of tokens. Before round 1, tell the user how many planners
  you're about to launch. For a plan with more than ~12 tasks, offer to
  deepen only the riskiest ones first.
- **You don't edit tasks.md yourself** during planning — the planners do.
  That keeps one voice and one checklist behind every task. Pass user
  answers to the next planner run instead of writing them in.
- **Don't write product code** or start executing tasks in this skill.
- **Proposals travel as files.** Don't paste or summarize them into the
  integrator's prompt — the files carry every detail the deep review found.
  `.proposals/` is scratch space: never commit it.
