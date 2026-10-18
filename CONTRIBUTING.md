# Contributing

These rules apply to every change, whether a person or an AI assistant writes it. Most of them are enforced by tooling; the rest are checked in review.

## Workflow

1. Create a branch from `main`.
2. Write the test first, then the code (see [Testing](#testing)).
3. Run `npm run check` before pushing. It runs the same gates as CI.
4. Open a pull request. CI must be green before merging.

Git hooks run automatically after `npm install`:

| Hook         | What it runs                                                   |
| ------------ | -------------------------------------------------------------- |
| `pre-commit` | ESLint (with `--fix`) and Prettier on staged files, then `tsc` |
| `commit-msg` | commitlint, which checks the commit format below               |

Never bypass hooks with `--no-verify`. If a hook fails, fix the cause.

## Commit format

```
<Type>: <subject>

Why: <motivation, context and other important details>

What: - <change 1>
- <change 2>
```

Example:

```
Add: count prefix support in the key parser

Why: Vim users expect "5j" to scroll five times. Without counts, every
repeated motion needs one key press per step.

What: - Parse leading digits as a count, except a leading 0.
- Pass the count to commands that declare they accept one.
- Add parser tests for counts, zero, and counts mid-sequence.
```

Rules:

- **Type** is one of `Add`, `Change`, `Fix`, `Refactor`, `Remove`, `Test`, `Docs`, `Style`, `Perf`, `Build`, `CI`, `Chore`. An optional scope goes in brackets: `Fix[hints]: ...`.
- **Title**: 20–80 characters, imperative mood ("add", not "added"), the subject after the colon starts lowercase, no final period.
- **Why**: why the change is needed. Several paragraphs are fine.
- **What**: the changes, as bullet points.
- Every line is 80 characters or less. One blank line between title, Why and What.
- **One logical change per commit.** Split a refactor from a behavior change, and a file move from an edit. Keep tests in the same commit as the code they test.
- **No AI attribution** lines (`Co-Authored-By: Claude`, "Generated with", …).
- Do not amend or force-push commits that are already on a shared branch.

`git commit` without `-m` opens the template in `.gitmessage`.

## Coding rules

### TypeScript

- `strict` mode plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Do not loosen `tsconfig.json`.
- No `any`. Use `unknown` and narrow it.
- No non-null assertions (`value!`). Handle the `undefined` case.
- No `enum`. Use string literal unions with `as const`:

  ```ts
  export const MODES = ['normal', 'insert', 'hint', 'find', 'visual'] as const;
  export type Mode = (typeof MODES)[number];
  ```

- Named exports only, except in entrypoints and config files that require a default export.
- `import type` for type-only imports.
- Prefer `readonly` properties and `ReadonlyArray`/`readonly T[]` for data that should not change.
- Every promise is awaited or explicitly handled. No floating promises.
- Every `switch` over a union is exhaustive. ESLint checks this.

### Design patterns

Use these patterns where they fit. They are the backbone of the architecture in [PLAN.md](PLAN.md).

| Pattern                               | Where                                                            | Rule of thumb                                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **State**                             | Modes (`normal`, `insert`, …)                                    | Each mode is an object with its own key handler. No `if (mode === …)` chains spread across the code.                       |
| **Command**                           | Actions (`scrollDown`, `tabNext`)                                | Each action is a registered command with a name and metadata. Keymaps refer to command names only.                         |
| **Discriminated unions**              | Messages, results, events                                        | A `type` field identifies each variant. Handle them with an exhaustive `switch`.                                           |
| **Dependency injection**              | Anything that touches `chrome.*`, `window`, timers, or the clock | Pass dependencies in as constructor or function parameters, defined as small interfaces. This is what makes code testable. |
| **Functional core, imperative shell** | Parsing, label generation, keymap building                       | Keep logic in pure functions. Keep side effects (DOM, `chrome.*`) in thin outer layers.                                    |
| **Mediator / message router**         | Content script ⇄ service worker                                  | One router maps message types to handlers. Content scripts never call privileged APIs directly.                            |
| **Observer**                          | Settings, DOM changes                                            | Subscribe to `chrome.storage.onChanged` and `MutationObserver` instead of polling.                                         |
| **Factory functions**                 | Creating modes, commands, UI components                          | Prefer `createX(deps)` returning an object over classes with inheritance. Composition over inheritance.                    |

Avoid singletons and module-level mutable state; the MV3 service worker is restarted at any time and loses it.

### Size and complexity limits

ESLint enforces these. If a function goes over, split it.

| Limit                                       | Value                                 |
| ------------------------------------------- | ------------------------------------- |
| Cyclomatic complexity per function          | 10                                    |
| Cognitive complexity per function (SonarJS) | 15                                    |
| Nesting depth                               | 3                                     |
| Parameters per function                     | 4 (use an options object beyond that) |
| Lines per function                          | 60                                    |
| Lines per file                              | 300                                   |

### Security

The content script runs on every website the user visits, so treat every page as hostile.

- Never build HTML from strings. No `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write` with dynamic values; use `textContent` and `createElement`. `eslint-plugin-no-unsanitized` blocks this.
- No `eval`, `new Function`, or string arguments to `setTimeout`.
- Never trust data from the page or from messages. Validate message shape in the router.
- Request the smallest set of permissions in the manifest. Adding a permission needs a reason in the commit's Why.
- Do not add runtime dependencies without discussing it first. Everything we ship runs on every page.

### Style

Prettier formats everything; do not argue with it. Names:

- `camelCase` for variables and functions, `PascalCase` for types, `UPPER_SNAKE_CASE` for module-level constants.
- File names in `kebab-case.ts`.
- Comment _why_, not _what_. Public functions get a short JSDoc comment when the name is not enough.

## Testing

- **Every change in behavior comes with tests.** A PR without tests for new or changed logic is not ready.
- Write the test first when adding new behavior (TDD).
- If you touch code that has no tests, add them.
- Unit tests live next to the code: `key-parser.ts` → `key-parser.test.ts`.
- End-to-end tests live in `tests/e2e/`.
- Coverage must stay at or above **80%** for lines, functions, branches and statements (enforced by Vitest).
- No tautological tests. A test must fail when the behavior it covers breaks. Do not mock the thing under test.
- Fake `chrome.*` and the DOM through injected dependencies instead of global mocks where possible.
- Name tests by behavior: `it('treats a leading 0 as a command, not a count')`.

## Tooling

| Purpose                                 | Tool                                            | Command                                   |
| --------------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| Type checking                           | TypeScript (`tsc`)                              | `npm run typecheck`                       |
| Linting and bug detection               | ESLint + typescript-eslint (strict, type-aware) | `npm run lint`                            |
| Bugs, code smells, cognitive complexity | eslint-plugin-sonarjs                           | part of `npm run lint`                    |
| Cyclomatic complexity and size limits   | ESLint core rules                               | part of `npm run lint`                    |
| DOM injection (XSS)                     | eslint-plugin-no-unsanitized                    | part of `npm run lint`                    |
| Formatting                              | Prettier                                        | `npm run format` / `npm run format:check` |
| Unit tests and coverage                 | Vitest (jsdom, V8 coverage)                     | `npm test` / `npm run test:coverage`      |
| Unused files, exports and dependencies  | Knip                                            | `npm run knip`                            |
| Dependency vulnerabilities              | `npm audit` + Dependabot                        | `npm run audit`                           |
| Static security analysis                | GitHub CodeQL                                   | runs in CI                                |
| Commit format                           | commitlint                                      | `commit-msg` hook and CI                  |
| Git hooks                               | Husky + lint-staged                             | automatic                                 |

`npm run check` runs typecheck, lint, format check, tests with coverage and Knip in one go.
