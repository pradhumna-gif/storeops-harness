# Harness Design Brief — StoreOps (Node.js / TypeScript)

Cognizant AI-Native Tech Architect Programme · Capstone Case Study 1 · Build Track
Demonstration feature: shift handover bulk update, `PATCH /api/activities/bulk-status`

```
 Developer ──@planner──▶ PLANNER ──spec.md + sprint-1-contract.md (STATUS: AWAITING APPROVAL)──▶ Developer
                         skills: app-context, architecture-principles, sprint-decomposition        │
                                                                                            types APPROVED
                                                                                                   ▼
        ┌────────────── FAIL (iteration < 3): evaluator-feedback.md + contract only ─────────── ROUTER (CLAUDE.md)
        ▼                                                                                   reads line 1: VERDICT: …
   GENERATOR ──src/, tests/, generator-summary.md──▶ EVALUATOR ──evaluator-feedback.md──────────┘  │PASS / COND. PASS
   skills: app-context, architecture-principles,     1. scripts/evaluate-harness.ts (HG1–HG10)         ▼
   coding-conventions, api-integration, how-to-test  2. LLM checks A/F/T/M → binary + file:line   archive → MONITOR
                                                     3. fixed-deduction score → verdict algorithm  run-log.md → .harness/reviews/
                              iteration = 3 and not passing ──▶ .harness/output/escalation.md ──▶ Developer
```

## A. Intent Decomposition

**From feature to agents.** The prompt (`PROMPT.md`) has ten requirements. I sorted them by *who has to decide* each one, not by which file it touches. Requirements 1–5 (payload, allowed statuses, per-item independence, response shape, audit entry per success) are **intent**, so the Planner turns them into acceptance criteria and the developer approves them. Requirements 6–8 (EventBus, layering, AppError) are **standing architecture**. They already live in `architecture-principles` and are fed to the Generator before it writes code, so the Planner only has to name which rules are at risk. Requirements 9–10 (business-rule tests, thresholds) are **acceptance evidence**, owned by the Evaluator through deterministic gates. The result is that no agent both sets a standard and judges itself against it. The Planner can't mark its own spec approved, the Generator can't write a verdict, and the Evaluator can't edit `src/`.

**Sprint boundaries.** The `sprint-decomposition` skill defines a sprint as one vertical slice through **one owning module**. It splits only when a second module's write path is involved, a new event type needs a new consumer, or the contract goes over about 10 ACs or 6 files. Bulk status meets none of these. Activities is the only owning module. It reuses the existing `ACTIVITY_STATUS_CHANGED` event and the existing alerts subscriber in `src/app.ts`. It needed 10 ACs. So the Planner produced **one sprint**. I rejected a layer-wise split (sprint 1 = route, sprint 2 = service) because a route-only sprint can't satisfy any business-rule AC, so it could never reach PASS and would burn iterations for nothing. By contrast, the *regional rollup* feature would be two sprints: a read-only aggregation first, then a reports-owned repository with an event subscriber, because the second step introduces a new owning write path.

**Making ACs testable.** Every THEN clause must name something observable: a response field, the persisted entity state, an `AuditEntry`, an event *count*, or an `AppError` code plus status. The skill bans "works", "correctly", "properly" and "as expected". Each failure path names its error code. At least one AC covers each architecture rule at risk (AC-07 for EventBus, AC-08 for layering and AppError), so architecture becomes part of the approved contract and not just a background expectation. Each AC maps to a PROMPT requirement or a hard gate, as shown in the Planner's approval table (`evidence/10_PLANNER_RUN.png`).

**Example contract entry** (`.harness/reviews/sprint-1-spec.md`, AC-05):

> **AC-05 — Partial failure on unauthorized actor.**
> **GIVEN** a batch containing one activity the actor is authorized to change and one activity owned by and assigned to a different actor
> **WHEN** the actor (who is not `store-manager-1`) submits `PATCH /api/activities/bulk-status`
> **THEN** the authorized activity is updated and included in `updated`, the unauthorized activity's ID appears in `failed` with code `FORBIDDEN`, and processing of the authorized item is unaffected by the failure.

It maps to test `fails unauthorized items independently without blocking authorized ones` (`tests/activities/activities.service.test.ts:65-72`). That test asserts the exact `failed` entry *and* re-reads `t2` to prove its status is still `TODO`.

## B. Governance Framework

**Skill strategy.** Eight skills, each assigned to agents by need (see `.harness/skills/README.md`):

| Skill | Loaded by | What it encodes that is specific to StoreOps |
|---|---|---|
| app-context | all 4 | module ownership table, `src/app.ts` as the only composition root, seed IDs (`task-1..3`, `associate-1`, `lead-1`, `store-manager-1`), the `x-user-id` actor convention |
| architecture-principles | P, G, E | the six rules, each traced to F1–F4 and to a check ID; the **event registry** (`ACTIVITY_STATUS_CHANGED` → alerts `SHIFT_HANDOVER` for BLOCKED); the `Pick<ActivitiesService,'list'>` reader pattern |
| sprint-decomposition | P | one-owning-module sprint rule, banned AC words, contract template |
| coding-conventions | G | route `handle()` wrapper, the "validate → load → authorize → persist → audit → emit" order, the AppError code catalogue, literal routes before `/:id` |
| api-integration | G | endpoint inventory, `{code,message}` error body, 200-with-`failed[]` partial-failure semantics, event payload contract |
| how-to-test | G | per-file coverage gates, real in-memory repository with a real EventBus, exact event-count assertions (F3) |
| how-to-review | E | review order, check IDs A1–A4/F1–F2/T1–T4/M1–M3 with PASS conditions, a mandatory import scan across all touched modules |
| evaluation-criteria | E | weights, HG1–HG10, fixed deductions, the verdict algorithm, ambiguity handling |

The two **shared** skills are about one page each on purpose, because every invocation pays for them. Depth goes into role-specific files that only one agent loads. The Evaluator does not load the Generator's convention files. That keeps it judging against the rules instead of the Generator's reasoning, and it saves about 3k tokens per evaluation.

**Audit trail.** `.harness/output/` is transient working state and is gitignored. At each final verdict the orchestrator copies the spec, contract, generator summary and evaluator feedback into `.harness/reviews/sprint-N-*.md`, where they are committed alongside the Monitor's `sprint-N-run-log.md`. That gives a chain of evidence from **intent → claim → verdict → operational record** for every AI-generated change. Anyone with repository read access can see it: the squad, the standards team, and reviewers of the pull request. Changes to it go through normal PR review, so it can't be quietly rewritten. The Monitor's **trend rule** is how recurring issues surface: when the same architecture rule or check ID fails in two consecutive sprints, the run log records `Skill-file action: review <skill>, rule N`. The archive also records audits of the harness itself. `post-sprint-1-harness-audit.md` records a boundary violation that sprint 1 missed, why it was missed, and the configuration fix.

**One rule traced to a StoreOps decision.** From `architecture-principles`, Rule 3: *"A state change another module must react to is published with `this.eventBus.emit('<EVENT_TYPE>', payload)` from the owning service after persistence; importing AlertsService/NotificationService/ReportsService into activities, programmes or staff is prohibited."*

**What breaks without it.** The shift-handover alert is the concrete case. A Generator trying to "notify the lead when a task is BLOCKED" will naturally import `AlertsService` into `activities.service.ts`. Activities then can't be tested or deployed without alerts. Every new consumer (SLA breach, regional rollup) edits the activities service again. Once alerts reads activities for context, a circular dependency forms. That is failure mode F4. The rule is enforced three ways: fed to the Generator beforehand, checked by the dependency-cruiser rule `no-direct-alerts-or-reports-service-coupling` (HG6), and checked by Evaluator check A3 (emit after persist, exactly once). Sprint 1 showed why the "exactly once" part matters: the Generator found that `bulkStatus` was emitting twice, through `update()` and through its own emit.

## C. Non-Determinism Strategy

**Dimensions and weights.** Architecture Compliance **35%** · Functional Correctness **30%** · Testing & Quality **25%** · Maintainability **10%**. Architecture is weighted highest because three of the client's four failure modes (F1, F2, F4) are architectural and cost the most to find after merge. Functional is the approved intent. Testing directly targets F3. Maintainability matters but should never block a merge by itself, so it is the only dimension whose deductions allow a CONDITIONAL PASS. Every dimension has at least one tool-backed hard gate.

**Hard gates, and why none can be a soft check.**

| Gate | Tool | Failure mode prevented | Why it must be binary |
|---|---|---|---|
| HG1 `tsc --noEmit` = 0 | TypeScript | unsound code | A type error is a latent runtime crash. There is no "80% typed". |
| HG2 ESLint 0 errors | ESLint | `any` hiding contract drift | `any` switches off HG1 for the value that carries it |
| HG3 0 failing tests | Jest | regression | A failing test is a broken promise to an earlier sprint |
| HG4 0 cross-module repository imports | dependency-cruiser (`tsPreCompilationDeps`) | **F1** | One import couples two storage models. Averaging it against other good work still ships the coupling |
| HG5 0 `throw new Error(` in routes/services | source scan | **F2** | A raw Error becomes a 500 with no `code`, and clients can't tell a missing activity from an outage |
| HG6 no direct alerts/reports service coupling | dependency-cruiser + scan | **F4** | See Rule 3 above |
| HG7–9 coverage 80/70/70 per file | Jest thresholds | **F3** | An untested business rule is unverified, whatever the other scores are |
| HG10 no Generator edits to guardrails | `git diff --name-only` | the Generator weakening a gate | Otherwise every other gate can be made to pass trivially |

**From variable output to a fixed verdict.** The LLM never picks the verdict. Its job is only to turn each named check (A1…M3) into PASS or FAIL with a file:line. Missing evidence counts as FAIL. Each FAIL carries a **fixed** deduction from the table in `evaluation-criteria`, so the score is arithmetic. A five-step algorithm then decides: any HG fails → FAIL; any BLOCKING (A/F/T) item → FAIL; score ≥ 85 → PASS; 70–84.99 with only M-group deductions → CONDITIONAL PASS; otherwise FAIL. Only the first line of `evaluator-feedback.md` is read, and it must match `^VERDICT: (PASS|CONDITIONAL PASS|FAIL)$`. A missing or duplicated verdict line causes one re-run, and if it is still wrong the result is FAIL.

**Walk-through (sprint 1).** The Generator's output varied from the contract's expectation in one way: `bulkStatus` persisted through `update()`, which emitted a second event with a different payload. The Generator found this while auditing the code line by line against AC-07, fixed it, and added a regression test before handoff. The Evaluator then ran the gates: HG1–HG9 all PASS (`no dependency violations found`, 26/26 tests, service 97.43%, route 94.44%, overall 97.72% lines). Checks A1–A4, F1–F2 and T1–T4 all PASS with file:line evidence. The only finding was M-group: two different `ACTIVITY_STATUS_CHANGED` payload shapes. Score **96.75**, first line `VERDICT: PASS`, so the router archived the files and invoked the Monitor. One real source of variability remained: the per-dimension scores were then the LLM's choice. It deducted 5 for branch coverage on a file the sprint didn't touch. Re-scoring with today's fixed deduction table gives 98.00. The verdict is the same, but the score moved, so that freedom has been removed (`evaluation-criteria` §6).

**Escalation path.** *Trigger:* iteration 3 ends without PASS or CONDITIONAL PASS, or the Evaluator is still ambiguous after its re-run. *Output:* `.harness/output/escalation.md` from `.harness/templates/escalation.md`, copied to `.harness/reviews/`. It contains the sprint ID, "3 of 3", the verdict history for each iteration, each blocking check with its verbatim command output, the file:line and the violated rule, why the loop didn't converge, and three options: fix manually, amend the contract (needs `APPROVED` again, and resets the counter), or record a risk acceptance (not allowed for rules 2–5). *Recipient:* the developer who invoked `@planner`. The loop stops and no further sprint runs while the file exists. *Expected response:* before the next sprint starts. The Monitor records `Escalation flag: TRIGGERED` so repeated escalations show up as a trend.

## D. Architectural Decisions

**D1: The Evaluator runs the same commands as CI, plus AI-specific checks. It precedes CI and does not replace it.**
*Alternatives:* (a) the harness replaces CI for AI-authored changes; (b) the harness only does an LLM review and leaves tools to CI.
*Rationale:* (a) would give AI-generated code a weaker path to `main` than human code. (b) would let a lenient LLM pass a type or boundary failure that CI would reject later, which wastes iterations and weakens the verdict. Running `npm run verify` inside the loop means a harness PASS predicts a green pipeline. The harness then adds what CI can't do: the AC trace, business-rule assertions and the layer review. Harness files live in `.harness/` and CI config in `.github/`.
*Assumption:* the pipeline runs the same `npm run verify`. If CI drifts (for example a different coverage config), the two could disagree, so the scripts are defined once in `package.json`.

**D2: Hard gates rely on configured tools, not the LLM's reading of imports.**
*Alternatives:* LLM-only boundary review; or hand-written grep rules.
*Rationale:* a tool gives the same answer every run, and grep can't resolve paths. **This decision's weak point showed up in the demonstration.** dependency-cruiser ignored type-only imports, so the pre-existing `reports.service.ts → activities.repository` import passed HG4, and the Evaluator's manual check only covered activities. The fix: `tsPreCompilationDeps: true`, which covers 39 dependencies instead of 18, plus a mandatory import scan across every touched module in `how-to-review`.
*Assumption:* the tool's configuration is itself reviewed. Gates are only as deterministic as their config is correct, which is why HG10 stops the Generator from editing them.

**D3: Agents hand off only through files. The next sprint gets a summarised carry-over, not the conversation.**
*Alternatives:* one long conversation across all sprints; or separate sessions with no memory.
*Rationale:* a single conversation lets the Evaluator absorb the Generator's reasoning and grows context with every sprint and retry, and quality degrades. No memory at all loses decisions made along the way. Handoff files are small, can be audited, and double as the archive. A retry gets only the contract plus the latest feedback. A new sprint gets a carry-over of five bullets or fewer. The budget is roughly 25–50k tokens per invocation (CLAUDE.md).
*Assumption:* the handoff formats are complete enough that nothing important lives only in chat. The Monitor's run log is where missing context would show up, as repeated FAILs on the same check.
