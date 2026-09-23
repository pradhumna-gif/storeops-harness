# Evidence Index

Screenshots captured during the sprint-1 demonstration run and the deployment. The artefacts they show are committed in full under `.harness/reviews/`. Read those files for the complete text.

| File | Harness stage | Shows |
|---|---|---|
| `02_PROMPT.png` | Entry | `PROMPT.md` feature prompt used with `@planner` |
| `03_PLANNER_SPEC.png` | Planner | `spec.md` produced by the Planner |
| `04_SPRINT_CONTRACT.png` | Planner | `sprint-1-contract.md` |
| `10_PLANNER_RUN.png` | Planner → approval gate | Claude Code Planner output: AC table mapped to PROMPT requirements and hard gates, ending "reply **APPROVED** to advance to the Generator stage" |
| `05_GENERATOR_SUMMARY.png` | Generator | `sprint-1-generator-summary.md` |
| `11_GENERATOR_RUN.png` | Generator | Claude Code Generator completion: double-emit defect fixed, test gaps closed, all checks green |
| `06_EVALUATOR_FEEDBACK.png` | Evaluator | `sprint-1-evaluator-feedback.md` |
| `12_EVALUATOR_RUN.png` | Evaluator | Dimension scores (weighted 96.75) and hard-gate table as written |
| `13_EVALUATOR_DETAILS.png` | Evaluator | AC → file:line evidence and verdict reasoning |
| `07_MONITOR_RUN_LOG.png` | Monitor | `sprint-1-run-log.md` |
| `14_MONITOR_RUN.png` | Monitor | Claude Code Monitor completion: sprint ID, verdict, 1 of 3 iterations, escalation not triggered, token estimate |
| `15_FINAL_VERIFY.png` | Verification | `npm run verify` exit 0 after the run |
| `16_BULK_STATUS_ENDPOINT.png` | Running app | First manual call of `PATCH /api/activities/bulk-status` (partial failure) |
| `17_CLAUDE_CODE_VERSION.png` | Tooling | Claude Code 2.1.197 |
| `18_LOCAL_RUN_LOG.txt` | Running app | Captured HTTP output from the built server |
| `19_DOCKER_PS.png` | **Docker deployment** | `docker compose ps`: `storeops-api` **Up (healthy)** on `0.0.0.0:3000`, container log, `/health` UP |
| `20_DOCKER_BULK_STATUS.png` | **Docker deployment** | The harness-generated endpoint answered by the container: `updated:[task-1]`, `FORBIDDEN` + `ACTIVITY_NOT_FOUND` partial failures, task-1 persisted `BLOCKED`, `SHIFT_HANDOVER` alert delivered via EventBus, `400 INVALID_BULK_STATUS` |
| `21_LOCAL_BUILD_BULK_STATUS.png` | Running app | The same calls against `node dist/server.js` |

## Approval gate
`10_PLANNER_RUN.png` shows the Planner stopping at the gate and asking for `APPROVED`. `11_GENERATOR_RUN.png` shows the Generator stage, which can only start after approval (see `CLAUDE.md`, step 2). The archived `sprint-1-spec.md` and `sprint-1-contract.md` carry `STATUS: APPROVED`, set by the orchestrator when the developer replied. There is no separate screenshot of the reply itself.

Screenshots 19–21 were captured with `scripts/capture-evidence.ps1`, which opens a real console window, runs the commands and captures that window.
