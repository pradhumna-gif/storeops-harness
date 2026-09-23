# Coding Conventions — StoreOps Node.js/TypeScript (Generator Skill)

## Purpose
The concrete code patterns the Generator must follow in `src/`. Each convention is taken from the existing StoreOps code, so new code looks like the surrounding code and passes the gates the first time. Only the Generator loads this file, so it can afford to be detailed.

## 1. File and naming layout
```
src/<module>/<module>.routes.ts       export function create<Module>Router(service: <Module>Service): Router
src/<module>/<module>.service.ts      export class <Module>Service { constructor(private readonly repo: <Module>Repository, private readonly eventBus?: EventBus) }
src/<module>/<module>.repository.ts   export interface <Module>Repository {...}; export class InMemory<Module>Repository implements <Module>Repository
tests/<module>/<module>.<layer>.test.ts
```
- Module folder names are plural and lowercase (`activities`, `programmes`). The API path matches the folder: `/api/activities`.
- Error codes are `UPPER_SNAKE`. Event types are `UPPER_SNAKE` in past tense (`ACTIVITY_STATUS_CHANGED`).
- IDs are generated in the **service**: `` `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}` `` (prefixes `task`, `audit`, `alert`, `programme`). Timestamps use `new Date().toISOString()`.
- Wiring (`new InMemory…`, `new …Service`, `eventBus.subscribe`) happens **only** in `src/app.ts`.

## 2. TypeScript rules (strict, enforced by tsc + ESLint)
- No `any`. `@typescript-eslint/no-explicit-any` is an **error**. Use `unknown` and narrow it, or use a domain type.
- Reuse the unions in `src/shared/types/domain.ts`, and narrow them with `Extract<>`/`Pick<>`: `status: Extract<TaskStatus, 'DONE' | 'BLOCKED'>`. Do not redeclare string literals.
- Result types that routes return are exported interfaces from the service, for example `export interface BulkStatusResult { updated: string[]; failed: Array<{ id: string; code: string; message: string }> }`.
- Unused parameters are prefixed with `_` (`(_req, res)`).
- Updates are immutable: `this.repo.save({ ...task, status, updatedAt: now })`. Do not mutate an entity you got from the repository.
- No `console.*` in `src/` except `server.ts`.

## 3. Route pattern (copy this)
```ts
const handle = (fn: (req: Request, res: Response) => void) => (req: Request, res: Response) => {
  try { fn(req, res); } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ code: error.code, message: error.message });
    else res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
};
router.patch('/bulk-status', handle((req, res) => {
  const { ids, status } = req.body as { ids: string[]; status: 'DONE' | 'BLOCKED' };
  const actorId = String(req.header('x-user-id') ?? 'associate-1');
  res.json(service.bulkStatus(ids, status, actorId));
}));
```
- Register literal paths (`/bulk-status`) **before** parameterised paths (`/:id`). Otherwise Express sends `bulk-status` to `/:id`.
- A route never checks domain values. Even `['DONE','BLOCKED'].includes(status)` belongs in the service.

## 4. Service pattern
- Order inside a mutating method: **validate input → load → authorize → persist → audit → emit → return**.
- Emit only after a successful persist, exactly once per state change. Do not call another public method that also emits. That caused the sprint-1 double-emit defect.
- Batch operations process each item in its own `try/catch`. A caught `AppError` goes into `failed` with `{ id, code, message }`. An unknown error goes in as `code: 'UNKNOWN'`. Earlier successes are never rolled back.
- Authorization rule for activities: the actor must be `assigneeId` or `ownerId`, or be `store-manager-1`. Delete is stricter: `ownerId` or `store-manager-1` only.

## 5. AppError catalogue (reuse before inventing)
| Code | Status | Thrown by |
|---|---|---|
| `ACTIVITY_NOT_FOUND` | 404 | `ActivitiesService.get` |
| `INVALID_TITLE` | 400 | `ActivitiesService.create` |
| `FORBIDDEN` | 403 | `ActivitiesService.delete`, `bulkStatus` (per item) |
| `INVALID_ACTIVITY_IDS` | 400 | `bulkStatus`: `ids` missing, not an array, or empty |
| `INVALID_BULK_STATUS` | 400 | `bulkStatus`: status not DONE/BLOCKED |
| `PROGRAMME_NOT_FOUND` | 404 | `ProgrammesService.addMember` |
| `INVALID_NAME` / `INVALID_MEMBER` | 400 | `ProgrammesService` |
| `USER_NOT_FOUND` | 404 | `StaffService.get` |
| `INTERNAL_ERROR` | 500 | route fallback only, never thrown |

Add any new code to this table in the same sprint and list it in `generator-summary.md`.

## 6. Cross-module reads
Depend on a narrowed service type, never on a repository:
```ts
import { ActivitiesService } from '../activities/activities.service';
export type ActivitiesReader = Pick<ActivitiesService, 'list'>;
```

## 7. Don'ts that fail gates
`throw new Error(` in routes or services (HG5) · an import of `../<other>/<other>.repository` (HG4, including type-only imports) · an import of `AlertsService`/`ReportsService` outside `app.ts` (HG6) · `any` (HG2) · editing `.dependency-cruiser.cjs`, `jest.config.js`, `eslint.config.js` or `.harness/**` to get a check to pass (HG10).
