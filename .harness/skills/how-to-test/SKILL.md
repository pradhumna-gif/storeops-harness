# How to Test — StoreOps (Generator Skill)

## Purpose
This skill targets failure mode **F3**: tests that assert HTTP status codes but never check the business rule. It defines where tests go, what a StoreOps test must assert, and the gates it must meet.

## Commands (all must exit 0 before handoff)
```bash
npm run typecheck      # tsc --noEmit (strict), includes tests/
npm run lint           # eslint .
npm run arch:check     # dependency-cruiser, tsPreCompilationDeps
npm run test:coverage  # jest --coverage --runInBand; thresholds in jest.config.js
```

## Coverage gates (enforced per file by jest.config.js)
| Scope | Glob | Line threshold |
|---|---|---|
| Service layer | `src/**/*.service.ts` | ≥ 80% each file |
| Route layer | `src/**/*.routes.ts` | ≥ 70% each file |
| Shared utilities | `src/shared/**/*.ts` | ≥ 60% each file |
| Overall | `src/**/*.ts` excluding `server.ts` | ≥ 70% |

## Layout
- **Service unit tests:** `tests/<module>/<module>.service.test.ts`. Build the real `InMemory*Repository` with inline seed data and a real `EventBus`, and subscribe to capture events. Don't mock the repository, because in-memory storage is fast and catches more.
- **Route integration tests:** `tests/<module>/<module>.routes.test.ts`. Use `request(createApp())`, with a new app per test (the seed data is re-created each time). Use the seed IDs `task-1`, `task-2`, `task-3` and actors `associate-1`, `lead-1`, `store-manager-1`.
- **Repository tests** only cover filter logic.

## Mandatory assertion patterns
Every AC test asserts at least one business outcome in addition to the status code:

| What the AC promises | Assert |
|---|---|
| State change | `expect(service.get('t1').status).toBe('DONE')` |
| No change on failure | `expect(service.get('t2').status).toBe('TODO')` |
| Partial failure | `expect(result.failed).toEqual([{ id: 't2', code: 'FORBIDDEN', message: 'Actor cannot update activity t2' }])` |
| Audit | `expect(repo.audits()).toHaveLength(1); expect(audits[0].taskId).toBe('t1')` and no entry for the failed id |
| Event | `bus.subscribe('ACTIVITY_STATUS_CHANGED', e => events.push(e.payload))`, then `expect(events).toHaveLength(<successes>)`. Assert the **exact** count, never `toContain`/`>0` |
| Error contract (route) | `expect(res.status).toBe(400); expect(res.body.code).toBe('INVALID_BULK_STATUS')` |
| Read-only | snapshot `JSON.stringify(repo.list())` before and after the call, and `repo.audits()` length unchanged |

A test that checks only `response.status` is scored as **T2 = FAIL** by the Evaluator.

## Bulk-status test matrix (sprint 1 reference)
All succeed (AC-01) · invalid status (AC-02) · empty and non-array ids (AC-03) · unknown id plus a valid one (AC-04) · unauthorized plus authorized (AC-05) · audit only on success (AC-06) · exactly N events for N successes (AC-07) · response shape on all-success and mixed batches (AC-09).

## Test naming
Use `it('<does what> when <condition>')` in present tense and put the AC ID in the summary table. Test names are quoted as evidence in `generator-summary.md`.
