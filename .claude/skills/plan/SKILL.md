---
name: plan
description: Turn an approved spec into a deep, ready-to-execute tasks.md by launching the plan-tasks workflow on it. Use this right after the specify skill finishes (design approved), and whenever the user asks to plan, break down, or create or refine the tasks for a spec in docs/specs/. It checks the spec is ready, launches the workflow, then brings the user its questions and the result. It is the third step of the workflow brainstorm → specify → plan → execute.
---

# Plan

A design says how the feature works; a plan says which commits make it real,
in what order, with which tests. A shallow plan pushes the hard thinking into
execution, where it is expensive. The **plan-tasks workflow**
(`.claude/workflows/plan-tasks.js`) does that thinking up front: it gives
every task its own fresh-context review and a scope check until each one is
unambiguous. This skill makes sure the workflow gets a good input, launches
it, and brings the result to the user.

Talk to the user in their language.

## How the workflow works

You don't run these steps; the workflow does. Know them so you can explain
the plan and the result.

1. **Draft.** A planner reads the spec and the project and drafts the task
   list. If `tasks.md` already exists, this is a re-plan: the file stays as
   it is and only tasks not marked done are reviewed.
2. **Deepen.** One read-only planner per task reviews it against the
   checklist in `.claude/agents/planner.md` (one commit, traced to criteria,
   tests first, grounded in the repo, passes the gates). Each task then gets
   a scope critic that never saw the rewrite and looks for a task that is
   too big, too small, outside the design, or leaves a criterion uncovered.
   Tasks run in parallel, each on its own clock.
3. **Integrate.** One planner merges every proposal into `tasks.md`,
   resolving the scope findings and dependencies. It is the **only** agent
   that writes `tasks.md`.
4. **Repeat** with the tasks the integrator flags, up to 5 reviews per task,
   until the plan is READY, BLOCKED, or a task is still weak after its fifth
   review.

Because many planners run at once, none of them may write. The workflow
fingerprints the working tree before and after every fan-out and stops with
an error if anything changed. The workflow cannot ask the user anything
while it runs: it answers every open question with the planner's
recommendation, marked _provisional_, and returns the questions at the end.

## Step 1: Make sure the input is right

You need a spec folder `docs/specs/YYYY-MM-DD-<topic>/` and the answers to
these checks before launching:

- It has an approved `requirements.md` and `design.md`. The design counts as
  approved when the user approved it, or when the specify skill found
  nothing open and committed it. If it isn't approved, go back to the
  specify skill: planning an unapproved design is guesswork.
- The spec is committed. If it isn't, ask whether to commit it first.
- Which folder: use the one the user named or the one the specify skill just
  committed. If several exist and it's unclear, ask.
- Whether `tasks.md` exists. If it does, it's a re-plan; say so, and note
  how many tasks aren't done.

Tell the user in one line what is about to run: the folder, new plan or
re-plan, and roughly how many planners (one draft, then two agents per
pending task per round, plus one integrator). For a plan with more than
~12 tasks, offer to stop after the first round if they'd rather review
the result before going deeper.

## Step 2: Launch the workflow

Call the Workflow tool with the saved workflow `plan-tasks` and these args:

```json
{ "spec": "docs/specs/YYYY-MM-DD-<topic>", "date": "<today, YYYY-MM-DD>" }
```

Add `"answers": ["…"]` when re-running with decisions the user already made
(Step 3). If the name isn't found, pass
`scriptPath: ".claude/workflows/plan-tasks.js"` instead.

It runs in the background and notifies you when it ends; the user can watch
it with `/workflows`. Don't edit `tasks.md` or the spec while it runs, since
the guard counts any change in the working tree as a violation.

## Step 3: Bring the result to the user

Read the workflow's result and report briefly: the verdict, the path to
`tasks.md`, the number of tasks and how many are done, the rounds it took,
and any task still weak. Then handle what came back:

- **Questions for the user.** The planner already applied its recommended
  answer to each. Ask them now (AskUserQuestion, the recommended answer
  first). If the user accepts all of them, nothing else is needed. If they
  change any, re-launch the workflow with their decisions in `answers`; it
  treats the file as a re-plan and records them in _Agreements_.
- **Spec issues.** The planner never edits the spec. Fix them in the spec
  with the user's agreement, commit that, and re-launch.
- **BLOCKED.** The workflow needs a decision only the user can make. Ask,
  then re-launch with their answers.
- **An error from the guard** ("the working tree changed during a read-only
  fan-out") means a planner wrote a file it shouldn't have. Show the user
  what changed with `git status`, don't commit it, and re-run once the tree
  is clean.
- **A task still weak** after its five reviews: say which one and why, and
  let the user decide whether to accept it or reshape it with the spec.

## Step 4: Hand off

Show the user the plan and ask them to approve it. Point them at what
changed: `git diff` for a re-plan, since the integrator may reword several
tasks. When they approve, run Prettier on `tasks.md` and commit it as
`Docs: add the <topic> task plan` following `CONTRIBUTING.md`. Execution —
working through the tasks one commit at a time — starts only after that.

## Things to keep in mind

- **Costs scale with tasks.** Each planner run takes minutes and tens of
  thousands of tokens. The workflow has no spend cap; the per-task review cap
  and the round limit are its only brakes.
- **Don't write product code** or start executing tasks in this skill.
- **Don't edit `tasks.md` yourself** during planning. One planner voice and
  one checklist stand behind every task; user decisions reach it through
  `answers`.
