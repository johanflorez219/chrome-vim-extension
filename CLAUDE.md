# CLAUDE.md

Vim-style navigation extension for Arc and Chrome (Manifest V3, TypeScript).

## Workflow

Every request goes through **brainstorm → specify → plan → execute**. Each
step ends with the user's approval; nothing is built before the plan is
approved.

1. **Brainstorm** — apply the [brainstorm skill](.claude/skills/brainstorm/SKILL.md)
   to every message before acting. Clear request: just do it. Small gap:
   agree on a short contract in chat, then build. Project: agree on the
   contract, then go to specify.
2. **Specify** — the [specify skill](.claude/skills/specify/SKILL.md) writes
   `docs/specs/YYYY-MM-DD-<topic>/requirements.md` (user stories, EARS
   criteria) and, once those are approved, `design.md`. When the design is
   approved, commit both as `Docs: add the <topic> spec`.
3. **Plan** — the [plan skill](.claude/skills/plan/SKILL.md) drives the
   [planner subagent](.claude/agents/planner.md): one planner drafts
   `tasks.md`, then one planner per task deepens each task in parallel and
   an integrating planner merges the results, round after round (up to 5
   reviews per task), until no task needs another pass. When the plan is
   approved, commit it as `Docs: add the <topic> task plan`.
4. **Execute** — work through `tasks.md` in order, one task per commit, tests
   first. Each task's commit flips its marker to `[x] done` and adds a dated
   line to the status log, so coworkers can see what's done, what was agreed
   and what's next.

`tasks.md`'s status log is the shared record of a feature: read it before
working on a spec, and keep it current.

## Rules

- **Contributing:** follow [CONTRIBUTING.md](CONTRIBUTING.md) for commit format, coding rules, design patterns and testing. They override defaults.
- **Plan:** [PLAN.md](PLAN.md) has the architecture and milestones. Tick milestone checkboxes as items are done.
- **Commits:** `<Type>: <subject>` + `Why:` + `What:`, no ticket, **no AI attribution or Co-Authored-By lines**. Never use `--no-verify`.
- **Tests:** every behavior change ships with unit tests, written first. Coverage ≥ 80%.
- **Before saying a change is done:** run `npm run check` and report the result.
