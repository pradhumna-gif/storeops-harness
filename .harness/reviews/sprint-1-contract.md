# Sprint 1 Contract — Shift Handover Bulk Status Update

STATUS: APPROVED

## Intent

Implement `PATCH /api/activities/bulk-status` end-to-end (route, service, repository, tests) so outgoing shift staff can update multiple activities to `DONE` or `BLOCKED` in one request, with independent per-item processing, structured partial-failure reporting, one audit entry per success, and an `ACTIVITY_STATUS_CHANGED` event per success — all within the existing Routes → Service → Repository layering and EventBus boundary.

## Affected module(s)

- `activities` (primary: routes, service, repository)
- `shared/events` (EventBus — consumed only)
- `shared/errors` (AppError — consumed only)
- `alerts` (indirect consumer of the emitted event; no changes in scope)

## API surface

`PATCH /api/activities/bulk-status`

Request body:
```json
{ "ids": ["task-1", "task-2"], "status": "DONE" }
```

Response body (HTTP 200 for any well-formed request):
```json
{
  "updated": ["task-1"],
  "failed": [{ "id": "task-2", "code": "ACTIVITY_NOT_FOUND", "message": "Activity task-2 was not found" }]
}
```

Request-level rejection (HTTP 400, `AppError`):
- `INVALID_ACTIVITY_IDS` — `ids` missing, not an array, or empty.
- `INVALID_BULK_STATUS` — `status` not one of `DONE`, `BLOCKED`.

Per-item failure codes (HTTP 200, item listed in `failed`):
- `ACTIVITY_NOT_FOUND` — id does not resolve to an existing activity.
- `FORBIDDEN` — actor is not the activity's `assigneeId`/`ownerId` and is not `store-manager-1`.

Actor identity: `x-user-id` request header, same convention as the existing `PATCH /:id` and `DELETE /:id` routes.

## Business rules

1. Request-level validation runs before any per-item processing: reject the whole request on invalid `status` or empty/malformed `ids`.
2. Each id is then processed independently: a failure for one id must not prevent, undo, or block processing of any other id in the same request.
3. An item fails with `ACTIVITY_NOT_FOUND` if no activity exists for the id, or `FORBIDDEN` if the actor is not authorized for that specific activity.
4. On a per-item success: persist the new status, append exactly one `AuditEntry` (`taskId`, `actorId`, action reflecting the new status, timestamp), then emit `ACTIVITY_STATUS_CHANGED` via `EventBus.emit`.
5. On a per-item failure: no persistence change, no audit entry, no event emission for that id.
6. The response always reports both `updated` and `failed` arrays, even when one is empty.

## Dependencies

- `ActivitiesRepository` (existing interface: `findById`, `save`, `addAudit`, `audits`) — no interface changes expected.
- `EventBus.emit` (existing, untyped payload `Record<string, unknown>`).
- `AppError` (existing `code`/`message`/`statusCode` contract).
- No new npm packages.

## Acceptance criteria

(Full GIVEN/WHEN/THEN text is authoritative in `spec.md`; referenced here by ID.)

- AC-01: successful bulk update — both valid activities reach `DONE`/`BLOCKED`, both IDs in `updated`.
- AC-02: invalid target status is rejected at the request level with `AppError INVALID_BULK_STATUS`.
- AC-03: empty/malformed `ids` rejected at the request level with `AppError INVALID_ACTIVITY_IDS`.
- AC-04: unknown id in a batch fails independently with `ACTIVITY_NOT_FOUND`; valid sibling id still succeeds.
- AC-05: unauthorized id in a batch fails independently with `FORBIDDEN`; authorized sibling id still succeeds.
- AC-06: exactly one audit entry per successful item, none for failed items.
- AC-07: exactly one `ACTIVITY_STATUS_CHANGED` event per successful item; no direct sibling-module coupling.
- AC-08: routes contain only HTTP translation, service owns business rules, `AppError` only (no raw `Error` in routes/service).
- AC-09: response body always shapes as `{ updated: string[], failed: Array<{id, code, message}> }`.
- AC-10: typecheck/lint/arch-check/test-coverage all pass at StoreOps thresholds (service >=80%, routes >=70%, overall >=70%).

## Tests

- **Unit (service)**: request-level rejection (AC-02, AC-03); partial failure on unknown id (AC-04); partial failure on unauthorized actor (AC-05); audit entry count and content on mixed success/failure (AC-06); event emission count and non-emission on failure (AC-07).
- **Integration (route, supertest)**: end-to-end mixed-batch request asserting response shape and status codes (AC-01, AC-04, AC-09); request-level 400 for invalid status/ids (AC-02, AC-03).
- Tests must assert business-rule outcomes (audit count, event payload, `failed[].code`) — not HTTP status codes alone, per `how-to-test`.

## Architecture gates

- No import of `alerts`, `reports`, `programmes`, or `staff` repositories from `activities/*`.
- No direct import of `AlertsService`/`ReportsService`/`NotificationService` from `activities/*`; cross-module effect is EventBus-only.
- No `throw new Error(...)` in `activities.routes.ts` or `activities.service.ts`.
- `activities.repository.ts` performs no HTTP calls and owns no business rules.
- `reports` module remains read-only and is untouched by this sprint.

## Definition of done

- TypeScript strict mode passes (`npm run typecheck`).
- ESLint passes with zero errors (`npm run lint`).
- Dependency boundary check passes (`npm run arch:check`).
- Jest passes with zero failing tests and meets coverage thresholds (`npm run test:coverage`).
- Integration test demonstrates the endpoint against a running Express app (supertest).
- `generator-summary.md` records PASS/FAIL evidence for every AC-01 through AC-10, changed files, and command output.
