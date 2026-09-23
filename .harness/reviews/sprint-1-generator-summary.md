# Sprint 1 Generator Summary — Shift Handover Bulk Status Update

## Starting state

The `activities` module already contained a `bulkStatus` implementation and partial test coverage from prior work. Rather than re-implement from scratch, Generator audited the existing code line-by-line against every AC in `sprint-1-contract.md`, fixed the one defect found, and closed test-coverage gaps against the contract.

## Defect found and fixed

**Double event emission (violated AC-07).** `ActivitiesService.bulkStatus` called `this.update(id, { status })` to persist each successful item. `update()` independently emits `ACTIVITY_STATUS_CHANGED` via its own `emitStatusEvent` helper whenever the status changes. `bulkStatus` then emitted `ACTIVITY_STATUS_CHANGED` a second time with a different payload shape (`actorId` instead of `storeId`). Every successful bulk item therefore fired two inconsistent events instead of one.

**Fix** (`src/activities/activities.service.ts`): `bulkStatus` now persists via `this.repo.save(...)` directly instead of routing through the public `update()` method, and emits `ACTIVITY_STATUS_CHANGED` exactly once per successful item with the `actorId` payload. The single-item `PATCH /:id` path (`update()`/`emitStatusEvent`) is untouched — it is out of scope for this sprint and its existing tests still pass unchanged.

## Acceptance criteria — evidence

| AC | Status | Evidence |
|---|---|---|
| AC-01 Successful bulk update | PASS | New service test `updates every id when all are valid and authorized`; new route test `updates every activity when the whole bulk batch is valid` |
| AC-02 Invalid target status rejected | PASS | Existing service test `rejects invalid bulk input`; new route test `rejects a bulk request with an invalid target status` asserts `400` / `INVALID_BULK_STATUS` |
| AC-03 Empty/malformed ids rejected | PASS | Extended service test `rejects invalid bulk input` (added non-array case); new route test `rejects a bulk request with an empty id list` asserts `400` / `INVALID_ACTIVITY_IDS` |
| AC-04 Partial failure on unknown id | PASS | Existing service test `performs bulk updates with partial failures and audits`; existing route test `supports bulk status with partial failure` |
| AC-05 Partial failure on unauthorized actor | PASS | New service test `fails unauthorized items independently without blocking authorized ones` — asserts `FORBIDDEN` on the unauthorized id, `updated` on the authorized id, and that the unauthorized activity's status did not change |
| AC-06 Audit trail on success only | PASS | New service test `creates no audit entry for a failed item in a mixed batch` — asserts audit count is 1 and no audit references the failed id |
| AC-07 Event-driven side effect, no sibling coupling | PASS (defect fixed) | New service test `emits exactly one ACTIVITY_STATUS_CHANGED event per successful item` (2 successes + 1 failure → exactly 2 events); `npm run arch:check` confirms zero cross-module imports and no direct `AlertsService`/`ReportsService` import from `activities/*` |
| AC-08 Layering and error contract | PASS | Manual inspection: `activities.routes.ts` only parses request/response; all business rules in `activities.service.ts`; `grep` for `throw new Error` in `src/activities` returns no matches; `arch:check` rule `routes-do-not-import-repositories` passes |
| AC-09 Response contract stability | PASS | Route tests assert `{ updated, failed }` shape for both all-success and mixed-result batches |
| AC-10 Automated verification thresholds | PASS | See command results below |

## Automated command results

```
npm run typecheck   -> 0 errors
npm run lint         -> 0 errors, 5 pre-existing no-console warnings (unrelated files: scripts/evaluate-harness.ts, src/server.ts)
npm run arch:check   -> no dependency violations found (18 modules, 18 dependencies cruised)
npm run test:coverage -> 10 suites passed, 26 tests passed, 0 failed
```

Coverage (relevant to StoreOps thresholds):
- `activities.service.ts`: 97.82% stmts / 97.43% lines (threshold: service >=80%) — PASS
- `activities.routes.ts`: 85.18% stmts / 94.44% lines (threshold: route >=70%) — PASS
- Overall: 95.37% stmts / 97.72% lines (threshold: overall >=70%) — PASS

## Files changed

- `src/activities/activities.service.ts` — fixed double event emission in `bulkStatus` (see defect above); no public API/signature change.
- `tests/activities/activities.service.test.ts` — added tests for AC-01 (all-success), AC-03 (non-array ids), AC-05 (unauthorized partial failure), AC-06 (no audit on failure), AC-07 (single-emission regression test).
- `tests/activities/activities.routes.test.ts` — added integration tests for AC-01 (all-success shape), AC-02 (400 on invalid status), AC-03 (400 on empty ids).

## Known gaps

None blocking. Two items are explicitly out of scope per `spec.md` and unaffected by this sprint:
- Alert content/delivery triggered by the `ACTIVITY_STATUS_CHANGED` subscription in `src/app.ts` was not modified or re-verified beyond confirming the event still fires with the same `taskId`/`status` payload keys the existing subscriber reads.
- No transactional rollback across a batch — consistent with the accepted in-memory-persistence assumption (StoreOps hard rule 6); a process crash mid-batch would leave prior successful items persisted, which matches the documented partial-failure model.
