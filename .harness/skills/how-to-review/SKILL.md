# How to Review — StoreOps (Evaluator Skill)

## Purpose
The review procedure and the evidence standard. Each LLM-assessed check below must come out as **PASS or FAIL**. There is no "partial" or "mostly". The file:line evidence is what makes the result reproducible.

## Evidence standard
- Automated gates: quote the tool's summary line exactly, for example `no dependency violations found (18 modules, 39 dependencies cruised)`.
- LLM checks: give `path:line` for the code that proves PASS, or the code that causes FAIL.
- Generator claims in `generator-summary.md` are **hypotheses**. Re-run or re-read before using them.
- If evidence can't be found, the check is **FAIL (no evidence)**. It is never PASS by default.

## Review order
1. **Run** `npx tsx scripts/evaluate-harness.ts`. This gives HG1–HG6 and the rule-5 scan. If any gate FAILs, still finish steps 2–4 so the Generator gets all of its feedback in one iteration.
2. **Imports:** for **every module the diff touches**, and for `src/reports/**` always, list each import line and classify it as shared, same-module or sibling *service*. Any sibling *repository* import is HG4 FAIL, even if `arch:check` passed. Record the `arch:check` dependency count. If it is lower than in the previous sprint's run log, explain why. (This was added after the post-sprint-1 audit.)
3. **AC trace:** for each AC, find the implementing `file:line` **and** a test that asserts its THEN clause. An AC with code but no business-rule assertion is FAIL.
4. **LLM checks:**

| ID | Check | PASS when | Typical FAIL evidence |
|---|---|---|---|
| A1 | Routes contain only HTTP translation | Every changed route handler only destructures input, calls one service method and responds | a domain `if`/loop/authorization in `*.routes.ts` |
| A2 | Repository has no business logic, HTTP or EventBus | Repository methods only get or set collections | `eventBus`/`AppError`/`fetch` in `*.repository.ts` |
| A3 | Emit placement | `emit` comes after `repo.save` in the owning service, once per state change | emit before persist, or emit in a route |
| A4 | Reports read-only | `src/reports/**` calls only `list`/`get`/`find*` | any write call |
| F1 | Every AC implemented | each AC has a file:line | missing AC |
| F2 | Failure paths use the specified AppError code + status | codes match the contract | a different code, or a 500 |
| T1 | Every AC has a test | an AC → test name mapping exists | untested AC |
| T2 | Tests assert business outcomes | see the how-to-test table | status-only assertion |
| T3 | Event count asserted exactly | `toHaveLength(n)` on captured events | `toContain`, or not asserted |
| T4 | Negative-path state unchanged | the failure test re-reads the entity | not re-read |
| M1 | Summary lists files with the correct layer | matches the diff | missing file or wrong layer |
| M2 | New codes/events/endpoints added to the skill tables | tables updated | new code not listed |
| M3 | No duplicated logic | no copy-pasted handler/validation | duplicated block |

5. **Coverage:** read the Jest per-file table. Name any file under its threshold.
6. **Write the feedback.** For each FAIL: `| # | BLOCKING/NON-BLOCKING | file:line | rule or AC | exact change to make |`. BLOCKING means a hard gate, or anything in the A/F/T groups. NON-BLOCKING means M-group items only.

## Things a reviewer must not do
Don't award points for effort, don't pass a gate because the Generator explained the failure, don't review files outside the contract scope beyond the step-2 import scan, and don't propose redesigns in a FAIL item. Name the smallest change that satisfies the rule.
