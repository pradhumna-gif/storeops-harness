# Evaluation Criteria — Deterministic Verdict Framework (Evaluator Skill)

## Purpose
This file turns non-deterministic LLM-generated code into a **deterministic** routing decision. For the same check results, this file always gives the same verdict. The LLM only produces binary per-check results with evidence. It never picks the verdict directly.

## 1. Dimensions and weights (sum = 100%)
| Dimension | Weight | Why it is weighted this way for StoreOps | Automated hard gates in this dimension |
|---|---|---|---|
| Architecture Compliance | **35%** | Three of the four client failure modes (F1, F2, F4) are architectural, and they are the most expensive to find later | HG4, HG5, HG6 |
| Functional Correctness | **30%** | The AC contract is the developer-approved intent | HG1, HG3 |
| Testing & Quality | **25%** | Failure mode F3: tests that don't prove business rules | HG7, HG8, HG9 |
| Maintainability | **10%** | Important but not blocking, so it is the only dimension that can produce CONDITIONAL PASS | HG2 |

Each dimension has at least one hard gate backed by an automated tool.

## 2. Hard gates (any FAIL means VERDICT: FAIL, whatever the score)
| ID | Gate | Tool / command | Pass condition | Failure mode prevented |
|---|---|---|---|---|
| HG1 | Strict types | `npm run typecheck` | exit 0 | unsound code shipped |
| HG2 | Lint | `npm run lint` | 0 errors (warnings allowed) | `any` and unused code hiding defects |
| HG3 | Tests | `npm run test:coverage` | 0 failing tests | regressions |
| HG4 | No cross-module repository import | `npm run arch:check` (`tsPreCompilationDeps: true`) + how-to-review step 2 | 0 violations | **F1** |
| HG5 | No raw Error in routes/services | `evaluate-harness.ts` scan `throw new Error(` in `*.service.ts`/`*.routes.ts` | 0 hits | **F2** |
| HG6 | Side effects through EventBus only | `arch:check` rule `no-direct-alerts-or-reports-service-coupling` + scan for `(Notification\|Alerts\|Reports?)Service` outside `app.ts`/own module | 0 hits | **F4** |
| HG7 | Service coverage | jest threshold `src/**/*.service.ts` | ≥ 80% lines, each file | **F3** (untested rules) |
| HG8 | Route coverage | jest threshold `src/**/*.routes.ts` | ≥ 70% lines, each file | **F3** |
| HG9 | Overall coverage | jest global | ≥ 70% lines | **F3** |
| HG10 | Guardrail integrity | `git diff --name-only` on the sprint | no changes to `.harness/**`, `.dependency-cruiser.cjs`, `jest.config.js`, `eslint.config.js` by the Generator | the Generator weakening a gate to pass it |

These gates can't be soft checks. A boundary violation that scores "80% compliant" still couples two modules, and coverage below threshold still ships untested rules. Only a binary block stops them reaching `main`.

## 3. Scoring (only when computing the weighted score)
Each dimension starts at 100. Subtract a fixed amount for each FAILed check ID from `how-to-review`:

| Dimension | Check → deduction |
|---|---|
| Architecture | A1 −30 · A2 −30 · A3 −20 · A4 −40 |
| Functional | F1 −15 per missing AC (max −60) · F2 −10 per wrong code |
| Testing | T1 −10 per untested AC · T2 −15 · T3 −10 · T4 −10 · branch coverage < 50% on a **changed** file −5 |
| Maintainability | M1 −10 · M2 −10 · M3 −10 · a known inconsistency recorded as a follow-up −20 |

Floor each at 0. Weighted score = Σ(dimension score × weight), rounded to 2 decimals.

## 4. Verdict algorithm (apply in order and stop at the first match)
1. Any HG1–HG10 = FAIL → **VERDICT: FAIL**
2. Any BLOCKING item (group A, F or T) → **VERDICT: FAIL**
3. Score ≥ 85 → **VERDICT: PASS**
4. 70 ≤ score < 85 and every deduction is group M (NON-BLOCKING) → **VERDICT: CONDITIONAL PASS**
5. Otherwise → **VERDICT: FAIL**

## 5. Handling variability and ambiguity
- **Generator variability.** Two runs can produce different code for the same contract. The Evaluator judges only observable properties (tool output, test assertions, file:line facts), so different code that meets the same checks gets the same verdict.
- **Evaluator variability.** Each LLM check has a written PASS condition and a typical FAIL example (see how-to-review). Deductions are fixed numbers, so the score is arithmetic, not an opinion.
- **Ambiguous per-check result** (the evidence can't be found or is contradictory): the check is FAIL (no evidence).
- **Ambiguous overall output** (no `VERDICT:` first line, or more than one): the orchestrator re-runs the Evaluator once. If it is still ambiguous, the result is FAIL. It is fail-closed and never guessed.
- **Tool failure** (a command crashes for environmental reasons): re-run once. If it still fails, the gate is FAIL and the escalation note says "environment".

## 6. Worked example (sprint 1)
When sprint 1 ran, dimension scores were still chosen by the LLM within each dimension. The Evaluator gave Testing 95, deducting 5 for 33% branch coverage in `activities.routes.ts:11`, a file the sprint did not change. It gave Maintainability 80 for the inconsistent `ACTIVITY_STATUS_CHANGED` payload. Weighted = 35 + 30 + 23.75 + 8.00 = **96.75**, so PASS.

Re-scored with the fixed deduction table in §3, the branch note does not apply because the file wasn't changed, so Testing = 100. The payload inconsistency is a recorded follow-up, −20, so Maintainability = 80. Weighted = 35 + 30 + 25 + 8 = **98.00**. Step 1: no HG failed. Step 2: no BLOCKING items. Step 3: 98.00 ≥ 85, so **VERDICT: PASS**.

The verdict is the same, but the score moved by 1.25 points because of scorer judgement. That is exactly the variability §3 now removes: any evaluator with these check results must now score 98.00 and route PASS.
