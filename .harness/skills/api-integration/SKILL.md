# API Integration — StoreOps HTTP Contracts (Generator Skill)

## Purpose
The external contract of every StoreOps endpoint, so new endpoints are consistent with it and existing clients don't break.

## Conventions for every endpoint
- JSON in and JSON out (`express.json()` in `app.ts`). The success body is the resource, or a result object. It is never wrapped in `{ data: … }`.
- Error body: `{ "code": "<APP_ERROR_CODE>", "message": "<human text>" }`, with the HTTP status taken from `AppError.statusCode`.
- Status codes: 200 for a read, update or batch result · 201 for a create · 204 for a delete · 400 for validation · 403 for authorization · 404 for not found · 500 for `INTERNAL_ERROR` only.
- Actor: the `x-user-id` header, default `associate-1`. Store: `x-store-id`, default `store-1`. Authentication is out of scope for the capstone.
- A partial failure inside a well-formed batch is **200** with per-item failures listed. It is not a 207 and not a 4xx.

## Endpoint inventory
| Method + path | Body / query | Success | Errors |
|---|---|---|---|
| GET `/api/activities` | `?programmeId=&status=` | 200 `Task[]` | — |
| POST `/api/activities` | `{title, priority, category, assigneeId, ownerId, storeId, programmeId?, dueDate?}` | 201 `Task` (status `TODO`) | 400 `INVALID_TITLE` |
| GET `/api/activities/:id` | — | 200 `Task` | 404 `ACTIVITY_NOT_FOUND` |
| PATCH `/api/activities/:id` | `{status?, priority?, category?, assigneeId?}` | 200 `Task`; emits `ACTIVITY_STATUS_CHANGED` if status changes to DONE/BLOCKED | 404 |
| DELETE `/api/activities/:id` | header `x-user-id` | 204 | 403 `FORBIDDEN`, 404 |
| **PATCH `/api/activities/bulk-status`** | `{ ids: string[], status: "DONE" \| "BLOCKED" }` + `x-user-id` | 200 `{ updated: string[], failed: {id, code, message}[] }` | 400 `INVALID_ACTIVITY_IDS`, 400 `INVALID_BULK_STATUS` |
| GET `/api/programmes` | header `x-store-id` | 200 `Project[]` | — |
| POST `/api/programmes` | `{name}` | 201 `Project` (status `PLANNED`) | 400 `INVALID_NAME` |
| POST `/api/programmes/:id/members` | `{userId}` | 201 `Project` | 404 `PROGRAMME_NOT_FOUND`, 400 `INVALID_MEMBER` |
| GET `/api/alerts` | header `x-user-id` | 200 `Notification[]` | — |
| GET `/api/reports/region/:id` | — | 200 `{regionId, totalTasks, completionRate, overdueCount, blockedTasks}` | — |
| GET `/health` | — | 200 `{status:"UP", service:"StoreOps"}` | — |

## Bulk-status contract detail (sprint 1)
Example request: `PATCH /api/activities/bulk-status`, `x-user-id: associate-1`, body `{"ids":["task-1","task-2","missing"],"status":"BLOCKED"}`
```json
{ "updated": ["task-1"],
  "failed": [ { "id": "task-2", "code": "FORBIDDEN", "message": "Actor cannot update activity task-2" },
              { "id": "missing", "code": "ACTIVITY_NOT_FOUND", "message": "Activity missing was not found" } ] }
```
Side effects of each `updated` id: the Task is persisted with the new status and a new `updatedAt`. One `AuditEntry {taskId, action: "STATUS_<status>", actorId, timestamp}` is created. One `ACTIVITY_STATUS_CHANGED {taskId, status, actorId}` event is emitted. If the status is BLOCKED, alerts creates a `SHIFT_HANDOVER` notification for `lead-1`. Items in `failed` have **no** side effects.

## Event payload contract
Consumers must read only `taskId` and `status`, which are always present. `actorId` (bulk path) and `storeId` (single-item path) are optional. Unifying them is an open non-blocking item from the sprint-1 Evaluator.

## Adding an endpoint
Add a row to the inventory above, put the literal route before `/:id`, add a supertest test that asserts the body and a side effect (not just the status code), and list the endpoint in `generator-summary.md`.
