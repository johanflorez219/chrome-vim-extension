# CLAUDE.md

Vim-style navigation extension for Arc and Chrome (Manifest V3, TypeScript).

- **Brainstorm first:** always apply the [brainstorm skill](.claude/skills/brainstorm/SKILL.md) to every message before acting. If the request is clear, just do it; if not, clear up the ambiguity and get approval before building.
- **Rules:** follow [CONTRIBUTING.md](CONTRIBUTING.md) for commit format, coding rules, design patterns and testing. They override defaults.
- **Plan:** [PLAN.md](PLAN.md) has the architecture and milestones. Tick milestone checkboxes as items are done.
- **Commits:** `<Type>: <subject>` + `Why:` + `What:`, no ticket, **no AI attribution or Co-Authored-By lines**. Never use `--no-verify`.
- **Tests:** every behavior change ships with unit tests, written first. Coverage ≥ 80%.
- **Before saying a change is done:** run `npm run check` and report the result.
