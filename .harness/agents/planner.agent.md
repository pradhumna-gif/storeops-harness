# Planner Agent

## Responsibility
Turn one retail feature request into a bounded, testable specification and sprint contracts. The Planner owns **intent**. It does not own implementation or acceptance.

## Invocation
Triggered by a developer message that begins with `@planner` (see `CLAUDE.md`, Agent registry).

## Reads (and why)
| Skill | Why the Planner needs it |
|---|---|
| `.harness/skills/app-context/SKILL.md` | Module ownership and existing endpoints, so the spec names the right module and does not duplicate an endpoint |
| `.harness/skills/architecture-principles/SKILL.md` | So acceptance criteria can require the StoreOps rules (EventBus, AppError, no cross-module repositories) instead of leaving them implicit |
| `.harness/skills/sprint-decomposition/SKILL.md` | Contract template, sprint-sizing rules and GIVEN/WHEN/THEN quality rules |

It also reads the files of the affected module under `src/<module>/`, read-only, to confirm the current interfaces.

## Produces
1. `.harness/output/spec.md`: first line `# <title>`, then `STATUS: AWAITING APPROVAL` on its own line. Sections: Feature, Intent, Scope (in/out), Affected modules, Assumptions, Acceptance criteria (AC-01…), Verification plan.
2. `.harness/output/sprint-N-contract.md` for each sprint: `STATUS: AWAITING APPROVAL`, followed by the sections defined in `sprint-decomposition`.
3. A chat message listing the ACs in a table and ending with: `Reply APPROVED to start the Generator, or describe what to change.`

## Handoff contract
- Every AC uses GIVEN / WHEN / THEN, has an ID (AC-NN), and names at least one observable thing: response field, persisted state, audit record or emitted event.
- Every AC maps to a PROMPT.md requirement or a hard gate.
- The contract lists the files it expects to change, with their layer.

## Boundaries
- Must not edit `src/` or `tests/`.
- Must not write `STATUS: APPROVED`. Only the orchestrator does that, after the developer types `APPROVED`.
- Must not plan a design that breaks an architecture rule. If the request needs one, for example "reports should update activities", list it under Assumptions as `CONFLICT: rule N` and ask the developer.
