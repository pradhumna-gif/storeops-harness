# ESCALATION — <sprint-N>

ESCALATION: TRIGGERED
SPRINT: <sprint-N>
ITERATIONS: 3 of 3
RECIPIENT: developer who invoked `@planner` (named in PROMPT.md / session)
RAISED: <ISO timestamp>

## Verdict history
| Iteration | Verdict | Score | Failed hard gates |
|---|---|---|---|
| 1 | FAIL | <n> | <HG ids> |
| 2 | FAIL | <n> | <HG ids> |
| 3 | FAIL | <n> | <HG ids> |

## Blocking checks (still failing at iteration 3)
| HG / check | Command or method | Output (verbatim, trimmed) | File:line | Architecture rule / AC |
|---|---|---|---|---|
| e.g. HG4 | `npm run arch:check` | `error no-reports-cross-module-repository-imports: src/reports/reports.service.ts → src/activities/activities.repository.ts` | `src/reports/reports.service.ts:2` | Rule 2 / F1 |

## Why the loop did not converge
<one paragraph: same fix attempted repeatedly? contract ambiguous? rule conflicts with the requirement?>

## Developer action required (choose one)
1. **Fix manually:** make the change at the file:line above, then run `npm run verify` and tell the harness to resume the Evaluator.
2. **Amend the contract:** edit `sprint-N-contract.md` and type `APPROVED` again. The iteration counter resets to 0.
3. **Accept the risk:** record the reason and an owner in `.harness/reviews/sprint-N-risk-acceptance.md`. A hard gate cannot be waived this way for rules 2–5.

Expected response time: before the next sprint starts. No further sprints run while this file exists.
