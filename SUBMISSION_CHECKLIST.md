# Submission Checklist (mapped to capstone §5–§8)

## Working harness (45%)
- [x] `CLAUDE.md`: entry format, agent registry with file paths, sequence, APPROVED gate, machine-readable routing, 3-iteration bound, escalation, context and token strategy, CI/CD relationship
- [x] 4 agent files in `.harness/agents/`, each with reads (with reasons), outputs, handoff format and boundaries
- [x] 8 StoreOps-specific skill files (2 shared, 3 Generator, 2 Evaluator, 1 Planner)
- [x] Evaluation framework: 4 dimensions totalling 100%, HG1–HG10, a tool-backed gate in every dimension, fixed deductions, 5-step verdict algorithm, ambiguity fallback
- [x] Deterministic gate runner `scripts/evaluate-harness.ts`
- [x] Escalation template `.harness/templates/escalation.md`
- [x] Monitor agent, plus a run log in `.harness/reviews/`
- [x] `.harness/` kept separate from CI config (`.github/`)

## Design Brief (17%)
- [x] A: intent decomposition, sprint boundary rationale, full GIVEN/WHEN/THEN example
- [x] B: skill strategy table, audit trail (what, who, how issues surface), one rule plus what breaks without it
- [x] C: weights with rationale, each hard gate → failure mode → why binary, walk-through, escalation path
- [x] D: 3 decisions, each with alternatives, rationale and assumption

## Demonstration run (28%)
- [x] `PROMPT.md`
- [x] `.harness/reviews/sprint-1-spec.md` (Planner)
- [x] `.harness/reviews/sprint-1-contract.md` (Planner)
- [x] `.harness/reviews/sprint-1-generator-summary.md`
- [x] `.harness/reviews/sprint-1-evaluator-feedback.md` (`VERDICT: PASS`, file:line evidence)
- [x] `.harness/reviews/sprint-1-run-log.md`
- [x] Final code in `src/`
- [x] `DEPLOYMENT.md` + `evidence/16_BULK_STATUS_ENDPOINT.png` + `evidence/18_LOCAL_RUN_LOG.txt`
- [x] `REFLECTION.md`: a specific limitation seen in the run, concrete improvements, linked to Design Brief D2
- [x] `evidence/19_DOCKER_PS.png` (container Up, healthy) and `evidence/20_DOCKER_BULK_STATUS.png` (the new endpoint answered by the container)
- [ ] Screenshot of the developer typing `APPROVED` (if available from the run session)

## Bonus
- [x] `JOURNAL.md` (+10%)

## Final checks before upload
1. `npm ci && npm run verify` exits 0 (typecheck, lint 0 errors, arch:check 0 violations, 28/28 tests).
2. `npx tsx scripts/evaluate-harness.ts` prints `HARD-GATES: PASS`.
3. `git status` is clean, and `.harness/reviews/` plus `evidence/` are committed.
