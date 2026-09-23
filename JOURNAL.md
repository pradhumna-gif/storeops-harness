# Architecture Journal

Design decisions, corrections and insights, recorded while building and running the harness. Newest entries are last.

## 2026-09-23 · Stack: Node.js / TypeScript (Option A)
TypeScript 5 strict + Express 4 + Jest/Supertest + ESLint. I chose it because it has the most detailed programme scaffold, and because strict typing makes HG1 a meaningful gate. **Trade-off:** it would be quicker to type every service method against a shared interface file, but I kept each module's types next to the module so ownership is visible in imports.

## 2026-09-23 · Demonstration feature: shift handover bulk update
I chose it over SLA alerting and regional rollup. It exercises all four failure modes in one module: repository boundary (F1), AppError on per-item failures (F2), business-rule tests for partial failure (F3), and the EventBus side effect into alerts (F4). **Rejected:** regional rollup. It needs a new reports-owned repository and would have been two sprints, which makes the first harness run a test of decomposition rather than of the Generator/Evaluator loop.

## 2026-09-23 · `.harness/output/` transient vs `.harness/reviews/` permanent
Working files are gitignored so each sprint starts clean and context can be reset. **Correction made later:** the Planner's `spec.md` and `sprint-1-contract.md` only existed in `output/`, so they would have been missing from the commit. The orchestrator now archives the spec and contract as `sprint-N-spec.md` / `sprint-N-contract.md` too. *Insight:* "transient" must mean "copied at the verdict", not "never kept".

## 2026-09-23 · Coverage gate silently not applying
The first `npm run verify` printed "Coverage data for ./src/**/service.ts was not found". The glob matched no files, so the service threshold wasn't enforced and the check still exited 0. Fixed to `./src/**/*.service.ts` (visible in `evidence/15_FINAL_VERIFY.png`). *Insight:* a gate that matches nothing passes, so gate configuration needs its own review. This was the first sign of the problem in the entry below.

## 2026-09-23 · Sprint 1: double event emission
`bulkStatus` reused the public `update()` method, which already emits. Reusing a method looked like good practice (DRY), but it broke the "exactly one event" AC. **Decision:** bulk persists through `repo.save` and emits once. *Skill change:* `coding-conventions` §4 now says "do not call another public method that also emits".

## 2026-09-23 · Post-run audit: type-only import passed HG4
`reports.service.ts` imported `ActivitiesRepository` as a type. dependency-cruiser ignores erased imports by default, so `arch:check` passed with 18 dependencies cruised. **Options:** (a) an LLM-only import review, (b) a grep rule, (c) `tsPreCompilationDeps: true`. **Chose (c) plus a mandatory import scan in `how-to-review`.** It keeps the gate deterministic, and the scan covers what a tool configuration might miss. The cruise now covers 39 dependencies. The code fix routes reports through `Pick<ActivitiesService,'list'>`. Recorded in `.harness/reviews/post-sprint-1-harness-audit.md`.

## 2026-09-23 · Build output path broke the Docker image
`tsc -p tsconfig.json` with `rootDir: "."` emitted `dist/src/server.js`, but `npm start` and the Dockerfile run `dist/server.js`. Local demos used `tsx`, so nobody noticed. Added `tsconfig.build.json`. *Insight:* the harness verified the code but never the deliverable artefact. A future gate could be `npm run build && node -e "require('./dist/app')"`.

## 2026-09-23 · Fixed deductions instead of LLM-chosen dimension scores
Sprint 1 scored 96.75. The same check results scored under the fixed table give 98.00. The verdict is the same, but the score varied, and that is enough to flip a borderline sprint between PASS and CONDITIONAL PASS. **Trade-off:** fixed deductions are cruder. Some real quality differences now score the same. For a routing decision that is the right trade: reproducibility is worth more than nuance.

## 2026-09-23 · Token budget and skill depth
Shared skills are about one page because all four agents pay for them. Role-specific skills are 1.5–2.5 pages. The Evaluator doesn't load Generator skills: that saves about 3k tokens per evaluation and keeps it independent. The estimated run cost was 90–120k tokens. With no per-agent metering, the estimate is based on work volume.
