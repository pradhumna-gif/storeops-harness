# Architecture Principles — StoreOps Hard Rules

## Purpose
Shared by Planner, Generator and Evaluator. These are the six non-negotiable rules. Each one traces to a failure mode (F1–F4) that the client's standards team saw in an earlier AI-coding experiment. The Generator reads them *before* writing code, and the Evaluator enforces the same text. Every rule has a check ID used in `evaluation-criteria`.

---

### Rule 1: Routes → Service → Repository (check A1, LLM-assessed)
- A **route** (`*.routes.ts`) parses `req.body`, `req.params`, `req.query` and headers, calls **one** service method, and maps the result or `AppError` to HTTP. It contains no `if` on domain state, no loops over entities and no authorization logic.
- A **service** (`*.service.ts`) owns validation of domain values, authorization, state transitions, audit creation and event emission.
- A **repository** (`*.repository.ts`) stores and retrieves entities. It has no HTTP, no EventBus, no AppError and no business rules.
- Violation example: checking `task.ownerId !== actorId` inside `activities.routes.ts`.

### Rule 2: No cross-module repository imports (HG4, automated) · F1
- `src/<a>/**` must never import `src/<b>/*.repository.ts`, including **type-only** imports.
- A cross-module *read* depends on the other module's **service**, preferably narrowed with `Pick<>`. For example: `type ActivitiesReader = Pick<ActivitiesService, 'list'>` in `reports.service.ts`.
- Enforced by `.dependency-cruiser.cjs` rule `no-<module>-cross-module-repository-imports`, with `tsPreCompilationDeps: true`.
- What breaks without it: reports or alerts become coupled to the activities storage format, so a repository refactor breaks three modules, and writes can bypass the activities audit trail.

### Rule 3: Cross-module side effects only through EventBus (HG6, automated + LLM) · F4
- A state change that another module must react to is published with `this.eventBus.emit('<EVENT_TYPE>', payload)` from the **owning service**, after the state is persisted.
- Registered event types:

| Event | Emitted by | Payload | Consumer (wired in `src/app.ts`) |
|---|---|---|---|
| `ACTIVITY_STATUS_CHANGED` | `ActivitiesService.update`, `ActivitiesService.bulkStatus` | `{ taskId, status, actorId? , storeId? }` | alerts: creates a `SHIFT_HANDOVER` alert for `lead-1` when status is `BLOCKED` |

- New events must be added to this table in the same sprint.
- **Prohibited:** importing `AlertsService`, `NotificationService` or `ReportsService` into activities, programmes or staff, or calling another module's repository to "notify" it. Enforced by the dependency-cruiser rule `no-direct-alerts-or-reports-service-coupling` and the `evaluate-harness.ts` scan.
- Exactly one emit per successful state change. A double emit is a Functional Correctness failure (sprint-1 defect).

### Rule 4: AppError only in services and routes (HG5, automated) · F2
- Throw `new AppError(CODE, message, statusCode)` from `src/shared/errors/AppError.ts`. `throw new Error(...)` in a `*.service.ts` or `*.routes.ts` file fails a hard gate.
- Routes catch `AppError` and respond with `res.status(e.statusCode).json({ code: e.code, message: e.message })`. Anything else becomes `500 { code: 'INTERNAL_ERROR' }`, and internals are never leaked.

### Rule 5: Reports are read-only (check R1, automated scan + LLM)
- `src/reports/**` calls only query methods (`list`, `get`, `find*`) on injected readers. It never calls `save`, `add`, `addAudit`, `delete`, `update`, `create` or `bulkStatus`.
- A report that needs to be persisted, for example `REGIONAL_ROLLUP`, is triggered by an event and stored in a future reports-owned repository. It is never written into activities, programmes or staff.

### Rule 6: In-memory persistence
New storage is an `InMemory*Repository` that implements an exported interface. Services depend on the interface, so a database can be swapped in later without changing services.

---
**Circular imports** are also rejected (`no-circular`). `src/shared/**` must not import from any module.
