# App Context — StoreOps

## Purpose
Shared by **all four agents**. It covers what StoreOps is, who owns what, and the facts an agent needs to avoid guessing. It is kept to about one page on purpose, because every agent invocation loads it.

## Domain
StoreOps is a REST API for retail store operations. Store teams run **programmes** (seasonal rollouts, compliance drives, refits), assign and track operational **activities** (restocking runs, planogram resets, audits, compliance checks), coordinate **staff**, receive **alerts**, and read **reports** by store and region.

## Stack (Node.js, Option A)
TypeScript 5.x `strict` · Express 4.x · Jest 29 + ts-jest + Supertest · ESLint 9 + @typescript-eslint · dependency-cruiser 16 · Node 20 · Docker. Persistence is in-memory (`Map`/arrays inside `InMemory*Repository`). There is no database.

## Module ownership
| Module | Folder | Owns (types in `src/shared/types/domain.ts`) | Layers present | Public surface |
|---|---|---|---|---|
| activities | `src/activities/` | `Task`, `TaskStatus` (TODO/IN_PROGRESS/DONE/BLOCKED), `TaskPriority` (LOW/MEDIUM/HIGH/CRITICAL), `TaskCategory` (RESTOCKING/PLANOGRAM/AUDIT/COMPLIANCE/GENERAL), `AuditEntry` | routes, service, repository | `/api/activities/*`; emits `ACTIVITY_STATUS_CHANGED` |
| programmes | `src/programmes/` | `Project` (PLANNED/ACTIVE/CLOSED), `memberIds` | routes, service, repository | `/api/programmes/*` |
| staff | `src/staff/` | `User`, role REGIONAL_MANAGER / STORE_MANAGER / DEPARTMENT_LEAD / ASSOCIATE | service, repository (auth-only, no routes) | `StaffService.get(id)`, read-only for other modules |
| alerts | `src/alerts/` | `Notification`, type INVENTORY / SLA_BREACH / SHIFT_HANDOVER / ESCALATION, channel IN_APP / EMAIL | routes, service, repository | `/api/alerts`; **consumer** of events |
| reports | `src/reports/` | report projections (no stored entity yet) | routes, service (no repository) | `/api/reports/region/:id`; **read-only** |
| shared | `src/shared/` | `AppError`, `EventBus`, domain types | — | imported by everyone; imports nothing from modules |

`src/app.ts` is the **composition root**. It is the only file that creates repositories and services, injects them, and registers EventBus subscribers.

## Endpoints
The base nine: `GET/POST /api/activities`, `GET/PATCH/DELETE /api/activities/:id`, `GET/POST /api/programmes`, `POST /api/programmes/:id/members`, `GET /api/alerts`. Added by features: `PATCH /api/activities/bulk-status` (sprint 1) and `GET /api/reports/region/:id`. `GET /health` is for liveness.

## Identity (capstone simplification)
The actor comes from the `x-user-id` header and defaults to `associate-1`. The store comes from `x-store-id` and defaults to `store-1`. Seeded users: `associate-1` (ASSOCIATE), `lead-1` (DEPARTMENT_LEAD), `store-manager-1` (STORE_MANAGER). Seeded tasks: `task-1` (associate-1, TODO), `task-2` (lead-1, IN_PROGRESS), `task-3` (associate-1, BLOCKED).

## Commands
`npm run verify` runs typecheck → lint → arch:check → test:coverage. `npm run dev` runs the server via tsx. `npm run build && npm start` builds `dist/` and runs `dist/server.js`. `npx tsx scripts/evaluate-harness.ts` runs the hard gates.
