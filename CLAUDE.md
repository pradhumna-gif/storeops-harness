# StoreOps AI Development Harness — Orchestrator

## Purpose

This repository implements the Cognizant AI-Native Tech Architect Build Track harness for the StoreOps Node.js/TypeScript REST API. Claude Code is the governed orchestration layer. This file is the root orchestrator: it defines the agents, the sequence, routing, loop bounds, escalation, context scoping and the relationship to CI/CD.

It exists to stop four failure modes from reaching `main`:

| # | Failure mode seen in the client's prior AI experiment | Primary control |
|---|---|---|
| F1 | Direct import of another module's repository | HG4 `npm run arch:check` (dependency-cruiser) |
| F2 | Raw `Error` throws in services/routes | HG5 source scan + `AppError` rule |
| F3 | Tests assert HTTP status but not business rules | Functional/Testing dimension checks T2–T4 |
| F4 | Missing event-bus integration; sibling state written directly | HG6 + `arch:check` rule `no-direct-alerts-or-reports-service-coupling` |

## Entry prompt

```
@planner <retail feature request>
```

Demonstration run (see `PROMPT.md`): `@planner Add shift handover bulk update to StoreOps activities.`

`@planner` is a harness keyword, not a Claude Code sub-agent. When a developer message starts with `@planner`, Claude Code must load `.harness/agents/planner.agent.md` and act only as the Planner. The other roles are invoked by this orchestrator, not by the developer.

## Agent registry

| Role | Definition file | Invoked when | Skills loaded (only these) | Writes |
|---|---|---|---|---|
| Planner | `.harness/agents/planner.agent.md` | Developer prompt starts with `@planner` | app-context, architecture-principles, sprint-decomposition | `.harness/output/spec.md`, `.harness/output/sprint-N-contract.md` |
| Generator | `.harness/agents/generator.agent.md` | After `APPROVED`, or after a `FAIL` verdict with iterations < 3 | app-context, architecture-principles, coding-conventions, api-integration, how-to-test | `src/**`, `tests/**`, `.harness/output/generator-summary.md` |
| Evaluator | `.harness/agents/evaluator.agent.md` | After every Generator handoff | architecture-principles, how-to-review, evaluation-criteria | `.harness/output/evaluator-feedback.md` |
| Monitor | `.harness/agents/monitor.agent.md` | After every final sprint verdict (PASS, CONDITIONAL PASS, or escalation) | app-context | `.harness/reviews/sprint-N-run-log.md` |

Each agent definition states its responsibility, what it reads, what it produces, the exact handoff format and the things it must not do. Agents must not do another agent's job. The Generator never writes a verdict, the Evaluator never edits `src/`, and the Planner never marks its own spec approved.

## Orchestration sequence

1. **Plan.** The Planner reads its three skills and writes `spec.md` and `sprint-1-contract.md`, both with `STATUS: AWAITING APPROVAL` on their own line. Claude Code stops and asks the developer to review.
2. **Approval gate.** The developer types exactly `APPROVED`, which is case-sensitive and the whole message. Any other reply is revision feedback, and the Planner rewrites the files. On `APPROVED` the orchestrator changes both markers to `STATUS: APPROVED`. No `src/` edits are allowed before this.
3. **Generate.** The Generator implements sprint N and writes `generator-summary.md` with the AC self-check table, files changed with their layer, the command results and known gaps.
4. **Evaluate.** The Evaluator runs `npx tsx scripts/evaluate-harness.ts` (deterministic hard gates), then the LLM checks, and writes `evaluator-feedback.md`.
5. **Route** (see below).
6. **Archive.** On a final verdict, copy the transient files to the permanent audit trail as `.harness/reviews/sprint-N-spec.md`, `sprint-N-contract.md`, `sprint-N-generator-summary.md` and `sprint-N-evaluator-feedback.md`. Earlier FAIL iterations are archived as `sprint-N-iter-K-evaluator-feedback.md`.
7. **Monitor.** The Monitor writes `.harness/reviews/sprint-N-run-log.md`.
8. **Next sprint or stop.** If `sprint-(N+1)-contract.md` exists, reset context (see below) and return to step 3. Otherwise the run is complete.

The developer's only active steps are step 1 (the prompt) and step 2 (`APPROVED`), plus responding to an escalation.

## Routing contract (machine-readable)

The **first line** of `evaluator-feedback.md` must be exactly one of:

```
VERDICT: PASS
VERDICT: CONDITIONAL PASS
VERDICT: FAIL
```

The orchestrator reads only that line, using the regex `^VERDICT: (PASS|CONDITIONAL PASS|FAIL)$`.

| First line | Condition | Next action |
|---|---|---|
| `VERDICT: PASS` | All hard gates pass and the weighted score is ≥ 85 | Archive, Monitor, advance to the next sprint |
| `VERDICT: CONDITIONAL PASS` | All hard gates pass, score is 70–84.99, and every deduction is tagged `NON-BLOCKING` (docs or maintainability only) | Archive, Monitor, advance. The deductions are copied into the next sprint contract's "Carry-over" section |
| `VERDICT: FAIL` | Any hard gate fails, or the score is < 70, or a `BLOCKING` deduction exists | If iteration < 3: iteration += 1, pass **only** `evaluator-feedback.md` and the contract to the Generator. If iteration = 3: escalate |
| Missing, malformed, or more than one verdict line | Evaluator output is ambiguous | Re-run the Evaluator once with the same inputs. If it is still ambiguous, treat as `VERDICT: FAIL` (fail-closed). The re-run does not count as a Generator iteration |

A `CONDITIONAL PASS` can never override a hard-gate failure.

## Iteration bound and escalation

The maximum is **3** Generator→Evaluator iterations per sprint. The counter is stored as `ITERATION: K` in the header of `generator-summary.md`.

After iteration 3 without PASS or CONDITIONAL PASS, write `.harness/output/escalation.md` using `.harness/templates/escalation.md`. It records the sprint ID, the iteration count, each blocking check with its command output, the file:line references, the violated architecture rule (1–6), the verdict history for each iteration, and the **developer action required**. Then:

- copy it to `.harness/reviews/sprint-N-escalation.md`
- run the Monitor with `Escalation flag: TRIGGERED`
- stop the loop and tell the developer. The recipient is the developer who ran `@planner`. They either fix the code, amend the contract (which needs a new `APPROVED`), or record a risk acceptance. A skill-file rule is changed only via the Monitor's trend notes.

## Context strategy

The goal is to keep each invocation small and role-specific so quality does not degrade over long runs.

- **Scoped loading.** Each agent loads only the skills in its registry row, plus its handoff inputs. The Evaluator does not load `coding-conventions`, so it judges against the rules rather than the Generator's reasoning. The Monitor does not load code.
- **Handoff files, not conversation.** Agents communicate only through `.harness/output/*.md`. When a new role starts, it treats earlier chat turns as out of scope and re-reads its inputs from disk.
- **FAIL retries** give the Generator only the contract, the latest `evaluator-feedback.md` and the files named in it. It does not get the full transcript of the previous iteration.
- **Sprint reset.** Between sprints, run `/clear` or start a new session. The next sprint contract has a `Carry-over from sprint N-1` section of five bullets or fewer, which summarises the previous sprint's decisions and open non-blocking findings. The previous sprint's full output is not carried.
- **Token budget (approximate, per invocation).**

| Agent | Skills (approx. tokens) | Handoff inputs | Typical total |
|---|---|---|---|
| Planner | ~3.5k | prompt + repo tree | 15–25k |
| Generator | ~7k | contract + touched files | 30–50k |
| Evaluator | ~5k | contract + summary + diff + check output | 25–40k |
| Monitor | ~1k | summary + feedback | 8–12k |

Skill depth is a cost trade-off. Shared skills (app-context, architecture-principles) are kept to about one page because every agent pays for them. Depth goes into the role-specific files that only one agent loads: coding-conventions for the Generator, evaluation-criteria for the Evaluator.

## CI/CD relationship

The harness **precedes** CI/CD and **feeds into** it. It does not replace it.

- The harness runs the same commands the pipeline runs (`npm run verify` = typecheck → lint → arch:check → test:coverage), so a harness PASS predicts a green pipeline.
- It adds AI-specific gates that the pipeline does not have: the acceptance-criteria trace, the LLM architecture review and business-rule test assertions.
- CI remains the independent final gate on the pull request. A harness verdict is never treated as a CI result. Harness files live in `.harness/`, pipeline configuration lives in `.github/workflows/`, and neither reads the other's configuration.

## Required automated checks

```bash
npm run typecheck      # HG1 tsc --noEmit, strict
npm run lint           # HG2 eslint, 0 errors
npm run arch:check     # HG4/HG6 dependency-cruiser, 0 violations (tsPreCompilationDeps on)
npm run test:coverage  # HG3 + HG7-9 jest, 0 failures, coverage thresholds enforced in jest.config.js
npx tsx scripts/evaluate-harness.ts   # all of the above + HG5/HG6/rule-5 source scans
```

## StoreOps hard architecture rules

1. Routes → Service → Repository. Routes contain HTTP validation/translation only; business logic belongs in services.
2. A module may not import another module's repository. Cross-module reads use the target module's service.
3. Cross-module side effects use `EventBus.emit()`. Direct AlertsService/NotificationService/ReportsService coupling is prohibited. Only `src/app.ts`, the composition root, wires subscribers.
4. Services and routes use `AppError(code, message, statusCode)` rather than raw `Error` throws.
5. Reports are read-only and never write to activities, programmes or staff.
6. In-memory persistence is sufficient for the capstone reference implementation.

## Demonstration feature

`PATCH /api/activities/bulk-status` updates multiple activities to `DONE` or `BLOCKED`, supports partial failure, and creates an audit entry for every successful update. The run's evidence is in `.harness/reviews/sprint-1-*.md`.
