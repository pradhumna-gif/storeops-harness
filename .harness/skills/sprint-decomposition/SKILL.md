# Sprint Decomposition — Planner Skill

## Purpose
How the Planner turns a StoreOps feature request into sprint contracts that a Generator can implement and an Evaluator can judge without interpretation.

## Sprint sizing rules
A sprint is **one vertical slice through one owning module**: route + service + repository + tests. Split into more sprints when any of these is true:
1. The feature touches **more than one owning module's write path**, for example activities *and* a new reports repository. Each owning module gets its own sprint, and sprint N+1 consumes sprint N's event.
2. It adds a **new EventBus event type** *and* a new consumer. The producer (emits, with a test that asserts the emit) comes first, then the consumer.
3. The contract would have more than about 10 ACs, or more than about 6 changed source files. At that size the Evaluator's context and the Generator's retry loop get too large (see the CLAUDE.md token budget).

Do **not** split along layers ("sprint 1 = routes, sprint 2 = service"). A routes-only sprint can't pass the business-rule tests, so it can never reach PASS.

Worked example: *shift handover bulk update* is **one sprint**. It is one owning module (activities), it reuses the existing `ACTIVITY_STATUS_CHANGED` event and the existing alerts consumer, and it has 10 ACs. *Regional rollup report with a REGIONAL_ROLLUP record* would be **two sprints**: (1) the read-only aggregation endpoint through the activities/programmes service readers, and (2) a reports-owned repository plus an event subscriber.

## Contract template (`sprint-N-contract.md`)
```
# Sprint N Contract — <feature>
STATUS: AWAITING APPROVAL
## Intent                one paragraph, the retail user outcome
## Carry-over from sprint N-1   ≤5 bullets (omit for sprint 1)
## Affected module(s)    owning module + consumed shared pieces + indirect consumers
## API surface           method, path, request/response JSON, status codes, error codes
## Business rules        numbered, each testable
## Dependencies          existing interfaces used; "no new npm packages" unless justified
## Acceptance criteria   AC IDs (full text in spec.md)
## Tests                 unit vs integration, mapped to AC IDs
## Architecture gates    which of rules 1–6 are at risk in this sprint and how to check
## Definition of done    the four npm commands + generator-summary requirements
```

## Acceptance criterion rules
- Use the form **GIVEN** a concrete state (seed IDs, actor) / **WHEN** one action (HTTP call or service method) / **THEN** observable results.
- A THEN must name at least one of these: a response field or value, persisted entity state, an `AuditEntry`, an emitted event with its count, or an `AppError` code plus status.
- Banned words in a THEN: "works", "correctly", "properly", "appropriate", "robust", "as expected". None of them can be tested.
- Every failure path names its `AppError` code, for example `ACTIVITY_NOT_FOUND 404` or `FORBIDDEN 403`.
- Include at least one AC for each at-risk architecture rule, for example "exactly one `ACTIVITY_STATUS_CHANGED` per success; no import of AlertsService from `src/activities/*`".
- Include one "automated thresholds" AC: the four commands exit 0, and the coverage numbers are met.

Good: *GIVEN task-1 owned by associate-1 and an unknown id "missing", WHEN associate-1 sends PATCH /api/activities/bulk-status {ids:["task-1","missing"],status:"DONE"}, THEN HTTP 200, `updated` = ["task-1"], `failed[0]` = {id:"missing",code:"ACTIVITY_NOT_FOUND"}, and task-1 is persisted with status DONE.*
Bad: *Bulk update handles errors correctly.*
