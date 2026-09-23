# StoreOps Planner Specification — Sprint 1

STATUS: APPROVED

## Feature

Shift handover bulk status update for activities — `PATCH /api/activities/bulk-status`.

## Intent

Allow outgoing shift staff to mark multiple operational activities as `DONE` or `BLOCKED` in a single request, so a handover does not require one HTTP call per activity. Each activity in the batch is evaluated independently: one invalid, missing, or unauthorized activity must not prevent the rest of the batch from succeeding. Every successful update produces exactly one audit entry and one `ACTIVITY_STATUS_CHANGED` event; failures never touch persistence, the audit log, or the event bus.

## Scope

In scope:
- `PATCH /api/activities/bulk-status` request handling in `src/activities/activities.routes.ts`.
- Bulk orchestration logic in `src/activities/activities.service.ts` (per-item validation, authorization, persistence, audit, event emission).
- Audit persistence via `ActivitiesRepository.addAudit` in `src/activities/activities.repository.ts`.
- Unit tests (service) and integration tests (route) under `tests/activities/`.

Out of scope:
- Notification/report rendering of the resulting alert — `alerts` already subscribes to `ACTIVITY_STATUS_CHANGED` in `src/app.ts` and is a consumer only; this sprint does not change alert content or delivery.
- Authentication — actor identity continues to arrive via the existing `x-user-id` header convention used by the rest of the activities router.
- Multi-status batches (e.g. mixing `DONE` and `BLOCKED` targets in one request) — a single request targets one status for the whole batch, matching PROMPT.md.

## Affected modules

- **activities** (primary): routes, service, repository.
- **shared/events** (EventBus): consumed, not modified — emission only.
- **shared/errors** (AppError): consumed, not modified.
- **alerts** (indirect): existing subscriber to `ACTIVITY_STATUS_CHANGED`; no changes required, no direct coupling permitted.

## Assumptions

1. Actor identity is passed via the `x-user-id` request header, consistent with the existing single-item `PATCH /:id` and `DELETE /:id` routes.
2. Authorization rule for bulk updates mirrors existing per-activity rules: the actor must be the activity's `assigneeId` or `ownerId`, or hold the `store-manager-1` role identity, otherwise the item fails with `FORBIDDEN` rather than aborting the batch.
3. "Invalid/missing/unauthorized" activities (PROMPT.md requirement 3) map to three distinct per-item failure codes: `ACTIVITY_NOT_FOUND` (missing), `FORBIDDEN` (unauthorized), and the request-level `INVALID_BULK_STATUS` / `INVALID_ACTIVITY_IDS` for malformed input that applies to the whole request rather than one item.
4. The endpoint returns HTTP 200 with a structured `{ updated, failed }` body when the request itself is well-formed, even if individual items fail — a partial failure is not a transport-level error. Malformed request-level input (bad status enum, empty/non-array ids) is rejected before any processing, as an `AppError`.
5. In-memory persistence (per StoreOps hard rule 6) is sufficient; no transactional rollback mechanism is required or expected across the batch.

## Acceptance criteria

### AC-01 — Successful bulk update
GIVEN two existing activities both assigned to (or owned by) the authenticated actor
WHEN `PATCH /api/activities/bulk-status` is called with both IDs and `status: "DONE"`
THEN the response has HTTP 200, both activities are persisted with `status: "DONE"`, and both IDs appear in `response.body.updated`.

### AC-02 — Invalid target status rejected
GIVEN a request body with a `status` value other than `DONE` or `BLOCKED`
WHEN the endpoint is called
THEN the request is rejected with `AppError` code `INVALID_BULK_STATUS`, HTTP 400, and no activity in the payload is modified.

### AC-03 — Empty or malformed id list rejected
GIVEN a request body with an empty `ids` array or a non-array `ids` value
WHEN the endpoint is called
THEN the request is rejected with `AppError` code `INVALID_ACTIVITY_IDS`, HTTP 400, before any per-item processing occurs.

### AC-04 — Partial failure on unknown id
GIVEN one existing activity ID and one unknown activity ID in the same request
WHEN `PATCH /api/activities/bulk-status` is called with both
THEN the existing activity is updated and its ID appears in `updated`, the unknown ID appears in `failed` with code `ACTIVITY_NOT_FOUND`, and the response is still HTTP 200 (no rollback of the successful item).

### AC-05 — Partial failure on unauthorized actor
GIVEN a batch containing one activity the actor is authorized to change and one activity owned/assigned to a different actor
WHEN the actor (who is not `store-manager-1`) submits the bulk request
THEN the authorized activity is updated and included in `updated`, the unauthorized activity's ID appears in `failed` with code `FORBIDDEN`, and processing of the authorized item is unaffected by the failure.

### AC-06 — Audit trail on success only
GIVEN a bulk request containing both a successful and a failing item
WHEN the operation completes
THEN exactly one `AuditEntry` exists (`repo.audits()`) for the successful `taskId`/`actorId` pair, and no audit entry is created for the failing item.

### AC-07 — Event-driven side effect, no sibling coupling
GIVEN an activity is successfully changed to `BLOCKED` (or `DONE`) as part of a bulk request
WHEN the service completes that item's update
THEN exactly one `ACTIVITY_STATUS_CHANGED` event is emitted via `EventBus.emit` per successful item, and `src/activities/*` contains no direct import of `AlertsService`, `ReportsService`, or any sibling module's repository.

### AC-08 — Layering and error contract
GIVEN the generated/changed source for this feature
WHEN the code is inspected
THEN `activities.routes.ts` contains only HTTP request/response translation (no business rule evaluation), all business logic lives in `activities.service.ts`, all domain error paths use `AppError(code, message, statusCode)`, and no `throw new Error(...)` appears in the routes or service layer.

### AC-09 — Response contract stability
GIVEN any well-formed bulk request (request-level validation passes)
WHEN the response is returned
THEN the JSON body always has the shape `{ updated: string[], failed: Array<{ id: string; code: string; message: string }> }`, regardless of how many items succeed or fail.

### AC-10 — Automated verification thresholds
GIVEN the completed implementation and its tests
WHEN `npm run typecheck && npm run lint && npm run arch:check && npm run test:coverage` is executed
THEN all four commands exit zero, service-layer coverage is >=80%, route-layer coverage is >=70%, and overall coverage is >=70%, matching the StoreOps hard gates.

## Verification plan

1. `npm run typecheck` — zero TypeScript errors under strict mode.
2. `npm run lint` — zero ESLint errors.
3. `npm run arch:check` — zero cross-module repository imports; activities module does not import alerts/reports/programmes/staff repositories.
4. `npm run test:coverage` — Jest zero failing tests; coverage thresholds per AC-10.
5. Manual/integration trace: one request mixing a valid, a missing, and an unauthorized ID exercises AC-01, AC-04, AC-05, AC-06, AC-07, AC-09 in a single assertion pass.
