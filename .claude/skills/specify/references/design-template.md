# design.md template

Copy this shape. Drop sections that truly don't apply; don't pad.

````markdown
# <Feature name> — Design

**Status:** Draft | Approved (YYYY-MM-DD)
**Requirements:** [requirements.md](requirements.md)

## Overview

<One paragraph: the approach in plain words, and how it fits the existing
architecture in PLAN.md.>

## Architecture

<Where the feature lives (folders/modules from PLAN.md), what it talks to,
and the flow of a typical interaction. A small diagram (mermaid or ASCII)
helps when there are more than two moving parts.>

## Components and interfaces

### <Component name> (→ R1.1, R1.2)

<Responsibility in one or two sentences.>

```ts
// Types and signatures other parts depend on. No bodies.
```

## Data and state

<State the feature keeps, where it lives (content script, service worker,
storage), its lifetime, and what resets it.>

## Error handling

| Situation (→ criterion)  | Handling            |
| ------------------------ | ------------------- |
| <R1.3: no visible links> | <concrete behavior> |

## Testing strategy

<Which criteria are covered by unit tests (pure logic, written first), which
need DOM or end-to-end tests, and anything hard to test and how you'll
handle it. Respect the project's coverage target.>

## Decisions and trade-offs

- **<Decision>:** chose <X> over <Y, Z> because <reason>.

## Requirements coverage

| Criterion | Design element         | Test                        |
| --------- | ---------------------- | --------------------------- |
| R1.1      | <component / function> | <test file or e2e scenario> |

## Open questions

- <Anything the builder should confirm, or "None".>
````
