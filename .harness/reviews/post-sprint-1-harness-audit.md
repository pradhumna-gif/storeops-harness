# Post-Sprint-1 Harness Audit — Evaluator Blind Spot

Type: developer audit of the harness itself, done after sprint 1 was archived. This is **not** a Generator/Evaluator loop iteration, and the sprint-1 verdict files are left unchanged as the original record.

## Finding

| Field | Value |
|---|---|
| Rule violated | Architecture rule 2 — a module may not import another module's repository |
| Location | `src/reports/reports.service.ts:2` — `import { ActivitiesRepository } from '../activities/activities.repository'` |
| Introduced | Scaffold baseline (before sprint 1), so it is not a sprint-1 regression |
| Why sprint 1 missed it | (1) The import was type-only. By default dependency-cruiser ignores imports that `tsc` erases, so `npm run arch:check` reported "no dependency violations found (18 modules, 18 dependencies cruised)". (2) The Evaluator's manual import check only covered `src/activities/*` (see `sprint-1-evaluator-feedback.md`, hard gate 4) and trusted the tool for the other modules. |
| Reproduction | `npx depcruise --config .dependency-cruiser.cjs --ts-pre-compilation-deps src` → `error no-reports-cross-module-repository-imports: src/reports/reports.service.ts → src/activities/activities.repository.ts` · `1 dependency violations` |

## Corrective actions

1. **Harness (tool):** set `tsPreCompilationDeps: true` in `.dependency-cruiser.cjs`. The cruise now covers 39 dependencies instead of 18. Added rules `no-direct-alerts-or-reports-service-coupling`, `reports-is-read-only` and `no-circular`.
2. **Harness (skill):** `how-to-review` now requires the Evaluator to list the imports of **every** changed or touched module. The `arch:check` dependency count is recorded, and if it drops between sprints, that must be explained.
3. **Code:** `ReportsService` now depends on `ActivitiesReader = Pick<ActivitiesService, 'list'>`, a read-only lookup through the service layer (see the brief's §3.3). `src/app.ts` injects `activitiesService`. Added `tests/reports.test.ts` "never mutates activities or audit records".
4. **Coverage gates:** `jest.config.js` now enforces the route (≥70%) and shared (≥60%) thresholds per file. Before, only global and service thresholds were enforced, even though `evaluation-criteria` listed route coverage as hard gate 8.
5. **Build:** `npm run build` used `tsconfig.json` (`rootDir: "."`), which emitted `dist/src/server.js`. `npm start` and the Dockerfile run `dist/server.js`, so the container could not start. Added `tsconfig.build.json` (`rootDir: "src"`).

## Result after correction

```
npm run verify
  typecheck  0 errors
  lint       0 errors
  arch:check no dependency violations found (18 modules, 39 dependencies cruised)
  jest       10 suites, 28 tests passed; overall lines 97.72%; every service/route file above threshold
npx tsx scripts/evaluate-harness.ts  -> HARD-GATES: PASS
```

## Quality-trend signal for the Monitor

Classification: **tool-configuration drift**, not Generator behaviour. It is the first recorded case. If a future sprint hits a boundary violation that `arch:check` does not report, the next place to look is the `.dependency-cruiser.cjs` options, before the Generator skills.
